# Documentación de Constantes del Sistema

Este documento define todas las constantes utilizadas en el simulador de energías renovables. Estas constantes afectan a los cálculos físicos, financieros y de mercado.

## 1. Constantes Económicas Globales (ECONOMICS)

| Constante | Valor por Defecto | Descripción | Impacto |
|-----------|-------------------|-------------|---------|
| `VAT` | 0.21 (21%) | Impuesto sobre el Valor Añadido | Afecta al coste final para consumidores residenciales. |
| `ELECTRICITY_TAX` | 0.051127 (5.11%) | Impuesto Especial sobre Electricidad | Se aplica sobre el término de energía y potencia. |
| `TOLLS_AND_CHARGES` | 0.08 €/kWh | Peajes y Cargos del Sistema | Costes regulados por uso de la red (ATR). |
| `METER_RENTAL` | 0.81 €/mes | Alquiler de Contador | Coste fijo mensual en la factura. |

## 2. Energía Solar Fotovoltaica (SOLAR)

### Parámetros Técnicos
| Constante | Valor | Descripción |
|-----------|-------|-------------|
| `TEMP_COEFF_PMAX` | -0.0035 (-0.35%/ºC) | Pérdida de eficiencia por cada ºC que sube la temperatura de la célula por encima de 25ºC. |
| `SYSTEM_PERFORMANCE_RATIO` | 0.85 (85%) | Eficiencia global del sistema (Cableado, Inversor, Suciedad). |
| `OPTIMAL_ANGLE` | 35º | Inclinación óptima para maximizar producción anual en España. |
| `INVERTER_EFFICIENCY` | 0.96 (96%) | Eficiencia de conversión DC/AC del inversor. |
| `DEGRADATION_RATE` | 0.0055 (0.55%) | Pérdida anual de eficiencia de los paneles. |

### Parámetros Financieros
| Constante | Valor | Descripción |
|-----------|-------|-------------|
| `OPEX_PERCENTAGE` | 1.5% | Coste de Operación y Mantenimiento anual como % del CAPEX. |

## 3. Energía Eólica (WIND)

### Parámetros Técnicos
| Constante | Valor | Descripción |
|-----------|-------|-------------|
| `AIR_DENSITY_SEA_LEVEL` | 1.225 kg/m³ | Densidad del aire estándar a nivel del mar. Afecta directamente a la potencia (P ∝ densidad). |
| `SHEAR_EXPONENT` | 0.143 | Coeficiente de cizalladura del viento (Hellmann) para extrapolar velocidad a diferentes alturas. |
| `AVAILABILITY_FACTOR` | 0.97 (97%) | Tiempo que la turbina está operativa y no en mantenimiento. |
| `WAKE_LOSSES` | 0.05 (5%) | Pérdidas por efecto estela en parques eólicos (sombras de viento). |
| `CUT_IN_SPEED` | 3.5 m/s | Velocidad mínima de arranque. |
| `CUT_OUT_SPEED` | 25.0 m/s | Velocidad de corte por seguridad (freno). |

## 4. Mercado y Finanzas (MARKET & FINANCIAL)

| Constante | Valor | Descripción |
|-----------|-------|-------------|
| `DISCOUNT_RATE` | 6.5% | WACC (Weighted Average Cost of Capital) para cálculo del VAN. |
| `INFLATION_ENERGY` | 3.0% | Inflación anual estimada del precio de la energía. |
| `GRID_PRICE` | 0.15 €/kWh | Precio base de la electricidad si falla el mercado en tiempo real. |
| `FEED_IN_TARIFF_SOLAR` | 0.05 €/kWh | Precio de venta de excedentes solares a la red. |

## Notas sobre la IA
El sistema utiliza estas constantes para entrenar modelos de regresión cuando no hay datos históricos suficientes, pero prioriza el aprendizaje basado en los datos de `data/weather` y `data/prices` (2020-2024) para ajustar los coeficientes de predicción (ej: Performance Ratio real vs teórico).
