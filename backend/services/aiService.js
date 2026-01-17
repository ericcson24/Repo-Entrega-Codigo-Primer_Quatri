const axios = require('axios');

const AI_ENGINE_URL = 'http://localhost:8000';

class AIService {
    async getPrediction(techType, params) {
        try {
            const endpoint = `${AI_ENGINE_URL}/predict/${techType}`;
            const response = await axios.post(endpoint, params);
            return response.data;
        } catch (error) {
            console.error(`Error calling AI Engine for ${techType}:`, error.message);
            // Fallback mock logic if AI engine is down
            return this.getMockData(techType, params);
        }
    }

    async trainModel(techType) {
        try {
            const response = await axios.post(`${AI_ENGINE_URL}/train/${techType}`);
            return response.data;
        } catch (error) {
            console.error("Training trigger failed:", error.message);
            throw new Error("AI Training Unavailable");
        }
    }

    getMockData(techType, params) {
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
