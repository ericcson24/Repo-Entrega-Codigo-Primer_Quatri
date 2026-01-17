const axios = require('axios');
const { URLS } = require('../config/constants');

class CatalogController {
    
    static async getCatalog(req, res) {
        try {
            const { technology } = req.params;
            const aiUrl = URLS.AI_ENGINE_BASE_URL;

            // Proxy to Python AI Engine
            // Endpoint: /catalog/{technology}
            const response = await axios.get(`${aiUrl}/catalog/${technology}`);
            
            res.json(response.data);
        } catch (error) {
            console.error(`Catalog Proxy Error (${req.params.technology}):`, error.message);
            if (error.response && error.response.status === 404) {
                return res.json([]); // Return empty array if not found
            }
            res.status(500).json({ error: "Failed to fetch catalog" });
        }
    }
}

module.exports = CatalogController;
