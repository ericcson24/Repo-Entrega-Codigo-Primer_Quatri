# Simulador de Inversión en Energías Renovables

Este proyecto es una plataforma completa para la simulación financiera y técnica de proyectos de energía renovable (Solar, Eólica, Hidráulica y Biomasa).

## Estructura del Proyecto

El repositorio está organizado en tres componentes principales:

1.  **Frontend (`/frontend`)**: Interfaz de usuario construida con React, con calculadoras interactivas y paneles de visualización.
2.  **Backend (`/backend`)**: API RESTful en Node.js/Express que gestiona usuarios, simulaciones y la lógica de negocio.
3.  **Motor de Física (`/physics_engine`)**: Microservicio en Python (FastAPI) encargado de los cálculos técnicos complejos de generación de energía.

## Requisitos Previos

*   Node.js (v18+)
*   Python (v3.10+)
*   Docker (Opcional, para despliegue contenerizado)

## Instalación y Ejecución Local

1.  **Instalar dependencias globales:**
    ```bash
    npm install
    ```

2.  **Instalar dependencias de subproyectos:**
    ```bash
    npm run install:all
    ```
    *(Nota: También deberá instalar las dependencias de Python en `physics_engine` manualmente si no usa Docker)*

3.  **Iniciar entornos de desarrollo:**
    ```bash
    npm start
    ```
    Esto iniciará concurrentemente el Frontend, Backend y el Motor de Física.

## Despliegue

Consulte el archivo `DOCS_DEPLOY.md` para obtener instrucciones detalladas sobre cómo desplegar la aplicación en Google Cloud y Firebase.

## Tecnologías Utilizadas

*   **Frontend:** React, Recharts, Tailwind CSS (via clases utilitarias)
*   **Backend:** Node.js, Express, PostgreSQL
*   **Ciencia de Datos:** Python, Pandas, NumPy, Scikit-learn (potencialmente para futuros modelos)

## Autor

Ericcson24
