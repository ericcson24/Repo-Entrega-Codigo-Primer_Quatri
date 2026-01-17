// Dynamic Results Dashboard
import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, AreaChart, Area, ComposedChart 
} from 'recharts';
import { Download, Share2, Printer, TrendingUp, DollarSign, Zap, Calendar, Activity, BatteryCharging, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const KPICard = ({ title, value, unit, icon: Icon, trend, color, description }) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 transition-all hover:shadow-xl">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-lg ${color} bg-opacity-10 dark:bg-opacity-20`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      {trend && (
        <span className={`text-sm font-medium px-2 py-1 rounded ${
          trend > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700'
        }`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-wider">{title}</h3>
    <div className="mt-2 flex items-baseline">
      <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
      <span className="ml-2 text-gray-500 dark:text-gray-400 font-medium">{unit}</span>
    </div>
    {description && <p className="mt-2 text-sm text-gray-400">{description}</p>}
  </div>
);

const ResultsDashboard = ({ results, projectType, systemCapacity }) => {
  const { isDark } = useTheme();
  const [activeView, setActiveView] = useState('financial'); // 'financial', 'production', 'cashflow'

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
          opex: item.om_cost, // Map om_cost to opex
          net_cashflow: item.fcf_equity, // Map fcf_equity to net_cashflow
          cumulative_cashflow: runningTotal,
          revenue: item.revenue
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
  const annualGenKwh = results.generation?.annual_kwh || 0;
  const specificYield = systemCapacity ? (annualGenKwh / systemCapacity) : 0;
  const capacityFactor = systemCapacity ? (annualGenKwh / (systemCapacity * 8760)) * 100 : 0;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          title="Tasa Interna de Retorno (TIR)" 
          value={financials.irr_percent.toFixed(2)}
          unit="%"
          icon={TrendingUp}
          color="bg-blue-500"
          description="Rentabilidad anualizada"
        />
        <KPICard 
          title="Periodo de Recuperación" 
          value={financials.payback_years.toFixed(1)}
          unit="Años"
          icon={Calendar}
          color="bg-purple-500"
          description={financials.leverage_ratio > 0 ? "Retorno sobre Equity" : "Retorno Inversión Total"}
        />
        {financials.leverage_ratio > 0 ? (
          <KPICard 
              title="Estructura de Capital" 
              value={`${(financials.leverage_ratio * 100).toFixed(0)}% Deuda`}
              unit=""
              icon={Zap}
              color="bg-orange-500"
              description={`Banco: ${formatCurrency(financials.initial_debt)} | Tú: ${formatCurrency(financials.initial_equity)}`}
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

      {/* Controle Tabs */}
      <div className="flex space-x-4 border-b border-gray-200 dark:border-gray-700">
        {[
            {id: 'financial', label: 'Financiero'}, 
            {id: 'production', label: 'Producción'}, 
            {id: 'cashflow', label: 'Flujo de Caja'}
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`pb-4 px-4 font-medium capitalize transition-colors relative ${
              activeView === tab.id 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
            {activeView === tab.id && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        ))}
      </div>

      {/* Main Chart Area */}
      <div className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 ${activeView === 'production' ? '' : 'h-[500px]'}`}>
        
        {activeView === 'financial' && (
          <div className="h-full">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Flujo de Caja Acumulado (25 Años)</h3>
            <ResponsiveContainer width="100%" height="90%">
              <ComposedChart data={yearly_projection}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
                <XAxis dataKey="year" stroke={isDark ? "#9ca3af" : "#4b5563"} />
                <YAxis stroke={isDark ? "#9ca3af" : "#4b5563"} tickFormatter={(val) => `€${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#e5e7eb', color: isDark ? '#fff' : '#000' }}
                  formatter={(value) => formatCurrency(value)}
                  labelFormatter={(years) => `Año ${years}`}
                />
                <Legend />
                <Bar dataKey="revenue" name="Ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="opex" name="Costes Op." fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="cumulative_cashflow" name="Acumulado" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeView === 'production' && (
          <div className="flex flex-col space-y-8">
             
             {/* Technical KPIs Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
            </div>

             {/* 1. Monthly Production */}
             <div className="h-80 w-full">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Perfil Mensual de Producción</h3>
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
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#e5e7eb' }} />
                    <Legend />
                    <Area type="monotone" dataKey="generation_kwh" stroke="#f59e0b" fillOpacity={1} fill="url(#colorProd)" name="Generación (kWh)" />
                  </AreaChart>
                </ResponsiveContainer>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 2. Seasonal Daily Profile */}
                <div className="h-80 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Perfil Diario Estacional Promedio</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={seasonalProfile}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#e5e7eb"} />
                            <XAxis dataKey="hour" label={{ value: 'Hora Solar', position: 'insideBottom', offset: -5 }} stroke={isDark ? "#9ca3af" : "#4b5563"} />
                            <YAxis stroke={isDark ? "#9ca3af" : "#4b5563"} />
                            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#e5e7eb' }} />
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
                            <Tooltip contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', borderColor: isDark ? '#374151' : '#e5e7eb' }} />
                            <Area type="monotone" dataKey="load" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} name="Potencia Output" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
             </div>
          </div>
        )}

        {activeView === 'cashflow' && (
            <div className="overflow-x-auto h-full">
                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
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
                            <tr key={year.year} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
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
        <button className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
          <Printer size={18} />
          <span>Imprimir Informe</span>
        </button>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg shadow-blue-500/30">
          <Download size={18} />
          <span>Exportar CSV</span>
        </button>
      </div>
    </div>
  );
}; // End of Component

export default ResultsDashboard;
