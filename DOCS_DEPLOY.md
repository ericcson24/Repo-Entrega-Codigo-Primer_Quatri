# Guía de Despliegue en Producción (Cloud)
**Arquitectura:** React (Firebase App Hosting) + Node.js (Google Cloud Run) + Python (Motor de Cálculo en Google Cloud Run) + PostgreSQL (Neon.tech).

---

## 1. Configuración de Base de Datos (Neon.tech)
Se requiere una instancia de PostgreSQL (por ejemplo, en Neon.tech).
Cadena de Conexión (Ejemplo): `postgresql://usuario:contraseña@host/base_de_datos?sslmode=require`

**Pasos:**
1. **Opción Automatizada:**
   Ejecutar el script de inicialización desde el directorio del backend:
   ```bash
   cd backend
   node scripts/init_remote_db.js
   ```

2. **Opción Manual:**
   Ejecutar el script SQL de inicialización utilizando `psql`:
   ```bash
   psql "[TU_CADENA_CONEXION]" -f database/init/01_init.sql
   ```
   *(Este comando creará la tabla 'simulations' y las estructuras necesarias).*

---

## 2. Google Cloud (Backend + Motor de Cálculo)
Nota: Los identificadores de proyecto en Google Cloud deben estar en minúsculas.

**Pasos:**
1. Crear proyecto:
   ```bash
   gcloud projects create [NOMBRE_PROYECTO] --name="Simulador Renovables"
   gcloud config set project [NOMBRE_PROYECTO]
   ```

2. Habilitar servicios necesarios (Artifacts y Cloud Run):
   ```bash
   gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
   ```

3. Desplegar **Motor de Cálculo** (Python):
   ```bash
   cd ai_engine
    gcloud run deploy simulator-ai \
     --source . \
     --region european-west1 \
     --allow-unauthenticated \
     --clear-base-image
   ```

4. Desplegar **Backend** (Node.js):
   Configurar las variables de entorno para la conexión a base de datos y la URL del servicio Python desplegado anteriormente.
   ```bash
   cd ../backend
   gcloud run deploy simulator-backend \
     --source . \
     --region europe-west1 \
     --allow-unauthenticated \
     --clear-base-image \
     --set-env-vars="DB_HOST=[HOST_NEON],DB_USER=[USUARIO],DB_PASS=[CONTRASEÑA],DB_NAME=[BASE_DATOS],AI_ENGINE_URL=[URL_SERVICIO_PYTHON]"
   ```

---

## 3. Frontend (Firebase)
1. Instalar Firebase Tools:
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. Inicializar Proyecto:
   ```bash
   firebase init hosting
   ```
   **Configuración recomendada:**
   * **Project**: Seleccionar el proyecto creado.
   * **Public directory**: `frontend/build`
   * **Single-page app**: Yes

3. Configurar Entorno Producción:
   Asegurar que el archivo `frontend/.env.production` apunte a la URL del Backend desplegado.
   ```env
   REACT_APP_API_URL=https://[URL_BACKEND_CLOUD]/api
   ```

4. Compilar y Desplegar:
   ```bash
   cd frontend
   npm run build
   cd ..
   firebase deploy --only hosting
   ```

---

## Notas Adicionales
- **Seguridad**: La configuración `allow-unauthenticated` expone la API públicamente. Para entornos productivos, se recomienda configurar políticas de autenticación o CORS restrictivo.
