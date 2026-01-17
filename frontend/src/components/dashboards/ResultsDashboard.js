import React from 'react';
import { ArrowLeft, TrendingUp, DollarSign, Clock } from 'lucide-react';

const ResultsDashboard = ({ data, onBack }) => {
    const { financials, generation } = data;
    
    // Safety check in case financials is missing
    const npv = financials?.npv_eur || 0;
    const irr = financials?.irr_percent || 0;
    const payback = financials?.payback_years || 0;

    return (
        <div className="animate-fade-in">
            <button 
                onClick={onBack}
                className="mb-6 flex items-center text-gray-400 hover:text-white transition-colors"
            >
                <ArrowLeft size={16} className="mr-2" /> back to config
            </button>

            <header className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Simulación Completada</h2>
                <p className="text-gray-400">Análisis detallado de rendimiento y viabilidad financiera.</p>
            </header>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card-panel relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <DollarSign size={64} className="text-green-500" />
                    </div>
                    <p className="data-label">Net Present Value (VAN)</p>
                    <p className={`text-3xl font-bold ${npv >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(npv)}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Valor Actual Neto a 20 años</p>
                </div>

                <div className="card-panel relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <TrendingUp size={64} className="text-cyan-500" />
                    </div>
                    <p className="data-label">IRR (TIR)</p>
                    <p className="text-3xl font-bold text-cyan-400">
                        {irr.toFixed(2)} %
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Tasa Interna de Retorno</p>
                </div>

                <div className="card-panel relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Clock size={64} className="text-yellow-500" />
                    </div>
                    <p className="data-label">Payback Period</p>
                    <p className="text-3xl font-bold text-yellow-400">
                        {payback > 25 ? '> 25' : payback.toFixed(1)} <span className="text-lg text-gray-500">Años</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Tiempo de retorno de inversión</p>
                </div>
            </div>

            {/* Detailed Data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="card-panel">
                    <h3 className="text-lg font-semibold text-white mb-4">Output Log</h3>
                    <div className="bg-[#0f0f0f] p-4 rounded border border-gray-800 font-mono text-xs text-green-300 h-64 overflow-auto">
                        <pre>{JSON.stringify(data, null, 2)}</pre>
                    </div>
                </div>

                <div className="card-panel">
                    <h3 className="text-lg font-semibold text-white mb-4">Recomendaciones IA</h3>
                    <ul className="space-y-3">
                        <li className="flex gap-3 text-sm text-gray-300">
                            <span className="text-cyan-500 font-bold">1.</span>
                            {npv > 0 ? "El proyecto es financieramente viable con los parámetros actuales." : "El proyecto presenta riesgo financiero. Considere reducir presupuesto inicial."}
                        </li>
                         <li className="flex gap-3 text-sm text-gray-300">
                            <span className="text-cyan-500 font-bold">2.</span>
                            Considere la ubicación seleccionada. La irradiación/viento local tiene un impacto del 40% en el resultado.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ResultsDashboard;
