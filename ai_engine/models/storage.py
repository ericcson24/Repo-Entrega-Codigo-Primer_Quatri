import numpy as np

class BatteryStorage:
    def __init__(self, energy_capacity_kwh, power_capacity_kw, efficiency=0.9):
        self.capacity_kwh = energy_capacity_kwh
        self.max_power_kw = power_capacity_kw
        self.efficiency = efficiency
        # State of Charge (kWh)
        # We simulate array-wise usually, but here logic needs state.
        # Vectorized stateful logic is hard. We used iterative usually or numba.
        # For Python fast performance on 8760, loop is acceptable (<100ms).
    
    def optimize_arbitrage(self, price_series_eur_mwh):
        """
        Simple Arbitrage Strategy:
        Charge if Price < Perc50
        Discharge if Price > Perc80
        Check Limits.
        """
        prices = np.array(price_series_eur_mwh)
        threshold_charge = np.percentile(prices, 40)
        threshold_discharge = np.percentile(prices, 90)
        
        soc = 0.0 # Start empty
        dispatch_kw = np.zeros(len(prices)) # Positive = Discharge, Negative = Charge
        soc_series = np.zeros(len(prices))
        
        for i in range(len(prices)):
            price = prices[i]
            
            # Decision
            if price <= threshold_charge:
                 # Try Charge Max
                 energy_to_charge = self.max_power_kw # kW * 1h = kWh
                 # Limit by Space
                 space_available = self.capacity_kwh - soc
                 actual_charge = min(energy_to_charge, space_available)
                 
                 dispatch_kw[i] = -actual_charge
                 # SOC increases with efficiency loss? usually charge loss + discharge loss. 
                 # We apply sqrt(eff) each way or full eff on round trip.
                 # Let's say efficiency is round trip. Charge eff = sqrt(eff).
                 eff_one_way = np.sqrt(self.efficiency)
                 soc += actual_charge * eff_one_way
                 
            elif price >= threshold_discharge:
                 # Try Discharge Max
                 energy_to_discharge = self.max_power_kw
                 # Limit by SOC
                 # Discharge energy required from SOC = Energy / eff_one_way
                 eff_one_way = np.sqrt(self.efficiency)
                 max_energy_from_soc = soc * eff_one_way # Energy we can output
                 
                 actual_discharge = min(energy_to_discharge, max_energy_from_soc)
                 dispatch_kw[i] = actual_discharge
                 soc -= actual_discharge / eff_one_way
                 
            soc_series[i] = soc
            
        return dispatch_kw, soc_series
