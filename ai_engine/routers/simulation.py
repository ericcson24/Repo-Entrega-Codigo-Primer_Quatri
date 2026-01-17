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

from config.database import db

def get_weather_data(lat, lon, tilt=None, azimuth=None):
    # Strategy:
    # 1. Check DB for cached data (lat/lon/year)
    # 2. If present, load from DB.
    # 3. If absent, fetch from OpenMeteo and Save to DB.
    
    # Limitation: Tilted Irradiance is request-specific param. OpenMeteo calc it.
    # Our DB only stores GHI/DNI (Common). Tilted is derived or specific.
    # If using advanced tilt, we might re-fetch or calc locally.
    # For TFG Robustness: We will fetch fresh if params change OR we implement Isotropic transposition locally from GHI/DNI.
    # Providing POA from API is better.
    # So: Check DB. If DB has GHI, we can calculate POA? That's complex logic.
    # Simpler: If specific tilt requested, hit API. If standard (horizontal GHI used for approximate), use DB.
    
    # But for a backend "expert" system, re-downloading is safer for accuracy if it's fast.
    # However, user asked for "No Simplicity". Caching IS professional.
    
    # Logic:
    # IF Tilt/Azimuth provided -> Always Fetch (to get Tilted Radiation accurately from provider)
    # ELSE -> Try DB Cache.
    
    year = settings.BASE_YEAR
    
    if tilt is not None or azimuth is not None:
        # Specialized request
        wc = WeatherConnector()
        start = f"{year}-01-01"
        end = f"{year}-12-31"
        return wc.fetch_historical_weather(lat, lon, start, end, tilt=tilt, azimuth=azimuth)
    
    # Standard Request (Cacheable)
    if db.check_weather_exists(lat, lon, year):
        return db.load_weather_data(lat, lon, year)
    else:
        print(f"Fetching fresh weather data for {lat}, {lon}")
        wc = WeatherConnector()
        start = f"{year}-01-01"
        end = f"{year}-12-31"
        df = wc.fetch_historical_weather(lat, lon, start, end)
        
        if not df.empty:
            # Async save ideally, but sync for now
            db.save_weather_data(df, lat, lon)
            
        if df.empty:
            raise HTTPException(status_code=404, detail="Weather data unavailable for location")
            
        return df

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

        model = SolarModel(
            system_loss=params.get("system_loss", 0.14),
            inverter_eff=params.get("inverter_eff", 0.96),
            temp_coef=params.get("temp_coef", -0.0035)
        )

        generation_kw = model.predict_generation(radiation, temperature, request.capacity_kw)
        
        df_weather["generation_kw"] = generation_kw
        monthly = df_weather.set_index("date").resample("M")["generation_kw"].sum()
        
        return {
            "total_annual_generation_kwh": float(generation_kw.sum()),
            "monthly_generation_kwh": monthly.to_dict(), 
            "hourly_generation_kwh": generation_kw.tolist()
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
        model = WindModel(
            hub_height=params.get("hub_height", 80),
            rough_length=params.get("roughness", 0.03)
        )

        generation_kw = model.predict_generation(
             wind_speed_10m_series=wind_speed_10m, 
             capacity_kw=request.capacity_kw,
             temperature_c=temperature,
             pressure_hpa=pressure
        )
        
        df_weather["generation_kw"] = generation_kw
        monthly = df_weather.set_index("date").resample("M")["generation_kw"].sum()

        return {
            "total_annual_generation_kwh": float(generation_kw.sum()),
            "monthly_generation_kwh": monthly.to_dict(),
            "hourly_generation_kwh": generation_kw.tolist()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Wind Prediction Error: {str(e)}")

@router.post("/hydro")
def predict_hydro(request: SimulationRequest):
    try:
        df_weather = get_weather_data(request.latitude, request.longitude)
        precipitation = df_weather["precipitation"].to_numpy()
        
        params = request.parameters
        model = HydroModel(
            head_height=params.get("head_height", 10),
            efficiency=params.get("efficiency", 0.90),
            catchment_area_km2=params.get("catchment_area_km2", 10),
            runoff_coef=params.get("runoff_coef", 0.5)
        )

        generation_kw = model.predict_generation(precipitation)
        
        df_weather["generation_kw"] = generation_kw
        monthly = df_weather.set_index("date").resample("M")["generation_kw"].sum()

        return {
            "total_annual_generation_kwh": float(generation_kw.sum()),
            "monthly_generation_kwh": monthly.to_dict(),
            "hourly_generation_kwh": generation_kw.tolist()
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
        model = BiomassOptimizer(
            efficiency=params.get("efficiency", 0.25),
            fuel_cost_eur_ton=params.get("fuel_cost", 150),
            pci_kwh_kg=params.get("pci", 4.5)
        )

        generation_kw, is_running, profit = model.optimize_dispatch(prices, request.capacity_kw)
        
        # Helper for monthly aggregation
        dates = pd.date_range(start=f"{settings.BASE_YEAR}-01-01", 
                              periods=len(generation_kw), 
                              freq="H")
        
        df = pd.DataFrame({"date": dates, "generation_kw": generation_kw})
        monthly = df.set_index("date").resample("M")["generation_kw"].sum()

        return {
            "total_annual_generation_kwh": float(generation_kw.sum()),
            "monthly_generation_kwh": monthly.to_dict(),
            "hourly_generation_kwh": generation_kw.tolist(),
            "running_hours": int(is_running.sum())
        }
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Biomass Prediction Error: {str(e)}")
