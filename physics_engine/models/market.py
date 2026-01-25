import numpy as np
import pandas as pd

class MarketModel:
    def __init__(self, base_price=50.0, volatility=0.2, trend=0.0):
        self.base_price = base_price
        self.volatility = volatility
        self.trend = trend 

    def generate_annual_price_curve(self, year=2023):
        """
        Genera una curva de precios horarios sintética pero realista para un año (8760 horas).
        Utiliza un perfil diario base + efecto estacional + volatilidad aleatoria.
        Esto sirve como un método de respaldo avanzado para proyecciones cuando se desconocen los datos reales futuros.
        """
        hours = 8760
        t = np.arange(hours)
        
        # Componente Estacional (Más alto en Invierno/Verano, más bajo en Primavera/Otoño)
        # Coseno con periodo de un año
        seasonal = 10 * np.cos(2 * np.pi * t / 8760)
        
        # Componente Diario (Picos de curva de pato: Mañana 8-10, Noche 19-22)
        day_hour = t % 24
        daily = 15 * np.sin(2 * np.pi * (day_hour - 8)/24) + 10 * np.sin(2 * np.pi * (day_hour - 20)/24)
        
        # Tendencia
        trend_component = self.trend * t
        
        # Volatilidad (Paseo Aleatorio o Ruido Blanco)
        noise = np.random.normal(0, self.base_price * self.volatility, hours)
        
        prices = self.base_price + seasonal + daily + trend_component + noise
        
        # Recortar precios negativos si no permitidos (aunque existen en mercados UE, raros en sim simple)
        prices = prices.clip(min=0)
        
        return prices.tolist()
