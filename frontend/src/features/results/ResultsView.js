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
    </div>
  );
};

export default ResultsView;
