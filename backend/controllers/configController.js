const constants = require('../config/constants');

class ConfigController {
  getConfig(req, res) {
    try {
      res.json({
        success: true,
        market: constants.MARKET,
        solar: constants.SOLAR,
        wind: constants.WIND,
        weather: constants.WEATHER,
        cities: constants.CITIES,
        source: 'Backend Configuration API'
      });
    } catch (error) {
      console.error('Error fetching config:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener configuración'
      });
    }
  }
}

module.exports = new ConfigController();
