import React, { useState, useEffect } from 'react';
import { Sun, MapPin, Zap, Settings, Sliders, Info, ChevronDown, ChevronRight, RotateCcw, AlertTriangle } from 'lucide-react';
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

const AdvancedSolarCalculator = ({ onCalculate }) => {
  const { config: _config } = useConfig();
  const { settings, updateSetting, resetSettings } = useSettings();
  const { PHYSICS_CONSTANTS, ECONOMIC_DEFAULTS, UI_DEFAULTS, CALCULATION_CONSTANTS } = settings;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [calculationStep, setCalculationStep] = useState(''); // Feedback visual de pasos
  const [cities, setCities] = useState([]);
  const [panels, setPanels] = useState([]);
  const [batteries, setBatteries] = useState([]);
  const [isAdvanced, setIsAdvanced] = useState(false);

  // Estado del formulario
  const [formData, setFormData] = useState({
    city: UI_DEFAULTS.INITIAL_CITY,
    lat: UI_DEFAULTS.INITIAL_LAT,
    lon: UI_DEFAULTS.INITIAL_LON,
    selectedPanel: '',
    selectedBattery: '',
    systemSize: UI_DEFAULTS.SOLAR.DEFAULT_SYSTEM_SIZE, 
    panelPower: UI_DEFAULTS.SOLAR.DEFAULT_PANEL_POWER, 
    panelCount: UI_DEFAULTS.SOLAR.DEFAULT_PANEL_COUNT,
    budget: UI_DEFAULTS.SOLAR.DEFAULT_BUDGET, 
    consumption: UI_DEFAULTS.SOLAR.DEFAULT_CONSUMPTION, 
    batteryCapacity: UI_DEFAULTS.SOLAR.DEFAULT_BATTERY_CAPACITY, 
    hasBattery: false,
    tilt: PHYSICS_CONSTANTS.OPTIMAL_TILT,
    azimuth: PHYSICS_CONSTANTS.OPTIMAL_AZIMUTH,
    efficiency: PHYSICS_CONSTANTS.SOLAR_DEFAULT_EFFICIENCY,
    electricityPrice: ECONOMIC_DEFAULTS.DEFAULT_ELECTRICITY_PRICE
  });

  // Carga inicial de datos
  useEffect(() => {
    const loadData = async () => {
      setError(null);
      try {
        const [citiesData, panelsData, batteriesData, pricesData] = await Promise.all([
          dynamicAPIService.getSpanishCities(),
          dynamicAPIService.getSolarPanels().catch(e => []),
          dynamicAPIService.getBatteries().catch(e => []),
          dynamicAPIService.getEnergyPrices().catch(e => null)
        ]);
        
        if (!citiesData || citiesData.length === 0) {
            throw new Error("No se pudieron cargar las ciudades disponibles.");
        }

        setCities(citiesData || []);
        setPanels(panelsData || []);
        setBatteries(batteriesData || []);
        
        if (pricesData && pricesData.averagePrice) {
          // El precio de mercado (Pool) suele ser ~30-50% del precio final.
          // Aplicamos factor corrector para estimar precio consumidor (Peajes + Cargos + Impuestos)
          // aprox: (Pool + 0.08) * 1.21 (IVA)
          const poolPriceKwh = pricesData.averagePrice / CALCULATION_CONSTANTS.MWH_TO_KWH;
          const estimatedConsumerPrice = (poolPriceKwh + ECONOMIC_DEFAULTS.CONSUMER_PRICE_TOLLS) * ECONOMIC_DEFAULTS.VAT; 
          
          setFormData(prev => ({
            ...prev,
            electricityPrice: parseFloat(estimatedConsumerPrice.toFixed(4)) 
          }));
        } else {
             // Si falla API o es nulo, usar default definido en constantes (ya actualizado a 0.22)
            setFormData(prev => ({
                ...prev,
                electricityPrice: ECONOMIC_DEFAULTS.CONSUMER_PRICE || 0.22
            }));
        }
        
        // Inicializar servicio de energía
        await energyService.initialize();
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        setError("Error al cargar datos del servidor. Comprueba tu conexión o intenta recargar.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [CALCULATION_CONSTANTS.MWH_TO_KWH, ECONOMIC_DEFAULTS.CONSUMER_PRICE]);

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

  const handlePanelChange = (e) => {
    const panelId = e.target.value;
    const panel = panels.find(p => p.id === panelId);
    
    if (panel) {
      // Lógica Experta: Coste Real del Sistema
      // Coste Panel + BOS (Balance of System: Inversor, cables, estructura, mdo)
      // Estimación: BOS ~ 0.8 €/W para residencial
      const bosCostPerWatt = 0.8; 
      const panelCost = panel.totalPrice || (panel.power * 0.25); // fallback 0.25€/W
      const installationCostPerPanel = panel.power * bosCostPerWatt;
      const totalCostPerPanel = panelCost + installationCostPerPanel;

      const maxPanels = Math.floor(formData.budget / totalCostPerPanel);
      
      // Adaptación inteligente: Ajustar cantidad si excede presupuesto
      let newCount = formData.panelCount;
      if (newCount > maxPanels) {
          newCount = Math.max(1, maxPanels);
      }
      
      const newSystemSize = (newCount * panel.power) / 1000;

      setFormData(prev => ({
        ...prev,
        selectedPanel: panelId,
        panelPower: panel.power,
        panelCount: newCount,
        maxPanelsBudget: maxPanels,
        efficiency: panel.efficiency / CALCULATION_CONSTANTS.PERCENTAGE_DIVISOR,
        systemSize: parseFloat(newSystemSize.toFixed(2)),
        // Guardamos metadatos para UI
        currentPanelPrice: panel.totalPrice,
        currentTotalCostPerPanel: totalCostPerPanel
      }));
    } else {
      setFormData(prev => ({ 
          ...prev, 
          selectedPanel: '',
          currentPanelPrice: null,
          currentTotalCostPerPanel: null
      }));
    }
  };
  
  // Custom handler for Budget to constrain panels
  const handleBudgetUpdate = (e) => {
      const budget = parseFloat(e.target.value) || 0;
      
      let updates = { budget };
      
      if (formData.selectedPanel && panels.length > 0) {
          const panel = panels.find(p => p.id === formData.selectedPanel);
          if (panel) {
              const bosCostPerWatt = 0.8;
              const panelCost = panel.totalPrice || (panel.power * 0.25);
              const totalCostPerPanel = panelCost + (panel.power * bosCostPerWatt);
              
              const maxPanels = Math.floor(budget / totalCostPerPanel);
              updates.maxPanelsBudget = maxPanels;

              if (formData.panelCount > maxPanels) {
                  updates.panelCount = Math.max(1, maxPanels);
                  updates.systemSize = parseFloat(((updates.panelCount * panel.power) / 1000).toFixed(2));
              }
          }
      }
      setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleBatteryChange = (e) => {
    const batteryId = e.target.value;
    const battery = batteries.find(b => b.id === batteryId);
    if (battery) {
      setFormData(prev => ({
        ...prev,
        selectedBattery: batteryId,
        batteryCapacity: battery.capacity
      }));
    } else {
      setFormData(prev => ({ ...prev, selectedBattery: '' }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : parseFloat(value) || value;
    
    setFormData(prev => {
      const updates = { [name]: newValue };
      
      // Recalcular tamaño del sistema si cambia cantidad o potencia manual
      if (name === 'panelCount') {
        updates.systemSize = (newValue * prev.panelPower) / CALCULATION_CONSTANTS.W_TO_KW;
      }
      if (name === 'panelPower') {
        updates.systemSize = (prev.panelCount * newValue) / CALCULATION_CONSTANTS.W_TO_KW;
      }
      
      return { ...prev, ...updates };
    });
  };

  // Cálculo principal
  const handleCalculate = async () => {
    setCalculating(true);
    setCalculationStep('Iniciando simulador...');
    
    try {
      // Step 1: Data Gathering
      setCalculationStep('Recopilando datos meteorológicos...');
      await new Promise(r => setTimeout(r, 600)); // UX delay

      // 1. Predicción de producción solar (IA/Estadística)
      const prediction = await energyService.predictSolar(
        formData.lat, 
        formData.lon, 
        formData.systemSize,
        {
          tilt: formData.tilt,
          azimuth: formData.azimuth,
          efficiency: formData.efficiency
        }
      );

      // Step 2: AI Optimization
      setCalculationStep('Optimizando modelo neuronal...');
      await new Promise(r => setTimeout(r, 800)); // UX delay for "Intelligence" effect

      const annualProduction = prediction.annualProduction;

      // 1.b Calculo dinamico de Autoconsumo (Self-Consumption Rate)
      // Basado en perfil de consumo vs producción.
      // Heurística simplificada profesional:
      // Si la producción es mucho mayor que el consumo, el autoconsumo (%) baja.
      // Si hay baterías, el autoconsumo sube significativamente.
      
      let selfConsumptionRate = ECONOMIC_DEFAULTS.DEFAULT_SELF_CONSUMPTION; // Valor base por defecto
      
      if (annualProduction > 0 && formData.consumption > 0) {
          const annualConsumption = formData.consumption * 12;
          const productionToConsumptionRatio = annualProduction / annualConsumption;
          
          if (formData.hasBattery) {
               // Con Batería: Curva logística optimizada.
               // R=1 -> SC ~75-85%. R=2 -> SC ~45%. R=0.5 -> SC ~95%
               // selfConsumptionRate = 1.0 / (1.0 + 0.3 * Math.pow(productionToConsumptionRatio, 1.5)); // Modelo simplificado
               // Modelo ajustado para baterias residenciales típicas (5-10kWh):
               selfConsumptionRate = Math.min(0.95, 0.95 / (0.6 + 0.4 * productionToConsumptionRatio));
          } else {
               // Sin Batería: Curva estándar (curva de coincidencia carga-generación)
               // R=1 -> SC ~30-40%. R=2 -> SC ~20%. R=0.5 -> SC ~60%
               // selfConsumptionRate = 1.0 / (1.0 + productionToConsumptionRatio + Math.pow(productionToConsumptionRatio, 2)); // Modelo conservador
               // Modelo más realista residencial:
               selfConsumptionRate = Math.min(1.0, 1.0 / (1.2 + 1.2 * productionToConsumptionRatio));
          }
          
          // Clamp safe values
          selfConsumptionRate = Math.max(0.1, Math.min(1.0, selfConsumptionRate));
      }

      // Step 3: Financials
      setCalculationStep('Calculando proyecciones financieras...');
      
      // 2. Análisis Económico
      const economics = await energyService.analyzeEconomics(
        formData.budget,
        annualProduction,
        selfConsumptionRate,
        ECONOMIC_DEFAULTS.DEFAULT_PROJECT_LIFESPAN,
        {
          electricityPrice: formData.electricityPrice
        }
      );

      // 3. Preparar datos para gráficas
      const monthlyData = prediction.monthlyDistribution.map((m, i) => ({
        name: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][i],
        production: m.production,
        consumo: formData.consumption
      }));

      const financialData = economics.cashFlows.map((flow, i) => {
        // economics.cashFlows ya incluye la inversión negativa en el año 0.
        // Por tanto, el acumulado es simplemente la suma del array hasta i.
        const accumulatedValue = economics.cashFlows.slice(0, i + 1).reduce((a, b) => a + b, 0);
        
        return {
           year: i,
           acumulado: accumulatedValue, 
           profit: flow, // Flujo anual neto
           // ROI = (Beneficio Neto Total / Inversión) * 100
           // Beneficio Neto Total (acumulado final) = accumulatedValue
           roi: (accumulatedValue >= 0) 
                ? ((accumulatedValue / formData.budget) * 100).toFixed(1)
                : (((accumulatedValue + formData.budget) / formData.budget) * 100 - 100).toFixed(1),
        
           investment: formData.budget,
           // Income real si flow year 0 es -investment.
           income: i === 0 ? 0 : flow + (formData.budget * ECONOMIC_DEFAULTS.MAINTENANCE_RATE), // Aprox revertir costes para visualizar "Ingreso Bruto"? 
           // Mejor simplificar: visualizamos Flujo Neto (profit) y Acumulado (value)
           maintenance: i === 0 ? 0 : formData.budget * ECONOMIC_DEFAULTS.MAINTENANCE_RATE
        };
      });

      // Ajuste de datos para ResultsView
      const results = {
        annualProduction,
        annualSavings: economics.annualSavings,
        roi: economics.roi,
        paybackPeriod: economics.payback,
        monthlyData,
        financialData
      };

      onCalculate(results);

    } catch (error) {
      console.error("Error en cálculo:", error);
    } finally {
      setCalculating(false);
      setCalculationStep('');
    }
  };

  if (loading) return (
    <div className="loading-container" style={{ flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner"></div>
      <p className="text-secondary font-medium">Inicializando sistema experto...</p>
    </div>
  );

  if (error) return (
    <div className="loading-container" style={{ flexDirection: 'column', gap: '1rem' }}>
        <AlertTriangle size={48} className="text-accent-error" />
        <h3 className="text-xl font-bold text-accent-error">Error de Inicialización</h3>
        <p className="text-secondary text-center px-4 max-w-md">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="btn-secondary mt-4"
        >
          <RotateCcw size={16} /> Reintentar Conexión
        </button>
    </div>
  );

  return (
    <div className="calculator-container">
      <div className="page-header-container">
        <div>
          <h2 className="page-title">
            <Sun className="icon-primary" />
            Calculadora Solar {isAdvanced ? 'Avanzada' : 'Básica'}
          </h2>
          <p className="page-subtitle">
            {isAdvanced 
              ? 'Configuración detallada con parámetros técnicos y financieros' 
              : 'Estimación rápida basada en ubicación y consumo'}
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
        {/* SECCIÓN 1: UBICACIÓN Y CONSUMO (Siempre visible) */}
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

          <div className="grid-2-cols">
            <div className="form-group">
              <label className="form-label">Nº Paneles</label>
              <input 
                type="number" 
                name="panelCount" 
                value={formData.panelCount} 
                onChange={handleInputChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Potencia Total (kWp)</label>
              <input 
                type="number" 
                name="systemSize" 
                value={formData.systemSize} 
                onChange={handleInputChange}
                readOnly={!!formData.selectedPanel} // Readonly si hay panel seleccionado (Advanced)
                className={`form-input ${formData.selectedPanel ? 'input-readonly' : ''}`}
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: PARÁMETROS TÉCNICOS (Condicional) */}
        <div className="glass-panel stack-large">
          <h3 className="section-title success">
            <Zap size={20} /> {isAdvanced ? 'Configuración Técnica' : 'Resumen Económico'}
          </h3>

          {/* MODO BÁSICO: Solo Presupuesto */}
          {!isAdvanced && (
            <div className="stack-medium">
              <div className="form-group">
                <label className="form-label">Presupuesto Estimado (€)</label>
                <input 
                  type="number" 
                  name="budget" 
                  value={formData.budget} 
                  onChange={handleBudgetUpdate}
                  className="form-input"
                />
                <p className="info-text">
                  <Info size={12} /> Incluye instalación y equipos
                </p>
              </div>
              
              <div className="info-box">
                <p className="info-box-title">Configuración por defecto:</p>
                <ul className="info-box-list">
                  <li>• Orientación: Sur (Óptima)</li>
                  <li>• Inclinación: 35º</li>
                  <li>• Baterías: No incluidas</li>
                </ul>
              </div>
            </div>
          )}

          {/* MODO AVANZADO: Todos los controles */}
          {isAdvanced && (
            <div className="fade-in-section stack-medium">
              <div className="form-group">
                <label className="form-label">Modelo de Panel</label>
                <select 
                  name="selectedPanel" 
                  value={formData.selectedPanel} 
                  onChange={handlePanelChange}
                  className="form-input"
                >
                  <option value="">Genérico (Manual)</option>
                  {panels.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.manufacturer} {p.model} ({p.power}W) - {p.totalPrice ? `${p.totalPrice}€` : 'N/A'}
                    </option>
                  ))}
                </select>
                {formData.currentTotalCostPerPanel && (
                    <p className="text-xs text-secondary mt-1 ml-1">
                        Coste est. instalada: {formData.currentTotalCostPerPanel.toFixed(2)}€ / panel
                    </p>
                )}
              </div>

              <div className="grid-2-cols">
                <div className="form-group">
                  <label className="form-label">Inclinación (º)</label>
                  <input 
                    type="number" 
                    name="tilt" 
                    value={formData.tilt} 
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Azimut (º)</label>
                  <input 
                    type="number" 
                    name="azimuth" 
                    value={formData.azimuth} 
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
                    onChange={handleBudgetUpdate}
                    className="form-input"
                  />
                  {formData.maxPanelsBudget && (
                      <p className="text-xs text-warning mt-1">
                          Máx. paneles: {formData.maxPanelsBudget} u.
                      </p>
                  )}
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

              <div className="separator-top">
                <div className="form-group">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      name="hasBattery" 
                      checked={formData.hasBattery} 
                      onChange={handleInputChange}
                      className="checkbox-input"
                    />
                    Incluir sistema de baterías
                  </label>
                </div>

                {formData.hasBattery && (
                  <div className="form-group mt-4 fade-in-section">
                    <label className="form-label">Modelo de Batería</label>
                    <select 
                      name="selectedBattery" 
                      value={formData.selectedBattery} 
                      onChange={handleBatteryChange}
                      className="form-input"
                    >
                      <option value="">Seleccionar Batería...</option>
                      {batteries.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.manufacturer} {b.model} ({b.capacity}kWh)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
                  title="Valores por Defecto UI (Solar)" 
                  data={UI_DEFAULTS.SOLAR} 
                  isNested={true}
                  onUpdate={(key, value) => {
                    // Update nested UI_DEFAULTS.SOLAR object
                    const newSolarDefaults = { ...UI_DEFAULTS.SOLAR, [key]: parseFloat(value) || value };
                    updateSetting('UI_DEFAULTS', 'SOLAR', newSolarDefaults);
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
              {calculationStep || 'Procesando...'}
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

export default AdvancedSolarCalculator;
