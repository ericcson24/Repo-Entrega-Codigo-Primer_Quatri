import React, { useState } from 'react';
import { Wind, RotateCcw, Settings, MapPin, Play } from 'lucide-react';
import { FormField, Input, Select, Switch } from '../../components/common/FormComponents';
import ResultsDashboard from '../../components/dashboards/ResultsDashboard';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './SharedComponents.css';
import './AdvancedWindCalculator.css';

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

const AdvancedWindCalculator = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [advancedMode, setAdvancedMode] = useState(false);
    const [selectedCity, setSelectedCity] = useState('Madrid');

    const [formData, setFormData] = useState({
        project_type: 'wind',
        latitude: 40.4168,
        longitude: -3.7038,
        capacity_kw: 2000,
        budget: 2500000,
        parameters: {
            hub_height: 80,
            rotor_diameter: 90,
            turbine_model: 'generic_2mw',
            hellman_exponent: 0.14,
            weibull_shape: 2.0,
            weibull_scale: 7.0,
            cut_in_speed: 3.0,
            cut_out_speed: 25.0,
            losses_wake: 5.0
        },
        financial_params: {
            inflation_rate: 2.0,
            electricity_price_increase: 1.5,
            initial_electricity_price: 50.0,
            discount_rate: 5.0,
            project_lifetime: 20,
            debt_ratio: 0, // Desactivado por defecto
            interest_rate: 4.5,
            loan_term: 15
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
            const payload = {
                ...formData,
                user_email: currentUser?.email,
                parameters: {
                    ...formData.parameters,
                    // Aplanar o mapear parámetros si es necesario
                }
            };
            const data = await apiService.simulate(payload);
            setResults(data);
        } catch (error) {
            alert("Simulación fallida. Revisa los detalles en consola.");
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
            <div className="wind-results-container">
                <div className="wind-header">
                    <h2 className="wind-title">
                        <Wind className="text-blue-500" /> Resultados Eólicos
                    </h2>
                    <button 
                        onClick={resetForm}
                        className="btn-new-simulation"
                    >
                        <RotateCcw size={16} /> Nueva Simulación
                    </button>
                </div>
                <ResultsDashboard results={results} projectType="wind" />
            </div>
        );
    }

    return (
        <div className="calculator-container">
            <div className="calculator-card">
                <div className="card-header">
                    <div>
                        <h2 className="card-title">Configuración Parque Eólico</h2>
                        <p className="card-description">Configura los parámetros de tus aerogeneradores.</p>
                    </div>
                    <Switch 
                        label="Modo Avanzado" 
                        checked={advancedMode} 
                        onChange={setAdvancedMode}
                    />
                </div>

                <div className="form-grid">
                    
                    {/* Basic Parameters */}
                    <div className="section-container">
                        <h3 className="section-title">Datos Básicos</h3>
                        
                        <FormField label="Capacidad Total (kW)" tooltip="Potencia pico total instalada">
                            <Input 
                                type="number" 
                                value={formData.capacity_kw} 
                                onChange={(e) => handleInputChange('capacity_kw', parseFloat(e.target.value))}
                            />
                        </FormField>

                        <FormField label="Presupuesto Total (€)">
                            <Input 
                                type="number" 
                                value={formData.budget} 
                                onChange={(e) => handleInputChange('budget', parseFloat(e.target.value))}
                            />
                        </FormField>

                        <FormField label="Ubicación (Ciudad)" icon={MapPin}>
                            <Select 
                                value={selectedCity}
                                onChange={(e) => handleCityChange(e.target.value)}
                                options={SPANISH_CITIES.map(c => ({ value: c.name, label: c.name }))}
                            />
                        </FormField>

                        <div className="hidden">
                            <FormField label="Latitud">
                                <Input 
                                    type="number" step="0.0001"
                                    value={formData.latitude} 
                                    onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
                                />
                            </FormField>
                            <FormField label="Longitud">
                                <Input 
                                    type="number" step="0.0001"
                                    value={formData.longitude} 
                                    onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))}
                                />
                            </FormField>
                        </div>
                    </div>

                    {/* Technical Parameters */}
                    <div className="section-container">
                        <h3 className="section-title">Especificaciones Técnicas</h3>
                        
                        <div className="dual-field-grid">
                            <FormField label="Altura Buje (m)">
                                <Input 
                                    type="number" 
                                    value={formData.parameters.hub_height} 
                                    onChange={(e) => handleParamChange('hub_height', parseFloat(e.target.value))}
                                />
                            </FormField>
                            <FormField label="Diámetro Rotor (m)">
                                <Input 
                                    type="number" 
                                    value={formData.parameters.rotor_diameter} 
                                    onChange={(e) => handleParamChange('rotor_diameter', parseFloat(e.target.value))}
                                />
                            </FormField>
                        </div>
                        
                        {advancedMode && (
                        <>
                            <div className="dual-field-grid">
                                <FormField label="Vel. Arranque (m/s)">
                                    <Input 
                                        type="number" step="0.1"
                                        value={formData.parameters.cut_in_speed} 
                                        onChange={(e) => handleParamChange('cut_in_speed', parseFloat(e.target.value))}
                                    />
                                </FormField>
                                <FormField label="Vel. Corte (m/s)">
                                    <Input 
                                        type="number" step="0.1"
                                        value={formData.parameters.cut_out_speed} 
                                        onChange={(e) => handleParamChange('cut_out_speed', parseFloat(e.target.value))}
                                    />
                                </FormField>
                            </div>

                            <div className="dual-field-grid">
                                <FormField label="Exp. Hellman (α)" tooltip="Rugosidad. 0.10:Mar, 0.14:Tierra, 0.20:Urbano">
                                    <Input 
                                        type="number" step="0.01"
                                        value={formData.parameters.hellman_exponent} 
                                        onChange={(e) => handleParamChange('hellman_exponent', parseFloat(e.target.value))}
                                    />
                                </FormField>
                                <FormField label="Pérdidas Estela (%)">
                                    <Input 
                                        type="number" step="0.1"
                                        value={formData.parameters.losses_wake} 
                                        onChange={(e) => handleParamChange('losses_wake', parseFloat(e.target.value))}
                                    />
                                </FormField>
                            </div>

                            <div className="dual-field-grid">
                                <FormField label="Weibull Forma (k)">
                                    <Input 
                                        type="number" step="0.1"
                                        value={formData.parameters.weibull_shape} 
                                        onChange={(e) => handleParamChange('weibull_shape', parseFloat(e.target.value))}
                                    />
                                </FormField>
                                <FormField label="Weibull Escala (A)">
                                    <Input 
                                        type="number" step="0.1"
                                        value={formData.parameters.weibull_scale} 
                                        onChange={(e) => handleParamChange('weibull_scale', parseFloat(e.target.value))}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Modelo Turbina">
                                <Select 
                                    value={formData.parameters.turbine_model}
                                    onChange={(e) => handleParamChange('turbine_model', e.target.value)}
                                    options={[
                                        { value: 'generic_2mw', label: 'Genérica 2.0 MW' },
                                        { value: 'generic_3mw', label: 'Genérica 3.0 MW' },
                                        { value: 'offshore_5mw', label: 'Offshore 5.0 MW' }
                                    ]}
                                />
                            </FormField>
                        </>
                        )}
                    </div>

                    {/* Financial Parameters (Advanced Only) */}
                    {advancedMode && (
                        <div className="financial-section-container">
                            <h3 className="section-title-icon">
                                <Settings size={18} /> Asunciones Financieras
                            </h3>
                            <div className="financial-grid">
                                <FormField label="Precio Energía (€/MWh)">
                                    <Input 
                                        type="number" 
                                        value={formData.financial_params.initial_electricity_price} 
                                        onChange={(e) => handleFinancialChange('initial_electricity_price', parseFloat(e.target.value))}
                                    />
                                </FormField>
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
                            </div>

                            <div className="shared-debt-toggle">
                                <Switch 
                                    label="Financiación Externa" 
                                    checked={(formData.financial_params.debt_ratio || 0) > 0} 
                                    onChange={(checked) => handleFinancialChange('debt_ratio', checked ? 70 : 0)}
                                />
                            </div>
                            
                            {(formData.financial_params.debt_ratio || 0) > 0 && (
                                <div className="shared-debt-panel">
                                    <FormField label="Ratio Deuda (%)">
                                        <div className="shared-debt-slider-container">
                                            <input 
                                                type="range" min="0" max="100" 
                                                value={formData.financial_params.debt_ratio} 
                                                onChange={(e) => handleFinancialChange('debt_ratio', parseFloat(e.target.value))}
                                                className="shared-debt-slider"
                                            />
                                            <span className="shared-debt-value">{formData.financial_params.debt_ratio}%</span>
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

                <div className="shared-submit-wrapper">
                    <button 
                        onClick={handleSimulate} 
                        disabled={loading} 
                        className="shared-submit-btn"
                        style={{
                            appearance: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            background: 'linear-gradient(to right, #2563eb, #1d4ed8)',
                            border: 'none',
                            color: '#ffffff'
                        }}
                    >
                        <Play size={20} fill="currentColor" />
                        {loading ? 'Procesando...' : 'Ejecutar Simulación'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdvancedWindCalculator;
