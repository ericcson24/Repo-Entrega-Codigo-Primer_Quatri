# Guía de Despliegue en Producción (Cloud)
**Arquitectura:** React (Firebase App Hosting) + Node.js (Google Cloud Run) + Python AI (Google Cloud Run) + PostgreSQL (Neon.tech).

---

## 1. Base de Datos (Neon.tech)
Ya tienes tu base de datos en Neon.tech.
Cadena de Conexión: `postgresql://neondb_owner:npg_rS6EFRuv3Mmt@ep-frosty-smoke-ahu1b8ye-pooler.c-3.us-east-1.aws.neon.tech/neondb` (¡Recuerda que necesita SSL!)

**Pasos:**
1. **Opción Recomendada (Script Automático):**
   He creado un script para facilitar esto sin instalar nada extra.
   ```bash
   cd backend
   node scripts/init_remote_db.js
   ```

2. **Opción Manual (si tienes PostgreSQL instalado):**
   ```bash
   psql "postgresql://neondb_owner:npg_rS6EFRuv3Mmt@ep-frosty-smoke-ahu1b8ye-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require" -f database/init/01_init.sql
   ```
   *(Este comando creará la tabla 'simulations' y otras necesarias).*

---

## 2. Google Cloud (Backend + AI)
El proyecto falló al crearse porque usaste mayúsculas. Los ID de proyecto en Google Cloud deben ser minúsculas.

**Pasos:**
1. Crear proyecto correctamente:
   ```bash
   gcloud projects create renewable-sim-2026 --name="Simulador Renovables"
   gcloud config set project renewable-sim-2026
   ```

2. Habilitar servicios necesarios (Artifacts y Cloud Run):
   ```bash
   gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
   ```

   **🛑 Solución de Errores Comunes (PERMISSION_DENIED):**
   Si recibes un error de permisos con Cloud Build o Storage, ejecuta estos comandos para arreglar la cuenta de servicio por defecto (reemplaza `NUMERO_DE_PROYECTO` por el número que aparece en el error, ej: 926164464417):
   
   ```bash
   # 1. Asignar rol de Cloud Build
   gcloud projects add-iam-policy-binding renewable-sim-2026 \
     --member=serviceAccount:NUMERO_DE_PROYECTO-compute@developer.gserviceaccount.com \
     --role=roles/cloudbuild.builds.builder

   # 2. Asignar rol de Storage Admin
   gcloud projects add-iam-policy-binding renewable-sim-2026 \
     --member=serviceAccount:NUMERO_DE_PROYECTO-compute@developer.gserviceaccount.com \
     --role=roles/storage.admin
   ```

3. Desplegar **AI Engine** (Python):
   ```bash
   cd ai_engine
    gcloud run deploy simulator-ai \
     --source . \
     --region europe-west1 \
     --allow-unauthenticated \
     --clear-base-image
   ```
   *URL de AI Engine:* `https://simulator-ai-926164464417.europe-west1.run.app`

4. Desplegar **Backend** (Node.js):
   Ejecuta esto exacto (ya incluye tus claves y la URL del AI):
   ```bash
   cd ../backend
   gcloud run deploy simulator-backend \
     --source . \
     --region europe-west1 \
     --allow-unauthenticated \
     --clear-base-image \
     --set-env-vars="DB_HOST=ep-frosty-smoke-ahu1b8ye-pooler.c-3.us-east-1.aws.neon.tech,DB_USER=neondb_owner,DB_PASS=npg_rS6EFRuv3Mmt,DB_NAME=neondb,AI_ENGINE_URL=https://simulator-ai-926164464417.europe-west1.run.app"
   ```
   *URL del Backend:* `https://simulator-backend-926164464417.europe-west1.run.app`

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
   **Opciones a seleccionar:**
   * **Project**: Use an existing project -> `simulador-renovables` (o el que hayas creado).
   * **Public directory**: `frontend/build`
   * **Single-page app**: Yes
   * **Auto deploys with GitHub**: Optional (Yes if you want CD).

3. Configurar Entorno Producción:
   Ya se ha creado automáticamente el archivo `frontend/.env.production` con la URL del Backend Cloud.
   Verifica que contiene:
   ```env
   REACT_APP_API_URL=https://simulator-backend-926164464417.europe-west1.run.app/api
   ```

4. Compilar y Desplegar:
   ```bash
   cd frontend
   npm run build
   cd ..
   firebase deploy --only hosting
   ```
   *Esto generará tu URL pública final (ej: https://simulador-renovables.web.app).*

---

## Notas Importantes
- **DB_HOST**: En Neon.tech es el string largo (ej: `ep-frosty...neon.tech`).
- **Seguridad**: `allow-unauthenticated` hace que la API sea pública. Para producción real deberías configurar CORS o autenticación.
