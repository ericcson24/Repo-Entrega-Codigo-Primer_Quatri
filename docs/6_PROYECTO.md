# 6. Proyecto

Este capítulo presenta una visión integral de la ejecución del proyecto, detallando los resultados tangibles obtenidos, la gestión temporal de las tareas, los recursos técnicos y humanos movilizados, y un análisis exhaustivo de la viabilidad económica. El objetivo es proporcionar una evaluación cuantitativa y cualitativa del esfuerzo ingenieril realizado para materializar la plataforma de simulación energética.

## 6.1. Resumen de contribuciones y productos desarrollados

El trabajo realizado ha derivado en la creación de una suite de herramientas de software interconectadas que cubren todo el ciclo de análisis de viabilidad de proyectos renovables. A continuación, se desglosan las contribuciones científicas y los productos tecnológicos entregables.

### Principales Contribuciones
*   **Adaptación Metodológica Híbrida:** Se ha demostrado la viabilidad de integrar flujos de trabajo científicos (riguroso/lineal) con desarrollo de software ágil (iterativo) en un entorno unipersonal.
*   **Unificación de Modelos Físicos:** Integración de ecuaciones termodinámicas dispares (eólica, solar, biomasa) en un único motor de cálculo coherente y normalizado.
*   **Democratización del Análisis Energético:** Reducción de la barrera de entrada para estudios de pre-factibilidad, ofreciendo una interfaz intuitiva sin sacrificar la precisión técnica subyacente.

### Productos Desarrollados
*   **Plataforma Web (Frontend):** Interfaz de usuario dinámica desarrollada en **React.js**. Incluye cuadros de mando interactivos, formularios inteligentes de configuración y herramientas de visualización de datos financieros y energéticos.
*   **Motor de Simulación (AI Engine):** Núcleo de cálculo desarrollado en **Python** (v3.9). Implementa algoritmos vectoriales para el procesamiento de series temporales horarias (8760 datos/año) de recursos eólicos, solares e hidroeléctricos.
*   **API Gateway (Backend):** Servidor **Node.js/Express** que orquesta la comunicación entre la interfaz web y el motor de cálculo, gestionando la autenticación (JWT) y la persistencia de datos.
*   **Infraestructura como Código (IaC):** Configuración completa de **Docker Compose** para el despliegue automatizado de la base de datos PostgreSQL y los microservicios.
*   **Documentación Técnica:** Informes detallados de la física implementada para cada tecnología (disponibles en la carpeta `/docs`) y guías de despliegue.

## 6.2. Planificación temporal

El desarrollo del proyecto se ha ejecutado en un plazo de **20 semanas (5 meses)**, siguiendo la metodología iterativa descrita en el capítulo anterior. La planificación se estructuró para permitir la validación temprana de los modelos matemáticos antes de su integración en la interfaz web.

A continuación, se presenta el esquema temporal de las fases y tareas críticas:

**Figura 6.1.** Diagrama de Gantt simplificado del proyecto.

| Fase | Tarea Principal | Duración (Semanas) | Mes 1 | Mes 2 | Mes 3 | Mes 4 | Mes 5 |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **I. Inicio** | Definición de Requisitos y Estado del Arte | 2 | ██ | | | | |
| | Diseño de Arquitectura y Base de Datos | 2 | ██ | | | | |
| **II. Motor** | Desarrollo Algoritmos Solares y Eólicos | 3 | | ███ | | | |
| | Desarrollo Módulos Biomasa y Mercado | 3 | | | ███ | | |
| **III. Web** | Construcción API Backend y Auth | 3 | | | | ███ | |
| | Desarrollo Frontend y Dashboards | 3 | | | | ███ | |
| **IV. Cierre** | Integración y Pruebas de Sistema | 2 | | | | | ██ |
| | Redacción de Memoria y Documentación | 2 | | | | | ██ |

La fase crítica de desarrollo del motor (Mes 2-3) consumió el 30% del tiempo total debido a la complejidad de validar las ecuaciones físicas frente a datos reales.

## 6.3. Recursos empleados

La ejecución técnica del proyecto ha requerido un conjunto de recursos hardware y software, seleccionados maximizando el uso de tecnologías de código abierto (*Open Source*) para reducir costes de licencias.

### Recursos Hardware
*   **Estación de Trabajo:** Apple MacBook Pro (Chip M-Series) utilizado para desarrollo, compilación y ejecución de contenedores Docker.
*   **Periféricos:** Monitor externo 27" para visualización de código y *dashboards* simultáneos.

### Recursos Software y Licencias

| Recurso / Software | Versión | Tipo de Licencia | Coste (€) | Uso |
| :--- | :--- | :--- | :--- | :--- |
| **Visual Studio Code** | Latest | Open Source (MIT) | 0 € | IDE de desarrollo principal. |
| **Docker Desktop** | 4.x | Personal/Educativa | 0 € | Virtualización de servicios. |
| **Python** | 3.9 | PSF License | 0 € | Lenguaje motor de simulación. |
| **Node.js** | 18.x | MIT | 0 € | Lenguaje servidor backend. |
| **PostgreSQL** | 15.x | PostgreSQL License | 0 € | Base de Datos relacional. |
| **Git / GitHub** | Latest | Free Tier | 0 € | Control de versiones y hosting. |
| **React / Tailwind** | Latest | MIT | 0 € | Librerías de interfaz de usuario. |
| **Lucide Icons** | Latest | ISC | 0 € | Iconografía vectorial. |

El uso exclusivo de software libre ha permitido mantener el coste directo de licencias en **0 €**, asegurando la viabilidad académica y la reproducibilidad del proyecto por terceros sin barreras económicas.

## 6.4. Valoración económica

Aunque el proyecto tiene una naturaleza académica, se ha realizado una valoración económica estimando los costes que habría supuesto su desarrollo en un entorno profesional de ingeniería (*Coste de Ingeniería*), así como el valor del producto final.

### Costes de Desarrollo (CAPEX)

El coste principal reside en las horas de ingeniería invertidas. Se estima una dedicación de **600 horas** (aprox. 30h/semana durante 20 semanas), valoradas al precio de mercado de un Ingeniero Junior.

| Concepto | Cantidad | Coste Unitario | Total (€) |
| :--- | :--- | :--- | :--- |
| **Ingeniería de Software (Desarrollo Web)** | 300 horas | 25 €/h | 7.500 € |
| **Ingeniería de Energía (Modelado/Validación)** | 200 horas | 30 €/h | 6.000 € |
| **Gestión y Documentación** | 100 horas | 25 €/h | 2.500 € |
| **Amortización Hardware (5 meses)** | 1 equipo | 50 €/mes | 250 € |
| **Total Coste de Desarrollo** | | | **16.250 €** |

### Análisis de Viabilidad y Beneficios

La plataforma desarrollada compite en funcionalidad con software comercial que tiene costes de licencia elevados (ej. PVsyst ~600€/año, PVSOL).

*   **Ahorro Generado:** Suponiendo un uso para 10 anteproyectos al año, el uso de esta herramienta propia frente a la subcontratación o compra de licencias múltiples supone un ahorro operativo estimado de **3.000 - 5.000 € anuales**.
*   **Viabilidad Técnica:** El producto es viable ya que opera con costes variables cercanos a cero (solo coste eléctrico del servidor) una vez desarrollado.
*   **Escalabilidad:** Al estar basado en contenedores Docker, el coste de despliegue en la nube (AWS/Azure) sería bajo (aprox. **20-30 €/mes**) para dar servicio a múltiples usuarios.

**Conclusión:** El proyecto presenta una **alta rentabilidad teórica**. Con una inversión inicial de ingeniería (virtual) de 16.250 €, se ha generado un activo tecnológico que, comercializado como SaaS (*Software as a Service*) o para uso interno en consultora, amortizaría su desarrollo en menos de 2 años operando a bajo nivel.
