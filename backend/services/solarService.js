const axios = require('axios');
const apis = require('../config/apis');
const { SOLAR } = require('../config/constants');

class SolarService {
  async getSolarData(regionCoords, options = {}) {
    try {
      // Use options or defaults
      const loss = options.loss || SOLAR.SYSTEM_LOSS;
      const angle = options.tilt || options.angle || SOLAR.OPTIMAL_ANGLE;
      const aspect = options.azimuth || options.aspect || SOLAR.OPTIMAL_ASPECT;

      // Get solar irradiation data from PVGIS
      const response = await axios.get(`${apis.electricity.pvgis}/seriescalc`, {
        params: {
          lat: regionCoords.lat,
          lon: regionCoords.lon,
          pvcalculation: 1,
          peakpower: 1,
          loss: loss,
          angle: angle,
          aspect: aspect,
          outputformat: 'json'
        }
      });

      return {
        source: 'PVGIS (European Commission)',
        solarIrradiation: response.data.outputs.totals?.irradiation || response.data.outputs.totals?.H_i || SOLAR.DEFAULT_IRRADIATION,
        annualProduction: response.data.outputs.totals?.fixed?.E_y || response.data.outputs.yearly?.E_y, 
        monthlyData: response.data.outputs.monthly?.fixed || response.data.outputs.monthly,
        optimalAngle: angle,
        optimalAspect: aspect,
        capacityFactor: response.data.outputs.totals?.capacity_factor || SOLAR.DEFAULT_CAPACITY_FACTOR
      };
    } catch (error) {
      console.error('Solar API error:', error.message); //, error.response?.data);
      return {
        source: 'Fallback Data',
        solarIrradiation: SOLAR.DEFAULT_IRRADIATION,
        annualProduction: SOLAR.DEFAULT_IRRADIATION * 0.75, // Rough estimate
        optimalAngle: SOLAR.OPTIMAL_ANGLE,
        optimalAspect: SOLAR.OPTIMAL_ASPECT,
        capacityFactor: SOLAR.DEFAULT_CAPACITY_FACTOR
      };
    }
  }
}

module.exports = new SolarService();
