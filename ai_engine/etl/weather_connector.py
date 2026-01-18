import openmeteo_requests
import requests_cache
import pandas as pd
from retry_requests import retry
from config.settings import settings
from config.database import db

class WeatherConnector:
    def __init__(self):
        # Configurar cliente API de Open-Meteo con caché y reintentos
        cache_session = requests_cache.CachedSession('.cache', expire_after=3600)
        retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
        self.openmeteo = openmeteo_requests.Client(session=retry_session)
        self.url = settings.OPENMETEO_URL

    def fetch_historical_weather(self, lat, lon, start_date, end_date, tilt=None, azimuth=None):
        # 0. Verificar Caché en Base de Datos
        # CRÍTICO: Si se incluye 'tilt' (Experto Solar), necesitamos 'global_tilted_irradiance' (POA).
        # El esquema actual de BD solo almacena 'radiation' (GHI).
        # Usar GHI para paneles inclinados subestima la producción invernal y aplana diferencias geográficas.
        # Por tanto, SALTAMOS la lectura de caché si se usa tilt, asegurando que pedimos POA a OpenMeteo.
        # Aún guardamos la parte GHI en BD para otros usos futuros.
        
        year = int(start_date.split("-")[0]) 
        lat_rounded = round(lat, 4)
        lon_rounded = round(lon, 4)
        
        # Solo cargar de BD si no necesitamos datos expertos solares (tilt=None)
        if tilt is None and db.check_weather_exists(lat_rounded, lon_rounded, year):
             print(f"Acierto en Caché: Cargando clima desde BD para {lat_rounded}, {lon_rounded}")
             return db.load_weather_data(lat_rounded, lon_rounded, year)

        params = {
            "latitude": lat,
            "longitude": lon,
            "start_date": start_date,
            "end_date": end_date,
            "hourly": ["temperature_2m", "precipitation", "wind_speed_10m", "wind_speed_100m", "shortwave_radiation", "direct_normal_irradiance", "diffuse_radiation", "surface_pressure"]
        }
        
        # Añadir parámetros POA si están disponibles para solar avanzado
        if tilt is not None and azimuth is not None:
             params["tilt"] = tilt
             
             # Conversión: El sistema usa 180=Sur (Estándar), OpenMeteo usa 0=Sur
             # Fórmula: openmeteo_az = azimuth - 180
             openmeteo_az = azimuth - 180
             
             # Normalizar al rango -180 a 180
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
