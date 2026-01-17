import numpy as np
import pandas as pd

class SolarModel:
    def __init__(self, system_loss=0.14, inverter_eff=0.96, temp_coef=-0.0035, degradation=0.005, bifaciality=0.0):
        self.system_loss = system_loss # 14%
        self.inverter_eff = inverter_eff # 96%
        self.temp_coef = temp_coef # -0.35%/C
        self.degradation = degradation # 0.5%/year
        self.g_stc = 1000 # W/m2 standard
        self.temp_stc = 25 # C standard
        self.bifaciality = bifaciality # 0.0 to 1.0 (e.g. 0.7 for 70%)

    def predict_generation(self, radiation_series, temperature_series, capacity_kw, years=1, albedo=0.2):
        """
        Calculate solar generation time series.
        radiation_series: Series of GTI (Global Tilted Irradiance) or GHI approx in W/m2.
        temperature_series: Ambient temperature in C.
        capacity_kw: Installed DC capacity in kW.
        """
        # NOCT (Nominal Operating Cell Temperature) Approximation
        # Standard: NOCT = 45 C usually.
        # T_cell = T_amb + (NOCT - 20) * (G / 800)
        # However, wind speed affects this. For TFG expert level, we should ideally use Faiman model if wind data is available.
        # For now, without wind passed to this specific method, we stick to NOCT simplified but document it.
        
        t_cell = temperature_series + (45 - 20) * (radiation_series / 800.0)
        
        # DC Power calculation with Temperature Correction
        # P_dc = P_rated * (G / G_stc) * (1 + gamma * (T_cell - T_stc))
        # G_stc = 1000 W/m2, T_stc = 25 C
        
        # Handle NaN values 
        radiation_series = np.nan_to_num(radiation_series, nan=0.0)
        t_cell = np.nan_to_num(t_cell, nan=25.0) # If no temp, assume STC
        
        temp_factor = (1 + self.temp_coef * (t_cell - self.temp_stc))
        
        # Limit generation to positive and account for clipping if DC/AC ratio > 1 (Inverter Sizing)
        # We assume standard sizing where Inverter ~ Capacity (Capacity usually Refers to DC Power in context)
        # If Capacity is AC limit, we shoud clip.
        # Let's assume capacity_kw is DC Peak Power.
        
        # Bifacial Gain Approximation
        # Gain = Bifaciality * Albedo * Back_Irradiance (Approx Back_Irr ~ G * ViewFactor)
        # Simplified: Front Power * (1 + Bifaciality * Albedo * 0.1) approx 
        # Ref: P_total = P_front * (1 + phi * alpha * G_rear/G_front)
        
        bifacial_gain = 0.0
        if self.bifaciality > 0:
             # Assume rear irradiance is ~10-15% of front depending on height/pitch
             rear_fraction = 0.1 
             bifacial_gain = self.bifaciality * albedo * rear_fraction
             
        p_dc_kw = capacity_kw * (radiation_series / self.g_stc) * temp_factor * (1 + bifacial_gain)
        
        # Apply system losses (cable, soiling, mismatch) and inverter efficiency
        # Inverter efficiency curve is non-linear.
        # Simple non-linear approx: Eff reduces at low load.
        # load_fraction = p_dc_kw / capacity_kw
        # eff_adj = self.inverter_eff * (1 - exp(-10 * load_fraction)) ? 
        # For robust TFG: Constant efficiency is acceptable if high (96-98%) for commercial inverters >= 20% load.
        # We apply a threshold: if power < 1% of capacity, efficiency is 0 (Inverter cut-in).
        
        cut_in_power = 0.01 * capacity_kw
        p_ac_kw = np.where(p_dc_kw > cut_in_power, 
                           p_dc_kw * (1 - self.system_loss) * self.inverter_eff, 
                           0.0)
        
        # Ensure non-negative
        p_ac_kw = np.clip(p_ac_kw, 0, None)
        
        return p_ac_kw
