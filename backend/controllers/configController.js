const SIMULATION_CONSTANTS = require('../config/simulationParams');
const fs = require('fs');
const path = require('path');

class ConfigController {
  getConfig(req, res) {
    try {
      // Leer ciudades disponibles dinámicamente desde la carpeta de datos
      const solarDataDir = path.join(__dirname, '../data/solar');
      let cities = [];

      if (fs.existsSync(solarDataDir)) {
        const files = fs.readdirSync(solarDataDir);
        cities = files
          .filter(file => file.startsWith('solar_') && file.endsWith('.json'))
          .map(file => {
            // Formato esperado: solar_nombre_lat_lon.json
            // Ejemplo: solar_madrid_40.4168_-3.7038.json
            const parts = file.replace('solar_', '').replace('.json', '').split('_');
            
            // Support cities with compound names like "Las Palmas" stored as "las_palmas"
            // If parts length is > 3, we need to handle name merging
            let name = parts[0];
            let latIndex = 1;
            
            // Heuristic attempts to find lat index by checking if it parses to float
            for (let i = 1; i < parts.length; i++) {
                if (!isNaN(parseFloat(parts[i])) && parts[i].includes('.')) {
                    latIndex = i;
                    break;
                }
                name += ' ' + parts[i];
            }
            
            if (parts.length >= latIndex + 2) {
              const formattedName = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              const lat = parseFloat(parts[latIndex]);
              const lon = parseFloat(parts[latIndex + 1]);
              return { name: formattedName, lat, lon, id: name.replace(/\s+/g, '_') };
            }
            return null;
          })
          .filter(city => city !== null);
      }

      res.json({
        success: true,
        market: SIMULATION_CONSTANTS.MARKET,
        economics: SIMULATION_CONSTANTS.ECONOMICS,
        solar: SIMULATION_CONSTANTS.SOLAR,
        wind: SIMULATION_CONSTANTS.WIND,
        financial: SIMULATION_CONSTANTS.FINANCIAL,
        cities,
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
