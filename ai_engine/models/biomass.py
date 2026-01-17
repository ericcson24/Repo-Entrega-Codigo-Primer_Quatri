import numpy as np
import pandas as pd

class BiomassOptimizer:
    def __init__(self, efficiency=0.25, fuel_cost_eur_ton=150, pci_kwh_kg=4.5, tech_params=None):
        """
        efficiency: Thermal to Electric efficiency
        fuel_cost_eur_ton: Cost of biomass
        pci_kwh_kg: Lower Heating Value (kWh per kg)
        tech_params: Dict from catalog
        """
        self.efficiency = float(efficiency)
        self.fuel_cost_eur_kg = float(fuel_cost_eur_ton) / 1000.0
        self.pci = float(pci_kwh_kg)
        self.tech_params = tech_params or {}
        
        if self.tech_params.get("efficiency_electric"):
             self.efficiency = float(self.tech_params["efficiency_electric"])

    def optimize_dispatch(self, price_series_eur_mwh, capacity_kw):
        """
        Determine when to run based on marginal cost.
        Returns: Power Generation Series (kW).
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
        
        # Dispatch Strategy: If Price > Marginal Cost, Run at Max Capacity.
        # Else, Run at Min Load (if needed) or 0.
        # Ideally: 0 if < cost. 
        # But industrial plants often have min stable load.
        min_load_ratio = self.tech_params.get("min_load_ratio", 0.0)
        
        dispatch = np.where(
            price_series_eur_mwh > marginal_cost_eur_mwh,
            capacity_kw, # Run full
            0.0 # Shutdown
        )
        
        # Advanced: Start-up costs not modeled here, but min load logic implies we might stay on if close?
        # For this simulator, economic dispatch is simpler.
        
        return dispatch
