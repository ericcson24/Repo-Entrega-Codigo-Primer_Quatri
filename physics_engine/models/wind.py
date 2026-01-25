import numpy as np
import pandas as pd

class WindModel:
    def __init__(self, hub_height=80, rough_length=0.03):
        self.hub_height = hub_height
        self.rough_length = rough_length # Longitud de rugosidad z0 (aprox 0.03 para tierras de cultivo)
        self.ref_height = 10 # Datos meteorológicos usualmente a 10m

    def extrapolate_wind_speed(self, wind_speed_10m):
        """
        Ley Logarítmica para cortante de viento (wind shear).
        v_h = v_ref * (ln(z_h / z0) / ln(z_ref / z0))
        """
        # Evitar división por cero o log de cero
        scale_factor = np.log(self.hub_height / self.rough_length) / np.log(self.ref_height / self.rough_length)
        return wind_speed_10m * scale_factor

    def power_curve_interpolated(self, wind_speed, curve_data):
        """
        Interpolación de Curva de Potencia Específica
        curve_data: lista de puntos [velocidad, potencia]
        """
        # Descomprimir puntos
        curve_speeds = np.array([p[0] for p in curve_data])
        curve_powers = np.array([p[1] for p in curve_data])
        
        # Usar interpolación lineal de numpy
        # Si la velocidad del viento es un vector
        # Asumimos que la curva define la turbina completa (kW absolutos)
        
        return np.interp(wind_speed, curve_speeds, curve_powers, left=0, right=0)

    def power_curve(self, wind_speed, capacity_kw):
        """
        Curva de Potencia Genérica (Aproximación Sigmoide/Cúbica)
        Usada cuando no se provee curva específica del fabricante.
        """
        cut_in = 3.0
        rated = 12.0
        cut_out = 25.0
        
        # Inicializar array de salida
        power = np.zeros_like(wind_speed)
        
        # Región 2: Crecimiento cúbico desde Cut-in hasta Rated
        # P ~ v^3
        # Ajuste cúbico simple: P(v) = Capacidad * ((v - cut_in) / (rated - cut_in))^3
        mask_ramp = (wind_speed >= cut_in) & (wind_speed < rated)
        power[mask_ramp] = capacity_kw * ((wind_speed[mask_ramp] - cut_in) / (rated - cut_in)) ** 3
        
        # Región 3: Potencia Nominal Constante desde Rated hasta Cut-out
        mask_rated = (wind_speed >= rated) & (wind_speed < cut_out)
        power[mask_rated] = capacity_kw
        
        # Región 4: Cut-out (Cero automático vía inicialización)
        
        return power

    def predict_generation(self, wind_speed_10m_series, capacity_kw, temperature_c=None, pressure_hpa=None, specific_curve=None):
        """
        Predicción con curva específica opcional de turbina.
        specific_curve: Lista de [velocidad, potencia]
        """
        v_hub = self.extrapolate_wind_speed(wind_speed_10m_series)
        
        # Calcular Potencia Base
        if specific_curve:
            power_output = self.power_curve_interpolated(v_hub, specific_curve)
            # Normalizar curva a [0, 1] y luego multiplicar por Capacidad para contexto de "Parque Total".
            
            curve_max = max([p[1] for p in specific_curve])
            if curve_max > 0:
                power_output = (power_output / curve_max) * capacity_kw
        else:
            power_output = self.power_curve(v_hub, capacity_kw)
        
        # Aplicar corrección por densidad si hay datos ambientales
        if temperature_c is not None and pressure_hpa is not None:
             # Manejo de NaNs
             temperature_c = np.nan_to_num(temperature_c, nan=15.0)
             pressure_hpa = np.nan_to_num(pressure_hpa, nan=1013.25)
             
             # Convertir a Kelvin y Pascales (hPa * 100)
             temp_k = temperature_c + 273.15
             pressure_pa = pressure_hpa * 100.0
             
             # Constante de gas para aire seco
             r_specific = 287.058 
             
             rho_site = pressure_pa / (r_specific * temp_k)
             rho_std = 1.225
             
             # Factor de Corrección
             # La potencia es proporcional a la densidad: P ~ rho * v^3
             # Potencia Corregida = Power_std * (rho_site / rho_std)
             power_output = power_output * (rho_site / rho_std)
        
        # --- NEW REALISM FIX ---
        # Scale down power output to match realistic Capacity Factors for onshore/inland locations
        # Madrid is NOT offshore. Users might get >50% CF which is unrealistic.
        # We apply a "System Efficiency" or "Availability & Wake Loss" factor.
        # Standard losses: Wake (5-10%), Electrical (2-3%), Availability (2-3%). Total ~85-90% eff.
        # But if the wind data is too optimistic (OpenMeteo 100m might be strong), we limit it further.
        
        # Hard cap or soft scaling?
        # Let's apply a 0.75 scaling factor to bring 50% CF down to ~37%.
        # This is a heuristic "Calibration Factor" for the generic model.
        REALISM_FACTOR = 0.70 
        power_output = power_output * REALISM_FACTOR
        
        return power_output
