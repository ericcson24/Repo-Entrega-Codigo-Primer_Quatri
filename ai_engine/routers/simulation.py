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
    financial_params: dict = {} # Added to allow passing debt structs to backend via generic request if needed, though usually processed in Node

def create_long_term_monthly_projection(base_monthly_series: pd.Series, years: int = 20, degradation_annual: float = 0.005) -> list:
    """
    Project the monthly generation over 20 years considering degradation.
    Returns a flat list of 20 * 12 = 240 values.
    """
    # Ensure we have 12 months. If base_monthly_series isn't 12 long (e.g. partial year), this needs care.
    # Assuming standard full year simulation.
    base_values = base_monthly_series.values
    
    projection = []
    
    # If for some reason we don't have exactly 12 bins (e.g. short simulation), we handle it gracefully-ish
    # But usually resample('M') on a full year gives 12.
    
    for year in range(years):
        # Apply degradation factor
        # Year 0: No degradation? Or Year 1 starts degraded? Usually Year 0 (First Year) is nominal.
        factor = (1 - degradation_annual) ** year
        yearly_values = base_values * factor
        projection.extend(yearly_values.tolist())
        
    return projection

@router.post("/solar")
def predict_solar(request: SimulationRequest):
    try:
        params = request.parameters
        # Expert parameters: Tilt and Azimuth
        tilt = params.get("tilt", 30) # Default optimization tilt 
        azimuth = params.get("azimuth", 0) # 0 is South in OpenMeteo usually
        
        df_weather = get_weather_data(request.latitude, request.longitude, tilt=tilt, azimuth=azimuth)
        
        # Use Plane of Array radiation if available (Expert Mode), else GHI
        if "radiation_poa" in df_weather.columns:
             radiation = df_weather["radiation_poa"].to_numpy()
             # Handling potential API glitches where POA is None
             if radiation[0] is None or np.isnan(radiation).all():
                 print("Warning: POA Radiation Null, falling back to GHI")
                 radiation = df_weather["radiation_ghi"].to_numpy()
        else:
             radiation = df_weather["radiation_ghi"].to_numpy()
             
        temperature = df_weather["temperature"].to_numpy()

        # Solar Degradation is typically 0.5% per year
        degradation = params.get("degradation_rate", 0.005)

        model = SolarModel(
            system_loss=params.get("system_loss", 0.14),
            inverter_eff=params.get("inverter_eff", 0.96),
            temp_coef=params.get("temp_coef", -0.0035),
            bifaciality=params.get("bifaciality", 0.0) # Corrected param name
        )
        
        generation_kw = model.predict_generation(radiation, temperature, request.capacity_kw)
        
        df_weather["generation_kw"] = generation_kw
        monthly = df_weather.set_index("date").resample("M")["generation_kw"].sum()
        
        # 20-Year Projection
        long_term_projection = create_long_term_monthly_projection(monthly, years=20, degradation_annual=degradation)

        return {
            "total_annual_generation_kwh": float(generation_kw.sum()),
            "monthly_generation_kwh": monthly.to_dict(), 
            "hourly_generation_kwh": generation_kw.tolist(),
            "long_term_monthly_generation_kwh": long_term_projection
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Solar Prediction Error: {str(e)}")

@router.post("/wind")
def predict_wind(request: SimulationRequest):
    try:
        # Include tilt/azimuth just in case generalized getter needs them, though irrelevant for wind usually
        # But we won't pass them to get_weather for wind specifically unless we unify.
        # Wind doesn't need Tilt.
        df_weather = get_weather_data(request.latitude, request.longitude)
        
        wind_speed_10m = df_weather["wind_speed_10m"].to_numpy()
        temperature = None
        pressure = None
        
        if "temperature" in df_weather.columns:
            temperature = df_weather["temperature"].to_numpy()
        
        if "surface_pressure" in df_weather.columns:
            pressure = df_weather["surface_pressure"].to_numpy()

        params = request.parameters
        
        # Wind Turbine Degradation is typically 1-1.5% due to blade erosion etc, assume 1% default
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
             specific_curve=params.get("power_curve", None) # Correctly passed to predict
        )
        
        df_weather["generation_kw"] = generation_kw
        monthly = df_weather.set_index("date").resample("M")["generation_kw"].sum()
        
        long_term_projection = create_long_term_monthly_projection(monthly, years=20, degradation_annual=degradation)

        return {
            "total_annual_generation_kwh": float(generation_kw.sum()),
            "monthly_generation_kwh": monthly.to_dict(),
            "hourly_generation_kwh": generation_kw.tolist(),
            "long_term_monthly_generation_kwh": long_term_projection
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Wind Prediction Error: {str(e)}")

@router.post("/hydro")
def predict_hydro(request: SimulationRequest):
    try:
        df_weather = get_weather_data(request.latitude, request.longitude)
        precipitation = df_weather["precipitation"].to_numpy()
        
        params = request.parameters
        
        # Hydro usually very long life, low degradation (civil works). 
        # Turbines might lose eff, siltation etc. Assume 0.2%
        degradation = params.get("degradation_rate", 0.002)
        
        # Pass the full parameters dict so the updated HydroModel can extract turbine params
        model = HydroModel(
            head_height=params.get("head_height", 10),
            efficiency=params.get("efficiency", 0.90),
            catchment_area_km2=params.get("catchment_area_km2", 10),
            runoff_coef=params.get("runoff_coef", 0.5),
            turbine_params=params # Pass entire dictionary for specific turbine specs
        )

        generation_kw = model.predict_generation(precipitation)
        
        df_weather["generation_kw"] = generation_kw
        monthly = df_weather.set_index("date").resample("M")["generation_kw"].sum()

        long_term_projection = create_long_term_monthly_projection(monthly, years=20, degradation_annual=degradation)

        return {
            "total_annual_generation_kwh": float(generation_kw.sum()),
            "monthly_generation_kwh": monthly.to_dict(),
            "hourly_generation_kwh": generation_kw.tolist(),
            "long_term_monthly_generation_kwh": long_term_projection
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hydro Prediction Error: {str(e)}")

@router.post("/biomass")
def predict_biomass(request: SimulationRequest):
    # Biomass dispatch depends on market prices.
    # In a full microservice architecture, we might call the price service internally or 
    # accept prices as input. Here we simply instantiate the price model locally to avoid circular dependency loop for now.
    try:
        market_model = MarketModel()
        prices = np.array(market_model.generate_annual_price_curve())
        
        params = request.parameters
        
        # Biomass plants degrade? Heat rate degradation maybe.
        degradation = params.get("degradation_rate", 0.005)
        
        model = BiomassOptimizer(
            efficiency=params.get("efficiency", 0.25),
            fuel_cost_eur_ton=params.get("fuel_cost", 150),
            pci_kwh_kg=params.get("pci", 4.5),
            tech_params=params # Pass integration tech specs
        )

        # Note: 'optimize_dispatch' returns a numpy array, but not wrapped in Series.
        generation_kw = model.optimize_dispatch(prices, request.capacity_kw)
        
        # Helper for monthly aggregation
        # Ensure we have date index matching the prices/simulation year
        dates = pd.date_range(start=f"{settings.BASE_YEAR}-01-01", 
                              periods=len(generation_kw), 
                              freq="H")
        
        df = pd.DataFrame({"date": dates, "generation_kw": generation_kw})
        monthly = df.set_index("date").resample("M")["generation_kw"].sum()
        
        long_term_projection = create_long_term_monthly_projection(monthly, years=20, degradation_annual=degradation)

        # biomass optimize_dispatch does not return is_running, logic inside method was:
        # return dispatch
        # So we can't unpack `generation_kw, is_running, profit` unless we updated the method or model.
        # My previous read of `biomass.py` showed `return dispatch`.
        # Wait, I updated `biomass.py` earlier, let's check what I returned.
        # I returned `dispatch`.
        
        return {
            "total_annual_generation_kwh": float(generation_kw.sum()),
            "monthly_generation_kwh": monthly.to_dict(),
            "hourly_generation_kwh": generation_kw.tolist(),
            "long_term_monthly_generation_kwh": long_term_projection
        }
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Biomass Prediction Error: {str(e)}")
