from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import numpy as np
from models.solar import SolarModel
from models.wind import WindModel
from models.hydro import HydroModel
from models.biomass import BiomassOptimizer
from models.market import MarketModel
from etl.weather_connector import WeatherConnector
from config.settings import settings

router = APIRouter()

class SimulationRequest(BaseModel):
    project_type: str
    latitude: float
    longitude: float
    capacity_kw: float
    parameters: dict = {}
    financial_params: dict = {} # Permite pasar estructuras de deuda para solicitudes genéricas, aunque usualmente se procesan en Node

@router.get("/solar-potential")
async def get_solar_potential(lat: float, lon: float):
    try:
        connector = WeatherConnector()
        # Obtener 1 año representativo (BASE_YEAR)
        year = settings.BASE_YEAR
        df = connector.fetch_historical_weather(lat, lon, f"{year}-01-01", f"{year}-12-31")
        
        if df.empty:
            return {"peak_sun_hours": 1500.0} # Valor por defecto
            
        # Suma anual (W/m2) -> /1000 -> kWh/m2 (HSP - Horas Sol Pico)
        # Nota: df usa resolución horaria
        # Verificar nombre de columna (varía si se obtiene 'radiation_ghi' en vivo o 'radiation' en histórico antiguo)
        col_name = 'radiation_ghi' if 'radiation_ghi' in df.columns else 'radiation'
        
        if col_name not in df.columns:
            # Si no se encuentra columna de radiación
            print(f"Advertencia: No se encontró columna de radiación. Columnas: {df.columns}")
            return {"peak_sun_hours": 1500.0}

        ghi_sum = df[col_name].sum() 
        peak_hours = ghi_sum / 1000.0
        
        return {"peak_sun_hours": round(peak_hours, 1)}
    except Exception as e:
        print(f"Error obteniendo potencial solar: {e}")
        return {"peak_sun_hours": 1500.0}

def get_weather_data(lat, lon, tilt=None, azimuth=None):
    connector = WeatherConnector()
    # MEJORA DE ROBUSTEZ: "Conjunto de datos multianual"
    # En lugar de simular solo 1 año (que podría ser atípico), simulamos los últimos 3 años
    # y promediamos los resultados. Esto proporciona una proyección mucho más estable y realista.
    
    years_to_simulate = [settings.BASE_YEAR - 2, settings.BASE_YEAR - 1, settings.BASE_YEAR] # ej. 2021, 2022, 2023
    dfs = []
    
    for year in years_to_simulate:
        start = f"{year}-01-01"
        end = f"{year}-12-31"
        try:
            df_year = connector.fetch_historical_weather(lat, lon, start, end, tilt, azimuth)
            if not df_year.empty:
                dfs.append(df_year)
        except Exception as e:
            print(f"Advertencia: No se pudo obtener clima para {year}: {e}")
            
    if not dfs:
        # Alternativa de año base único si el bucle falla completamente
        return connector.fetch_historical_weather(lat, lon, f"{settings.BASE_YEAR}-01-01", f"{settings.BASE_YEAR}-12-31", tilt, azimuth)
        
    # Concatenar todos los años en una serie temporal larga
    return pd.concat(dfs, ignore_index=True)

def create_long_term_monthly_projection(base_monthly_profile: pd.Series, years: int = 20, degradation_annual: float = 0.005) -> list:
    """
    Proyecta la generación mensual a lo largo de 20+ años considerando la degradación.
    base_monthly_profile: Serie de 12 meses (Año Representativo).
    Retorna una lista plana de [años * 12] valores.
    """
    base_values = base_monthly_profile.values
    if len(base_values) != 12:
        # Si se pasa una serie temporal > 12 meses, se asume perfil representativo ya procesado.
        pass
        
    projection = []
    
    for year in range(years):
        # Aplicar factor de degradación
        factor = (1 - degradation_annual) ** year
        yearly_values = base_values * factor
        projection.extend(yearly_values.tolist())
        
    return projection

@router.post("/solar")
def predict_solar(request: SimulationRequest):
    try:
        params = request.parameters
        # Parámetros Expertos: Inclinación (Tilt) y Azimut
        # Aseguramos conversión a float para prevenir errores de tipo
        try:
            tilt = float(params.get("tilt", 30))
        except (ValueError, TypeError):
            tilt = 30.0
            
        try:
            azimuth = float(params.get("azimuth", 0))
        except (ValueError, TypeError):
            azimuth = 0.0
            
        df_weather = get_weather_data(request.latitude, request.longitude, tilt=tilt, azimuth=azimuth)
        
        # Usar Radiación en el Plano del Array (POA) si disponible (Modo Experto), sino GHI
        if "radiation_poa" in df_weather.columns:
             radiation = df_weather["radiation_poa"].to_numpy()
             # Manejo de posibles fallos de API donde POA es None
             if radiation[0] is None or np.isnan(radiation).all():
                 print("Advertencia: Radiación POA nula, usando GHI como alternativa")
                 radiation = df_weather["radiation_ghi"].to_numpy()
        else:
             radiation = df_weather["radiation_ghi"].to_numpy()
             
        temperature = df_weather["temperature"].to_numpy()

        # La degradación solar típica es 0.5% por año
        degradation_raw = params.get("degradation_rate", 0.5)
        # Verificación: si el usuario envía porcentaje (ej. 0.5) o fracción (0.005)
        # Heurística: si > 0.05 (5%), asumimos porcentaje. 0.5% es estándar.
        # Entrada estándar en frontend es "0.5" para 0.5%.
        # Dividimos por 100.
        degradation = float(degradation_raw) / 100.0

        # --- Lógica de Tipo de Panel ---
        # Mapear string panel_type a coeficientes físicos si no se proveen explícitamente
        panel_type = params.get("panel_type", "monocrystalline").lower()
        
        # Coeficientes de Temp por defecto (%/C) -> Fracción/C
        # Mono: -0.35%, Poly: -0.45%, Capa Fina: -0.20%
        type_specs = {
            "monocrystalline": {"temp_coef": -0.0035, "bifaciality": 0.0},
            "polycrystalline": {"temp_coef": -0.0045, "bifaciality": 0.0},
            "thinfilm": {"temp_coef": -0.0020, "bifaciality": 0.0},
            "bifacial": {"temp_coef": -0.0035, "bifaciality": 0.70}, # Factor bifacial 70%
            "custom": {"temp_coef": -0.0035, "bifaciality": 0.0}
        }
        
        # Obtener valores por defecto para este tipo
        specs = type_specs.get(panel_type, type_specs["monocrystalline"])
        
        # Usar valor provisto si existe, sino usar defecto del tipo
        temp_coef = params.get("temp_coef", specs["temp_coef"])
        bifaciality = params.get("bifaciality", specs["bifaciality"])

        model = SolarModel(
            system_loss=params.get("system_loss", 0.14),
            inverter_eff=params.get("inverter_eff", 0.96),
            temp_coef=temp_coef,
            bifaciality=bifaciality
        )
        
        generation_kw = model.predict_generation(radiation, temperature, request.capacity_kw)
        
        # --- Lógica de Promediado Multi-Anual ---
        df_weather["generation_kw"] = generation_kw
        
        # 1. Total generado a través de todos los años obtenidos
        total_gen_all_years = generation_kw.sum()
        
        # 2. Número de años simulados (aprox)
        num_years = len(df_weather) / 8760.0
        
        # 3. Generación Anual Promedio
        avg_annual_gen = total_gen_all_years / num_years
        
        # 4. Perfil Mensual Representativo (Promedio Ene, Promedio Feb...)
        # Re-muestreo a sumas mensuales primero
        monthly_series = df_weather.set_index("date").resample("ME")["generation_kw"].sum()
        
        # Agrupar por índice de mes (ENE=1, FEB=2...) para obtener producción mensual promedio
        # Esto crea una serie de 12 valores: [AvgEne, AvgFeb, ...]
        avg_monthly_profile = monthly_series.groupby(monthly_series.index.month).mean()
        
        # Re-construct a "Representative Year" dictionary for frontend
        # Frontend expects dates logic? Usually just "Jan, Feb". 
        # But `monthly.to_dict()` keys are Timestamps.
        # To maintain compatibility, we map 1..12 back to dummy timestamps of Year 0 or BASE_YEAR
        
        # Better: Return the projected 20 years based on this AVERAGE profile.
        # We need `create_long_term_monthly_projection` to accept this 12-month profile.
        
        project_lifetime = int(request.financial_params.get("project_lifetime", 25))
        long_term_projection = create_long_term_monthly_projection(avg_monthly_profile, years=project_lifetime, degradation_annual=degradation)

        # For "monthly_generation_kwh", let's return the representative year (12 months)
        # mapped to the Base Year dates so frontend graph looks normal (Jan-Dec)
        base_dates = pd.date_range(start=f"{settings.BASE_YEAR}-01-01", periods=12, freq="ME")
        monthly_dict = dict(zip(base_dates, avg_monthly_profile.values))
        
        # Hourly? Returning 3 years of hourly data is heavy (26k points).
        # Should we return just the first year? Or the average 8760?
        # Average 8760 is hard (leap years etc).
        # Let's return the LAST year (most recent) as the "Sample Hourly Profile" to keep it light 
        # but accurate to recent trends.
        last_8760 = generation_kw[-8760:].tolist()

        return {
            "total_annual_generation_kwh": float(avg_annual_gen),
            "monthly_generation_kwh": {k.strftime('%Y-%m-%d'): float(v) for k, v in monthly_dict.items()}, 
            "hourly_generation_kwh": [float(x) for x in last_8760],
            "long_term_monthly_generation_kwh": [float(x) for x in long_term_projection]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solar Prediction Error: {str(e)}")

@router.post("/wind")
def predict_wind(request: SimulationRequest):
    try:
        df_weather = get_weather_data(request.latitude, request.longitude)
        
        # Note: df_weather is now a 3-year DataFrame
        
        wind_speed_10m = df_weather["wind_speed_10m"].to_numpy()
        temperature = None
        pressure = None
        
        if "temperature" in df_weather.columns:
            temperature = df_weather["temperature"].to_numpy()
        
        if "surface_pressure" in df_weather.columns:
            pressure = df_weather["surface_pressure"].to_numpy()

        params = request.parameters
        
        degradation = params.get("degradation_rate", 0.01)
        
        model = WindModel(
            hub_height=params.get("hub_height", 80),
            rough_length=params.get("roughness", 0.03)
        )

        generation_kw = model.predict_generation(
             wind_speed_10m_series=wind_speed_10m, 
             capacity_kw=request.capacity_kw,
             temperature_c=temperature,
             pressure_hpa=pressure,
             specific_curve=params.get("power_curve", None) 
        )
        
        # --- Multi-Year Logic ---
        df_weather["generation_kw"] = generation_kw
        total_gen = generation_kw.sum()
        num_years = len(df_weather) / 8760.0
        avg_annual = total_gen / num_years
        
        monthly_series = df_weather.set_index("date").resample("ME")["generation_kw"].sum()
        avg_monthly = monthly_series.groupby(monthly_series.index.month).mean()
        
        project_lifetime = int(request.financial_params.get("project_lifetime", 25))
        long_term_projection = create_long_term_monthly_projection(avg_monthly, years=project_lifetime, degradation_annual=degradation)

        base_dates = pd.date_range(start=f"{settings.BASE_YEAR}-01-01", periods=12, freq="ME")
        monthly_dict = dict(zip(base_dates, avg_monthly.values))
        last_8760 = generation_kw[-8760:].tolist()

        return {
            "total_annual_generation_kwh": float(avg_annual),
            "monthly_generation_kwh": {k.strftime('%Y-%m-%d'): float(v) for k, v in monthly_dict.items()},
            "hourly_generation_kwh": [float(x) for x in last_8760],
            "long_term_monthly_generation_kwh": [float(x) for x in long_term_projection]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Wind Prediction Error: {str(e)}")

@router.post("/hydro")
def predict_hydro(request: SimulationRequest):
    try:
        df_weather = get_weather_data(request.latitude, request.longitude)
        precipitation = df_weather["precipitation"].to_numpy()
        
        params = request.parameters
        degradation = params.get("degradation_rate", 0.002)
        
        head = params.get("gross_head", params.get("head_height", 10))
        
        model = HydroModel(
            head_height=head,
            efficiency=params.get("turbine_efficiency", params.get("efficiency", 0.90)),
            catchment_area_km2=params.get("catchment_area_km2", 10),
            runoff_coef=params.get("runoff_coef", 0.5),
            flow_design=params.get("flow_rate_design", None),
            turbine_params=params 
        )

        generation_kw = model.predict_generation(precipitation)
        
        # --- Multi-Year Logic ---
        df_weather["generation_kw"] = generation_kw
        total_gen = generation_kw.sum()
        num_years = len(df_weather) / 8760.0
        avg_annual = total_gen / num_years
        
        monthly_series = df_weather.set_index("date").resample("ME")["generation_kw"].sum()
        avg_monthly = monthly_series.groupby(monthly_series.index.month).mean()

        project_lifetime = int(request.financial_params.get("project_lifetime", 25))
        long_term_projection = create_long_term_monthly_projection(avg_monthly, years=project_lifetime, degradation_annual=degradation)
        
        base_dates = pd.date_range(start=f"{settings.BASE_YEAR}-01-01", periods=12, freq="ME")
        monthly_dict = dict(zip(base_dates, avg_monthly.values))
        last_8760 = generation_kw[-8760:].tolist()

        return {
            "total_annual_generation_kwh": float(avg_annual),
            "monthly_generation_kwh": {k.strftime('%Y-%m-%d'): float(v) for k, v in monthly_dict.items()},
            "hourly_generation_kwh": [float(x) for x in last_8760],
            "long_term_monthly_generation_kwh": [float(x) for x in long_term_projection]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hydro Prediction Error: {str(e)}")

@router.post("/biomass")
def predict_biomass(request: SimulationRequest):
    # Biomass dispatch depends on market prices.
    # In a full microservice architecture, we might call the price service internally or 
    # accept prices as input. Here we simply instantiate the price model locally.
    try:
        years_to_simulate = [settings.BASE_YEAR - 2, settings.BASE_YEAR - 1, settings.BASE_YEAR]
        
        # Get base price from request or default
        base_price = request.financial_params.get("initial_electricity_price", 50.0)
        market_model = MarketModel(base_price=float(base_price))
        
        params = request.parameters
        degradation = params.get("degradation_rate", 0.005)

        # Generate multi-year price curve and simulate year by year to respect annual fuel limits
        gen_list = []
        prices_list = []
        
        model = BiomassOptimizer(
            efficiency=params.get("efficiency", 0.25),
            fuel_cost_eur_ton=params.get("fuel_cost", 150),
            pci_kwh_kg=params.get("pci", 4.5),
            tech_params=params # Pass integration tech specs
        )

        for _ in years_to_simulate:
            annual_prices = market_model.generate_annual_price_curve()
            prices_list.extend(annual_prices)
            
            # Dispatch for this specific year
            annual_gen = model.optimize_dispatch(annual_prices, request.capacity_kw)
            gen_list.extend(annual_gen)
            
        prices = np.array(prices_list)
        generation_kw = np.array(gen_list)
        
        # Create dates for the entire multi-year range
        full_dates = []
        for year in years_to_simulate:
            full_dates.extend(pd.date_range(start=f"{year}-01-01", end=f"{year}-12-31 23:00", freq="H").tolist())
        
        # Safe length match in case of leap years vs synthetic 8760 lists
        min_len = min(len(full_dates), len(generation_kw))
        df = pd.DataFrame({"date": full_dates[:min_len], "generation_kw": generation_kw[:min_len]})
        
        # --- Multi-Year Logic ---
        total_gen = generation_kw.sum()
        num_years = len(years_to_simulate)
        avg_annual = total_gen / num_years
        
        monthly_series = df.set_index("date").resample("ME")["generation_kw"].sum()
        avg_monthly = monthly_series.groupby(monthly_series.index.month).mean()
        
        project_lifetime = int(request.financial_params.get("project_lifetime", 25))
        long_term_projection = create_long_term_monthly_projection(avg_monthly, years=project_lifetime, degradation_annual=degradation)

        base_dates = pd.date_range(start=f"{settings.BASE_YEAR}-01-01", periods=12, freq="ME")
        monthly_dict = dict(zip(base_dates, avg_monthly.values))
        last_8760 = generation_kw[-8760:].tolist()

        return {
            "total_annual_generation_kwh": float(avg_annual),
            "monthly_generation_kwh": {k.strftime('%Y-%m-%d'): float(v) for k, v in monthly_dict.items()},
            "hourly_generation_kwh": [float(x) for x in last_8760],
            "long_term_monthly_generation_kwh": [float(x) for x in long_term_projection]
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Biomass Prediction Error: {str(e)}")