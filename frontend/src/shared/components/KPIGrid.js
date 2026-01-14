import React from 'react';
import { Zap, DollarSign, TrendingUp, Fan, Activity, Leaf, Coins, TreeDeciduous } from 'lucide-react';

export const KPIGrid = ({ metrics = {}, type = 'solar' }) => {
  const Icon = type === 'solar' ? Zap : Fan;
  
  // Extract normalized values
  const annualProd = metrics.annualProduction || metrics.totalGenerationFirstYear || 0;
  const roi = metrics.roi || 0;
  const payback = metrics.payback || metrics.paybackYears || metrics.paybackPeriod || 0;
  const annualSaving = metrics.annualSaving || (annualProd * 0.15) || 0;
  const lcoe = metrics.lcoe || 0; 
  const co2 = metrics.co2Abatement || 0;
  const trees = metrics.treesEquiv || 0;
  const totalSavings = metrics.totalSavings || 0;

  const kpis = [
      {
          label: 'Producción Año 1',
          value: annualProd > 0 ? Math.round(annualProd).toLocaleString() : '-',
          unit: 'kWh',
          sub: 'Simulación Física',
          icon: Icon
      },
      {
          label: 'Ahorro Estimado',
          value: annualSaving > 0 ? Math.round(annualSaving).toLocaleString() : '-',
          unit: '€/año',
          sub: 'Promedio anual',
          icon: DollarSign
      },
      {
          label: 'Retorno (ROI)',
          value: roi !== Infinity && !isNaN(roi) ? roi.toFixed(1) : '-',
          unit: '%',
          sub: 'Rentabilidad Total',
          icon: Activity
      },
      {
          label: 'Amortización',
          value: payback > 0 && payback < 25 ? payback.toFixed(1) : '25+',
          unit: 'años',
          sub: 'Payback Period',
          icon: TrendingUp
      },
      {
          label: 'LCOE',
          value: lcoe > 0 ? lcoe.toFixed(3) : '-',
          unit: '€/kWh',
          sub: 'Coste Levelizado',
          icon: Coins
      },
      {
          label: 'Ahorro Total',
          value: totalSavings > 0 ? Math.round(totalSavings).toLocaleString() : '-',
          unit: '€',
          sub: 'Vida útil (25 años)',
          icon: TrendingUp
      },
      {
          label: 'CO2 Evitado',
          value: co2 > 1000 ? (co2/1000).toFixed(2) : Math.round(co2),
          unit: co2 > 1000 ? 'Ton' : 'kg',
          sub: 'Huella Carbono',
          icon: Leaf
      },
      {
          label: 'Árboles Equiv.',
          value: Math.round(trees),
          unit: 'árboles',
          sub: 'Impacto positivo',
          icon: TreeDeciduous
      }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {kpis.map((kpi, index) => (
        <div key={index} className="glass-card kpi-card p-4 flex flex-row items-center space-x-4">
            <div className={`p-3 rounded-full bg-opacity-20 ${index < 4 ? 'bg-blue-500' : 'bg-green-500'} text-white`}>
                <kpi.icon size={24} />
            </div>
            <div>
                <h3 className="text-sm text-gray-400">{kpi.label}</h3>
                <div className="flex items-baseline space-x-1">
                    <span className="text-2xl font-bold">{kpi.value}</span>
                    <span className="text-xs text-gray-500">{kpi.unit}</span>
                </div>
                <span className="text-xs text-gray-600 block">{kpi.sub}</span>
            </div>
        </div>
      ))}
    </div>
  );
};
