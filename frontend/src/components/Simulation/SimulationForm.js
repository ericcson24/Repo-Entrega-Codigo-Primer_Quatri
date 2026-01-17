import React, { useState } from 'react';
import { SIMULATION_DEFAULTS } from '../../config/constants';
import { SimulationService } from '../../services/simulationService';

const SimulationForm = ({ onSimulationComplete }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        project_type: 'solar',
        latitude: 40.4168,
        longitude: -3.7038,
        capacity_kw: 100,
        budget: 50000,
        parameters: {}
    });

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const results = await SimulationService.runSimulation(formData);
            if (onSimulationComplete) {
                onSimulationComplete(results);
            }
        } catch (err) {
            setError(err.error || "Ocurrió un error al realizar la simulación.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Nueva Simulación</h2>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Tecnología
                    </label>
                    <select
                        name="project_type"
                        value={formData.project_type}
                        onChange={handleChange}
                        className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    >
                        {SIMULATION_DEFAULTS.PROJECT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-wrap -mx-3 mb-4">
                    <div className="w-full md:w-1/2 px-3 mb-6 md:mb-0">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Latitud
                        </label>
                        <input
                            type="number"
                            step="any"
                            name="latitude"
                            value={formData.latitude}
                            onChange={handleChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div className="w-full md:w-1/2 px-3">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                            Longitud
                        </label>
                        <input
                            type="number"
                            step="any"
                            name="longitude"
                            value={formData.longitude}
                            onChange={handleChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                </div>

                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Capacidad (kW)
                    </label>
                    <input
                        type="number"
                        name="capacity_kw"
                        value={formData.capacity_kw}
                        onChange={handleChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        Presupuesto (€)
                    </label>
                    <input
                        type="number"
                        name="budget"
                        value={formData.budget}
                        onChange={handleChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    />
                </div>

                <div className="flex items-center justify-between">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {loading ? 'Simulando...' : 'Iniciar Simulación'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SimulationForm;
