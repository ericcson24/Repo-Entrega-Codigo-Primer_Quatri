const axios = require('axios');
const fs = require('fs');
const path = require('path');
const apis = require('../config/apis');
const { MARKET } = require('../config/constants');

class MarketService {
  constructor() {
    this.pricesFile = path.join(__dirname, '../data/prices/electricity_prices_2020.json');
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
        avgPriceEurKWh: MARKET.DEFAULT_PRICE / 1000,
        avgPriceEurMWh: MARKET.DEFAULT_PRICE,
        minPrice: 0.01,
        maxPrice: 0.20,
        monthlyAverage: [],
        source: 'Default Fallback',
        lastUpdate: new Date().toISOString()
      };
    }
  }

  async getMarketData(marketType) {
    try {
      // Get Spanish electricity market data from REE
      const response = await axios.get(`${apis.electricity.ree}/mercados/precios-mercados-tiempo-real`, {
        params: {
          start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0],
          time_trunc: 'hour'
        }
      });

      return {
        source: 'Red Eléctrica España (REE)',
        currentPrice: response.data.included[0]?.attributes?.values?.[0]?.value || MARKET.DEFAULT_PRICE,
        renewableShare: MARKET.DEFAULT_RENEWABLE_SHARE, // Approximate for Spain 2025
        co2Intensity: MARKET.DEFAULT_CO2_INTENSITY, // gCO2/kWh
        demand: MARKET.DEFAULT_DEMAND, // MW
        marketType: MARKET.MARKET_TYPE
      };
    } catch (error) {
      console.error('Market API error:', error.message);
      // Fallback data
      return {
        source: 'Fallback Data',
        currentPrice: MARKET.DEFAULT_PRICE,
        renewableShare: MARKET.DEFAULT_RENEWABLE_SHARE,
        co2Intensity: MARKET.DEFAULT_CO2_INTENSITY,
        demand: MARKET.DEFAULT_DEMAND,
        marketType: MARKET.MARKET_TYPE
      };
    }
  }
}

module.exports = new MarketService();
