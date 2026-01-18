const axios = require('axios');

const AI_ENGINE_URL = 'http://localhost:8000';

class AIService {
    async getPrediction(techType, params) {
        try {
            const endpoint = `${AI_ENGINE_URL}/predict/${techType}`;
            const response = await axios.post(endpoint, params);
            return response.data;
        } catch (error) {
            console.error(`Error al llamar al Motor de Estimación para ${techType}:`, error.message);
            // Lógica alternativa si el motor de estimación no está disponible
            return this.getMockData(techType, params);
        }
    }

    async trainModel(techType) {
        try {
            const response = await axios.post(`${AI_ENGINE_URL}/train/${techType}`);
            return response.data;
        } catch (error) {
            console.error("Fallo al iniciar entrenamiento:", error.message);
            throw new Error("Entrenamiento no disponible");
        }
    }

    async getSolarPotential(lat, lon) {
        try {
            const response = await axios.get(`${AI_ENGINE_URL}/predict/solar-potential`, {
                params: { lat, lon }
            });
            return response.data;
        } catch (error) {
            console.error("Error fetching solar potential:", error.message);
            // Fallback for Spain average
            return { peak_sun_hours: 1600 };
        }
    }

    getMockData(techType, params) {
        console.warn(`[WARNING] AI Engine unavailable. Returning static MOCK data for ${techType}. Check if python server is running on port 8000.`);
        const capacity = params.capacity_kw || 100;
        let mockYield = 0;
        if (techType === 'solar') mockYield = capacity * 1500;
        if (techType === 'wind') mockYield = capacity * 2500;
        if (techType === 'hydro') mockYield = capacity * 4000; // High availability
        if (techType === 'biomass') mockYield = capacity * 7000; // Base load
        
        return {
            annual_generation_kwh: mockYield,
            monthly_generation: Array(12).fill(mockYield/12),
            hourly_generation_kwh: Array(8760).fill(mockYield/8760)
        };
    }
}

module.exports = new AIService();
