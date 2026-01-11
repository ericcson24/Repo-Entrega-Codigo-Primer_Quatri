const fs = require('fs');
const path = require('path');
const marketService = require('../services/marketService');

class ModelsController {
  async getModels(req, res) {
    try {
      // Check location for models
      const modelsPath = path.join(__dirname, '../data/models/ai_models.json');
      
      let models = { solar: null, wind: null };
      
      // Intentar cargar modelos pre-entrenados
      if (fs.existsSync(modelsPath)) {
        const modelsData = JSON.parse(fs.readFileSync(modelsPath, 'utf8'));
        models = {
          solar: modelsData.solar,
          wind: modelsData.wind
        };
        console.log('✅ Modelos pre-entrenados cargados desde archivo');
      } else {
        console.log('⚠️ No hay modelos pre-entrenados. Se entrenarán on-the-fly');
      }

      // Obtener estadísticas de precios reales
      const priceData = await marketService.getPriceStatistics();
      
      res.json({
        ...models,
        priceData
      });
    } catch (error) {
      console.error('Error fetching models:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener modelos'
      });
    }
  }
}

module.exports = new ModelsController();
