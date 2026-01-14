import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, DollarSign, Zap, Home, Sun, MapPin, Settings } from 'lucide-react';
import dynamicAPIService from '../../core/services/dynamicAPIService';
import energyService from '../../core/services/aiService';
import { ECONOMIC_DEFAULTS, UI_DEFAULTS, PHYSICS_CONSTANTS, CALCULATION_CONSTANTS } from '../../core/config/constants';
import { useConfig } from '../../core/contexts/ConfigContext';
import '../../styles/dark-technical.css';

const SolarPaybackCalculator = ({ onCalculate }) => {
  const { config } = useConfig();
  const [cities, setCities] = useState([]);
  const [panels, setPanels] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    systemSize: UI_DEFAULTS.SIMPLE.DEFAULT_SYSTEM_SIZE,
    panelCost: UI_DEFAULTS.SIMPLE.DEFAULT_PANEL_COST,
    installationCost: UI_DEFAULTS.SIMPLE.DEFAULT_INSTALLATION_COST,
    electricityPrice: ECONOMIC_DEFAULTS.DEFAULT_ELECTRICITY_PRICE,
    monthlyConsumption: UI_DEFAULTS.SOLAR.DEFAULT_CONSUMPTION,
    region: UI_DEFAULTS.INITIAL_CITY,
    latitude: UI_DEFAULTS.INITIAL_LAT,
    longitude: UI_DEFAULTS.INITIAL_LON,
    annualIncrease: UI_DEFAULTS.SIMPLE.DEFAULT_ANNUAL_INCREASE,
    selectedPanel: '',
    panelCount: UI_DEFAULTS.SOLAR.DEFAULT_PANEL_COUNT,
    tilt: PHYSICS_CONSTANTS.OPTIMAL_TILT,
    azimuth: PHYSICS_CONSTANTS.OPTIMAL_AZIMUTH,
    efficiency: PHYSICS_CONSTANTS.SOLAR_DEFAULT_EFFICIENCY
  });

  const [results, setResults] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [citiesData, panelsData] = await Promise.all([
          dynamicAPIService.getSpanishCities(),
          dynamicAPIService.getSolarPanels().catch(e => [])
        ]);
        setCities(citiesData || []);
        setPanels(panelsData || []);
        await energyService.initialize();
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) calculatePayback();
  }, [formData, loading]);

  const calculatePayback = async () => {
    try {
      const prediction = await energyService.predictSolar(
        formData.latitude, 
        formData.longitude, 
        formData.systemSize,
        {
          tilt: formData.tilt,
          azimuth: formData.azimuth,
          efficiency: formData.efficiency
        }
      );
      const production = prediction.annualProduction;
      
      // Coste total = (Coste Panel * Potencia) + (Coste Instalación * Potencia)
      const totalCost = formData.systemSize * (formData.panelCost + formData.installationCost);
      
      const economics = await energyService.analyzeEconomics(
        totalCost, 
        production, 
        ECONOMIC_DEFAULTS.DEFAULT_SELF_CONSUMPTION, 
        ECONOMIC_DEFAULTS.DEFAULT_PROJECT_LIFESPAN,
        {
          electricityPrice: formData.electricityPrice,
          annualIncrease: formData.annualIncrease
        }
      );

       // Generar datos para gráficos (compatibilidad con ResultsView)
      // Aseguramos que monthlyDistribution sea un array de números
      const monthlyValues = Array.isArray(prediction.monthlyDistribution) 
           ? prediction.monthlyDistribution 
           : [];
           
      const monthlyData = monthlyValues.map((val, i) => ({
        name: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i],
        production: val,
        consumo: formData.monthlyConsumption 
      }));

      // Backend ya devuelve cashFlows completos con cumulative y netFlow
      const financialData = economics.cashFlows.map((flow) => {
        return {
           year: flow.year,
           acumulado: flow.cumulative,
           profit: flow.netFlow,
           investment: totalCost,
           roi: totalCost > 0 ? ((flow.cumulative / totalCost) * CALCULATION_CONSTANTS.PERCENTAGE_DIVISOR).toFixed(1) : 0
        };
      });
      
      setResults({
        production,
        annualProduction: production, // Alias for ResultsView
        paybackPeriod: economics.payback, // Alias for ResultsView
        totalCost,
        ...economics,
        monthlyData,
        financialData,
        capacityFactor: (production / (formData.systemSize * 8760)) * 100
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numValue = parseFloat(value) || 0;
    
    setFormData(prev => {
      const updates = { [name]: numValue };
      
      // Si cambia el número de paneles y hay un panel seleccionado, actualizar potencia total
      if (name === 'panelCount' && prev.selectedPanel) {
        const panel = panels.find(p => p.id === prev.selectedPanel);
        if (panel) {
          updates.systemSize = (numValue * panel.power) / CALCULATION_CONSTANTS.W_TO_KW;
        }
      }
      
      return { ...prev, ...updates };
    });
  };

  const handleCityChange = (e) => {
    const city = cities.find(c => c.name === e.target.value);
    if (city) {
      setFormData(prev => ({
        ...prev,
        region: city.name,
        latitude: city.lat,
        longitude: city.lon
      }));
    }
  };

  const handlePanelChange = (e) => {
    const panelId = e.target.value;
    const panel = panels.find(p => p.id === panelId);
    
    if (panel) {
      setFormData(prev => ({
        ...prev,
        selectedPanel: panelId,
        efficiency: panel.efficiency / CALCULATION_CONSTANTS.PERCENTAGE_DIVISOR,
        systemSize: (prev.panelCount * panel.power) / CALCULATION_CONSTANTS.W_TO_KW
      }));
    } else {
      setFormData(prev => ({ ...prev, selectedPanel: '' }));
    }
  };

  if (loading) return <div className="loading-spinner">Cargando...</div>;

  return (
    <div className="glass-panel calculator-panel">
      <div className="panel-header">
        <Calculator className="panel-icon" />
        <h2>Calculadora de Retorno Simple</h2>
      </div>

      <div className="calculator-grid">
        <div className="input-section">
          {/* Ubicación */}
          <div className="form-group">
            <label><MapPin size={16} /> Ubicación</label>
            <select name="region" value={formData.region} onChange={handleCityChange} className="form-select">
              {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>

          {/* Selección de Panel */}
          <div className="form-row">
            <div className="form-group">
              <label><Sun size={16} /> Modelo de Panel</label>
              <select name="selectedPanel" value={formData.selectedPanel} onChange={handlePanelChange} className="form-select">
                <option value="">Personalizado (Manual)</option>
                {panels.map(p => (
                  <option key={p.id} value={p.id}>{p.manufacturer} {p.model} ({p.power}W)</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Nº Paneles</label>
              <input type="number" name="panelCount" value={formData.panelCount} onChange={handleChange} className="form-input" />
            </div>
          </div>

          {/* Parámetros del Sistema */}
          <div className="form-row">
            <div className="form-group">
              <label><Zap size={16} /> Potencia Total (kW)</label>
              <input 
                type="number" 
                name="systemSize" 
                value={formData.systemSize} 
                onChange={handleChange} 
                className={`form-input ${formData.selectedPanel ? 'opacity-50 cursor-not-allowed' : ''}`}
                readOnly={!!formData.selectedPanel}
              />
            </div>
            <div className="form-group">
              <label>Consumo Mensual (kWh)</label>
              <input type="number" name="monthlyConsumption" value={formData.monthlyConsumption} onChange={handleChange} className="form-input" />
            </div>
          </div>

          {/* Configuración Técnica */}
          <div className="form-row">
            <div className="form-group">
              <label><Settings size={16} /> Inclinación (º)</label>
              <input type="number" name="tilt" value={formData.tilt} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label>Orientación (º)</label>
              <input type="number" name="azimuth" value={formData.azimuth} onChange={handleChange} className="form-input" />
            </div>
          </div>

          {/* Costes */}
          <div className="form-row">
            <div className="form-group">
              <label><DollarSign size={16} /> Coste Panel (€/kW)</label>
              <input type="number" name="panelCost" value={formData.panelCost} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label><Home size={16} /> Instalación (€/kW)</label>
              <input type="number" name="installationCost" value={formData.installationCost} onChange={handleChange} className="form-input" />
            </div>
          </div>

          {/* Económico */}
          <div className="form-row">
            <div className="form-group">
              <label><DollarSign size={16} /> Precio Luz (€/kWh)</label>
              <input type="number" name="electricityPrice" step="0.01" value={formData.electricityPrice} onChange={handleChange} className="form-input" />
            </div>
            <div className="form-group">
              <label><TrendingUp size={16} /> Incremento Anual (%)</label>
              <input type="number" name="annualIncrease" step="0.1" value={formData.annualIncrease} onChange={handleChange} className="form-input" />
            </div>
          </div>
        </div>

        {results && (
          <div className="results-section">
            <div className="result-card highlight">
              <DollarSign className="result-icon warning" />
              <div className="result-content">
                <span className="result-label">Ahorro Anual</span>
                <span className="result-value warning">{Math.round(results.annualSavings)} €</span>
                <span className="result-sub">Producción: {Math.round(results.production)} kWh</span>
              </div>
            </div>

            <div className="result-card highlight">
              <TrendingUp className="result-icon primary" />
              <div className="result-content">
                <span className="result-label">Retorno (ROI)</span>
                <span className="result-value primary">{results.roi}%</span>
                <span className="result-sub">Inversión: {Math.round(results.totalCost)} €</span>
              </div>
            </div>

            <div className="result-card highlight">
              <Zap className="result-icon success" />
              <div className="result-content">
                <span className="result-label">Payback</span>
                <span className="result-value success">{results.payback} años</span>
                <span className="result-sub">Amortización estimada</span>
              </div>
            </div>

            <button 
              className="btn-primary w-full mt-4 flex items-center justify-center gap-2 max-w-md mx-auto"
              onClick={() => onCalculate && onCalculate(results)}
            >
              <TrendingUp size={18} />
              Ver Resultados Detallados
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SolarPaybackCalculator;
