from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.market import MarketModel
from etl.esios_connector import EsiosConnector
from config.settings import settings
import pandas as pd

router = APIRouter()

class PriceRequest(BaseModel):
    latitude: float
    longitude: float
    capacity_kw: float
    project_type: str

@router.post("/prices")
def get_market_prices(request: PriceRequest):
    """
    Returns annual hourly price series (EUR/MWh).
    Strategy:
    1. Try fetching real historical data from ESIOS via Connector (if token exists).
    2. If fails or no token, use MarketModel to generate a realistic curve based on historical patterns.
    """
    
    # 1. Try Real Data
    if settings.ESIOS_TOKEN:
        try:
            connector = EsiosConnector()
            start_date = f"{settings.BASE_YEAR}-01-01"
            end_date = f"{settings.BASE_YEAR}-12-31"
            df = connector.fetch_prices(start_date, end_date)
            
            if not df.empty and len(df) > 8000: # Ensure we have nearly a full year
                # Resample or fill valid data to 8760
                # Simplified return
                prices = df['price'].fillna(method='ffill').tolist()
                return {
                    "prices_eur_mwh": prices,
                    "source": "ESIOS API (Real Data)"
                }
        except Exception as e:
            print(f"ESIOS Fetch Failed: {e}. Falling back to Model.")
    
    # 2. Fallback to Market Model (Data-Driven Synthetic)
    # This ensures we always have simulated data for the financial model
    try:
        model = MarketModel(base_price=settings.DEFAULT_PRICE_EUR_MWH)
        prices = model.generate_annual_price_curve(year=settings.BASE_YEAR)
        
        return {
            "prices_eur_mwh": prices,
            "source": "AI Market Model (Synthetic)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Market Model Error: {str(e)}")
