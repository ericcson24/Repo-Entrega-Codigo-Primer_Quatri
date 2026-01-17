import pandas as pd
import numpy as np
from ai_engine.models.solar import SolarModel
from ai_engine.etl.weather_connector import WeatherConnector
from ai_engine.config.settings import settings

def test_location(name, lat, lon):
    print(f"\n--- Testing {name} ({lat}, {lon}) ---")
    wc = WeatherConnector()
    # Force tilt=30, azimuth=0 (Optimal South)
    try:
        df = wc.fetch_historical_weather(lat, lon, "2023-01-01", "2023-12-31", tilt=30.0, azimuth=0.0)
    except Exception as e:
        print(f"Error fetching weather: {e}")
        return

    # Check Columns
    if "radiation_poa" in df.columns:
        rad = df["radiation_poa"].to_numpy()
        rad_source = "POA (Tilted)"
    else:
        rad = df["radiation_ghi"].to_numpy() # Fallback
        rad_source = "GHI (Horizontal)"
    
    temp = df["temperature"].to_numpy()
    
    # Model Setup
    model = SolarModel(system_loss=0.14, inverter_eff=0.96)
    gen_kw = model.predict_generation(rad, temp, capacity_kw=1.0) # 1 kWp system
    
    total_kwh = np.sum(gen_kw)
    print(f"Source: {rad_source}")
    print(f"Total Generation: {total_kwh:.2f} kWh/kWp")
    print(f"Avg Temp: {np.mean(temp):.2f} C")
    return total_kwh

if __name__ == "__main__":
    # Settings must have DB_URL etc, assuming env is loaded or defaults work
    # Madrid
    mad = test_location("Madrid", 40.4168, -3.7038)
    # Sevilla
    sev = test_location("Sevilla", 37.3891, -5.9845)
    # A Coruña
    cor = test_location("A Coruña", 43.3623, -8.4115)
