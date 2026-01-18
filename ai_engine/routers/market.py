from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.market import MarketModel
# from etl.esios_connector import EsiosConnector  <-- Removed per user request
from config.settings import settings
import pandas as pd

router = APIRouter()

class PriceRequest(BaseModel):
    latitude: float
    longitude: float
    capacity_kw: float
    project_type: str
    initial_price: float = None  # Optional parameter for custom base price

@router.post("/prices")
def get_market_prices(request: PriceRequest):
    """
    Returns annual hourly price series (EUR/MWh).
    """
    
    # 2. Market Model (Data-Driven Synthetic)
    try:
        base = request.initial_price if request.initial_price is not None else settings.DEFAULT_PRICE_EUR_MWH
        model = MarketModel(base_price=base)
        prices = model.generate_annual_price_curve(year=settings.BASE_YEAR)
        
        return {
            "prices_eur_mwh": prices,
            "source": "AI Market Model (Synthetic)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Market Model Error: {str(e)}")
