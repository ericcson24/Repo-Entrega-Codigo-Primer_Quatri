import React, { useState } from 'react';
import { Sun, RotateCcw, Play, Settings, MapPin } from 'lucide-react';
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

const SolarCalculator = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [advancedMode, setAdvancedMode] = useState(false);
    const [selectedCity, setSelectedCity] = useState('Madrid');

    const [formData, setFormData] = useState({
        project_type: 'solar',
        latitude: 40.4168,
        longitude: -3.7038,
        capacity_kw: 100,
        budget: 75000, 
        parameters: {
            panel_type: 'monocrystalline',
            orientation: 'south',
            tilt: 30, 
            azimuth: 180, 
            system_loss: 14,
            inverter_efficiency: 96,
            degradation_rate: 0.5
        },
        financial_params: {
            inflation_rate: 2.0,
            electricity_price_increase: 1.5,
            discount_rate: 4.0,
            project_lifetime: 25,
            debt_ratio: 0, 
            interest_rate: 4.5, 
            loan_term: 15,
            // Advanced Parameters
            self_consumption_ratio: 0, // 0% autoconsumo
            electricity_price_surplus: 0.06, // €/kWh excedentes
            electricity_price_saved: 0.15, // €/kWh ahorrados
            grants_amount: 0, // Ayudas directas
            tax_deduction: 0, // Deducciones fiscales
            inverter_replacement_year: 12,
            inverter_replacement_cost: 0,
            insurance_cost: 0,
            land_roof_lease: 0,
            asset_management_fee: 0,
            corporate_tax_rate: 25.0 // % Impuesto Sociedades
        }
    });

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


    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleParamChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            parameters: { ...prev.parameters, [field]: value }
        }));
    };

    const handleFinancialChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            financial_params: { ...prev.financial_params, [field]: parseFloat(value) }
        }));
    };

    const handleSimulate = async () => {
        setLoading(true);
        try {
            // Prepare payload for Backend/Python (Percentages to Decimals, key mapping)
            const payload = {
                ...formData,
                user_email: currentUser?.email, // Add user email for history
                parameters: {
                    ...formData.parameters,
                    // If keys in state are still legacy, map them here. 
                    // But we will rename state keys to match Python for simplicity where possible.
                    // Unit Conversions:
                    inverter_efficiency: formData.parameters.inverter_efficiency / 100.0,
                    system_loss: formData.parameters.system_loss / 100.0,
                    degradation_rate_annual: (formData.parameters.degradation_rate || 0.5) / 100.0,
                    
                    // Allow legacy keys if they exist in state, but prefer correct keys
                    tilt: formData.parameters.tilt || formData.parameters.tilt_angle,
                    azimuth: formData.parameters.azimuth || formData.parameters.azimuth_angle
                },
                financial_params: {
                   ...formData.financial_params,
                   debtRatio: (formData.financial_params.debt_ratio || 0) / 100.0, // Backend expects decimal 0.0 - 1.0, key 'debtRatio'
                   interestRate: (formData.financial_params.interest_rate || 4.5) / 100.0,
                   loanTerm: parseInt(formData.financial_params.loan_term || 15)
                }
            };

            const data = await apiService.simulate(payload);
            setResults(data);
        } catch (error) {
            console.error("Simulation failed:", error);
            alert("Simulation failed. Check console details.");
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
                        <Sun className="text-yellow-500" /> Resultados de Simulación
                    </h2>
                    <button 
                        onClick={resetForm}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <RotateCcw size={16} /> Nueva Simulación
                    </button>
                </div>
                <ResultsDashboard 
                    results={results} 
                    projectType="solar" 
                    systemCapacity={formData.capacity_kw}
                />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Configuración Solar FV</h2>
                        <p className="text-gray-500 dark:text-gray-400">Configura los parámetros de tu sistema fotovoltaico.</p>
                    </div>
                    <Switch 
                        label="Modo Avanzado" 
                        checked={advancedMode} 
                        onChange={setAdvancedMode}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    
                    {/* Basic Parameters */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 border-gray-200 dark:border-gray-700">Datos Básicos</h3>
                        
                        <FormField label="Capacidad del Sistema (kW)" tooltip="Potencia pico total instalada">
                            <Input 
                                type="number" 
                                value={formData.capacity_kw} 
                                onChange={(e) => handleInputChange('capacity_kw', parseFloat(e.target.value))}
                            />
                        </FormField>

                        <FormField label="Presupuesto Total (€)" tooltip="Estimación inicial de inversión (CAPEX)">
                            <Input 
                                type="number" 
                                value={formData.budget} 
                                onChange={(e) => handleInputChange('budget', parseFloat(e.target.value))}
                            />
                        </FormField>

                        <FormField label="Ciudad" icon={MapPin} tooltip="Selecciona una ciudad para establecer automáticamente la ubicación">
                            <Select 
                                value={selectedCity}
                                onChange={(e) => handleCityChange(e.target.value)}
                                options={SPANISH_CITIES.map(c => ({ value: c.name, label: c.name }))}
                            />
                        </FormField>
                        <div className="hidden">
                            <FormField label="Latitud" icon={MapPin}>
                                <Input 
                                    type="number" 
                                    step="0.0001"
                                    value={formData.latitude} 
                                    onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
                                />
                            </FormField>
                            <FormField label="Longitud">
                                <Input 
                                    type="number" 
                                    step="0.0001"
                                    value={formData.longitude} 
                                    onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))}
                                />
                            </FormField>
                        </div>
                    </div>

                    {/* Technical Parameters */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 border-gray-200 dark:border-gray-700">Ajustes Técnicos</h3>
                        
                        <FormField label="Tecnología de Paneles">
                            <Select 
                                value={formData.parameters.panel_type}
                                onChange={(e) => handleParamChange('panel_type', e.target.value)}
                                options={[
                                    { value: 'monocrystalline', label: 'Monocristalino (Alta Eficiencia)' },
                                    { value: 'polycrystalline', label: 'Policristalino (Económico)' },
                                    { value: 'thin_film', label: 'Capa Fina (Flexible)' }
                                ]}
                            />
                        </FormField>
                        
                        {advancedMode && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Inclinación (º)">
                                        <Input 
                                            type="number" 
                                            value={formData.parameters.tilt} 
                                            onChange={(e) => handleParamChange('tilt', parseFloat(e.target.value))}
                                        />
                                    </FormField>
                                    <FormField label="Azimut (180=S)">
                                        <Input 
                                            type="number" 
                                            value={formData.parameters.azimuth} 
                                            onChange={(e) => handleParamChange('azimuth', parseFloat(e.target.value))}
                                        />
                                    </FormField>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Pérdidas Sistema (%)">
                                        <Input 
                                            type="number" step="0.1"
                                            value={formData.parameters.system_loss} 
                                            onChange={(e) => handleParamChange('system_loss', parseFloat(e.target.value))}
                                        />
                                    </FormField>
                                    <FormField label="Eficiencia Inversor (%)">
                                        <Input 
                                            type="number" step="0.1"
                                            value={formData.parameters.inverter_efficiency} 
                                            onChange={(e) => handleParamChange('inverter_efficiency', parseFloat(e.target.value))}
                                        />
                                    </FormField>
                                </div>

                                <FormField label="Degradación Anual (%)">
                                    <Input 
                                        type="number" 
                                        step="0.1"
                                        value={formData.parameters.degradation_rate} 
                                        onChange={(e) => handleParamChange('degradation_rate', parseFloat(e.target.value))}
                                    />
                                </FormField>
                            </>
                        )}
                    </div>

                    {/* Financial Parameters (Advanced Only) */}
                    {advancedMode && (
                        <div className="md:col-span-2 space-y-6 pt-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                <Settings size={18} /> Asunciones Financieras
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormField label="Vida Útil (Años)">
                                    <Input 
                                        type="number" 
                                        value={formData.financial_params.project_lifetime} 
                                        onChange={(e) => handleFinancialChange('project_lifetime', e.target.value)}
                                    />
                                </FormField>
                                <FormField label="Tasa de Descuento (%)" tooltip="WACC o Retorno Esperado">
                                    <Input 
                                        type="number" step="0.1"
                                        value={formData.financial_params.discount_rate} 
                                        onChange={(e) => handleFinancialChange('discount_rate', e.target.value)}
                                    />
                                </FormField>
                                <FormField label="Ratio Deuda (%)" tooltip="Porcentaje financiado con préstamo (0-100)">
                                    <Input 
                                        type="number" step="1" max="100" min="0" 
                                        placeholder="0"
                                        value={formData.financial_params.debt_ratio || ''} 
                                        onChange={(e) => handleFinancialChange('debt_ratio', parseFloat(e.target.value) || 0)}
                                    />
                                </FormField>
                                {formData.financial_params.debt_ratio > 0 && (
                                    <FormField label="Tipo Interés (%)">
                                        <Input 
                                            type="number" step="0.1"
                                            value={formData.financial_params.interest_rate} 
                                            onChange={(e) => handleFinancialChange('interest_rate', e.target.value)}
                                        />
                                    </FormField>
                                )}
                            </div>
                            
                             {/* Advanced Business Model & OPEX */}
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                {/* Autoconsumo */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Modelo de Ingresos</h4>
                                    <FormField label="% Autoconsumo" tooltip="Porcentaje de energía consumida in-situ (vs vendida a red)">
                                        <Input 
                                            type="number" min="0" max="100"
                                            value={(formData.financial_params.self_consumption_ratio || 0) * 100} 
                                            onChange={(e) => handleFinancialChange('self_consumption_ratio', parseFloat(e.target.value) / 100)}
                                        />
                                    </FormField>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="Precio Ahorrado (€/kWh)" tooltip="Coste evitado de compra a red">
                                            <Input 
                                                type="number" step="0.001"
                                                value={formData.financial_params.electricity_price_saved} 
                                                onChange={(e) => handleFinancialChange('electricity_price_saved', e.target.value)}
                                            />
                                        </FormField>
                                        <FormField label="Precio Excedentes (€/kWh)" tooltip="Precio de venta a la comercializadora">
                                            <Input 
                                                type="number" step="0.001"
                                                value={formData.financial_params.electricity_price_surplus} 
                                                onChange={(e) => handleFinancialChange('electricity_price_surplus', e.target.value)}
                                            />
                                        </FormField>
                                    </div>
                                </div>

                                {/* OPEX & Taxes */}
                                <div className="space-y-4">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">Gastos y Fiscalidad</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="Impuesto Sociedades (%)">
                                            <Input 
                                                type="number" 
                                                value={formData.financial_params.corporate_tax_rate} 
                                                onChange={(e) => handleFinancialChange('corporate_tax_rate', e.target.value)}
                                            />
                                        </FormField>
                                        <FormField label="Seguro Anual (€)">
                                            <Input 
                                                type="number" 
                                                value={formData.financial_params.insurance_cost} 
                                                onChange={(e) => handleFinancialChange('insurance_cost', e.target.value)}
                                            />
                                        </FormField>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField label="Subvenciones (€)" tooltip="Ayudas directas a la inversión (NextGen, etc)">
                                            <Input 
                                                type="number" 
                                                value={formData.financial_params.grants_amount} 
                                                onChange={(e) => handleFinancialChange('grants_amount', e.target.value)}
                                            />
                                        </FormField>
                                         <FormField label="Reposición Inversor (€)" tooltip="Coste estimado a mitad de vida útil">
                                            <Input 
                                                type="number" 
                                                value={formData.financial_params.inverter_replacement_cost} 
                                                onChange={(e) => handleFinancialChange('inverter_replacement_cost', e.target.value)}
                                            />
                                        </FormField>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSimulate}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Simulando...</span>
                            </>
                        ) : (
                            <>
                                <Play size={20} fill="currentColor" />
                                <span>Ejecutar Simulación</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SolarCalculator;
