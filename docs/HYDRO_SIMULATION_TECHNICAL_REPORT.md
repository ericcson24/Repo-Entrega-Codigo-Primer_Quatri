# Informe Técnico: Modelo de Simulación Hidráulica (Mini-Hidráulica)

## 1. Introducción y Principios Hidrodinámicos
Este documento describe el modelo físico utilizado para simular centrales de pasada (run-of-river) y pequeñas presas. El motor se basa en la conversión de energía potencial gravitatoria en energía cinética y eléctrica, modelando el flujo mediante **Curvas de Duración de Caudal (FDC)** y pérdidas hidráulicas según principios de mecánica de fluidos.

## 2. Fundamentos Físicos (Physics-Based Model)

### 2.1. Ecuación Fundamental de Potencia Hidráulica
La potencia bruta teórica se deriva de la ecuación de la energía potencial:

$$ P_{grav} = \rho \cdot g \cdot Q \cdot H_{neto} $$

Donde:
*   $\rho \approx 1000 \, kg/m^3$: Densidad del agua.
*   $g \approx 9.81 \, m/s^2$: Aceleración de la gravedad.
*   $Q$ ($m^3/s$): Caudal turbinable en el instante $t$.
*   $H_{neto}$ ($m$): Salto neto efectivo (altura de caída menos pérdidas).

### 2.2. Modelado del Recurso Hídrico (Flow Duration Curve)
A diferencia del viento (Weibull), el agua sigue patrones estacionales más predecibles pero complejos. Utilizamos una **Curva de Duración de Caudal (FDC)** estocástica ajustada estacionalmente.

*   **Distribución Log-Normal/Pearson III:** Se utiliza para modelar la variabilidad diaria del caudal en torno a la media mensual histórica.
*   **Caudal Ecológico ($Q_{eco}$):** Restricción legal.
    $$ Q_{disp} = \max(0, Q_{rio} - Q_{eco}) $$

### 2.3. Dinámica de Fluidos y Pérdidas de Carga (Head Loss)
El salto bruto ($H_{gross}$) no es el salto útil. El modelo calcula las pérdidas por fricción en la tubería forzada utilizando la ecuación de **Darcy-Weisbach**:

$$ h_f = f \cdot \frac{L}{D} \cdot \frac{v^2}{2g} $$

Y las pérdidas menores (codos, válvulas, rejillas):

$$ h_m = K \cdot \frac{v^2}{2g} $$

Por tanto, el salto neto varía dinámicamente con el caudal:
$$ H_{neto}(t) = H_{gross} - (h_f(Q_t) + h_m(Q_t)) $$

*Nota:* A mayor caudal, mayor velocidad del fluido, y las pérdidas aumentan al cuadrado ($h_{loss} \propto Q^2$), reduciendo la eficiencia a plena carga.

### 2.4. Eficiencia de la Turbina ($\eta_{turb}$)
El modelo selecciona curvas de eficiencia características según el tipo de turbina parametrizado:

*   **Pelton:** Alta presión, bajo caudal. Eficiencia plana y alta incluso a cargas parciales.
*   **Francis:** Media presión. Eficiente en punto nominal, cae rápido fuera de diseño.
*   **Kaplan:** Baja presión, alto caudal. Muy plana gracias a álabes ajustables.

$$ P_{electrica} = P_{grav} \cdot \eta_{turb}(Q/Q_{design}) \cdot \eta_{gen} \cdot \eta_{trans} $$

## 3. Implementación Computacional
La simulación anual recorre 8760 horas resolviendo el balance de masas y energías:

1.  **Entrada:** Caudales afluentes diarios interpolados a horarios.
2.  **Restricciones:** Resta de caudal ecológico y limitación por capacidad máxima de turbina.
3.  **Hidráulica:** Cálculo iterativo de pérdidas de carga para determinar $H_{neto}$ actual.
4.  **Conversión:** Interpolación en tabla de eficiencia $\eta = f(Carga)$.

Este modelo captura fenómenos no lineales como la caída de rendimiento en sequías (por falta de caudal) o en inundaciones (por reducción de salto útil al subir el nivel de aguas abajo).

## 4. Modelización Económica y Financiera

El módulo financiero (`financialService.js`) implementa un modelo de flujo de caja descontado (DCF) validado industrialmente, compartido con el resto de tecnologías del simulador.

### 4.1. Análisis de Apalancamiento y Rentabilidad
El sistema desglosa los resultados en dos perspectivas:
*   **Perspectiva del Proyecto (Unlevered):** Evalúa la calidad intrínseca del activo sin considerar cómo se paga. Utiliza el WACC como tasa de descuento.
*   **Perspectiva del Inversor (Levered Equity):** Evalúa la rentabilidad del capital propio aportado. Considera el servicio de la deuda (Principal + Intereses) y utiliza el Coste del Equity ($K_e$) como tasa.
    *   *Nota:* El modelo demuestra numéricamente el efecto del apalancamiento positivo: aumentar deuda suele subir la TIR (menos inversión inicial) pero reduce el Cash Flow Libre Total (pago de intereses).

### 4.2. Estructura de Ingresos
La proyección de ingresos soporta múltiples estrategias comerciales:
*   **Venta a Mercado (Merchant):** Volumen horario ($MWh_t$) multiplicado por precios capturados del pool ($€/MWh_t$).
*   **Autoconsumo Industrial:** Valoración de la energía a coste evitado (tarifa minorista), típicamente superior al precio mayorista.
*   **Fiscalidad:** Modelado detallado de Amortización (Depreciación lineal), Impuesto de Sociedades y Deducciones fiscales al CAPEX.
