import React, { useState } from 'react';
import { Wind, RotateCcw, Play, Settings, MapPin } from 'lucide-react';
import { FormField, Input, Select, Switch } from '../../components/common/FormComponents';
import ResultsDashboard from '../../components/dashboards/ResultsDashboard';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const AdvancedWindCalculator = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [advancedMode, setAdvancedMode] = useState(false);

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
            discount_rate: 5.0,
            project_lifetime: 20
        }
    });

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
                    // Flatten or Map parameters here if needed
                }
            };
            const data = await apiService.simulate(payload);
            setResults(data);
        } catch (error) {
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
                        <Wind className="text-blue-500" /> Wind Simulation Results
                    </h2>
                    <button 
                        onClick={resetForm}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <RotateCcw size={16} /> New Simulation
                    </button>
                </div>
                <ResultsDashboard results={results} projectType="wind" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Wind Farm Configuration</h2>
                        <p className="text-gray-500 dark:text-gray-400">Configure your wind turbine parameters.</p>
                    </div>
                    <Switch 
                        label="Advanced Mode" 
                        checked={advancedMode} 
                        onChange={setAdvancedMode}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    
                    {/* Basic Parameters */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 border-gray-200 dark:border-gray-700">Project Basics</h3>
                        
                        <FormField label="Total Capacity (kW)" tooltip="Total installed peak power">
                            <Input 
                                type="number" 
                                value={formData.capacity_kw} 
                                onChange={(e) => handleInputChange('capacity_kw', parseFloat(e.target.value))}
                            />
                        </FormField>

                        <FormField label="Total Budget (€)">
                            <Input 
                                type="number" 
                                value={formData.budget} 
                                onChange={(e) => handleInputChange('budget', parseFloat(e.target.value))}
                            />
                        </FormField>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Latitude">
                                <Input 
                                    type="number" step="0.0001"
                                    value={formData.latitude} 
                                    onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
                                />
                            </FormField>
                            <FormField label="Longitude">
                                <Input 
                                    type="number" step="0.0001"
                                    value={formData.longitude} 
                                    onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))}
                                />
                            </FormField>
                        </div>
                    </div>

                    {/* Technical Parameters */}
                    <div className="space-y-6">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 border-gray-200 dark:border-gray-700">Turbine & Physics Specs</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Hub Height (m)">
                                <Input 
                                    type="number" 
                                    value={formData.parameters.hub_height} 
                                    onChange={(e) => handleParamChange('hub_height', parseFloat(e.target.value))}
                                />
                            </FormField>
                            <FormField label="Rotor Diameter (m)">
                                <Input 
                                    type="number" 
                                    value={formData.parameters.rotor_diameter} 
                                    onChange={(e) => handleParamChange('rotor_diameter', parseFloat(e.target.value))}
                                />
                            </FormField>
                        </div>
                        
                        {advancedMode && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Cut-in Speed (m/s)">
                                    <Input 
                                        type="number" step="0.1"
                                        value={formData.parameters.cut_in_speed} 
                                        onChange={(e) => handleParamChange('cut_in_speed', parseFloat(e.target.value))}
                                    />
                                </FormField>
                                <FormField label="Cut-out Speed (m/s)">
                                    <Input 
                                        type="number" step="0.1"
                                        value={formData.parameters.cut_out_speed} 
                                        onChange={(e) => handleParamChange('cut_out_speed', parseFloat(e.target.value))}
                                    />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Hellman Exponent (α)" tooltip="Friction/Roughness. 0.10:Offshore, 0.14:Land, 0.20:Urban">
                                    <Input 
                                        type="number" step="0.01"
                                        value={formData.parameters.hellman_exponent} 
                                        onChange={(e) => handleParamChange('hellman_exponent', parseFloat(e.target.value))}
                                    />
                                </FormField>
                                <FormField label="Wake Losses (%)">
                                    <Input 
                                        type="number" step="0.1"
                                        value={formData.parameters.losses_wake} 
                                        onChange={(e) => handleParamChange('losses_wake', parseFloat(e.target.value))}
                                    />
                                </FormField>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField label="Weibull Shape (k)" tooltip="2.0 is standard Rayleigh dist">
                                    <Input 
                                        type="number" step="0.1"
                                        value={formData.parameters.weibull_shape} 
                                        onChange={(e) => handleParamChange('weibull_shape', parseFloat(e.target.value))}
                                    />
                                </FormField>
                                <FormField label="Weibull Scale (A)" tooltip="Linked to avg wind speed">
                                    <Input 
                                        type="number" step="0.1"
                                        value={formData.parameters.weibull_scale} 
                                        onChange={(e) => handleParamChange('weibull_scale', parseFloat(e.target.value))}
                                    />
                                </FormField>
                            </div>

                            <FormField label="Turbine Model">
                                <Select 
                                    value={formData.parameters.turbine_model}
                                    onChange={(e) => handleParamChange('turbine_model', e.target.value)}
                                    options={[
                                        { value: 'generic_2mw', label: 'Generic 2.0 MW' },
                                        { value: 'generic_3mw', label: 'Generic 3.0 MW' },
                                        { value: 'offshore_5mw', label: 'Offshore 5.0 MW' }
                                    ]}
                                />
                            </FormField>
                        </>
                        )}
                    </div>

                    <div className="md:col-span-2 flex justify-end">
                         <button
                            onClick={handleSimulate}
                            disabled={loading}
                            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50"
                        >
                            {loading ? <span>Simulating...</span> : <> <Play size={20} /> <span>Run Simulation</span> </>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdvancedWindCalculator;
