# Informe Técnico: Modelo de Simulación Fotovoltaica y Predicción con IA

## 1. Introducción y Filosofía "Hybrid PV Model"
Este documento detalla la metodología científica y técnica utilizada en el módulo de simulación solar del Trabajo de Fin de Grado (TFG). El sistema se basa en una arquitectura de **Modelo Híbrido Físico-Estadístico**, alineada con los estándares de laboratorios de referencia como **NREL (USA)** y **Fraunhofer ISE (Alemania)**.

La filosofía se divide en dos etapas:
1.  **Modelo Físico Determinista:** Calcula la energía teórica con máxima precisión utilizando ecuaciones físicas fundamentales (pvlib).
2.  **Corrección de Sesgo (Residual Learning):** Una capa de Inteligencia Artificial (LSTM) aprende los errores residuales del modelo físico comparando con datos reales, eliminando sesgos sistemáticos.

## 2. Fundamentos Físicos (Physics-Based Model)

### 2.1. Parámetros Avanzados de Entrada
El sistema permite la configuración detallada de parámetros físicos para ajustar la simulación a la realidad de la instalación:

*   **Geolocalización:** Latitud, Longitud y Altitud.
*   **Geometría del Sistema:**
    *   **Inclinación (Tilt):** Ángulo óptimo ($\beta$).
    *   **Azimut:** Orientación respecto al Sur.
*   **Parámetros Industriales (Pérdidas Detalladas):**
    *   Soiling (Suciedad): 2-5%
    *   Mismatch (Desajuste eléctrico): 1-3%
    *   LID (Degradación Inducida por Luz): 1-2% en primer año.
    *   Degradación Anual: 0.5-0.8%/año (Envejecimiento).
    *   Disponibilidad Técnica (Availability): Tiempo de inoperatividad.

### 2.2. Irradiancia Solar (Recurso Primario)
Calculamos la geometría solar precisa (`pvlib.solarposition.get_solarposition`).
Si los datos de entrada son GHI, utilizamos modelos de descomposición como **DIRINT** o **DISC** para separar:

$$ GHI = DHI + DNI \cdot \cos(\theta_z) $$

### 2.3. Transposición al Plano Inclinado (POA)
Para calcular la irradiancia en el panel ($G_{POA}$), superamos el modelo isotrópico simple. Utilizamos el modelo de **Perez** (estándar para cielos nublados) o **Hay-Davies**, que dividen la radiación difusa en componentes circunsolar e isotrópica.

$$ G_{POA} = G_{beam} + G_{ground\_reflected} + G_{diffuse\_sky} $$

*   *Mejora Académica:* El modelo de Perez es dinámico y ajusta el brillo del horizonte, superior al modelo de Liu & Jordan clásico.

### 2.4. Modelo Térmico de la Célula (Faiman)
La temperatura de la célula es crítica. Usamos el modelo empírico de Faiman (IEC 61853), calibrado con coeficientes experimentales:

$$ T_c = T_a + \frac{G_{POA}}{U_0 + U_1 \cdot W_s} $$

Valores típicos utilizados:
*   $U_0 \approx 25 W/m^2K$ (Coeficiente de pérdida constante)
*   $U_1 \approx 6.84 W/m^2K/ (m/s)$ (Coeficiente convectivo por viento)

### 2.5. Modelo de Potencia DC (Modos de Simulación)
El sistema soporta conceptualmente dos niveles de precisión:

*   **Modo Rápido (Coeficientes):** $P_{DC} = P_{STC} \cdot \frac{G}{1000} \cdot [1 + \gamma (T_c - 25)]$
*   **Modo Preciso (Single Diode Model):** Resuelve el circuito equivalente de 5 parámetros ($I_L, I_0, R_s, R_{sh}, n$), capturando efectos no lineales a baja irradiancia (`pvlib.singlediode`).

### 2.6. Cadena de Pérdidas "Industrial-Grade"
Calculamos la potencia AC final aplicando una productoria de factores de pérdida:

$$ P_{AC} = P_{DC} \cdot \eta_{inv}(P_{DC}) \cdot \prod (1 - L_i) $$

Donde la eficiencia del inversor $\eta_{inv}$ sigue una curva dependiente de la carga, y las pérdidas $L_i$ incluyen:
*   $L_{mismatch}$: Desajuste de módulos.
*   $L_{lid}$: Degradación inicial.
*   $L_{ageing} = (1 - \text{degradación\_anual})^{\text{años}}$.

## 3. Capa de Inteligencia Artificial (Residual Learning Framework)

Implementamos un esquema de aprendizaje residual donde la IA no predice la energía desde cero, sino que predice el **error** del modelo físico ($\epsilon$).

$$ P_{final} = P_{físico} + \text{LSTM}(Contexto_{meteo}) $$

### Métricas de Validación
Para demostrar la robustez, el TFG evalúa el modelo con métricas estándar:
*   **RMSE (Root Mean Square Error):** Error cuadrático medio.
*   **nMAE:** Error absoluto medio normalizado a la capacidad instalada.
*   **Skill Score:** Mejora porcentual respecto al modelo físico puro ($1 - \frac{RMSE_{híbrido}}{RMSE_{físico}}$).

## 4. Referencias
*   *Sandia National Laboratories PV Performance Modeling Collaborative.*
*   *Duffie, J. A., & Beckman, W. A. (2013). Solar Engineering of Thermal Processes.*
*   *IEC 61724: Photovoltaic system performance.*
