# 8. Conclusiones y Líneas Futuras

Este capítulo final sintetiza los logros alcanzados durante el desarrollo del Trabajo de Fin de Grado, ofreciendo una visión global de la madurez del proyecto. Se evalúa el grado de cumplimiento de los objetivos iniciales, se reflexiona críticamente sobre las limitaciones encontradas y se proponen vías de continuación para futuras iteraciones del software.

---

## 8.1. Conclusiones Generales

La realización de este proyecto ha permitido transformar una idea teórica en una **plataforma de software completamente funcional**, validando la hipótesis de que es posible democratizar el acceso a simulaciones energéticas complejas mediante tecnologías web modernas.

Las principales conclusiones extraídas del trabajo son:

1.  **Viabilidad del Stack Tecnológico Híbrido:** La arquitectura planteada, que combina la potencia de cálculo científico de **Python** en el backend con la reactividad de **React.js** en el frontend, ha demostrado ser robusta. La contenerización con **Docker** ha sido la pieza clave que ha permitido que estos dos ecosistemas convivan sin fricción en entorno de producción.
2.  **Precisión Suficiente para Toma de Decisiones:** Si bien los modelos físicos implementados implican ciertas simplificaciones, la validación contra fuentes satelitales (PVGIS) y distribuciones teóricas (Weibull) confirma que la herramienta ofrece una precisión adecuada para estudios de pre-factibilidad técnico-económica.
3.  **Valor Educativo y Profesional:** La plataforma no solo sirve como calculadora, sino que tiene un fuerte componente didáctico. Al exponer de forma transparente curvas de carga, flujos de caja y variables físicas, permite a usuarios no expertos comprender la dinámica de las energías renovables.
4.  **Escalabilidad:** El diseño modular (microservicios) permite agregar nuevas tecnologías de generación (como Hidrógeno verde o Geotermia) sin necesidad de reescribir el núcleo de la aplicación, garantizando una larga vida útil al código.

---

## 8.2. Grado de Cumplimiento de los Objetivos

A continuación, se presenta un análisis comparativo entre los objetivos planteados al inicio del TFG y los resultados obtenidos.

| Objetivo Inicial | Grado de Cumplimiento | Descripción del Logro |
| :--- | :---: | :--- |
| **1. Desarrollar motor de cálculo físico** | **100%** | Se ha implementado el módulo `ai_engine` con soporte para Solar, Eólica, Hidráulica, Biomasa y Baterías. |
| **2. Crear interfaz web interactiva** | **100%** | Se ha desarrollado un Dashboard en React v18 con visualización de datos en tiempo real (Recharts). |
| **3. Implementar análisis financiero** | **100%** | El sistema calcula VAN, TIR, Payback y LCOE con proyección a 20 años e inflación ajustable. |
| **4. Despliegue en la nube** | **90%** | El Frontend está desplegado en Firebase. El Backend está dockerizado y listo para deploy (probado en local), pendiente de servidor VPS final. |
| **5. Optimización de rendimiento** | **100%** | Tiempos de respuesta < 200ms gracias a vectorización con NumPy/Pandas. |

**Conclusión del cumplimiento:** El proyecto ha satisfecho la totalidad de los requisitos funcionales críticos y la mayoría de los deseables, superando las expectativas en cuanto a calidad de la interfaz de usuario.

---

## 8.3. Reflexión Crítica

Si bien el resultado es satisfactorio, un análisis honesto del trabajo revela áreas de fortaleza y debilidad.

### 8.3.1. Fortalezas (Puntos Fuertes)
*   **Independencia Tecnológica:** Al ser software propio y Open Source, no depende de licencias costosas de terceros (como PVSyst o Homer Energy).
*   **Experiencia de Usuario (UX):** Se ha priorizado la usabilidad, logrando que una simulación compleja se configure en menos de 1 minuto, algo poco común en software de ingeniería.
*   **Calidad del Código:** El uso de tipado estático parcial, linters y estructura de carpetas estándar facilita la mantenibilidad.

### 8.3.2. Debilidades y Limitaciones (Puntos de Mejora)
*   **Resolución Temporal:** El modelo trabaja con datos horarios (paso de 1h). Esto impide ver picos de potencia de segundos que podrían afectar a la electrónica de potencia o al ciclado rápido de baterías.
*   **Modelo de Baterías Simplificado:** El modelo de almacenamiento asume una eficiencia constante y no considera la degradación química de la batería por temperatura o profundidad de descarga (DoD) a lo largo de los años.
*   **Datos Meteorológicos Estáticos:** Se utilizan Años Meteorológicos Típicos (TMY). No se ha integrado una API de predicción meteorológica en tiempo real para usar la herramienta como gestor de planta en vivo.

---

## 8.4. Líneas de Trabajo Futuro

El presente Trabajo de Fin de Grado sienta las bases de una plataforma robusta, pero el horizonte de desarrollo es vasto. Para transformar *EcoSim* de una herramienta académica a un producto comercial competitivo o un estándar de investigación, se proponen las siguientes líneas de evolución, clasificadas por áreas de impacto:

### 8.4.1. Evolución del Motor de Cálculo (AI & Física)
1.  **Integración de Aprendizaje Profundo (Deep Learning):**
    *   Sustitución de modelos estadísticos por redes neuronales recurrentes (LSTM o Transformers) para la predicción de generación a corto plazo (*Nowcasting*).
    *   Entrenamiento de modelos de detección de anomalías para mantenimiento predictivo: el sistema alertaría si la producción real cae por debajo de la simulada, sugiriendo suciedad en paneles o averías en inversores.
2.  **Gemelos Digitales (Digital Twin):**
    *   Evolucionar la simulación hacia un "Gemelo Digital" que se conecte vía IoT a los inversores reales, permitiendo monitorizar en tiempo real y comparar *lo planeado vs lo real*.
3.  **Nuevas Tecnologías de Generación:**
    *   **Hidrógeno Verde:** Módulo de electrolizadores y pilas de combustible para simulaciones de almacenamiento estacional a largo plazo.
    *   **Geotermia y Aerotermia:** Integración de climatización eléctrica para cerrar el ciclo de consumo en residencial.
    *   **Infraestructura de Recarga V2G:** Simulación de carga de vehículos eléctricos bidireccional (Vehicle-to-Grid), usando el coche como batería del hogar.

### 8.4.2. Algoritmos de Optimización y Mercado
4.  **Optimizador de Dimensionamiento (Algoritmos Genéticos):**
    *   Desarrollo de un "Solver" que, en lugar de simular un escenario dado, encuentre la configuración óptima. Dado un presupuesto límite o un objetivo de emisiones, el algoritmo (ej. NSGA-II) iterará miles de combinaciones de paneles/baterías para hallar la frontera de Pareto de máxima rentabilidad.
5.  **Gestión Inteligente de la Demanda (DSM):**
    *   Simulación de estrategias de control activo: *Peak Shaving* (recorte de picos de potencia para bajar la factura fija) y *Arbitraje de Energía* (cargar batería cuando la luz es barata y vender/consumir cuando es cara).
6.  **Conexión con Mercados en Tiempo Real:**
    *   Integración vía API con ESIOS/OMIE para obtener precios del mercado eléctrico spot e intradiario en tiempo real, permitiendo simulaciones económicas dinámicas y no solo basadas en medias históricas.

### 8.4.3. Expansión Tecnológica y Experiencia de Usuario
7.  **Visualización 3D y Realidad Aumentada:**
    *   Integración de librerías de mapeo 3D (como CesiumJS o Mapbox) para permitir al usuario dibujar polígonos sobre el tejado real de su casa, calculando automáticamente el área disponible, orientación e inclinación y proyectando sombras de edificios vecinos.
8.  **Generación de Informes Profesionales:**
    *   Implementación de un motor de renderizado de PDF server-side para generar dossiers técnicos automatizados listos para presentar a clientes o bancos para financiación.
9.  **Migración a Arquitectura Serverless:**
    *   Para soportar miles de usuarios concurrentes, migrar el motor de cálculo de contenedores Docker persistentes a funciones *Serverless* (AWS Lambda o Google Cloud Functions), lo que permitiría un escalado infinito bajo demanda y reducción de costes en reposo.

### 8.4.4. Impacto Social y Nuevos Modelos de Negocio
10. **Comunidades Energéticas Locales:**
    *   Módulo para simular autoconsumo colectivo: repartir la generación de una instalación grande entre múltiples vecinos con diferentes perfiles de consumo, calculando los coeficientes de reparto óptimos (Beta).
11. **Blockchain para Trazabilidad:**
    *   Implementación de *Smart Contracts* para certificar el origen renovable de cada kWh generado y consumido, aportando transparencia total a los datos de sostenibilidad.

---

## 8.5. Cierre

En definitiva, este Trabajo de Fin de Grado ha sido un ejercicio integrador que ha aunado competencias de ingeniería energética, desarrollo de software y gestión de proyectos. El resultado final, **EcoSim**, es una herramienta viva, útil y con un potencial de crecimiento real, cumpliendo con creces el propósito académico y profesional para el que fue concebida.
