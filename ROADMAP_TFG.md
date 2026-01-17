# Hoja de Ruta: Simulador de Inversiones en Energías Renovables con IA (TFG)

**ESTADO ACTUAL: IMPLEMENTACIÓN FASE BETA 2.0 (Enero 2026)**

Este documento define la arquitectura implementada y los pasos futuros para el Trabajo de Fin de Grado (TFG). La plataforma es funcional, integrando simulación física precisa (Python/PVLib) y análisis financiero avanzado (Node.js).

## 1. Arquitectura Implementada

### Núcleo Tecnológico
- **Frontend (React 18):** Interfaz moderna con TailwindCSS, Recharts y Context API. Soporte i18n y Modo Oscuro.
- **Backend (Node.js/Express):** Orquestador de servicios, gestión de usuarios (Firebase Auth) y persistencia (PostgreSQL).
- **AI Engine (Python/FastAPI):** Microservicio dedicado a la simulación física (PVLib, Modelos Eólicos) y descarga de datos meteorológicos reales (OpenMeteo Archive).
- **Base de Datos:** PostgreSQL para persistencia de simulaciones y perfiles de usuario.

### Flujo de Datos
1.  **Frontend:** Recoge parámetros técnicos (turbina, paneles) y financieros (deuda, ayudas).
2.  **Backend Node:** Valida y solicita predicción al AI Engine.
3.  **AI Engine:** 
    - Descarga clima real de OpenMeteo.
    - Simula generación horaria (8760h) usando física (No "cajas negras").
    - Devuelve series temporales.
4.  **Backend Node:** Calcula ingresos horarios (Generación x Precio Mercado/Ahorro) y proyecta Cash Flow a 25 años.
5.  **Frontend:** Renderiza KPIs (VAN, TIR) y gráficos interactivos.

## 2. Implementación de Funcionalidades
