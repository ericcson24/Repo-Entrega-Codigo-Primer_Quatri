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
        # Beneficio = (Precio - CosteMarginal) * Capacidad
        # Solo necesitamos comparar Precio vs Coste Marginal para saber la prioridad
        profits = price_series_eur_mwh - marginal_cost_eur_mwh
        
        # Inicializar array de despacho con ceros
        dispatch = np.zeros_like(price_series_eur_mwh)
        
        # Si tenemos límite de combustible (y es positivo), usamos "Despacho de Energía Limitada"
        if self.max_fuel_kg_year > 0:
            # Queremos operar en las horas MÁS rentables
            # Primero, filtrar horas mayormente rentables (Profit > 0)
            # En realidad, si Profit < 0, no deberíamos operar de todos modos.
            
            # Crear dataframe para ordenar
            df_dispatch = pd.DataFrame({
                "profit": profits,
                "original_index": np.arange(len(profits))
            })
            
            # Filtrar solo horas rentables
            df_dispatch = df_dispatch[df_dispatch["profit"] > 0]
            
            # Ordenar por beneficio descendente
            df_dispatch = df_dispatch.sort_values(by="profit", ascending=False)
            
            # Calcular cuántas horas podemos operar
            # Total horas posibles = Combustible Total / Combustible por Hora
            max_hours = int(self.max_fuel_kg_year / fuel_consumption_kg_per_hour)
            
            # Seleccionar mejores horas
            selected_indices = df_dispatch.head(max_hours)["original_index"].values
            
            # Establecer despacho
            if len(selected_indices) > 0:
                dispatch[selected_indices] = capacity_kw
        else:
            # Modo combustible infinito (comportamiento legacy: opera siempre que sea rentable)
            # Decisión de diseño: Si "max_fuel_ton" no está en tech_params, asumimos infinito.
            # Si "max_fuel_ton" está presente y es 0, la generación será 0.
            pass # Lógica por defecto de operar si hay beneficio (ya calculado si profit > 0 se usara)
            
            # En modo "infinito", simplemente despachamos si Profit > 0
            # Filtrar horas rentables
            profitable_indices = np.where(profits > 0)[0]
            if len(profitable_indices) > 0:
                dispatch[profitable_indices] = capacity_kw
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
