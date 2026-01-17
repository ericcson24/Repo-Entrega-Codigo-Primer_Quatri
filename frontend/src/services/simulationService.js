import axios from 'axios';
import { API_BASE_URL } from '../config/constants';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const SimulationService = {
    /**
     * Run a new simulation
     * @param {Object} data - { project_type, latitude, longitude, capacity_kw, budget, parameters }
     */
    runSimulation: async (data) => {
        try {
            const response = await api.post('/simulate', data);
            return response.data;
        } catch (error) {
            console.error("Simulation Error:", error);
            throw error.response ? error.response.data : new Error("Network Error");
        }
    },

    /**
     * Get equipment catalog for a technology
     * @param {string} technology - 'solar', 'wind', 'hydro', 'biomass', 'battery'
     */
    getCatalog: async (technology) => {
        try {
            const response = await api.get(`/catalog/${technology}`);
            return response.data;
        } catch (error) {
            console.error(`Catalog Error (${technology}):`, error);
            return [];
        }
    }
};

export default api;
