import pandas as pd
import numpy as np
from ai_engine.models.hydro import HydroModel
# Mock weather data generator to avoid API calls for this quick check across years
def get_mock_precipitation():
    # Similar to Madrid annual precip ~400-500mm but spread out
    # 8760 hours
    # ~500 hours of rain?
    precip = np.zeros(8760)
    indices = np.random.choice(8760, 500, replace=False)
    precip[indices] = np.random.uniform(1.0, 10.0, 500) # mm/h
    return precip

def test_hydro_performance():
    print("\n--- Hydro Simulation Check (Parametros Base) ---")
    
    # Parametros del Caso de Uso
    HEAD = 15 # metros
    FLOW_DESIGN = 5.0 # m3/s
    CAPACITY = 500.0 # kW
    
    # 1. Caso ORIGINAL (Diámetro 1.0m - Insuficiente)
    # Forzamos los parametros antiguos manuales
    model_bad = HydroModel(
        head_height=HEAD,
        flow_design=FLOW_DESIGN,
        turbine_params={
            "penstock_length": 100, 
            "penstock_diameter": 1.0, # BAD!!
            "efficiency": 0.9
        }
    )
    
    # 2. Caso CORREGIDO (El modelo ahora debería auto-ajustar si usa la misma clase, 
    # pero como he editado la clase, 'model_bad' de arriba YA TIENE el fix aplicado si llamo al metodo.
    # Ah, el fix chequea si V > 4. Si ponemos D=1.000001, lo detectará.
    
    # Para verificar el impacto, voy a imprimir el diametro que está usando internamente el modelo si pudiera,
    # pero el modelo recalcula D localmente en predict_generation.
    
    # Let's run prediction with mock data to see peak power
    precip = get_mock_precipitation()
    
    # We need enough precip to trigger full flow to see the loss effect.
    # Actually, the model uses precipitation to derive flow. 
    # Let's force flow inside the model logic? No, let's trust the 'predict_generation' logic
    # which calculates flow from precip.
    # OR better, since the model has a 'flow_design' override logic when flow_design is present
    # creating a synthetic flow.
    
    gen_kw = model_bad.predict_generation(precip)
    peak_gen = np.max(gen_kw)
    total_gen = np.sum(gen_kw)
    
    print(f"Resultados con Fix Aplicado:")
    print(f"Potencia Pico Generada: {peak_gen:.2f} kW (Limitada a {CAPACITY} kW por inversor/generador downstream si aplicase, aquí raw output)")
    print(f"Generación Total Anual Estimada: {total_gen:,.0f} kWh")
    
    # Explicación Financiera Rapida
    capex = 2_000_000
    revenue = (total_gen * 0.05) # 50 EUR/MWh base
    simple_payback = capex / revenue if revenue > 0 else 999
    
    print("\n--- Análisis Financiero Rápido (Simplificado) ---")
    print(f"Inversión: {capex:,.0f} €")
    print(f"Ingresos Brutos (aprox): {revenue:,.0f} €/año")
    print(f"Payback Simple: {simple_payback:.1f} años")
    print("Nota: El NPV incluye tasa de descuento (WACC) del 5-6%, lo que hace que el dinero futuro valga menos.")
    print("Si el Payback es > 15-18 años, el NPV suele ser negativo.")

if __name__ == "__main__":
    test_hydro_performance()
