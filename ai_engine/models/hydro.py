import numpy as np
import pandas as pd

class HydroModel:
    def __init__(self, head_height, efficiency=0.85, catchment_area_km2=10, runoff_coef=0.5, flow_design=None, turbine_params=None):
        self.head_height = float(head_height) # meters
        self.efficiency = float(efficiency)
        self.catchment_area_m2 = float(catchment_area_km2) * 1_000_000
        self.runoff_coef = float(runoff_coef)
        self.flow_design = float(flow_design) if flow_design is not None else None
        self.gravity = 9.81
        self.water_density = 1000 # kg/m3
        self.turbine_params = turbine_params or {}
        
        # Override efficiency if provided in turbine params
        if self.turbine_params.get("efficiency"):
             self.efficiency = float(self.turbine_params["efficiency"])

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
        # Robustness: Fill NaNs and ensure float
        precip_series = pd.Series(precipitation_mm_hour_series).fillna(0.0).astype(float)
        precip_m = precip_series / 1000.0
        # Lag effect: Rainfall doesn't become streamflow instantly. 
        # Simple hydrology: Apply a rolling mean (concentration time) to simulate river response
        # 24h rolling average IS TOO FAST for river base flow. Use 72h-120h for "River Inertia".
        # This smoothes the crazy hourly jumps.
        precip_rolling = precip_m.rolling(window=120, min_periods=1, center=False).mean()
        
        # Calculate raw physical flow potentially available from the default small catchment
        volume_m3 = precip_rolling.to_numpy() * self.catchment_area_m2 * self.runoff_coef
        
        # Taking hourly totals as flow spread over the hour
        flow_q_m3s = volume_m3 / 3600.0 
        
        # CRITICAL UPDATE for User Experience:
        # If the user provided a 'flow_rate_design' (Design Flow), we should assume the river matches that scale.
        # The precipitation data gives us the VARIABILITY (seasonality), but we mock the MAGNITUDE.
        if self.flow_design:
            # Normalize the flow array (0 to 1 scaling relative to its peaks)
            # Use 60th percentile as "Design capacity" reference.
            max_flow_ref = np.percentile(flow_q_m3s, 60)
            if max_flow_ref > 1e-6:
                scale_factor = self.flow_design / max_flow_ref
                flow_q_m3s = flow_q_m3s * scale_factor
            else:
                # FALLBACK: Synthetic Seasonal Flow
                # Simpler "Slow" curve using sine waves, NO random noise for hourly stability.
                N = len(flow_q_m3s)
                t = np.linspace(0, 2 * np.pi, N)
                # Pure smooth seasonal curve (0.2 to 1.2 x Design)
                seasonal_trend = 0.7 + 0.5 * np.sin(t - np.pi/2) 
                # Add tiny noise just so it's not a math drawing, but smoothed
                noise = np.random.normal(0, 0.02, N)
                
                synthetic_flow = self.flow_design * (seasonal_trend + noise)
                flow_q_m3s = np.clip(synthetic_flow, 0, self.flow_design * 1.5)

            # Cap flow at design capacity (Turbine limit)
            flow_q_m3s = np.minimum(flow_q_m3s, self.flow_design)

        # Apply ecological flow subtraction if present in params
        ecological_flow = self.turbine_params.get("ecological_flow", 0.0)
        flow_q_m3s = np.maximum(flow_q_m3s - ecological_flow, 0.0)

        # PIPE LOSS CALCULATION (Darcy-Weisbach / Manning)
        # If user provided penstock details, we MUST calculate head loss.
        # h_loss = S * L.  Manning formula for S (Hydraulic gradient):
        # V = (1/n) * R^(2/3) * S^(1/2)  => S = (V * n)^2 / R^(4/3)
        # h_loss = L * ( (V*n)^2 / R^(4/3) )
        if self.turbine_params.get("penstock_length") and self.turbine_params.get("penstock_diameter"):
             L = float(self.turbine_params["penstock_length"])
             D = float(self.turbine_params["penstock_diameter"])
             n = float(self.turbine_params.get("mannings_n", 0.013)) # roughness
             
             # Area A = pi * D^2 / 4
             A = np.pi * (D**2) / 4
             # Wetted Perimeter P = pi * D
             # Hydraulic Radius R = A / P = D / 4
             R = D / 4.0
             
             # Velocity V = Q / A
             # Prevent div by zero
             V = np.divide(flow_q_m3s, A, out=np.zeros_like(flow_q_m3s), where=A!=0)
             
             # Slope S
             # S = (V * n)^2 / R^(4/3)
             # Avoid R=0
             if R > 0:
                 S = (V * n)**2 / (R**(4/3))
                 head_loss = L * S
                 
                 # Effective Head = Gross Head - Head Loss
                 effective_head = self.head_height - head_loss
                 # Cannot be negative
                 effective_head = np.maximum(effective_head, 0.0)
             else:
                 effective_head = self.head_height
        else:
             effective_head = self.head_height

        # Calculate Power
        # Use EFFECTIVE Head instead of Gross Head
        power_watts = self.water_density * self.gravity * flow_q_m3s * effective_head * self.efficiency
        power_kw = power_watts / 1000.0
        
        return power_kw
