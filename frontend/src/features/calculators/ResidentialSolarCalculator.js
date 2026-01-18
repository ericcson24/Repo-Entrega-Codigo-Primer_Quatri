import React, { useState, useEffect } from 'react';
import { Home, Calculator, Sun, Euro, maximize, Grid, CheckCircle, Info, BatteryCharging, Zap, PiggyBank, Edit, RotateCcw, MapPin, Lightbulb, ArrowRight } from 'lucide-react';
import { FormField, Input, Select, Switch } from '../../components/common/FormComponents';
import ResultsDashboard from '../../components/dashboards/ResultsDashboard';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, ReferenceLine } from 'recharts';

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
    // Financial Calculations
    const annualGenKwh = annualGeneration;
    const ratio = params.selfConsumptionRatio / 100;
    
    // Annual Economic Benefit
    // Direct Self-Consumption Savings
    const savingsFromConsumption = annualGenKwh * ratio * params.electricityPrice;
    
    // Surplus Sales Income
    const incomeFromSurplus = annualGenKwh * (1 - ratio) * params.surplusPrice;
    
    const totalAnnualSavings = savingsFromConsumption + incomeFromSurplus;
    
    // Payback
    const paybackYears = system.estimatedCost / totalAnnualSavings;
    
    // Data for Independence Chart (Pie)
    const independenceData = [
        { name: 'Self Consumption', value: ratio * 100, fill: '#10B981' }, // Green
        { name: 'Grid Export', value: (1 - ratio) * 100, fill: '#F59E0B' } // Orange
    ];
    
    // Cumulative Chart Data
    const chartData = [];
    let cumulativeSavings = -system.estimatedCost;
    for (let yr = 0; yr <= 25; yr++) {
        chartData.push({
            year: yr,
            balance: Math.round(cumulativeSavings),
            breakEven: 0
        });
        // Add savings for next year (could add inflation here)
        cumulativeSavings += totalAnnualSavings; 
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. SAVINGS CARD */}
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-2">
                        <PiggyBank className="text-green-600 dark:text-green-400" size={20} />
                        <h4 className="text-sm font-semibold text-green-900 dark:text-green-100">Annual Savings</h4>
                    </div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {Math.round(totalAnnualSavings)}€ <span className="text-xs font-normal text-green-600">/ year</span>
                    </div>
                    {system.batteryIncluded && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                            <BatteryCharging size={12}/> Includes storage savings
                        </div>
                    )}
                </div>

                {/* 2. PAYBACK CARD */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="text-blue-600 dark:text-blue-400" size={20} />
                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Payback Period</h4>
                    </div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                        {paybackYears < 1 ? "< 1" : paybackYears.toFixed(1)} <span className="text-xs font-normal text-blue-600">years</span>
                    </div>
                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        Break-even point
                    </div>
                </div>

                {/* 3. INDEPENDENCE CARD */}
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-2">
                        <BatteryCharging className="text-purple-600 dark:text-purple-400" size={20} />
                        <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100">Grid Independence</h4>
                    </div>
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        {params.selfConsumptionRatio}%
                    </div>
                     <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                        {system.batteryIncluded ? 'Boosted with Battery' : 'Direct Solar Only'}
                    </div>
                </div>

                {/* 4. CO2 CARD (NEW) */}
                <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-xl border border-teal-100 dark:border-teal-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Home className="text-teal-600 dark:text-teal-400" size={20} />
                        <h4 className="text-sm font-semibold text-teal-900 dark:text-teal-100">CO2 Avoided</h4>
                    </div>
                    <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                        {(annualGenKwh * 0.3).toFixed(1)} <span className="text-xs font-normal">tons</span>
                    </div>
                     <div className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                        Equivalent to planted trees
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 h-64">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Investment Recovery (25 Years)</h4>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip 
                            formatter={(value) => [`${value}€`, 'Balance']}
                            labelFormatter={(label) => `Year ${label}`}
                        />
                        <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3"/>
                        <Area type="monotone" dataKey="balance" stroke="#10B981" fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const ResidentialSolarCalculator = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    
    // Catalog State
    const [panelCatalog, setPanelCatalog] = useState([]);
    const [selectedPanel, setSelectedPanel] = useState(null);
    const [isCustomPanel, setIsCustomPanel] = useState(false);
    const [customPanel, setCustomPanel] = useState({
        id: 'custom-panel',
        brand: 'Custom',
        model: 'High Efficiency Panel',
        p_max_w: 450,
        efficiencyPercent: 21.5,
        area_m2: 2.1,
        price_eur: 280,
        type: 'Monocrystalline'
    });
    
    // Calculation State
    const [calculatedSystem, setCalculatedSystem] = useState(null);

    // Inputs
    const [selectedCity, setSelectedCity] = useState(SPANISH_CITIES[0]);
    const [citySunHours, setCitySunHours] = useState(1500); // Live fetched data

    const [availableArea, setAvailableArea] = useState(30); // m2
    const [budget, setBudget] = useState(8000); // € Increased default budget for battery
    const [monthlyBill, setMonthlyBill] = useState(100); // €/month

    // ADVANCED PARAMETERS
    const [electricityPrice, setElectricityPrice] = useState(0.20); // €/kWh
    const [surplusPrice, setSurplusPrice] = useState(0.06); // €/kWh
    const [selfConsumptionRatio, setSelfConsumptionRatio] = useState(40); // %
    const [consumptionProfile, setConsumptionProfile] = useState('balanced'); // 'day', 'evening', 'balanced'
    
    // Battery State
    const [includeBattery, setIncludeBattery] = useState(false);
    const [batteryCapacity, setBatteryCapacity] = useState(5); // kWh
    const [batteryCost, setBatteryCost] = useState(2500); // €
    
    // Helper: Handle City Change
    const handleCityChange = (e) => {
        const city = SPANISH_CITIES.find(c => c.name === e.target.value);
        if (city) setSelectedCity(city);
    };

    // Effect: Fetch Solar Potential when city changes
    useEffect(() => {
        const fetchSunHours = async () => {
            const data = await apiService.getWeather(selectedCity.lat, selectedCity.lon);
            if (data && data.peak_sun_hours) {
                setCitySunHours(data.peak_sun_hours);
            }
        };
        fetchSunHours();
    }, [selectedCity]);

    // Helper: Estimate Consumption from Bill
    const estimatedAnnualConsumption = Math.round((monthlyBill * 12) / electricityPrice);
    
    // Effect: Calculate Self Consumption based on Profile + Battery
    useEffect(() => {
        let baseRatio = 35; // Base ratio for average user

        // 1. Adjust based on Consumption Profile
        switch(consumptionProfile) {
            case 'day': baseRatio = 50; break; // Home during day
            case 'evening': baseRatio = 25; break; // Works at office
            case 'balanced': default: baseRatio = 35; break;
        }

        // 2. Adjust based on Battery
        if (includeBattery) {
            // Rough heuristic: +30-40% independence with battery
            // Cap at 85% because 100% off-grid is very hard/expensive
            setSelfConsumptionRatio(Math.min(90, baseRatio + 40)); 
        } else {
            setSelfConsumptionRatio(baseRatio);
        }
    }, [includeBattery, consumptionProfile]);

    // Load Catalog
    useEffect(() => {
        const loadCatalog = async () => {
            try {
                let panels = await apiService.getCatalog('solar');
                
                if (!panels || panels.length === 0) {
                    // Handle empty catalog gracefully
                    setPanelCatalog([]);
                    return;
                }
                
                // Enrich with Price and formatted fields
                const enrichedPanels = panels.map(p => ({
                    ...p,
                    // Estimate Retail Price including VAT margin if not present. 
                    // Wholesale might be 0.30€/W, but Retail is closer to 0.50-0.70€/W
                    price_eur: p.price_eur || (p.p_max_w ? Math.round(p.p_max_w * 0.65) : 250),
                    // Ensure area exists
                    area_m2: p.area_m2 || 2.0,
                    // Display helpers
                    brand: p.manufacturer || 'Generic',
                    model: p.name || 'Solar Panel',
                    efficiencyPercent: p.efficiency ? (p.efficiency * 100).toFixed(1) : "20.0",
                    type: p.is_bifacial ? 'Bifacial' : 'Monocrystalline'
                }));
                
                setPanelCatalog(enrichedPanels);
                if(enrichedPanels.length > 0) setSelectedPanel(enrichedPanels[0]);
            } catch (err) {
                console.error("Failed to load catalog", err);
            }
        };
        loadCatalog();
    }, []);

    // Pre-calculation effect
    useEffect(() => {
        const activePanel = isCustomPanel ? customPanel : selectedPanel;
        if (!activePanel) return;

        const panelArea = activePanel.area_m2;
        const panelCost = activePanel.price_eur + INSTALLATION_COST_PER_PANEL;
        const storageCost = includeBattery ? batteryCost : 0;
        
        // 1. Limit by Area
        const maxPanelsArea = Math.floor(availableArea / panelArea);
        
        // 2. Limit by Budget
        // Budget >= BaseCost + BatteryCost + (N * PanelCost)
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

            // Prepare payload compatible with existing backend
            const simulationPayload = {
                project_type: 'solar',
                latitude: selectedCity.lat, 
                longitude: selectedCity.lon,
                capacity_kw: calculatedSystem.totalPowerKw,
                budget: calculatedSystem.estimatedCost,
                parameters: {
                    panel_type: activePanel.type ? activePanel.type.toLowerCase() : 'monocrystalline',
                    // Pass specific Technical Params if available (from Catalog), otherwise Backend defaults
                    temp_coef: activePanel.temp_coef_pmax || undefined, 
                    bifaciality: activePanel.bifaciality_factor || (activePanel.type === 'Bifacial' ? 0.7 : 0.0),
                    
                    orientation: 'south',
                    tilt: 35, 
                    system_loss: 0.14,
                    degradation_rate: 0.005,
                    battery_kwh: includeBattery ? batteryCapacity : 0 // Informational for AI Engine if supported
                },
                financial_params: {
                    // Critical for residential logic in backend:
                    self_consumption_ratio: selfConsumptionRatio / 100.0,
                    electricity_price_saved: electricityPrice,
                    electricity_price_surplus: surplusPrice,
                    
                    electricity_price: electricityPrice, 
                    project_lifetime: 25,
                    discount_rate: 3.0
                }
            };

            console.log("DEBUG - Simulation Parameters:", {
                city: selectedCity.name,
                panels: calculatedSystem.panelCount,
                battery: includeBattery ? `${batteryCapacity}kWh` : 'None',
                estimatedConsumption: estimatedAnnualConsumption,
                ratio: selfConsumptionRatio
            });
            console.log("Sending Payload:", simulationPayload);

            const data = await apiService.runSimulation(simulationPayload);
            console.log("Received Simulation Results:", data);
            
            setResults(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (results) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Sun className="text-yellow-500" /> 
                            Your Solar Potential Results
                        </h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Analysis based on {calculatedSystem.totalPowerKw}kW system cost ~{calculatedSystem.estimatedCost}€
                        </p>
                    </div>
                    <button 
                        onClick={() => setResults(null)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm font-medium"
                    >
                        <RotateCcw size={18} /> 
                        New Simulation
                    </button>
                </div>

                {/* 1. Financial Impact (Residential Focus) */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
                     <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                        <PiggyBank className="text-green-500" />
                        Economic Analysis
                    </h3>
                    <ResidentialResults 
                        system={calculatedSystem} 
                        annualGeneration={results.generation?.annual_kwh || results.annual_generation_kwh || 0}
                        params={{ electricityPrice, surplusPrice, selfConsumptionRatio }}
                    />
                </div>

                {/* 2. Technical / Production Charts */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <h3 className="text-lg font-bold dark:text-gray-100 flex items-center gap-2">
                            <Zap className="text-blue-500" />
                            Production Forecast
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
        <div className="space-y-6 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-5xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Home className="text-blue-600" />
                        Residential Solar Planner
                    </h1>
                    <p className="text-gray-500 mt-1 dark:text-gray-400">Design your home system based on roof space and budget.</p>
                </div>
            </header>

            {/* MAIN INPUT GRID - Now balanced and centered */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                
                {/* COLUMN 1: HOME & CONSUMPTION */}
                <div className="space-y-6">
                    {/* STEP 1: HOME PROFILE */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-full">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-sm">Step 1</span> Your Home Profile
                        </h3>
                        <div className="custom-input-group space-y-4">
                            <FormField label="Location (City)" icon={<MapPin size={16}/>}>
                                <Select 
                                    value={selectedCity.name} 
                                    onChange={handleCityChange}
                                    options={SPANISH_CITIES.map(c => ({ value: c.name, label: c.name }))}
                                />
                            </FormField>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Roof Area (m²)">
                                    <Input 
                                        type="number" 
                                        value={availableArea} 
                                        onChange={(e) => setAvailableArea(parseFloat(e.target.value) || 0)}
                                        min={5}
                                        icon={<maximize size={16}/>}
                                    />
                                </FormField>
                                <FormField label="Monthly Bill (€)" tooltip="Used to estimate consumption">
                                    <Input 
                                        type="number" 
                                        value={monthlyBill} 
                                        onChange={(e) => setMonthlyBill(parseFloat(e.target.value) || 0)}
                                        min={20}
                                        icon={<Euro size={16}/>}
                                    />
                                </FormField>
                            </div>
                            
                            <FormField label="When do you use energy?">
                                <Select 
                                    value={consumptionProfile} 
                                    onChange={(e) => setConsumptionProfile(e.target.value)}
                                    options={[
                                        { value: 'day', label: 'Mostly Day (Working from home)' },
                                        { value: 'evening', label: 'Mostly Evening (Office job)' },
                                        { value: 'balanced', label: 'Balanced' }
                                    ]}
                                />
                            </FormField>

                             <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                <div className="flex items-center gap-2">
                                    <Lightbulb size={16} className="text-blue-600"/>
                                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Est. Consumption:</span>
                                </div>
                                <span className="font-bold text-blue-700 dark:text-blue-300">~{estimatedAnnualConsumption} kWh/yr</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: EQUIPMENT & BUDGET */}
                <div className="space-y-6">
                    {/* STEP 2: BUDGET & BATTERY */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                         <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-3">
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-sm">Step 2</span> System Budget
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

                        <div className="mt-6 mb-2 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                                <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                                    <BatteryCharging className={includeBattery ? "text-green-500" : "text-gray-400"} size={20} />
                                    Include Battery?
                                </span>
                                <Switch checked={includeBattery} onChange={setIncludeBattery} />
                            </div>
                            
                            {includeBattery && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 mt-4">
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
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-3">
                            <h3 className="text-lg font-semibold flex items-center gap-2 dark:text-white">
                                <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-sm">Step 3</span> Panels
                            </h3>
                            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                                <button
                                    onClick={() => setIsCustomPanel(false)}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${!isCustomPanel ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    Catalog
                                </button>
                                <button
                                    onClick={() => setIsCustomPanel(true)}
                                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${isCustomPanel ? 'bg-white dark:bg-gray-600 shadow text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                                >
                                    Custom
                                </button>
                            </div>
                        </div>

                        {/* CUSTOM PANEL FORM */}
                        {isCustomPanel ? (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800/30 mb-4">
                                    <div className="flex items-start gap-3">
                                        <Edit size={18} className="text-orange-600 mt-1" />
                                        <p className="text-sm text-orange-800 dark:text-orange-300">
                                            Enter the specifications of any solar panel to simulate its performance in your home.
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Power (Watts)">
                                        <Input 
                                            type="number" 
                                            value={customPanel.p_max_w}
                                            onChange={(e) => setCustomPanel({...customPanel, p_max_w: parseFloat(e.target.value) || 0})}
                                        />
                                    </FormField>
                                    <FormField label="Efficiency (%)">
                                        <Input 
                                            type="number" 
                                            value={customPanel.efficiencyPercent}
                                            onChange={(e) => setCustomPanel({...customPanel, efficiencyPercent: parseFloat(e.target.value) || 0})}
                                        />
                                    </FormField>
                                    <FormField label="Area / Panel (m²)">
                                        <Input 
                                            type="number" 
                                            value={customPanel.area_m2}
                                            onChange={(e) => setCustomPanel({...customPanel, area_m2: parseFloat(e.target.value) || 0})}
                                            step="0.1"
                                        />
                                    </FormField>
                                    <FormField label="Price (€)">
                                        <Input 
                                            type="number" 
                                            value={customPanel.price_eur}
                                            onChange={(e) => setCustomPanel({...customPanel, price_eur: parseFloat(e.target.value) || 0})}
                                        />
                                    </FormField>
                                    <FormField label="Tech Type">
                                        <Select 
                                            value={customPanel.type} 
                                            onChange={(e) => setCustomPanel({...customPanel, type: e.target.value})}
                                            options={[
                                                { value: 'Monocrystalline', label: 'Monocrystalline' },
                                                { value: 'Polycrystalline', label: 'Polycrystalline' },
                                                { value: 'Bifacial', label: 'Bifacial' },
                                                { value: 'ThinFilm', label: 'Thin Film' }
                                            ]}
                                        />
                                    </FormField>
                                </div>
                            </div>
                        ) : (
                        /* CATALOG LIST */
                        <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2">
                            {panelCatalog.map(panel => (
                                <div 
                                    key={panel.id}
                                    onClick={() => setSelectedPanel(panel)}
                                    className={`
                                        relative cursor-pointer p-3 rounded-xl border-2 transition-all flex items-center gap-3
                                        ${selectedPanel?.id === panel.id 
                                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' 
                                            : 'border-transparent bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'}
                                    `}
                                >
                                    <div className="w-12 h-16 bg-gray-200 rounded flex items-center justify-center overflow-hidden shrink-0">
                                        {/* Placeholder for image */}
                                        <Sun className="text-gray-400" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-gray-800 dark:text-gray-100">{panel.brand}</h4>
                                            <span className="text-sm font-bold text-blue-600">{panel.price_eur}€</span>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{panel.model}</p>
                                        <div className="flex gap-2 mt-1">
                                            <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 rounded">{panel.p_max_w}W</span>
                                            <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 rounded">{panel.efficiencyPercent}% Eff</span>
                                            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-1.5 rounded">{panel.type}</span>
                                        </div>
                                    </div>
                                    {selectedPanel?.id === panel.id && (
                                        <div className="absolute top-2 right-2 text-blue-600">
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
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 max-w-5xl mx-auto">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 dark:text-white">
                    <Zap size={20} className="text-yellow-500" />
                    Fine Tuning
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <FormField label={`Current Electricity Price (${electricityPrice} €/kWh)`}>
                        <div className="flex items-center gap-4">
                            <input 
                                type="range" min="0.10" max="0.40" step="0.01" 
                                value={electricityPrice} 
                                onChange={(e) => setElectricityPrice(parseFloat(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            />
                        </div>
                    </FormField>
                        <FormField label={`Self Consumption Ratio (${selfConsumptionRatio}%)`}>
                        <div className="flex items-center gap-4">
                            <input 
                                type="range" min="20" max="95" step="5" 
                                value={selfConsumptionRatio} 
                                onChange={(e) => setSelfConsumptionRatio(parseInt(e.target.value))}
                                disabled={true} // Now calculated automatically
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 opacity-50 cursor-not-allowed"
                            />
                            <span className="text-xs text-gray-500">{includeBattery ? 'Boosted by Battery' : 'Based on Profile'}</span>
                        </div>
                    </FormField>
                        <FormField label={`Surplus Comp. Price (${surplusPrice} €/kWh)`}>
                        <input 
                            type="range" min="0.0" max="0.15" step="0.01" 
                            value={surplusPrice} 
                            onChange={(e) => setSurplusPrice(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                    </FormField>
                </div>
            </div>

            {/* SUMMARY & ACTION SECTION */}
            {calculatedSystem && (
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-blue-900 dark:to-slate-900 rounded-3xl p-8 text-white shadow-xl max-w-5xl mx-auto overflow-hidden relative">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-blue-500 opacity-10 rounded-full blur-3xl"></div>

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                        
                        {/* Summary Stats */}
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8 w-full">
                            <div>
                                <div className="text-gray-400 text-sm font-medium mb-1">System Size</div>
                                <div className="text-3xl font-bold">{calculatedSystem.panelCount} <span className="text-lg font-normal text-gray-400">panels</span></div>
                                <div className="text-sm text-blue-300 mt-1">{calculatedSystem.totalPowerKw} kWp Total Power</div>
                            </div>
                            
                            <div>
                                <div className="text-gray-400 text-sm font-medium mb-1">Estimated Cost</div>
                                <div className="text-3xl font-bold">{calculatedSystem.estimatedCost?.toLocaleString()}€</div>
                                <div className="text-sm text-green-300 mt-1">
                                    {includeBattery ? `Includes ${batteryCapacity}kWh Battery` : 'Installation Included'}
                                </div>
                            </div>

                            <div className="col-span-2 md:col-span-1 border-t md:border-t-0 border-gray-700 pt-4 md:pt-0 mt-2 md:mt-0">
                                <div className="text-gray-400 text-sm font-medium mb-1">Yearly Generation</div>
                                <div className="text-3xl font-bold">~{Math.round(calculatedSystem.totalPowerKw * citySunHours)}</div>
                                <div className="text-sm text-orange-300 mt-1">kWh / Year in {selectedCity.name}</div>
                            </div>
                        </div>

                        {/* Action Column */}
                        <div className="w-full md:w-auto flex flex-col gap-3 min-w-[200px]">
                            {calculatedSystem.panelCount > 0 ? (
                                <>
                                    <button 
                                        onClick={handleSimulate}
                                        disabled={loading}
                                        className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/50 transition-all flex items-center justify-center gap-2 group"
                                    >
                                        {loading ? 'Processing...' : 'Simulate Savings'}
                                        {!loading && <ArrowRight className="group-hover:translate-x-1 transition-transform" />}
                                    </button>
                                    <p className="text-xs text-center text-gray-400">
                                        View complete ROI & Amortization analysis
                                    </p>
                                </>
                            ) : (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-xl text-center text-sm">
                                    Please increase budget or area to see results.
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
