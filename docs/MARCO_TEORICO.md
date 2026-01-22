# 4. Marco Teórico

El desarrollo de este simulador energético híbrido se fundamenta en la aplicación rigurosa de principios físicos para la conversión de recursos renovables y en modelos estocásticos avanzados para la gestión económica y la predicción de mercados. Este capítulo expone las bases teóricas implementadas en el código, justificando la elección de cada algoritmo frente a alternativas más simples e integrando los principios metodológicos detallados en los informes técnicos sectoriales (Solar, Eólica, Biomasa e Hidráulica) que acompañan a este proyecto.

## 4.1. Fundamentos de Energía Solar Fotovoltaica: Modelo Híbrido

La generación fotovoltaica exige un modelado preciso que trascienda la mera conversión lineal. Nuestra aproximación adopta una filosofía de **"Modelo Híbrido Físico-Estadístico"**, alineada con los estándares de laboratorios de referencia como NREL, que combina la robustez de las ecuaciones físicas deterministas con la capacidad de corrección de sesgo mediante técnicas de aprendizaje automático (Residual Learning).

### 4.1.1. Geometría Solar y Descomposición de Radiación
La posición solar es determinista y se calcula con algoritmos astronómicos de alta precisión (biblioteca *pvlib*). Un desafío crítico en la simulación es la naturaleza de los datos meteorológicos de entrada. Las fuentes satelitales (como Open-Meteo) proporcionan típicamente la **Irradiancia Global Horizontal (GHI)**, mientas que el generador responde a la energía en el plano del array.

Para modelar la captación, definimos el sistema de coordenadas esféricas utilizado:
*   **Ángulo Cenital Solar ($\theta_z$)**: Medido desde la vertical (cenit). Es el complementario de la elevación solar ($\alpha_s$): $\theta_z = 90^\circ - \alpha_s$.
*   **Azimut Solar ($\gamma_s$)**: Ángulo medido sobre el horizonte.
*   **Azimut del Panel ($\gamma_p$)**: Orientación geográfica del array.
*   **Inclinación del Panel ($\beta$)**: Ángulo respecto a la horizontal ("tilt").

*Nota de Implementación:* El código gestiona explícitamente la conversión de convenios azimutales. Mientras que la norma meteorológica (Open-Meteo) sitúa el $0^\circ$ en el Sur (o Norte según versión), nuestro núcleo de simulación estandariza internamente a **$0^\circ = \text{Norte}$ y $180^\circ = \text{Sur}$**, aplicando una rotación de $180^\circ$ en la capa ETL cuando es necesario para asegurar la consistencia vectorial en el cálculo del **Ángulo de Incidencia ($\theta_{inc}$)**:

$$ \cos(\theta_{inc}) = \cos(\theta_z)\cos(\beta) + \sin(\theta_z)\sin(\beta)\cos(\gamma_s - \gamma_p) $$

Para resolver la irradiancia incidente, el sistema utiliza modelos de descomposición (como **DIRINT** o **DISC**) para separar la GHI en:
$$ GHI = DHI + DNI \cdot \cos(\theta_z) $$
Donde $DHI$ es la componente difusa y $DNI$ la directa normal. Posteriormente, se aplica un modelo de transposición anisotrópico (como el modelo de **Perez** o **Hay-Davies**) para calcular la **Irradiancia Global Inclinada (GTI)** o $G_{POA}$, integrando las componentes directa, difusa del cielo y reflejada por el suelo (albedo).

### 4.1.2. Termodinámica del Módulo (Modelo Faiman/NOCT)
La eficiencia de conversión disminuye con la temperatura. Rechazamos la simplificación $T_{celda} \approx T_{ambiente}$ y adoptamos el modelo empírico de **Faiman (IEC 61853)** o **NOCT**, que considera las pérdidas convectivas por viento:

$$ T_c = T_{amb} + \frac{G_{POA}}{U_0 + U_1 \cdot W_s} $$

Donde $U_0$ es el coeficiente de pérdida térmica constante y $U_1$ el coeficiente convectivo dependiente de la velocidad del viento ($W_s$). Esta temperatura alimenta el modelo de potencia DC, aplicando un coeficiente térmico ($\gamma \approx -0.35\%/^\circ C$) que penaliza la producción estival.

### 4.1.3. Cadena de Pérdidas "Industrial-Grade"
La potencia final inyectada a red ($P_{AC}$) se obtiene aplicando una cascada de factores de pérdida ($L_i$) sobre la potencia DC ideal:
$$ P_{AC} = P_{DC} \cdot \eta_{inv}(Carga) \cdot \prod (1 - L_i) $$
Incluyendo *Soiling* (suciedad), *Mismatch* (desajuste eléctrico), *LID* (degradación inicial) y una degradación anual por envejecimiento ($Ageing$) sanitizada algorítmicamente para evitar errores de escala.

## 4.2. Aerodinámica Avanzada y Conversión Eólica

El modelado eólico del proyecto sigue las directrices de la norma **IEC 61400-12**, abordando la naturaleza estocástica y tridimensional del fluido.

### 4.2.1. Caracterización del Recurso (Weibull y Hellman)
El recurso eólico se modela estadísticamente mediante la **Distribución de Weibull**, caracterizada por sus factores de forma ($k$) y escala ($A$). Dado que los datos meteorológicos suelen medirse a 10m de altura, es imperativo realizar una extrapolación vertical hasta la altura del buje ($h_{hub} > 80m$).
Para ello, se implementa la **Ley Exponencial de Hellman** (o Logarítmica), regida por el coeficiente de rugosidad $\alpha$ (Hellman Exponent):
$$ v_{hub} = v_{ref} \cdot \left( \frac{h_{hub}}{h_{ref}} \right)^{\alpha} $$
Un valor típico de $\alpha \approx 0.14$ (tierras de cultivo) se utiliza por defecto, pero el modelo permite ajustarlo para simular terrenos complejos ($\alpha > 0.20$) o marinos ($\alpha < 0.10$).

### 4.2.2. Curvas de Potencia y Eficiencia Aerodinámica ($C_p$)
La conversión de energía no sigue la ley cúbica ideal ($P \propto v^3$) indefinidamente, sino que está acotada por la curva de potencia real de la turbina:
1.  **Zona Muerta ($v < v_{in}$)**: Sin generación por fricción estática.
2.  **Zona de Optimización ($v_{in} \le v < v_{rated}$)**: Maximización del coeficiente de potencia $C_p$ (limitado teóricamente por Betz a 0.59).
3.  **Zona Nominal ($v_{rated} \le v < v_{out}$)**: Regulación activa (*Pitch Control*) para mantener potencia constante y proteger la estructura.
4.  **Corte ($v \ge v_{out}$)**: Parada de emergencia.

El modelo integra pérdidas específicas por **Efecto Estela (Wake Effect)**, simulando la reducción de viento en parques densos, y disponibilidad técnica.

## 4.3. Tecnologías Gestionables: Termodinámica e Hidráulica

Para los sistemas de respaldo (*dispatchable*), el modelo cambia de una lógica de "recurso disponible" a una de "recurso almacenado y coste de oportunidad".

### 4.3.1. Biomasa: Ciclo Rankine y Despacho Económico
La simulación de biomasa modela un ciclo termodinámico de vapor. La variable crítica es el **Poder Calorífico Inferior Húmedo ($LHV_w$)**, que se ajusta dinámicamente según el contenido de humedad ($w$) de la biomasa, penalizando la eficiencia por el calor latente de vaporización del agua contenida en el combustible:
$$ LHV_w = LHV_{dry} \cdot (1 - w) - \Delta h_{vap} \cdot w $$

La operación se rige por una lógica de **Despacho Económico**: la planta compite en el mercado ("Peaking") o cubre carga base, activándose solo cuando el precio eléctrico cubre los costes marginales de combustible y operación ($OPEX$). El sistema gestiona también el inventario físico (stockpile) para asegurar la continuidad de suministro.

### 4.3.2. Hidráulica: Fluido y Curvas de Duración
El modelo hidráulico (para centrales de pasada o mini-hidráulica) se fundamenta en la ecuación de energía potencial:
$$ P = \eta_{turb}(Q) \cdot \rho \cdot g \cdot Q \cdot H_{neto}(Q) $$
Se introduce una no-linealidad crítica: las **Pérdidas de Carga** ($H_{loss}$) en la tubería forzada aumentan con el cuadrado del caudal (Ecuación de Darcy-Weisbach), reduciendo el **Salto Neto** efectivo ($H_{neto}$) a plena carga.

El recurso hídrico se modela estocásticamente mediante **Curvas de Duración de Caudal (FDC)** ajustadas estacionalmente (distribuciones Log-Normal/Pearson III), respetando siempre el **Caudal Ecológico** normativo.

## 4.4. Almacenamiento Electroquímico (BESS)

El submodelo de baterías utiliza una lógica de estados (*Stateful Logic*) para gestionar el **Estado de Carga (SoC)**. La estrategia principal es el **Arbitraje de Precios**:
*   **Carga**: Cuando precio < $P_{40}$ (percentil 40, valle).
*   **Descarga**: Cuando precio > $P_{90}$ (percentil 90, punta).
El modelo contabiliza la eficiencia de ciclo completo (*round-trip efficiency*), asegurando que el arbitraje genere valor neto real.

## 4.5. Modelado Económico-Financiero Integrado

Todos los módulos técnicos convergen en un motor financiero común (`financialService.js`) implementado bajo la clase estática `FinancialService`. Este módulo centraliza los algoritmos de evaluación de inversiones, distinguiendo dos perspectivas fundamentales: rentabilidad del proyecto (*Project IRR*) y rentabilidad del accionista (*Equity IRR*).

### 4.5.1. Flujos de Caja Descontados (Método DCF)
El simulador evita aproximaciones estáticas en favor de un análisis dinámico temporal (anual a 20-30 años). La métrica core es el **Valor Actual Neto (VAN / NPV)**, calculado matemáticamente como:

$$ \text{VAN} = \sum_{t=0}^{N} \frac{CF_t}{(1 + r)^t} $$

Donde $CF_t$ representa el flujo de caja libre en el año $t$, y $r$ es la tasa de descuento o WACC.
Para la resolución de la **Tasa Interna de Retorno (TIR / IRR)**, dada la no linealidad de la ecuación $VAN(r) = 0$, el código implementa el **Método Numérico de Newton-Raphson**, que itera para encontrar la raíz $f(r)=0$ utilizando la derivada del VAN:

$$ r_{n+1} = r_n - \frac{\text{VAN}(r_n)}{\text{VAN}'(r_n)} $$

El algoritmo incluye salvaguardas de convergencia para evitar bucles infinitos en casos de flujos de caja no convencionales (<1% de retorno) o divergencia matemática.

### 4.5.2. Métricas de Retorno (Payback y LCOE)
*   **Payback Period Dinámico**: Se calcula mediante interpolación lineal de los flujos acumulados para determinar el momento fractal exacto $(i_{payback} + \text{fracción})$ en el que la curva de caja cruza el cero.
*   **LCOE (Levelized Cost of Energy)**: Se implementa la fórmula estándar para comparar tecnologías heterogéneas, ponderando costes de inversión ($I_0$), operación y mantenimiento ($M_t$) y combustible ($F_t$) frente a la energía generada ($E_t$):

$$ \text{LCOE} = \frac{\sum_{t=1}^n \frac{I_t + M_t + F_t}{(1+r)^t}}{\sum_{t=1}^n \frac{E_t}{(1+r)^t}} $$

### 4.5.3. Generación Estocástica de Precios de Mercado
Para proyecciones a largo plazo donde los datos de futuros son insuficientes, el sistema utiliza el modelo `MarketModel.generate_annual_price_curve` (en Python), que construye 8760 horas sintéticas. Este generador rechaza la extrapolación lineal simple y aplica un proceso estocástico de **Reversión a la Media (Mean Reversion)** que compone cuatro señales:

1.  **Precio Base ($\mu$)**: Nivel medio del mercado.
2.  **Estacionalidad Anual ($S_t$)**: Onda cosenoidal que replica la demanda estacional invierno/verano.
    $$ S_t = A \cdot \cos(2\pi t / 8760) $$
3.  **Ciclo Diario e Intradiario ($D_t$)**: Componente crítica para modelar la "Curva de Pato" debida a la penetración solar, simulada mediante la superposición de dos ondas sinusoidales con picos en las mañanas (8-10h) y noches (19-22h).
4.  **Ruido Estocástico ($\epsilon_t$)**: Inyección de ruido blanco gaussiano $\mathcal{N}(0, \sigma^2)$ para simular la volatilidad inherente al despacho marginalista.
5.  **Deriva Lineal (Drift)**: Componente inflacionaria o deflacionaria a largo plazo.

$$ P(t) = \text{Base} + S(t) + D(t) + \text{Trend} \cdot t + \epsilon_t $$

Esta formulación permite realizar análisis de sensibilidad tipo Monte Carlo, evaluando la robustez de la inversión ante escenarios de volatilidad de precios extremos.

---

# 5. Especificaciones Técnicas de Subsistemas Auxiliares

Además del núcleo de simulación industrial, el proyecto incorpora módulos orientados al usuario final residencial, fundamentados en simplificaciones válidas para la generación distribuida.

## 5.1. Calculadora Solar Residencial (B2C)
Tal como se detalla en la especificación técnica `RESIDENTIAL_SOLAR_SPEC.md`, este módulo resuelve un problema de optimización con restricciones duales (espacio vs. presupuesto):

### 5.1.1. Restricción Geométrica
El límite físico viene dado por la ocupación del tejado, discretizada por el área unitaria del módulo elegido ($Area_{mod}$):
$$ N_{fisico} = \lfloor \frac{Area_{tejado} \cdot K_{pack}}{Area_{mod}} \rfloor $$
Donde $K_{pack}$ es un factor de empaquetamiento (~0.8-0.9) que considera pasillos de mantenimiento y sombras.

### 5.1.2. Restricción Financiera (CAPEX)
La viabilidad económica limita el tamaño del array según la inversión disponible ($I_{max}$), considerando coste de equipos ($C_{eq}$) y costes blandos de instalación ($C_{inst}$):
$$ N_{eco} = \lfloor \frac{I_{max}}{C_{eq} + C_{inst}/N} \rfloor $$

El sistema selecciona $N_{final} = \min(N_{fisico}, N_{eco})$ y ejecuta una simulación simplificada utilizando el mismo núcleo físico (`ai_engine`) que la versión industrial, garantizando coherencia técnica en todas las escalas del aplicativo.