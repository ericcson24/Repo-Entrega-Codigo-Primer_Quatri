# Simulador de Energías Renovables ⚡️

Proyecto para la simulación financiera y técnica de plantas de energía renovable. Permite calcular la viabilidad de instalaciones solares, eólicas, hidroeléctricas y de biomasa basándose en datos climáticos reales y parámetros económicos.

## Estructura del Proyecto

El sistema está dividido en microservicios dockerizados para separar la lógica de cálculo (pesada) de la gestión de usuarios y la interfaz.

*   **`frontend/`**: La intefaz de usuario. Está hecha con React y Tailwind. Sirve para configurar los parámetros de la simulación y ver los gráficos de resultados.
*   **`backend/`** (Node.js): Es el orquestador. Gestiona la API principal, guarda las simulaciones en la base de datos y se comunica con el motor de física cuando hace falta calcular algo nuevo.
*   **`physics_engine/`** (Python): Aquí está la "chicha" del cálculo. Usamos Python con Pandas/NumPy porque es mucho más eficiente para procesar las series temporales de datos meteorológicos y aplicar las fórmulas de generación de energía. Expone una API con FastAPI.
*   **`database/`**: Configuración de TimescaleDB (PostgreSQL tuneado para series de tiempo).

## Cómo levantarlo en local

Lo más sencillo es usar Docker Compose, así no tienes que instalar Python ni Node en tu máquina local si no quieres.

1.  Clónate el repo.
2.  Asegúrate de tener Docker corriendo.
3.  Ejecuta:

```bash
docker-compose up --build
```

Esto va a levantar:
*   Postgres en el puerto `5432`
*   El backend en el `3000` (interno, a veces expuesto)
*   El motor de física en el `8000`
*   El frontend (normalmente en el `3000` o `8080` dependiendo de la config de React, mira la consola).

### Si quieres desarrollar (sin Docker para el código)

Si quieres tocar código y ver cambios rápido, suele ser mejor levantar la base de datos con Docker y correr los servicios en local:

1.  `docker-compose up timescaledb -d`
2.  **Backend:** `cd backend && npm install && npm run dev`
3.  **Physics:** Ve a `physics_engine`, crea un virtualenv, instala `requirements.txt` y corre `uvicorn main:app --reload`.
4.  **Frontend:** `cd frontend && npm install && npm start`.

## Notas de desarrollo

*   **Datos climáticos:** Usamos la API de Open-Meteo. No requiere API Key para uso básico, pero tenlo en cuenta si haces muchas peticiones seguidas.
*   **Base de datos:** Los scripts de `database/init` se ejecutan solos la primera vez que se levanta el contenedor de postgres. Si las tablas no se crean, borra el volumen de docker y reinicia.

## Estado del proyecto

Actualmente funcional para simulaciones básicas de las 4 tecnologías.
*   ✅ Cálculos de generación física (Solar/Eólica funcionan con datos reales).
*   ✅ Flujo de caja simple (VAN, TIR).
*   🚧 Faltan tests de integración más exhaustivos.
