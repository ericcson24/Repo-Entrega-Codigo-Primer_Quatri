const axios = require('axios');
const apis = require('../config/apis');
const { calculateSolarIrradiation, calculateCapacityFactors } = require('../utils/helpers');

class WeatherService {
  async getWeatherData(regionCoords) {
    let weatherData;

    try {
        if (apis.weather.openweather && process.env.OPENWEATHER_API_KEY) {
            // ... existing OpenWeather code ... -> Simplificado para el ejemplo si no se usa
             const response = await axios.get(`${apis.weather.openweather}/weather`, {
                params: { lat: regionCoords.lat, lon: regionCoords.lon, appid: process.env.OPENWEATHER_API_KEY, units: 'metric' }
             });
             return { /* ... mapped data ... */ };
        }
    } catch (e) { console.warn("OpenWeather failed, using fallback"); }

    // Fallback/Default to Open-Meteo
    const response = await axios.get(`${apis.weather.openmeteo}/forecast`, {
        params: {
            latitude: regionCoords.lat,
            longitude: regionCoords.lon,
            hourly: 'temperature_2m,windspeed_10m',
            daily: 'temperature_2m_max,temperature_2m_min',
            timezone: 'Europe/Madrid'
        }
    });

    return {
        source: 'Open-Meteo',
        temperature: response.data.hourly.temperature_2m[0],
        windSpeed: response.data.hourly.windspeed_10m[0],
        // ... rest of mapping
    };
  }

  /**
   * Obtiene datos históricos para simulaciones precisas (Weibull)
   */
  async getHistoricalWeather(lat, lon, years = 3) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - years);

      const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
        params: {
          latitude: lat,
          longitude: lon,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          daily: 'temperature_2m_mean,windspeed_10m_mean,windspeed_10m_max,shortwave_radiation_sum',
          timezone: 'Europe/Madrid'
        }
      });

      return {
        data: response.data.daily.time.map((t, i) => ({
          date: t,
          windMean: response.data.daily.windspeed_10m_mean[i],
          windMax: response.data.daily.windspeed_10m_max[i],
          tempMean: response.data.daily.temperature_2m_mean[i],
          radiation: response.data.daily.shortwave_radiation_sum[i]
        })),
        metadata: {
          lat, lon, start: startDate, end: endDate
        }
      };
    } catch (error) {
      console.error('Error fetching historical weather:', error.message);
      return null;
    }
  }
}

module.exports = new WeatherService();
