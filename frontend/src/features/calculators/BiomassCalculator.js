import React, { useState } from 'react';
import { Leaf, RotateCcw, Play, Settings, MapPin } from 'lucide-react';
import { FormField, Input, Select, Switch } from '../../components/common/FormComponents';
import ResultsDashboard from '../../components/dashboards/ResultsDashboard';
import { apiService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const BiomassCalculator = () => {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [advancedMode, setAdvancedMode] = useState(false);

    const [formData, setFormData] = useState({
        project_type: 'biomass',
        latitude: 40.4168,
        longitude: -3.7038,
        capacity_kw: 1000,
        budget: 3000000,
        parameters: {
            feedstock_type: 'wood_chips',
            moisture_content: 20,
            calorific_value_dry: 19.0,
            plant_efficiency: 0.25,
            availability_factor: 0.92
        },
        financial_params: {
            inflation_rate: 2.0,
            electricity_price_increase: 1.5,
            discount_rate: 7.0,
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
                        <Leaf className="text-green-500" /> Biomass Results
                    </h2>
                    <button onClick={resetForm} className="btn-secondary">
                        <RotateCcw size={16} /> New Simulation
                    </button>
                </div>
                <ResultsDashboard results={results} projectType="biomass" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
             <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Biomass Configuration</h2>
                        <p className="text-gray-500 dark:text-gray-400">Bioenergy parameters.</p>
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
                         <h3 className="section-title">Feedstock & Conversion</h3>
                         <FormField label="Type">
                             <Select value={formData.parameters.feedstock_type} onChange={(e) => handleParamChange('feedstock_type', e.target.value)} 
                                options={[{value: 'wood_chips', label: 'Wood Chips'}, {value: 'pellets', label: 'Pellets'}, {value: 'agricultural_waste', label: 'Agricultural Waste'}]}
                             />
                         </FormField>
                         <div className="grid grid-cols-2 gap-4">
                            <FormField label="Moisture (%)"><Input type="number" value={formData.parameters.moisture_content} onChange={(e) => handleParamChange('moisture_content', parseFloat(e.target.value))} /></FormField>
                            <FormField label="LHV Dry (MJ/kg)"><Input type="number" step="0.1" value={formData.parameters.calorific_value_dry} onChange={(e) => handleParamChange('calorific_value_dry', parseFloat(e.target.value))} /></FormField>
                         </div>

                         {advancedMode && (
                             <div className="grid grid-cols-2 gap-4">
                                <FormField label="Plant Eff. (0-1)"><Input type="number" step="0.01" max="1" value={formData.parameters.plant_efficiency} onChange={(e) => handleParamChange('plant_efficiency', parseFloat(e.target.value))} /></FormField>
                                <FormField label="Availability (0-1)"><Input type="number" step="0.01" max="1" value={formData.parameters.availability_factor} onChange={(e) => handleParamChange('availability_factor', parseFloat(e.target.value))} /></FormField>
                             </div>
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

export default BiomassCalculator;
