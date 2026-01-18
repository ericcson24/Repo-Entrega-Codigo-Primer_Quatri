# Hoja de Ruta: Simulador de Inversiones en Energías Renovables con IA (TFG)# Hoja de Ruta: Simulador de Inversiones en Energías Renovables con IA (TFG)



**ESTADO ACTUAL: IMPLEMENTACIÓN FASE BETA 2.0 (Enero 2026)****ESTADO ACTUAL: IMPLEMENTACIÓN FASE BETA 2.0 (Enero 2026)**



Este documento define la arquitectura implementada y los pasos futuros para el Trabajo de Fin de Grado (TFG). La plataforma es funcional, integrando simulación física precisa (Python/PVLib) y análisis financiero avanzado (Node.js).Este documento define la arquitectura implementada y los pasos futuros para el Trabajo de Fin de Grado (TFG). La plataforma es funcional, integrando simulación física precisa (Python/PVLib) y análisis financiero avanzado (Node.js).



## 1. Arquitectura Implementada## 1. Arquitectura Implementada



### Núcleo Tecnológico### Núcleo Tecnológico

- **Frontend (React 18):** Interfaz moderna con TailwindCSS, Recharts y Context API. Soporte i18n y Modo Oscuro.- **Frontend (React 18):** Interfaz moderna con TailwindCSS, Recharts y Context API. Soporte i18n y Modo Oscuro.

- **Backend (Node.js/Express):** Orquestador de servicios, gestión de usuarios (Firebase Auth-Ready) y persistencia (PostgreSQL).- **Backend (Node.js/Express):** Orquestador de servicios, gestión de usuarios (Firebase Auth) y persistencia (PostgreSQL).

- **AI Engine (Python/FastAPI):** Microservicio dedicado a la simulación física (PVLib, Modelos Eólicos) y descarga de datos meteorológicos reales (OpenMeteo Archive).- **AI Engine (Python/FastAPI):** Microservicio dedicado a la simulación física (PVLib, Modelos Eólicos) y descarga de datos meteorológicos reales (OpenMeteo Archive).

- **Base de Datos:** PostgreSQL para persistencia de simulaciones y perfiles de usuario.- **Base de Datos:** PostgreSQL para persistencia de simulaciones y perfiles de usuario.



## 2. Estado del Desarrollo### Flujo de Datos

1.  **Frontend:** Recoge parámetros técnicos (turbina, paneles) y financieros (deuda, ayudas).

### Fase 1: Motor de Simulación Física (Completado)2.  **Backend Node:** Valida y solicita predicción al AI Engine.

- [x] **Solar FV:** Integración de PVLib, modelo de diodo simple, corrección de temperatura y degradación.3.  **AI Engine:** 

- [x] **Eólica:** Curvas de potencia de turbinas reales, ley de Hellman para perfil vertical de viento.    - Descarga clima real de OpenMeteo.

- [x] **Hidráulica:** Modelo de turbina Francis/Pelton con curva de eficiencia y caudal ecológico.    - Simula generación horaria (8760h) usando física (No "cajas negras").

- [x] **Biomasa:** Modelo de despacho térmico con costes variables de combustible.    - Devuelve series temporales.

- [x] **Datos Meteorológicos:** Integración robusta con OpenMeteo Archive (2023-2024).4.  **Backend Node:** Calcula ingresos horarios (Generación x Precio Mercado/Ahorro) y proyecta Cash Flow a 25 años.

5.  **Frontend:** Renderiza KPIs (VAN, TIR) y gráficos interactivos.

### Fase 2: Ingeniería Financiera (Completado)

- [x] **Motor DCF (Discounted Cash Flow):** Cálculo de VAN, TIR y Payback a 25 años.## 2. Implementación de Funcionalidades

- [x] **Apalancamiento:** Simulación de deuda (Deuda ratio, interés, plazo) con amortización francesa.
- [x] **Fiscalidad:** Impuesto de sociedades y desgravaciones.
- [x] **Modelos de Ingreso:** Soporte completo para Autoconsumo (Ahorro) vs Venta a Red (Excedentes).
- [x] **Inflación:** Indexación separada para O&M (IPC) y precios de energía.

### Fase 3: Experiencia de Usuario - UI/UX (Completado)
- [x] **Dashboards Interactivos:** Gráficas con Recharts (Curvas de duración, Perfiles diarios).
- [x] **Modo Avanzado:** Ocultación de parámetros complejos para usuarios noveles.
- [x] **Visualización Financiera:** Diferenciación visual clara entre ingresos por venta y ahorro por autoconsumo.
- [x] **Fichas Técnicas:** Resumen de parámetros de simulación en los resultados.

### Fase 4: Validación y Testing (En Progreso)
- [x] **Validación Solar:** Comparativa con PVGIS (Error < 5%).
- [x] **Validación Financiera:** Comprobación lógica de apalancamiento (Deuda sube TIR, baja Beneficio nominal).
- [ ] **Tests E2E:** Automatización de pruebas de flujo completo (Cypress/Playwright).
- [ ] **Validación Cruzada:** Comparar resultados eólicos con herramientas de la industria (WAsP simplificado).

## 3. Próximos Pasos (Q1 2026)
1.  **Optimización de Carga:** Implementar `React.lazy` para carga diferida de componentes de gráficas pesadas.
2.  **Exportación de Informes:** Generación de PDF con el resumen ejecutivo de la inversión.
3.  **Comparador de Escenarios:** Permitir guardar dos simulaciones y verlas "Side-by-Side" (A/B Testing de inversiones).
