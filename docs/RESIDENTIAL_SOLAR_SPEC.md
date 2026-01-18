# Especificación Técnica: Calculadora Solar Residencial ("Energía Solar en Casa")

## 1. Visión General
Esta funcionalidad permite a los usuarios residenciales diseñar un sistema fotovoltaico preliminar basado en las limitaciones físicas de su tejado (área disponible) y su presupuesto. La herramienta integrará un catálogo de paneles solares reales del mercado y utilizará el motor de IA existente (`SolarModel`) para proyectar la generación de energía.

## 2. Requerimientos Funcionales

### 2.1 Entradas del Usuario
*   **Área Disponible (m²)**: Espacio útil en el tejado o terreno.
*   **Presupuesto (€)**: Límite económico inicial.
*   **Selección de Panel**: El usuario selecciona de una lista de paneles comerciales (con características como potencia Wp, eficiencia %, precio y dimensiones).
*   **Ubicación/Consumo (Opcional/Futuro)**: Para estimaciones más precisas de radiación.

### 2.2 Cálculos y Lógica
1.  **Cálculo de Capacidad Física**:
    *   $N_{paneles\_area} = \lfloor \frac{\text{Área Disponible}}{\text{Área Panel}} \rfloor$
2.  **Cálculo de Capacidad Económica**:
    *   $N_{paneles\_presupuesto} = \lfloor \frac{\text{Presupuesto}}{\text{Precio Panel} + \text{Costes Instalación Estimados}} \rfloor$
3.  **Determinación del Sistema**:
    *   $N_{final} = \min(N_{paneles\_area}, N_{paneles\_presupuesto})$
    *   $\text{Potencia Total (kW)} = N_{final} \times \text{Potencia Panel (W)} / 1000$
4.  **Simulación Energética**:
    *   Uso del modelo `ai_engine/models/solar.py`.
    *   Ejecución de predicción anual basada en datos meteorológicos por defecto o históricos.

### 2.3 Salidas (Resultados)
*   Número de paneles viables.
*   Potencia total instalada (kWp).
*   Coste total estimado (Hardware + Instalación).
*   Generación Anual Estimada (MWh).
*   Ahorro estimado en factura eléctrica (opcional, basado en precio medio kWh).

## 3. Arquitectura Técnica

### 3.1 Frontend (React)
Se añadirá una nueva ruta `/residential-solar` accesible desde el Sidebar.
*   **Componente Principal**: `ResidentialSolarCalculator.js`
*   **Componentes UI**:
    *   `PanelSelector`: Grid o Dropdown con tarjetas de paneles (Foto, Wp, Precio).
    *   `InstallationForm`: Inputs numéricos para Área y Presupuesto.
    *   `SimulationResult`: Gráficos de generación (Recharts) y resumen de KPIs.

### 3.2 Estructura de Datos: Catálogo de Paneles
Se definirá un estructura JSON para alimentar el selector:
```json
[
  {
    "id": "sunpower-maxeon-3",
    "brand": "SunPower",
    "model": "Maxeon 3",
    "power_watts": 400,
    "efficiency": 0.226,
    "dimensions": { "width": 1.05, "height": 1.69 }, // Area ≈ 1.77 m2
    "price_eur": 350,
    "image": "/assets/panels/sp-max3.png"
  },
  {
    "id": "canadian-solar-bifacial",
    "brand": "Canadian Solar",
    "model": "HiKu7 Mono PERC",
    "power_watts": 650,
    "efficiency": 0.214,
    "dimensions": { "width": 1.3, "height": 2.3 }, // Area ≈ 3.0 m2
    "price_eur": 220,
    "image": "/assets/panels/cs-hiku7.png"
  }
]
```

### 3.3 Integración con Backend
*   **Endpoint**: `POST /api/simulation/residential-solar`
*   **Body**:
    ```json
    {
      "panel_id": "sunpower-maxeon-3",
      "available_area": 50,
      "budget": 5000
    }
    ```
*   **Lógica Backend**:
    1.  Recuperar especificaciones del panel.
    2.  Calcular número de paneles (Max Panels).
    3.  Instanciar `SolarModel` en Python (via script o servicio AI).
    4.  Devolver serie temporal de generación y totales.

### 3.4 Actualizaciones de Router y Navegación
*   Modificar `frontend/src/App.js` para incluir la ruta.
*   Modificar `frontend/src/components/layout/Sidebar.js` para añadir el icono (ej. `Home` o `BatteryCharging`).

## 4. Plan de Implementación
1.  **Backend**: Crear controlador para lógica de dimensionamiento básico (podemos hacerlo inicialmente en el frontend si no requerimos persistencia, pero lo ideal es preparar la API).
2.  **AI Engine**: Asegurar que `SolarModel` puede recibir `capacity_kw` calculado dinámicamente.
3.  **Frontend**:
    *   Crear página `ResidentialSolar.js`.
    *   Integrar catálogo (mock data inicialmente).
    *   Conectar estado y visualización.
