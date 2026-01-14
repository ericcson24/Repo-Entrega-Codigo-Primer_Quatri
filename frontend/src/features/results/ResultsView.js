import React, { useRef } from 'react';
import { ProductionChart, FinancialChart } from '../../shared/components/ResultsCharts';
import { KPIGrid } from '../../shared/components/KPIGrid';
import AdvancedCharts from '../charts/AdvancedCharts';
import { ArrowLeft, Download, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useTheme } from '../../contexts/ThemeContext';

const ResultsView = ({ results, type = 'solar', onBack }) => {
  const resultsRef = useRef(null);
  const { isDark } = useTheme();

  const handleExportPDF = async () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let yPos = 20;

      // --- HEADER ---
      pdf.setFontSize(22);
      pdf.setTextColor(40, 40, 40);
      pdf.text(`Informe de Rentabilidad ${type === 'solar' ? 'Solar' : 'Eólica'}`, margin, yPos);
      
      yPos += 10;
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generado el: ${new Date().toLocaleDateString()} | Simulador Renovables IA`, margin, yPos);
      
      yPos += 15;

      // --- RESUMEN EJECUTIVO (METRICS) ---
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Resumen Ejecutivo", margin, yPos);
      yPos += 8;

      const metrics = [
        ['Retorno Inversión (ROI):', `${results.summary?.roi}%`],
        ['Plazo Amortización:', `${results.summary?.payback || results.summary?.paybackYears} años`],
        ['VAN (NPV):', `${(results.summary?.npv || 0).toLocaleString()} €`],
        ['Inversión Inicial:', `${(results.summary?.totalInvestment || 0).toLocaleString()} €`],
        ['Producción Año 1:', `${Math.round(results.summary?.totalGenerationFirstYear || 0).toLocaleString()} kWh`]
      ];

      pdf.setFontSize(11);
      metrics.forEach(([label, value]) => {
        pdf.setTextColor(80, 80, 80);
        pdf.text(label, margin, yPos);
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'bold');
        pdf.text(value, margin + 50, yPos);
        pdf.setFont(undefined, 'normal');
        yPos += 7;
      });

      yPos += 10;

      // --- GRÁFICOS (Capturas Limpias) ---
      // Buscamos los contenedores de gráficos en el DOM y los capturamos
      const charts = document.querySelectorAll('.chart-card');
      if (charts.length > 0) {
          pdf.text("Proyección Financiera y Energética", margin, yPos);
          yPos += 10;
          
          for (let i = 0; i < charts.length && i < 2; i++) { // Limit to 2 main charts
              const canvas = await html2canvas(charts[i], { scale: 2, logging: false, backgroundColor: isDark ? '#1a1a1a' : '#ffffff' });
              const imgData = canvas.toDataURL('image/png');
              const imgProps = pdf.getImageProperties(imgData);
              const pdfImgWidth = pageWidth - (margin * 2);
              const pdfImgHeight = (imgProps.height * pdfImgWidth) / imgProps.width;
              
              if (yPos + pdfImgHeight > 280) { pdf.addPage(); yPos = 20; }
              
              pdf.addImage(imgData, 'PNG', margin, yPos, pdfImgWidth, pdfImgHeight);
              yPos += pdfImgHeight + 10;
          }
      }

      // --- DETALLES TÉCNICOS ---
      if (yPos > 240) { pdf.addPage(); yPos = 20; }
      
      yPos += 10;
      pdf.setFontSize(14);
      pdf.text("Especificaciones Técnicas", margin, yPos);
      yPos += 8;
      
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      const specs = [
          `Ubicación: ${results.parameters.location?.name || 'Coordenadas Personalizadas'} (${(results.parameters.location?.lat||0).toFixed(4)}, ${(results.parameters.location?.lon||0).toFixed(4)})`,
          `Capacidad: ${results.parameters.capacity} kW`,
          type === 'solar' ? `Inclinación: ${results.parameters.tilt}° | Azimut: ${results.parameters.azimuth}°` : `Altura Buje: ${results.parameters.height}m`,
          `LCOE Estimado: ${(results.financial?.metrics?.lcoe || 0).toFixed(4)} €/kWh`
      ];

      specs.forEach(spec => {
          pdf.text(`• ${spec}`, margin, yPos);
          yPos += 6;
      });

      // DISCLAIMER
      yPos = 280;
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text("Este informe es una simulación basada en modelos probabilísticos. No constituye oferta vinculante.", margin, yPos);

      pdf.save(`Informe_Rentabilidad_${type}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error PDF:", error);
      alert("Error al generar PDF. Intente nuevamente.");
    }
  };


  if (!results || !results.financial) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <ArrowLeft size={32} className="opacity-50" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Sin resultados</h3>
        <p>Realiza un cálculo en la calculadora {type === 'solar' ? 'solar' : 'eólica'} para ver el análisis.</p>
        <button 
          onClick={onBack}
          className="btn-secondary mt-4"
        >
          Volver a calculadora
        </button>
      </div>
    );
  }

  // Extract data from backend format (results: { technical, financial, summary, market })
  const financialData = results.financial?.cashFlows || [];
  const monthlyProduction = results.technical?.production?.monthlyKwh || [];
  const metrics = results.summary || {};
  
  // Format data for legacy charts if needed, or use directly
  const chartData = financialData.map(f => ({
      year: f.year,
      balance: f.cumulative, // For financial chart
      savings: (f.savings || 0) + (f.income || 0),
      costs: f.opex || f.expenses || 0, // Correctly capture expenses/capex for Year 0
      production: f.production || 0 // Include production for AdvancedCharts
  }));

  const productionData = monthlyProduction.map((val, index) => ({
      month: index + 1,
      production: val,
      consumption: (results.technical?.production?.annualKwh / 12) * 0.4 // Estimacion visual si no viene detallado
  }));


  return (
    <div className="results-view animate-fade-in" ref={resultsRef}>
      <header className="results-header">
        <button onClick={onBack} className="back-btn">
          <ArrowLeft size={20} />
          Volver
        </button>
        <div className="header-actions">
          <h2 className="text-2xl font-bold">Análisis de Rentabilidad {type === 'solar' ? 'Solar' : 'Eólica'}</h2>
          <button onClick={handleExportPDF} className="btn-icon" title="Exportar PDF">
            <Download size={20} />
          </button>
        </div>
      </header>

      {/* WARNING FOR VIRTUAL MICROSITING */}
      {results.technical?.isVirtualSite && (
        <div className="mb-6 mx-1 p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 rounded-r-lg shadow-sm">
          <div className="flex items-start gap-3">
            <div className="text-amber-500 mt-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-amber-800 dark:text-amber-200">Optimización de Ubicación Activada</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {results.technical.siteViability}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-mono bg-amber-100 dark:bg-amber-900/40 p-1 rounded inline-block">
                Viento Origen: {(results.technical.sourceWindSpeed||0).toFixed(1)} m/s → Simulado: {(results.technical.avgWindSpeedHub||0).toFixed(1)} m/s
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="kpi-section">
        <KPIGrid metrics={metrics} type={type} />
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Producción vs Consumo Mensual</h3>
          {/* Ensure ProductionChart handles empty data gracefully */}
          <ProductionChart data={productionData} />
        </div>
        
        <div className="chart-card">
          <h3>Flujo de Caja Acumulado (25 Años)</h3>
          <FinancialChart data={chartData} />
        </div>
      </div>

      <div className="advanced-analysis mt-8">
        <AdvancedCharts 
          financialData={chartData} 
          productionData={productionData}
          type={type} 
        />
      </div>

      {results.parameters && (
          <div className="technical-specs mt-8 p-6 glass-panel rounded-xl">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                  <span className="text-blue-400">⚡</span> Especificaciones Técnicas Detalladas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                      <h4 className="font-semibold text-[var(--text-secondary)] mb-2">Sistema</h4>
                      <ul className="space-y-2 text-sm text-[var(--text-primary)]">
                          <li className="flex justify-between"><span>Capacidad Instalada:</span> <span className="font-medium">{results.parameters.capacity} kWs</span></li>
                          {type === 'solar' ? (
                            <>
                              <li className="flex justify-between"><span>Inclinación:</span> <span className="font-medium">{results.parameters.tilt}°</span></li>
                              <li className="flex justify-between"><span>Azimut:</span> <span className="font-medium">{results.parameters.azimuth}°</span></li>
                              <li className="flex justify-between"><span>Eficiencia Sistema:</span> <span className="font-medium">{(results.technical?.system?.efficiency * 100).toFixed(1)}%</span></li>
                            </>
                          ) : (
                            <>
                              <li className="flex justify-between"><span>Altura Buje:</span> <span className="font-medium">{results.parameters.height} m</span></li>
                              <li className="flex justify-between"><span>Diámetro Rotor:</span> <span className="font-medium">{results.technical?.system?.rotorDiameter} m</span></li>
                              <li className="flex justify-between"><span>Factor Capacidad:</span> <span className="font-medium">{(results.technical?.production?.capacityFactor || 0).toFixed(1)}%</span></li>
                            </>
                          )}
                      </ul>
                  </div>
                  <div>
                      <h4 className="font-semibold text-[var(--text-secondary)] mb-2">{type === 'solar' ? 'Ubicación & Solar' : 'Ubicación & Viento'}</h4>
                      <ul className="space-y-2 text-sm text-[var(--text-primary)]">
                          <li className="flex justify-between">
                            <span>Latitud:</span> 
                            <span className="font-medium">{(results.parameters.location?.lat || results.parameters.lat || 0).toFixed(4)}</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Longitud:</span> 
                            <span className="font-medium">{(results.parameters.location?.lon || results.parameters.lon || 0).toFixed(4)}</span>
                          </li>
                          {type === 'solar' ? (
                              <li className="flex justify-between"><span>Irradiación Pico:</span> <span className="font-medium">{(results.technical?.production?.peakPower || 0).toFixed(2)} kWh/m²</span></li>
                          ) : (
                              <li className="flex justify-between"><span>Velocidad Viento:</span> <span className="font-medium">Variable (Weibull)</span></li>
                          )}
                          <li className="flex justify-between"><span>Área Necesaria:</span> <span className="font-medium">~{Math.round(results.technical?.system?.area)} m²</span></li>
                      </ul>
                  </div>
                  <div>
                      <h4 className="font-semibold text-[var(--text-secondary)] mb-2">Económico</h4>
                      <ul className="space-y-2 text-sm text-[var(--text-primary)]">
                          <li className="flex justify-between"><span>Precio Energía:</span> <span className="font-medium">{(results.parameters.financial?.electricityPrice || results.parameters.electricityPrice || 0.15).toFixed(3)} €/kWh</span></li>
                          <li className="flex justify-between"><span>Coste Inversión:</span> <span className="font-medium">{(results.summary?.totalInvestment || 0).toLocaleString()} €</span></li>
                          <li className="flex justify-between"><span>LCOE Real:</span> <span className="font-mono text-green-500 font-bold">{(results.financial?.metrics?.lcoe || results.summary?.lcoe || 0).toFixed(4)} €/kWh</span></li>
                          <li className="flex justify-between"><span>Tipo Simulación:</span> <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{results.source}</span></li>
                      </ul>
                  </div>
              </div>
          </div>
      )}

      {/* AI Comparative Verdict */}
      <div className="simulation-verdict mt-6 p-6 glass-panel border-l-4 border-purple-500 rounded-r-xl">
          <h3 className="text-lg font-bold mb-2 text-purple-600 dark:text-purple-200">🤖 Análisis Comparativo de Mercado</h3>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            {type === 'wind' ? (
               <>
                 <span className="font-semibold text-[var(--text-primary)]">Veredicto {Math.round(results.technical?.production?.capacityFactor) > 25 ? 'POSITIVO' : 'NEUTRO'}:</span> El 
                 factor de planta obtenido del <strong>{results.technical?.production?.capacityFactor?.toFixed(1)}%</strong> supera 
                 la media nacional eólica terrestre (20-25%). Para esta ubicación, la eólica 
                 {results.financial?.metrics?.roi > 200 ? ' es una opción excelente, posiblemente superando a la solar en retorno a largo plazo.' : ' es viable, aunque requiere una inversión inicial más alta que la solar.'}
               </>
            ) : (
               <>
                  <span className="font-semibold text-[var(--text-primary)]">Veredicto {results.financial?.metrics?.paybackPeriod < 8 ? 'EXCELENTE' : 'ESTÁNDAR'}:</span> Con un 
                  retorno de la inversión en <strong>{results.financial?.metrics?.paybackPeriod} años</strong>, este sistema solar 
                  ofrece una seguridad financiera superior a la mayoría de instrumentos de mercado. {results.financial?.metrics?.lcoe < 0.10 ? 'El coste de energía (LCOE) es extremadamente competitivo.' : ''}
               </>
            )}
          </p>
      </div>

    </div>
  );
};

export default ResultsView;
