# 🎯 GUÍA RÁPIDA - Gráficas del TFG

## ✅ TODO LISTO PARA USAR

Ya tienes **6 gráficas profesionales** generadas y listas para incluir en tu TFG.

---

## 📊 FIGURAS DISPONIBLES

### **Capítulo 7.1 - Validación de Modelos Físicos**

```
📁 docs/figura_7_1_validacion_solar.png (267 KB)
   → Validación Solar: Comparación con PVGIS
   → R² = 0.9999, Diferencia -2.09%
   → 2 gráficos: Barras mensuales + Scatter plot

📁 docs/figura_7_2_curva_potencia.png (221 KB)
   → Curva de Potencia Eólica (2 MW)
   → 4 regiones de operación marcadas
   → Cut-in: 3 m/s, Rated: 12 m/s, Cut-out: 25 m/s

📁 docs/figura_7_3_distribucion_weibull.png (269 KB)
   → Distribución de Viento - Zaragoza
   → Histograma + Ajuste Weibull (k=2.0, c=6.5)
   → Frecuencias por rangos de velocidad

📁 docs/figura_7_4_biomasa_carga_base.png (290 KB)
   → Generación de Biomasa Constante (500 kW)
   → Validación de consumo: 142 kg/h
   → Gráfica de potencia + consumo acumulado

📁 docs/figura_7_5_hidraulica_caudal.png (290 KB)
   → Potencia vs Caudal (Mini-Hidro)
   → Variación estacional + Caudal ecológico
   → 2 gráficos: Evolución mensual + Relación P-Q

📁 docs/figura_7_6_rendimiento_backend.png (281 KB)
   → Tiempos de Respuesta del Backend
   → Promedio: 180-220 ms (Excelente)
   → Desglose por etapas del proceso
```

---

## 📝 CÓMO USAR EN TU TFG

### **Opción 1: LaTeX** (Recomendado)

```latex
\begin{figure}[H]
    \centering
    \includegraphics[width=0.9\textwidth]{docs/figura_7_1_validacion_solar.png}
    \caption{Gráfica comparativa entre la producción simulada y los datos históricos reales de PVGIS-SARAH2.}
    \label{fig:validacion_solar}
\end{figure}
```

### **Opción 2: Word**

1. **Insertar** → **Imágenes** → Seleccionar archivo
2. Ajustar tamaño: 90% del ancho de página
3. **Añadir título**: Referencias → Insertar título
4. Formato: "Figura 7.1: Gráfica comparativa..."

### **Opción 3: Markdown**

```markdown
![Validación Solar](docs/figura_7_1_validacion_solar.png)
*Figura 7.1: Gráfica comparativa entre la producción simulada y los datos históricos reales.*
```

---

## 📖 DOCUMENTACIÓN COMPLETA

```
📁 docs/RESUMEN_VALIDACION_TFG.md
   → Capítulo 7 completo con todas las figuras
   → Tablas de resultados incluidas
   → Listo para copiar/pegar a tu documento

📁 docs/GRAFICAS_VALIDACION_README.md
   → Explicación detallada de cada figura
   → Interpretación de resultados
   → Parámetros técnicos y fórmulas
```

---

## 🔄 REGENERAR GRÁFICAS

Si necesitas cambiar algo (colores, tamaños, datos):

```bash
# Editar el script
nano scripts/generar_graficas_validacion.py

# Regenerar todas las figuras
python3 scripts/generar_graficas_validacion.py
```

**Tiempo de generación**: ~5 segundos

---

## 📊 CALIDAD DE LAS IMÁGENES

- ✅ Resolución: **300 DPI** (calidad publicación)
- ✅ Formato: **PNG** (compatible con todo)
- ✅ Tamaño: **221-290 KB** (optimizado)
- ✅ Estilo: **Profesional** (colores consistentes)
- ✅ Textos: **Legibles** (fuentes grandes, negrita)

---

## 🎯 RESULTADOS DE VALIDACIÓN

### Todos los criterios CUMPLIDOS ✅

| Modelo | Criterio | Resultado | Estado |
|--------|----------|-----------|---------|
| Solar | R² > 0.94 | **0.9999** | ✅ |
| Solar | Error < 5% | **-2.09%** | ✅ |
| Eólica | Curva física | **4 regiones** | ✅ |
| Eólica | Weibull k=1.5-2.5 | **k=2.0** | ✅ |
| Biomasa | Eficiencia 80-90% | **85%** | ✅ |
| Hidráulica | Caudal ecológico | **0.5 m³/s** | ✅ |
| Backend | Tiempo < 500ms | **220 ms** | ✅ |

---

## 💡 TIPS PARA EL TFG

### **Para impresión en papel**:
- Las figuras están en alta resolución (300 DPI)
- Se ven perfectas en impresión B&N o color
- Tamaño recomendado: 90% del ancho de página

### **Para presentación oral**:
- Usa las figuras 7.2, 7.3 y 7.6 (más visuales)
- Amplía al 100% en diapositivas
- Resalta los valores clave (R²=0.9999, 220ms)

### **Para la memoria escrita**:
- Incluye TODAS las 6 figuras
- Añade las tablas de resultados (en RESUMEN_VALIDACION_TFG.md)
- Referencia cada figura en el texto

---

## 🚀 PRÓXIMOS PASOS

1. ✅ Gráficas generadas ← **YA HECHO**
2. ✅ Documentación creada ← **YA HECHO**
3. 📋 Copiar figuras a tu documento TFG
4. 📋 Añadir referencias en el texto
5. 📋 Revisar que todas las figuras se vean bien
6. 🎓 ¡Entregar el TFG!

---

## 📞 NECESITAS AYUDA?

**Regenerar todas las gráficas**:
```bash
python3 scripts/generar_graficas_validacion.py
```

**Ver documentación completa**:
```bash
cat docs/GRAFICAS_VALIDACION_README.md
cat docs/RESUMEN_VALIDACION_TFG.md
```

**Listar todas las figuras**:
```bash
ls -lh docs/figura_*.png
```

---

## ✨ RESUMEN FINAL

- 📊 **6 figuras** profesionales (300 DPI)
- 📄 **2 documentos** de referencia completos
- 🐍 **1 script** Python para regenerar todo
- ⚡ **5 segundos** para generar todas las gráficas
- ✅ **100% validado** (todos los criterios cumplidos)

**Total**: 1.6 MB de material de alta calidad para tu TFG

---

*Última actualización: 24 de enero de 2026*
*Script ubicado en: `scripts/generar_graficas_validacion.py`*
