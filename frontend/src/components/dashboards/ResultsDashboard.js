// Dynamic Results Dashboard
import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, AreaChart, Area, ComposedChart, ReferenceLine 
} from 'recharts';
import { Download, Share2, Printer, TrendingUp, DollarSign, Zap, Calendar, Activity, BatteryCharging, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import './ResultsDashboard.css';

/* Helper to map series names/keys to CSS classes */
const getSeriesColorClass = (name) => {
    const map = {
        'Ventas a Red': 'text-color-sales',
        'Ahorro por Autoconsumo': 'text-color-savings',
        'Costes Operativos': 'text-color-opex',
        'Flujo de Caja Acumulado (Equity)': 'text-color-equity',
        'Producción Anual (kWh)': 'text-color-production',
        'Generación (kWh)': 'text-color-gen',
        'Invierno': 'text-color-winter',
        'Primavera': 'text-color-spring',
        'Verano': 'text-color-summer',
        'Otoño': 'text-color-autumn',
        'Potencia Output': 'text-color-power'
    };
    return map[name] || '';
};

/* Custom Tooltip Component replacing inline styles */
const CustomTooltip = ({ active, payload, label, formatter, labelFormatter }) => {
  if (active && payload && payload.length) {
    const labelStr = labelFormatter ? labelFormatter(label) : label;
    return (
      <div className="custom-tooltip">
        <p className="custom-tooltip-label">{labelStr}</p>
        {payload.map((entry, index) => {
             const val = formatter ? formatter(entry.value, entry.name, entry) : entry.value;
             const colorClass = getSeriesColorClass(entry.name);
             return (
              <div key={index} className={`custom-tooltip-item ${colorClass}`}>
                <span className="name">{entry.name}:</span>
                <span className="value">{val}</span>
              </div>
             );
        })}
      </div>
    );
  }
  return null;
};

const KPICard = ({ title, value, unit, icon: Icon, trend, color, description }) => {
  // Map legacy color prop (bg-green-500) to semantic variant class
  // Simple heuristic mapping or pass variant prop directly in future
  const getVariant = (colorClass) => {
      if(colorClass?.includes('green')) return 'kpi-green';
      if(colorClass?.includes('emerald')) return 'kpi-emerald';
      if(colorClass?.includes('blue')) return 'kpi-blue';
      if(colorClass?.includes('purple')) return 'kpi-purple';
      if(colorClass?.includes('orange')) return 'kpi-orange';
      return '';
  };
  const variant = getVariant(color);

  return (
  <div className={`kpi-card ${variant}`}>
    <div className="kpi-header">
      <div className="kpi-icon-box">
        <Icon className="kpi-icon" />
      </div>
      {trend && (
        <span className={`kpi-trend-badge ${trend > 0 ? 'kpi-trend-positive' : 'kpi-trend-negative'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h3 className="kpi-title">{title}</h3>
    <div className="kpi-value-row">
      <span className="kpi-value-text">{value}</span>
      <span className="kpi-unit-text">{unit}</span>
    </div>
    {description && <p className="kpi-desc-text">{description}</p>}
  </div>
)};

const ResultsDashboard = ({ results, projectType, systemCapacity, technicalParams, viewMode = 'full' }) => {
  const { isDark } = useTheme();
  // If residential mode, default to 'production' view, else 'financial'
  const [activeView, setActiveView] = useState(viewMode === 'residential' ? 'production' : 'financial');

  // --- Advanced Technical Analysis Processing ---
  // Hooks must be called unconditionally at top level
  // We use optional chaining to safely derive variables even if results is null derived
  const hourlyGen = results?.graphs?.hourly_generation || [];
  
  // 1. Seasonal Profile Processing
  const seasonalProfile = React.useMemo(() => {
    if (!hourlyGen || hourlyGen.length < 8760) return [];
    
    const profiles = {
      Invierno: Array(24).fill(0), Primavera: Array(24).fill(0),
      Verano: Array(24).fill(0), Otoño: Array(24).fill(0)
    };
    const counts = {
      Invierno: Array(24).fill(0), Primavera: Array(24).fill(0),
      Verano: Array(24).fill(0), Otoño: Array(24).fill(0)
    };
    
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const cumDays = [0];
    daysInMonth.forEach((d, i) => cumDays.push(cumDays[i] + d));
    
    const getMonth = (dayOfYear) => {
       for(let i=0; i<12; i++) if(dayOfYear < cumDays[i+1]) return i;
       return 11;
    };

    hourlyGen.forEach((val, h) => {
      const hourOfDay = h % 24;
      const dayOfYear = Math.floor(h / 24);
      const month = getMonth(dayOfYear); // 0-11
      
      let season = 'Invierno';
      if (month >= 2 && month <= 4) season = 'Primavera';
      else if (month >= 5 && month <= 7) season = 'Verano';
      else if (month >= 8 && month <= 10) season = 'Otoño';
      
      profiles[season][hourOfDay] += val;
      counts[season][hourOfDay] += 1;
    });

    return Array.from({length: 24}, (_, i) => ({
      hour: i,
      Invierno: profiles.Invierno[i] / (counts.Invierno[i] || 1),
      Primavera: profiles.Primavera[i] / (counts.Primavera[i] || 1),
      Verano: profiles.Verano[i] / (counts.Verano[i] || 1),
      Otoño: profiles.Otoño[i] / (counts.Otoño[i] || 1),
    }));
  }, [hourlyGen]);

  // 2. Duration Curve Processing (Downsampled)
  const durationCurve = React.useMemo(() => {
     if (!hourlyGen || hourlyGen.length === 0) return [];
     const sorted = [...hourlyGen].sort((a, b) => b - a);
     
     const points = [];
     const step = Math.max(1, Math.floor(sorted.length / 100));
     for(let i=0; i<sorted.length; i+=step) {
         points.push({ hours: i, load: sorted[i] });
     }
     return points;
  }, [hourlyGen]);

  if (!results) return null; // Early return moved AFTER hooks

  // Adapt Backend Response to Frontend Component Structure
  const financials = results.financials;
  
  // Transform annual data: Map Backend Keys -> Frontend Keys & Calculate Cumulative
  // Use initial_equity if available (for levered view), otherwise fallback to total_investment (unlevered view logic, but technically wrong for equity chart)
  const initialOutflow = financials.initial_equity !== undefined ? financials.initial_equity : financials.total_investment;
  
  let runningTotal = -initialOutflow; 
  
  const yearly_projection = (results.graphs?.annual_breakdown || []).map(item => {
      runningTotal += item.fcf_equity;
      return {
          ...item,
          opex: item.om_cost, 
          net_cashflow: item.fcf_equity, 
          cumulative_cashflow: runningTotal,
          revenue_sales: item.sales || 0,
          revenue_savings: item.savings || 0,
          total_revenue: item.revenue
      };
  });
  
  // Transform monthly array [v1, v2...] to [{month: 'Jan', generation_kwh: v1}...]
  const rawMonthly = results.graphs?.monthly_generation || [];
  const monthNamesEs = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthly_production = Array.isArray(rawMonthly) 
    ? rawMonthly.map((val, index) => ({
        month: monthNamesEs[index],
        generation_kwh: val
      }))
    : []; 

  // Formatter helpers
  const formatCurrency = (val) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  const formatEnergy = (val) => `${new Intl.NumberFormat('es-ES').format(Math.round(val))}`;
  const formatNumber = (val) => new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(val);

  // Technical KPIs Calculations
  const annualGenKwh = results.generation?.annual_kwh || results.annual_generation_kwh || 0;
  const specificYield = systemCapacity ? (annualGenKwh / systemCapacity) : 0;
  const capacityFactor = systemCapacity ? (annualGenKwh / (systemCapacity * 8760)) * 100 : 0;

  // --- Export Functions ---
  const handleExportCSV = () => {
    if (!yearly_projection || yearly_projection.length === 0) return;

    // Define headers
    const headers = ['Año', 'Ingresos (€)', 'OPEX (€)', 'Flujo de Caja Neto (€)', 'Flujo Acumulado (€)'];
    
    // Format rows
    const rows = yearly_projection.map(item => [
      item.year,
      (item.revenue || 0).toFixed(2),
      (item.opex || 0).toFixed(2),
      (item.net_cashflow || 0).toFixed(2),
      (item.cumulative_cashflow || 0).toFixed(2)
    ]);

    // Construct CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blobs and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `simulacion_${projectType}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const isResidential = viewMode === 'residential';

  return (
    <div className="dashboard-container">
      
      {/* Executive Summary - Only show in Full/Utility Mode */}
      {!isResidential && (
      <div className="executive-summary-grid">
        <KPICard 
          title="Valor Actual Neto (VAN)" 
          value={formatCurrency(financials.npv_eur)}
          unit=""
          icon={DollarSign}
          color="bg-green-500"
          trend={12.5}
          description="Valor generado en 25 años"
        />
        <KPICard 
          title="Beneficio Neto Total" 
          value={formatCurrency(financials.total_nominal_profit || 0)}
          unit=""
          icon={DollarSign}
          color="bg-emerald-600"
          description={financials.leverage_ratio > 0 ? "Flujo neto (Equity)" : "Flujo neto (Proyecto)"}
        />
        <KPICard 
          title={financials.leverage_ratio > 0 ? "TIR (Equity)" : "TIR (Proyecto)"}
          value={(financials.irr_percent ?? 0).toFixed(2)}
          unit="%"
          icon={TrendingUp}
          color="bg-blue-500"
          description={financials.leverage_ratio > 0 ? "Rentabilidad del Capital Invertido" : "Rentabilidad del Proyecto Total"}
        />
        <KPICard 
          title="Periodo de Recuperación" 
          value={(financials.payback_years ?? 0).toFixed(1)}
          unit="Años"
          icon={Calendar}
          color="bg-purple-500"
          description={financials.leverage_ratio > 0 ? "Retorno sobre Equity" : "Retorno Inversión Total"}
        />
        {financials.leverage_ratio > 0 ? (
          <KPICard 
              title="Estructura de Capital" 
              value={`${(financials.leverage_ratio * 100 ?? 0).toFixed(0)}% Deuda`}
              unit=""
              icon={Zap}
              color="bg-orange-500"
              description={`Intereses Totales: ${formatCurrency(financials.total_interest_paid || 0)}`}
          />
        ) : (
          <KPICard 
              title="LCOE" 
              value={financials.lcoe?.toFixed(2) || "N/A"} 
              unit="€/MWh"
              icon={Zap}
              color="bg-orange-500"
              description="Coste nivelado de energía"
          />
        )}
      </div>
      )}

      {/* Controle Tabs */}
      <div className="tabs-header">
        {[
            // Hide Financial tabs in Residential Mode
            ...(isResidential ? [] : [{id: 'financial', label: 'Financiero'}]), 
            {id: 'production', label: 'Producción'}, 
            ...(isResidential ? [] : [{id: 'cashflow', label: 'Flujo de Caja'}])
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`dashboard-tab ${activeView === tab.id ? 'dashboard-tab-active' : ''}`}
          >
            {tab.label}
            {activeView === tab.id && (
              <div className="dashboard-tab-indicator" />
            )}
          </button>
        ))}
      </div>

      {/* Main Chart Area */}
      <div className={`dashboard-chart-container ${activeView !== 'financial' && activeView !== 'production' ? 'chart-container-expanded' : ''}`}>
        
        {activeView === 'financial' && (
          <div className="chart-section-container">
            {/* Chart 1: Annual Breakdown */}
            <div className="chart-block">
                <h3 className="chart-heading">Desglose de Flujos Anuales (Ventas vs Ahorro)</h3>
                <ResponsiveContainer width="100%" height="90%">
                <BarChart data={yearly_projection}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
                    <XAxis dataKey="year" stroke={isDark ? "#9ca3af" : "#4b5563"} />
                    <YAxis stroke={isDark ? "#9ca3af" : "#4b5563"} tickFormatter={(val) => `€${val/1000}k`} />
                    <Tooltip 
                        content={<CustomTooltip formatter={(value) => formatCurrency(value)} labelFormatter={(years) => `Año ${years}`} />}
                    />
                    <Legend />
                    <Bar dataKey="revenue_sales" stackId="a" name="Ventas a Red" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="revenue_savings" stackId="a" name="Ahorro por Autoconsumo" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="opex" name="Costes Operativos" fill="#ef4444" radius={[4, 4, 4, 4]} />
                </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Chart 2: Cumulative Cashflow (Payback View) */}
            <div className="h-80 pt-6 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Retorno de Inversión Acumulado</h3>
                <ResponsiveContainer width="100%" height="90%">
                <AreaChart data={yearly_projection}>
                    <defs>
                        <linearGradient id="colorCum" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={financials.payback_years < 25 ? "#10b981" : "#f59e0b"} stopOpacity={0.1}/>
                            <stop offset="95%" stopColor={financials.payback_years < 25 ? "#10b981" : "#f59e0b"} stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
                    <XAxis dataKey="year" stroke={isDark ? "#9ca3af" : "#4b5563"} />
                    <YAxis stroke={isDark ? "#9ca3af" : "#4b5563"} tickFormatter={(val) => `€${val/1000}k`} />
                    <Tooltip 
                        content={<CustomTooltip formatter={(value) => formatCurrency(value)} />}
                    />
                    <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
                    <Legend />
                    <Area 
                        type="monotone" 
                        dataKey="cumulative_cashflow" 
                        name="Flujo de Caja Acumulado (Equity)" 
                        stroke={financials.payback_years < 25 ? "#10b981" : "#f59e0b"} 
                        fill="url(#colorCum)"
                        strokeWidth={3} 
                    />
                </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeView === 'production' && (
          <div className="flex flex-col space-y-8">
             
             {/* Technical KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center gap-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-300">
                        <BatteryCharging size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Producción Anual</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatEnergy(annualGenKwh)} <span className="text-sm font-normal">kWh</span></p>
                    </div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg flex items-center gap-4">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-800 rounded-full text-yellow-600 dark:text-yellow-300">
                        <Sun size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Rendimiento Específico</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(specificYield)} <span className="text-sm font-normal">kWh/kWp</span></p>
                    </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg flex items-center gap-4">
                    <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full text-green-600 dark:text-green-300">
                        <Activity size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Factor de Capacidad</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatNumber(capacityFactor)} <span className="text-sm font-normal">%</span></p>
                    </div>
                </div>
                 <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg flex items-center gap-4">
                    <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-full text-purple-600 dark:text-purple-300">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Degradación Anual</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">0.5 <span className="text-sm font-normal">%</span></p>
                    </div>
                </div>
            </div>

             {/* 1. Monthly Production */}
             <div className="h-80 w-full">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Perfil Mensual de Producción (Año 1)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly_production || []}>
                    <defs>
                      <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
                    <XAxis dataKey="month" stroke={isDark ? "#9ca3af" : "#4b5563"} />
                    <YAxis stroke={isDark ? "#9ca3af" : "#4b5563"} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area type="monotone" dataKey="generation_kwh" stroke="#f59e0b" fillOpacity={1} fill="url(#colorProd)" name="Generación (kWh)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>

            {/* 2. Long Term Degradation */}
            <div className="h-80 w-full">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Degradación de Producción Estimada (25 Años)</h3>
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={results.graphs?.annual_breakdown || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
                        <XAxis dataKey="year" stroke={isDark ? "#9ca3af" : "#4b5563"} type="number" domain={[1, 'auto']} />
                        <YAxis stroke={isDark ? "#9ca3af" : "#4b5563"} domain={['auto', 'auto']} />
                        <Tooltip 
                            content={<CustomTooltip formatter={(value) => formatEnergy(value)} labelFormatter={(year) => `Año ${year}`} />}
                        />
                         <Legend />
                        <Line type="monotone" dataKey="generation_kwh" stroke="#ef4444" name="Producción Anual (kWh)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 3. Seasonal Daily Profile */}
                <div className="h-80 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Perfil Diario Estacional Promedio</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={seasonalProfile}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
                            <XAxis dataKey="hour" label={{ value: 'Hora Solar', position: 'insideBottom', offset: -5 }} stroke={isDark ? "#9ca3af" : "#4b5563"} />
                            <YAxis stroke={isDark ? "#9ca3af" : "#4b5563"} />
                            <Tooltip content={<CustomTooltip labelFormatter={(val) => `${val}:00 h`} />} />
                            <Legend />
                            <Line type="monotone" dataKey="Invierno" stroke="#3b82f6" dot={false} strokeWidth={2} />
                            <Line type="monotone" dataKey="Primavera" stroke="#10b981" dot={false} strokeWidth={2} />
                            <Line type="monotone" dataKey="Verano" stroke="#f59e0b" dot={false} strokeWidth={2} />
                            <Line type="monotone" dataKey="Otoño" stroke="#8b5cf6" dot={false} strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* 3. Duration Curve */}
                <div className="h-80 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Curva de Duración de Carga</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={durationCurve}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
                            <XAxis dataKey="hours" label={{ value: 'Horas Excedidas', position: 'insideBottom', offset: -5 }} stroke={isDark ? "#9ca3af" : "#4b5563"} />
                            <YAxis label={{ value: 'Potencia (kW)', angle: -90, position: 'insideLeft' }} stroke={isDark ? "#9ca3af" : "#4b5563"} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="load" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name="Potencia Output" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
             </div>

             {/* 6. Technical Specs Card (Using Params passed from Calculator) */}
            {technicalParams && (
                <div className="md:col-span-2 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Especificaciones Técnicas Simuladas</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="tech-spec-card">
                            <p className="text-gray-500">Panel</p>
                            <p className="font-semibold dark:text-gray-200 capitalize">{technicalParams.panel_type}</p>
                        </div>
                         <div className="tech-spec-card">
                            <p className="text-gray-500">Orientación</p>
                            <p className="font-semibold dark:text-gray-200">{technicalParams.azimuth}° (Sur=180)</p>
                        </div>
                        <div className="tech-spec-card">
                            <p className="text-gray-500">Inclinación</p>
                            <p className="font-semibold dark:text-gray-200">{technicalParams.tilt}°</p>
                        </div>
                        <div className="tech-spec-card">
                            <p className="text-gray-500">Pérdidas Totales</p>
                            <p className="font-semibold dark:text-gray-200">{technicalParams.system_loss}%</p>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}

        {activeView === 'cashflow' && (
            <div className="overflow-x-auto h-full">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="dashboard-table-header">
                        <tr>
                            <th className="px-6 py-3">Año</th>
                            <th className="px-6 py-3">Ingresos</th>
                            <th className="px-6 py-3">Opex</th>
                            <th className="px-6 py-3">Flujo Neto</th>
                            <th className="px-6 py-3">Acumulado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {yearly_projection.map((year, index) => (
                            <tr key={year.year} className="dashboard-table-row">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{year.year}</td>
                                <td className="px-6 py-4 text-green-600 dark:text-green-400">+{formatCurrency(year.revenue)}</td>
                                <td className="px-6 py-4 text-red-600 dark:text-red-400">-{formatCurrency(year.opex)}</td>
                                <td className="px-6 py-4 font-bold">{formatCurrency(year.net_cashflow)}</td>
                                <td className={`px-6 py-4 font-bold ${year.cumulative_cashflow > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(year.cumulative_cashflow)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

      </div>

      {/* Action Bar */}
      <div className="flex justify-end space-x-4">
        <button onClick={handlePrintReport} className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
          <Printer size={18} />
          <span>Imprimir Informe</span>
        </button>
        <button onClick={handleExportCSV} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/30">
          <Download size={18} />
          <span>Exportar CSV</span>
        </button>
      </div>
    </div>
  );
}; // End of Component

export default ResultsDashboard;
