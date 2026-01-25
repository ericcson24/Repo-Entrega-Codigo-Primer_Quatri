import numpy as np
import pandas as pd

class SolarModel:
    def __init__(self, system_loss=0.14, inverter_eff=0.96, temp_coef=-0.0030, degradation=0.005, bifaciality=0.0):
        self.system_loss = system_loss # 14%
        self.inverter_eff = inverter_eff # 96%
        self.temp_coef = temp_coef # -0.30%/C (Mejorado al estándar moderno Mono-PERC para reducir penalización por calor en climas como Sevilla)
        self.degradation = degradation # 0.5%/año
        self.g_stc = 1000 # W/m2 estándar
        self.temp_stc = 25 # C estándar
        self.bifaciality = bifaciality # 0.0 a 1.0 (ej. 0.7 para 70%)

    def predict_generation(self, radiation_series, temperature_series, capacity_kw, years=1, albedo=0.2):
        """
        Calcula la serie temporal de generación solar.
        radiation_series: Serie de Irradiancia Global Inclinada (GTI) o aprox GHI en W/m2.
        temperature_series: Temperatura ambiente en C.
        capacity_kw: Capacidad instalada DC en kW.
        """
        # Aproximación NOCT (Temperatura Nominal de Operación de la Célula)
        # Estándar: NOCT = 45 C usualmente. Modificado a 43 C para paneles modernos.
        # T_cell = T_amb + (NOCT - 20) * (G / 800)
        t_cell = temperature_series + (43 - 20) * (radiation_series / 800.0)
        
        # Cálculo de Potencia DC con Corrección de Temperatura
        # P_dc = P_rated * (G / G_stc) * (1 + gamma * (T_cell - T_stc))
        
        # Manejo de valores NaN
        radiation_series = np.nan_to_num(radiation_series, nan=0.0)
        t_cell = np.nan_to_num(t_cell, nan=25.0) 
        
        temp_factor = (1 + self.temp_coef * (t_cell - self.temp_stc))
        
        # Limitar la generación a valores positivos
        # Chequeo para Bifacialidad
        bifacial_gain = 0.0
        if self.bifaciality > 0:
             rear_fraction = 0.1 
             bifacial_gain = self.bifaciality * albedo * rear_fraction
             
        p_dc_kw = capacity_kw * (radiation_series / self.g_stc) * temp_factor * (1 + bifacial_gain)
        
        # Potencia de corte del inversor (Cut-in)
        cut_in_power = 0.01 * capacity_kw
        p_ac_kw = np.where(p_dc_kw > cut_in_power, 
                           p_dc_kw * (1 - self.system_loss) * self.inverter_eff, 
                           0.0)
        
        p_ac_kw = np.clip(p_ac_kw, 0, None)
        
        return p_ac_kw
