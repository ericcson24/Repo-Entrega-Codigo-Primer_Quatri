import React, { useState } from 'react';
import { Droplets, RotateCcw, Play, Settings, MapPin } from 'lucide-react';
import { FormField, Input, Select, Switch } from '../../components/common/FormComponents';
import ResultsDashboard from '../../components/dashboards/ResultsDashboard';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

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

const HydroCalculator = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [advancedMode, setAdvancedMode] = useState(false);
    const [selectedCity, setSelectedCity] = useState('Madrid');

    const [formData, setFormData] = useState({
        project_type: 'hydro',
        latitude: 40.4168,
        longitude: -3.7038,
        capacity_kw: 500,
        budget: 2000000,
        parameters: {
            flow_rate_design: 5.0,
            gross_head: 15.0,
            turbine_efficiency: 0.90,
            ecological_flow: 0.5,
            penstock_length: 100,
            penstock_diameter: 1.0,
            roughness_coeff: 0.013
        },
        financial_params: {
            inflation_rate: 2.0,
            electricity_price_increase: 1.5,
            discount_rate: 6.0,
            project_lifetime: 30,
            use_debt: false,
            debt_ratio: 70,
            interest_rate: 4.5,
            loan_term: 15
        }
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleParamChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            parameters: { ...prev.parameters, [field]: parseFloat(value) }
        }));
    };

    const handleFinancialChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            financial_params: { ...prev.financial_params, [field]: value }
        }));
    };

    const handleCityChange = (cityName) => {
        setSelectedCity(cityName);
        const city = SPANISH_CITIES.find(c => c.name === cityName);
        if (city) {
            setFormData(prev => ({
                ...prev,
                latitude: city.lat,
                longitude: city.lon
            }));
        }
    };

    const handleSimulate = async () => {
        setLoading(true);
        try {
            // Prepare payload - force debt_ratio to 0 if debt logic is disabled
            const payload = {
                ...formData,
                financial_params: {
                    ...formData.financial_params,
                    debt_ratio: formData.financial_params.use_debt ? formData.financial_params.debt_ratio : 0
                },
                user_email: currentUser?.email
            };

            const data = await apiService.simulate(payload);
            setResults(data);
        } catch (error) {
            console.error(error);
            alert("Simulation failed.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setResults(null);
        setAdvancedMode(false);
    };

    if (results) {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Droplets className="text-cyan-500" /> Resultados Hidráulica
                    </h2>
                    <button 
                        onClick={resetForm}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <RotateCcw size={16} /> Nueva Simulación
                    </button>
                </div>
                <ResultsDashboard results={results} projectType="hydro" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Configuración Central Hidroeléctrica</h2>
                        <p className="text-gray-500 dark:text-gray-400">Simulación de minihidráulica y fluyente.</p>
                    </div>
                    <Switch 
                        label="Modo Avanzado" 
                        checked={advancedMode} 
                        onChange={setAdvancedMode} 
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-6">
                        <h3 className="section-title">Datos Básicos</h3>
                        <FormField label="Capacidad (kW)"><Input type="number" value={formData.capacity_kw} onChange={(e) => handleInputChange('capacity_kw', parseFloat(e.target.value))} /></FormField>
                        <FormField label="Presupuesto (€)"><Input type="number" value={formData.budget} onChange={(e) => handleInputChange('budget', parseFloat(e.target.value))} /></FormField>
                        
                        <FormField label="Ubicación (Ciudad)" icon={MapPin}>
                            <Select 
                                value={selectedCity}
                                onChange={(e) => handleCityChange(e.target.value)}
                                options={SPANISH_CITIES.map(c => ({ value: c.name, label: c.name }))}
                            />
                        </FormField>

                        <div className="hidden">
                            <FormField label="Lat"><Input type="number" step="0.0001" value={formData.latitude} onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))} /></FormField>
                             <FormField label="Lon"><Input type="number" step="0.0001" value={formData.longitude} onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))} /></FormField>
                        </div>
                    </div>

                    <div className="space-y-6">
                         <h3 className="section-title">Hidrología e Hidráulica</h3>
                         <div className="grid grid-cols-2 gap-4">
                            <FormField label="Caudal Diseño (m³/s)" tooltip="Q de diseño"><Input type="number" step="0.1" value={formData.parameters.flow_rate_design} onChange={(e) => handleParamChange('flow_rate_design', e.target.value)} /></FormField>
                            <FormField label="Salto Bruto (m)" tooltip="Desnivel vertical"><Input type="number" step="0.1" value={formData.parameters.gross_head} onChange={(e) => handleParamChange('gross_head', e.target.value)} /></FormField>
                         </div>
                         
                         {advancedMode && (
                             <>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Caudal Eco (m³/s)" tooltip="Caudal ecológico reservado"><Input type="number" step="0.1" value={formData.parameters.ecological_flow} onChange={(e) => handleParamChange('ecological_flow', e.target.value)} /></FormField>
                                    <FormField label="Eficiencia Turbina (0-1)"><Input type="number" step="0.01" max="1" value={formData.parameters.turbine_efficiency} onChange={(e) => handleParamChange('turbine_efficiency', e.target.value)} /></FormField>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Long. Tubería (m)"><Input type="number" step="1" value={formData.parameters.penstock_length} onChange={(e) => handleParamChange('penstock_length', e.target.value)} /></FormField>
                                    <FormField label="Diám. Tubería (m)"><Input type="number" step="0.1" value={formData.parameters.penstock_diameter} onChange={(e) => handleParamChange('penstock_diameter', e.target.value)} /></FormField>
                                </div>
                             </>
                         )}
                    </div>

                    {/* Financial Parameters (Advanced Only) */}
                    {advancedMode && (
                        <div className="md:col-span-2 space-y-6 pt-4">
                            <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">
                                <h3 className="section-title mb-0 flex items-center gap-2"><Settings size={18} /> Parámetros Financieros</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormField label="Vida Útil (Años)">
                                    <Input 
                                        type="number" 
                                        value={formData.financial_params.project_lifetime} 
                                        onChange={(e) => handleFinancialChange('project_lifetime', e.target.value)}
                                    />
                                </FormField>
                                <FormField label="Tasa Descuento (%)">
                                    <Input 
                                        type="number" step="0.1"
                                        value={formData.financial_params.discount_rate} 
                                        onChange={(e) => handleFinancialChange('discount_rate', e.target.value)}
                                    />
                                </FormField>
                                <div className="space-y-4 pt-2">
                                    <Switch 
                                        label="Financiación Externa" 
                                        checked={formData.financial_params.use_debt} 
                                        onChange={(checked) => handleFinancialChange('use_debt', checked)} 
                                    />
                                </div>
                            </div>
                                
                            {formData.financial_params.use_debt && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                    <FormField label="Ratio Deuda (%)">
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="range" min="0" max="100" 
                                                value={formData.financial_params.debt_ratio} 
                                                onChange={(e) => handleFinancialChange('debt_ratio', parseFloat(e.target.value))}
                                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <span className="w-12 text-sm font-mono">{formData.financial_params.debt_ratio}%</span>
                                        </div>
                                    </FormField>
                                    <FormField label="Tasa Interés (%)">
                                        <Input 
                                            type="number" step="0.1" 
                                            value={formData.financial_params.interest_rate} 
                                            onChange={(e) => handleFinancialChange('interest_rate', parseFloat(e.target.value))} 
                                        />
                                    </FormField>
                                    <FormField label="Plazo Amortización (Años)">
                                        <Input 
                                            type="number" step="1" 
                                            value={formData.financial_params.loan_term} 
                                            onChange={(e) => handleFinancialChange('loan_term', parseFloat(e.target.value))} 
                                        />
                                    </FormField>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                 <div className="mt-8 flex justify-end">
                    <button onClick={handleSimulate} disabled={loading} className="btn-primary">
                        {loading ? 'Procesando...' : 'Ejecutar Simulación'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HydroCalculator;
