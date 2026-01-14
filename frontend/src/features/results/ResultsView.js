import React, { useRef } from 'react';
import { ProductionChart, FinancialChart } from '../../shared/components/ResultsCharts';
import { KPIGrid } from '../../shared/components/KPIGrid';
import AdvancedCharts from '../charts/AdvancedCharts';
import { ArrowLeft, Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const ResultsView = ({ results, type = 'solar', onBack }) => {
  const resultsRef = useRef(null);

  const handleExportPDF = async () => {
    if (!resultsRef.current) return;
    
    try {
      const element = resultsRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // Mejor resolución
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      // const imgY = 10; // Margen superior - Unused

      pdf.addImage(imgData, 'PNG', imgX, 0, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`informe_rentabilidad_${type}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error exportando PDF:", error);
      alert("Hubo un error generando el PDF. Por favor intenta de nuevo.");
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
      savings: f.savings + f.income,
      costs: f.opex
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
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <span className="text-blue-400">⚡</span> Especificaciones Técnicas Detalladas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                      <h4 className="font-semibold text-gray-400 mb-2">Sistema</h4>
                      <ul className="space-y-2 text-sm">
                          <li className="flex justify-between"><span>Capacidad Instalada:</span> <span className="text-white">{results.parameters.capacity} kWs</span></li>
                          {type === 'solar' ? (
                            <>
                              <li className="flex justify-between"><span>Inclinación:</span> <span className="text-white">{results.parameters.tilt}°</span></li>
                              <li className="flex justify-between"><span>Azimut:</span> <span className="text-white">{results.parameters.azimuth}°</span></li>
                              <li className="flex justify-between"><span>Eficiencia Sistema:</span> <span className="text-white">{(results.technical?.system?.efficiency * 100).toFixed(1)}%</span></li>
                            </>
                          ) : (
                            <>
                              <li className="flex justify-between"><span>Altura Buje:</span> <span className="text-white">{results.parameters.height} m</span></li>
                              <li className="flex justify-between"><span>Diámetro Rotor:</span> <span className="text-white">{results.technical?.system?.rotorDiameter} m</span></li>
                              <li className="flex justify-between"><span>Factor Capacidad:</span> <span className="text-white">{(results.technical?.production?.capacityFactor || 0).toFixed(1)}%</span></li>
                            </>
                          )}
                      </ul>
                  </div>
                  <div>
                      <h4 className="font-semibold text-gray-400 mb-2">{type === 'solar' ? 'Ubicación & Solar' : 'Ubicación & Viento'}</h4>
                      <ul className="space-y-2 text-sm">
                          <li className="flex justify-between"><span>Latitud:</span> <span className="text-white">{results.parameters.location.lat.toFixed(4)}</span></li>
                          <li className="flex justify-between"><span>Longitud:</span> <span className="text-white">{results.parameters.location.lon.toFixed(4)}</span></li>
                          {type === 'solar' ? (
                              <li className="flex justify-between"><span>Irradiación Pico:</span> <span className="text-white">{(results.technical?.production?.peakPower || 0).toFixed(2)} kWh/m²</span></li>
                          ) : (
                              <li className="flex justify-between"><span>Velocidad Viento:</span> <span className="text-white">Variable (Weibull)</span></li>
                          )}
                          <li className="flex justify-between"><span>Área Necesaria:</span> <span className="text-white">~{Math.round(results.technical?.system?.area)} m²</span></li>
                      </ul>
                  </div>
                  <div>
                      <h4 className="font-semibold text-gray-400 mb-2">Económico</h4>
                      <ul className="space-y-2 text-sm">
                          <li className="flex justify-between"><span>Precio Energía:</span> <span className="text-white">{results.parameters.price} €/kWh</span></li>
                          <li className="flex justify-between"><span>Coste Inversión:</span> <span className="text-white">{(results.financial?.metrics?.totalSavings - results.financial?.metrics?.netPresentValue).toLocaleString()} €</span></li>
                          <li className="flex justify-between"><span>LCOE Real:</span> <span className="text-white font-mono text-green-400">{results.financial?.metrics?.lcoe?.toFixed(4)} €/kWh</span></li>
                          <li className="flex justify-between"><span>Tipo Simulación:</span> <span className="text-xs bg-blue-900 px-2 py-1 rounded">{results.source}</span></li>
                      </ul>
                  </div>
              </div>
          </div>
      )}

      {/* AI Comparative Verdict */}
      <div className="simulation-verdict mt-6 p-6 glass-panel border-l-4 border-purple-500 rounded-r-xl">
          <h3 className="text-lg font-bold mb-2 text-purple-200">🤖 Análisis Comparativo de Mercado</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            {type === 'wind' ? (
               <>
                 <span className="font-semibold text-white">Veredicto {Math.round(results.technical?.production?.capacityFactor) > 25 ? 'POSITIVO' : 'NEUTRO'}:</span> El 
                 factor de planta obtenido del <strong>{results.technical?.production?.capacityFactor?.toFixed(1)}%</strong> supera 
                 la media nacional eólica terrestre (20-25%). Para esta ubicación, la eólica 
                 {results.financial?.metrics?.roi > 200 ? ' es una opción excelente, posiblemente superando a la solar en retorno a largo plazo.' : ' es viable, aunque requiere una inversión inicial más alta que la solar.'}
               </>
            ) : (
               <>
                  <span className="font-semibold text-white">Veredicto {results.financial?.metrics?.paybackPeriod < 8 ? 'EXCELENTE' : 'ESTÁNDAR'}:</span> Con un 
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
