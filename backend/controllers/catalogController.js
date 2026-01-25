const axios = require('axios');
const { URLS } = require('../config/constants');

class CatalogController {
    
    static async getCatalog(req, res) {
        try {
            const { technology } = req.params;
            const physicsUrl = URLS.PHYSICS_ENGINE_BASE_URL;

            // Redirigimos la petición al motor de cálculo en Python
            const response = await axios.get(`${physicsUrl}/catalog/${technology}`);
            
            res.json(response.data);
        } catch (error) {
            console.error(`Catalog Proxy Error (${req.params.technology}):`, error.message);
            if (error.response && error.response.status === 404) {
                return res.json([]);
            }
            res.status(500).json({ error: "Error al obtener el catálogo" });
        }
    }
}

module.exports = CatalogController;
