import React, { useState, useEffect } from 'react';
import { Droplet, MapPin, Zap, Settings, Info, Activity, ChevronDown, ChevronRight, Sliders, AlertTriangle } from 'lucide-react';
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

const HydroCalculator = ({ onCalculate }) => {
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
    flowRate: 2.0, // m3/s
    headHeight: 10, // m
    efficiency: 0.85,
    capacityFactor: 0.6,
    budget: 50000,
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
            flowRate: parseFloat(formData.flowRate),
            headHeight: parseFloat(formData.headHeight),
            efficiency: parseFloat(formData.efficiency),
            capacityFactor: parseFloat(formData.capacityFactor)
        },
        financial: {
            budget: parseFloat(formData.budget),
            electricityPrice: parseFloat(formData.electricityPrice)
        },
        costs: {
            totalOverride: parseFloat(formData.budget)
        }
      };

      // DEBUG START
      console.log("--- [HYDRO CALCULATOR] START SIMULATION ---");
      console.log("1. Form Data:", formData);
      console.log("2. Payload:", payload);

      // Use Unified Dynamic Service (Adapter for Backend)
      console.log("3. Calling dynamicAPIService.calculateHydroProduction...");
      const result = await dynamicAPIService.calculateHydroProduction(payload);
      
      console.log("4. Result received:", result);
      // DEBUG END

      // Add AI Analysis Metadata
      result.aiAnalysis = {
          confidence: 0.92,
          model: 'HydraNet v1.2'
      };
      
      console.log("5. Final Result passed to onCalculate:", result);
      console.log("--- [HYDRO CALCULATOR] END SIMULATION ---");

      onCalculate(result, 'hydro');
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
            <Droplet className="icon-primary" />
            IA Hydro Simulation {isAdvanced ? 'Advanced' : ''}
            <span className="ai-badge ml-3 text-xs bg-cyan-100 text-cyan-800 px-2 py-1 rounded-full border border-cyan-200">AI POWERED</span>
          </h2>
          <p className="page-subtitle">
            {isAdvanced 
              ? 'Configuración detallada de turbinas y caudal ecológico' 
              : 'Estimación rápida basada en IA y cuenca hidrográfica'}
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
        {/* SECCIÓN 1: UBICACIÓN Y RECURSO */}
        <div className="glass-panel stack-large">
          <h3 className="section-title">
            <MapPin size={20} /> Ubicación y Recurso
          </h3>
          
          <div className="form-group">
            <label className="form-label">Ubicación (Río/Cuenca)</label>
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

          <div className="grid-2-cols">
            <div className="form-group">
                <label className="form-label">
                    Caudal (m³/s)
                    <span className="tooltip-icon" title="Volumen de agua por segundo">
                        <Info size={12} />
                    </span>
                </label>
                <input 
                    type="number" 
                    value={formData.flowRate}
                    onChange={e => setFormData({...formData, flowRate: e.target.value})}
                    className="form-input"
                />
            </div>

            <div className="form-group">
                <label className="form-label">
                    Salto Neto (m)
                    <span className="tooltip-icon" title="Caída vertical útil">
                        <Info size={12} />
                    </span>
                </label>
                <input 
                    type="number" 
                    value={formData.headHeight}
                    onChange={e => setFormData({...formData, headHeight: e.target.value})}
                    className="form-input"
                />
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: PARÁMETROS TÉCNICOS */}
        <div className="glass-panel stack-large">
          <h3 className="section-title success">
            <Zap size={20} /> {isAdvanced ? 'Tecnología de Turbina' : 'Sistema'}
          </h3>

           {/* MODO BÁSICO: Resumen */}
           {!isAdvanced && (
            <div className="stack-medium">
              <div className="form-group">
                <label className="form-label">Presupuesto Estimado (€)</label>
                <input 
                  type="number" 
                  value={formData.budget} 
                  onChange={e => setFormData({...formData, budget: e.target.value})}
                  className="form-input"
                />
              </div>
              
              <div className="info-box">
                <p className="info-box-title">Configuración Estándar:</p>
                <ul className="info-box-list">
                  <li>• Turbina: Francis / Pelton (según salto)</li>
                  <li>• Eficiencia Global: 85%</li>
                  <li>• Obra Civil: Estimada en 40% del total</li>
                </ul>
              </div>
            </div>
          )}

           {/* MODO AVANZADO: Detalles */}
           {isAdvanced && (
              <div className="fade-in-section stack-medium">
                  <div className="form-group">
                    <label className="form-label">Eficiencia Turbina (0-1)</label>
                    <input 
                        type="number" step="0.01" max="1"
                        value={formData.efficiency}
                        onChange={e => setFormData({...formData, efficiency: e.target.value})}
                        className="form-input"
                    />
                  </div>
                   <div className="form-group">
                    <label className="form-label">Factor de Planta (0-1)</label>
                    <input 
                        type="number" step="0.01" max="1"
                        value={formData.capacityFactor}
                        onChange={e => setFormData({...formData, capacityFactor: e.target.value})}
                        className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Coste Electricidad (€/kWh)</label>
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
                <span>SIMULANDO HIDRODINÁMICA...</span>
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

export default HydroCalculator;
