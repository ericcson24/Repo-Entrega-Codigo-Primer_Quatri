import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import EquipmentSelector from '../common/EquipmentSelector';
import { Calculator, MapPin, DollarSign, Zap } from 'lucide-react';

const SolarCalculator = ({ onSimulate }) => {
    const [cities, setCities] = useState([]);
    const [formData, setFormData] = useState({
        city: '',
        lat: '',
        lon: '',
        panel_id: '',
        surface_area: 50,
        budget: 15000,
        consumption: 300,
        electricity_price: 0.15
    });

    useEffect(() => {
        apiService.getCities().then(setCities);
    }, []);

    const handleCityChange = (e) => {
        const cityName = e.target.value;
        const city = cities.find(c => c.name === cityName);
        if (city) {
            setFormData(prev => ({
                ...prev,
                city: city.name,
                lat: city.lat,
                lon: city.lon
            }));
        }
    };

    const handleEquipmentSelect = (item) => {
        if (item) {
            setFormData(prev => ({ ...prev, panel_id: item.id }));
        } else {
            setFormData(prev => ({ ...prev, panel_id: '' }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSimulate({
            type: 'solar',
            ...formData
        });
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Solar PV Simulation</h2>
                <p className="text-gray-400">Advanced analysis using industry-standard PV catalog data.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Location Section */}
                <div className="card-panel">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200 mb-4">
                        <MapPin size={20} className="text-cyan-400" />
                        Location
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Select City</label>
                            <select 
                                className="input-field"
                                value={formData.city}
                                onChange={handleCityChange}
                                required
                            >
                                <option value="">Select a location...</option>
                                {cities.map(c => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                                <input type="number" className="input-field text-gray-500" value={formData.lat} readOnly />
                             </div>
                             <div>
                                <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                                <input type="number" className="input-field text-gray-500" value={formData.lon} readOnly />
                             </div>
                        </div>
                    </div>
                </div>

                {/* Equipment Section */}
                <div className="card-panel">
                     <EquipmentSelector type="solar" onSelect={handleEquipmentSelect} />

                     <div className="mb-4">
                        <label className="block text-xs text-gray-500 mb-1">Available Surface Area (m²)</label>
                        <input 
                            type="number" 
                            className="input-field"
                            value={formData.surface_area}
                            onChange={e => setFormData({...formData, surface_area: Number(e.target.value)})} 
                        />
                     </div>
                </div>

                {/* Economics Section */}
                <div className="card-panel">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-200 mb-4">
                        <DollarSign size={20} className="text-green-400" />
                        Financial Parameters
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Budget (€)</label>
                            <input 
                                type="number" 
                                className="input-field" 
                                value={formData.budget}
                                onChange={e => setFormData({...formData, budget: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Monthly Consumption (kWh)</label>
                            <input 
                                type="number" 
                                className="input-field" 
                                value={formData.consumption}
                                onChange={e => setFormData({...formData, consumption: Number(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Elec. Price (€/kWh)</label>
                            <input 
                                type="number" 
                                step="0.01"
                                className="input-field" 
                                value={formData.electricity_price}
                                onChange={e => setFormData({...formData, electricity_price: Number(e.target.value)})}
                            />
                        </div>
                    </div>
                </div>

                <button type="submit" className="w-full btn-primary py-4 text-lg shadow-lg shadow-cyan-900/20">
                    RUN SIMULATION
                </button>
            </form>
        </div>
    );
};

export default SolarCalculator;
