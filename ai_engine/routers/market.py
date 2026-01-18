from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.market import MarketModel
from config.settings import settings
import pandas as pd

router = APIRouter()

class PriceRequest(BaseModel):
    latitude: float
    longitude: float
    capacity_kw: float
    project_type: str
    initial_price: float = None  # Parámetro opcional para precio base personalizado

@router.post("/prices")
def get_market_prices(request: PriceRequest):
    """
    Retorna series de precios horarios anuales (EUR/MWh).
    """
    
    # Modelo de Mercado (Simulación basada en datos)
    try:
        base = request.initial_price if request.initial_price is not None else settings.DEFAULT_PRICE_EUR_MWH
        model = MarketModel(base_price=base)
        prices = model.generate_annual_price_curve(year=settings.BASE_YEAR)
        
        return {
            "prices_eur_mwh": prices,
            "source": "Modelo de Mercado Sintético"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en Modelo de Mercado: {str(e)}")
