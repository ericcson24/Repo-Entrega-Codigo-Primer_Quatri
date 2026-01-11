import React from 'react';
import { Zap, DollarSign, TrendingUp, Fan, Activity } from 'lucide-react';

export const KPIGrid = ({ production, savings, roi, payback, capacityFactor, type = 'solar' }) => {
  const Icon = type === 'solar' ? Zap : Fan;
  
  // Color coding para Factor de Planta
  const getCFColor = (cf) => {
    if (!cf) return 'var(--text-secondary)';
    if (cf > 35) return '#10b981'; // Green
    if (cf > 20) return '#f59e0b'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div className="grid-4-cols gap-4 mb-6">
      <div className="glass-card kpi-card">
        <div className="kpi-icon"><Icon /></div>
        <div className="kpi-content">
          <h3>Producción Anual</h3>
          <p className="kpi-value">{Math.round(production).toLocaleString()} kWh</p>
          <span className="kpi-sub">Estimación IA</span>
        </div>
      </div>

      {capacityFactor && (
      <div className="glass-card kpi-card">
        <div className="kpi-icon"><Activity /></div>
        <div className="kpi-content">
          <h3>Eficiencia (CF)</h3>
          <p className="kpi-value" style={{ color: getCFColor(capacityFactor) }}>{capacityFactor}%</p>
          <span className="kpi-sub">{type === 'wind' ? 'Factor de Planta' : 'Rendimiento'}</span>
        </div>
      </div>
      )}

      <div className="glass-card kpi-card">
        <div className="kpi-icon"><DollarSign /></div>
        <div className="kpi-content">
          <h3>Ahorro Anual</h3>
          <p className="kpi-value">{savings} €</p>
          <span className="kpi-sub">Aprox.</span>
        </div>
      </div>

      <div className="glass-card kpi-card">
        <div className="kpi-icon"><TrendingUp /></div>
        <div className="kpi-content">
          <h3>Retorno (ROI)</h3>
          <p className="kpi-value">{roi}%</p>
          <span className="kpi-sub">Payback: {payback} años</span>
        </div>
      </div>
    </div>
  );
};
