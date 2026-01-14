import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { CHART_CONSTANTS } from '../../core/config/constants';

const tooltipContentStyle = { backgroundColor: CHART_CONSTANTS.COLORS.TOOLTIP_BG, borderColor: CHART_CONSTANTS.COLORS.GRID };
const tooltipItemStyle = { color: CHART_CONSTANTS.COLORS.TOOLTIP_TEXT };

export const ProductionChart = ({ data }) => {
    // Definir constantes de fallback por si no se pasan como props
    const color = CHART_CONSTANTS.COLORS.PRODUCTION;
    const key = "production";
    const name = "Producción";
    
    // Si data usa 'month' como numero (1,2,3), lo mapeamos a nombre corto
    const processedData = data ? data.map(d => ({
        ...d,
        name: typeof d.month === 'number' ? 
            ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.month-1] : 
            d.month || d.name
    })) : [];

    return (
      <div className="glass-panel chart-panel">
        <h3 className="chart-title">Producción vs Consumo</h3>
        <div className="chart-container">
          <ResponsiveContainer width={CHART_CONSTANTS.WIDTH.FULL} height={CHART_CONSTANTS.HEIGHT.DEFAULT}>
            <AreaChart data={processedData}>
              <defs>
                <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0.05} stopColor={color} stopOpacity={0.8}/>
                  <stop offset={0.95} stopColor={color} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_CONSTANTS.COLORS.GRID} />
              <XAxis dataKey="name" stroke={CHART_CONSTANTS.COLORS.TEXT} />
              <YAxis stroke={CHART_CONSTANTS.COLORS.TEXT} />
              <Tooltip 
                contentStyle={tooltipContentStyle}
                itemStyle={tooltipItemStyle}
              />
              <Legend />
              {/* Usamos las claves correctas que espera el ResultsView: 'production' y 'consumption' */}
              <Area type="monotone" dataKey="production" stroke={color} fillOpacity={1} fill="url(#colorProd)" name={name} />
              <Area type="monotone" dataKey="consumption" stroke={CHART_CONSTANTS.COLORS.CONSUMPTION} fill="transparent" strokeDasharray="5 5" name="Consumo Estimado" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
};

export const FinancialChart = ({ data }) => {
    // Procesar datos para asegurar que tengan la clave correcta
    // ResultsView pasa: { year, balance, savings, costs }
    // FinancialChart antigua esperaba: { year, acumulado }
    const processedData = data ? data.map(d => ({
        ...d,
        acumulado: d.balance || d.acumulado // Soporte dual
    })) : [];

    return (
      <div className="glass-panel chart-panel">
        <h3 className="chart-title">Flujo de Caja Acumulado</h3>
        <div className="chart-container">
          <ResponsiveContainer width={CHART_CONSTANTS.WIDTH.FULL} height={CHART_CONSTANTS.HEIGHT.DEFAULT}>
            <BarChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_CONSTANTS.COLORS.GRID} />
              <XAxis dataKey="year" stroke={CHART_CONSTANTS.COLORS.TEXT} />
              <YAxis stroke={CHART_CONSTANTS.COLORS.TEXT} />
              <Tooltip 
                contentStyle={tooltipContentStyle}
                itemStyle={tooltipItemStyle}
              />
              <Legend />
              <Bar dataKey="acumulado" fill={CHART_CONSTANTS.COLORS.BALANCE} name="Balance Acumulado (€)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
};
