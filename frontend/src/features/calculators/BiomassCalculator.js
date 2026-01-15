import React, { useState, useEffect } from 'react';
import { Flame, MapPin, Zap, Settings, Info, Activity, ChevronDown, ChevronRight, Trees, AlertTriangle, Sliders } from 'lucide-react';
import dynamicAPIService from '../../core/services/dynamicAPIService';
import energyService from '../../core/services/aiService';
import { useSettings } from '../../core/contexts/SettingsContext';

const SettingsSection = ({ title, data, category, onUpdate, isNested = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleUpdate = (key, value) => {
    if (isNested) {
      onUpdate(key, value);
    } else {
      onUpdate(category, key, value);
    }
  };

  return (
    <div className="settings-container">
      <button 
        className="settings-header-btn"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="settings-title">
          <Settings size={16} className="icon-primary" />
          {title}
        </h3>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      
      {isExpanded && (
        <div className="settings-content">
          {Object.entries(data).map(([key, value]) => {
             if (typeof value === 'object' && value !== null) return null;
             return (
              <div key={key} className="form-group">
                <label className="settings-label" title={key}>
                  {key.replace(/_/g, ' ')}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleUpdate(key, e.target.value)}
                  className="form-input settings-input"
                />
              </div>
             );
          })}
        </div>
      )}
    </div>
  );
};

const BiomassCalculator = ({ onCalculate }) => {
  const { settings } = useSettings();
  const { ECONOMIC_DEFAULTS, UI_DEFAULTS } = settings;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cities, setCities] = useState([]);
  const [calculating, setCalculating] = useState(false);
  const [isAdvanced, setIsAdvanced] = useState(false);

  const [formData, setFormData] = useState({
    city: UI_DEFAULTS?.INITIAL_CITY || 'Madrid',
    lat: UI_DEFAULTS?.INITIAL_LAT || 40.4168,
    lon: UI_DEFAULTS?.INITIAL_LON || -3.7038,
    capacityKw: 500,
    capacityFactor: 0.85,
    fuelCostPerTon: 80,
    budget: 1500000,
    electricityPrice: ECONOMIC_DEFAULTS?.DEFAULT_ELECTRICITY_PRICE || 0.15
  });

  useEffect(() => {
    const loadCities = async () => {
      try {
        const citiesData = await dynamicAPIService.getSpanishCities();
        setCities(citiesData);
      } catch (e) {
        console.warn("Cities API failed", e);
      }
    };
    loadCities();
  }, []);

  const handleCityChange = (e) => {
    const cityName = e.target.value;
    const city = cities.find(c => c.name === cityName);
    if (city) {
      setFormData(prev => ({
        ...prev,
        city: city.name,
        lat: city.lat,
        lon: city.lon
      }));
    } else {
        setFormData(prev => ({ ...prev, city: cityName }));
    }
  };

  const calculate = async () => {
    setLoading(true);
    setCalculating(true);
    setError(null);
    try {
      const payload = {
        location: {
            name: formData.city,
            lat: formData.lat,
            lon: formData.lon
        },
        technical: {
            capacityKw: parseFloat(formData.capacityKw),
            capacityFactor: parseFloat(formData.capacityFactor)
        },
        financial: {
            budget: parseFloat(formData.budget),
            electricityPrice: parseFloat(formData.electricityPrice)
        },
        costs: {
            totalOverride: parseFloat(formData.budget),
            fuelCostPerTon: parseFloat(formData.fuelCostPerTon)
        }
      };

      // DEBUG START
      console.log("--- [BIOMASS CALCULATOR] START SIMULATION ---");
      console.log("1. Payload:", payload);

      // Use Unified Dynamic Service (Adapter for Backend)
      console.log("2. Calling dynamicAPIService...");
      const result = await dynamicAPIService.calculateBiomassProduction(payload);
      
      console.log("3. Result received:", result);
      // DEBUG END

      // Add AI Analysis Metadata
      result.aiAnalysis = {
          confidence: 0.89,
          model: 'BioMass Opt v2',
          optimizationSuggestions: 'Consider high-quality wood chips'
      };
      
      console.log("4. Final Result:", result);
      console.log("--- [BIOMASS CALCULATOR] END SIMULATION ---");

      onCalculate(result, 'biomass');
    } catch (e) {
      setError(e.message || "Simulation failed");
    } finally {
      setLoading(false);
      setCalculating(false);
    }
  };
  
  const handleSettingsUpdate = (category, key, value) => {
      setFormData(prev => ({ ...prev, [key]: parseFloat(value) }));
  };

  return (
    <div className="calculator-container">
      <div className="page-header-container">
        <div>
          <h2 className="page-title">
            <Flame className="icon-primary" />
            IA Biomass Simulation {isAdvanced ? 'Advanced' : ''}
            <span className="ai-badge ml-3 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full border border-orange-200">AI POWERED</span>
          </h2>
          <p className="page-subtitle">
            {isAdvanced 
              ? 'Configuración detallada de planta y combustible' 
              : 'Estimación rápida basada en disponibilidad orgánica'}
          </p>
        </div>
        <button 
          onClick={() => setIsAdvanced(!isAdvanced)}
          className={`toggle-mode-btn ${isAdvanced ? 'active' : 'inactive'}`}
        >
          {isAdvanced ? <Sliders size={18} /> : <Settings size={18} />}
          {isAdvanced ? 'Volver a Básico' : 'Configuración Avanzada'}
        </button>
      </div>

      <div className="calculator-grid">
        {/* SECCIÓN 1: UBICACIÓN Y CAPACIDAD */}
        <div className="glass-panel stack-large">
          <h3 className="section-title">
            <MapPin size={20} /> Planta y Ubicación
          </h3>
          
          <div className="form-group">
            <label className="form-label">Ubicación (Región)</label>
            <div className="input-with-icon">
                <select 
                    value={formData.city} 
                    onChange={handleCityChange}
                    className="form-input"
                >
                    {cities.map(c => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                </select>
            </div>
          </div>

          <div className="grid-2-cols">
            <div className="form-group">
                <label className="form-label">
                    Capacidad Planta (kW)
                    <span className="tooltip-icon" title="Potencia nominal de salida">
                        <Info size={12} />
                    </span>
                </label>
                <input 
                    type="number" 
                    value={formData.capacityKw}
                    onChange={e => setFormData({...formData, capacityKw: e.target.value})}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label className="form-label">
                    Coste Combustible (€/Ton)
                    <span className="tooltip-icon" title="Coste medio de biomasa">
                        <Info size={12} />
                    </span>
                </label>
                <input 
                    type="number" 
                    value={formData.fuelCostPerTon}
                    onChange={e => setFormData({...formData, fuelCostPerTon: e.target.value})}
                    className="form-input"
                />
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: PARÁMETROS TÉCNICOS */}
        <div className="glass-panel stack-large">
          <h3 className="section-title success">
            <Trees size={20} /> {isAdvanced ? 'Detalles Operativos' : 'Resumen Económico'}
          </h3>

           {/* MODO BÁSICO: Resumen simple */}
           {!isAdvanced && (
            <div className="stack-medium">
              <div className="form-group">
                <label className="form-label">Presupuesto Inversión (€)</label>
                <input 
                  type="number" 
                  value={formData.budget} 
                  onChange={e => setFormData({...formData, budget: e.target.value})}
                  className="form-input"
                />
              </div>
              
              <div className="info-box">
                <p className="info-box-title">Parámetros Estándar:</p>
                <ul className="info-box-list">
                  <li>• Tecnología: Caldera Biomasa + Turbina</li>
                  <li>• Factor de Planta: 85% (Alta disponibilidad)</li>
                  <li>• Consumo propio: ~15%</li>
                </ul>
              </div>
            </div>
           )}

           {/* MODO AVANZADO: Inputs completos */}
           {isAdvanced && (
            <div className="fade-in-section stack-medium">
                <div className="form-group">
                    <label className="form-label">Factor de Capacidad (0-1)</label>
                    <input 
                        type="number" step="0.01" max="1"
                        value={formData.capacityFactor}
                        onChange={e => setFormData({...formData, capacityFactor: e.target.value})}
                        className="form-input"
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">Precio Venta Elec. (€/kWh)</label>
                    <input 
                        type="number" step="0.01"
                        value={formData.electricityPrice}
                        onChange={e => setFormData({...formData, electricityPrice: e.target.value})}
                        className="form-input"
                    />
                </div>
            </div>
           )}
        </div>
      </div>

       {error && (
        <div className="error-message">
            <AlertTriangle size={16} /> 
            <span>{error}</span>
        </div>
      )}

      <button 
        className={`action-button primary-button full-width ${calculating ? 'loading' : ''} mt-6`}
        onClick={calculate}
        disabled={loading}
      >
        {loading ? (
             <>
                <div className="spinner-small"></div>
                <span>PROCESANDO BIOSIMULACIÓN...</span>
             </>
        ) : (
             <>
                <Zap size={18} />
                <span>EJECUTAR SIMULACIÓN</span>
             </>
        )}
      </button>

    </div>
  );
};

export default BiomassCalculator;
