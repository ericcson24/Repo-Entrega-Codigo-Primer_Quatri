import React, { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfigProvider, useConfig } from './core/contexts/ConfigContext';
import { SettingsProvider } from './core/contexts/SettingsContext';
import Layout from './shared/components/Layout';
import AdvancedSolarCalculator from './features/calculators/AdvancedSolarCalculator';
import AdvancedWindCalculator from './features/calculators/AdvancedWindCalculator';
import SolarPaybackCalculator from './shared/components/SolarPaybackCalculator';
import ResultsView from './features/results/ResultsView';
import aiService from './core/services/aiService';
import SimulationForm from './components/Simulation/SimulationForm';
import './styles/dark-technical.css';
import './index.css'; // Ensure tailwind directives are here if possible, or standard clean css

const AppContent = () => {
  const { config, loading, error } = useConfig();
  const [activeView, setActiveView] = useState('solar');
  const [results, setResults] = useState(null);
  const [resultType, setResultType] = useState('solar'); // Track type

  useEffect(() => {
    if (config) {
      aiService.setConfig(config);
    }
  }, [config]);

  const handleCalculate = (newResults, type = 'solar') => {
    setResults(newResults);
    setResultType(type);
    setActiveView('results');
  };

  const [simulationResults, setSimulationResults] = useState(null);

  const handleSimulationComplete = (results) => {
    setSimulationResults(results);
  };

  const handleReset = () => {
    setSimulationResults(null);
  };

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p className="loading-text">INITIALIZING SYSTEM...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-error-screen">
        <p>SYSTEM ERROR: {error}</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case 'solar':
        return <AdvancedSolarCalculator onCalculate={(res) => handleCalculate(res, 'solar')} />;
      case 'simple-solar':
        return <SolarPaybackCalculator onCalculate={(res) => handleCalculate(res, 'solar')} />;
      case 'wind':
        return <AdvancedWindCalculator onCalculate={(res) => handleCalculate(res, 'wind')} />;
      case 'results':
        return <ResultsView results={results} type={resultType} onBack={() => setActiveView(resultType)} />;
      case 'simulation':
        return (
          <SimulationForm onSimulationComplete={handleSimulationComplete} />
        );
      default:
        return <AdvancedSolarCalculator onCalculate={(res) => handleCalculate(res, 'solar')} />;
    }
  };
  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      <div className="min-h-screen bg-gray-100 p-8">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-800">
            Simulador de Inversiones en Energías Renovables con IA
          </h1>
          <p className="text-gray-600 mt-2">
            Predicción de generación, precios de mercado y análisis financiero (VAN, TIR).
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          {!simulationResults ? (
            <SimulationForm onSimulationComplete={handleSimulationComplete} />
          ) : (
            <div className="bg-white p-6 rounded shadow">
               <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-green-700">Resultados de la Simulación</h2>
                  <button 
                      onClick={handleReset}
                      className="text-sm text-blue-500 hover:text-blue-700 underline"
                  >
                      Nueva Simulación
                  </button>
               </div>
               
               {/* Simple Dashboard Inline - To be separated later */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                   <div className="p-4 bg-blue-50 rounded border border-blue-200">
                       <p className="text-sm text-gray-500">VAN (NPV)</p>
                       <p className="text-2xl font-bold text-blue-700">
                           {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(simulationResults.financials.npv_eur)}
                       </p>
                   </div>
                   <div className="p-4 bg-green-50 rounded border border-green-200">
                       <p className="text-sm text-gray-500">TIR (IRR)</p>
                       <p className="text-2xl font-bold text-green-700">
                           {simulationResults.financials.irr_percent.toFixed(2)}%
                       </p>
                   </div>
                   <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                       <p className="text-sm text-gray-500">Payback</p>
                       <p className="text-2xl font-bold text-yellow-700">
                           {simulationResults.financials.payback_years !== null 
                              ? `${parseFloat(simulationResults.financials.payback_years).toFixed(1)} Años` 
                              : '> 25 Años'}
                       </p>
                   </div>
               </div>

               <div className="bg-gray-50 p-4 rounded text-xs text-gray-500 font-mono overflow-auto h-64">
                   <pre>{JSON.stringify(simulationResults, null, 2)}</pre>
               </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <ConfigProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </ConfigProvider>
    </ThemeProvider>
  );
};

export default App;