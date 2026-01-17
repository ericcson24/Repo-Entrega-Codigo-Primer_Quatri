# Informe Técnico: Modelo de Simulación de Biomasa y Termodinámica

## 1. Introducción y Ciclo Termodinámico
Este documento detalla el motor de simulación para plantas de valorización energética de biomasa. A diferencia de las fuentes intermitentes (Solar/Eólica), la biomasa es gestionable (dispatchable). El modelo simula un **Ciclo Rankine de Vapor** clásico, centrándose en la termoquímica del combustible y la eficiencia térmica del ciclo.

## 2. Fundamentos Físicos (Physics-Based Model)

### 2.1. Caracterización del Combustible (LHV y Humedad)
La energía disponible depende críticamente de la calidad de la biomasa. El modelo utiliza el **Poder Calorífico Inferior (LHV - Lower Heating Value)** ajustado por humedad.

El LHV húmedo ($LHV_w$) se calcula a partir del LHV seco ($LHV_{dry}$) y el contenido de humedad ($w$, fracción en base húmeda):

$$ LHV_w = LHV_{dry} \cdot (1 - w) - \Delta h_{vap} \cdot w $$

Donde:
*   $\Delta h_{vap} \approx 2.44 \, MJ/kg$: Entalpía de vaporización del agua a 25°C.
*   *Impacto Físico:* El agua en la biomasa no solo no aporta energía, sino que roba calor latente para evaporarse en la caldera, reduciendo drásticamente la temperatura de llama y la eficiencia.

### 2.2. Conversión Térmica y Eficiencia de Caldera
La potencia térmica liberada en la combustión es:

$$ P_{termica} = \dot{m}_{fuel} \cdot LHV_w \cdot \eta_{boiler} $$

La eficiencia de la caldera ($\eta_{boiler}$) no es constante; se modela como función de la carga y la humedad. Una biomasa muy húmeda (>50%) puede hacer colapsar la combustión.

### 2.3. Ciclo de Potencia (Rankine Efficiency)
Para convertir calor en electricidad, modelamos la eficiencia global del ciclo ($ \eta_{cycle} $), que agrupa:
1.  **Rendimiento Isentrópico de la Turbina:** Expansión del vapor.
2.  **Eficiencia del Generador:** Pérdidas electromecánicas.
3.  **Consumos Auxiliares:** Bombas de alimentación, ventiladores de tiro, sistemas de alimentación de combustible (aprox. 10-15% de la producción bruta).

$$ P_{net} = P_{termica} \cdot \eta_{cycle} - P_{aux} $$

### 2.4. Gestión de Stock y Disponibilidad
El modelo incluye un sistema de inventario simplificado:
*   **Stockpile:** Acopio de biomasa ($toneladas$).
*   **Consumo:** $\dot{m}_{fuel} = P_{target} / (LHV_w \cdot \eta_{total})$.
*   **Restricción:** Si $Stock(t) <= 0$, la planta se apaga forzosamente ($P=0$).

## 3. Implementación Computacional

### 3.1. Estrategia de Despacho (Dispatch Strategy)
A diferencia de Solar/Eólica que producen "lo que hay", Biomasa produce "lo que se pide". El simulador admite modos de operación:
1.  **Carga Base (Baseload):** Operación constante al 100% (o máximo técnico) 24/7. Ideal para rentabilizar la inversión.
2.  **Seguimiento de Demanda (Peaking):** (Futuro) Operar solo cuando los precios eléctricos superan el coste variable de combustible.

### 3.2. Simulación Horaria
Para cada hora del año:
1.  Se verifica disponibilidad de fuel.
2.  Se calcula el LHV efectivo según la humedad estacional (la biomasa almacenada en invierno puede tener más humedad).
3.  Se computa la producción eléctrica y el consumo de combustible.
4.  Se actualiza el estado del inventario.

Esto permite visualizar no solo la producción eléctrica, sino la logística de combustible necesaria (camiones/año) para mantener la planta operativa.
