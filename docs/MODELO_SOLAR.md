# Documentación Técnica: Modelo de Simulación Fotovoltaica ☀️

Este documento detalla la formulación matemática y el flujo de ejecución del motor de cálculo solar integrado en el `Physics Engine`.

---

## 🏗 Arquitectura del Cálculo Solares

La simulación solar no se basa en promedios mensuales simples, sino en un análisis vectorial horario (`hourly timestep`) que considera la interacción térmica y óptica del módulo fotovoltaico.

El proceso completo se orquesta desde `physics_engine/models/solar.py` y se expone vía API en `simulation.py`.

### Diagrama de Flujo Lógico

```mermaid
graph TD
    A[Request: Lat, Lon, Potencia, Tilt, Azimuth] -->|1. Validación| B(Router /solar)
    B -->|2. Ingesta Clima| C[WeatherConnector]
    C -->|API Externa| D(Open-Meteo)
    D -->|Radiation GHI, DNI, DHI, Temp, Wind| C
    C -->|3. Transposición Irradiancia| E[Cálculo de Plano Inclinado (POA)]
    E -->|G_poa, T_amb| F[Modelo Físico (SolarModel)]
    F -->|4. Modelo Térmico| G{Temp. Célula (T_cell)}
    G -->|5. Eficiencia DC| H[Generación DC]
    H -->|6. Pérdidas Sistema| I[Conversión AC (Inversor)]
    I -->|Salida| J[Perfil Generación Horario (kWh)]
```

---

## 1. Adquisición y Transposición de Datos (Paso 2 y 3)

Antes de calcular energía, necesitamos saber cuánta luz incide realmente sobre el panel inclinado.

*   **API Open-Meteo:** Obtenemos Irradiancia Global Horizontal (GHI), Directa (DNI) y Difusa (DHI).
*   **Transposición:** El engine convierte estos componentes horizontales al plano del panel (Plane of Array - POA). Si no se proporciona un modelo avanzado, se usa una aproximación geométrica estándar basada en el ángulo de inclinación ($\beta$) y azimut ($\gamma$).

---

## 2. Modelo Físico Matemático (Paso 4 y 5)

El núcleo del cálculo reside en la clase `SolarModel`. A continuación, se explican las ecuaciones utilizadas.

### 2.1 Modelo Térmico de la Célula
Los paneles pierden eficiencia con el calor. Calculamos la temperatura de operación de la célula ($T_{cell}$) usando el modelo NOCT (Nominal Operating Cell Temperature).

$$ T_{cell} = T_{amb} + (NOCT - 20^{\circ}C) \times \frac{G_{poa}}{800} $$

*   $T_{amb}$: Temperatura ambiente horaria (°C).
*   $G_{poa}$: Irradiancia en el plano del panel (W/m²).
*   $NOCT$: Temperatura de célula a 800 W/m², 20°C amb. (Valor típico usado: 43-45°C).

> *Implementación en código:* Línea 24 de `solar.py`.

### 2.2 Potencia DC con Corrección Térmica
Calculamos la potencia bruta de salida del módulo en Corriente Continua (DC).

$$ P_{DC} = P_{nom} \times \frac{G_{poa}}{G_{STC}} \times [1 + \gamma \times (T_{cell} - T_{STC})] \times (1 + G_{bifacial}) $$

*   $P_{nom}$: Capacidad instalada (kWp) bajo condiciones estándar.
*   $G_{STC}$: Irradiancia estándar (1000 W/m²).
*   $T_{STC}$: Temperatura estándar (25°C).
*   $\gamma$: Coeficiente de temperatura de potencia (ej. -0.0030/°C par Mono-PERC). Valor negativo: a más calor, menos potencia.
*   $G_{bifacial}$: Ganancia extra por albedo (si aplica).

---

## 3. Pérdidas del Sistema y Conversión AC (Paso 6)

La energía DC debe pasar por el inversor y el cableado.

$$ P_{AC} = P_{DC} \times (1 - L_{sys}) \times \eta_{inv} $$

*   $L_{sys}$: Pérdidas sistémicas combinadas (cableado, suciedad/soiling, mismatch). Valor default: 14% (0.14).
*   $\eta_{inv}$: Eficiencia del inversor (ej. 96%).

### Corte de Potencia (Cut-in)
Implementamos un umbral mínimo de funcionamiento. Si la potencia generada es despreciable (noche o muy poca luz), el inversor no arranca.

```python
# Lógica vectorizada en numpy
p_ac_kw = np.where(p_dc_kw > cut_in_power, 
                   p_dc_kw * (1 - self.system_loss) * self.inverter_eff, 
                   0.0)
```

---

## 4. Trazabilidad de una Petición completa

¿Qué ocurre exactamente cuando el usuario pide simular una planta solar?

1.  **Frontend:** Envía `{ "lat": 40.41, "lon": -3.7, "capacity_kw": 100 }`.
2.  **Backend (Node):** Reenvía la petición al contenedor `physics_engine`.
3.  **Physics Router (`simulation.py`):**
    *   Detecta que es una petición solar.
    *   Llama a `get_weather_data`.
        *   Este conector comprueba si tenemos datos climáticos recientes en caché para esa lat/lon.
        *   Si no, descarga series horarias de 3 años (2021-2023) para tener robustez estadística.
    *   Instancia `SolarModel(temp_coef=-0.003, ...)`.
    *   Ejecuta `model.predict_generation(...)` pasando los arrays gigantes de radiación y temperatura.
    *   Devuelve un array de 8760 valores (promedio horario anual).
4.  **Backend (Node):**
    *   Recibe el perfil de generación.
    *   Lo escala a 20 años aplicando degradación anual (ej. 0.5%/año).
    *   Calcula ingresos: $Generación_h \times PrecioSpot_h$.
    *   Guarda resultados en TimescaleDB.

---

## Resumen de Parámetros por Defecto

Estos valores se usan si el usuario no especifica componentes concretos (Modo "Estimación Rápida"):

| Parámetro | Valor | Descripción |
| :--- | :--- | :--- |
| **Pérdidas Sistema** | 14% | Cableado, polvo, sombras. |
| **Eficiencia Inversor** | 96% | Estándar de mercado actual. |
| **Coef. Temperatura** | -0.30%/°C | Tecnología Mono-PERC moderna. |
| **Degradación** | 0.5% anual | Pérdida de rendimiento por envejecimiento. |
| **Albedo** | 0.2 | Reflexión del suelo (hierba/tierra). |

---

*Este documento es complementario a `EXPLICACION_TECNICA.md` y se enfoca exclusivamente en la física del modelo solar.*
