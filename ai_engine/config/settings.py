import os
from dotenv import load_dotenv

# Load env variables from .env file
load_dotenv()

class Settings:
    # API Keys & URLs
    ESIOS_TOKEN = os.getenv("ESIOS_TOKEN", "")
    OPENMETEO_URL = os.getenv("OPENMETEO_URL", "https://archive-api.open-meteo.com/v1/archive")

    # Database Credentials
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_USER = os.getenv("DB_USER", "admin")
    DB_PASS = os.getenv("DB_PASS", "password123")
    DB_NAME = os.getenv("DB_NAME", "renewables_db")
    
    # SQLAlchemy Connection String
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

    # Simulation Defaults
    DEFAULT_YEARS = int(os.getenv("DEFAULT_YEARS", 25))
    BASE_YEAR = int(os.getenv("BASE_YEAR", 2023))
    
    # Financial/Market Defaults
    DEFAULT_PRICE_EUR_MWH = float(os.getenv("DEFAULT_PRICE_EUR_MWH", 50.0))

settings = Settings()
