# Simulador de Inversión en Energías Renovables (TFG)

Este proyecto es una plataforma avanzada para el análisis técnico y financiero de proyectos de energía renovable (**Solar FV, Eólica, Hidráulica y Biomasa**). Integra modelos de simulación física de alta fidelidad, datos meteorológicos reales (OpenMeteo 2023-2024) y un motor financiero profesional para calcular la viabilidad económica bajo escenarios de incertidumbre y volatilidad de mercado.

## 🌟 Características Principales

### 1. Motor de Simulación Multi-Tecnología (AI Engine)
- **Solar FV:** Modelo de **Diodo Simple (PVLib)** con datos espectrales y térmicos reales. Considera nubosidad, temperatura de célula y pérdidas por suciedad/cableado.
- **Eólica:** Extrapolación vertical de viento (Ley de Hellman) y curvas de potencia de turbinas reales (Vestas, Gamesa).
- **Hidráulica:** Modelo de turbinado basado en caudal ecológico y altura de salto neto.
- **Biomasa:** Optimización de despacho económico basado en precios de mercado y coste variable de combustible.

### 2. Análisis Financiero Profesional
- **Métricas Clave:** VAN (NPV), TIR (IRR), Payback, LCOE y ROI.
- **Estructura de Capital:** Simulación de Apalancamiento (Project Finance), Deuda Senior, Equity y ratio de cobertura.
- **Fiscalidad y Ayudas:** Soporte para Subvenciones (NextGen), deducciones fiscales y amortización acelerada.
- **Modelos de Ingres:** Autoconsumo con compensación de excedentes vs Venta a Red (PPA/Merchant).

### 3. Visualización Avanzada
- **Dashboards Interactivos:** Gráficos de Flujo de Caja, Perfiles Estacionales y Curvas de Duración de Carga.
- **Comparativa de Escenarios:** Análisis de sensibilidad ante variaciones de CAPEX o precios de energía.

## 📋 Requisitos del Sistema

Para ejecutar este sistema necesitas tener instalado:

*   **Node.js**: Versión 14.0.0 o superior.
*   **npm**: Gestor de paquetes de Node (normalmente viene con Node.js).
*   **Git**: Para clonar el repositorio.

## 🚀 Instalación y Puesta en Marcha

Sigue estos pasos para instalar y ejecutar el proyecto desde cero:

### 1. Instalación de Dependencias

El proyecto tiene una estructura monorepo (Frontend + Backend). Puedes instalar todas las dependencias con un solo comando desde la raíz:

```bash
npm run install:all
```

O manualmente paso a paso:

```bash
# 1. Instalar dependencias de la raíz
npm install

# 2. Instalar dependencias del Backend
cd backend
npm install
cd ..

# 3. Instalar dependencias del Frontend
cd frontend
npm install
cd ..
```

### 2. Ejecución del Sistema

Para iniciar tanto el servidor (Backend) como la interfaz de usuario (Frontend) simultáneamente:

```bash
npm start
```

*   **Frontend**: Disponible en `http://localhost:3000`
*   **Backend**: Disponible en `http://localhost:5000`

---

## ⚙️ Arquitectura y Funcionamiento

El sistema se divide en dos partes principales:

### Backend (Node.js + Express)
*   **API REST**: Sirve los datos a la interfaz.
*   **Gestión de Datos**: Descarga, procesa y almacena datos históricos en archivos JSON (`/backend/data`).
*   **Motor de IA**: Entrena modelos de predicción basados en los datos históricos.

### Frontend (React + Tailwind CSS)
*   **Interfaz Interactiva**: Permite al usuario configurar parámetros de su instalación.
*   **Visualización**: Gráficos y tablas de ROI, producción energética y ahorro estimado.

---

## 📊 Sistema de Datos y Extracción

El sistema se alimenta de datos reales obtenidos de APIs públicas. Los datos se almacenan localmente en `backend/data` para evitar llamadas constantes a las APIs externas y permitir el funcionamiento offline de los modelos.

### Fuentes de Datos

1.  **Datos Meteorológicos (Viento y Clima)**
    *   **Fuente**: [Open-Meteo Archive API](https://open-meteo.com/)
    *   **Datos**: Temperatura, velocidad del viento, radiación, nubosidad.
    *   **Script**: `backend/scripts/download-weather-data.js`
    *   **Ubicación**: `backend/data/weather/`

2.  **Datos Solares (Irradiación)**
    *   **Fuente**: [PVGIS (Comisión Europea)](https://re.jrc.ec.europa.eu/pvg_tools/en/)
    *   **Datos**: Irradiación solar diaria estimada para paneles solares.
    *   **Script**: `backend/scripts/download-solar-data.js`
    *   **Ubicación**: `backend/data/solar/`

3.  **Precios de la Electricidad**
    *   **Fuente**: [Red Eléctrica de España (REE)](https://www.ree.es/es/apidatos)
    *   **Datos**: Precios del mercado diario (OMIE).
    *   **Script**: `backend/scripts/download-price-data.js`
    *   **Ubicación**: `backend/data/prices/`

### 🔄 Cómo Actualizar o Volver a Sacar Datos

Si deseas actualizar los datos históricos o volver a descargarlos (por ejemplo, si añades nuevas ciudades), el sistema incluye scripts automatizados que puedes ejecutar desde la raíz del proyecto.

1.  **Descargar TODO (Clima, Solar y Precios):**
    ```bash
    npm run download:all
    ```

2.  **Descargar individualmente:**
    ```bash
    npm run download:weather  # Solo clima
    npm run download:solar    # Solo datos solares
    npm run download:prices   # Solo precios de luz
    ```

3.  **Entrenar Modelos de IA:**
    Una vez descargados los datos, debes re-entrenar los modelos para que aprendan de la nueva información:
    ```bash
    npm run train:ai
    ```

4.  **Actualización Completa (Descarga + Entrenamiento):**
    Este es el comando recomendado para actualizar todo el sistema de una vez:
    ```bash
    npm run update:all
    ```

---

## 🧠 Modelos de Inteligencia Artificial

El sistema utiliza algoritmos de regresión lineal múltiple para predecir la generación de energía basándose en las condiciones climáticas históricas.

*   **Entrenamiento**: El script `train-ai-model.js` lee los archivos JSON de `backend/data/weather` y `backend/data/solar`.
*   **Predicción**:
    *   *Solar*: Predice la producción en función de la radiación, temperatura y nubosidad.
    *   *Eólica*: Predice la producción en función de la velocidad del viento.
*   **Persistencia**: Los modelos entrenados (coeficientes) se guardan en `backend/data/models/ai_models.json`.

## 📂 Estructura de Carpetas Clave

```
Proyecto ROI/
├── backend/
│   ├── config/             # Configuración de APIs y constantes
│   ├── data/               # "Base de datos" en archivos JSON
│   │   ├── weather/        # Histórico de clima
│   │   ├── solar/          # Histórico solar
│   │   ├── prices/         # Histórico de precios
│   │   └── models/         # Modelos de IA entrenados
│   ├── scripts/            # Scripts de descarga y entrenamiento (ETL)
│   └── server.js           # Punto de entrada del servidor
├── frontend/
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   └── ...
│   └── ...
└── package.json            # Scripts globales
```
