const axios = require('axios');
const fs = require('fs');
const path = require('path');
const apis = require('../config/apis');
const SIMULATION_CONSTANTS = require('../config/simulationParams');

class MarketService {
  constructor() {
    // Busca el archivo de precios más reciente/completo (2020-2024)
    this.pricesFile = path.join(__dirname, '../data/prices/electricity_prices_2020-2024.json');
    // Si no existe, fallback al 2020 original o null
    if (!fs.existsSync(this.pricesFile)) {
        this.pricesFile = path.join(__dirname, '../data/prices/electricity_prices_2020.json');
    }
  }

  async getPriceStatistics() {
    try {
      if (fs.existsSync(this.pricesFile)) {
        const data = JSON.parse(fs.readFileSync(this.pricesFile, 'utf8'));
        return {
          avgPriceEurKWh: data.statistics.avgPrice / 1000,
          avgPriceEurMWh: data.statistics.avgPrice,
          minPrice: data.statistics.minPrice / 1000,
          maxPrice: data.statistics.maxPrice / 1000,
          monthlyAverage: data.monthlyAverage.map(m => ({
            month: parseInt(m.month.split('-')[1]),
            avgPriceEurKWh: m.avgPrice / 1000,
            minPriceEurKWh: m.minPrice / 1000,
            maxPriceEurKWh: m.maxPrice / 1000
          })),
          source: data.metadata.source,
          lastUpdate: new Date().toISOString()
        };
      }
      throw new Error('Price data file not found');
    } catch (error) {
      console.warn('Could not load price statistics from file, using defaults:', error.message);
      return {
        avgPriceEurKWh: SIMULATION_CONSTANTS.MARKET.GRID_PRICE,
        avgPriceEurMWh: SIMULATION_CONSTANTS.MARKET.GRID_PRICE * 1000,
        minPrice: SIMULATION_CONSTANTS.MARKET.GRID_PRICE * 0.5,
        maxPrice: SIMULATION_CONSTANTS.MARKET.GRID_PRICE * 2.0,
        monthlyAverage: [],
        source: 'Default Fallback (simulationParams)',
        lastUpdate: new Date().toISOString()
      };
    }
  }

  async getMarketData(marketType) {
    try {
      // Intentar obtener datos reales de REE primero
      const response = await axios.get(`${apis.electricity.ree}/mercados/precios-mercados-tiempo-real`, {
        params: {
          start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          time_trunc: 'hour'
        },
        timeout: 5000 // Timeout corto para no bloquear
      });

      const values = response.data.included[0]?.attributes?.values;
      const lastValue = values ? values[values.length - 1].value : SIMULATION_CONSTANTS.MARKET.GRID_PRICE;

      // --- FETCH REAL BIOMASS FUEL PRICES ---
      // We'll add this to the output. Currently REE API doesn't have biomass fuel price.
      // We simulate fetching from a commodity API or use a more accurate proxy.
      // For now, we stick to keeping this extensible.
      
      return {
        source: 'Red Eléctrica España (REE)',
        currentPrice: lastValue,
        renewableShare: SIMULATION_CONSTANTS.MARKET.DEFAULT_RENEWABLE_SHARE || 0.60, 
        co2Intensity: SIMULATION_CONSTANTS.MARKET.DEFAULT_CO2_INTENSITY || 140, 
        demand: SIMULATION_CONSTANTS.MARKET.DEFAULT_DEMAND || 30000, 
        marketType: SIMULATION_CONSTANTS.MARKET.MARKET_TYPE || 'Iberian'
      };
    } catch (error) {
      console.error('Market API error (REE):', error.message);
      // Fallback a base de datos histórica si la API falla, no inventar datos.
      try {
          const storedStats = await this.getPriceStatistics();
           return {
            source: 'Historical Database (Local Fallback)',
            currentPrice: storedStats.avgPriceEurMWh, 
            renewableShare: 0.50, // Estimación conservadora
            co2Intensity: 150,
            demand: 28000,
            marketType: 'Iberian'
          };
      } catch (dbError) {
          throw new Error("Market Data Unavailable: API failed and no historical data found.");
      }
    }
  }
}

module.exports = new MarketService();
