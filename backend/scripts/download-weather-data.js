const axios = require('axios');
const fs = require('fs');
const path = require('path');
const apis = require('../config/apis');

/**
 * Script para descargar datos meteorológicos históricos desde Open-Meteo

 */

class WeatherDataDownloader {
  constructor() {
    this.baseURL = apis.weather.openmeteoArchive;
    this.dataDir = path.join(__dirname, '../data/weather');
    
    // Crear directorio si no existe
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  async downloadForLocation(name, lat, lon, startYear, endYear) {
    console.log(`\n Descargando datos para ${name}...`);
    console.log(`   Coordenadas: ${lat}, ${lon}`);
    console.log(`   Periodo: ${startYear} - ${endYear}`);

    try {
      const response = await axios.get(this.baseURL, {
        params: {
          latitude: lat,
          longitude: lon,
          start_date: `${startYear}-01-01`,
          end_date: `${endYear}-12-31`,
          daily: [
            'temperature_2m_mean',
            'temperature_2m_max',
            'temperature_2m_min',
            'windspeed_10m_max',
            'windspeed_10m_mean',
            'shortwave_radiation_sum',
            'precipitation_sum',
            'cloudcover_mean'
          ].join(','),
          timezone: 'Europe/Madrid'
        }
      });

      const data = response.data.daily;
      
      // Convertir a formato estructurado
      const structured = data.time.map((date, i) => ({
        date,
        temperature_mean: data.temperature_2m_mean[i],
        temperature_max: data.temperature_2m_max[i],
        temperature_min: data.temperature_2m_min[i],
        windspeed_max: data.windspeed_10m_max[i],
        windspeed_mean: data.windspeed_10m_mean[i],
        solar_radiation: data.shortwave_radiation_sum[i],
        precipitation: data.precipitation_sum[i],
        cloudcover: data.cloudcover_mean[i]
      }));

      // Guardar archivo
      const filename = `weather_${name.toLowerCase().replace(/ /g, '_')}_${lat}_${lon}_${startYear}-${endYear}.json`;
      const filepath = path.join(this.dataDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify({
        location: { name, lat, lon },
        period: { start: `${startYear}-01-01`, end: `${endYear}-12-31` },
        dataPoints: structured.length,
        data: structured
      }, null, 2));

      console.log(`    Descargado: ${structured.length} días de datos`);
      console.log(`    Guardado en: ${filename}`);
      
      return structured;

    } catch (error) {
      console.error(`    Error descargando ${name}:`, error.message);
      throw error;
    }
  }

  async downloadMultipleLocations(locations, startYear, endYear) {
    console.log(`\n Descargando datos para ${locations.length} ubicaciones...\n`);
    
    const results = [];
    
    for (const loc of locations) {
      const data = await this.downloadForLocation(
        loc.name,
        loc.lat,
        loc.lon,
        startYear,
        endYear
      );
      results.push({ location: loc.name, records: data.length });
      
      // Esperar 5 segundos entre requests (evitar rate limiting 429)
      if (loc !== locations[locations.length - 1]) {
        console.log(`    Esperando 10 segundos antes de la siguiente descarga...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }

    // Resumen
    console.log(`\n RESUMEN DE DESCARGA:`);
    console.log(`   Total ubicaciones: ${results.length}`);
    console.log(`   Total registros: ${results.reduce((sum, r) => sum + r.records, 0)}`);
    console.log(`   Directorio: ${this.dataDir}\n`);

    return results;
  }
}

// ========== CONFIGURACIÓN ==========

const SPANISH_CITIES = [
  { name: 'Madrid', lat: 40.4168, lon: -3.7038 },
  { name: 'Barcelona', lat: 41.3851, lon: 2.1734 },
  { name: 'Sevilla', lat: 37.3891, lon: -5.9845 },
  { name: 'Valencia', lat: 39.4699, lon: -0.3763 },
  { name: 'A Coruña', lat: 43.3623, lon: -8.4115 },
  { name: 'Zaragoza', lat: 41.6488, lon: -0.8891 },
  { name: 'Málaga', lat: 36.7213, lon: -4.4214 },
  { name: 'Bilbao', lat: 43.2630, lon: -2.9350 },
  { name: 'Las Palmas', lat: 28.1235, lon: -15.4363 },
  { name: 'Palma', lat: 39.5696, lon: 2.6502 }
];

const START_YEAR = 2020;
const END_YEAR = 2024;

// ========== EJECUCIÓN ==========

async function main() {
  console.log('='.repeat(60));
  console.log('  DESCARGA DE DATOS METEOROLÓGICOS HISTÓRICOS');
  console.log('  API: Open-Meteo Archive (GRATIS)');
  console.log('='.repeat(60));

  const downloader = new WeatherDataDownloader();

  try {
    await downloader.downloadMultipleLocations(
      SPANISH_CITIES,
      START_YEAR,
      END_YEAR
    );

    console.log('✅ ¡Descarga completada exitosamente!');
    console.log('\n📁 Archivos generados en: data/weather/');
    console.log('🔄 Siguiente paso: node download-solar-data.js\n');

  } catch (error) {
    console.error('\n❌ Error durante la descarga:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = WeatherDataDownloader;
