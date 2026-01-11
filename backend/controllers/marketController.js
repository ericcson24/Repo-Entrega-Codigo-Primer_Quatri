const marketService = require('../services/marketService');
const cache = require('../utils/cache');

class MarketController {
  async getMarketData(req, res) {
    try {
      const { marketType } = req.params;
      const cacheKey = `market_${marketType}`;

      const cached = cache.get(cacheKey);
      if (cached) return res.json(cached);

      const marketData = await marketService.getMarketData(marketType);

      cache.set(cacheKey, marketData);
      res.json(marketData);
    } catch (error) {
      console.error('Market API error:', error.message);
      res.status(500).json({ error: 'Failed to fetch market data' });
    }
  }
}

module.exports = new MarketController();
