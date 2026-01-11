const solarService = require('../services/solarService');
const cache = require('../utils/cache');
const { getRegionCoordinates } = require('../utils/helpers');

class SolarController {
  async getSolarData(req, res) {
    try {
      const { region } = req.params;
      const cacheKey = `solar_${region}`;

      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const regionCoords = getRegionCoordinates(region);
      const solarData = await solarService.getSolarData(regionCoords);

      cache.set(cacheKey, solarData);
      res.json(solarData);
    } catch (error) {
      console.error('Solar API error:', error.message);
      res.status(500).json({ error: 'Failed to fetch solar data' });
    }
  }
}

module.exports = new SolarController();
