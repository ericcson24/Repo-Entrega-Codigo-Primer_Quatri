# Despliegue a Firebase Hosting

Este documento explica cómo desplegar la aplicación en Firebase Hosting de dos maneras:

1. Despliegue local (interactivo) — útil para desarrollo rápido.
2. Despliegue automático por GitHub Actions — recomendado para CI/CD.

---

## Opción A — Despliegue local (desde tu máquina)

Requisitos previos:
* Node.js 18+
* npm
* Firebase CLI instalado y autenticado

Pasos:

```bash
# 1) Ir a la carpeta frontend
cd frontend

# 2) Instalar dependencias (si no lo has hecho)
npm install

# 3) Generar el build de producción
npm run build

# 4) Volver al raíz del proyecto
cd ..

# 5) Desplegar mediante Firebase CLI (requiere haber hecho 'firebase login')
# Reemplaza <PROJECT_ID> por tu id de proyecto en Firebase si no está definido en .firebaserc
firebase deploy --only hosting --project <PROJECT_ID>
```

Si nunca has usado Firebase CLI, primero autentícate:

```bash
npm install -g firebase-tools
firebase login
```

Si necesitas un token de CI (para usar en GitHub Actions), ejecuta:

```bash
firebase login:ci
```

y copia el token que se muestra.

---

## Opción B — Despliegue automático con GitHub Actions (recomendado)

He añadido un workflow en `.github/workflows/firebase-deploy.yml` que construirá y desplegará la carpeta `frontend` cuando haya `push` a las ramas `main` o `rehacer`.

Para que funcione debes añadir dos secretos en el repositorio GitHub:

* `FIREBASE_TOKEN` — Token obtenido con `firebase login:ci`.
* `FIREBASE_PROJECT` — El ID del proyecto de Firebase (ej. `mi-proyecto-12345`).

Cómo añadir los secretos:
1. Entra en tu repositorio en GitHub.
2. Ve a `Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`.
3. Crea `FIREBASE_TOKEN` y pega el token.
4. Crea `FIREBASE_PROJECT` y pega el ID del proyecto.

Tras configurarlo, cada `push` a `main` o `rehacer` disparará la acción que construye y despliega la app.

---

## Notas y comprobaciones

* Asegúrate de que `firebase.json` apunta a `frontend/build` (ya está configurado en este repositorio).
* Si tu proyecto Firebase requiere ajustes de configuración (region, rewrite rules...), añade un archivo `.firebaserc` o configura las variables en el panel de Firebase.
* Si prefieres que el workflow solo se ejecute manualmente, puedo modificar el trigger para `workflow_dispatch` en lugar de `push`.

Si quieres, puedo:
* Añadir `.firebaserc` con el `default` project si me indicas el `projectId`.
* Cambiar el trigger de la Action a `workflow_dispatch` para ejecuciones manuales.
* Intentar ejecutar los pasos de despliegue desde aquí (requiere que autorices la ejecución de comandos interactivos).