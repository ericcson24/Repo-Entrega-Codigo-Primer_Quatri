import React, { useState } from 'react';
import { Sun, RotateCcw, Settings, MapPin, Zap, Play } from 'lucide-react';
import { FormField, Input, Select, Switch } from '../../components/common/FormComponents';
import ResultsDashboard from '../../components/dashboards/ResultsDashboard';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import './SharedComponents.css';
import './SolarCalculator.css';

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
        capacity_kw: 2225,
        budget: 1800000, 
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
            // Preparar carga útil para Backend/Python (Porcentajes a Decimales, mapeo de claves)
            const payload = {
                ...formData,
                user_email: currentUser?.email, // Añadir email para historial
                parameters: {
                    ...formData.parameters,
                    // Si las claves en estado son antiguas, mapearlas aquí. 
                    // Renombraremos claves de estado para coincidir con Python por simplicidad.
                    // Conversiones de Unidades:
                    inverter_efficiency: formData.parameters.inverter_efficiency / 100.0,
                    system_loss: formData.parameters.system_loss / 100.0,
                    degradation_rate_annual: (formData.parameters.degradation_rate || 0.5) / 100.0,
                    
                    // Permitir claves antiguas si existen, pero preferir las correctas
                    tilt: formData.parameters.tilt || formData.parameters.tilt_angle,
                    azimuth: formData.parameters.azimuth || formData.parameters.azimuth_angle
                },
                financial_params: {
                   ...formData.financial_params,
                   debtRatio: (formData.financial_params.debt_ratio || 0) / 100.0, // Backend espera decimal 0.0 - 1.0
                   interestRate: (formData.financial_params.interest_rate || 4.5) / 100.0,
                   loanTerm: parseInt(formData.financial_params.loan_term || 15)
                }
            };

            const data = await apiService.simulate(payload);
            setResults(data);
        } catch (error) {
            alert("La simulación falló. Revisa la consola para más detalles.");
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
            <div className="solar-results-container">
                <div className="solar-header">
                    <h2 className="solar-title">
                        <Sun className="icon-title-solar" /> Resultados de Simulación
                    </h2>
                    <button 
                        onClick={resetForm}
                        className="btn-new-simulation-solar"
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
        <div className="calculator-wrapper">
             <div className="solar-card">
                <div className="card-head-wrapper">
                    <div>
                        <h2 className="solar-main-title">Configuración Solar FV</h2>
                        <p className="solar-subtitle">Configura los parámetros de tu sistema fotovoltaico.</p>
                    </div>
                    <Switch 
                        label="Modo Avanzado" 
                        checked={advancedMode} 
                        onChange={setAdvancedMode}
                    />
                </div>

                <div className="solar-grid-layout">
                    
                    {/* Basic Parameters */}
                    <div className="solar-col">
                        <h3 className="solar-section-title">Datos Básicos</h3>
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
                    <div className="solar-col">
                        <h3 className="solar-section-title">Ajustes Técnicos</h3>
                        
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
                                <div className="grid-2-col">
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
                                
                                <div className="grid-2-col">
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
                        <div className="financial-area">
                            <h3 className="financial-title">
                                <Settings size={18} /> Asunciones Financieras
                            </h3>
                            <div className="financial-grid-4">
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
                                    <FormField label="Ratio Deuda (%)" tooltip="Porcentaje financiado con banco">
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
                                    <FormField label="Tipo Interés (%)">
                                        <Input 
                                            type="number" step="0.1"
                                            value={formData.financial_params.interest_rate} 
                                            onChange={(e) => handleFinancialChange('interest_rate', e.target.value)}
                                        />
                                    </FormField>
                                    <FormField label="Plazo Préstamo (Años)">
                                        <Input 
                                            type="number" step="1"
                                            value={formData.financial_params.loan_term || 15} 
                                            onChange={(e) => handleFinancialChange('loan_term', e.target.value)}
                                        />
                                    </FormField>
                                </div>
                            )}
                            
                             {/* Advanced Business Model & OPEX */}
                             <div className="business-model-layout">
                                {/* Autoconsumo */}
                                <div className="business-model-column">
                                    <h4 className="business-model-header">Modelo de Ingresos</h4>
                                    <FormField label="% Autoconsumo" tooltip="Porcentaje de energía consumida in-situ (vs vendida a red)">
                                        <Input 
                                            type="number" min="0" max="100"
                                            value={(formData.financial_params.self_consumption_ratio || 0) * 100} 
                                            onChange={(e) => handleFinancialChange('self_consumption_ratio', parseFloat(e.target.value) / 100)}
                                        />
                                    </FormField>
                                    <div className="grid-2-col">
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
                                <div className="business-model-column">
                                    <h4 className="business-model-header">Gastos y Fiscalidad</h4>
                                    <div className="grid-2-col">
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
                                    <div className="grid-2-col">
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

export default SolarCalculator;
