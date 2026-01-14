# Documentación Técnica - Actualización Enero 2026

## Integridad de Datos y Eliminación de Mocks

El sistema ha sido actualizado para eliminar cualquier dependencia de generadores de datos aleatorios (`Math.random()`) o constantes hardcodeadas ficticias. La arquitectura actual se basa estrictamente en:

1.  **Fuentes de Verdad**:
    *   **Precios de Energía**: API de REE (Red Eléctrica Española) via `backend/data/prices/electric_prices_2020-2024.json`. Dataset de 5 años con 43,000+ registros horarios.
    *   **Meteorología**: Open-Meteo Historical API (2020-2024).
    *   **Solar**: PVGIS (European Commission) API v5.2.

2.  **Inteligencia Artificial**:
    *   El modelo `solar_model` en `backend/data/models/ai_models.json` es el resultado de una regresión lineal (Least Squares) entrenada correlacionando temperatura ambiental histórica (Open-Meteo) vs. rendimiento real de paneles (PVGIS).
    *   Coeficiente térmico aprendido: `-0.53%/ºC`.

3.  **Política de Fallos**:
    *   Si una API externa falla y no existe caché local o datos históricos descargados, el sistema **devuelve error 500/503**.
    *   Se prohíbe el uso de "valores por defecto" que no sean constantes físicas universales (e.g., Densidad del aire).

## Estado de los Servicios
*   **MarketService**: Sirve datos reales 2020-2024.
*   **AIService/Controller**: Rechaza peticiones si el modelo no está entrenado.
*   **DynamicAPIService (Frontend)**: Consume endpoints estrictos del backend.

---
