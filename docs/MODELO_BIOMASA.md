# Documentación Técnica: Modelo de Simulación de Biomasa 🏭🔥

Este documento detalla el algoritmo de despacho optimizado (Economic Dispatch) y los principios termodinámicos implementados para la simulación de plantas de biomasa en el `Physics Engine`.

Ubicación del código: `physics_engine/models/biomass.py`.

---

## 🏗 Concepto de Funcionamiento

A diferencia de las energías "intermitentes" (Solar/Eólica), la Biomasa es una energía **gestionable** (Dispatchable). 
Esto significa que la planta no produce energía cuando "hay sol", sino cuando **es económicamente rentable**.

El simulador no predice "cuándo habrá biomasa", sino que toma una decisión ejecutiva hora a hora basada en precios de mercado.

### Diagrama de Flujo de Decisión

```mermaid
graph TD
    A[Inputs: Precio Mercado, Coste Biomasa, Eficiencia, Stock Disponible] -->|1. Cálculo Costes| B[Coste Marginal (EUR/MWh)]
    B -->|2. Comparación| C{¿Precio Mercado > Coste Marginal?}
    C -->|NO| D[Planta Apagada (0 kW)]
    C -->|SÍ| E{¿Hay Stock Combustible?}
    E -->|NO| D
    E -->|SÍ| F[Despacho a Carga Nominal]
    F -->|3. Contabilidad| G[Restar Stock y Sumar Beneficio]
    D & G -->|Salida| H[Perfil de Generación Optimizado]
```

---

## 1. Termodinámica y Costes (El Coste Marginal)

El núcleo del modelo es determinar cuánto cuesta producir 1 kWh de electricidad. Esto depende de la eficiencia de la caldera/turbina y la calidad del combustible.

$$ \eta_{global} = \eta_{caldera} \times \eta_{ciclo\_rankine} \times \eta_{generador} \approx 20-30\% $$

La ecuación del **Coste Marginal de Generación (CMG)** es:

$$ CMG \ (\text{€}/MWh_{el}) = \frac{\text{Coste Biomasa (€/ton)} \times 1000}{PCI \ (kWh_{th}/kg) \times \eta_{global}} $$

*   $PCI$: Poder Calorífico Inferior del combustible (ej. Astilla forestal seca $\approx 4.5 kWh/kg$).
*   $\eta_{global}$: Rendimiento eléctrico neto de la planta.
*   $Coste Biomasa$: Precio de la materia prima puesto en planta.

> *Significado:* Si mi CMG es 80 €/MWh, la planta **solo arrancará** cuando el precio del mercado eléctrico, el OMIE ("Pool"), supere los 80 €/MWh.

---

## 2. Algoritmo de Optimización de Despacho

El simulador implementa un algoritmo de **"Peak Shaving" restringido por stock**.

### Problema
Una planta real tiene un contrato de suministro limitado (ej. 5.000 toneladas al año). No puede funcionar las 8.760 horas. Debe elegir las mejores horas.

### Estrategia (Greedy Optimization)
1.  Calculamos el **Beneficio Potencial** para cada hora del año: $Spread_h = PrecioMercado_h - CMG$.
2.  Descartamos horas con $Spread < 0$ (pérdidas).
3.  Ordenamos las horas restantes de **mayor a menor rentabilidad**.
4.  Llenamos las horas con producción hasta que se agote el stock de combustible anual (`max_fuel_ton`).

```python
# Lógica en Python (Pseudocódigo)
combustible_por_hora = (Capacidad / Eficiencia) / PCI
horas_maximas_operacion = Stock_Total / combustible_por_hora

df['margen'] = df['precio_pool'] - coste_marginal
df_rentable = df[df['margen'] > 0].sort_values('margen', ascending=False)

horas_a_operar = df_rentable.head(horas_maximas_operacion)
dispatch[horas_a_operar.index] = Capacidad_Nominal
```

---

## 3. Ejemplo Numérico (Trazabilidad)

Supongamos una planta pequeña de 1 MW.

*   **Capacidad:** 1.000 kW
*   **Eficiencia:** 25% (0.25)
*   **Biomasa:** Astilla a 40 €/ton. PCI = 4.0 kWh/kg.
*   **Stock:** 2.000 toneladas/año.

**Paso 1: Coste Marginal**
*   Energía térmica requerida para 1 kWe: $1 / 0.25 = 4 kW_{th}$.
*   Biomasa necesaria: $4 kW_{th} / 4.0 (kWh/kg) = 1 kg/h$.
*   Coste por kg: $40 € / 1000 = 0.04 €/kg$.
*   Coste por kWh eléctrico: $1 kg \times 0.04 € = 0.04 €/kWh$ -> **40 €/MWh**.

**Paso 2: Capacidad de Operación**
*   Consumo a plena carga: $1.000 kg/h$ (1 tonelada/hora).
*   Stock total: 2.000 toneladas.
*   Horas posibles: 2.000 horas (de las 8.760 del año).

**Paso 3: Decisión de Mercado**
El simulador buscará las 2.000 horas más caras del año (típicamente noches de invierno o tardes de verano) donde el precio $> 40 €$.
En esas horas generará 1 MW. En el resto, 0 MW.

---

## 4. Parámetros Clave (`BiomassOptimizer`)

| Variable | Default | Descripción | Impacto |
| :--- | :--- | :--- | :--- |
| `efficiency` | 25% | Rendimiento termodinámico | Crítico. Si baja, el CMG se dispara. |
| `pci_kwh_kg` | 4.5 | Calidad del combustible | PCI alto (Pellet) baja el consumo. PCI bajo (Poda húmeda) lo sube. |
| `fuel_cost` | 150 €/t | Precio combustible | Determina el umbral de arranque. |
| `max_fuel_ton` | 0 (Inf) | Restricción de stock | Si es 0 o null, se asume suministro infinito y opera siempre que sea rentable. |

---

*Nota: Este modelo asume operación flexible ideal (arranque instantáneo). En plantas reales existen rampas de arranque y costes de encendido que este modelo simplificado ignora en favor de la velocidad de cálculo.*
