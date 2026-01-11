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
      const imgY = 10; // Margen superior

      pdf.addImage(imgData, 'PNG', imgX, 0, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`informe_rentabilidad_${type}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error exportando PDF:", error);
      alert("Hubo un error generando el PDF. Por favor intenta de nuevo.");
    }
  };

  if (!results) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <ArrowLeft size={32} className="opacity-50" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Sin resultados</h3>
        <p>Realiza un cálculo en la calculadora {type === 'solar' ? 'solar' : 'eólica'} para ver el análisis.</p>
        <button 
          onClick={onBack}
          className="btn-primary mt-6"
        >
          Ir a Calculadora
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" ref={resultsRef}>
      <div className="results-header">
        <div>
          <h2 className="text-2xl font-bold mb-1">Análisis de Resultados</h2>
          <p className="text-secondary">Proyección financiera y energética a {results.financialData.length} años</p>
        </div>
        <div className="flex gap-3" data-html2canvas-ignore="true">
          <button 
            onClick={onBack}
            className="btn-secondary"
          >
            <ArrowLeft size={18} />
            Nuevo Cálculo
          </button>
          <button 
            className="btn-primary"
            onClick={handleExportPDF}
          >
            <Download size={18} className="mr-2" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* KPIs Principales */}
      <KPIGrid 
        production={results.annualProduction} 
        savings={results.annualSavings} 
        roi={results.roi} 
        payback={results.paybackPeriod} 
        capacityFactor={results.capacityFactor}
        type={type}
      />

      {/* Gráficos Avanzados */}
      <div className="charts-grid">
        <ProductionChart 
          data={results.monthlyData} 
          productionKey="production" 
          productionColor="#10b981" 
          productionName="Producción Solar" 
        />
        <FinancialChart data={results.financialData} />
      </div>

      {/* Análisis Detallado */}
      <div className="glass-panel">
        <h3 className="text-lg font-semibold mb-6">Evolución Financiera Detallada</h3>
        <AdvancedCharts data={results.financialData} />
      </div>
    </div>
  );
};

export default ResultsView;
