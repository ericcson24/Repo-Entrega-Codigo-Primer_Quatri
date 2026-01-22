# 5. Metodología

El presente capítulo describe en profundidad el marco metodológico, los procedimientos y las herramientas empleadas para la conceptualización, diseño, desarrollo y validación de la plataforma de simulación energética integral. Dada la naturaleza multidisciplinar del Trabajo de Fin de Grado, que abarca desde la formulación de modelos físicos termodinámicos hasta el despliegue de una arquitectura web basada en microservicios, se ha optado por un **enfoque metodológico híbrido**.

Este enfoque fusiona el **Método Científico**, necesario para garantizar el rigor y la trazabilidad de los cálculos energéticos, con el marco de trabajo ágil **Scrum**, estándar en la industria del software para gestionar la complejidad y la adaptabilidad del producto final.

## 5.1. Justificación del Enfoque Metodológico Mixto

La elección de la metodología no es arbitraria, sino que responde a la necesidad de gestionar dos ciclos de vida con dinámicas opuestas que coexisten en el proyecto:

1.  **Ciclo de Investigación (Modelo Físico):** Requiere un proceso lineal y predictivo: *Hipótesis $\rightarrow$ Formulación Matemática $\rightarrow$ Implementación $\rightarrow$ Validación*. Aquí, la incertidumbre debe ser minimizada antes de avanzar. Un error en una ecuación de radiación solar invalida todo el desarrollo posterior.
2.  **Ciclo de Desarrollo de Producto (Software):** Requiere un proceso iterativo y empírico. La interfaz de usuario, la API y la visualización de datos de la plataforma se benefician de ciclos rápidos de "prueba y error" para mejorar la experiencia del usuario (UX) y la eficiencia del código.

Por tanto, se descartó el modelo clásico en cascada (*Waterfall*) puro, ya que su rigidez habría impedido adaptar la aplicación a los descubrimientos realizados durante el análisis de datos. En su lugar, se implementó una variante de **Scrum para proyectos unipersonales**, complementada con prácticas de **DevOps** para la integración continua.

## 5.2. Marco de Trabajo Ágil: Scrum Adaptado

La gestión del proyecto se ha regido por los ciclos iterativos e incrementales de Scrum. A continuación, se detallan los componentes específicos de su implementación.

### 5.2.1. Adaptación a Desarrollo Individual
Al tratarse de un proyecto individual, el marco Scrum se ha simplificado para eliminar la sobrecarga de gestión orientada a equipos, centrando el método en la **autogestión** y la **disciplina personal**. No se han simulado roles artificiales; en su lugar, el autor ha asumido la totalidad de las responsabilidades del ciclo de vida del software de manera integral:

*   **Priorización y Alcance:** Definición de objetivos académicos y selección de funcionalidades críticas para el TFG.
*   **Ejecución Técnica:** Desarrollo *Full Stack*, abarcando desde el diseño de base de datos hasta la interfaz de usuario.
*   **Control de Calidad:** Auto-revisión del código y validación funcional de los entregables.

Esta unificación de la toma de decisiones permite una ejecución técnica mucho más ágil, eliminando los tiempos de latencia en la comunicación habituales en equipos, pero exige un alto rigor en el cumplimiento de la planificación y en la autoevaluación de los resultados.

### 5.2.2. Planificación Temporal e Iteraciones
El desarrollo se ha estructurado en bloques de trabajo de duración fija (**Sprints**) de dos semanas (10 días laborables). Esta compartimentación temporal ha sido clave para mantener un ritmo de avance constante y evitar la "parálisis por análisis" frecuente en proyectos de larga duración.

El ciclo de trabajo se organizó mediante los siguientes hitos de control:

1.  **Planificación Quincenal (Sprint Planning):** Al inicio de cada ciclo, se seleccionaron del listado de pendientes (*Backlog*) las tareas realistas a completar en las dos semanas siguientes.
2.  **Seguimiento Diario:** Al inicio de cada jornada, se realizó una breve revisión de objetivos para focalizar el esfuerzo y replanificar tareas en caso de bloqueos técnicos inesperados.
3.  **Revisión Final (Sprint Review):** Al final del ciclo, se verificó el funcionamiento de los nuevos módulos desarrollados, asegurando que cada incremento de código aportara funcionalidad tangible.
4.  **Mejora Continua (Retrospectiva):** Análisis personal de qué herramientas o enfoques funcionaron mejor para optimizar el flujo de trabajo en el siguiente periodo.

En la **Figura 5.1** se representa gráficamente este flujo de trabajo iterativo.

*[Insertar Figura 5.1 aquí: Esquema del ciclo de vida del Sprint: Selección de Tareas -> Desarrollo (2 semanas) -> Validación -> Entrega de incremento]*

### 5.2.3. Definición de Hecho (Definition of Done - DoD)
Para garantizar la calidad académica y técnica, ninguna tarea se consideró "Finalizada" hasta cumplir con los siguientes criterios estrictos:
*   El código fuente está comentado y sigue los estándares de estilo (PEP8 para Python, ESLint para JavaScript).
*   Las pruebas unitarias del módulo pasan satisfactoriamente.
*   La funcionalidad ha sido desplegada y probada en el contenedor Docker.
*   Se ha actualizado la documentación técnica correspondiente en la carpeta `/docs`.

## 5.3. Metodología de Desarrollo de Software e Ingeniería

Para la construcción del sistema, se aplicaron prácticas modernas de Ingeniería del Software orientadas a la mantenibilidad y escalabilidad.

### 5.3.1. Estrategia de Control de Versiones (Git Flow)
Se utilizó **Git** como sistema de control de versiones distribuido, siguiendo el modelo de ramificación **Git Flow** para organizar el trabajo:
*   **Rama `main`:** Contiene exclusivamente el código de producción estable y versionado.
*   **Rama `develop`:** Eje central de integración donde convergen las nuevas funcionalidades.
*   **Ramas `feature/*`:** Ramas efímeras para desarrollar características aisladas (ej. `feature/wind-turbine-model`), evitando inestabilidad en la rama principal.

### 5.3.2. Estándares de Calidad y Codificación
Se establecieron guías de estilo estrictas para asegurar la homogeneidad del código:
*   **Backend (Node.js):** Uso de arquitectura MVC (Modelo-Vista-Controlador) y principios SOLID.
*   **Motor IA (Python):** Tipado estático mediante `Type Hints` para reducir errores en tiempo de ejecución y uso de entornos virtuales (`venv`) para el aislamiento de dependencias.

## 5.4. Metodología de Investigación y Validación de Modelos (Data Science)

El núcleo de valor del TFG reside en la precisión de sus simulaciones. Para ello, se aplicó una metodología específica de Ciencia de Datos (*Data Science*) dividida en cuatro etapas, tal como se muestra en la **Figura 5.2**.

*[Insertar Figura 5.2 aquí: Diagrama de flujo de datos: Adquisición -> Preprocesamiento (ETL) -> Modelado -> Validación]*

### 5.4.1. Adquisición y Preprocesamiento de Datos (ETL)
Se desarrollaron procesos ETL (*Extract, Transform, Load*) para normalizar los datos de entrada provenientes de fuentes heterogéneas:
*   **Extracción:** Conexión con APIs externas (AEMET, PVGIS, OMIE) y lectura de ficheros estáticos (JSON de catálogos).
*   **Transformación:** Limpieza de *outliers* (valores atípicos), imputación de valores nulos mediante interpolación lineal y remuestreo temporal a resolución horaria.
*   **Carga:** Almacenamiento estructurado en PostgreSQL para su consulta eficiente.

### 5.4.2. Formulación Matemática
La selección de modelos se basó en una revisión exhaustiva del estado del arte. Cada algoritmo implementado se fundamenta en literatura científica validada. Por ejemplo, para la estimación de potencia eólica, se utilizó la ecuación de potencia mecánica corregida por la densidad del aire:

$$ P_{real} = \frac{1}{2} \cdot \rho(h) \cdot A \cdot v(h)^3 \cdot C_p(\lambda, \beta) \cdot \eta_{mec} \cdot \eta_{elec} $$  *(Ecuación 5.1)*

Donde:
*   $\rho(h)$: Densidad del aire a la altura del buje [kg/m³].
*   $v(h)$: Velocidad del viento extrapolada [m/s].
*   $C_p$: Coeficiente de potencia (adimensional).
*   $\eta$: Rendimientos mecánicos y eléctricos.

### 5.4.3. Métricas de Validación y Evaluación
Para cuantificar la precisión de los modelos, se compararon los resultados simulados frente a conjuntos de datos de control (Ground Truth) o herramientas de referencia estandarizadas. Se emplearon tres métricas estadísticas fundamentales, detalladas a continuación:

1.  **Raíz del Error Cuadrático Medio (RMSE):** Penaliza los grandes errores.
    $$ RMSE = \sqrt{\frac{1}{n}\sum_{t=1}^{n}(y_t - \hat{y}_t)^2} $$ *(Ecuación 5.2)*
2.  **Error Absoluto Medio (MAE):** Proporciona una magnitud promedio del error en las unidades de la variable.
    $$ MAE = \frac{1}{n}\sum_{t=1}^{n}|y_t - \hat{y}_t| $$ *(Ecuación 5.3)*
3.  **Coeficiente de Determinación ($R^2$):** Indica la bondad del ajuste del modelo.

En la **Tabla 5.1** se presenta un resumen de los umbrales de aceptación definidos para validar cada modelo tecnológico antes de su integración final.

**Tabla 5.1.** Umbrales de validación y métricas objetivo por tecnología.

| Tecnología | Variable Crítica | RMSE Máx. Aceptable | MAE Objetivo | $R^2$ Min. |
| :--- | :--- | :--- | :--- | :--- |
| **Fotovoltaica** | Generación Horaria (kWh) | 15% Capacidad Nom. | < 5% | > 0.90 |
| **Eólica** | Potencia Salida (kW) | 20% Capacidad Nom. | < 8% | > 0.85 |
| **Mercado** | Precio (€/MWh) | N/A (Escenario) | N/A | N/A |

Si un modelo no superaba estos umbrales ($R^2 < 0.85$), se procedía a recalibrar los parámetros internos (ej. coeficientes de pérdidas) y a repetir la iteración de validación.

## 5.5. Arquitectura del Sistema y Tecnologías

La arquitectura tecnológica se diseñó bajo el patrón de microservicios contenerizados, garantizando la independencia de fallos y la escalabilidad horizontal.

**Tabla 5.2.** Resumen del Stack Tecnológico e Instrumentos.

| Capa | Tecnología / Herramienta | Justificación Metodológica |
| :--- | :--- | :--- |
| **Frontend** | React.js, TailwindCSS | Desarrollo modular basado en componentes reutilizables. Facilita la creación de *dashboards* interactivos. |
| **Backend** | Node.js (Express) | Gestión asíncrona de alto rendimiento (Non-blocking I/O) ideal para orquestar simulaciones concurrentes. |
| **Data Science** | Python, Pandas, NumPy, Scikit-learn | Estándar "de facto" en computación científica. Librerías optimizadas para álgebra lineal y series temporales. |
| **Base de Datos** | PostgreSQL | Robustez transaccional (ACID) y soporte avanzado para consultas analíticas complejas. |
| **Infraestructura** | Docker, Docker Compose | Reproducibilidad del entorno de ejecución. Elimina discrepancias entre desarrollo y producción. |
| **API Testing** | Postman | Validación manual y automatizada de *endpoints* RESTful. |

## 5.6. Cronograma y Fases del Proyecto

El desarrollo se ejecutó a lo largo de cinco meses, estructurados en cuatro fases principales solapadas parcialmente en el tiempo:

*   **Fase I: Análisis e Investigación (Sprints 1-2):** Definición del estado del arte, selección de ecuaciones físicas y diseño de la arquitectura de datos.
*   **Fase II: Desarrollo del Núcleo de Cálculo "AI Engine" (Sprints 3-5):** Implementación de los algoritmos de simulación en Python (Solar, Eólica, Biomasa) y validación unitaria.
*   **Fase III: Desarrollo de Infraestructura Web (Sprints 6-8):** Construcción de la API REST, autenticación JWT, base de datos y desarrollo del Frontend en React.
*   **Fase IV: Integración, Validación y Documentación (Sprints 9-10):** Conexión de todos los módulos, pruebas de integración sistema-a-sistema, refinamiento visual y redacción de la memoria.

Esta planificación estructurada, apoyada en herramientas de gestión de versiones y metodologías ágiles, ha permitido cumplir con los objetivos académicos y técnicos del proyecto en el tiempo establecido.
