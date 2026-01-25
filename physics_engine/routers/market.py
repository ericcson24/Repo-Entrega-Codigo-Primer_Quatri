from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from models.market import MarketModel

router = APIRouter()

class MarketPriceRequest(BaseModel):
    """Solicitud para generar precios de mercado eléctrico"""
    latitude: float = Field(..., description="Latitud de la ubicación")
    longitude: float = Field(..., description="Longitud de la ubicación")
    capacity_kw: float = Field(..., description="Capacidad del proyecto en kW")
    project_type: str = Field(..., description="Tipo de proyecto (solar, wind, hydro, biomass)")
    initial_price: Optional[float] = Field(50.0, description="Precio base inicial en €/MWh")

class MarketPriceResponse(BaseModel):
    """Respuesta con precios de mercado generados"""
    prices_eur_mwh: list[float]
    base_price: float
    volatility: float

@router.post("/prices", response_model=MarketPriceResponse)
async def get_market_prices(request: MarketPriceRequest):
    """
    Genera curva de precios de mercado eléctrico horaria para un año completo (8760 horas).
    
    Utiliza modelo sintético que simula:
    - Variación estacional (mayor en invierno/verano, menor en primavera/otoño)
    - Patrón diario (picos en mañana 8-10h y noche 19-22h - "curva del pato")
    - Volatilidad realista del mercado
    
    Esto proporciona estimaciones de ingresos más precisas que un precio fijo.
    """
    try:
        # Configuramos el modelo con el precio base especificado
        base_price = request.initial_price if request.initial_price else 50.0
        
        # Volatilidad estándar del mercado eléctrico español (~20%)
        volatility = 0.2
        
        # Generamos la curva de precios anual
        market_model = MarketModel(
            base_price=base_price,
            volatility=volatility,
            trend=0.0  # Sin tendencia por defecto
        )
        
        prices = market_model.generate_annual_price_curve()
        
        return MarketPriceResponse(
            prices_eur_mwh=prices,
            base_price=base_price,
            volatility=volatility
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generando precios de mercado: {str(e)}"
        )

