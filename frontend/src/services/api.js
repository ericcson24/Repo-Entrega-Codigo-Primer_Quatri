import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
    constructor() {
        this.client = axios.create({
            baseURL: API_URL,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Fetch Spanish cities with coordinates
     */
    async getCities() {
        // Fallback static list for reliability
        const staticCities = [
            { name: 'Madrid', lat: 40.4168, lon: -3.7038 },
            { name: 'Barcelona', lat: 41.3851, lon: 2.1734 },
            { name: 'Valencia', lat: 39.4699, lon: -0.3763 },
            { name: 'Sevilla', lat: 37.3891, lon: -5.9845 },
            { name: 'Zaragoza', lat: 41.6488, lon: -0.8891 },
            { name: 'Málaga', lat: 36.7213, lon: -4.4214 },
            { name: 'Murcia', lat: 37.9922, lon: -1.1307 },
            { name: 'Palma', lat: 39.5696, lon: 2.6502 },
            { name: 'Las Palmas', lat: 28.1235, lon: -15.4363 },
            { name: 'Bilbao', lat: 43.2630, lon: -2.9350 }
        ];
        return staticCities; 
    }

    /**
     * Get Catalog items from Backend (proxied to AI Engine)
     * @param {string} type 'turbines' | 'solar-panels'
     */
    async getCatalog(type) {
        try {
            const endpoint = type === 'wind' ? 'turbines' : 'solar-panels';
            const response = await this.client.get(`/catalog/${endpoint}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching catalog ${type}:`, error);
            return [];
        }
    }

    /**
     * Send Simulation Request
     * @param {object} payload 
     */
    async simulate(payload) {
        try {
            const response = await this.client.post('/simulate', payload);
            return response.data;
        } catch (error) {
            console.error("Simulation error:", error);
            throw error;
        }
    }
}

export const apiService = new ApiService();
