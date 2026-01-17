import numpy as np
import pandas as pd

class BiomassOptimizer:
    def __init__(self, efficiency=0.25, fuel_cost_eur_ton=150, pci_kwh_kg=4.5):
        """
        efficiency: Thermal to Electric efficiency
        fuel_cost_eur_ton: Cost of biomass
        pci_kwh_kg: Lower Heating Value (kWh per kg)
        """
        self.efficiency = efficiency
        self.fuel_cost_eur_kg = fuel_cost_eur_ton / 1000.0
        self.pci = pci_kwh_kg

    def optimize_dispatch(self, price_series_eur_mwh, capacity_kw):
        """
        Determine when to run based on marginal cost.
        """
        # Calculate Marginal Cost (EUR/MWh)
        # 1 MWh electric needs (1/eff) MWh thermal
        # 1 MWh thermal = 1000 kWh.
        # Fuel needed (kg) = 1000 / PCI
        # Cost (EUR/MWh_thermal) = (1000 / PCI) * Cost_kg
        # Cost (EUR/MWh_electric) = Cost_thermal / Efficiency
        
        fuel_needed_kg_per_kwh_thermal = 1.0 / self.pci
        cost_per_kwh_thermal = fuel_needed_kg_per_kwh_thermal * self.fuel_cost_eur_kg
        cost_per_mwh_thermal = cost_per_kwh_thermal * 1000.0
        
        marginal_cost_eur_mwh = cost_per_mwh_thermal / self.efficiency
        
        # Dispatch Strategy: Run if Price > Marginal Cost
        is_running = price_series_eur_mwh > marginal_cost_eur_mwh
        
        generation_mw = np.where(is_running, capacity_kw / 1000.0, 0.0)
        generation_kw = generation_mw * 1000.0
        
        profit_eur = (price_series_eur_mwh - marginal_cost_eur_mwh) * generation_mw
        profit_eur = profit_eur.clip(lower=0) # Only count positive or zero
        
        return generation_kw, is_running, profit_eur
