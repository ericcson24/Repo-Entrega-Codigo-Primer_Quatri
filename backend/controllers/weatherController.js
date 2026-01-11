const weatherService = require('../services/weatherService');
const cache = require('../utils/cache');
const { getRegionCoordinates } = require('../utils/helpers');

class WeatherController {
  async getWeather(req, res) {
    try {
      const { region } = req.params;
      const cacheKey = `weather_${region}`;

      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const regionCoords = getRegionCoordinates(region);
      const weatherData = await weatherService.getWeatherData(regionCoords);

      cache.set(cacheKey, weatherData);
      res.json(weatherData);
    } catch (error) {
      console.error('Weather API error:', error.message);
      res.status(500).json({ error: 'Failed to fetch weather data' });
    }
  }
}

module.exports = new WeatherController();
