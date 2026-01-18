import os
from dotenv import load_dotenv

# Cargar variables de entorno desde archivo .env
load_dotenv()

class Settings:
    # Claves de API y URLs
    ESIOS_TOKEN = os.getenv("ESIOS_TOKEN", "")
    ESIOS_URL = os.getenv("ESIOS_URL", "https://api.esios.ree.es/indicators/1001")
    OPENMETEO_URL = os.getenv("OPENMETEO_URL", "https://archive-api.open-meteo.com/v1/archive")

    # Credenciales de Base de Datos
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_USER = os.getenv("DB_USER", "admin")
    DB_PASS = os.getenv("DB_PASS", "password123")
    DB_NAME = os.getenv("DB_NAME", "renewables_db")
    
    # Cadena de conexión SQLAlchemy
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

    # Valores por defecto de simulación
    DEFAULT_YEARS = int(os.getenv("DEFAULT_YEARS", 25))
    BASE_YEAR = int(os.getenv("BASE_YEAR", 2023))
    
    # Valores por defecto de Mercado/Financiero
    DEFAULT_PRICE_EUR_MWH = float(os.getenv("DEFAULT_PRICE_EUR_MWH", 50.0))

settings = Settings()
