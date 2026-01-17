import openmeteo_requests
import requests_cache
import pandas as pd
from retry_requests import retry
from config.settings import settings
from config.database import db

class WeatherConnector:
    def __init__(self):
        # Setup the Open-Meteo API client with cache and retry on error
        cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
        retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
        self.openmeteo = openmeteo_requests.Client(session=retry_session)
        self.url = settings.OPENMETEO_URL

    def fetch_historical_weather(self, lat, lon, start_date, end_date, tilt=None, azimuth=None):
        # 0. Check Database Cache
        # CRITICAL: If 'tilt' is provided (Solar Expert), we need 'global_tilted_irradiance' (POA).
        # The current DB schema only stores 'radiation' (GHI).
        # Using GHI for tilted panels underestimates winter production and flattens geographic differences.
        # Therefore, we SKIP reading from cache if tilt is used, to ensure we fetch POA from OpenMeteo.
        # We still SAVE the GHI part to DB for other uses.
        
        year = int(start_date.split("-")[0]) 
        lat_rounded = round(lat, 4)
        lon_rounded = round(lon, 4)
        
        # Only load from DB if we don't need expert solar data (tilt=None)
        if tilt is None and db.check_weather_exists(lat_rounded, lon_rounded, year):
             print(f"Cache Hit: Loading weather from DB for {lat_rounded}, {lon_rounded}")
             return db.load_weather_data(lat_rounded, lon_rounded, year)

        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "hourly": ["temperature_2m", "precipitation", "wind_speed_10m", "wind_speed_100m", "shortwave_radiation", "direct_normal_irradiance", "diffuse_radiation", "surface_pressure"]
        }
        
        # Add POA params if available for advanced solar
        if tilt is not None and azimuth is not None:
             params["tilt"] = tilt
             
             # Conversion: System uses 180=South (Standard), OpenMeteo uses 0=South
             # Formula: openmeteo_az = azimuth - 180
             openmeteo_az = azimuth - 180
             
             # Normalize to -180 to 180 range
             if openmeteo_az < -180: openmeteo_az += 360
             if openmeteo_az > 180: openmeteo_az -= 360
             
             params["azimuth"] = openmeteo_az
             # Request plane of array irradiance
             params["hourly"].append("global_tilted_irradiance")

        responses = self.openmeteo.weather_api(self.url, params=params)
        response = responses[0]
        
        # Process hourly data
        hourly = response.Hourly()
        
        # Helper to get by name logic is safer but we use index for speed in TFG context if standard order
        # But indices change if we append to list. Safer to map by variable name
        # OpenMeteo library handles this via indices corresponding to request order usually.
        # We must be careful.
        
        # Let's trust the order we requested or mapped.
        # 0: temp, 1: precip, 2: wind10, 3: wind100, 4: GHI (shortwave), 5: DNI, 6: Diffuse, 7: Pressure
        variable_map = {
             "temperature_2m": 0,
             "precipitation": 1,
             "wind_speed_10m": 2,
             "wind_speed_100m": 3,
             "shortwave_radiation": 4, # GHI
             "direct_normal_irradiance": 5,
             "diffuse_radiation": 6,
             "surface_pressure": 7
        }
        
        next_idx = 8
        if "global_tilted_irradiance" in params["hourly"]:
             variable_map["global_tilted_irradiance"] = next_idx
             next_idx += 1

        # Safer extraction
        def get_var(name):
             if name in variable_map:
                try: 
                    return hourly.Variables(variable_map[name]).ValuesAsNumpy()
                except:
                    return None
             return None

        hourly_data = {"date": pd.date_range(
            start=pd.to_datetime(hourly.Time(), unit="s", utc=True),
            end=pd.to_datetime(hourly.TimeEnd(), unit="s", utc=True),
            freq=pd.Timedelta(seconds=hourly.Interval()),
            inclusive="left"
        )}
        
        hourly_data["temperature"] = get_var("temperature_2m")
        hourly_data["precipitation"] = get_var("precipitation")
        hourly_data["wind_speed_10m"] = get_var("wind_speed_10m")
        hourly_data["wind_speed_100m"] = get_var("wind_speed_100m")
        hourly_data["radiation_ghi"] = get_var("shortwave_radiation")
        hourly_data["radiation_dni"] = get_var("direct_normal_irradiance")
        hourly_data["surface_pressure"] = get_var("surface_pressure")
        
        if "global_tilted_irradiance" in variable_map:
             hourly_data["radiation_poa"] = get_var("global_tilted_irradiance")
        
        df = pd.DataFrame(data=hourly_data)
        
        # Save to Database for future use
        # (Only saves standard columns; explicit POA is not saved currently in schema)
        db.save_weather_data(df, lat_rounded, lon_rounded)
        
        return df

if __name__ == "__main__":
    # Test
    wc = WeatherConnector()
    df = wc.fetch_historical_weather(40.4168, -3.7038, "2023-01-01", "2023-01-05")
    print(df.head())
