const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const apis = {
  electricity: {
    ree: process.env.REE_API_URL || 'https://apidatos.ree.es/es/datos',
    pvgis: process.env.PVGIS_API_URL || 'https://re.jrc.ec.europa.eu/api/v5_2',
    entsoe: process.env.ENTSOE_API_URL || 'https://web-api.tp.entsoe.eu/api'
  },
  weather: {
    openmeteo: process.env.OPENMETEO_API_URL || 'https://api.open-meteo.com/v1',
    openmeteoArchive: process.env.OPENMETEO_ARCHIVE_URL || 'https://archive-api.open-meteo.com/v1/archive',
    openweather: process.env.OPENWEATHER_API_KEY ? (process.env.OPENWEATHER_API_URL || 'https://api.openweathermap.org/data/2.5') : null,
    weatherapi: process.env.WEATHERAPI_KEY ? (process.env.WEATHERAPI_API_URL || 'https://api.weatherapi.com/v1') : null
  },
  finance: {
    ecb: process.env.ECB_API_URL || 'https://api.exchangerate-api.com/v4/latest/EUR'
  }
};

module.exports = apis;
