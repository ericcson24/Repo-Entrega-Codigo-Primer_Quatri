import React, { useState } from 'react';
import { Droplets, RotateCcw, Play, Settings, MapPin } from 'lucide-react';
import { FormField, Input, Select, Switch } from '../../components/common/FormComponents';
import ResultsDashboard from '../../components/dashboards/ResultsDashboard';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const HydroCalculator = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [advancedMode, setAdvancedMode] = useState(false);

    const [formData, setFormData] = useState({
        project_type: 'hydro',
        latitude: 40.4168,
        longitude: -3.7038,
        capacity_kw: 500,
        budget: 1200000,
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
            project_lifetime: 30
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

    const handleSimulate = async () => {
        setLoading(true);
        try {
            const data = await apiService.simulate({
                ...formData,
                user_email: currentUser?.email
            });
            setResults(data);
        } catch (error) {
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
                        <Droplets className="text-cyan-500" /> Hydro Results
                    </h2>
                    <button onClick={resetForm} className="btn-secondary">
                        <RotateCcw size={16} /> New Simulation
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
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Hydro Configuration</h2>
                        <p className="text-gray-500 dark:text-gray-400">Run-of-river and small hydro simulation.</p>
                    </div>
                    <Switch label="Advanced" checked={advancedMode} onChange={setAdvancedMode} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-6">
                        <h3 className="section-title">Project Basics</h3>
                        <FormField label="Capacity (kW)"><Input type="number" value={formData.capacity_kw} onChange={(e) => handleInputChange('capacity_kw', parseFloat(e.target.value))} /></FormField>
                        <FormField label="Budget (€)"><Input type="number" value={formData.budget} onChange={(e) => handleInputChange('budget', parseFloat(e.target.value))} /></FormField>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField label="Lat"><Input type="number" step="0.0001" value={formData.latitude} onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))} /></FormField>
                             <FormField label="Lon"><Input type="number" step="0.0001" value={formData.longitude} onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))} /></FormField>
                        </div>
                    </div>

                    <div className="space-y-6">
                         <h3 className="section-title">Hydrology & Hydraulics</h3>
                         <div className="grid grid-cols-2 gap-4">
                            <FormField label="Design Flow (m³/s)" tooltip="Q_design"><Input type="number" step="0.1" value={formData.parameters.flow_rate_design} onChange={(e) => handleParamChange('flow_rate_design', e.target.value)} /></FormField>
                            <FormField label="Gross Head (m)" tooltip="Vertical drop"><Input type="number" step="0.1" value={formData.parameters.gross_head} onChange={(e) => handleParamChange('gross_head', e.target.value)} /></FormField>
                         </div>
                         
                         {advancedMode && (
                             <>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Eco Flow (m³/s)" tooltip="Reserved for river health"><Input type="number" step="0.1" value={formData.parameters.ecological_flow} onChange={(e) => handleParamChange('ecological_flow', e.target.value)} /></FormField>
                                    <FormField label="Turbine Eff. (0-1)"><Input type="number" step="0.01" max="1" value={formData.parameters.turbine_efficiency} onChange={(e) => handleParamChange('turbine_efficiency', e.target.value)} /></FormField>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField label="Penstock Len (m)"><Input type="number" step="1" value={formData.parameters.penstock_length} onChange={(e) => handleParamChange('penstock_length', e.target.value)} /></FormField>
                                    <FormField label="Penstock Dia (m)"><Input type="number" step="0.1" value={formData.parameters.penstock_diameter} onChange={(e) => handleParamChange('penstock_diameter', e.target.value)} /></FormField>
                                </div>
                             </>
                         )}
                    </div>
                </div>
                 <div className="mt-8 flex justify-end">
                    <button onClick={handleSimulate} disabled={loading} className="btn-primary">
                        {loading ? 'Processing...' : 'Run Simulation'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HydroCalculator;
