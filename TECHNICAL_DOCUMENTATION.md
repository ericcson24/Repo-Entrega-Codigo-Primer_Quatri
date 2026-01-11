# Documentación Técnica: Sistema de Cálculo ROI Energético (Solar y Eólico)

Esta documentación describe detalladamente la arquitectura, los flujos de datos y los modelos matemáticos implementados en la aplicación para calcular el Retorno de Inversión (ROI) y la viabilidad técnica de proyectos de energía renovable.

## 1. Arquitectura General

El sistema sigue una arquitectura de **microservicios simulados** donde el Frontend actúa como un orquestador inteligente que consulta múltiples fuentes de datos ("Dynamic Services") y utiliza un motor de cálculo local ("AI Service") para procesar la física y la economía.

### Componentes Principales

1.  **Backend (Node.js/Express):**
    *   Actúa como pasarela (Gateway) y caché.
    *   Sirve archivos estáticos JSON (datos históricos de fallback).
    *   Gestiona llamadas a APIs externas (OpenWeather, Open-Meteo) para evitar exponer claves en el cliente y para centralizar el caché.
    *   Controladores: `weatherController`, `solarController`, `marketController`.

2.  **Frontend (React):**
    *   **Calculadoras (`AdvancedWindCalculator`, `AdvancedSolarCalculator`):** Interfaces de usuario para entrada de parámetros técnicos.
    *   **AI Service (`aiService.js`):** El "cerebro" matemático. Contiene toda la lógica de simulación física (Weibull, Hellmann, PVGIS) y financiera.
    *   **Dynamic API Service (`dynamicAPIService.js`):** Capa de abstracción para la obtención de datos. Decide si pedir datos a APIs reales o usar datos locales de respaldo.

---

## 2. Flujo de Datos

### 2.1 Obtención de Datos Meteorológicos (Eólica)
El sistema prioriza la precisión de los datos reales sobre los promedios estáticos.

1.  **Solicitud:** El usuario selecciona una ciudad (ej. Zaragoza).
2.  **Dynamic API:** 
    *   Llama a `backend/api/weather/zaragoza` (o a Open-Meteo directamente).
    *   Solicita datos históricos diarios de los últimos 3 años (1095 días).
    *   **Dato Crítico:** Se extrae `windspeed_10m_mean` (velocidad media diaria) y no solo la máxima, para evitar sobreestimaciones.
3.  **Fallback:** Si la API falla, carga un archivo JSON local (`backend/data/weather/...`) y se adapta a su estructura.

### 2.2 Obtención de Datos Solares
Similar a la eólica, pero consulta PVGIS (European Commission) para obtener la irradiación solar (`H_i`) y la producción estimada (`E_y`) calibrada por satélite.

---

## 3. Modelos Matemáticos (El Núcleo del Cálculo)

### 3.1 Simulación Eólica (Física de Fluidos)

El cálculo eólico ha sido refactorizado para nivel "Ingeniería Experta".

#### A. Perfil Vertical del Viento (Ley de Hellmann)
Los datos meteorológicos se miden a 10 metros, pero las turbinas operan mucho más alto (30m - 120m). Usamos la ley de potencia para extrapolar:

$$ v_{hub} = v_{ref} \cdot \left( \frac{h_{hub}}{h_{ref}} \right)^\alpha $$

*   $v_{hub}$: Velocidad a altura de buje.
*   $v_{ref}$: Velocidad medida (10m).
*   $\alpha$: Coeficiente de rugosidad (0.14 por defecto para terreno abierto).

#### B. Probabilidad de Viento (Distribución de Weibull)
El viento no es constante. Usamos la distribución de probabilidad de Weibull (simplificada a Rayleigh, $k=2$) para modelar la variabilidad intra-diaria:

$$ P(v) = \frac{k}{\lambda} \left(\frac{v}{\lambda}\right)^{k-1} e^{-(v/\lambda)^k} $$

Donde $\lambda \approx \bar{v} / \Gamma(1 + 1/k)$.

#### C. Integración de Curva de Potencia
La energía diaria no es $Potencia \times 24h$. Es la integral de la curva de potencia de la turbina sobre la distribución de probabilidad:

$$ E_{dia} = 24 \int_{0}^{\infty} P_{turbina}(v) \cdot P_{Weibull}(v) \, dv $$

*   **P_turbina(v):**
    *   $v < v_{cut-in}$: 0 kW
    *   $v_{cut-in} \le v < v_{rated}$: Subida cúbica ($P \propto v^3$) o definida por $C_p$.
    *   $v_{rated} \le v < v_{cut-out}$: Potencia nominal constante.
    *   $v \ge v_{cut-out}$: 0 kW (Parada de seguridad).

Este método captura la realidad de que un viento medio de 5 m/s produce mucho menos que la mitad de un viento de 10 m/s debido a la relación cúbica.

### 3.2 Cálculo del Factor de Planta (Capacity Factor)
Una nueva métrica añadida para evaluar la calidad del sitio:

$$ CF = \frac{Producción\_Anual\_Real}{Capacidad\_Nominal \times 8760 \text{ horas}} $$

*   **> 35%:** Sitio excelente (Verde).
*   **20% - 35%:** Sitio aceptable (Naranja).
*   **< 20%:** Sitio inviable (Rojo).

### 3.3 Simulación Solar
Utiliza datos de irradiación global horizontal (GHI) ajustados por:
*   **Factor de Orientación:** Penalización por desviación del Sur (Azimut 180º) y tilt óptimo (latitud - 5º aprox).
*   **Pérdidas por Temperatura:** -0.4% de eficiencia por cada grado por encima de 25ºC (STC).
*   **Performance Ratio (PR):** Factor global de 0.75 para pérdidas de inversor, cableado y suciedad.

---

## 4. Análisis Económico

El módulo `analyzeEconomics` en `aiService` proyecta el flujo de caja a 25 años.

1.  **Ingresos:**
    *   Ahorro directo: $Producción \times \%Autoconsumo \times Precio\_Compra$.
    *   Excedentes: $Producción \times (1 - \%Autoconsumo) \times Precio\_Venta$.
2.  **Gastos:**
    *   Mantenimiento anual (1% de inversión, ajustado por inflación).
    *   Reemplazo de inversor (año 10).
3.  **Indicadores:**
    *   **ROI (%):** Beneficio neto total / Inversión inicial.
    *   **Payback (Años):** Año en que el flujo de caja acumulado cruza cero.
    *   **VAN (Valor Actual Neto):** Suma descontada de flujos futuros.

## 5. Visualización de Resultados

El Frontend consume estos datos procesados y los renderiza en:
*   **KPIGrid:** Tarjetas con indicadores clave (Producción, Ahorro, ROI, Factor de Planta).
*   **Gráficos:** Distribución mensual (producción vs consumo) y proyección financiera acumulada.

---
*Generado automáticamente por el Asistente de Desarrollo Full Stack - Enero 2026*
