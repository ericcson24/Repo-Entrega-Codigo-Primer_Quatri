import numpy as np
import pandas as pd

class MarketModel:
    def __init__(self, base_price=50.0, volatility=0.2, trend=0.0):
        self.base_price = base_price
        self.volatility = volatility
        self.trend = trend 

    def generate_annual_price_curve(self, year=2023):
        """
        Generates a synthetic but realistic hourly price curve for a year (8760 hours).
        Uses a base daily profile + seasonal effect + random volatility.
        This serves as a sophisticated fallback method for projections when real future data is unknown.
        """
        hours = 8760
        t = np.arange(hours)
        
        # Seasonal component (Higher in Winter/Summer, lower in Spring/Autumn)
        # Cosine with period of a year
        seasonal = 10 * np.cos(2 * np.pi * t / 8760)
        
        # Daily component (Duck curve peaks: Morning 8-10, Evening 19-22)
        day_hour = t % 24
        daily = 15 * np.sin(2 * np.pi * (day_hour - 8)/24) + 10 * np.sin(2 * np.pi * (day_hour - 20)/24)
        
        # Trend
        trend_component = self.trend * t
        
        # Volatility (Random Walk or White Noise)
        noise = np.random.normal(0, self.base_price * self.volatility, hours)
        
        prices = self.base_price + seasonal + daily + trend_component + noise
        
        # Clip negative prices if not allowed (though they exist in EU markets, usually rare)
        prices = prices.clip(min=0)
        
        return prices.tolist()
