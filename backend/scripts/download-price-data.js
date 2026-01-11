const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Script para descargar precios de energía eléctrica REALES
 * API: Red Eléctrica Española (REE) 
 */

class EnergyPriceDownloader {
  constructor() {
    this.baseURL = 'https://apidatos.ree.es/es/datos';
    this.dataDir = path.join(__dirname, '../data/prices');
    
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  async downloadMarketPrices(years = 1) {
    console.log(`\n Descargando precios del mercado eléctrico español...`);
    console.log(`   Periodo: año 2020 (datos estables disponibles en REE)`);

    let allPrices = [];
    // Definir rangos mensuales para evitar errores 500 por exceso de datos
    const months = [
      { start: '2020-01-01T00:00', end: '2020-01-31T23:59' },
      { start: '2020-02-01T00:00', end: '2020-02-29T23:59' },
      { start: '2020-03-01T00:00', end: '2020-03-31T23:59' },
      { start: '2020-04-01T00:00', end: '2020-04-30T23:59' },
      { start: '2020-05-01T00:00', end: '2020-05-31T23:59' },
      { start: '2020-06-01T00:00', end: '2020-06-30T23:59' },
      { start: '2020-07-01T00:00', end: '2020-07-31T23:59' },
      { start: '2020-08-01T00:00', end: '2020-08-31T23:59' },
      { start: '2020-09-01T00:00', end: '2020-09-30T23:59' },
      { start: '2020-10-01T00:00', end: '2020-10-31T23:59' },
      { start: '2020-11-01T00:00', end: '2020-11-30T23:59' },
      { start: '2020-12-01T00:00', end: '2020-12-31T23:59' }
    ];

    try {
      for (const month of months) {
        process.stdout.write(`    Descargando mes: ${month.start.split('T')[0]}... `);
        
        const response = await axios.get(`${this.baseURL}/mercados/precios-mercados-tiempo-real`, {
          params: {
            start_date: month.start,
            end_date: month.end,
            time_trunc: 'hour'
          },
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json'
          }
        });

        const rawPrices = response.data.included[0]?.attributes?.values || [];
        allPrices = [...allPrices, ...rawPrices];
        console.log(`OK (${rawPrices.length} registros)`);
        
        // Pequeña pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Procesar datos
      const structured = allPrices.map(entry => ({
        date: entry.datetime.split('T')[0],
        time: entry.datetime.split('T')[1]?.split('+')[0],
        priceEurMWh: entry.value,
        priceEurKWh: entry.value / 1000
      }));

      // Calcular estadísticas
      const prices = structured.map(e => e.priceEurMWh);
      const stats = {
        avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
        minPrice: Math.min(...prices),
        maxPrice: Math.max(...prices),
        medianPrice: this.calculateMedian(prices),
        stdDev: this.calculateStdDev(prices)
      };

      // Agrupar por mes para análisis
      const monthly = this.groupByMonth(structured);

      const result = {
        metadata: {
          period: {
            start: '2020-01-01',
            end: '2020-12-31'
          },
          dataPoints: structured.length,
          source: 'Red Eléctrica Española (REE)',
          currency: 'EUR',
          unit: 'MWh'
        },
        statistics: stats,
        monthlyAverage: monthly,
        dailyPrices: structured
      };

      // Guardar archivo
      const filename = `electricity_prices_2020.json`;
      const filepath = path.join(this.dataDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(result, null, 2));

      console.log(`\n    Descarga completada: ${structured.length} registros totales`);
      console.log(`    Precio medio: ${stats.avgPrice.toFixed(2)} €/MWh`);
      console.log(`    Rango: ${stats.minPrice.toFixed(2)} - ${stats.maxPrice.toFixed(2)} €/MWh`);
      console.log(`    Guardado en: ${filename}`);
      
      return result;

    } catch (error) {
      console.error(`\n    Error descargando precios:`, error.response?.data || error.message);
      throw error;
    }
  }

  async downloadRenewableGeneration(years = 1) {
    console.log(`\n Descargando generación renovable...`);

    const startDate = new Date('2020-01-01');
    const endDate = new Date('2020-12-31');

    try {
      const response = await axios.get(`${this.baseURL}/generacion/estructura-generacion`, {
        params: {
          start_date: '2020-01-01T00:00',
          end_date: '2020-12-31T23:59',
          time_trunc: 'day'
        }
      });

      const data = response.data.included || [];
      
      const solar = data.find(d => d.type === 'Solar fotovoltaica')?.attributes?.values || [];
      const wind = data.find(d => d.type === 'Eólica')?.attributes?.values || [];

      const structured = {
        metadata: {
          period: {
            start: '2020-01-01',
            end: '2020-12-31'
          },
          source: 'REE',
          unit: 'GWh'
        },
        solar: solar.map(e => ({
          date: e.datetime.split('T')[0],
          generation: e.value,
          percentage: e.percentage
        })),
        wind: wind.map(e => ({
          date: e.datetime.split('T')[0],
          generation: e.value,
          percentage: e.percentage
        }))
      };

      const filename = `renewable_generation_2020.json`;
      const filepath = path.join(this.dataDir, filename);
      
      fs.writeFileSync(filepath, JSON.stringify(structured, null, 2));

      console.log(`   ✅ Descargado: Solar (${solar.length}), Eólica (${wind.length})`);
      console.log(`   💾 Guardado en: ${filename}`);

      return structured;

    } catch (error) {
      console.error(`   ❌ Error descargando generación:`, error.response?.data || error.message);
      throw error;
    }
  }

  groupByMonth(data) {
    const monthly = {};
    
    data.forEach(entry => {
      const month = entry.date.substring(0, 7); // YYYY-MM
      if (!monthly[month]) {
        monthly[month] = [];
      }
      monthly[month].push(entry.priceEurMWh);
    });

    return Object.entries(monthly).map(([month, prices]) => ({
      month,
      avgPrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      dataPoints: prices.length
    }));
  }

  calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  calculateStdDev(arr) {
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / arr.length;
    return Math.sqrt(avgSquareDiff);
  }
}

// ========== EJECUCIÓN ==========

async function main() {
  console.log('='.repeat(60));
  console.log('  DESCARGA DE PRECIOS DE ENERGÍA ELÉCTRICA');
  console.log('  API: Red Eléctrica Española (REE) - GRATIS');
  console.log('='.repeat(60));

  const downloader = new EnergyPriceDownloader();

  try {
    // Descargar precios de mercado (2020)
    await downloader.downloadMarketPrices(1);
    
    // Esperar 2 segundos
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Descargar generación renovable (2020)
    await downloader.downloadRenewableGeneration(1);

    console.log('\n ¡Descarga completada exitosamente!');
    console.log('\n Archivos generados en: data/prices/');
    console.log(' Siguiente paso: node train-ai-model.js\n');

  } catch (error) {
    console.error('\n Error durante la descarga:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = EnergyPriceDownloader;
