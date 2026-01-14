import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { CHART_CONSTANTS } from '../../core/config/constants';

/**
 * Componente de gráficos avanzados para visualización de datos de inversión
 */
const AdvancedCharts = ({ financialData, productionData, type }) => {
  const [activeChart, setActiveChart] = useState('evolution');

  // Adaptación robusta de datos si financialData no está presente
  // ResultsView pasa 'financialData' con la estructura mapeada { year, balance, savings, costs }
  const data = financialData || [];

  if (!data || data.length === 0) {
    return (
      <div className="empty-state glass-panel">
        <div className="text-4xl mb-4">📈</div>
        <h3 className="text-lg font-semibold mb-2">
          No hay datos para graficar
        </h3>
        <p className="text-secondary">
          Realiza un cálculo primero para ver los gráficos
        </p>
      </div>
    );
  }

  // Preparar datos extendidos para gráficos avanzados
  // data viene mapeada de ResultsView como:
  // { year: f.year, balance: f.cumulative, savings: f.savings + f.income, costs: f.opex }
  const chartData = data.map(item => ({
    year: item.year,
    value: item.balance, // Acumulado
    profit: item.balance, // En este contexto, profit acumulado es el balance
    roi: item.balance > 0 ? (item.balance / (data[0].costs || 1)) * 100 : 0, // Aproximacion visual
    income: item.savings,
    maintenance: item.costs
  }));

  // Datos para gráfico de pastel (Inversión vs Beneficio Final)
  // El año 0 tiene costs = Inversion (Capex) y balance = -Capex
  const initialInvestment = data.length > 0 ? data[0].costs : 0; // Approx Year 0 cost is investment
  const finalYear = chartData[chartData.length - 1];
  
  const pieData = [
    {
      name: 'Inversión Inicial',
      value: Math.abs(initialInvestment),
      color: CHART_CONSTANTS.COLORS.INVESTMENT
    },
    {
      name: 'Beneficios Totales',
      value: Math.max(0, finalYear.value + Math.abs(initialInvestment)), // Total generado
      color: CHART_CONSTANTS.COLORS.PROFIT
    }
  ];

  const chartTypes = [
    { id: 'evolution', label: 'Evolución del Valor', icon: '📈' },
    { id: 'cashflow', label: 'Flujo de Caja', icon: '💸' },
    { id: 'distribution', label: 'Inversión vs Retorno', icon: '🥧' }
  ];

  const renderChart = () => {
    switch (activeChart) {
      case 'evolution':
        return (
          <div className="h-96">
            <ResponsiveContainer width={CHART_CONSTANTS.WIDTH.FULL} height={CHART_CONSTANTS.HEIGHT.FULL}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray={CHART_CONSTANTS.STROKE.DASH_3_3} className="opacity-30" />
                <XAxis
                  dataKey="year"
                  label={{ value: 'Año', position: 'insideBottom', offset: CHART_CONSTANTS.OFFSETS.LABEL_BOTTOM }}
                />
                <YAxis
                  label={{ value: 'Valor (€)', angle: CHART_CONSTANTS.ANGLES.Y_AXIS_LABEL, position: 'insideLeft' }}
                  tickFormatter={(value) => new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR',
                    notation: 'compact'
                  }).format(value)}
                />
                <Tooltip
                  formatter={(value) => [new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(value), 'Valor']}
                  labelFormatter={(label) => `Año ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_CONSTANTS.COLORS.VALUE}
                  strokeWidth={3}
                  name="Valor Total"
                  dot={{ fill: CHART_CONSTANTS.COLORS.VALUE, strokeWidth: 2, r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="profit"
                  stroke={CHART_CONSTANTS.COLORS.PROFIT}
                  strokeWidth={2}
                  name="Beneficio Neto"
                  dot={{ fill: CHART_CONSTANTS.COLORS.PROFIT, strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case 'roi':
        // Prepare simplified ROI data if not present on chartData
        const roiChartData = chartData.map(d => ({
             year: d.year,
             roi: d.roi || 0
        }));

        return (
          <div className="h-96">
            <ResponsiveContainer width={CHART_CONSTANTS.WIDTH.FULL} height={CHART_CONSTANTS.HEIGHT.FULL}>
              <BarChart data={roiChartData}>
                <CartesianGrid strokeDasharray={CHART_CONSTANTS.STROKE.DASH_3_3} className="opacity-30" />
                <XAxis
                  dataKey="year"
                  label={{ value: 'Año', position: 'insideBottom', offset: CHART_CONSTANTS.OFFSETS.LABEL_BOTTOM }}
                />
                <YAxis
                  label={{ value: 'ROI (%)', angle: CHART_CONSTANTS.ANGLES.Y_AXIS_LABEL, position: 'insideLeft' }}
                />
                <Tooltip
                  formatter={(value) => [`${value.toFixed(1)}%`, 'ROI']}
                  labelFormatter={(label) => `Año ${label}`}
                />
                <Legend />
                <Bar
                  dataKey="roi"
                  fill={CHART_CONSTANTS.COLORS.ROI}
                  name="ROI Acumulado"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'cashflow':
        return (
          <div className="h-96">
            <ResponsiveContainer width={CHART_CONSTANTS.WIDTH.FULL} height={CHART_CONSTANTS.HEIGHT.FULL}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray={CHART_CONSTANTS.STROKE.DASH_3_3} className="opacity-30" />
                <XAxis
                  dataKey="year"
                  label={{ value: 'Año', position: 'insideBottom', offset: CHART_CONSTANTS.OFFSETS.LABEL_BOTTOM }}
                />
                <YAxis
                  label={{ value: 'Flujo de Caja (€)', angle: CHART_CONSTANTS.ANGLES.Y_AXIS_LABEL, position: 'insideLeft' }}
                  tickFormatter={(value) => new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR',
                    notation: 'compact'
                  }).format(value)}
                />
                <Tooltip
                  formatter={(value) => [new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(value), 'Flujo de Caja']}
                  labelFormatter={(label) => `Año ${label}`}
                />
                <Legend />
                <Bar
                  dataKey="income"
                  stackId="a"
                  fill={CHART_CONSTANTS.COLORS.INCOME}
                  name="Ingresos"
                  radius={[2, 2, 0, 0]}
                />
                <Bar
                  dataKey="maintenance"
                  stackId="a"
                  fill={CHART_CONSTANTS.COLORS.MAINTENANCE}
                  name="Mantenimiento"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'production':
        return (
          <div className="h-96">
            <ResponsiveContainer width={CHART_CONSTANTS.WIDTH.FULL} height={CHART_CONSTANTS.HEIGHT.FULL}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray={CHART_CONSTANTS.STROKE.DASH_3_3} className="opacity-30" />
                <XAxis
                  dataKey="year"
                  label={{ value: 'Año', position: 'insideBottom', offset: CHART_CONSTANTS.OFFSETS.LABEL_BOTTOM }}
                />
                <YAxis
                  label={{ value: 'Producción (kWh)', angle: CHART_CONSTANTS.ANGLES.Y_AXIS_LABEL, position: 'insideLeft' }}
                  tickFormatter={(value) => new Intl.NumberFormat('es-ES', {
                    notation: 'compact'
                  }).format(value)}
                />
                <Tooltip
                  formatter={(value) => [new Intl.NumberFormat('es-ES').format(value), 'Producción (kWh)']}
                  labelFormatter={(label) => `Año ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="production"
                  stroke={CHART_CONSTANTS.COLORS.PRODUCTION_LINE}
                  strokeWidth={3}
                  name="Producción Anual"
                  dot={{ fill: CHART_CONSTANTS.COLORS.PRODUCTION_LINE, strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case 'distribution':
        return (
          <div className="h-96">
            <ResponsiveContainer width={CHART_CONSTANTS.WIDTH.FULL} height={CHART_CONSTANTS.HEIGHT.FULL}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx={CHART_CONSTANTS.POSITIONS.CENTER}
                  cy={CHART_CONSTANTS.POSITIONS.CENTER}
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={CHART_CONSTANTS.RADIUS.PIE}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [new Intl.NumberFormat('es-ES', {
                    style: 'currency',
                    currency: 'EUR'
                  }).format(value), 'Valor']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de gráficos */}
      <div className="glass-panel">
        <h3 className="text-lg font-semibold mb-4">
           Visualización de Datos
        </h3>

        <div className="chart-selector-grid">
          {chartTypes.map((chart) => (
            <button
              key={chart.id}
              onClick={() => setActiveChart(chart.id)}
              className={`chart-selector-btn ${activeChart === chart.id ? 'active' : ''}`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">{chart.icon}</div>
                <div className="font-medium">{chart.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico activo */}
      <div className="glass-panel">
        <div className="mb-4">
          <h3 className="text-xl font-semibold">
            {chartTypes.find(c => c.id === activeChart)?.label}
          </h3>
        </div>

        {renderChart()}

        {/* Información adicional */}
        <div className="chart-footer">
          <div className="chart-stats-grid">
            <div>
              <span className="text-secondary">Inversión Inicial:</span>
              <span className="ml-2 font-semibold text-primary">
                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(finalYear.investment)}
              </span>
            </div>
            <div>
              <span className="text-secondary">Valor Final:</span>
              <span className="ml-2 font-semibold text-primary">
                {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(finalYear.acumulado)}
              </span>
            </div>
            <div>
              <span className="text-secondary">ROI Total:</span>
              <span className="ml-2 font-semibold text-accent-success">
                {finalYear.roi}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedCharts;