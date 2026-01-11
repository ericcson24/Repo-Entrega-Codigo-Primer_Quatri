import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConfigProvider, useConfig } from './core/contexts/ConfigContext';
import { SettingsProvider } from './core/contexts/SettingsContext';
import Layout from './shared/components/Layout';
import AdvancedSolarCalculator from './features/calculators/AdvancedSolarCalculator';
import AdvancedWindCalculator from './features/calculators/AdvancedWindCalculator';
import SolarPaybackCalculator from './shared/components/SolarPaybackCalculator';
import ResultsView from './features/results/ResultsView';
import aiService from './core/services/aiService';
import './styles/dark-technical.css';

const AppContent = () => {
  const { config, loading, error } = useConfig();
  const [activeView, setActiveView] = useState('solar');
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (config) {
      aiService.setConfig(config);
    }
  }, [config]);

  const handleCalculate = (newResults) => {
    setResults(newResults);
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
    switch (activeView) {
      case 'solar':
        return <AdvancedSolarCalculator onCalculate={handleCalculate} />;
      case 'simple-solar':
        return <SolarPaybackCalculator onCalculate={handleCalculate} />;
      case 'wind':
        return <AdvancedWindCalculator onCalculate={handleCalculate} />;
      case 'results':
        return <ResultsView results={results} />;
      default:
        return <AdvancedSolarCalculator onCalculate={handleCalculate} />;
    }
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