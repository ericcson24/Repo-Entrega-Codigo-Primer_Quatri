# 🌱 Simulador de Inversión en Energías Renovables# 🌱 Simulador de Inversión en Energías Renovables# Simulador de Inversión en Energías Renovables (TFG)



> Plataforma web integral para el análisis técnico-económico de proyectos de energía renovable mediante modelos de ingeniería física y evaluación financiera detallada.



[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)> Plataforma web integral para el análisis técnico-económico de proyectos de energía renovable mediante modelos de ingeniería física y evaluación financiera detallada.Este proyecto es una plataforma para el análisis técnico y financiero de proyectos de energía renovable (**Solar FV, Eólica, Hidráulica y Biomasa**). Integra modelos de simulación física, datos meteorológicos reales (OpenMeteo 2023-2024) y un módulo financiero para calcular la viabilidad económica bajo escenarios de incertidumbre y volatilidad de mercado.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)## Características Principales

---

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)

## 📋 Tabla de Contenidos

[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)### 1. Motor de Simulación Multi-Tecnología

- [Descripción](#-descripción)

- [Características](#-características-principales)[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)- **Solar FV:** Modelo físico basado en irradiancia, temperatura y características del panel. Considera nubosidad, temperatura de célula y pérdidas del sistema.

- [Tecnologías](#-tecnologías)

- [Arquitectura](#-arquitectura)- **Eólica:** Extrapolación vertical de viento (Ley de Hellman) y curvas de potencia de turbinas reales (Vestas, Gamesa).

- [Instalación](#-instalación)

- [Uso](#-uso)---- **Hidráulica:** Modelo de turbinado basado en caudal ecológico y altura de salto neto.

- [Estructura del Proyecto](#-estructura-del-proyecto)

- [Modelos Físicos](#-modelos-físicos)- **Biomasa:** Optimización de despacho económico basado en precios de mercado y coste variable de combustible.

- [Documentación](#-documentación)

## 📋 Tabla de Contenidos

---

### 2. Análisis Financiero

## 🎯 Descripción

- [Descripción](#-descripción)- **Métricas Clave:** VAN (NPV), TIR (IRR), Payback y ROI.

Sistema web para evaluar la viabilidad técnica y financiera de proyectos de generación de energía renovable. Utiliza **modelos físicos de ingeniería** validados con datos meteorológicos reales para simular la producción energética horaria durante 25 años, combinados con análisis financiero que calcula VAN, TIR, Payback, LCOE y flujos de caja descontados.

- [Características](#-características-principales)- **Estructura de Capital:** Simulación de Apalancamiento (Project Finance), Deuda Senior, Equity y ratio de cobertura.

### Tecnologías Soportadas

- [Tecnologías](#-tecnologías)- **Fiscalidad y Ayudas:** Soporte para Subvenciones (NextGen), deducciones fiscales y amortización acelerada.

- ☀️ **Solar Fotovoltaica** - Paneles mono/policristalinos y bifaciales

- 💨 **Eólica** - Turbinas de eje horizontal (HAWT)- [Arquitectura](#-arquitectura)- **Modelos de Ingresos:** Autoconsumo con compensación de excedentes vs Venta a Red (PPA/Merchant).

- 💧 **Hidroeléctrica** - Centrales de pasada y embalse

- 🌾 **Biomasa** - Cogeneración y gasificación- [Instalación](#-instalación)



---- [Uso](#-uso)### 3. Visualización



## ✨ Características Principales- [Estructura del Proyecto](#-estructura-del-proyecto)- **Cuadros de Mando:** Gráficos de Flujo de Caja, Perfiles Estacionales y Curvas de Duración de Carga.



### 1. 🔬 Motor de Cálculo Físico- [Modelos Físicos](#-modelos-físicos)- **Comparativa de Escenarios:** Análisis de sensibilidad ante variaciones de CAPEX o precios de energía.



**NO utiliza inteligencia artificial ni machine learning.** Los cálculos se basan en ecuaciones de ingeniería validadas:- [Documentación](#-documentación)



- **Solar FV:**## Requisitos del Sistema

  - Modelo NOCT para temperatura de célula

  - Corrección por temperatura (coeficiente -0.30%/°C)---

  - Pérdidas del sistema (DC/AC, cables, inversores)

  - Soporte para tecnología bifacialPara ejecutar este sistema necesitas tener instalado:

  

- **Eólica:**## 🎯 Descripción

  - Ley logarítmica de cortante de viento (wind shear)

  - Curvas de potencia de fabricantes (Vestas, Gamesa, Siemens)*   **Node.js**: Versión 14.0.0 o superior.

  - Corrección por densidad del aire

  Sistema web para evaluar la viabilidad técnica y financiera de proyectos de generación de energía renovable. Utiliza **modelos físicos de ingeniería** validados con datos meteorológicos reales para simular la producción energética horaria durante 25 años, combinados con análisis financiero que calcula VAN, TIR, Payback, LCOE y flujos de caja descontados.*   **npm**: Gestor de paquetes de Node (normalmente viene con Node.js).

- **Hidráulica:**

  - Ecuación de Bernoulli para salto neto*   **Git**: Para clonar el repositorio.

  - Caudal ecológico mínimo

  - Eficiencia de turbina Francis/Kaplan### Tecnologías Soportadas

  

- **Biomasa:**## Instalación y Puesta en Marcha

  - Optimización de despacho económico

  - Balance térmico basado en PCI- ☀️ **Solar Fotovoltaica** - Paneles mono/policristalinos y bifaciales

  - Eficiencia térmica-eléctrica

- 💨 **Eólica** - Turbinas de eje horizontal (HAWT)Sigue estos pasos para instalar y ejecutar el proyecto:

### 2. 💰 Análisis Financiero

- 💧 **Hidroeléctrica** - Centrales de pasada y embalse

- **Métricas:** VAN (NPV), TIR (IRR), Payback Simple/Descontado, LCOE, ROI

- **Project Finance:** Modelado de apalancamiento (debt/equity ratio)- 🌾 **Biomasa** - Cogeneración y gasificación### 1. Instalación de Dependencias

- **Fiscalidad:** Impuesto de sociedades, amortización acelerada

- **Incentivos:** Subvenciones NextGen, deducciones fiscales

- **Escenarios:** Autoconsumo vs Venta a Red (PPA/Merchant)

---El proyecto tiene una estructura monorepo (Frontend + Backend). Puedes instalar todas las dependencias con un solo comando desde la raíz:

### 3. 📊 Visualización Interactiva



- Gráficos de flujo de caja descontado

- Curvas de duración de carga## ✨ Características Principales```bash

- Perfiles estacionales de generación

- Análisis de sensibilidadnpm run install:all

- Exportación a PDF/Excel

### 1. 🔬 Motor de Cálculo Físico```

### 4. 🌍 Datos Meteorológicos Reales



- **Fuente:** Open-Meteo Historical Weather API (2023-2024)

- **Resolución:** Horaria (8760 puntos/año)**NO utiliza inteligencia artificial ni machine learning.** Los cálculos se basan en ecuaciones de ingeniería validadas:O manualmente paso a paso:

- **Variables:** GHI, temperatura, viento 10m/100m, precipitación

- **Cobertura:** Global con precisión de 0.1° lat/lon



---- **Solar FV:**```bash



## 🛠️ Tecnologías  - Modelo NOCT para temperatura de célula# 1. Instalar dependencias de la raíz



### Frontend  - Corrección por temperatura (coeficiente -0.30%/°C)npm install

- **Framework:** React 18.2

- **Estilos:** Tailwind CSS  - Pérdidas del sistema (DC/AC, cables, inversores)

- **Gráficos:** Recharts

- **Routing:** React Router v7  - Soporte para tecnología bifacial# 2. Instalar dependencias del Backend

- **HTTP Client:** Axios

  cd backend

### Backend

- **Runtime:** Node.js 18+ / Express 4- **Eólica:**npm install

- **Base de Datos:** PostgreSQL 14 + TimescaleDB

- **ORM/Query:** pg (node-postgres)  - Ley logarítmica de cortante de viento (wind shear)cd ..



### Motor de Cálculo Físico  - Curvas de potencia de fabricantes (Vestas, Gamesa, Siemens)

- **Lenguaje:** Python 3.9+

- **Framework:** FastAPI + Uvicorn  - Corrección por densidad del aire# 3. Instalar dependencias del Frontend

- **Cálculo:** NumPy, Pandas

- **Base de Datos:** SQLAlchemy + psycopg2  cd frontend



### Infraestructura- **Hidráulica:**npm install

- **Contenedores:** Docker + Docker Compose

- **CI/CD:** GitHub Actions  - Ecuación de Bernoulli para salto netocd ..

- **Cloud:** Google Cloud Run + Firebase Hosting

- **Monitoreo:** Logs nativos de GCP  - Caudal ecológico mínimo```



---  - Eficiencia de turbina Francis/Kaplan



## 🏗️ Arquitectura  ### 2. Ejecución del Sistema



```- **Biomasa:**

┌─────────────────┐      ┌──────────────────┐      ┌──────────────────────┐

│   React SPA     │─────→│  Backend API     │─────→│  Motor de Cálculo    │  - Optimización de despacho económicoPara iniciar tanto el servidor (Backend) como la interfaz de usuario (Frontend) simultáneamente:

│  (Puerto 3000)  │      │  Node.js/Express │      │  Físico (Python)     │

│                 │      │  (Puerto 4000)   │      │  FastAPI (Puerto 8000)│  - Balance térmico basado en PCI

└─────────────────┘      └──────────────────┘      └──────────────────────┘

                                 │                            │  - Eficiencia térmica-eléctrica```bash

                                 ↓                            ↓

                         ┌──────────────────┐      ┌──────────────────┐npm start

                         │   PostgreSQL     │←─────│  Open-Meteo API  │

                         │   + TimescaleDB  │      │  (Weather Data)  │### 2. 💰 Análisis Financiero```

                         └──────────────────┘      └──────────────────┘

```



### Flujo de Datos- **Métricas:** VAN (NPV), TIR (IRR), Payback Simple/Descontado, LCOE, ROI*   **Frontend**: Disponible en `http://localhost:3000`



1. **Usuario** ingresa parámetros del proyecto (ubicación, capacidad, costes)- **Project Finance:** Modelado de apalancamiento (debt/equity ratio)*   **Backend**: Disponible en `http://localhost:4000`

2. **Frontend** valida datos y envía POST `/api/simulate`

3. **Backend** recibe request y:- **Fiscalidad:** Impuesto de sociedades, amortización acelerada

   - Valida parámetros financieros

   - Construye payload para motor de cálculo- **Incentivos:** Subvenciones NextGen, deducciones fiscales---

4. **Motor de Cálculo** (Python):

   - Obtiene datos meteorológicos históricos- **Escenarios:** Autoconsumo vs Venta a Red (PPA/Merchant)

   - Ejecuta modelo físico (generación horaria 8760h × 25 años)

   - Retorna series temporales de producción## Arquitectura y Funcionamiento

5. **Backend**:

   - Aplica modelo financiero (VAN, TIR, flujos de caja)### 3. 📊 Visualización Interactiva

   - Almacena simulación en PostgreSQL

   - Retorna resultados completosEl sistema se divide en dos partes principales:

6. **Frontend** renderiza gráficos y métricas

- Gráficos de flujo de caja descontado

---

- Curvas de duración de carga### Backend (Node.js + Express)

## 📦 Instalación

- Perfiles estacionales de generación*   **API REST**: Sirve los datos a la interfaz.

### Prerequisitos

- Análisis de sensibilidad*   **Gestión de Datos**: Descarga, procesa y almacena datos históricos en archivos JSON (`/backend/data`).

- Node.js 18+ y npm 9+

- Python 3.9+ y pip- Exportación a PDF/Excel*   **Motor de Predicción**: Entrena modelos basados en los datos históricos.

- PostgreSQL 14+ (opcional para desarrollo local)

- Docker Desktop (para despliegue completo)



### Opción 1: Instalación Rápida (Sin Base de Datos)### 4. 🌍 Datos Meteorológicos Reales### Frontend (React + Tailwind CSS)



```bash*   **Interfaz Interactiva**: Permite al usuario configurar parámetros de su instalación.

# 1. Clonar repositorio

git clone https://github.com/ericcson24/Repo-Entrega-Codigo-Primer_Quatri.git- **Fuente:** Open-Meteo Historical Weather API (2023-2024)*   **Visualización**: Gráficos y tablas de ROI, producción energética y ahorro estimado.

cd Repo-Entrega-Codigo-Primer_Quatri

- **Resolución:** Horaria (8760 puntos/año)

# 2. Instalar dependencias (Frontend + Backend)

npm run install:all- **Variables:** GHI, temperatura, viento 10m/100m, precipitación---



# 3. Configurar motor de cálculo Python- **Cobertura:** Global con precisión de 0.1° lat/lon

cd physics_engine

python3 -m venv physics_env## Sistema de Datos y Extracción

source physics_env/bin/activate  # En Windows: physics_env\Scripts\activate

pip install -r requirements.txt---

cd ..

El sistema se alimenta de datos reales obtenidos de APIs públicas. Los datos se almacenan localmente en `backend/data` para evitar llamadas constantes a las APIs externas y permitir el funcionamiento offline.

# 4. Iniciar todos los servicios

npm start## 🛠️ Tecnologías

```

### Fuentes de Datos

**Nota:** El sistema funcionará en modo sin persistencia. Las simulaciones no se guardarán en base de datos.

### Frontend

### Opción 2: Instalación Completa con Docker

- **Framework:** React 18.21.  **Datos Meteorológicos (Viento y Clima)**

```bash

# 1. Clonar repositorio- **Estilos:** Tailwind CSS    *   **Fuente**: [Open-Meteo Archive API](https://open-meteo.com/)

git clone https://github.com/ericcson24/Repo-Entrega-Codigo-Primer_Quatri.git

cd Repo-Entrega-Codigo-Primer_Quatri- **Gráficos:** Recharts    *   **Datos**: Temperatura, velocidad del viento, radiación, nubosidad.



# 2. Construir y levantar contenedores- **Routing:** React Router v7    *   **Script**: `backend/scripts/download-weather-data.js`

docker-compose up --build

- **HTTP Client:** Axios    *   **Ubicación**: `backend/data/weather/`

# Acceso:

# - Frontend: http://localhost:3000

# - Backend: http://localhost:4000

# - Motor Físico: http://localhost:8000### Backend2.  **Datos Solares (Irradiación)**

# - PostgreSQL: localhost:5432

```- **Runtime:** Node.js 18+ / Express 4    *   **Fuente**: [PVGIS (Comisión Europea)](https://re.jrc.ec.europa.eu/pvg_tools/en/)



---- **Base de Datos:** PostgreSQL 14 + TimescaleDB    *   **Datos**: Irradiación solar diaria estimada para paneles solares.



## 🚀 Uso- **ORM/Query:** pg (node-postgres)    *   **Script**: `backend/scripts/download-solar-data.js`



### 1. Acceso a la Aplicación    *   **Ubicación**: `backend/data/solar/`



Abrir navegador en `http://localhost:3000`### Motor de Cálculo Físico



### 2. Seleccionar Tecnología- **Lenguaje:** Python 3.9+3.  **Precios de la Electricidad**



- Solar FV (Residencial/Industrial)- **Framework:** FastAPI + Uvicorn    *   **Fuente**: [Red Eléctrica de España (REE)](https://www.ree.es/es/apidatos)

- Eólica

- Hidráulica- **Cálculo:** NumPy, Pandas    *   **Datos**: Precios del mercado diario (OMIE).

- Biomasa

- **Base de Datos:** SQLAlchemy + psycopg2    *   **Script**: `backend/scripts/download-price-data.js`

### 3. Configurar Proyecto

    *   **Ubicación**: `backend/data/prices/`

**Ubicación:**

- Latitud/Longitud (ej: Madrid 40.4168, -3.7038)### Infraestructura

- O buscar por nombre de ciudad

- **Contenedores:** Docker + Docker Compose### Actualización de Datos

**Capacidad Instalada:**

- Solar: kWp DC- **CI/CD:** GitHub Actions

- Eólica: kW nominales

- Hidro: kW turbina- **Cloud:** Google Cloud Run + Firebase HostingSi deseas actualizar los datos históricos o volver a descargarlos (por ejemplo, si añades nuevas ciudades), el sistema incluye scripts automatizados que puedes ejecutar desde la raíz del proyecto.

- Biomasa: kW eléctricos

- **Monitoreo:** Logs nativos de GCP

**Parámetros Financieros:**

- CAPEX (EUR/kW)1.  **Descargar todo (Clima, Solar y Precios):**

- OPEX anual (EUR/kW)

- Precio de venta energía (EUR/MWh)---    ```bash

- Ratio deuda/capital

- Tipo de interés    npm run download:all

- Plazo préstamo

- Vida útil proyecto## 🏗️ Arquitectura    ```



### 4. Ejecutar Simulación



Click en **"Simular Proyecto"**. El proceso toma 5-15 segundos dependiendo de la complejidad.```2.  **Descargar individualmente:**



### 5. Analizar Resultados┌─────────────────┐      ┌──────────────────┐      ┌──────────────────────┐    ```bash



**Métricas Financieras:**│   React SPA     │─────→│  Backend API     │─────→│  Motor de Cálculo    │    npm run download:weather  # Solo clima

- VAN (Valor Actual Neto)

- TIR (Tasa Interna de Retorno)│  (Puerto 3000)  │      │  Node.js/Express │      │  Físico (Python)     │    npm run download:solar    # Solo datos solares

- Payback Simple y Descontado

- LCOE (Levelized Cost of Energy)│                 │      │  (Puerto 4000)   │      │  FastAPI (Puerto 8000)│    npm run download:prices   # Solo precios de luz

- ROI (Return on Investment)

└─────────────────┘      └──────────────────┘      └──────────────────────┘    ```

**Gráficos:**

- Flujo de Caja Anual                                 │                            │

- Producción Energética Mensual

- Curva de Duración de Carga                                 ↓                            ↓3.  **Entrenar Modelos:**

- Distribución Horaria

                         ┌──────────────────┐      ┌──────────────────┐    Una vez descargados los datos, debes re-entrenar los modelos para que aprendan de la nueva información:

**Exportar:**

- PDF con informe completo                         │   PostgreSQL     │←─────│  Open-Meteo API  │    ```bash

- CSV con datos brutos

                         │   + TimescaleDB  │      │  (Weather Data)  │    npm run train:ai

---

                         └──────────────────┘      └──────────────────┘    ```

## 📁 Estructura del Proyecto

```

```

Repo-Entrega-Codigo-Primer_Quatri/4.  **Actualización Completa (Descarga + Entrenamiento):**

│

├── frontend/                    # Aplicación React### Flujo de Datos    Este es el comando recomendado para actualizar todo el sistema de una vez:

│   ├── public/

│   ├── src/    ```bash

│   │   ├── components/         # Componentes reutilizables

│   │   │   ├── common/         # Botones, inputs, cards1. **Usuario** ingresa parámetros del proyecto (ubicación, capacidad, costes)    npm run update:all

│   │   │   ├── dashboards/     # Gráficos de resultados

│   │   │   └── layout/         # Sidebar, header2. **Frontend** valida datos y envía POST `/api/simulate`    ```

│   │   ├── features/           # Calculadoras por tecnología

│   │   │   ├── calculators/3. **Backend** recibe request y:

│   │   │   │   ├── SolarCalculator.js

│   │   │   │   ├── AdvancedWindCalculator.js   - Valida parámetros financieros---

│   │   │   │   ├── HydroCalculator.js

│   │   │   │   ├── BiomassCalculator.js   - Construye payload para motor de cálculo

│   │   │   │   └── ResidentialSolarCalculator.js

│   │   │   └── history/4. **Motor de Cálculo** (Python):## Modelos de Predicción y Análisis

│   │   ├── contexts/           # AuthContext, ThemeContext

│   │   ├── services/           # API client (axios)   - Obtiene datos meteorológicos históricos

│   │   └── App.js

│   └── package.json   - Ejecuta modelo físico (generación horaria 8760h × 25 años)El sistema utiliza algoritmos de regresión lineal múltiple para predecir la generación de energía basándose en las condiciones climáticas históricas.

│

├── backend/                     # API Node.js/Express   - Retorna series temporales de producción

│   ├── config/

│   │   ├── constants.js        # Constantes financieras/técnicas5. **Backend**:*   **Entrenamiento**: El script `train-ai-model.js` lee los archivos JSON de `backend/data/weather` y `backend/data/solar`.

│   │   └── db.js               # Conexión PostgreSQL

│   ├── controllers/   - Aplica modelo financiero (VAN, TIR, flujos de caja)*   **Predicción**:

│   │   ├── simulationController.js

│   │   └── catalogController.js   - Almacena simulación en PostgreSQL    *   *Solar*: Predice la producción en función de la radiación, temperatura y nubosidad.

│   ├── routes/

│   ├── services/   - Retorna resultados completos    *   *Eólica*: Predice la producción en función de la velocidad del viento.

│   │   ├── physicsService.js   # Cliente HTTP para motor Python

│   │   └── financialService.js # Cálculos VAN, TIR, Payback6. **Frontend** renderiza gráficos y métricas*   **Persistencia**: Los modelos entrenados (coeficientes) se guardan en `backend/data/models/ai_models.json`.

│   ├── scripts/

│   │   └── init_remote_db.js

│   └── server.js

│---## Estructura de Carpetas

├── physics_engine/              # Motor de Cálculo Físico (Python/FastAPI)

│   ├── config/

│   │   ├── settings.py         # Variables de entorno

│   │   └── database.py         # ORM SQLAlchemy## 📦 Instalación```

│   ├── models/                 # Modelos físicos

│   │   ├── solar.py            # SolarModel (NOCT, temp correction)Proyecto ROI/

│   │   ├── wind.py             # WindModel (wind shear, power curve)

│   │   ├── hydro.py            # HydroModel (Bernoulli, turbine efficiency)### Prerequisitos├── backend/

│   │   ├── biomass.py          # BiomassOptimizer (economic dispatch)

│   │   ├── storage.py          # BatteryModel (SOC, charge/discharge)│   ├── config/             # Configuración de APIs y constantes

│   │   └── market.py           # MarketModel (synthetic prices)

│   ├── routers/- Node.js 18+ y npm 9+│   ├── data/               # Repositorio de datos en archivos JSON

│   │   ├── simulation.py       # POST /predict/{tech}

│   │   ├── catalog.py          # GET /catalog/{tech}- Python 3.9+ y pip│   │   ├── weather/        # Histórico de clima

│   │   └── market.py           # POST /prices

│   ├── etl/- PostgreSQL 14+ (opcional para desarrollo local)│   │   ├── solar/          # Histórico solar

│   │   └── weather_connector.py # Fetch Open-Meteo API

│   ├── data/catalogs/          # JSON con equipos reales- Docker Desktop (para despliegue completo)│   │   ├── prices/         # Histórico de precios

│   │   ├── panels.json         # Jinko, Canadian, SunPower

│   │   ├── turbines.json       # Vestas, Gamesa, Siemens│   │   └── models/         # Modelos entrenados

│   │   ├── hydro.json          # Francis, Kaplan, Pelton

│   │   ├── biomass.json        # Gasificadores, CHP### Opción 1: Instalación Rápida (Sin Base de Datos)│   ├── scripts/            # Scripts de descarga y entrenamiento (ETL)

│   │   └── batteries.json      # Tesla Powerwall, LG Chem

│   ├── main.py│   └── server.js           # Punto de entrada del servidor

│   └── requirements.txt

│```bash├── frontend/

├── database/

│   └── init/# 1. Clonar repositorio│   ├── src/

│       └── 01_init.sql         # Schema PostgreSQL/TimescaleDB

│git clone https://github.com/ericcson24/Repo-Entrega-Codigo-Primer_Quatri.git│   │   ├── components/     # Componentes React

├── docs/                        # Documentación técnica TFG

│   ├── MARCO_TEORICO.mdcd Repo-Entrega-Codigo-Primer_Quatri│   │   └── ...

│   ├── METODOLOGIA.md

│   ├── RESULTADOS.md│   └── ...

│   ├── SOLAR_SIMULATION_TECHNICAL_REPORT.md

│   ├── WIND_SIMULATION_TECHNICAL_REPORT.md# 2. Instalar dependencias (Frontend + Backend)└── package.json            # Scripts globales

│   ├── HYDRO_SIMULATION_TECHNICAL_REPORT.md

│   └── BIOMASS_SIMULATION_TECHNICAL_REPORT.mdnpm run install:all```

│

├── scripts/

│   └── generar_graficas_validacion.py# 3. Configurar motor de cálculo Python

│cd physics_engine

├── docker-compose.ymlpython3 -m venv physics_env

├── firebase.jsonsource physics_env/bin/activate  # En Windows: physics_env\Scripts\activate

├── package.json                # Scripts npm globalespip install -r requirements.txt

└── README.mdcd ..

```

# 4. Iniciar todos los servicios

---npm start

```

## 🔬 Modelos Físicos

**Nota:** El sistema funcionará en modo sin persistencia. Las simulaciones no se guardarán en base de datos.

### Solar Fotovoltaica

### Opción 2: Instalación Completa con Docker

**Ecuación Principal:**

``````bash

P_ac = Capacity × (GHI/1000) × η_temp × (1 - L_system) × η_inverter# 1. Clonar repositorio

```git clone https://github.com/ericcson24/Repo-Entrega-Codigo-Primer_Quatri.git

cd Repo-Entrega-Codigo-Primer_Quatri

Donde:

- `η_temp = 1 + γ × (T_cell - 25)`  [γ ≈ -0.003/°C]# 2. Construir y levantar contenedores

- `T_cell = T_amb + (NOCT - 20) × (GHI/800)`  [NOCT ≈ 43°C]docker-compose up --build

- `L_system ≈ 0.14` (pérdidas cables, polvo, sombras)

- `η_inverter ≈ 0.96`# Acceso:

# - Frontend: http://localhost:3000

**Referencias:**# - Backend: http://localhost:4000

- IEC 61853-1 (Temperature coefficients)# - Motor Físico: http://localhost:8000

- NREL System Advisor Model (SAM)# - PostgreSQL: localhost:5432

```

### Eólica

---

**Extrapolación de Viento:**

```## 🚀 Uso

v(h) = v_ref × ln(h/z₀) / ln(h_ref/z₀)

```### 1. Acceso a la Aplicación



**Curva de Potencia:**Abrir navegador en `http://localhost:3000`

```

P(v) = {### 2. Seleccionar Tecnología

  0,                           v < v_cut_in

  Capacity × ((v - v_cut_in) / (v_rated - v_cut_in))³,  v_cut_in ≤ v < v_rated- Solar FV (Residencial/Industrial)

  Capacity,                    v_rated ≤ v < v_cut_out- Eólica

  0,                           v ≥ v_cut_out- Hidráulica

}- Biomasa

```

### 3. Configurar Proyecto

**Referencias:**

- IEC 61400-12-1 (Power curve measurement)**Ubicación:**

- Datasheets de fabricantes (Vestas V90-2.0 MW, etc.)- Latitud/Longitud (ej: Madrid 40.4168, -3.7038)

- O buscar por nombre de ciudad

### Hidráulica

**Capacidad Instalada:**

**Potencia Teórica:**- Solar: kWp DC

```- Eólica: kW nominales

P = ρ × g × Q × H_net × η_turbine- Hidro: kW turbina

```- Biomasa: kW eléctricos



Donde:**Parámetros Financieros:**

- `H_net = H_gross - H_friction - H_turbulence`- CAPEX (EUR/kW)

- `Q = min(Q_available, Q_design)` con `Q ≥ Q_ecological`- OPEX anual (EUR/kW)

- `η_turbine`: Francis (0.90), Kaplan (0.92), Pelton (0.88)- Precio de venta energía (EUR/MWh)

- Ratio deuda/capital

**Referencias:**- Tipo de interés

- ESHA (European Small Hydropower Association)- Plazo préstamo

- Guía técnica de aprovechamiento hidroeléctrico (IDAE)- Vida útil proyecto



### Biomasa### 4. Ejecutar Simulación



**Consumo de Combustible:**Click en **"Simular Proyecto"**. El proceso toma 5-15 segundos dependiendo de la complejidad.

```

Fuel_kg/h = (P_electric / η_electric) / PCI_kWh/kg### 5. Analizar Resultados

```

**Métricas Financieras:**

**Coste Marginal:**- VAN (Valor Actual Neto)

```- TIR (Tasa Interna de Retorno)

MC_EUR/MWh = (Fuel_kg/MWh × Price_fuel_EUR/kg) / η_electric- Payback Simple y Descontado

```- LCOE (Levelized Cost of Energy)

- ROI (Return on Investment)

**Despacho:** Opera cuando `Price_market > MC`

**Gráficos:**

**Referencias:**- Flujo de Caja Anual

- Principios de termodinámica (Çengel & Boles)- Producción Energética Mensual

- Guía técnica de biomasa (IDAE)- Curva de Duración de Carga

- Distribución Horaria

---

**Exportar:**

## 📚 Documentación- PDF con informe completo

- CSV con datos brutos

### Documentos Técnicos Disponibles

---

- [Marco Teórico](docs/MARCO_TEORICO.md) - Fundamentos físicos y económicos

- [Metodología Scrum](docs/METODOLOGIA_SCRUM.md) - Gestión ágil del proyecto## 📁 Estructura del Proyecto

- [Reporte Técnico Solar](docs/SOLAR_SIMULATION_TECHNICAL_REPORT.md)

- [Reporte Técnico Eólica](docs/WIND_SIMULATION_TECHNICAL_REPORT.md)```

- [Reporte Técnico Hidráulica](docs/HYDRO_SIMULATION_TECHNICAL_REPORT.md)Repo-Entrega-Codigo-Primer_Quatri/

- [Reporte Técnico Biomasa](docs/BIOMASS_SIMULATION_TECHNICAL_REPORT.md)│

- [Guía de Despliegue](DOCS_DEPLOY.md) - Deployment en Google Cloud + Firebase├── frontend/                    # Aplicación React

│   ├── public/

### API Endpoints│   ├── src/

│   │   ├── components/         # Componentes reutilizables

**Backend (Node.js)**│   │   │   ├── common/         # Botones, inputs, cards

```│   │   │   ├── dashboards/     # Gráficos de resultados

POST   /api/simulate          - Ejecutar simulación completa│   │   │   └── layout/         # Sidebar, header

GET    /api/history           - Historial de simulaciones (requiere email)│   │   ├── features/           # Calculadoras por tecnología

GET    /api/catalog/:tech     - Catálogo de equipos (solar, wind, hydro, biomass)│   │   │   ├── calculators/

```│   │   │   │   ├── SolarCalculator.js

│   │   │   │   ├── AdvancedWindCalculator.js

**Motor de Cálculo (Python)**│   │   │   │   ├── HydroCalculator.js

```│   │   │   │   ├── BiomassCalculator.js

POST   /predict/solar         - Simulación solar FV│   │   │   │   └── ResidentialSolarCalculator.js

POST   /predict/wind          - Simulación eólica│   │   │   └── history/

POST   /predict/hydro         - Simulación hidráulica│   │   ├── contexts/           # AuthContext, ThemeContext

POST   /predict/biomass       - Simulación biomasa│   │   ├── services/           # API client (axios)

GET    /catalog/:tech         - Equipos disponibles│   │   └── App.js

POST   /prices                - Curva sintética de precios│   └── package.json

```│

├── backend/                     # API Node.js/Express

### Variables de Entorno│   ├── config/

│   │   ├── constants.js        # Constantes financieras/técnicas

**Backend (`backend/.env`):**│   │   └── db.js               # Conexión PostgreSQL

```env│   ├── controllers/

PORT=4000│   │   ├── simulationController.js

DB_HOST=localhost│   │   └── catalogController.js

DB_PORT=5432│   ├── routes/

DB_USER=admin│   ├── services/

DB_PASS=password123│   │   ├── physicsService.js   # Cliente HTTP para motor Python

DB_NAME=renewables_db│   │   └── financialService.js # Cálculos VAN, TIR, Payback

PHYSICS_ENGINE_URL=http://localhost:8000│   ├── scripts/

```│   │   └── init_remote_db.js

│   └── server.js

**Motor de Cálculo (`physics_engine/.env`):**│

```env├── physics_engine/              # Motor de Cálculo Físico (Python/FastAPI)

PORT=8000│   ├── config/

ENV=development│   │   ├── settings.py         # Variables de entorno

DB_HOST=localhost│   │   └── database.py         # ORM SQLAlchemy

DB_PORT=5432│   ├── models/                 # Modelos físicos

DB_USER=admin│   │   ├── solar.py            # SolarModel (NOCT, temp correction)

DB_PASS=password123│   │   ├── wind.py             # WindModel (wind shear, power curve)

DB_NAME=renewables_db│   │   ├── hydro.py            # HydroModel (Bernoulli, turbine efficiency)

OPENMETEO_URL=https://archive-api.open-meteo.com/v1/archive│   │   ├── biomass.py          # BiomassOptimizer (economic dispatch)

```│   │   ├── storage.py          # BatteryModel (SOC, charge/discharge)

│   │   └── market.py           # MarketModel (synthetic prices)

**Frontend (`frontend/.env`):**│   ├── routers/

```env│   │   ├── simulation.py       # POST /predict/{tech}

REACT_APP_BACKEND_URL=http://localhost:4000│   │   ├── catalog.py          # GET /catalog/{tech}

```│   │   └── market.py           # POST /prices

│   ├── etl/

---│   │   └── weather_connector.py # Fetch Open-Meteo API

│   ├── data/catalogs/          # JSON con equipos reales

## 🤝 Contribuciones│   │   ├── panels.json         # Jinko, Canadian, SunPower

│   │   ├── turbines.json       # Vestas, Gamesa, Siemens

Este es un proyecto académico (TFG). No se aceptan contribuciones externas en este momento.│   │   ├── hydro.json          # Francis, Kaplan, Pelton

│   │   ├── biomass.json        # Gasificadores, CHP

---│   │   └── batteries.json      # Tesla Powerwall, LG Chem

│   ├── main.py

## 📄 Licencia│   └── requirements.txt

│

Este proyecto está bajo la licencia MIT. Ver archivo `LICENSE` para más detalles.├── database/

│   └── init/

---│       └── 01_init.sql         # Schema PostgreSQL/TimescaleDB

│

## 👨‍💻 Autor├── docs/                        # Documentación técnica TFG

│   ├── MARCO_TEORICO.md

**Eric**  │   ├── METODOLOGIA.md

Trabajo de Fin de Grado - Ingeniería  │   ├── RESULTADOS.md

Universidad Politécnica│   ├── SOLAR_SIMULATION_TECHNICAL_REPORT.md

│   ├── WIND_SIMULATION_TECHNICAL_REPORT.md

---│   ├── HYDRO_SIMULATION_TECHNICAL_REPORT.md

│   └── BIOMASS_SIMULATION_TECHNICAL_REPORT.md

## 📞 Soporte│

├── scripts/

Para preguntas o problemas técnicos, abrir un issue en el repositorio de GitHub.│   └── generar_graficas_validacion.py

│

---├── docker-compose.yml

├── firebase.json

## 🙏 Agradecimientos├── package.json                # Scripts npm globales

└── README.md

- **Open-Meteo** por proporcionar datos meteorológicos históricos gratuitos```

- **PVGIS** (JRC European Commission) por datos de irradiación solar

- **Red Eléctrica de España** por datos de precios de mercado---

- Fabricantes de equipos por especificaciones técnicas públicas

## 🔬 Modelos Físicos

---

### Solar Fotovoltaica

## 🔮 Roadmap Futuro

**Ecuación Principal:**

- [ ] Soporte para almacenamiento en baterías (Li-ion, flow batteries)```

- [ ] Análisis de riesgo Monte CarloP_ac = Capacity × (GHI/1000) × η_temp × (1 - L_system) × η_inverter

- [ ] Optimización multi-objetivo (NSGA-II)```

- [ ] Integración con API de REE para precios en tiempo real

- [ ] Módulo de operación y mantenimiento predictivoDonde:

- [ ] App móvil (React Native)- `η_temp = 1 + γ × (T_cell - 25)`  [γ ≈ -0.003/°C]

- `T_cell = T_amb + (NOCT - 20) × (GHI/800)`  [NOCT ≈ 43°C]

---- `L_system ≈ 0.14` (pérdidas cables, polvo, sombras)

- `η_inverter ≈ 0.96`

**Última actualización:** Enero 2025

**Referencias:**
- IEC 61853-1 (Temperature coefficients)
- NREL System Advisor Model (SAM)

### Eólica

**Extrapolación de Viento:**
```
v(h) = v_ref × ln(h/z₀) / ln(h_ref/z₀)
```

**Curva de Potencia:**
```
P(v) = {
  0,                           v < v_cut_in
  Capacity × ((v - v_cut_in) / (v_rated - v_cut_in))³,  v_cut_in ≤ v < v_rated
  Capacity,                    v_rated ≤ v < v_cut_out
  0,                           v ≥ v_cut_out
}
```

**Referencias:**
- IEC 61400-12-1 (Power curve measurement)
- Datasheets de fabricantes (Vestas V90-2.0 MW, etc.)

### Hidráulica

**Potencia Teórica:**
```
P = ρ × g × Q × H_net × η_turbine
```

Donde:
- `H_net = H_gross - H_friction - H_turbulence`
- `Q = min(Q_available, Q_design)` con `Q ≥ Q_ecological`
- `η_turbine`: Francis (0.90), Kaplan (0.92), Pelton (0.88)

**Referencias:**
- ESHA (European Small Hydropower Association)
- Guía técnica de aprovechamiento hidroeléctrico (IDAE)

### Biomasa

**Consumo de Combustible:**
```
Fuel_kg/h = (P_electric / η_electric) / PCI_kWh/kg
```

**Coste Marginal:**
```
MC_EUR/MWh = (Fuel_kg/MWh × Price_fuel_EUR/kg) / η_electric
```

**Despacho:** Opera cuando `Price_market > MC`

**Referencias:**
- Principios de termodinámica (Çengel & Boles)
- Guía técnica de biomasa (IDAE)

---

## 📚 Documentación

### Documentos Técnicos Disponibles

- [Marco Teórico](docs/MARCO_TEORICO.md) - Fundamentos físicos y económicos
- [Metodología Scrum](docs/METODOLOGIA_SCRUM.md) - Gestión ágil del proyecto
- [Reporte Técnico Solar](docs/SOLAR_SIMULATION_TECHNICAL_REPORT.md)
- [Reporte Técnico Eólica](docs/WIND_SIMULATION_TECHNICAL_REPORT.md)
- [Reporte Técnico Hidráulica](docs/HYDRO_SIMULATION_TECHNICAL_REPORT.md)
- [Reporte Técnico Biomasa](docs/BIOMASS_SIMULATION_TECHNICAL_REPORT.md)
- [Guía de Despliegue](DOCS_DEPLOY.md) - Deployment en Google Cloud + Firebase

### API Endpoints

**Backend (Node.js)**
```
POST   /api/simulate          - Ejecutar simulación completa
GET    /api/history           - Historial de simulaciones (requiere email)
GET    /api/catalog/:tech     - Catálogo de equipos (solar, wind, hydro, biomass)
```

**Motor de Cálculo (Python)**
```
POST   /predict/solar         - Simulación solar FV
POST   /predict/wind          - Simulación eólica
POST   /predict/hydro         - Simulación hidráulica
POST   /predict/biomass       - Simulación biomasa
GET    /catalog/:tech         - Equipos disponibles
POST   /prices                - Curva sintética de precios
```

### Variables de Entorno

**Backend (`backend/.env`):**
```env
PORT=4000
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASS=password123
DB_NAME=renewables_db
PHYSICS_ENGINE_URL=http://localhost:8000
```

**Motor de Cálculo (`physics_engine/.env`):**
```env
PORT=8000
ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASS=password123
DB_NAME=renewables_db
OPENMETEO_URL=https://archive-api.open-meteo.com/v1/archive
```

**Frontend (`frontend/.env`):**
```env
REACT_APP_BACKEND_URL=http://localhost:4000
```

---

## 🤝 Contribuciones

Este es un proyecto académico (TFG). No se aceptan contribuciones externas en este momento.

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver archivo `LICENSE` para más detalles.

---

## 👨‍💻 Autor

**Eric**  
Trabajo de Fin de Grado - Ingeniería  
Universidad Politécnica

---

## 📞 Soporte

Para preguntas o problemas técnicos, abrir un issue en el repositorio de GitHub.

---

## 🙏 Agradecimientos

- **Open-Meteo** por proporcionar datos meteorológicos históricos gratuitos
- **PVGIS** (JRC European Commission) por datos de irradiación solar
- **Red Eléctrica de España** por datos de precios de mercado
- Fabricantes de equipos por especificaciones técnicas públicas

---

## 🔮 Roadmap Futuro

- [ ] Soporte para almacenamiento en baterías (Li-ion, flow batteries)
- [ ] Análisis de riesgo Monte Carlo
- [ ] Optimización multi-objetivo (NSGA-II)
- [ ] Integración con API de REE para precios en tiempo real
- [ ] Módulo de operación y mantenimiento predictivo
- [ ] App móvil (React Native)

---

**Última actualización:** Enero 2025
