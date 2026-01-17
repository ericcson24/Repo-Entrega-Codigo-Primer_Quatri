# Hoja de Ruta: Simulador de Inversiones en Energías Renovables con IA (TFG)

Este documento define la arquitectura, diseño y pasos de implementación para el desarrollo de un Trabajo de Fin de Grado (TFG) centrado en una aplicación web de simulación económica de energías renovables. El sistema se diseñará desde cero, priorizando la precisión de datos reales, el uso de Inteligencia Artificial para predicciones y una parametrización exhaustiva.

## 1. Visión General y Arquitectura

### Objetivo
Desarrollar una plataforma que ingeste datos reales (meteorológicos y de mercado eléctrico), los procese mediante modelos de IA para predecir generación y precios futuros, y aplique modelos financieros rigurosos para calcular la rentabilidad (ROI, VAN, TIR, Payback).

### Arquitectura Propuesta (Microservicios o Monolito Modular)
Para un TFG robusto, se recomienda una arquitectura híbrida:
1.  **Frontend (React/Next.js):** Interfaz de usuario interactiva y dashboard de datos.
2.  **Backend Operacional (Node.js/Express):** Gestión de usuarios, orquestación de llamadas y lógica de negocio general.
3.  **Servicio de Data Science & IA (Python - FastAPI/Flask):** Este es el núcleo "experto". Python es superior para manejo de datos (Pandas), cálculo científico (NumPy) y Machine Learning (Scikit-learn/TensorFlow). Node.js delegará los cálculos complejos aquí.
4.  **Base de Datos:**
    *   **PostgreSQL:** Para datos relacionales (usuarios, configuraciones de proyectos).
    *   **TimescaleDB (o tabla optimizada en Postgres):** Para series temporales (histórico de precios, radiación solar hora a hora).

## 2. Definición de Constantes y Parametrización
El sistema no debe usar "números mágicos". Todo debe ser una constante configurable o un parámetro recuperado de una API.

### 2.1. Constantes Técnicas (Simulación Energética)
Estas constantes afectan directamente a la producción de energía estimada. Deben estar segregadas por tecnología.

#### A. Solar Fotovoltaica
*   `PERDIDAS_SISTEMA_FV`: (e.g., 0.14 para 14%). Incluye cableado, suciedad, mismatch.
*   `EFICIENCIA_INVERSOR`: (e.g., 0.96).
*   `COEF_TEMP_POTENCIA`: (e.g., -0.0035/ºC). Pérdida de eficiencia por calor.
*   `DEGRADACION_ANUAL_PANEL`: (e.g., 0.5%).

#### B. Eólica
*   `DENSIDAD_AIRE_STD`: (1.225 kg/m³). Ajustable por altitud.
*   `FACTOR_RUGOSIDAD_TERRENO`: (Alpha). Hellman exponent para extrapolar viento a altura de buje.
*   `ALTURA_BUJE`: Altura de la torre.
*   `CURVA_POTENCIA`: Array o función que mapea Velocidad Viento -> Potencia (Corte arranque, nominal, corte parada).

#### C. Hidroeléctrica (Mini-hidráulica)
*   `ALTURA_SALTO_NETO`: (Metros). Diferencia de altura.
*   `CAUDAL_ECOLOGICO`: (m³/s). Agua que *no* se puede turbinar por ley.
*   `EFICIENCIA_TURBINA_HIDRO`: (e.g., 0.85-0.90). Varía según tipo (Pelton, Francis, Kaplan).
*   `PERDIDAS_CARGA`: Pérdidas por rozamiento en tuberías.

#### D. Biomasa
*   `PODER_CALORIFICO_INFERIOR (PCI)`: (kWh/kg). Energía contenida en el combustible (astillas, pellets, hueso aceituna).
*   `EFICIENCIA_TERMOELECTRICA`: (e.g., 20-30%). Conversión calor a electricidad.
*   `AUTOCONSUMO_PLANTA`: Energía que gasta la propia planta para funcionar.
*   `HORAS_FUNCIONAMIENTO_MAX`: Disponibilidad técnica anual.

### 2.2. Constantes Económicas (Motor Financiero)
Cruciales para el cálculo de VAN y TIR.

*   `IPC_ANUAL_ESTIMADO`: Inflación anual proyectada para ajustar costes de mantenimiento y precios de energía si no se usa predicción de mercado.
*   `TASA_DESCUENTO_WACC`: (e.g., 0.05 para 5%). Tasa para descontar flujos de caja futuros al presente (VAN).
*   `IMPUESTO_SOCIEDADES`: (e.g., 0.25 para España). Impuestos sobre beneficios.
*   `COSTE_MANTENIMIENTO_ANUAL_KW`: Coste O&M por kW instalado.
*   `TASA_SUBIDA_ELECTRICIDAD`: Estimación conservadora si falla el modelo de IA de precios.

## 3. Estrategia de Datos y APIs (Sin Mocks)

El sistema debe tener scripts de ETL (Extract, Transform, Load) que se ejecuten periódicamente.

1.  **Mercado Eléctrico (Precios OMIE/ESIOS):**
    *   **Fuente:** ESIOS REE API.
    *   **Datos:** Precio Voluntario para el Pequeño Consumidor (PVPC) histórico y Precio Mercado Diario.
    *   **Uso:** Entrenar modelo de series temporales para predecir precio futuro (o usar media histórica ponderada para proyecciones lejanas).
2.  **Meteorología (Radiación y Viento):**
    *   **Fuente Histórica:** ERA5 (Copernicus) o PVGIS API (gratuita y precisa para TFG).
    *   **Fuente Tiempo Real/Forecast:** Open-Meteo API o AEMET OpenData.
    *   **Datos Clave:**
        *   *General:* Temperatura ambiente.
        *   *Solar:* Irradiancia (GHI, DNI).
        *   *Eólica:* Velocidad viento (10m, 100m) y dirección.
        *   *Hidro:* Precipitación acumulada (mm) o datos de aforo de ríos (SAIH - Confederaciones Hidrográficas, si hay API disponible, sino usar modelo de escorrentía simplificado basado en lluvia).
3.  **Mercado Biomasa:**
    *   **Datos:** Al no haber un "mercado spot" público tan claro como la luz, se deben usar índices de precios de biomasa (e.g., AVEBIOM) parametrizados como series temporales manuales o proyecciones indexadas al IPC/Petróleo.

## 4. Hoja de Ruta Paso a Paso

Esta sección está diseñada para ser ejecutada iterativamente.

### FASE 1: Configuración del Entorno y "Esqueleto" (Setup) [x]
*   **Paso 1.1:** Inicializar repositorio monorepo o carpetas separadas `backend` (Node), `frontend` y `ai_engine` (Python). [x]
*   **Paso 1.2:** Configurar Docker Compose para servicios y Base de Datos (PostgreSQL + TimescaleDB). [x]
*   **Paso 1.3:** Crear esquemas de base de datos iniciales (`prices_hourly`, `weather_data`, `biomass_prices`, `projects`). [x]

### FASE 2: Ingeniería de Datos (El "Data Lake") [x]
*   **Paso 2.1:** Conector ESIOS (Precios luz). [x]
*   **Paso 2.2:** Conector Open-Meteo Multi-variable. Descargar no solo sol, sino viento y lluvia histórica. [x]
*   **Paso 2.3:** Implementación de Caching en DB para no abusar de APIs externas. [x]

### FASE 3: Núcleo de IA y Predicción Multi-Tecnología [x]
*Se desarrollan 4 módulos de IA independientes con correcciones físicas avanzadas.*

*   **Paso 3.1 - IA Solar (Completo):** [x]
    *   Soporte para Bifacialidad.
    *   Cálculo de radiación en plano inclinado (POA).
*   **Paso 3.2 - IA Eólica (Completo):** [x]
    *   Corrección por Densidad del Aire (IEC 61400-12).
    *   Extrapolación Logarítmica.
    *   Interpolación de Curvas de Potencia específicas.
*   **Paso 3.3 - IA Hidráulica:** [x]
    *   Modelo Lluvia-Escorrentía con retardo (Rolling Mean).
    *   Soporte para Turbinas Pelton, Francis, Kaplan.
*   **Paso 3.4 - IA Biomasa:** [x]
    *   Optimización de Despacho Económico (Coste Marginal vs Precio Mercado).
    *   Configuración de costes de combustible y eficiencia.
*   **Paso 3.5 - Catálogo Industrial (Nuevo):** [x]
    *   Base de datos JSON con máquinas reales (Vestas, Jinko, Tesla).
    *   API `/catalog` para alimentar el frontend.

### FASE 4: Motor Financiero y Proyección a Largo Plazo (Backend) [x]
*   **Paso 4.1:** Endpoint `POST /simulate` orquestador. [x]
*   **Paso 4.2:** Proyección Mensual a 20 años. [x]
    *   Integración del "Long Term Generation" del AI Engine en el cálculo de flujos de caja.
    *   Lógica de Inflación vs Degradación real.
*   **Paso 4.3:** Modelos de Project Finance. [x]
    *   Cálculo de WACC, Ratios de Deuda, Intereses.
    *   Amortización Francesa de deuda.
    *   Flujos de Caja (FCFF, FCFE).

### FASE 5: Frontend y Visualización (React) [Pendiente]
*   **Paso 5.1:** Formulario "Smart" conectado al Catálogo.
    *   Selectores dinámicos (El usuario elige "Vestas V150" y se carga la curva).
*   **Paso 5.2:** Visualización de Flujos de Caja.
    *   Gráficas de VAN y TIR.
    *   Gráficas mensuales de generación a 20 años.
*   **Paso 5.3:** Panel de Configuración Financiera (Deuda, Impuestos).
## 5. Instrucciones para la IA Desarrolladora
Cuando pidas a una IA que construya esto, usa estos prompts encadenados siguiendo la hoja de ruta:

1.  *"Crea la estructura de carpetas `backend`, `frontend`, `ai_engine`. Define el `docker-compose.yml` con PostgreSQL y TimescaleDB."*
2.  *"Desarrolla los ETL (extractores) en Python (`/ai_engine/etl/`) para descargar: Precios PVPC (ESIOS), Meteorología (Open-Meteo: Viento, Lluvia, Sol). Guárdalos en base de datos."*
3.  *"Implementa la clase `SolarModel` en Python. Debe aplicar las fórmulas físicas de conversión fotovoltaica."*
4.  *"Implementa la clase `WindModel` en Python. Debe extrapolar viento en altura y aplicar curva de potencia de turbina."*
5.  *"Implementa la clase `HydroModel` en Python. Debe estimar caudal disponible y potencia hidráulica."*
6.  *"Implementa la clase `BiomassOptimizer` en Python. Debe usar Scikit-learn o PuLP para optimizar las horas de quemado según precio eléctrico vs coste combustible."*
7.  *"Implementa el Backend Node.js que reciba la petición del usuario, orqueste las llamadas a estos modelos de Python y calcule las métricas financieras (VAN, TIR, Payback) con los resultados."*


---
**Nota Final:** La clave del éxito de este TFG es la **transparencia de los datos**. No uses `Math.random()`. Si no hay dato de precio futuro para 2030, usa el último año real y aplica IPC, y documéntalo como "Proyección basada en histórico ajustado".
