import numpy as np
import pandas as pd

class WindModel:
    def __init__(self, hub_height=80, rough_length=0.03):
        self.hub_height = hub_height
        self.rough_length = rough_length # Roughness length z0 (approx 0.03 for crop land)
        self.ref_height = 10 # Data usually at 10m

    def extrapolate_wind_speed(self, wind_speed_10m):
        """
        Log law for wind shear.
        v_h = v_ref * (ln(z_h / z0) / ln(z_ref / z0))
        """
        # Avoid division by zero or log of zero if wind is 0 (though wind is usually > 0 in data or 0 explicitly)
        scale_factor = np.log(self.hub_height / self.rough_length) / np.log(self.ref_height / self.rough_length)
        return wind_speed_10m * scale_factor

    def power_curve_interpolated(self, wind_speed, curve_data):
        """
        Specific Power Curve Interpolation
        curve_data: list of [speed, power] points
        """
        # Unzip points
        curve_speeds = np.array([p[0] for p in curve_data])
        curve_powers = np.array([p[1] for p in curve_data])
        
        # Use numpy interp (Linear interpolation between points)
        # Assuming wind_speed is a vector
        # Scale power by capacity? Usually curves are absolute kW in catalog.
        # But if user defines different capacity, we scale.
        # For now, we assume the Curve IS the turbine.
        
        return np.interp(wind_speed, curve_speeds, curve_powers, left=0, right=0)

    def power_curve(self, wind_speed, capacity_kw):
        """
        Generic Power Curve (Sigmoid/Cubic approximation)
        Used when no specific manufacturer curve is provided.
        """
        cut_in = 3.0
        rated = 12.0
        cut_out = 25.0
        
        # Initialize output array
        power = np.zeros_like(wind_speed)
        
        # Region 2: Cubic rise from Cut-in to Rated
        # P ~ v^3
        # Simple cubic fit: P(v) = Capacity * ((v - cut_in) / (rated - cut_in))^3
        mask_ramp = (wind_speed >= cut_in) & (wind_speed < rated)
        power[mask_ramp] = capacity_kw * ((wind_speed[mask_ramp] - cut_in) / (rated - cut_in)) ** 3
        
        # Region 3: Constant Rated Power from Rated to Cut-out
        mask_rated = (wind_speed >= rated) & (wind_speed < cut_out)
        power[mask_rated] = capacity_kw
        
        # Region 4: Cut-out (Automatic zero via initialization)
        
        return power

    def predict_generation(self, wind_speed_10m_series, capacity_kw, temperature_c=None, pressure_hpa=None, specific_curve=None):
        """
        Predict with optional specific turbine curve.
        specific_curve: List of [speed, power]
        """
        v_hub = self.extrapolate_wind_speed(wind_speed_10m_series)
        
        # Calculate Base Power
        if specific_curve:
            power_output = self.power_curve_interpolated(v_hub, specific_curve)
            # If the curve is for 1 turbine (e.g. 4.2MW) but capacity request is 42MW, we simply scale?
            # Industrial logic: Capacity / TurbineRating = Number of Turbines.
            # But here we might just assume curve is normalized or we normalize it.
            # Let's Normalize Curve to [0, 1] then multiply by Capacity for simplicity in "Total Park" context.
            
            curve_max = max([p[1] for p in specific_curve])
            if curve_max > 0:
                power_output = (power_output / curve_max) * capacity_kw
        else:
            power_output = self.power_curve(v_hub, capacity_kw)
        
        # Apply Density Correction if environmental data is provided
        if temperature_c is not None and pressure_hpa is not None:
             # Handle NaNs
             temperature_c = np.nan_to_num(temperature_c, nan=15.0)
             pressure_hpa = np.nan_to_num(pressure_hpa, nan=1013.25)
             
             # Convert to Kelvin and Pascals (hPa * 100)
             temp_k = temperature_c + 273.15
             pressure_pa = pressure_hpa * 100.0
             
             # Gas constant for dry air
             r_specific = 287.058 
             
             rho_site = pressure_pa / (r_specific * temp_k)
             rho_std = 1.225
             
             # Correction Factor
             # Power is proportional to density: P ~ rho * v^3
             density_factor = rho_site / rho_std
             
             # Apply correction
             power_output = power_output * density_factor
             
             # Ensure we don't exceed capacity even with high density (Turbine control limits this)
             power_output = np.clip(power_output, 0, capacity_kw)

        return power_output
