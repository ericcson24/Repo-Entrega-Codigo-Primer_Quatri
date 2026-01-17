import numpy as np
import pandas as pd

class HydroModel:
    def __init__(self, head_height, efficiency=0.85, catchment_area_km2=10, runoff_coef=0.5, turbine_params=None):
        self.head_height = head_height # meters
        self.efficiency = efficiency
        self.catchment_area_m2 = catchment_area_km2 * 1_000_000
        self.runoff_coef = runoff_coef # Fraction of rain that becomes streamflow
        self.gravity = 9.81
        self.water_density = 1000 # kg/m3
        self.turbine_params = turbine_params or {}
        
        # Override efficiency if provided in turbine params
        if self.turbine_params.get("efficiency"):
             self.efficiency = self.turbine_params["efficiency"]

    def _get_turbine_efficiency(self, flow_ratio):
        # Industrial: Simple efficiency curve adjustment
        # If flow < min_flow, efficiency drops rapidly or is zero (cutoff)
        min_flow_ratio = self.turbine_params.get("min_flow_ratio", 0.1)
        if flow_ratio < min_flow_ratio:
            return 0.0
        # Simple curve: Rated Eff * (1 - (1-flow)^2 * 0.2) or similar, 
        # but let's stick to constant eff for valid range for robustness unless we have the curve points.
        return self.efficiency

    def predict_generation(self, precipitation_mm_hour_series):
        """
        Convert precipitation (mm/h) to Power (kW).
        Validation: 1 mm = 0.001 m.
        Volume (m3) = Precip (m) * Area (m2).
        Flow Q (m3/s) = Volume / 3600 (since data is hourly).
        Power (W) = rho * g * Q * H * eff
        """
        precip_m = precipitation_mm_hour_series / 1000.0
        # Lag effect: Rainfall doesn't become streamflow instantly. 
        # Simple hydrology: Apply a rolling mean (concentration time) to simulate river response
        # 24h rolling average is a decent default for a small catchment
        precip_rolling = pd.Series(precip_m).rolling(window=24, min_periods=1, center=False).mean()
        
        volume_m3 = precip_rolling.to_numpy() * self.catchment_area_m2 * self.runoff_coef
        
        # Taking hourly totals as flow spread over the hour
        flow_q_m3s = volume_m3 / 3600.0 
        
        # Determine max flow (design flow) if implied by turbine? 
        # For now, unbounded unless we add penstock limit.
        
        power_watts = self.water_density * self.gravity * flow_q_m3s * self.head_height * self.efficiency
        power_kw = power_watts / 1000.0
        
        return power_kw
