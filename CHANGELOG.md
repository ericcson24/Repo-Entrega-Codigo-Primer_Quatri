# Changelog

## [Unreleased] - 2026-01-17

### Added
- **Frontend**: Estandarización de `HydroCalculator`, `BiomassCalculator` y `WindCalculator` para coincidir con la UI de Solar (Español, selectores de ciudades).
- **Frontend**: "Modo Avanzado" para ocultar parámetros financieros complejos (Deuda, IPC, WACC) en todas las calculadoras.
- **Docs**: Nueva sección en `SOLAR_SIMULATION_TECHNICAL_REPORT.md` detallando la implementación de coordenadas y sanitización.

### Fixed
- **Solar Simulation ("Solar Suicide Bug")**: Corregido bug donde inputs de degradación > 0.05 se interpretaban como factores absolutos (50%) en lugar de porcentajes (0.5%). Ahora `simulation.py` divide por 100 si detecta valores altos.
- **Solar Yield (Low Generation)**: Corregida la transformación de Azimut en `weather_connector.py`. Se restauró la lógica `azimuth - 180` para alinear el sistema (Sur=180) con la API de OpenMeteo, recuperando niveles de producción realistas (~1500 kWh/kWp).
- **Financial**: Corregido cálculo de TIR (IRR) negativa infinita causada por flujos de caja colapsados bajo alta degradación.
