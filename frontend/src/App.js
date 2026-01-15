import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfigProvider, useConfig } from './core/contexts/ConfigContext';
import { SettingsProvider } from './core/contexts/SettingsContext';
import Layout from './shared/components/Layout';
import AdvancedSolarCalculator from './features/calculators/AdvancedSolarCalculator';
import AdvancedWindCalculator from './features/calculators/AdvancedWindCalculator';
import HydroCalculator from './features/calculators/HydroCalculator';
import BiomassCalculator from './features/calculators/BiomassCalculator';
import SolarPaybackCalculator from './shared/components/SolarPaybackCalculator';
import SimplePaybackWidget from './shared/components/SimplePaybackWidget';
import ResultsView from './features/results/ResultsView';
import aiService from './core/services/aiService';
import './styles/dark-technical.css';

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
    if (activeView === 'results') {
      return (
        <ResultsView 
          data={results} 
          type={resultType} 
          onBack={() => setActiveView('solar')} 
        />
      );
    }

    // Vistas de Calculadoras (Renderizadas según el Sidebar)
    return (
      <div className="calculator-content animate-fade-in">
        {activeView === 'solar' && (
            <>
              <AdvancedSolarCalculator onCalculate={(res) => handleCalculate(res, 'solar')} />
              <div className="mt-8">
                <SolarPaybackCalculator />
                <SimplePaybackWidget />
              </div>
            </>
        )}
        {activeView === 'simple-solar' && (
            <SolarPaybackCalculator />
        )}
        {activeView === 'wind' && (
            <AdvancedWindCalculator onCalculate={(res) => handleCalculate(res, 'wind')} />
        )}
        {activeView === 'hydro' && (
            <HydroCalculator onCalculate={(res) => handleCalculate(res, 'hydro')} />
        )}
        {activeView === 'biomass' && (
            <BiomassCalculator onCalculate={(res) => handleCalculate(res, 'biomass')} />
        )}
      </div>
    );
  };
  return (
    <Layout activeView={activeView} onViewChange={setActiveView}>
      {renderContent()}
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