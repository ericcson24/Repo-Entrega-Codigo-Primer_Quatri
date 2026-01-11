const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Script para descargar datos de irradiación solar REAL desde PVGIS

 */

class SolarDataDownloader {
  constructor() {
    this.baseURL = 'https://re.jrc.ec.europa.eu/api/v5_2';
    this.dataDir = path.join(__dirname, '../data/solar');
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  async downloadSolarIrradiation(name, lat, lon, years = 3) {
    console.log(`\n☀️  Descargando irradiación solar para ${name}...`);
    console.log(`   Coordenadas: ${lat}, ${lon}`);
    
    // PVGIS solo acepta datos 2005-2020
    const endYear = 2020;
    const startYear = endYear - years;

    try {
      const response = await axios.get(`${this.baseURL}/PVcalc`, {
        params: {
          lat,
          lon,
          peakpower: 1, // 1 kWp para normalizar
          loss: 14, // 14% pérdidas del sistema
          angle: 35, // Ángulo óptimo para España
          aspect: 0, // Orientación sur
          mountingplace: 'free',
          outputformat: 'json',
          usehorizon: 1,
          raddatabase: 'PVGIS-SARAH2'
        },
        timeout: 30000
      });

      const data = response.data;
      
      if (!data.outputs) {
        throw new Error('Respuesta PVGIS sin outputs');
      }

      // Extraer datos relevantes
      const structured = {
        location: { name, lat, lon },
        period: { start: startYear, end: endYear },
        inputs: {
          peakPower: data.inputs?.pv_module?.peakpower || 1,
          systemLoss: data.inputs?.system_loss || 14,
          angle: data.inputs?.mounting_system?.fixed?.slope?.value || 35,
          aspect: data.inputs?.mounting_system?.fixed?.azimuth?.value || 0
        },
        outputs: {
          monthly: data.outputs.monthly?.fixed || data.outputs.monthly || [],
          yearly: {
            E_d: data.outputs.totals?.fixed?.E_d || 0,
            E_m: data.outputs.totals?.fixed?.E_m || 0,
            E_y: data.outputs.totals?.fixed?.E_y || 0,
            SD_m: data.outputs.totals?.fixed?.SD_m || 0,
            SD_y: data.outputs.totals?.fixed?.SD_y || 0
          }
        },
        metadata: {
          avgDailyProduction: data.outputs.totals?.fixed?.E_d || 0,
          avgMonthlyProduction: data.outputs.totals?.fixed?.E_m || 0,
          avgYearlyProduction: data.outputs.totals?.fixed?.E_y || 0
        }
      };

      // Guardar archivo
      const filename = `solar_${name.toLowerCase().replace(/ /g, '_')}_${lat}_${lon}.json`;
      const filepath = path.join(this.dataDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(structured, null, 2));

      console.log(`    Descargado: datos mensuales agregados`);
      console.log(`    Producción media anual: ${structured.metadata.avgYearlyProduction.toFixed(2)} kWh/kWp`);
      console.log(`    Guardado en: ${filename}`);
      
      return structured;

    } catch (error) {
      console.error(`    Error descargando ${name}:`, error.response?.data?.message || error.message);
      throw error;
    }
  }

  processHourlyData(hourlyArray) {
    // No usado en versión simplificada
    if (!hourlyArray) return [];
    
    return hourlyArray.slice(0, 8760).map(entry => ({
      timestamp: entry.time,
      globalIrradiance: entry.G_i || entry.Gb_i + entry.Gd_i,
      directIrradiance: entry.Gb_i,
      diffuseIrradiance: entry.Gd_i,
      production: entry.P,
      temperature: entry.T2m,
      windSpeed: entry.WS10m
    }));
  }

  async downloadMultipleLocations(locations, years = 3) {
    console.log(`\n Descargando datos solares para ${locations.length} ubicaciones...\n`);
    
    const results = [];
    
    for (const loc of locations) {
      try {
        const data = await this.downloadSolarIrradiation(
          loc.name,
          loc.lat,
          loc.lon,
          years
        );
        results.push({ 
          location: loc.name, 
          avgYearly: data.metadata.avgYearlyProduction 
        });
        
        // Esperar 2 segundos (PVGIS tiene rate limit)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`Saltando ${loc.name} debido a error`);
        results.push({ location: loc.name, error: true });
      }
    }

    // Resumen
    console.log(`\n📊 RESUMEN DE DESCARGA SOLAR:`);
    console.log(`   Total ubicaciones: ${results.length}`);
    console.log(`   Exitosas: ${results.filter(r => !r.error).length}`);
    console.log(`   Fallidas: ${results.filter(r => r.error).length}`);
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

const YEARS_OF_DATA = 3;

// ========== EJECUCIÓN ==========

async function main() {
  console.log('='.repeat(60));
  console.log('  DESCARGA DE DATOS DE IRRADIACIÓN SOLAR');
  console.log('  API: PVGIS - European Commission JRC (GRATIS)');
  console.log('='.repeat(60));

  const downloader = new SolarDataDownloader();

  try {
    await downloader.downloadMultipleLocations(SPANISH_CITIES, YEARS_OF_DATA);

    console.log('✅ ¡Descarga completada exitosamente!');
    console.log('\n📁 Archivos generados en: data/solar/');
    console.log('🔄 Siguiente paso: node download-price-data.js\n');

  } catch (error) {
    console.error('\n❌ Error durante la descarga:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SolarDataDownloader;
