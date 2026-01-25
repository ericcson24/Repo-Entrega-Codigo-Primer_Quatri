import React, { useState, useEffect } from 'react';
import { Home, Sun, Euro, Maximize, CheckCircle, BatteryCharging, Zap, PiggyBank, Edit, RotateCcw, MapPin, Lightbulb, ArrowRight } from 'lucide-react';
import { FormField, Input, Select, Switch } from '../../components/common/FormComponents';
import ResultsDashboard from '../../components/dashboards/ResultsDashboard';
import { apiService } from '../../services/api';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import './ResidentialSolarCalculator.css';

const SPANISH_CITIES = [
    { name: 'Madrid', lat: 40.4168, lon: -3.7038 },
    { name: 'Barcelona', lat: 41.3851, lon: 2.1734 },
    { name: 'Valencia', lat: 39.4699, lon: -0.3763 },
    { name: 'Sevilla', lat: 37.3891, lon: -5.9845 },
    { name: 'Bilbao', lat: 43.2630, lon: -2.9350 },
    { name: 'Málaga', lat: 36.7213, lon: -4.4214 },
    { name: 'Zaragoza', lat: 41.6488, lon: -0.8891 },
    { name: 'Palma', lat: 39.5696, lon: 2.6502 },
    { name: 'Las Palmas', lat: 28.1235, lon: -15.4363 },
    { name: 'A Coruña', lat: 43.3623, lon: -8.4115 },
    { name: 'Murcia', lat: 37.9922, lon: -1.1307 },
    { name: 'Valladolid', lat: 41.6523, lon: -4.7245 }
];


// --- MOCK CATALOG END ---

const INSTALLATION_BASE_COST = 2500; // Coste fijo realista (Inversor Híbrido, Legalización, Boletín, Estructura base)
const INSTALLATION_COST_PER_PANEL = 150; // Coste variable (Mano de obra cualificada, estructura extra, cableado DC)

// --- RESIDENTIAL RESULTS COMPONENT ---
const ResidentialResults = ({ system, annualGeneration, params }) => {
    const { isDark } = useTheme(); // Use hook
    
    // Cálculos Financieros
    const annualGenKwh = annualGeneration;
    const ratio = params.selfConsumptionRatio / 100;
    
    // Beneficio Económico Anual
    // Ahorro Directo por Autoconsumo
    const savingsFromConsumption = annualGenKwh * ratio * params.electricityPrice;
    
    // Ingresos por Venta de Excedentes
    const incomeFromSurplus = annualGenKwh * (1 - ratio) * params.surplusPrice;
    
    const totalAnnualSavings = savingsFromConsumption + incomeFromSurplus;
    
    // Retorno de Inversión
    const paybackYears = system.estimatedCost / totalAnnualSavings;
    
    // Datos de Gráfico Acumulativo
    const chartData = [];
    let cumulativeSavings = -system.estimatedCost;
    for (let yr = 0; yr <= 25; yr++) {
        chartData.push({
            year: yr,
            balance: Math.round(cumulativeSavings),
            breakEven: 0
        });
        // Añadir ahorros para el siguiente año
        cumulativeSavings += totalAnnualSavings; 
    }

    // Custom Tooltip Component
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className={isDark ? 'recharts-tooltip-dark' : 'recharts-tooltip-light'}>
                    <p className="tooltip-label">{`Año ${label}`}</p>
                    <p className={isDark ? 'recharts-tooltip-item-dark' : 'recharts-tooltip-item-light'}>
                        {`Balance: ${payload[0].value}€`}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="calculator-stack">
            <div className="grid-responsive-4">
                {/* 1. SAVINGS CARD */}
                <div className="savings-card">
                    <div className="flex-center-gap mb-2">
                        <PiggyBank className="text-green-primary" size={20} />
                        <h4 className="text-title-card text-green-dark">Ahorro Anual</h4>
                    </div>
                    <div className="text-value-large text-green-highlight">
                        {Math.round(totalAnnualSavings)}€ <span className="text-xs font-normal text-green-primary">/ año</span>
                    </div>
                    {system.batteryIncluded && (
                        <div className="text-xs text-green-primary mt-1 flex-center-gap">
                            <BatteryCharging size={12}/> Incluye ahorro batería
                        </div>
                    )}
                </div>

                {/* 2. PAYBACK CARD */}
                <div className="payback-card">
                    <div className="flex-center-gap mb-2">
                        <Zap className="text-blue-primary" size={20} />
                        <h4 className="text-title-card text-blue-dark">Retorno Inversión</h4>
                    </div>
                    <div className="text-value-large text-blue-highlight">
                        {paybackYears < 1 ? "< 1" : paybackYears.toFixed(1)} <span className="text-xs font-normal text-blue-primary">años</span>
                    </div>
                    <div className="text-xs text-blue-primary mt-1">
                        Punto de equilibrio
                    </div>
                </div>

                {/* 3. INDEPENDENCE CARD */}
                <div className="independence-card">
                    <div className="flex-center-gap mb-2">
                        <BatteryCharging className="text-purple-primary" size={20} />
                        <h4 className="text-title-card text-purple-dark">Independencia Red</h4>
                    </div>
                    <div className="text-value-large text-purple-highlight">
                        {params.selfConsumptionRatio}%
                    </div>
                     <div className="text-xs text-purple-primary mt-1">
                        {system.batteryIncluded ? 'Potenciado por Batería' : 'Solo Solar'}
                    </div>
                </div>

                {/* 4. CO2 CARD (NEW) */}
                <div className="co2-card">
                    <div className="flex-center-gap mb-2">
                        <Home className="text-teal-primary" size={20} />
                        <h4 className="text-title-card text-teal-dark">CO2 Evitado</h4>
                    </div>
                    <div className="text-value-large text-teal-highlight">
                        {(annualGenKwh * 0.3).toFixed(1)} <span className="text-xs font-normal">tons</span>
                    </div>
                     <div className="text-xs text-teal-primary mt-1">
                        Equivalente a árboles
                    </div>
                </div>
            </div>

            <div className="chart-container-card">
                <h4 className="text-gray-title">Recuperación de Inversión (25 Años)</h4>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#374151" : "#e5e7eb"} />
                        <XAxis dataKey="year" stroke={isDark ? "#9ca3af" : "#6b7280"} />
                        <YAxis stroke={isDark ? "#9ca3af" : "#6b7280"} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={0} stroke={isDark ? "#6b7280" : "#9ca3af"} strokeDasharray="3 3"/>
                        <Area type="monotone" dataKey="balance" stroke="#10B981" fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const ResidentialSolarCalculator = () => {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    
    // Estado del Catálogo
    const [panelCatalog, setPanelCatalog] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState(null);
    const [isCustomPanel, setIsCustomPanel] = useState(false);
    const [customPanel, setCustomPanel] = useState({
        id: 'custom-panel',
        brand: 'Personalizado',
        model: 'Panel Alta Eficiencia',
        p_max_w: 450,
        efficiencyPercent: 21.5,
        area_m2: 2.1,
        price_eur: 280,
        type: 'Monocrystalline'
    });
    
    // Estado de Cálculo
    const [calculatedSystem, setCalculatedSystem] = useState(null);

    // Entradas
    const [selectedCity, setSelectedCity] = useState(SPANISH_CITIES[0]);
    const [citySunHours, setCitySunHours] = useState(1500); // Datos obtenidos en vivo

    const [availableArea, setAvailableArea] = useState(30); // m2
    const [budget, setBudget] = useState(8000); // € Presupuesto aumentado por defecto para batería
    const [monthlyBill, setMonthlyBill] = useState(100); // €/mes

    // PARÁMETROS AVANZADOS
    const [electricityPrice, setElectricityPrice] = useState(0.20); // €/kWh
    const [surplusPrice, setSurplusPrice] = useState(0.06); // €/kWh
    const [selfConsumptionRatio, setSelfConsumptionRatio] = useState(40); // %
    const [consumptionProfile, setConsumptionProfile] = useState('balanced'); // 'day', 'evening', 'balanced'
    
    // Estado de Batería
    const [includeBattery, setIncludeBattery] = useState(false);
    const [batteryCapacity, setBatteryCapacity] = useState(5); // kWh
    const [batteryCost, setBatteryCost] = useState(2500); // €
    
    // Ayudante: Manejar cambio de ciudad
    const handleCityChange = (e) => {
        const city = SPANISH_CITIES.find(c => c.name === e.target.value);
        if (city) setSelectedCity(city);
    };

    // Efecto: Obtener el potencial solar cuando cambia la ciudad
    useEffect(() => {
        const fetchSunHours = async () => {
            const data = await apiService.getWeather(selectedCity.lat, selectedCity.lon);
            if (data && data.peak_sun_hours) {
                setCitySunHours(data.peak_sun_hours);
            }
        };
        fetchSunHours();
    }, [selectedCity]);

    // Ayudante: Estimar consumo de la factura
    const estimatedAnnualConsumption = Math.round((monthlyBill * 12) / electricityPrice);
    
    // Efecto: Calcular autoconsumo basado en perfil + batería
    useEffect(() => {
        let baseRatio = 35; // Ratio base para usuario medio

        // 1. Ajustar basado en Perfil de Consumo
        switch(consumptionProfile) {
            case 'day': baseRatio = 50; break; // En casa durante el día
            case 'evening': baseRatio = 25; break; // Oficina durante el día
            case 'balanced': default: baseRatio = 35; break;
        }

        // 2. Ajustar basado en Batería
        if (includeBattery) {
            // Heurística aproximada: +30-40% independencia con batería
            // Limitar al 85% porque 100% desconectado es muy difícil/caro
            setSelfConsumptionRatio(Math.min(90, baseRatio + 40)); 
        } else {
            setSelfConsumptionRatio(baseRatio);
        }
    }, [includeBattery, consumptionProfile]);

    // Cargar Catálogo
    useEffect(() => {
        const loadCatalog = async () => {
            try {
                let panels = await apiService.getCatalog('solar');
                
                if (!panels || panels.length === 0) {
                    // Manejar catálogo vacío elegantemente
                    setPanelCatalog([]);
                    return;
                }
                
                // Enriquecer con precio y campos formateados
                const enrichedPanels = panels.map(p => ({
                    ...p,
                    // Estimar Precio Minorista incluyendo margen de IVA si no está presente. 
                    // Mayorista puede ser 0.30€/W, pero Minorista es cercano a 0.50-0.70€/W
                    price_eur: p.price_eur || (p.p_max_w ? Math.round(p.p_max_w * 0.65) : 250),
                    // Asegurar que exista área
                    area_m2: p.area_m2 || 2.0,
                    // Ayudantes de visualización
                    brand: p.manufacturer || 'Genérico',
                    model: p.name || 'Panel Solar',
                    efficiencyPercent: p.efficiency ? (p.efficiency * 100).toFixed(1) : "20.0",
                    type: p.is_bifacial ? 'Bifacial' : 'Monocristalino'
                }));
                
                setPanelCatalog(enrichedPanels);
                if(enrichedPanels.length > 0) setSelectedPanel(enrichedPanels[0]);
            } catch (err) {
                console.error("Fallo al cargar catálogo", err);
            }
        };
        loadCatalog();
    }, []);

    // Efecto de Pre-cálculo
    useEffect(() => {
        const activePanel = isCustomPanel ? customPanel : selectedPanel;
        if (!activePanel) return;

        const panelArea = activePanel.area_m2;
        const panelCost = activePanel.price_eur + INSTALLATION_COST_PER_PANEL;
        const storageCost = includeBattery ? batteryCost : 0;
        
        // 1. Limitar por Área
        const maxPanelsArea = Math.floor(availableArea / panelArea);
        
        // 2. Limitar por Presupuesto
        // Presupuesto >= CosteBase + CosteBatería + (N * CostePanel)
        const availableBudgetForPanels = Math.max(0, budget - INSTALLATION_BASE_COST - storageCost);
        const maxPanelsBudget = Math.floor(availableBudgetForPanels / panelCost);
        
        const finalPanelCount = Math.max(0, Math.min(maxPanelsArea, maxPanelsBudget));
        const totalPowerKw = (finalPanelCount * activePanel.p_max_w) / 1000;
        const estimatedCost = INSTALLATION_BASE_COST + storageCost + (finalPanelCount * panelCost);
        const roofCoverage = finalPanelCount * panelArea;

        setCalculatedSystem({
            panelCount: finalPanelCount,
            totalPowerKw: parseFloat(totalPowerKw.toFixed(2)),
            estimatedCost: estimatedCost,
            roofCoverage: parseFloat(roofCoverage.toFixed(2)),
            limitingFactor: maxPanelsArea < maxPanelsBudget ? 'Area' : (maxPanelsBudget < maxPanelsArea ? 'Budget' : 'Balanced'),
            batteryIncluded: includeBattery,
            batterySize: batteryCapacity
        });

    }, [availableArea, budget, selectedPanel, isCustomPanel, customPanel, includeBattery, batteryCost]);

    const handleSimulate = async () => {
        if (!calculatedSystem || calculatedSystem.panelCount === 0) return;
        
        setLoading(true);
        try {
            const activePanel = isCustomPanel ? customPanel : selectedPanel;

            // Preparar payload compatible con backend existente
            const simulationPayload = {
                project_type: 'solar',
                latitude: selectedCity.lat, 
                longitude: selectedCity.lon,
                capacity_kw: calculatedSystem.totalPowerKw,
                budget: calculatedSystem.estimatedCost,
                parameters: {
                    panel_type: activePanel.type ? activePanel.type.toLowerCase() : 'monocrystalline',
                    // Pasar parámetros técnicos específicos si están disponibles (del Catálogo), sino usar predeterminados del Backend
                    temp_coef: activePanel.temp_coef_pmax || undefined, 
                    bifaciality: activePanel.bifaciality_factor || (activePanel.type === 'Bifacial' ? 0.7 : 0.0),
                    
                    orientation: 'south',
                    tilt: 35, 
                    system_loss: 0.14,
                    degradation_rate: 0.005,
                    battery_kwh: includeBattery ? batteryCapacity : 0 // Informativo para Motor IA si está soportado
                },
                financial_params: {
                    // Crítico para lógica residencial en backend:
                    self_consumption_ratio: selfConsumptionRatio / 100.0,
                    electricity_price_saved: electricityPrice,
                    electricity_price_surplus: surplusPrice,
                    
                    electricity_price: electricityPrice, 
                    project_lifetime: 25,
                    discount_rate: 3.0
                }
            };

            const data = await apiService.runSimulation(simulationPayload);
            
            setResults(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (results) {
        return (
            <div className="calculator-stack animate-fade-in">
                <div className="results-header-container">
                    <div>
                        <h2 className="results-title">
                            <Sun className="text-yellow" /> 
                            Tus Resultados de Potencial Solar
                        </h2>
                        <p className="results-subtitle">
                            Análisis basado en sistema de {calculatedSystem.totalPowerKw}kW (coste ~{calculatedSystem.estimatedCost}€)
                        </p>
                    </div>
                    <button 
                        onClick={() => setResults(null)}
                        className="new-simulation-btn"
                    >
                        <RotateCcw size={18} /> 
                        Nueva Simulación
                    </button>
                </div>

                {/* 1. Impacto Financiero (Residencial) */}
                <div className="results-card">
                     <h3 className="analysis-title">
                        <PiggyBank className="text-green-active" />
                        Análisis Económico
                    </h3>
                    <ResidentialResults 
                        system={calculatedSystem} 
                        annualGeneration={results.generation?.annual_kwh || results.annual_generation_kwh || 0}
                        params={{ electricityPrice, surplusPrice, selfConsumptionRatio }}
                    />
                </div>

                {/* 2. Gráficos Técnicos / Producción */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title">
                            <Zap className="text-blue" />
                            Previsión de Producción
                        </h3>
                    </div>
                    <div className="p-6">
                        <ResultsDashboard 
                            results={results} 
                            projectType="solar"
                            systemCapacity={calculatedSystem.totalPowerKw}
                            viewMode="residential"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="calculator-stack animate-fade-in">
            <header className="calculator-header">
                <div>
                    <h1 className="calculator-title">
                        <Home className="text-blue" />
                        Planificador Solar Residencial
                    </h1>
                    <p className="calculator-description">Diseña tu sistema doméstico según espacio y presupuesto.</p>
                </div>
            </header>

            {/* MAIN INPUT GRID - Now balanced and centered */}
            <div className="calculator-grid">
                
                {/* COLUMN 1: HOME & CONSUMPTION */}
                <div className="calculator-stack">
                    {/* STEP 1: HOME PROFILE */}
                    <div className="input-section-card">
                        <h3 className="input-section-title">
                            <span className="step-badge-blue">Paso 1</span> Perfil de Tu Hogar
                        </h3>
                        <div className="custom-input-group">
                            <FormField label="Ubicación (Ciudad)" icon={<MapPin size={16}/>}>
                                <Select 
                                    value={selectedCity.name} 
                                    onChange={handleCityChange}
                                    options={SPANISH_CITIES.map(c => ({ value: c.name, label: c.name }))}
                                />
                            </FormField>
                            
                            <div className="grid-2-cols">
                                <FormField label="Superficie de Tejado (m²)">
                                    <Input 
                                        type="number" 
                                        value={availableArea} 
                                        onChange={(e) => setAvailableArea(parseFloat(e.target.value) || 0)}
                                        min={5}
                                        icon={<Maximize size={16}/>}
                                    />
                                </FormField>
                                <FormField label="Factura Mensual (€)" tooltip="Usado para estimar consumo anual">
                                    <Input 
                                        type="number" 
                                        value={monthlyBill} 
                                        onChange={(e) => setMonthlyBill(parseFloat(e.target.value) || 0)}
                                        min={20}
                                        icon={<Euro size={16}/>}
                                    />
                                </FormField>
                            </div>
                            
                            <FormField label="¿Cuándo consumes energía?">
                                <Select 
                                    value={consumptionProfile} 
                                    onChange={(e) => setConsumptionProfile(e.target.value)}
                                    options={[
                                        { value: 'day', label: 'Mayormente Día (Trabajo en casa)' },
                                        { value: 'evening', label: 'Mayormente Noche (Trabajo fuera)' },
                                        { value: 'balanced', label: 'Equilibrado' }
                                    ]}
                                />
                            </FormField>

                             <div className="consumption-estimate-box">
                                <div className="flex-center-gap">
                                    <Lightbulb size={16} className="text-blue"/>
                                    <span className="text-consumption-label">Consumo Est.:</span>
                                </div>
                                <span className="text-consumption-value">~{estimatedAnnualConsumption} kWh/año</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: EQUIPMENT & BUDGET */}
                <div className="calculator-stack">
                    {/* STEP 2: BUDGET & BATTERY */}
                    <div className="input-section-card">
                         <h3 className="input-section-title">
                            <span className="step-badge-purple">Step 2</span> System Budget
                        </h3>
                        
                        <FormField label="Total Budget (€)">
                            <Input 
                                type="number" 
                                value={budget} 
                                onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                                min={1000}
                                step={100}
                                icon={<Euro size={16}/>}
                            />
                        </FormField>

                        <div className="battery-toggle-box">
                            <div className="flex-between section-divider">
                                <span className="flex-center-gap font-medium text-primary">
                                    <BatteryCharging className={includeBattery ? "text-green-active" : "text-gray-400"} size={20} />
                                    Include Battery?
                                </span>
                                <Switch checked={includeBattery} onChange={setIncludeBattery} />
                            </div>
                            
                            {includeBattery && (
                                <div className="battery-details-grid">
                                     <FormField label="Capacity (kWh)">
                                        <Input 
                                            type="number" step="0.5"
                                            value={batteryCapacity} 
                                            onChange={(e) => setBatteryCapacity(parseFloat(e.target.value))}
                                        />
                                    </FormField>
                                    <FormField label="Cost (€)">
                                        <Input 
                                            type="number" step="100"
                                            value={batteryCost} 
                                            onChange={(e) => setBatteryCost(parseFloat(e.target.value))}
                                        />
                                    </FormField>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* STEP 3. Panel Selection */}
                    <div className="input-section-card">
                        <div className="input-section-title flex-between">
                            <h3 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
                                <span className="step-badge-orange">Paso 3</span> Paneles
                            </h3>
                            <div className="toggle-group-container">
                                <button
                                    onClick={() => setIsCustomPanel(false)}
                                    className={`toggle-btn ${!isCustomPanel ? 'toggle-btn-active' : 'toggle-btn-inactive'}`}
                                >
                                    Catálogo
                                </button>
                                <button
                                    onClick={() => setIsCustomPanel(true)}
                                    className={`toggle-btn ${isCustomPanel ? 'toggle-btn-active' : 'toggle-btn-inactive'}`}
                                >
                                    Personalizado
                                </button>
                            </div>
                        </div>

                        {/* CUSTOM PANEL FORM */}
                        {isCustomPanel ? (
                            <div className="custom-panel-container">
                                <div className="custom-panel-info-box">
                                    <div className="flex items-start gap-3">
                                        <Edit size={18} className="text-orange mt-1" />
                                        <p className="text-sm text-orange-dim">
                                            Introduce las especificaciones de cualquier panel para simular su rendimiento.
                                        </p>
                                    </div>
                                </div>
                                <div className="grid-2-cols">
                                    <FormField label="Potencia (Watts)">
                                        <Input 
                                            type="number" 
                                            value={customPanel.p_max_w}
                                            onChange={(e) => setCustomPanel({...customPanel, p_max_w: parseFloat(e.target.value) || 0})}
                                        />
                                    </FormField>
                                    <FormField label="Eficiencia (%)">
                                        <Input 
                                            type="number" 
                                            value={customPanel.efficiencyPercent}
                                            onChange={(e) => setCustomPanel({...customPanel, efficiencyPercent: parseFloat(e.target.value) || 0})}
                                        />
                                    </FormField>
                                    <FormField label="Área / Panel (m²)">
                                        <Input 
                                            type="number" 
                                            value={customPanel.area_m2}
                                            onChange={(e) => setCustomPanel({...customPanel, area_m2: parseFloat(e.target.value) || 0})}
                                            step="0.1"
                                        />
                                    </FormField>
                                    <FormField label="Precio (€)">
                                        <Input 
                                            type="number" 
                                            value={customPanel.price_eur}
                                            onChange={(e) => setCustomPanel({...customPanel, price_eur: parseFloat(e.target.value) || 0})}
                                        />
                                    </FormField>
                                    <FormField label="Tecnología">
                                        <Select 
                                            value={customPanel.type} 
                                            onChange={(e) => setCustomPanel({...customPanel, type: e.target.value})}
                                            options={[
                                                { value: 'Monocrystalline', label: 'Monocristalino' },
                                                { value: 'Polycrystalline', label: 'Policristalino' },
                                                { value: 'Bifacial', label: 'Bifacial' },
                                                { value: 'ThinFilm', label: 'Capa Fina' }
                                            ]}
                                        />
                                    </FormField>
                                </div>
                            </div>
                        ) : (
                        /* CATALOG LIST */
                        <div className="panel-catalog-container">
                            {panelCatalog.map(panel => (
                                <div 
                                    key={panel.id}
                                    onClick={() => setSelectedPanel(panel)}
                                    className={`
                                        panel-card-item
                                        ${selectedPanel?.id === panel.id 
                                            ? 'panel-card-selected' 
                                            : 'panel-card-unselected'}
                                    `}
                                >
                                    <div className="panel-image-placeholder">
                                        {/* Placeholder for image */}
                                        <Sun className="text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex-between items-start">
                                            <h4 className="font-bold text-primary">{panel.brand}</h4>
                                            <span className="text-sm font-bold text-blue">{panel.price_eur}€</span>
                                        </div>
                                        <p className="text-xs text-gray-inactive">{panel.model}</p>
                                        <div className="flex-center-gap mt-1">
                                            <span className="panel-tag">{panel.p_max_w}W</span>
                                            <span className="panel-tag">{panel.efficiencyPercent}% Ef.</span>
                                            <span className="panel-type-tag">{panel.type}</span>
                                        </div>
                                    </div>
                                    {selectedPanel?.id === panel.id && (
                                        <div className="absolute top-2 right-2 text-blue">
                                            <CheckCircle size={16} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. FINE TUNING (Full width bottom) */}
            <div className="fine-tuning-card">
                    <h3 className="fine-tuning-title">
                    <Zap size={20} className="text-yellow" />
                    Ajuste Fino
                </h3>
                
                <div className="fine-tuning-grid">
                        <FormField label={`Precio Electricidad Actual (${electricityPrice} €/kWh)`}>
                        <div className="slider-container">
                            <input 
                                type="range" min="0.10" max="0.40" step="0.01" 
                                value={electricityPrice} 
                                onChange={(e) => setElectricityPrice(parseFloat(e.target.value))}
                                className="range-slider"
                            />
                        </div>
                    </FormField>
                        <FormField label={`Ratio Autoconsumo (${selfConsumptionRatio}%)`}>
                        <div className="slider-container">
                            <input 
                                type="range" min="20" max="95" step="5" 
                                value={selfConsumptionRatio} 
                                onChange={(e) => setSelfConsumptionRatio(parseInt(e.target.value))}
                                disabled={true} // Ahora calculado automáticamente
                                className="range-slider-disabled"
                            />
                            <span className="text-xs text-gray-inactive">{includeBattery ? 'Potenciado con Batería' : 'Basado en Perfil'}</span>
                        </div>
                    </FormField>
                        <FormField label={`Precio Comp. Excedentes (${surplusPrice} €/kWh)`}>
                        <input 
                            type="range" min="0.0" max="0.15" step="0.01" 
                            value={surplusPrice} 
                            onChange={(e) => setSurplusPrice(parseFloat(e.target.value))}
                            className="range-slider"
                        />
                    </FormField>
                </div>
            </div>

            {/* SUMMARY & ACTION SECTION */}
            {calculatedSystem && (
                <div className="summary-banner">
                    {/* Background decoration */}
                    <div className="decoration-circle-top"></div>
                    <div className="decoration-circle-bottom"></div>

                    <div className="summary-content">
                        
                        {/* Summary Stats */}
                        <div className="summary-stats-grid">
                            <div>
                                <div className="stat-label">Tamaño Sistema</div>
                                <div className="stat-value">{calculatedSystem.panelCount} <span className="text-lg-normal-gray">paneles</span></div>
                                <div className="stat-sub-blue">{calculatedSystem.totalPowerKw} kWp Potencia Total</div>
                            </div>
                            
                            <div>
                                <div className="stat-label">Coste Estimado</div>
                                <div className="stat-value">{calculatedSystem.estimatedCost?.toLocaleString()}€</div>
                                <div className="stat-sub-green">
                                    {includeBattery ? `Incluye batería ${batteryCapacity}kWh` : 'Instalación Incluida'}
                                </div>
                            </div>

                            <div className="stat-divider">
                                <div className="stat-label">Generación Anual</div>
                                <div className="stat-value">~{Math.round(calculatedSystem.totalPowerKw * citySunHours)}</div>
                                <div className="stat-sub-orange">kWh / Año en {selectedCity.name}</div>
                            </div>
                        </div>

                        {/* Action Column */}
                        <div className="action-column">
                            {calculatedSystem.panelCount > 0 ? (
                                <>
                                    <button 
                                        onClick={handleSimulate}
                                        disabled={loading}
                                        className="simulate-button"
                                    >
                                        {loading ? 'Procesando...' : 'Simular Ahorros'}
                                        {!loading && <ArrowRight className="transition-transform" />}
                                    </button>
                                    <p className="text-xs-center-gray">
                                        Ver análisis completo de ROI y Amortización
                                    </p>
                                </>
                            ) : (
                                <div className="warning-box">
                                    Por favor aumenta presupuesto o área para ver resultados.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResidentialSolarCalculator;
