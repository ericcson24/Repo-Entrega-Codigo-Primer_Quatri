import React, { useState } from 'react';
import { Sun, RotateCcw, Play, Settings, MapPin } from 'lucide-react';
import { FormField, Input, Select, Switch } from '../../components/common/FormComponents';
import ResultsDashboard from '../../components/dashboards/ResultsDashboard';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const SolarCalculator = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [advancedMode, setAdvancedMode] = useState(false);

    const [formData, setFormData] = useState({
        project_type: 'solar',
        latitude: 40.4168,
        longitude: -3.7038,
        capacity_kw: 100,
        budget: 50000,
        parameters: {
            panel_type: 'monocrystalline',
            orientation: 'south',
            tilt: 30, // Was tilt_angle
            azimuth: 180, // Was azimuth_angle
            system_loss: 14,
            inverter_efficiency: 96,
            degradation_rate: 0.5
        },
        financial_params: {
            inflation_rate: 2.0,
            electricity_price_increase: 1.5,
            discount_rate: 4.0,
            project_lifetime: 25
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
                    degradation_rate_annual: formData.parameters.degradation_rate / 100.0,
                    
                    // Allow legacy keys if they exist in state, but prefer correct keys
                    tilt: formData.parameters.tilt || formData.parameters.tilt_angle,
                    azimuth: formData.parameters.azimuth || formData.parameters.azimuth_angle
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
                        <Sun className="text-yellow-500" /> Simulation Results
                    </h2>
                    <button 
                        onClick={resetForm}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <RotateCcw size={16} /> New Simulation
                    </button>
                </div>
                <ResultsDashboard results={results} projectType="solar" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Solar PV Configuration</h2>
                        <p className="text-gray-500 dark:text-gray-400">Configure your photovoltaic system parameters.</p>
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
                        
                        <FormField label="System Capacity (kW)" tooltip="Total installed peak power of the solar array">
                            <Input 
                                type="number" 
                                value={formData.capacity_kw} 
                                onChange={(e) => handleInputChange('capacity_kw', parseFloat(e.target.value))}
                            />
                        </FormField>

                        <FormField label="Total Budget (€)" tooltip="Initial CAPEX investment estimate">
                            <Input 
                                type="number" 
                                value={formData.budget} 
                                onChange={(e) => handleInputChange('budget', parseFloat(e.target.value))}
                            />
                        </FormField>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Latitude" icon={MapPin}>
                                <Input 
                                    type="number" 
                                    step="0.0001"
                                    value={formData.latitude} 
                                    onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
                                />
                            </FormField>
                            <FormField label="Longitude">
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
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 border-b pb-2 border-gray-200 dark:border-gray-700">Technical Specs</h3>
                        
                        <FormField label="Panel Technology">
                            <Select 
                                value={formData.parameters.panel_type}
                                onChange={(e) => handleParamChange('panel_type', e.target.value)}
                                options={[
                                    { value: 'monocrystalline', label: 'Monocrystalline (High Efficiency)' },
                                    { value: 'polycrystalline', label: 'Polycrystalline (Budget Friendly)' },
                                    { value: 'thin_film', label: 'Thin Film (Flexible)' }
                                ]}
                            />
                        </FormField>
                        
                        {advancedMode && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Tilt Angle (º)">
                                        <Input 
                                            type="number" 
                                            value={formData.parameters.tilt} 
                                            onChange={(e) => handleParamChange('tilt', parseFloat(e.target.value))}
                                        />
                                    </FormField>
                                    <FormField label="Azimuth (180=S)">
                                        <Input 
                                            type="number" 
                                            value={formData.parameters.azimuth} 
                                            onChange={(e) => handleParamChange('azimuth', parseFloat(e.target.value))}
                                        />
                                    </FormField>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="System Loss (%)">
                                        <Input 
                                            type="number" step="0.1"
                                            value={formData.parameters.system_loss} 
                                            onChange={(e) => handleParamChange('system_loss', parseFloat(e.target.value))}
                                        />
                                    </FormField>
                                    <FormField label="Inverter Eff. (%)">
                                        <Input 
                                            type="number" step="0.1"
                                            value={formData.parameters.inverter_efficiency} 
                                            onChange={(e) => handleParamChange('inverter_efficiency', parseFloat(e.target.value))}
                                        />
                                    </FormField>
                                </div>

                                <FormField label="Annual Degradation (%)">
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
                                <Settings size={18} /> Financial Assumptions
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <FormField label="Project Lifetime (Yrs)">
                                    <Input 
                                        type="number" 
                                        value={formData.financial_params.project_lifetime} 
                                        onChange={(e) => handleFinancialChange('project_lifetime', e.target.value)}
                                    />
                                </FormField>
                                <FormField label="Discount Rate (%)">
                                    <Input 
                                        type="number" step="0.1"
                                        value={formData.financial_params.discount_rate} 
                                        onChange={(e) => handleFinancialChange('discount_rate', e.target.value)}
                                    />
                                </FormField>
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
                                <span>Running Simulation...</span>
                            </>
                        ) : (
                            <>
                                <Play size={20} fill="currentColor" />
                                <span>Run Simulation</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SolarCalculator;
