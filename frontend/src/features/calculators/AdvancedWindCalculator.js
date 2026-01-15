import React, { useState, useEffect } from 'react';
import { Wind, MapPin, Zap, Settings, Sliders, Info, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import dynamicAPIService from '../../core/services/dynamicAPIService';
import energyService from '../../core/services/aiService';
import { useSettings } from '../../core/contexts/SettingsContext';
import { useConfig } from '../../core/contexts/ConfigContext';

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

const AdvancedWindCalculator = ({ onCalculate }) => {
  const { config } = useConfig();
  const { settings, updateSetting, resetSettings } = useSettings();
  const { PHYSICS_CONSTANTS, ECONOMIC_DEFAULTS, UI_DEFAULTS, CALCULATION_CONSTANTS } = settings;

  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [cities, setCities] = useState([]);
  const [turbines, setTurbines] = useState([]);
  const [isAdvanced, setIsAdvanced] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    city: UI_DEFAULTS.WIND_INITIAL_CITY, // Zaragoza suele tener más viento
    lat: UI_DEFAULTS.WIND_INITIAL_LAT,
    lon: UI_DEFAULTS.WIND_INITIAL_LON,
    selectedTurbine: '',
    turbinePower: UI_DEFAULTS.WIND.DEFAULT_TURBINE_POWER, // kW
    turbineHeight: UI_DEFAULTS.WIND.DEFAULT_TURBINE_HEIGHT, // metros
    budget: UI_DEFAULTS.WIND.DEFAULT_BUDGET, // €
    consumption: UI_DEFAULTS.WIND.DEFAULT_CONSUMPTION, // kWh/mes
    minWindSpeed: PHYSICS_CONSTANTS.WIND_CUT_IN_SPEED,
    rotorDiameter: UI_DEFAULTS.WIND.DEFAULT_ROTOR_DIAMETER, // metros
    electricityPrice: ECONOMIC_DEFAULTS.DEFAULT_ELECTRICITY_PRICE
  });

  // Carga inicial de datos
  useEffect(() => {
    const loadData = async () => {
      try {
        const [citiesData, turbinesData, pricesData] = await Promise.all([
          dynamicAPIService.getSpanishCities(),
          dynamicAPIService.getWindTurbines().catch(e => []),
          dynamicAPIService.getEnergyPrices().catch(e => null)
        ]);
        setCities(citiesData || []);
        setTurbines(turbinesData || []);
        
        if (pricesData && pricesData.averagePrice) {
          setFormData(prev => ({
            ...prev,
            electricityPrice: parseFloat((pricesData.averagePrice / CALCULATION_CONSTANTS.MWH_TO_KWH).toFixed(4)) // €/MWh -> €/kWh
          }));
        }

        await energyService.initialize();
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Manejadores de cambios
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
    }
  };

  const handleTurbineChange = (e) => {
    const turbineId = e.target.value;
    const turbine = turbines.find(t => t.id === turbineId);
    if (turbine) {
      setFormData(prev => ({
        ...prev,
        selectedTurbine: turbineId,
        turbinePower: turbine.power,
        rotorDiameter: turbine.rotorDiameter,
        turbineHeight: turbine.hubHeight,
        minWindSpeed: turbine.cutInSpeed || PHYSICS_CONSTANTS.WIND_CUT_IN_SPEED,
        ratedSpeed: turbine.ratedSpeed || PHYSICS_CONSTANTS.WIND_RATED_SPEED,
        cutOutSpeed: turbine.cutOutSpeed || PHYSICS_CONSTANTS.WIND_CUT_OUT_SPEED,
        budget: turbine.price * CALCULATION_CONSTANTS.INSTALLATION_COST_FACTOR 
      }));
    } else {
      setFormData(prev => ({ ...prev, selectedTurbine: '' }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseFloat(value) || value
    }));
  };

  // Cálculo principal
  const handleCalculate = async () => {
    setLoading(true);
    setCalculating(true);

    try {
      const simulationParams = {
        location: {
           lat: formData.lat,
           lon: formData.lon,
           altitude: 0 // Debería venir de mapa o API
        },
        technical: {
           turbineCapacityKw: parseFloat(formData.turbinePower),
           hubHeight: parseFloat(formData.turbineHeight),
           rotorDiameter: parseFloat(formData.rotorDiameter),
           cutIn: parseFloat(formData.minWindSpeed),
           roughness: PHYSICS_CONSTANTS.WIND_ROUGHNESS
        },
        financial: {
           electricityPrice: parseFloat(formData.electricityPrice),
           budget: parseFloat(formData.budget),
           annualConsumption: parseFloat(formData.consumption) * 12
        },
        costs: {
            totalOverride: parseFloat(formData.budget)
        }
      };

      // Llamada al backend real
      const result = await dynamicAPIService.calculateWindProduction(simulationParams);

      if (onCalculate) onCalculate(result);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setCalculating(false);
    }
  };

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
    </div>
  );

  return (
    <div className="calculator-container">
      <div className="page-header-container">
        <div>
          <h2 className="page-title">
            <Wind className="icon-primary" />
            IA Wind Simulation {isAdvanced ? 'Advanced' : ''}
            <span className="ai-badge ml-3 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full border border-blue-200">AI POWERED</span>
          </h2>
          <p className="page-subtitle">
            {isAdvanced 
              ? 'Configuración detallada de aerogeneradores y condiciones de viento' 
              : 'Estimación rápida de energía eólica basada en IA'}
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
        {/* SECCIÓN 1: UBICACIÓN Y CONSUMO */}
        <div className="glass-panel stack-large">
          <h3 className="section-title">
            <MapPin size={20} /> Datos Generales
          </h3>
          
          <div className="form-group">
            <label className="form-label">Ubicación (Ciudad)</label>
            <select 
              name="city" 
              value={formData.city} 
              onChange={handleCityChange}
              className="form-input"
            >
              {cities.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Consumo Mensual (kWh)</label>
            <input 
              type="number" 
              name="consumption" 
              value={formData.consumption} 
              onChange={handleInputChange}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Potencia Turbina (kW)</label>
            <input 
              type="number" 
              name="turbinePower" 
              value={formData.turbinePower} 
              onChange={handleInputChange}
              readOnly={!!formData.selectedTurbine}
              className={`form-input ${formData.selectedTurbine ? 'input-readonly' : ''}`}
            />
          </div>
        </div>

        {/* SECCIÓN 2: TÉCNICO */}
        <div className="glass-panel stack-large">
          <h3 className="section-title success">
            <Zap size={20} /> {isAdvanced ? 'Configuración Técnica' : 'Resumen Económico'}
          </h3>

          {!isAdvanced && (
            <div className="stack-medium">
              <div className="form-group">
                <label className="form-label">Presupuesto Estimado (€)</label>
                <input 
                  type="number" 
                  name="budget" 
                  value={formData.budget} 
                  onChange={handleInputChange}
                  className="form-input"
                />
                <p className="info-text mt-2">
                  <Info size={12} /> Incluye turbina e instalación
                </p>
              </div>
              
              <div className="info-box">
                <p className="info-box-title">Configuración por defecto:</p>
                <ul className="info-box-list">
                  <li>• Altura Torre: {formData.turbineHeight}m</li>
                  <li>• Diámetro Rotor: {formData.rotorDiameter}m</li>
                  <li>• Viento Mínimo: {formData.minWindSpeed} m/s</li>
                </ul>
              </div>
            </div>
          )}

          {isAdvanced && (
            <div className="fade-in-section stack-medium">
              <div className="form-group">
                <label className="form-label">Modelo de Turbina</label>
                <select 
                  name="selectedTurbine" 
                  value={formData.selectedTurbine} 
                  onChange={handleTurbineChange}
                  className="form-input"
                >
                  <option value="">Genérico (Manual)</option>
                  {turbines.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.manufacturer} {t.model} ({t.power}kW)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid-2-cols">
                <div className="form-group">
                  <label className="form-label">Altura Torre (m)</label>
                  <input 
                    type="number" 
                    name="turbineHeight" 
                    value={formData.turbineHeight} 
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Diámetro Rotor (m)</label>
                  <input 
                    type="number" 
                    name="rotorDiameter" 
                    value={formData.rotorDiameter} 
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid-2-cols">
                <div className="form-group">
                  <label className="form-label">Presupuesto (€)</label>
                  <input 
                    type="number" 
                    name="budget" 
                    value={formData.budget} 
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Precio Luz (€/kWh)</label>
                  <input 
                    type="number" 
                    name="electricityPrice" 
                    value={formData.electricityPrice} 
                    onChange={handleInputChange}
                    step="0.01"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid-3-cols">
                <div className="form-group">
                  <label className="form-label" title="Velocidad de arranque (Cut-in)">V. Arranque (m/s)</label>
                  <input 
                    type="number" 
                    name="minWindSpeed" 
                    value={formData.minWindSpeed} 
                    onChange={handleInputChange}
                    step="0.1"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" title="Velocidad nominal (Rated)">V. Nominal (m/s)</label>
                  <input 
                    type="number" 
                    name="ratedSpeed" 
                    value={formData.ratedSpeed || PHYSICS_CONSTANTS.WIND_RATED_SPEED} 
                    onChange={handleInputChange}
                    step="0.1"
                    className="form-input"
                  />
                </div>
                 <div className="form-group">
                  <label className="form-label" title="Velocidad de corte (Cut-out)">V. Corte (m/s)</label>
                  <input 
                    type="number" 
                    name="cutOutSpeed" 
                    value={formData.cutOutSpeed || PHYSICS_CONSTANTS.WIND_CUT_OUT_SPEED} 
                    onChange={handleInputChange}
                    step="0.1"
                    className="form-input"
                  />
                </div>
              </div>

              {/* GLOBAL SETTINGS SECTION */}
              <div className="separator-large">
                <div className="flex-between mb-4">
                  <h3 className="section-subtitle">
                    <Settings size={18} /> Configuración del Sistema
                  </h3>
                  <button 
                    onClick={resetSettings}
                    className="reset-btn"
                  >
                    <RotateCcw size={12} /> Restaurar Valores
                  </button>
                </div>
                <p className="section-description">Ajusta los parámetros globales de cálculo y visualización</p>

                <SettingsSection 
                  title="Constantes Físicas" 
                  data={PHYSICS_CONSTANTS} 
                  category="PHYSICS_CONSTANTS" 
                  onUpdate={updateSetting} 
                />
                
                <SettingsSection 
                  title="Parámetros Económicos" 
                  data={ECONOMIC_DEFAULTS} 
                  category="ECONOMIC_DEFAULTS" 
                  onUpdate={updateSetting} 
                />
                
                <SettingsSection 
                  title="Constantes de Cálculo" 
                  data={CALCULATION_CONSTANTS} 
                  category="CALCULATION_CONSTANTS" 
                  onUpdate={updateSetting} 
                />

                <SettingsSection 
                  title="Valores por Defecto UI (Eólica)" 
                  data={UI_DEFAULTS.WIND} 
                  isNested={true}
                  onUpdate={(key, value) => {
                    const newWindDefaults = { ...UI_DEFAULTS.WIND, [key]: parseFloat(value) || value };
                    updateSetting('UI_DEFAULTS', 'WIND', newWindDefaults);
                  }} 
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="action-footer">
        <button 
          onClick={handleCalculate} 
          disabled={calculating}
          className="btn-calculate"
        >
          {calculating ? (
            <>
              <div className="spinner-sm"></div>
              Procesando...
            </>
          ) : (
            <>
              <Zap size={20} />
              Calcular Rentabilidad
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdvancedWindCalculator;
