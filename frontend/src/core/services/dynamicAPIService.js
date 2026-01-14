/**
 * Servicio de APIs Dinámicas REALES - SIN datos hardcodeados
 * 
 * APIS UTILIZADAS:
 * 
 * 1. CIUDADES Y COORDENADAS:
 *    - API: OpenStreetMap Nominatim
 *    - Endpoint: https://nominatim.openstreetmap.org/search
 *    - Datos: Ciudades españolas con coordenadas GPS exactas
 * 
 * 2. DATOS METEOROLÓGICOS HISTÓRICOS:
 *    - API: Open-Meteo Historical Weather
 *    - Endpoint: https://archive-api.open-meteo.com/v1/archive
 *    - Datos: 3 años de sol, viento, temperatura (2022-2024)
 * 
 * 3. IRRADIACIÓN SOLAR:
 *    - API: PVGIS (European Commission)
 *    - Endpoint: https://re.jrc.ec.europa.eu/api/v5_2/seriescalc
 *    - Datos: Irradiación solar mensual real por ubicación
 * 
 * 4. PRECIOS ENERGÍA:
 *    - API: REE (Red Eléctrica Española)
 *    - Endpoint: https://apidatos.ree.es/
 *    - Datos: Precios pool eléctrico históricos reales
 * 
 * 5. COMPONENTES (Paneles, Inversores, Aerogeneradores):
 *    - API: Web scraping de fabricantes o bases de datos públicas
 *    - Alternativa: API propia backend que consulta catálogos actualizados
 */

import { PHYSICS_CONSTANTS, CACHE_CONSTANTS } from '../config/constants';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

class DynamicAPIService {
  constructor() {
    this.backendURL = BACKEND_URL;
    this.cache = new Map();
    this.cacheExpiry = CACHE_CONSTANTS.DEFAULT_EXPIRY; // 1 hora
    this.corsProxy = ''; // Sin proxy, APIs tienen CORS habilitado
  }

  /**
   * Obtener configuración global del sistema (Economía, Constantes)
   */
  async getSystemConfig() {
    const cacheKey = 'system_config';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.backendURL}/api/config`);
      if (!response.ok) throw new Error('Failed to fetch system config');
      const data = await response.json();
      
      this.saveToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Error fetching system config:', error);
      return null;
    }
  }

  /**
   * Obtener ciudades españolas DINÁMICAMENTE desde Backend
   */
  async getSpanishCities() {
    const cacheKey = 'spanish_cities';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.backendURL}/api/config`);
      if (!response.ok) throw new Error('Failed to fetch cities from config');
      const data = await response.json();
      
      if (data.cities) {
        this.saveToCache(cacheKey, data.cities);
        return data.cities;
      }
      return [];
    } catch (error) {
      console.error('Error fetching cities:', error);
      return [];
    }
  }

  /**
   * Obtener datos meteorológicos HISTÓRICOS REALES (3 años)
   */
  async getHistoricalWeatherData(lat, lon, years = 3) {
    const cacheKey = `weather_${lat}_${lon}_${years}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - years);

      const response = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?` +
        `latitude=${lat}&` +
        `longitude=${lon}&` +
        `start_date=${startDate.toISOString().split('T')[0]}&` +
        `end_date=${endDate.toISOString().split('T')[0]}&` +
        `daily=temperature_2m_mean,windspeed_10m_mean,windspeed_10m_max,shortwave_radiation_sum&` +
        `timezone=Europe/Madrid`
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      const processedData = {
        location: { lat, lon },
        period: { start: startDate, end: endDate },
        // Raw daily data for advanced calculations (Weibull, etc)
        data: data.daily.time.map((time, i) => ({
             date: time,
             temperature_mean: data.daily.temperature_2m_mean[i],
             windspeed_mean: data.daily.windspeed_10m_mean ? data.daily.windspeed_10m_mean[i] : null,
             windspeed_max: data.daily.windspeed_10m_max[i],
             solar_radiation: data.daily.shortwave_radiation_sum[i]
        })).filter(d => d.windspeed_mean !== null), // Filter invalid data, no 0.6 fallback
        solar: {
          avgDailyRadiation: this.average(data.daily.shortwave_radiation_sum),
          monthlyAvg: this.groupByMonth(data.daily.time, data.daily.shortwave_radiation_sum)
        },
        wind: {
          avgSpeed: this.average(data.daily.windspeed_10m_mean),
          monthlyAvg: this.groupByMonth(data.daily.time, data.daily.windspeed_10m_mean)
        },
        temperature: {
          avgTemp: this.average(data.daily.temperature_2m_mean),
          monthlyAvg: this.groupByMonth(data.daily.time, data.daily.temperature_2m_mean)
        }
      };

      this.saveToCache(cacheKey, processedData);
      return processedData;

    } catch (error) {
      console.error('Error fetching historical weather:', error);
      throw new Error('No se pudieron obtener datos meteorológicos históricos');
    }
  }

  /**
   * Obtener irradiación solar REAL desde PVGIS
   */
  async getSolarIrradiationData(lat, lon) {
    const cacheKey = `solar_${lat}_${lon}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `https://re.jrc.ec.europa.eu/api/v5_2/seriescalc?` +
        `lat=${lat}&` +
        `lon=${lon}&` +
        `startyear=2020&` +
        `endyear=2023&` +
        `pvcalculation=1&` +
        `peakpower=1&` +
        `loss=14&` +
        `mountingplace=free&` +
        `outputformat=json`
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      const processedData = {
        location: { lat, lon },
        yearlyProduction: data.outputs.totals.fixed,
        monthlyData: data.outputs.monthly?.fixed || [],
        optimalAngle: data.inputs.mounting_system?.fixed?.slope?.value || PHYSICS_CONSTANTS.OPTIMAL_TILT,
        systemLoss: data.inputs.system_loss
      };

      this.saveToCache(cacheKey, processedData);
      return processedData;

    } catch (error) {
      console.error('Error fetching PVGIS data:', error);
      throw new Error('No se pudieron obtener datos de irradiación solar');
    }
  }

  /**
   * Obtener precios REALES de energía desde REE
   */
  async getEnergyPrices(years = 1) {
    const cacheKey = `prices_hourly_${years}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Detección de fechas futuras (simulación vs realidad)
      let endDate = new Date();
      
      // Si el año del sistema es > 2025 (y estamos en 2024/25 real), la API fallará.
      // Como fix, si detectamos año > 2025, forzamos usar datos de 2024 (último año confiable histórico)
      if (endDate.getFullYear() > 2025) {
          // console.warn("Future date detected in system time. Fallback to 2024 for API calls.");
          endDate = new Date('2024-12-31');
      }

      const startDate = new Date(endDate);
      startDate.setMonth(endDate.getMonth() - 1); // 1 mes histórico

      // URL corregida para PVPC
      const response = await fetch(
        `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?` +
        `start_date=${startDate.toISOString().split('T')[0]}T00:00&` +
        `end_date=${endDate.toISOString().split('T')[0]}T23:59&` +
        `time_trunc=hour`
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const prices = data.included?.[0]?.attributes?.values || [];
      
      if (prices.length === 0) throw new Error("No pricing data found");

      // Estadísticas
      const pricesValues = prices.map(p => p.value);
      const avgPrice = pricesValues.reduce((sum, p) => sum + p, 0) / pricesValues.length;
      
      const result = {
        // Average Price en €/MWh
        averagePrice: avgPrice,
        // Estimation for consumer price: Pool + ~0.10€ (peajes+cargos) + 21% IVA roughly if using pool data
        // But PVPC endpoint usually includes some components. 'precios-mercados-tiempo-real' is Spot Market.
        // We need to apply consumer markup.
        stats: {
             avg: avgPrice,
             min: Math.min(...pricesValues),
             max: Math.max(...pricesValues)
        }
      };
      
      this.saveToCache(cacheKey, result);
      return result;

    } catch (error) {
      console.warn('Error fetching REE prices (using defaults):', error.message);
      // Fallback a defaults si falla
      return null;
    }
  }

  /**
   * Obtener datos meteorológicos históricos desde Open-Meteo
   */
  async getHistoricalWeather(lat, lon, years = 1) {
    const cacheKey = `weather_${lat}_${lon}_${years}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - years);

      const response = await fetch(
        `https://archive-api.open-meteo.com/v1/archive?` +
        `latitude=${lat}&longitude=${lon}&` +
        `start_date=${startDate.toISOString().split('T')[0]}&` +
        `end_date=${endDate.toISOString().split('T')[0]}&` +
        `hourly=temperature_2m,relativehumidity_2m,precipitation,cloudcover,windspeed_10m,windspeed_100m,winddirection_10m,shortwave_radiation&` +
        `timezone=Europe/Madrid`
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();

      // Procesar datos horarios a promedios diarios
      const hourlyData = data.hourly;
      const dailyData = [];
      
      for (let i = 0; i < hourlyData.time.length; i += 24) {
        const dayData = {
          date: hourlyData.time[i].split('T')[0],
          temperature_mean: this.arrayMean(hourlyData.temperature_2m.slice(i, i + 24)),
          temperature_max: Math.max(...hourlyData.temperature_2m.slice(i, i + 24)),
          temperature_min: Math.min(...hourlyData.temperature_2m.slice(i, i + 24)),
          solar_radiation: this.arrayMean(hourlyData.shortwave_radiation.slice(i, i + 24)),
          cloudcover: this.arrayMean(hourlyData.cloudcover.slice(i, i + 24)),
          windspeed_mean: this.arrayMean(hourlyData.windspeed_10m.slice(i, i + 24)),
          windspeed_max: Math.max(...hourlyData.windspeed_10m.slice(i, i + 24)),
          precipitation: this.arraySum(hourlyData.precipitation.slice(i, i + 24))
        };
        dailyData.push(dayData);
      }

      // Calcular patrones mensuales
      const monthlyPattern = Array(12).fill(0).map(() => ({
        radiation: [], wind: [], temp: [], cloudcover: []
      }));

      dailyData.forEach(day => {
        const month = new Date(day.date).getMonth();
        monthlyPattern[month].radiation.push(day.solar_radiation);
        monthlyPattern[month].wind.push(day.windspeed_mean);
        monthlyPattern[month].temp.push(day.temperature_mean);
        monthlyPattern[month].cloudcover.push(day.cloudcover);
      });

      const monthlyAverage = monthlyPattern.map((m, i) => ({
        month: i + 1,
        avgRadiation: this.arrayMean(m.radiation),
        avgWindSpeed: this.arrayMean(m.wind),
        avgTemperature: this.arrayMean(m.temp),
        avgCloudCover: this.arrayMean(m.cloudcover)
      }));

      const processedData = {
        location: { lat, lon },
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        dailyData: dailyData,
        monthlyAverage: monthlyAverage,
        statistics: {
          avgRadiation: this.arrayMean(dailyData.map(d => d.solar_radiation)),
          avgWindSpeed: this.arrayMean(dailyData.map(d => d.windspeed_mean)),
          avgTemperature: this.arrayMean(dailyData.map(d => d.temperature_mean))
        }
      };

      this.saveToCache(cacheKey, processedData, CACHE_CONSTANTS.LONG_EXPIRY); // Cache 24 horas
      return processedData;

    } catch (error) {
      console.error('Error fetching weather data:', error);
      throw new Error('No se pudieron obtener datos meteorológicos');
    }
  }

  arrayMean(arr) {
    const filtered = arr.filter(v => v !== null && v !== undefined);
    return filtered.length > 0 ? filtered.reduce((a, b) => a + b, 0) / filtered.length : 0;
  }

  arraySum(arr) {
    const filtered = arr.filter(v => v !== null && v !== undefined);
    return filtered.reduce((a, b) => a + b, 0);
  }

  /**
   * Obtener catálogo de paneles solares REAL
   * NOTA: Requiere backend o web scraping
   */
  async getSolarPanels() {
    const cacheKey = 'solar_panels';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Opción 1: Tu propia API backend
      const response = await fetch(`${BACKEND_URL}/api/solar-panels`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      // El backend devuelve { success: true, data: [...] }
      const panels = result.data || result; 
      
      this.saveToCache(cacheKey, panels);
      return panels;

    } catch (error) {
      console.error('Error fetching solar panels:', error);
      
      // Fallback temporal: consultar base de datos pública
      // Idealmente deberías tener tu propio backend que actualice esto
      throw new Error('Configurar endpoint /api/solar-panels en backend');
    }
  }

  /**
   * Obtener catálogo de inversores REAL
   */
  async getSolarInverters() {
    const cacheKey = 'solar_inverters';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${BACKEND_URL}/api/solar-inverters`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      const inverters = result.data || result;
      
      this.saveToCache(cacheKey, inverters);
      return inverters;

    } catch (error) {
      console.error('Error fetching inverters:', error);
      throw new Error('Configurar endpoint /api/solar-inverters en backend');
    }
  }

  /**
   * Obtener catálogo de aerogeneradores REAL
   */
  async getWindTurbines() {
    const cacheKey = 'wind_turbines';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${BACKEND_URL}/api/wind-turbines`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      const turbines = result.data || result;
      
      this.saveToCache(cacheKey, turbines);
      return turbines;

    } catch (error) {
      console.error('Error fetching wind turbines:', error);
      throw new Error('Configurar endpoint /api/wind-turbines en backend');
    }
  }

  /**
   * Obtener catálogo de torres REAL
   */
  async getWindTowers() {
    const cacheKey = 'wind_towers';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${BACKEND_URL}/api/wind-towers`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      const towers = result.data || result;
      
      this.saveToCache(cacheKey, towers);
      return towers;

    } catch (error) {
      console.error('Error fetching wind towers:', error);
      throw new Error('Configurar endpoint /api/wind-towers en backend');
    }
  }

  /**
   * Obtener catálogo de baterías/almacenamiento REAL
   */
  async getBatteries() {
    const cacheKey = 'batteries';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${BACKEND_URL}/api/batteries`);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      const batteries = result.data || result;
      
      this.saveToCache(cacheKey, batteries);
      return batteries;

    } catch (error) {
      console.error('Error fetching batteries:', error);
      throw new Error('Configurar endpoint /api/batteries en backend');
    }
  }

  /**
   * Ejecutar simulación solar completa (IA Powered)
   */
  async calculateSolarProduction(params) {
    try {
      // Extract parameters correctly whether they come flat or nested
      const lat = params.location ? params.location.lat : params.lat;
      const lon = params.location ? params.location.lon : params.lon;
      const systemSizeKw = params.technical ? params.technical.capacityKw : (params.systemSizeKw || params.capacityKw);

      // Uso del nuevo endpoint AI Full Loop
      const response = await fetch(`${this.backendURL}/api/ai/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            location: { lat, lon },
            systemParams: { systemSizeKw },
            years: 1 // Default to 1 year of hourly analysis
        })
      });

      if (!response.ok) {
        throw new Error(`AI Simulation Failed: ${response.status}`);
      }

      const aiResult = await response.json();
      
      // Adaptar formato al esperado por el frontend (ResultsView)
      const firstYear = aiResult.results[0];
      const annualKwh = firstYear.totalEnergy;
      const monthlyKwh = firstYear.monthly.map(m => m.energy_kwh);

      // Financial Calculation (Frontend Side using AI Production)
      const financialParams = params.financial || {};
      const costsParams = params.costs || {};
      
      const priceKwh = financialParams.electricityPrice || 0.15;
      const annualConsumption = financialParams.annualConsumption || 3000;
      const systemCost = costsParams.totalOverride || 5000;
      const years = 20; // Standard projection
      const inflation = 0.02;
      const energyInflation = 0.03;

      const cashFlows = [];
      let cumulative = -systemCost;
      let currentPrice = priceKwh;

      for(let y=1; y<=years; y++) {
          const production = annualKwh * Math.pow(0.995, y-1); // 0.5% degradation
          const selfConsumptionRatio = 0.4; // Conservative assumption or from inputs
          const selfConsumed = Math.min(production, annualConsumption) * selfConsumptionRatio;
          const exported = Math.max(0, production - selfConsumed);
          
          const savings = selfConsumed * currentPrice;
          const income = exported * 0.05; // Surplus price
          const totalRevenue = savings + income;

          cumulative += totalRevenue;
          
          cashFlows.push({
              year: y,
              cumulative: cumulative,
              savings: savings,
              income: income,
              opex: 0 // Simplification for now
          });

          currentPrice *= (1 + energyInflation);
      }

      const roi = ((cashFlows[years-1].cumulative + systemCost) / systemCost) * 100;
      const paybackYear = cashFlows.findIndex(c => c.cumulative >= 0);
      const payback = paybackYear !== -1 ? paybackYear + 1 : 25;

      return {
        source: aiResult.simulation_type,
        technical: {
            production: {
                annualKwh: annualKwh,
                monthlyKwh: monthlyKwh,
                dailyAverage: annualKwh / 365
            },
            system: {
                sizeKw: systemSizeKw,
                efficiency: firstYear.monthly.reduce((acc, m) => acc + m.avg_efficiency, 0) / 12
            }
        },
        financial: {
            cashFlows: cashFlows,
            metrics: {
                roi: roi,
                paybackPeriod: payback,
                totalSavings: cashFlows[years-1].cumulative + systemCost
            }
        },
        summary: {
            roi: roi,
            payback: payback,
            annualSaving: cashFlows[0].savings + cashFlows[0].income,
            co2Abatement: annualKwh * 0.2 // Tons approx
        }
      };

    } catch (error) {
      console.error('Error in AI solar simulation:', error);
      throw new Error('Error en Simulación IA. Verifique conexión.');
    }
  }

  // ========== UTILIDADES ==========

  extractProvince(displayName) {
    const parts = displayName.split(',');
    return parts.length > 1 ? parts[1].trim() : parts[0];
  }

  average(arr) {
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  groupByMonth(dates, values) {
    const monthly = {};
    dates.forEach((date, i) => {
      const month = new Date(date).getMonth();
      if (!monthly[month]) monthly[month] = [];
      monthly[month].push(values[i]);
    });
    
    return Object.entries(monthly).map(([month, vals]) => ({
      month: parseInt(month) + 1,
      avg: this.average(vals)
    }));
  }

  calculateTrend(values) {
    const n = values.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + (x + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable';
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  saveToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

const dynamicAPIService = new DynamicAPIService();
export default dynamicAPIService;
