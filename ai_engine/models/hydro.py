import numpy as np

class HydroModel:
    def __init__(self, head_height, efficiency=0.85, catchment_area_km2=10, runoff_coef=0.5):
        self.head_height = head_height # meters
        self.efficiency = efficiency
        self.catchment_area_m2 = catchment_area_km2 * 1_000_000
        self.runoff_coef = runoff_coef # Fraction of rain that becomes streamflow
        self.gravity = 9.81
        self.water_density = 1000 # kg/m3

    def predict_generation(self, precipitation_mm_hour_series):
        """
        Convert precipitation (mm/h) to Power (kW).
        Validation: 1 mm = 0.001 m.
        Volume (m3) = Precip (m) * Area (m2).
        Flow Q (m3/s) = Volume / 3600 (since data is hourly).
        Power (W) = rho * g * Q * H * eff
        """
        precip_m = precipitation_mm_hour_series / 1000.0
        volume_m3 = precip_m * self.catchment_area_m2 * self.runoff_coef
        
        # Taking hourly totals as flow spread over the hour
        flow_q_m3s = volume_m3 / 3600.0 
        
        power_watts = self.water_density * self.gravity * flow_q_m3s * self.head_height * self.efficiency
        power_kw = power_watts / 1000.0
        
        return power_kw
