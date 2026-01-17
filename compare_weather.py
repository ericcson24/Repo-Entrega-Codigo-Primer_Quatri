import pandas as pd
from ai_engine.etl.weather_connector import WeatherConnector
from ai_engine.config.settings import settings

def get_rad_sum(lat, lon, name):
    wc = WeatherConnector()
    # Force fresh fetch by bypassing cache in connector logic (tilt=30 forces it)
    df = wc.fetch_historical_weather(lat, lon, "2023-01-01", "2023-12-31", tilt=30.0, azimuth=0.0)
    
    # Sum GHI and POA
    ghi = df["radiation_ghi"].sum() / 1000.0 # kWh/m2
    poa = df["radiation_poa"].sum() / 1000.0 # kWh/m2
    temp = df["temperature"].mean()
    
    print(f"\nLocation: {name}")
    print(f"GHI (Horizontal): {ghi:.2f} kWh/m2")
    print(f"POA (Tilted 30):  {poa:.2f} kWh/m2")
    print(f"Avg Temp:         {temp:.2f} C")
    return poa, temp

if __name__ == "__main__":
    # Madrid
    p_mad, t_mad = get_rad_sum(40.4168, -3.7038, "Madrid")
    # Sevilla
    p_sev, t_sev = get_rad_sum(37.3891, -5.9845, "Sevilla")
    # Coruña
    p_cor, t_cor = get_rad_sum(43.3623, -8.4115, "A Coruña")
    
    print("\n--- Analysis ---")
    print(f"Sevilla vs Madrid Radiation: {((p_sev/p_mad)-1)*100:.1f}% more sun")
    print(f"Sevilla Temperture Penalty: {(t_sev - t_mad) * 0.3:.2f}% loss (approx)")
