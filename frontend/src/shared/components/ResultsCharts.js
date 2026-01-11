import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { CHART_CONSTANTS } from '../../core/config/constants';

const tooltipContentStyle = { backgroundColor: CHART_CONSTANTS.COLORS.TOOLTIP_BG, borderColor: CHART_CONSTANTS.COLORS.GRID };
const tooltipItemStyle = { color: CHART_CONSTANTS.COLORS.TOOLTIP_TEXT };

export const ProductionChart = ({ data, productionKey, productionColor, productionName }) => (
  <div className="glass-panel chart-panel">
    <h3 className="chart-title">Producción vs Consumo</h3>
    <div className="chart-container">
      <ResponsiveContainer width={CHART_CONSTANTS.WIDTH.FULL} height={CHART_CONSTANTS.HEIGHT.DEFAULT}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
              <stop offset={CHART_CONSTANTS.OFFSETS.GRADIENT_START} stopColor={productionColor} stopOpacity={CHART_CONSTANTS.OPACITY.HIGH}/>
              <stop offset={CHART_CONSTANTS.OFFSETS.GRADIENT_END} stopColor={productionColor} stopOpacity={CHART_CONSTANTS.OPACITY.LOW}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray={CHART_CONSTANTS.STROKE.DASH_3_3} stroke={CHART_CONSTANTS.COLORS.GRID} />
          <XAxis dataKey="name" stroke={CHART_CONSTANTS.COLORS.TEXT} />
          <YAxis stroke={CHART_CONSTANTS.COLORS.TEXT} />
          <Tooltip 
            contentStyle={tooltipContentStyle}
            itemStyle={tooltipItemStyle}
          />
          <Legend />
          <Area type="monotone" dataKey={productionKey} stroke={productionColor} fillOpacity={1} fill="url(#colorProd)" name={productionName} />
          <Area type="monotone" dataKey="consumo" stroke={CHART_CONSTANTS.COLORS.CONSUMPTION} fill="transparent" strokeDasharray={CHART_CONSTANTS.STROKE.DASH_5_5} name="Consumo" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export const FinancialChart = ({ data }) => (
  <div className="glass-panel chart-panel">
    <h3 className="chart-title">Flujo de Caja Acumulado</h3>
    <div className="chart-container">
      <ResponsiveContainer width={CHART_CONSTANTS.WIDTH.FULL} height={CHART_CONSTANTS.HEIGHT.DEFAULT}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray={CHART_CONSTANTS.STROKE.DASH_3_3} stroke={CHART_CONSTANTS.COLORS.GRID} />
          <XAxis dataKey="year" stroke={CHART_CONSTANTS.COLORS.TEXT} />
          <YAxis stroke={CHART_CONSTANTS.COLORS.TEXT} />
          <Tooltip 
            contentStyle={tooltipContentStyle}
          />
          <Bar dataKey="acumulado" fill={CHART_CONSTANTS.COLORS.BALANCE} name="Balance Acumulado (€)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);
