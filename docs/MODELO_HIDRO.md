# Documentación Técnica: Modelo de Simulación Hidroeléctrica 💧

Este documento describe la formulación hidráulica, el cálculo de pérdidas de carga y la lógica de caudal ecológico implementada en el módulo de energía hidroeléctrica del `Physics Engine`.

Ubicación del código: `physics_engine/models/hydro.py`.

---

## 🏗 Arquitectura del Cálculo Hidráulico

El modelo hidroeléctrico es una simulación de "fluyente" (Run-of-River) que depende de la precipitación horaria transformada en caudal de río.

### Principio Física Fundamental
La potencia hidráulica teórica ($P$) viene dada por:

$$ P = \rho \cdot g \cdot Q \cdot H \cdot \eta $$

Donde:
*   $\rho$: Densidad del agua (1000 kg/m³).
*   $g$: Gravedad (9.81 m/s²).
*   $Q$: Caudal turbinado (m³/s).
*   $H$: Altura de salto neta (m) -> *Aquí está la complejidad*.
*   $\eta$: Eficiencia global (Turbina + Generador).

---

## 1. Hidrología: De la Lluvia al Río

Dado que no tenemos aforos (mediciones de río) para cada coordenada del mundo, estimamos el caudal mediante un **Modelo Lluvia-Escorrentía** simplificado.

$$ Q(t) = \frac{P_{rolling}(t) \cdot A_{cuenca} \cdot C_{escorrentía}}{3600} $$

*   $P_{rolling}$: Precipitación horaria suavizada con una media móvil (Moving Average) de 120 horas (5 días). Esto simula la "inercia" de la cuenca: cuando llueve, el río no crece instantáneamente, tarda días en drenar la tierra.
*   $A_{cuenca}$: Área de captación (Catchment Area) en m².
*   $C_{escorrentía}$: Coeficiente de escorrentía (0.0 - 1.0). Indica cuánta agua resbala hacia el río y cuánta absorbe el suelo.

> **Modo Diseño:** Si el usuario especifica un `Caudal de Diseño` conocido (ej. "Este río lleva 5 m³/s"), el modelo ajusta la magnitud de la curva de lluvia para que coincida con ese caudal, manteniendo la estacionalidad climática realista (más agua en invierno/primavera).

---

## 2. Ingeniería de Fluidos: Pérdidas de Carga

Uno de los puntos más avanzados de este simulador es el cálculo dinámico de la **Altura Neta**.
Muchos simuladores usan la altura bruta ($H_{gross}$), pero en la realidad, el rozamiento del agua en la tubería "roba" presión.

### Cálculo de Pérdida por Fricción (Fórmula de Manning)
El sistema calcula la pérdida de altura ($h_{loss}$) hora a hora basándose en el caudal instantáneo:

$$ h_{loss} = L \cdot S $$
$$ S = \frac{(V \cdot n)^2}{R^{4/3}} $$

*   $L$: Longitud de la tubería forzada (Penstock).
*   $S$: Pendiente de la línea de energía.
*   $n$: Coeficiente de rugosidad de Manning (0.013 para acero).
*   $R$: Radio hidráulico ($D/4$ en tubo circular).
*   $V$: Velocidad del fluido ($Q / Área$).

**Optimización Automática:** Si el simulador detecta que la velocidad del agua supera los **3.0 m/s** (límite técnico recomendado), asume que un ingeniero real redimensionaría la tubería y aumenta virtualmente el diámetro en la simulación para evitar pérdidas catastróficas.

---

## 3. Restricciones Ambientales y Técnicas

### Caudal Ecológico
Por ley, no se puede secar el río. Se debe dejar pasar un mínimo para la fauna.
$$ Q_{turbinable} = \max(Q_{río} - Q_{ecológico}, \ 0) $$

### Límite de Turbina
La turbina tiene un tamaño máximo ($Q_{diseño}$). Si viene una riada, el exceso de agua se vierte por el aliviadero y no genera energía extra.
$$ Q_{final} = \min(Q_{turbinable}, \ Q_{diseño}) $$

---

## 4. Trazabilidad de Petición

Ejemplo: Central Mini-hidráulica de 500 kW.

1.  **Entrada:** Caudal diseño 2 m³/s, Salto 30m, Tubería 100m.
2.  **Physics Router:** Descarga lluvias de los últimos 3 años.
3.  **Hydro Model:**
    *   Convierte lluvia en caudal base del río.
    *   Resta caudal ecológico (ej. 0.2 m³/s).
    *   Calcula pérdidas de carga: Quizás con caudal máximo, la tubería pierde 2 metros de presión. $H_{neto} = 30 - 2 = 28m$. Con caudal medio solo pierde 0.5m.
    *   Potencia = $9.81 \times 1000 \times Q_{inst} \times H_{neto} \times 0.90$.
4.  **Salida:** Serie horaria realista que refleja sequías (veranos) y crecidas operativas.

---

## Parámetros por Defecto (`HydroModel`)

| Variable | Valor | Significado Técnico |
| :--- | :--- | :--- |
| `runoff_coef` | 0.5 | Terreno mixto (mitad absorbe, mitad escurre). |
| `efficiency` | 90% | Eficiencia turbina Francis/Pelton moderna. |
| `mannings_n` | 0.013 | Tubería de acero soldado nueva. |
| `catchment_A` | 10 km² | Cuenca pequeña típica de alta montaña. |

---

*Este documento describe la implementación específica en `hydro.py`, con foco en el cálculo de altura neta variable.*
