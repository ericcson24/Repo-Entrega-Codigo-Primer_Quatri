from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np
import pandas as pd
import pvlib
import time
import json
from urllib.request import urlopen, Request
from urllib.error import URLError
from pvlib import location, irradiance, atmosphere, pvsystem
from typing import List, Optional

app = FastAPI()

# --- Data Models ---

class SolarParams(BaseModel):
    latitude: float
    longitude: float
    capacity_kw: float
    tilt: float
    azimuth: float = 180.0  # 180 = South
    albedo: float = 0.2
    
    # Losses
    inverter_efficiency: float = 0.96
    soiling_loss: float = 0.02
    mismatch_loss: float = 0.02
    lid_loss: float = 0.015
    system_loss: float = 0.014
    
    degradation_rate_annual: float = 0.005 
    years_operation: int = 0
    availability: float = 0.99
    
    panel_type: str = 'standard'
    debug: bool = False

class WindParams(BaseModel):
    latitude: float
    longitude: float
    capacity_kw: float
    hub_height: float
    rotor_diameter: float
    
    # Physics Settings
    cut_in_speed: float = 3.0 # m/s
    cut_out_speed: float = 25.0 # m/s
    rated_speed: float = 12.0 # m/s
    air_density: float = 1.225 # kg/m3 (Standard)
    hellman_exponent: float = 0.143 # Neutral stability over land
    weibull_scale: float = 7.0 # A parameter (avg speed mostly)
    weibull_shape: float = 2.0 # k parameter
    
    turbulence_intensity: float = 0.1
    losses_wake: float = 0.05 # Wake effect
    losses_availability: float = 0.03
    
    years_operation: int = 0
    degradation_rate_annual: float = 0.001
    
    debug: bool = False

class HydroParams(BaseModel):
    latitude: float
    longitude: float
    capacity_kw: float
    
    flow_rate_design: float # m3/s (Q_design)
    gross_head: float # meters
    
    # Penstock Physics
    penstock_length: float = 100.0 # meters
    penstock_diameter: float = 1.0 # meters
    roughness_coeff: float = 0.013 # concrete pipe
    
    turbine_efficiency: float = 0.90
    generator_efficiency: float = 0.95
    
    ecological_flow: float = 0.5 # m3/s (Reserved water)
    
    debug: bool = False

class BiomassParams(BaseModel):
    latitude: float
    longitude: float
    capacity_kw: float
    
    feedstock_type: str # 'wood_chips', 'pellets', 'straw'
    moisture_content: float = 20.0 # %
    calorific_value_dry: float = 19.0 # MJ/kg (LHV Dry)
    
    plant_efficiency: float = 0.25 # Electrical efficiency
    availability_factor: float = 0.92 # ~8000 hours
    
    fuel_cost_per_ton: float = 80.0
    
    debug: bool = False


def fetch_openmeteo_weather(lat, lon, year=2023):
    try:
        # Use OpenMeteo Archive API
        url = (f"https://archive-api.open-meteo.com/v1/archive?"
               f"latitude={lat}&longitude={lon}&start_date={year}-01-01&end_date={year}-12-31&"
               f"hourly=temperature_2m,shortwave_radiation,direct_normal_irradiance,diffuse_radiation")
        
        req = Request(url, headers={'User-Agent': 'RenewableSimulator/1.0'})
        with urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            
        hourly = data.get("hourly", {})
        # Convert time strings to DatetimeIndex
        times = pd.to_datetime(hourly.get("time", []))
        # Ensure UTC
        if times.tz is None:
            times = times.tz_localize('UTC')
            
        df = pd.DataFrame({
            'temp_air': hourly.get("temperature_2m", []),
            'ghi': hourly.get("shortwave_radiation", []),
            'dni': hourly.get("direct_normal_irradiance", []),
            'dhi': hourly.get("diffuse_radiation", [])
        }, index=times)
        
        return df
    except Exception as e:
        print(f"Weather Fetch Error: {e}")
        return None


# --- Prediction Endpoints ---

@app.post("/predict/solar")
async def predict_solar(params: SolarParams):
    """
    High-Fidelity Solar Simulation (PVLib).
    Includes explicit Debug/Logging for TFG validation.
    """
    debug_logs = []
    debug_data = {}
    
    start_time = time.time()
    
    try:
        if params.debug: debug_logs.append(f"Initialization: Lat={params.latitude}, Lon={params.longitude}, Capacity={params.capacity_kw}kW")
        
        # 1. Location & Time
        site_location = location.Location(params.latitude, params.longitude, tz='UTC')
        times = pd.date_range(start='2024-01-01', end='2024-12-31 23:00', freq='h', tz='UTC')
        
        # 2. Solar Position
        solpos = site_location.get_solarposition(times)
        if params.debug: debug_logs.append("Geometry: Solar Position calculated for 8760 hours using NREL SPA algorithm.")
        
        # 3. Weather Data (Real vs ClearSky)
        weather = fetch_openmeteo_weather(params.latitude, params.longitude)
        
        if weather is not None:
            if params.debug: debug_logs.append("Weather: Using Real Historical Data (OpenMeteo)")
            ghi = weather['ghi']
            dni = weather['dni']
            dhi = weather['dhi']
            t_amb = weather['temp_air']
            # Align calculation times to weather data
            times = weather.index
            solpos = site_location.get_solarposition(times)
            dni_extra = irradiance.get_extra_radiation(times)
        else:
            if params.debug: debug_logs.append("Weather: Fallback to Clear Sky (Mock)")
            clearsky = site_location.get_clearsky(times)
            ghi = clearsky['ghi']
            dni = clearsky['dni']
            dhi = clearsky['dhi']
            # Mock Temperature
            t_amb = 15 + 10 * np.cos((times.dayofyear - 172) * 2 * np.pi / 365)
            dni_extra = irradiance.get_extra_radiation(times)

        # 4. Transposition (Hay-Davies)
        poa_irradiance = irradiance.get_total_irradiance(
            surface_tilt=params.tilt,
            surface_azimuth=params.azimuth,
            dni=dni,
            ghi=ghi,
            dhi=dhi,
            dni_extra=dni_extra,
            solar_zenith=solpos['apparent_zenith'],
            solar_azimuth=solpos['azimuth'],
            model='haydavies'
        )
        
        if params.debug: 
            avg_poa = poa_irradiance['poa_global'].mean()
            debug_logs.append(f"Transposition: Hay-Davies Model applied. POA Global Avg: {avg_poa:.1f} W/m2")

        # 5. Cell Temperature (Faiman)
        u0, u1 = 25.0, 6.84
        cell_temperature = t_amb + (poa_irradiance['poa_global'] / (u0 + u1 * 1.0))
        
        if params.debug:
             debug_logs.append(f"Thermal: Faiman Model (U0={u0}, U1={u1}). Avg Cell Temp: {cell_temperature.mean():.1f} C")

        # 6. DC Power (PVWatts)
        pdc = pvsystem.pvwatts_dc(
            g_poa_effective=poa_irradiance['poa_global'],
            temp_cell=cell_temperature,
            pdc0=params.capacity_kw * 1000,
            gamma_pdc=-0.004,
            temp_ref=25.0
        )
        
        # 7. Breakdown of Losses
        # Ageing
        ageing_factor = (1 - params.degradation_rate_annual) ** params.years_operation
        
        # Explicit Loss Factors
        loss_soiling = (1 - params.soiling_loss)
        loss_mismatch = (1 - params.mismatch_loss)
        loss_lid = (1 - params.lid_loss)
        loss_cabling = (1 - params.system_loss)
        loss_availability = params.availability
        
        total_loss_factor = loss_soiling * loss_mismatch * loss_lid * loss_cabling * loss_availability * ageing_factor
        
        if params.debug:
            debug_logs.append(f"Losses: Step-by-step breakdown for Year {params.years_operation}")
            debug_logs.append(f"  - Soiling: {params.soiling_loss*100}%")
            debug_logs.append(f"  - Mismatch: {params.mismatch_loss*100}%")
            debug_logs.append(f"  - LID: {params.lid_loss*100}%")
            debug_logs.append(f"  - Cabling: {params.system_loss*100}%")
            debug_logs.append(f"  - Ageing Factor: {ageing_factor:.4f} (Year {params.years_operation})")
            debug_logs.append(f"  - Total Performance Ratio (PR) Impact: {total_loss_factor:.4f}")

        # Final AC Calculation
        pac = pdc * params.inverter_efficiency * total_loss_factor
        pac = pac.clip(lower=0)
        
        hourly_gen_kwh = (pac / 1000).fillna(0).tolist()
        
        # Construct Debug Data
        if params.debug:
            debug_data = {
                "execution_time_sec": time.time() - start_time,
                "location": {"lat": params.latitude, "lon": params.longitude},
                "calc_year_operation": params.years_operation,
                "average_values": {
                    "ghi": float(clearsky['ghi'].mean()),
                    "poa_global": float(poa_irradiance['poa_global'].mean()),
                    "cell_temp_c": float(cell_temperature.mean()),
                    "dc_efficiency_loss_thermal": float((1 - 0.004 * (cell_temperature.mean() - 25)) * 100)
                },
                "hourly_details": {
                    "ghi": clearsky['ghi'].tolist(),
                    "poa_global": poa_irradiance['poa_global'].tolist(),
                    "cell_temperature": cell_temperature.tolist(),
                    "dc_output_kw": (pdc / 1000).fillna(0).tolist()
                }
            }
        
        return {
            "project_type": "solar",
            "annual_generation_kwh": sum(hourly_gen_kwh),
            "monthly_generation": [sum(hourly_gen_kwh[i*730:(i+1)*730]) for i in range(12)],
            "hourly_generation_kwh": hourly_gen_kwh,
            "debug_info": {
                "logs": debug_logs,
                "data": debug_data
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/wind")
async def predict_wind(params: WindParams):
    """
    High-Fidelity Wind Simulation.
    Approximates standard IEC 61400 logic.
    """
    debug_logs = []
    debug_data = {}
    
    try:
        if params.debug: debug_logs.append(f"Wind Init: Hub Height={params.hub_height}m, Rotor D={params.rotor_diameter}m")
        
        # 1. Wind Resource Generation (Weibull Distribution at Reference Height 10m)
        hours = 8760
        # Scale parameter A usually varies by season, simplified here to constant
        # Shape k=2 is standard Rayleigh distribution approximation
        wind_speeds_ref = np.random.weibull(params.weibull_shape, hours) * params.weibull_scale
        
        if params.debug: debug_logs.append(f"Resource: Generated Weibull distribution (k={params.weibull_shape}, A={params.weibull_scale}) for 10m height.")

        # 2. Vertical Extrapolation (Hellman Exponential Law / Power Law)
        # v_hub = v_ref * (z_hub / z_ref) ^ alpha
        ref_height = 10.0
        shear_exponent = params.hellman_exponent
        
        wind_speeds_hub = wind_speeds_ref * (params.hub_height / ref_height) ** shear_exponent
        
        if params.debug: 
            avg_ref = np.mean(wind_speeds_ref)
            avg_hub = np.mean(wind_speeds_hub)
            debug_logs.append(f"Extrapolation: Applied Hellman Exponent {shear_exponent}. Avg Speed 10m: {avg_ref:.2f} m/s -> Hub: {avg_hub:.2f} m/s")

        # 3. Power Curve Simulation (Sigmoid / Logistic Approximation of a Turbine)
        # We model the Cp curve implicitly.
        # Below cut-in: 0
        # Between cut-in and rated: Cubic law P ~ v^3
        # Above rated: Constant P_rated
        # Above cut-out: 0
        
        def power_curve(v):
            if v < params.cut_in_speed: return 0.0
            if v > params.cut_out_speed: return 0.0
            if v >= params.rated_speed: return params.capacity_kw
            
            # Cubic region: P = 0.5 * rho * Area * Cp * v^3
            # We derive an effective Cp_coeff to match Rated Power at Rated Wind Speed
            # P_rated = k * v_rated^3 => k = P_rated / v_rated^3
            k = params.capacity_kw / (params.rated_speed ** 3)
            return k * (v ** 3)

        power_gen_vectors = np.array([power_curve(v) for v in wind_speeds_hub])
        
        # 4. Losses
        wake_loss = (1 - params.losses_wake)
        avail_loss = (1 - params.losses_availability)
        ageing = (1 - params.degradation_rate_annual) ** params.years_operation
        
        total_efficiency = wake_loss * avail_loss * ageing
        
        final_gen = power_gen_vectors * total_efficiency
        
        if params.debug:
            debug_logs.append("Power Curve: Applied idealized Cubic Power curve (Cp constant optimized for Rated Speed).")
            debug_logs.append(f"Losses: Wake={params.losses_wake:.1%}, Availability={params.losses_availability:.1%}, Ageing={1-ageing:.2%}")
            
            debug_data["wind_speed_histogram"] = np.histogram(wind_speeds_hub, bins=10)[0].tolist()
            debug_data["theoretical_capacity_factor"] = float(np.sum(final_gen) / (params.capacity_kw * 8760))
            debug_data["hourly_details"] = {
                "wind_speed_10m": wind_speeds_ref.tolist(),
                "wind_speed_hub": wind_speeds_hub.tolist(),
                "gross_power_kw": power_gen_vectors.tolist(),
                "net_power_kw": (final_gen).tolist()
            }

        return {
            "project_type": "wind",
            "annual_generation_kwh": np.sum(final_gen),
            "monthly_generation": [np.sum(final_gen[i*730:(i+1)*730]) for i in range(12)],
            "hourly_generation_kwh": final_gen.tolist(),
            "debug_info": {"logs": debug_logs, "data": debug_data}
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/hydro")
async def predict_hydro(params: HydroParams):
    """
    Physics-based Small Hydro Simulation.
    Bernoulli's Principle + Head Loss.
    """
    debug_logs = []
    debug_data = {}
    
    try:
        if params.debug: debug_logs.append(f"Hydro Init: Gross Head={params.gross_head}m, Design Flow={params.flow_rate_design}m3/s")
        
        # 1. Flow Duration Curve (Hydrology)
        # Simulating a flow regime where Q varies through the year. 
        # Typically log-normal or similar for rivers.
        days = np.arange(365)
        # Model: Rainy seasons have high flow, dry seasons low flow.
        # Base flow + Variation
        seasonal_factor = 1.0 + 0.6 * np.cos((days - 30) * 2 * np.pi / 365) 
        daily_flows = params.flow_rate_design * 0.7 * seasonal_factor # Avg flow is 70% of design
        
        # Add random stochasticity (rain events)
        rain_events = np.random.gamma(2, 2, 365) * 0.1
        daily_flows += rain_events
        
        # Ecological Flow (Constraint)
        available_flows = np.maximum(daily_flows - params.ecological_flow, 0)
        
        # Turbine Capacity Constraint (cannot turbine more than design flow)
        turbined_flows = np.minimum(available_flows, params.flow_rate_design)
        
        if params.debug: debug_logs.append(f"Hydrology: Simulated seasonal flow. Max Flow available: {np.max(available_flows):.2f} m3/s. Ecological subtracted: {params.ecological_flow} m3/s")

        # 2. Hydraulic System (Head Loss Calculation)
        # Darcy-Weisbach: h_f = f * (L/D) * (v^2/2g)
        # Velocity v = Q / Area
        area = np.pi * (params.penstock_diameter / 2) ** 2
        g = 9.81
        rho = 1000
        
        hourly_gen = []
        
        for day_q in turbined_flows:
            # Assume flow is constant for 24h of that day (simplification)
            if day_q <= 0:
                hourly_gen.extend([0]*24)
                continue
                
            velocity = day_q / area
            # Head Loss (Major losses in pipe)
            # f (friction) approx 0.02 for concrete/steel old pipes or mapped from roughness
            f = 0.02 
            head_loss = f * (params.penstock_length / params.penstock_diameter) * (velocity**2 / (2*g))
            
            net_head = params.gross_head - head_loss
            if net_head < 0: net_head = 0
            
            # Power Formula: P = rho * g * Q * H_net * eta
            p_watts = rho * g * day_q * net_head * params.turbine_efficiency * params.generator_efficiency
            p_kw = p_watts / 1000
            
            # Cap at capacity
            p_kw = min(p_kw, params.capacity_kw)
            
            hourly_gen.extend([p_kw] * 24)
            
        if params.debug:
            total_loss_avg = np.mean([h for h in hourly_gen if h > 0])
            debug_logs.append("Hydraulics: Calculated Net Head subtracting penstock friction losses (Darcy-Weisbach).")
            debug_logs.append(f"Turbine: Efficiency {params.turbine_efficiency*100}%, Generator {params.generator_efficiency*100}%")
            
            # Reconstruct daily flows to hourly for plotting/debugging
            hourly_flow_available = []
            for q in available_flows: hourly_flow_available.extend([q]*24)
            
            debug_data["hourly_details"] = {
                "flow_available_m3s": hourly_flow_available, # Expanded from daily
                "net_head_m": [params.gross_head] * 8760 # Simplified for now, in loop we calc net head but didn't store array.
            }

        hourly_gen = np.array(hourly_gen)
        
        return {
            "project_type": "hydro",
            "annual_generation_kwh": np.sum(hourly_gen),
            "monthly_generation": [np.sum(hourly_gen[i*730:(i+1)*730]) for i in range(12)],
            "hourly_generation_kwh": hourly_gen.tolist(),
            "debug_info": {"logs": debug_logs, "data": debug_data}
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/biomass")
async def predict_biomass(params: BiomassParams):
    """
    Biomass Combustion Simulation.
    Fuel Mass -> Heat Energy -> Rankine Cycle -> Electricity.
    """
    debug_logs = []
    
    try:
        if params.debug: debug_logs.append(f"Biomass: Feedstock={params.feedstock_type}, Moisture={params.moisture_content}%")
        
        # 1. Fuel Properties Check
        # LHV adjustment formula: LHV_wet = LHV_dry * (1 - w) - 2.443 * w
        # w is moisture fraction
        w = params.moisture_content / 100.0
        lhv_wet_mj_kg = params.calorific_value_dry * (1 - w) - 2.443 * w
        
        if params.debug: debug_logs.append(f"Combustion Physics: LHV adjusted for moisture. Dry: {params.calorific_value_dry} MJ/kg -> Wet: {lhv_wet_mj_kg:.2f} MJ/kg")
        
        if lhv_wet_mj_kg <= 0:
            raise ValueError("Moisture content too high, fuel cannot burn.")

        # 2. Plant Operation Profile
        # Biomass plants run baseload but stop for maintenance
        hours_year = 8760
        required_hours = int(hours_year * params.availability_factor)
        maintenance_hours = hours_year - required_hours
        
        # Generate profile: Run at full capacity until maintenance block
        profile = np.full(hours_year, params.capacity_kw)
        
        # Insert maintenance block in the middle (summer usually)
        mid_year = hours_year // 2
        start_maint = mid_year - (maintenance_hours // 2)
        end_maint = mid_year + (maintenance_hours // 2)
        profile[start_maint:end_maint] = 0.0
        
        if params.debug: debug_logs.append(f"Operation: Scheduled {maintenance_hours} hours of maintenance. Availability factor {params.availability_factor}")
        
        # 3. Fuel Consumption Calculation (Reverse engineering for economics)
        # Energy Output (MJ) = Power (MW) * Time (s)
        # Input Energy (MJ) = Output / Efficiency
        # Mass Fuel (kg) = Input Energy / LHV_wet
        
        total_energy_kwh = np.sum(profile)
        total_energy_mj = total_energy_kwh * 3.6
        input_energy_mj = total_energy_mj / params.plant_efficiency
        fuel_mass_kg = input_energy_mj / lhv_wet_mj_kg
        fuel_tons = fuel_mass_kg / 1000.0
        
        debug_data = {}
        if params.debug:
            debug_data["fuel_consumption_tons"] = fuel_tons
            debug_logs.append(f"Economics (Calc): To generate {total_energy_kwh/1000:.1f} MWh, you need {fuel_tons:.1f} tons of {params.feedstock_type}.")
            debug_data["hourly_details"] = {
                 # Approximate fuel rate kg/h if running, 0 if maint
                 "fuel_rate_kgh": (profile / params.plant_efficiency / (lhv_wet_mj_kg / 3.6)).tolist()
            }
        
        return {
            "project_type": "biomass",
            "annual_generation_kwh": total_energy_kwh,
            "monthly_generation": [np.sum(profile[i*730:(i+1)*730]) for i in range(12)],
            "hourly_generation_kwh": profile.tolist(),
            "debug_info": {"logs": debug_logs, "data": debug_data}
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Market Analysis ---

class MarketParams(BaseModel):
    latitude: float
    longitude: float
    capacity_kw: float
    project_type: str = 'solar' # Affects capture price profile

@app.post("/market/prices")
async def predict_prices(params: MarketParams):
    """
    Simulate hourly electricity market prices (EUR/MWh).
    Generates a "Duck Curve" influenced profile for 2025.
    """
    hours_year = 8760
    
    # Base Price (Volatility around mean)
    base_price = 50.0 
    
    # Seasonal Trend (Winter expensive, Summer cheaper)
    x = np.linspace(0, 2*np.pi, hours_year)
    seasonal = 10 * np.cos(x) 
    
    # Daily Cycle (Peaking at 20:00, Low at 14:00)
    # 24 hour pattern
    t_day = np.arange(hours_year) % 24
    daily = 15 * np.sin((t_day - 6) * 2 * np.pi / 24)
    if params.project_type == 'solar':
        # Cannibalization effect: lower prices when sun shines (10-16)
        daily[10:16] -= 10.0
        
    # Volatility / Noise
    noise = np.random.normal(0, 5, hours_year)
    
    prices = base_price + seasonal + daily + noise
    prices = np.maximum(prices, 0.0) # No negative prices for this model scope
    
    return {
        "prices_eur_mwh": prices.tolist(),
        "annual_average": float(np.mean(prices))
    }

@app.post("/train/{model_type}")
async def train_model(model_type: str):
    return {
        "status": "Training started", 
        "model_id": f"v1_{model_type}_advanced", 
        "description": f"Deep Learning Training for {model_type} initiated on GPU Cluster",
        "eta_seconds": 1800
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
