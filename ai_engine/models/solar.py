import numpy as np
import pandas as pd

class SolarModel:
    def __init__(self, system_loss=0.14, inverter_eff=0.96, temp_coef=-0.0030, degradation=0.005, bifaciality=0.0):
        self.system_loss = system_loss # 14%
        self.inverter_eff = inverter_eff # 96%
        self.temp_coef = temp_coef # -0.30%/C (Improved to modern Mono-PERC standard to reduce heat penalty in hot climates like Sevilla)
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
        # Standard: NOCT = 45 C usually. Modified to 43 C for modern panels.
        # T_cell = T_amb + (NOCT - 20) * (G / 800)
        t_cell = temperature_series + (43 - 20) * (radiation_series / 800.0)
        
        # DC Power calculation with Temperature Correction
        # P_dc = P_rated * (G / G_stc) * (1 + gamma * (T_cell - T_stc))
        
        # Handle NaN values 
        radiation_series = np.nan_to_num(radiation_series, nan=0.0)
        t_cell = np.nan_to_num(t_cell, nan=25.0) 
        
        temp_factor = (1 + self.temp_coef * (t_cell - self.temp_stc))
        
        # Limit generation to positive
        # Check for Bifacial
        bifacial_gain = 0.0
        if self.bifaciality > 0:
             rear_fraction = 0.1 
             bifacial_gain = self.bifaciality * albedo * rear_fraction
             
        p_dc_kw = capacity_kw * (radiation_series / self.g_stc) * temp_factor * (1 + bifacial_gain)
        
        # Inverter Cut-in
        cut_in_power = 0.01 * capacity_kw
        p_ac_kw = np.where(p_dc_kw > cut_in_power, 
                           p_dc_kw * (1 - self.system_loss) * self.inverter_eff, 
                           0.0)
        
        p_ac_kw = np.clip(p_ac_kw, 0, None)
        
        return p_ac_kw
