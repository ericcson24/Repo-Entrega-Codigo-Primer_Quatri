const axios = require('axios');
const { URLS } = require('../config/constants');

// URL del motor de cálculo físico en Python
const PHYSICS_ENGINE_URL = URLS.PHYSICS_ENGINE_BASE_URL;

class PhysicsService {
    // Calcula la generación de energía usando modelos físicos
    async getPrediction(techType, params) {
        try {
            const endpoint = `${PHYSICS_ENGINE_URL}/predict/${techType}`;
            const response = await axios.post(endpoint, params);
            return response.data;
        } catch (error) {
            // Si falla, devolvemos estimaciones básicas
            return this.getMockData(techType, params);
        }
    }

    // Obtiene el potencial solar de una ubicación
    async getSolarPotential(lat, lon) {
        try {
            const response = await axios.get(`${PHYSICS_ENGINE_URL}/predict/solar-potential`, {
                params: { lat, lon }
            });
            return response.data;
        } catch (error) {
            // Valor típico de horas de sol en España
            return { peak_sun_hours: 1600 };
        }
    }

    // Genera estimaciones básicas si el motor de cálculo no está disponible
    getMockData(techType, params) {
        const capacity = params.capacity_kw || 100;
        let mockYield = 0;
        // Factores de capacidad típicos por tecnología
        if (techType === 'solar') mockYield = capacity * 1500;
        if (techType === 'wind') mockYield = capacity * 2500;
        if (techType === 'hydro') mockYield = capacity * 4000; 
        if (techType === 'biomass') mockYield = capacity * 7000; 
        
        return {
            annual_generation_kwh: mockYield,
            monthly_generation: Array(12).fill(mockYield/12),
            hourly_generation_kwh: Array(8760).fill(mockYield/8760)
        };
    }
}

module.exports = new PhysicsService();
