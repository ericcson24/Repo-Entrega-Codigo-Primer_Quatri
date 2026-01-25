# Documentación Técnica: Modelo de Simulación Eólica 🌬️

Este documento describe la metodología de cálculo, las ecuaciones aerodinámicas y la lógica de negocio implementadas en el módulo de energía eólica del `Physics Engine`.

Ubicación del código: `physics_engine/models/wind.py`.

---

## 🏗 Arquitectura del Cálculo Eólico

A diferencia del modelo solar que dependen principalmente de la radiación, el modelo eólico es extremadamente sensible a tres factores:
1.  **Altura de buje (Hub Height):** El viento es más fuerte cuanto más alto subes.
2.  **Curva de Potencia:** Comportamiento no lineal de la turbina.
3.  **Densidad del Aire:** El aire frío y denso genera más energía que el aire caliente.

### Diagrama de Flujo Lógico

```mermaid
graph TD
    A[Request: Lat, Lon, Potencia, Altura Buje] -->|1. Ingesta Clima| B[WeatherConnector]
    B -->|Velocidad Viento 10m, Temp, Presión| C{Extrapolación Vertical}
    C -->|Ley Logarítmica| D[Velocidad a Altura de Buje (v_hub)]
    D -->|2. Corrección Densidad| E[Densidad del Aire (rho)]
    D & E -->|3. Curva de Potencia| F[Cálculo Potencia Bruta]
    F -->|4. Factor Realismo| G[Pérdidas de Estela/Disponibilidad]
    G -->|Salida| H[Perfil Generación Horario (kWh)]
```

---

## 1. Extrapolación del Recurso Eólico (Perfil Vertical)

Los datos meteorológicos estándar (Open-Meteo) proporcionan la velocidad del viento a 10 metros de altura ($v_{10}$). Sin embargo, las turbinas modernas operan a alturas de entre 80 y 120 metros.

Usamos la **Ley Logarítmica del Perfil del Viento** para estimar la velocidad a la altura del buje ($v_{hub}$):

$$ v_{hub} = v_{ref} \times \frac{\ln(h_{hub} / z_0)}{\ln(h_{ref} / z_0)} $$

*   $v_{ref}$: Velocidad de referencia a 10m ($v_{10}$).
*   $h_{hub}$: Altura de la turbina (ej. 80m).
*   $h_{ref}$: Altura de referencia (10m).
*   $z_0$: Longitud de rugosidad del terreno (Roughness Length).
    *   *Valor típico usado:* 0.03 (Tierras agrícolas abiertas).
    *   *Nota:* Terrenos más rugosos (bosques, ciudades) frenan más el viento ($z_0$ mayor).

> *Implementación:* Función `extrapolate_wind_speed` en `wind.py`.

---

## 2. Densidad del Aire (Corrección Termodinámica)

La energía cinética del viento depende de la masa de aire que golpea las palas. La densidad del aire ($\rho$) varía significativamente con la temperatura y la presión atmosférica.

$$ P_{corr} = P_{std} \times \frac{\rho_{site}}{\rho_{std}} $$
$$ \rho_{site} = \frac{P_{atm}}{R_{air} \times T_{kelvin}} $$

*   $P_{atm}$: Presión atmosférica local (Pa).
*   $R_{air}$: Constante de gas específica para aire seco ($287.058 \, J/kg\cdot K$).
*   $T_{kelvin}$: Temperatura ambiente en Kelvin ($T_{°C} + 273.15$).
*   $\rho_{std}$: Densidad estándar al nivel del mar ($1.225 \, kg/m^3$).

*Impacto:* En invierno (aire frío), una turbina puede producir hasta un 10-15% más de energía que en verano con la misma velocidad de viento.

---

## 3. Curva de Potencia de la Turbina

El modelo soporta dos modos de operación para convertir velocidad de viento ($v$) en potencia eléctrica ($P$).

### Modo A: Curva Específica (Interpolación)
Si el usuario selecciona una turbina del catálogo (ej. "Vestas V150"), usamos la curva de potencia real del fabricante (puntos $v, P$).
Se aplica una interpolación lineal entre los puntos definidos.

### Modo B: Modelo Genérico (Aproximación Cúbica)
Si no hay curva específica, usamos un modelo teórico simplificado:

1.  **Zona 1 (Arranque - Cut-in):** $v < 3 m/s \rightarrow P = 0$.
2.  **Zona 2 (Rampa):** $3 \le v < 12 m/s$. La potencia crece al cubo de la velocidad.
    $$ P \propto v^3 $$
3.  **Zona 3 (Nominal):** $12 \le v < 25 m/s$. Potencia constante máxima (Rated Power). El "pitch control" limita la captura de energía.
4.  **Zona 4 (Corte - Cut-out):** $v \ge 25 m/s \rightarrow P = 0$. Parada de emergencia para evitar daños estructurales.

```python
# Segmento de Rampa Cúbica
power[mask_ramp] = capacity_kw * ((wind_speed[mask_ramp] - cut_in) / (rated - cut_in)) ** 3
```

---

## 4. Factor de Realismo y Pérdidas

Las simulaciones teóricas suelen ser demasiado optimistas. Para acercar los resultados a la realidad de un parque eólico operativo, aplicamos factores de pérdida.

### Factor de Calibración Global (`REALISM_FACTOR`)
Aplicamos un factor de reducción del **30%** (`0.70`) al resultado final. Esto agrupa:
*   **Efecto Estela (Wake Effect):** Las turbinas delanteras roban viento a las traseras (5-10%).
*   **Disponibilidad Técnica:** Mantenimientos y averías (3-5%).
*   **Pérdidas Eléctricas:** Transformación y transmisión interna (2-3%).
*   **Sesgo del Modelo:** Los datos de satélite a veces sobreestiman el viento a baja altura en terrenos complejos.

$$ P_{neto} = P_{bruto} \times 0.70 $$

---

## Trazabilidad de Petición

Cuando se simula un parque eólico:

1.  **Backend:** Envía petición con `capacity_kw: 20000` (20 MW) y `hub_height: 100`.
2.  **Physics Router (`simulation.py`):**
    *   Obtiene series horarias de viento ($v_{10}$), temperatura y presión de los últimos 3 años.
3.  **Wind Model (`wind.py`):**
    *   Escala el viento de 10m a 100m. Si $v_{10}=5 m/s$, quizás $v_{100}=7.2 m/s$.
    *   Calcula densidad del aire hora a hora.
    *   Entra en la curva de potencia con la velocidad ajustada.
    *   Aplica el `REALISM_FACTOR`.
4.  **Resultado:** Devuelve el array de generación neta al Backend para el cálculo financiero.
