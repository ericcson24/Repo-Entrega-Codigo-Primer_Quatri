import React from 'react';
import { Zap, DollarSign, TrendingUp, Fan, Activity } from 'lucide-react';

export const KPIGrid = ({ metrics = {}, type = 'solar' }) => {
  const Icon = type === 'solar' ? Zap : Fan;
  
  // Extraer valores del objeto metrics que viene del backend
  // Soporta tanto estructura plana como anidada
  const production = metrics.totalGenerationFirstYear || metrics.production || 0;
  // totalSavings (Lifetime) vs annualSavings (Year 1)
  // El backend devuelve 'totalSavings' en metrics, y savings anuales en cashFlows.
  // Aquí usamos el ROI para inferir o el valor si existiera.
  // Ajuste: si metrics tiene 'totalSavings' es acumulado. Para anual usamos producción x precio aprox o inferimos.
  
  // Si metrics no tiene ahorro anual explícito, lo buscamos
  // NOTE: El backend `SimulationService` devuelve `totalGenerationFirstYear`, `roi`, `paybackYears`, `npv`, `irr`
  /* 
     summary: {
        totalGenerationFirstYear: solarData.production.annualKwh,
        totalInvestment: totalCapex,
        roi: projection.metrics.roi,
        paybackYears: projection.metrics.paybackPeriod,
        npv: projection.metrics.npv, // VAN
        irr: projection.metrics.irr  // TIR
    }
  */

  const annualProduction = metrics.totalGenerationFirstYear;
  const roiValue = metrics.roi;
  const paybackValue = metrics.paybackYears;
  const npvValue = metrics.npv;

  // Calculamos un ahorro anual aproximado para mostrar (VAN / años aprox o simple metrica)
  // O mejor, si no tenemos el dato, mostramos VAN que es más profesional
  
  return (
    <div className="grid-4-cols gap-4 mb-6">
      <div className="glass-card kpi-card">
        <div className="kpi-icon"><Icon /></div>
        <div className="kpi-content">
          <h3>Producción Año 1</h3>
          <p className="kpi-value">{annualProduction ? Math.round(annualProduction).toLocaleString() : '-'} kWh</p>
          <span className="kpi-sub">Simulación Física</span>
        </div>
      </div>

      <div className="glass-card kpi-card">
        <div className="kpi-icon"><Activity /></div>
        <div className="kpi-content">
          <h3>Valor Actual Neto</h3>
          <p className="kpi-value">{npvValue ? npvValue.toLocaleString() : '-'} €</p>
          <span className="kpi-sub">VAN (NPV)</span>
        </div>
      </div>

      <div className="glass-card kpi-card">
        <div className="kpi-icon"><TrendingUp /></div>
        <div className="kpi-content">
          <h3>Retorno (ROI)</h3>
          <p className="kpi-value text-emerald-400">{roiValue ? roiValue : '-'}%</p>
          <span className="kpi-sub">Retorno Inversión</span>
        </div>
      </div>

      <div className="glass-card kpi-card">
        <div className="kpi-icon"><DollarSign /></div>
        <div className="kpi-content">
          <h3>Plazo Amortización</h3>
          <p className="kpi-value">{paybackValue ? paybackValue : '-'} años</p>
          <span className="kpi-sub">Payback Period</span>
        </div>
      </div>
    </div>
  );
};
