import numpy as np
import pandas as pd

class BiomassOptimizer:
    def __init__(self, efficiency=0.25, fuel_cost_eur_ton=150, pci_kwh_kg=4.5, tech_params=None):
        """
        efficiency: Eficiencia Térmica a Eléctrica
        fuel_cost_eur_ton: Coste de biomasa
        pci_kwh_kg: Poder Calorífico Inferior (kWh por kg)
        tech_params: Diccionario del catálogo
        """
        self.efficiency = float(efficiency)
        self.fuel_cost_eur_kg = float(fuel_cost_eur_ton) / 1000.0
        self.pci = float(pci_kwh_kg)
        self.tech_params = tech_params or {}
        
        if self.tech_params.get("efficiency_electric"):
             self.efficiency = float(self.tech_params["efficiency_electric"])
             
        # Nuevo parámetro para restricción de combustible
        self.max_fuel_kg_year = float(self.tech_params.get("max_fuel_ton", 0)) * 1000.0

    def optimize_dispatch(self, price_series_eur_mwh, capacity_kw):
        """
        Determina cuándo operar basándose en coste marginal y disponibilidad de combustible.
        Retorna: Serie de Generación de Potencia (kW).
        """
        # Asegurar que entrada es array numpy
        price_series_eur_mwh = np.array(price_series_eur_mwh)

        # Calcular Coste Marginal (EUR/MWh)
        # 1 MWh eléctrico necesita (1/eff) MWh térmico
        # 1 MWh térmico = 1000 kWh.
        # Combustible necesario (kg) = 1000 / PCI
        # Coste (EUR/MWh_térmico) = (1000 / PCI) * Coste_kg
        # Coste (EUR/MWh_eléctrico) = Coste_térmico / Eficiencia
        
        fuel_needed_kg_per_kwh_thermal = 1.0 / self.pci
        cost_per_kwh_thermal = fuel_needed_kg_per_kwh_thermal * self.fuel_cost_eur_kg
        cost_per_mwh_thermal = cost_per_kwh_thermal * 1000.0
        
        marginal_cost_eur_mwh = cost_per_mwh_thermal / self.efficiency
        
        # Calcular consumo de combustible a plena carga por hora
        # Salida: capacity_kw (kWh por hora)
        # Entrada Térmica: capacity_kw / efficiency
        # Entrada Combustible (kg): (capacity_kw / efficiency) / pci
        fuel_consumption_kg_per_hour = (capacity_kw / self.efficiency) / self.pci

        # Calcular Beneficio Neto para cada hora si operara
        # Profit = (Price - MarginalCost) * Capacity_MW
        # We just need to compare Price vs Marginal Cost to know priority
        profits = price_series_eur_mwh - marginal_cost_eur_mwh
        
        # Initialize dispatch array with zeros
        dispatch = np.zeros_like(price_series_eur_mwh)
        
        # If we have a fuel limit (and it's positive), we use "Limited Energy Dispatch"
        if self.max_fuel_kg_year > 0:
            # We want to run in the MOST profitable hours
            # First, filter mostly profitable hours (Profit > 0)
            # Actually, even if Profit < 0, we shouldn't run.
            
            # Create a dataframe to sort
            df_dispatch = pd.DataFrame({
                "profit": profits,
                "original_index": np.arange(len(profits))
            })
            
            # Filter only profitable hours
            df_dispatch = df_dispatch[df_dispatch["profit"] > 0]
            
            # Sort by profit descending
            df_dispatch = df_dispatch.sort_values(by="profit", ascending=False)
            
            # Calculate how many hours we can run
            # Total hours possible = Total Fuel / Fuel per Hour
            max_hours = int(self.max_fuel_kg_year / fuel_consumption_kg_per_hour)
            
            # Select top hours
            selected_indices = df_dispatch.head(max_hours)["original_index"].values
            
            # Set dispatch
            if len(selected_indices) > 0:
                dispatch[selected_indices] = capacity_kw
        else:
            # Infinite fuel mode (or old behavior: run whenever profitable)
            # BUT Diagnosis says "No fuel input implies 0 generation".
            # So if max_fuel_kg_year is 0, we should generate 0.
            # To be safe and support legacy/testing, if explicit 0 is passed, it is 0.
            # However, previously tech_params didn't have "max_fuel_ton".
            # If tech_params is None or missing key, we might default to infinite?
            # User instructions imply we need to fix the "0 generation" issue by providing fuel.
            # So if I default to 0 here, correct behavior is achieved (it was 0 before due to cost, now 0 due to fuel).
            # But wait! The previous code generated 0 because marginal cost was HIGH.
            # If I fix marginal cost (via correct PCI), it WOULD generate.
            # But the user wants fuel constraint.
            
            # Let's decide: If "max_fuel_ton" is NOT in tech_params, infinite.
            # If "max_fuel_ton" IS in tech_params, respect it.
            if "max_fuel_ton" not in self.tech_params:
                 # Legacy / Infinite
                 dispatch = np.where(
                    price_series_eur_mwh > marginal_cost_eur_mwh,
                    capacity_kw, 
                    0.0 
                )
            else:
                # Explicitly provided as 0 or some value
                if self.max_fuel_kg_year <= 0:
                    dispatch[:] = 0.0
                else:
                     # Already handled in 'if' block above, so this else is unreachable if logic is correct
                     pass
        
        return dispatch
