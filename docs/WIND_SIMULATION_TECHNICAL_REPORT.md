# Informe Técnico: Modelo de Simulación Eólica y Dinámica de Fluidos

## 1. Introducción y Estándares IEC 61400
Este documento detalla la metodología científica utilizada en el motor de simulación eólica del TFG. El sistema implementa un modelo físico fundamentado en la mecánica de fluidos y la aerodinámica de turbinas, siguiendo las directrices de la norma **IEC 61400-12** para la evaluación del rendimiento de potencia.

Al igual que en el modelo solar, se utiliza una arquitectura híbrida donde la física modela el comportamiento teórico del fluido y la máquina, preparado para integrarse con capas de IA para corrección de sesgos locales (orografía compleja).

## 2. Fundamentos Físicos (Physics-Based Model)

### 2.1. Parámetros de Diseño de la Turbina
El modelo se parametriza para simular cualquier aerogenerador moderno, desde pequeña eólica hasta gigantes offshore:

*   **Geometría:** Altura del Buje ($h_{hub}$) y Diámetro del Rotor ($D$).
*   **Curva de Potencia:** Velocidades de arranque ($v_{cut-in}$), nominal ($v_{rated}$) y parada ($v_{cut-out}$).
*   **Factores Ambientales:** Exponente de Hellman (Rugosidad) y Densidad del aire ($\rho$).

### 2.2. Caracterización del Recurso Eólico (Distribución de Weibull)
El viento no es constante; es estocástico. Modelamos la probabilidad de ocurrencia de velocidades de viento mediante la Función de Densidad de Probabilidad (PDF) de Weibull, estándar en la industria:

$$ f(v; k, A) = \frac{k}{A} \left(\frac{v}{A}\right)^{k-1} e^{-(v/A)^k} $$

Donde:
*   $k$ (Shape Factor): Factor de forma (adimensional). Valores típicos $\approx 2.0$ (Distribución de Rayleigh).
*   $A$ (Scale Factor): Factor de escala (m/s), relacionado estrechamente con la velocidad media del viento.

### 2.3. Extrapolación Vertical (Perfil Logarítmico/Hellman)
Los datos meteorológicos suelen medirse a 10 metros de altura, pero las turbinas modernas operan a >80 metros. Utilizamos la **Ley Exponencial de Hellman** (Power Law) para corregir el recurso eólico por cizalladura del viento (wind shear):

$$ v_{hub} = v_{ref} \cdot \left( \frac{h_{hub}}{h_{ref}} \right)^{\alpha} $$

*   **$\alpha$ (Hellman Exponent):** Coeficiente de rugosidad.
    *   $\alpha \approx 0.10$: Mar abierto (Offshore, muy liso).
    *   $\alpha \approx 0.14$: Terreno llano / cultivos (Estándar Onshore).
    *   $\alpha \approx 0.20+$: Terreno complejo / urbano.

*Impacto:* Un pequeño cambio en $\alpha$ tiene un efecto cúbico en la producción final.

### 2.4. Aerodinámica y Conversión de Potencia ($C_p$)
La potencia extraíble del viento viene dada por la ecuación fundamental de la energía cinética:

$$ P_{viento} = \frac{1}{2} \rho A_{barrido} v^3 $$

El modelo implementa una curva de potencia idealizada (Sigmoide/Cúbica) que respeta el Límite de Betz ($C_{p,max} \approx 0.59$) implícitamente a través de la capacidad nominal:

1.  **Zona Muerta ($v < v_{in}$):** La turbina no tiene par suficiente para arrancar. $P=0$.
2.  **Zona de Operación ($v_{in} \le v < v_{rated}$):** Región de optimización $C_p$. La potencia crece cúbica con la velocidad ($P \propto v^3$).
3.  **Zona Nominal ($v_{rated} \le v < v_{out}$):** El sistema de "Pitch Control" limita la potencia a la capacidad nominal para evitar daños estructurales o eléctricos.
4.  **Zona de Corte ($v \ge v_{out}$):** Freno aerodinámico por seguridad ante ráfagas extremas.

### 2.5. Modelo de Pérdidas y Eficiencia
Para obtener la Energía Anual Estimada (AEP), aplicamos factores reductores secuenciales:

*   **Pérdidas por Estela (Wake Effect):** $\eta_{wake} \approx 0.90 - 0.95$. Crítico en parques eólicos donde unas turbinas "tapan" el viento a otras.
*   **Disponibilidad (Availability):** $\eta_{avail}$. Tiempo de inactividad por mantenimiento o fallo.
*   **Envejecimiento (Ageing):** Degradación aerodinámica de palas (erosión, suciedad) simuleda anualmente.

## 3. Implementación Computacional
El motor de cálculo utiliza `numpy` para operaciones vectorizadas de alta velocidad sobre series temporales horarias (8760 horas/año):

1.  **Generación Estocástica:** Se muestrean 8760 valores de la distribución de Weibull definida.
2.  **Escalado Vectorial:** Se aplica Hellman a todo el vector de velocidades simultáneamente.
3.  **Mapeo de Potencia:** Se aplica la función de transferencia de la turbina elemento a elemento.
4.  **Integración:** Suma de Riemann de la potencia instantánea para obtener energía (Wh).

Este enfoque permite realizar análisis de sensibilidad (ej. variar altura de buje) en milisegundos, habilitando la optimización iterativa del diseño del parque.

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
