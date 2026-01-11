/**
 * SERVICIO DE CÁLCULO ENERGÉTICO
 * Gestiona la predicción de producción solar/eólica y cálculos económicos.
 * Utiliza modelos estadísticos calibrados con datos históricos.
 */

import dynamicAPIService from './dynamicAPIService';
import { PHYSICS_CONSTANTS, ECONOMIC_DEFAULTS, FALLBACK_DATA, CALCULATION_CONSTANTS } from '../config/constants';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// ==========================================
// 1. UTILIDADES Y MATEMÁTICAS
// ==========================================

const calculateStats = (values) => {
  if (!values || values.length === 0) return { mean: 0, stdDev: 0, variance: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return { mean, stdDev, variance };
};

const interpolateProduction = (lat, lon, trainingData) => {
  let weightedSum = 0;
  let weightSum = 0;

  for (const point of trainingData) {
    const distance = Math.sqrt(Math.pow(lat - point.lat, 2) + Math.pow(lon - point.lon, 2));
    const weight = distance === 0 ? CALCULATION_CONSTANTS.INTERPOLATION_WEIGHT_FACTOR : 1 / (distance + CALCULATION_CONSTANTS.INTERPOLATION_DISTANCE_OFFSET);
    weightedSum += point.annualProduction * weight;
    weightSum += weight;
  }
  return weightedSum / weightSum;
};

// Factor de corrección por orientación e inclinación (Aproximación simplificada para España)
const calculateOrientationFactor = (tilt, azimuth) => {
  // Óptimo aproximado: Sur (0º o 180º según convención, asumimos 180º Sur) con inclinación 30-35º
  // Azimuth: 0=Norte, 90=Este, 180=Sur, 270=Oeste
  const { OPTIMAL_TILT, OPTIMAL_AZIMUTH, TILT_LOSS_FACTOR, AZIMUTH_LOSS_FACTOR } = PHYSICS_CONSTANTS;
  
  // Penalización simple
  const loss = 1 - (TILT_LOSS_FACTOR * Math.pow(tilt - OPTIMAL_TILT, 2)) - (AZIMUTH_LOSS_FACTOR * Math.pow(azimuth - OPTIMAL_AZIMUTH, 2));
  return Math.max(CALCULATION_CONSTANTS.ORIENTATION_LOSS_MIN, Math.min(CALCULATION_CONSTANTS.ORIENTATION_LOSS_MAX, loss));
};

// Perfil de viento logarítmico (Ley de Hellmann)
const adjustWindSpeedForHeight = (refSpeed, refHeight, targetHeight, roughness = PHYSICS_CONSTANTS.WIND_ROUGHNESS) => {
  if (!targetHeight || targetHeight <= 0) return refSpeed;
  return refSpeed * Math.pow(targetHeight / refHeight, roughness);
};

// ==========================================
// 2. CARGA DE DATOS
// ==========================================

const downloadTrainingData = async () => {
  const solarTrainingData = [];
  const windTrainingData = [];
  
  try {
    // Usar lista de ciudades definida en constantes
    const knownCities = FALLBACK_DATA.DEFAULT_CITIES;

    for (const city of knownCities) {
      let solarInfo = null;
      let weatherInfo = null;

      try {
        const solarRes = await fetch(`${BACKEND_URL}/data/solar/solar_${city.name}_${city.lat}_${city.lon}.json`);
        if (solarRes.ok) {
          const data = await solarRes.json();
          // Soporte para estructura PVGIS antigua vs nueva o local
          const production = data.outputs?.totals?.fixed?.E_y || data.outputs?.yearly?.E_y || city.annualSolar;
          const radiation = data.outputs?.totals?.fixed?.H_i || data.outputs?.yearly?.H_i_y || FALLBACK_DATA.SOLAR_DEFAULT_RADIATION;
          
          solarInfo = {
            production: production,
            radiation: radiation
          };
        } else {
          solarInfo = { production: city.annualSolar, radiation: FALLBACK_DATA.SOLAR_DEFAULT_RADIATION };
        }
      } catch (e) {
        solarInfo = { production: city.annualSolar, radiation: FALLBACK_DATA.SOLAR_DEFAULT_RADIATION };
      }

      try {
        const weatherRes = await fetch(`${BACKEND_URL}/data/weather/weather_${city.name}_${city.lat}_${city.lon}_2020-2024.json`);
        if (weatherRes.ok) {
          const wData = await weatherRes.json();
          let temps = [], clouds = [], winds = [];

          if (wData.daily) {
             // Formato Open-Meteo original
             temps = wData.daily.temperature_2m_mean || [];
             clouds = wData.daily.cloudcover_mean || [];
             winds = wData.daily.wind_speed_10m_max || []; // Fallback a max si es el formato antiguo
          } else if (wData.data && Array.isArray(wData.data)) {
             // Nuevo formato JSON (array de objetos)
             temps = wData.data.map(d => d.temperature_mean);
             // Algunos archivos pueden no tener cloudcover, usar fallback
             clouds = wData.data.map(d => d.cloud_cover || 50); 
             // Preferir media, sino max * 0.6
             winds = wData.data.map(d => d.windspeed_mean || (d.windspeed_max ? d.windspeed_max * 0.6 : 0));
          }
          
          weatherInfo = {
            avgTemp: temps.length ? temps.reduce((a,b)=>a+b,0)/temps.length : FALLBACK_DATA.TRAINING_DEFAULT_TEMP,
            avgCloud: clouds.length ? clouds.reduce((a,b)=>a+b,0)/clouds.length : 50,
            avgWind: winds.length ? winds.reduce((a,b)=>a+b,0)/winds.length : FALLBACK_DATA.WIND_DEFAULT_AVG_SPEED
          };
          
          windTrainingData.push({
            lat: city.lat,
            lon: city.lon,
            avgWindSpeed: weatherInfo.avgWind,
            // Estimación simple para el entrenamiento (usando la media real ahora)
            production: weatherInfo.avgWind * FALLBACK_DATA.TRAINING_WIND_FACTOR * PHYSICS_CONSTANTS.HOURS_IN_YEAR, 
            turbinePower: FALLBACK_DATA.TRAINING_TURBINE_POWER
          });
        } else {
           windTrainingData.push({
            lat: city.lat,
            lon: city.lon,
            avgWindSpeed: FALLBACK_DATA.WIND_DEFAULT_AVG_SPEED,
            production: city.annualWind, 
            turbinePower: FALLBACK_DATA.TRAINING_TURBINE_POWER
          });
        }
      } catch (e) {
         windTrainingData.push({
            lat: city.lat,
            lon: city.lon,
            avgWindSpeed: FALLBACK_DATA.WIND_DEFAULT_AVG_SPEED,
            production: city.annualWind, 
            turbinePower: FALLBACK_DATA.TRAINING_TURBINE_POWER
          });
      }

      if (solarInfo) {
        solarTrainingData.push({
          lat: city.lat,
          lon: city.lon,
          radiation: solarInfo.radiation,
          temperature: weatherInfo ? weatherInfo.avgTemp : FALLBACK_DATA.TRAINING_DEFAULT_TEMP,
          annualProduction: solarInfo.production,
          systemSize: FALLBACK_DATA.TRAINING_SYSTEM_SIZE
        });
      }
    }
  } catch (error) {
    console.warn("Error cargando datos de entrenamiento:", error);
  }

  return { solar: solarTrainingData, wind: windTrainingData };
};

const fetchCurrentMarketPrices = async () => {
  try {
    // Intentar obtener precios reales de REE a través del servicio dinámico
    const realPrices = await dynamicAPIService.getEnergyPrices();
    if (realPrices && realPrices.avgPrice) {
      const avgPrice = realPrices.avgPrice / CALCULATION_CONSTANTS.MWH_TO_KWH; // Convertir MWh a kWh
      return { 
        gridPrice: avgPrice, 
        sellPrice: avgPrice * ECONOMIC_DEFAULTS.MARKET_SELL_RATIO 
      };
    }
  } catch (e) {
    console.warn("Fallo al obtener precios reales, usando fallback:", e);
  }

  try {
    const response = await fetch(`${BACKEND_URL}/data/prices/electricity_prices_2020.json`);
    if (response.ok) {
      const data = await response.json();
      let avgPrice = ECONOMIC_DEFAULTS.DEFAULT_ELECTRICITY_PRICE;
      if (data.monthlyAverage && data.monthlyAverage.length > 0) {
        const sum = data.monthlyAverage.reduce((acc, curr) => acc + curr.avgPrice, 0);
        avgPrice = (sum / data.monthlyAverage.length) / CALCULATION_CONSTANTS.MWH_TO_KWH;
      }
      if (avgPrice < CALCULATION_CONSTANTS.MIN_PRICE_THRESHOLD) avgPrice = ECONOMIC_DEFAULTS.DEFAULT_ELECTRICITY_PRICE;
      return { gridPrice: avgPrice, sellPrice: avgPrice * ECONOMIC_DEFAULTS.MARKET_SELL_RATIO };
    }
  } catch (e) {}
  return { 
    gridPrice: ECONOMIC_DEFAULTS.DEFAULT_GRID_PRICE, 
    sellPrice: ECONOMIC_DEFAULTS.DEFAULT_SELL_PRICE 
  };
};

// ==========================================
// 3. LÓGICA DE PREDICCIÓN (MODELOS)
// ==========================================

const calibrateSolarParameters = (trainingData) => {
  if (!trainingData || trainingData.length === 0) return null;
  
  // Regresión Lineal: Eficiencia = Intercepto + Pendiente * Temperatura
  const n = trainingData.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  trainingData.forEach(point => {
    sumX += point.temp;
    sumY += point.efficiency;
    sumXY += point.temp * point.efficiency;
    sumXX += point.temp * point.temp;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
};

const calibrateWindParameters = (trainingData) => {
  if (!trainingData || trainingData.length === 0) return null;
  
  // Modelo Cúbico Simplificado: P = k * v^3
  let sumK = 0;
  let count = 0;

  trainingData.forEach(point => {
    if (point.speed > 0) {
      sumK += point.production / Math.pow(point.speed, 3);
      count++;
    }
  });

  return { coefficient: count > 0 ? sumK / count : 0 };
};

const calculateSolarOutput = (model, weatherData, capacityKw, params = {}) => {
  if (!model || !weatherData) return 0;
  
  const { 
    tilt = PHYSICS_CONSTANTS.OPTIMAL_TILT, 
    azimuth = PHYSICS_CONSTANTS.OPTIMAL_AZIMUTH, 
    efficiency = PHYSICS_CONSTANTS.SOLAR_DEFAULT_EFFICIENCY, 
    performanceRatio = PHYSICS_CONSTANTS.PERFORMANCE_RATIO_DEFAULT 
  } = params;
  const orientationFactor = calculateOrientationFactor(tilt, azimuth);
  
  let total = 0;
  weatherData.forEach(day => {
    const avgTemp = (day.temp_max + day.temp_min) / 2;
    // Ajuste de eficiencia por temperatura
    const tempLoss = 1 - (Math.max(0, avgTemp - PHYSICS_CONSTANTS.STANDARD_TEMP) * PHYSICS_CONSTANTS.TEMP_LOSS_COEFFICIENT);
    
    // Radiación incidente (simplificada)
    const radiationKwh = day.shortwave_radiation_sum * PHYSICS_CONSTANTS.SOLAR_RADIATION_CONVERSION; 
    
    // Fórmula: E = A * r * H * PR (A=Area, r=Yield, H=Radiation, PR=PerfRatio)
    // Simplificado usando capacidad instalada: E = Capacity * (Radiation/1kW_Standard) * PR * Factors
    
    // Asumimos que radiationKwh es global horizontal. Ajustamos por orientación.
    const effectiveRadiation = radiationKwh * orientationFactor;
    
    total += effectiveRadiation * capacityKw * performanceRatio * tempLoss;
  });
  
  return total;
};

// Helper: Función Gamma de Lanczos para aproximación
const gamma = (z) => {
  const g = 7;
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  let x = p[0];
  for (let i = 1; i < g + 2; i++) x += p[i] / (z + i);
  let t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
};

// Cálculo de producción usando Distribución de Weibull
const calculateWeibullProduction = (avgWindSpeed, capacityKw, params) => {
  const {
     cutIn = PHYSICS_CONSTANTS.WIND_CUT_IN_SPEED,
     rated = PHYSICS_CONSTANTS.WIND_RATED_SPEED,
     cutOut = PHYSICS_CONSTANTS.WIND_CUT_OUT_SPEED,
     rotorDiameter = 0
  } = params;
  
  // Parámetros Weibull (Aproximación Rayleigh k=2)
  const k = 2.0; 
  // Lambda (Scale parameter) aprox: avgSpeed / Gamma(1 + 1/k)
  const lambda = avgWindSpeed / gamma(1 + 1/k); 

  // Probabilidad de viento v (Weibull PDF): (k/lambda) * (v/lambda)^(k-1) * exp(-(v/lambda)^k)
  const weibullPDF = (v) => {
      if (v < 0) return 0;
      return (k / lambda) * Math.pow(v / lambda, k - 1) * Math.exp(-Math.pow(v / lambda, k));
  };

  // Curva de potencia del aerogenerador P(v)
  const turbinePower = (v) => {
      if (v < cutIn || v >= cutOut) return 0;
      if (v >= rated) return capacityKw;
      
      // Entre cutIn y rated: Subida cúbica o por CP
      // P = P_rated * ((v^k - vin^k) / (v_rated^k - vin^k)) se usa a veces, 
      // pero usaremos modelo Cp físico si hay diámetro, o cúbico simple.
      
      if (rotorDiameter > 0) {
          const area = Math.PI * Math.pow(rotorDiameter / 2, 2);
          const rho = PHYSICS_CONSTANTS.AIR_DENSITY;
          const cp = PHYSICS_CONSTANTS.WIND_CP_DEFAULT;
          const powerW = 0.5 * rho * area * cp * Math.pow(v, 3);
          return Math.min(powerW / 1000, capacityKw);
      } else {
          // Aproximación polinómica simple escalada
          const factor = Math.pow((v - cutIn) / (rated - cutIn), 3); // Ojo: esto es muy simple
          return capacityKw * factor; 
      }
  };

  // Integración numérica (Regla del trapecio)
  let totalPower = 0;
  const step = 0.5; // m/s
  
  for (let v = 0; v <= cutOut + 5; v += step) {
      const p = turbinePower(v);
      const prob = weibullPDF(v);
      totalPower += p * prob * step;
  }

  // totalPower es la potencia media esperada (kW)
  return totalPower * 24; // kWh diarios
};

const calculateWindOutput = (model, weatherData, capacityKw, params = {}) => {
  if (!model || !weatherData) return 0;
  
  const { height = 10, rotorDiameter = 0, cutIn, rated, cutOut } = params;
  const refHeight = 10; 
  
  let total = 0;
  
  weatherData.forEach(day => {
    // Intentar obtener velocidad media, si no existe asumir max * 0.6 como aprox muy burda
    let rawWindSpeed = day.wind_speed_10m_mean;
    if (rawWindSpeed === undefined) {
         rawWindSpeed = day.wind_speed_10m_max ? day.wind_speed_10m_max * 0.6 : 0;
    }
    
    // Ajuste de altura (Hellmann)
    const avgWindSpeedAtHeight = adjustWindSpeedForHeight(rawWindSpeed, refHeight, height);
    
    // Calcular energía diaria usando Weibull con la velocidad media del día
    const dailyEnergy = calculateWeibullProduction(avgWindSpeedAtHeight, capacityKw, {
        cutIn, rated, cutOut, rotorDiameter
    });
    
    total += dailyEnergy;
  });
  
  return total;
};

// ==========================================
// 4. CÁLCULOS ECONÓMICOS
// ==========================================

const calculateEconomics = (investment, annualProduction, selfConsumptionRate, prices, years = ECONOMIC_DEFAULTS.DEFAULT_PROJECT_LIFESPAN, params = {}) => {
  const { 
    electricityPrice = prices.gridPrice, 
    surplusPrice = prices.sellPrice,
    inflationRate = ECONOMIC_DEFAULTS.INFLATION_RATE,
    degradationRate = ECONOMIC_DEFAULTS.DEGRADATION_RATE
  } = params;

  const annualSavingsBase = annualProduction * selfConsumptionRate * electricityPrice;
  const annualIncomeBase = annualProduction * (1 - selfConsumptionRate) * surplusPrice;
  
  const cashFlows = [-investment];
  let cumulativeCashFlow = -investment;
  let paybackPeriod = null;

  for (let i = 1; i <= years; i++) {
    const degradationFactor = Math.pow(1 - degradationRate, i - 1);
    const inflationFactor = Math.pow(1 + inflationRate, i - 1);
    
    const yearSavings = annualSavingsBase * degradationFactor * inflationFactor;
    const yearIncome = annualIncomeBase * degradationFactor * inflationFactor; // Precio de venta suele ser fijo o indexado diferente, simplificamos
    
    const totalYearBenefit = yearSavings + yearIncome;
    
    // Mantenimiento: 1% anual + inversor año 10 (10% inversión)
    let maintenanceCost = investment * ECONOMIC_DEFAULTS.MAINTENANCE_RATE * inflationFactor;
    if (i === ECONOMIC_DEFAULTS.INVERTER_REPLACEMENT_YEAR) maintenanceCost += investment * ECONOMIC_DEFAULTS.INVERTER_REPLACEMENT_COST; // Cambio de inversor/piezas
    
    const netYearFlow = totalYearBenefit - maintenanceCost;
    
    cashFlows.push(netYearFlow);
    cumulativeCashFlow += netYearFlow;
    
    if (paybackPeriod === null && cumulativeCashFlow >= 0) {
      const prevCumulative = cumulativeCashFlow - netYearFlow;
      paybackPeriod = (i - 1) + (Math.abs(prevCumulative) / netYearFlow);
    }
  }

  const totalBenefit = cashFlows.slice(1).reduce((a, b) => a + b, 0);
  const roi = ((totalBenefit - investment) / investment) * 100;
  const discountRate = ECONOMIC_DEFAULTS.DISCOUNT_RATE;
  const npv = cashFlows.reduce((acc, val, t) => acc + (val / Math.pow(1 + discountRate, t)), 0);

  // Cálculo IRR simplificado (Placeholder por ahora)
  let irr = ECONOMIC_DEFAULTS.DEFAULT_IRR; 
  
  return {
    roi: roi.toFixed(2),
    payback: paybackPeriod ? paybackPeriod.toFixed(1) : `> ${ECONOMIC_DEFAULTS.MAX_PAYBACK_YEARS}`,
    npv: npv.toFixed(2),
    irr: (irr * 100).toFixed(2), 
    annualSavings: (annualSavingsBase + annualIncomeBase).toFixed(2),
    cashFlows
  };
};

// ==========================================
// 5. CLASE PRINCIPAL (SERVICIO)
// ==========================================

class EnergyService {
  constructor() {
    this.models = { solar: null, wind: null };
    this.isInitialized = false;
    this.historicalData = null;
  }

  async initialize() {
    if (this.isInitialized) return;
    try {
      const rawData = await downloadTrainingData();
      
      // Limpieza básica
      const cleanSolar = rawData.solar.filter(d => d.annualProduction > 0 && d.annualProduction < FALLBACK_DATA.SOLAR_MAX_TRAINING_PRODUCTION);
      const cleanWind = rawData.wind.filter(d => d.avgWindSpeed > 0 && d.avgWindSpeed < PHYSICS_CONSTANTS.WIND_CUT_OUT_SPEED);
      
      this.historicalData = { solar: cleanSolar, wind: cleanWind };

      // Calibración de modelos
      const solarSet = cleanSolar.map(d => ({
        temp: d.temperature || PHYSICS_CONSTANTS.STANDARD_TEMP,
        efficiency: d.annualProduction / (d.radiation * PHYSICS_CONSTANTS.DAYS_IN_YEAR || FALLBACK_DATA.SOLAR_DEFAULT_RADIATION)
      }));
      this.models.solar = calibrateSolarParameters(solarSet);

      const windSet = cleanWind.map(d => ({
        speed: d.avgWindSpeed,
        production: d.annualProduction
      }));
      this.models.wind = calibrateWindParameters(windSet);

      this.isInitialized = true;
    } catch (error) {
      console.error('Error inicializando servicio energético:', error);
    }
  }

  async predictSolar(lat, lon, capacityKw, params = {}) {
    if (!this.isInitialized) await this.initialize();

    // 1. Intentar obtener datos reales de PVGIS (Mejores datos)
    try {
      const pvgisData = await dynamicAPIService.getSolarIrradiationData(lat, lon);
      if (pvgisData && pvgisData.yearlyProduction) {
        // PVGIS devuelve producción para 1kWp con pérdidas estándar
        // Ajustamos por capacidad y ratio de rendimiento específico
        const basePvgis = pvgisData.yearlyProduction; // kWh/kWp
        
        // Aplicar factores técnicos adicionales si difieren del estándar PVGIS
        const { performanceRatio = PHYSICS_CONSTANTS.PERFORMANCE_RATIO_DEFAULT, tilt = PHYSICS_CONSTANTS.OPTIMAL_TILT, azimuth = PHYSICS_CONSTANTS.OPTIMAL_AZIMUTH } = params;
        
        // Calcular factor de orientación (pérdidas por desviación del óptimo)
        const orientationFactor = calculateOrientationFactor(tilt, azimuth);

        // Ajuste simple: PVGIS ya considera muchas pérdidas, pero ajustamos por PR del usuario vs estándar (0.75)
        const prFactor = performanceRatio / PHYSICS_CONSTANTS.PERFORMANCE_RATIO_DEFAULT;
        
        const annualProduction = basePvgis.E_y * capacityKw * prFactor * orientationFactor;
        
        // Procesar datos mensuales si existen
        let monthlyDistribution = [];
        if (pvgisData.monthlyData && pvgisData.monthlyData.length > 0) {
           monthlyDistribution = pvgisData.monthlyData.map(m => ({
             month: m.month,
             production: m.E_m * capacityKw * prFactor * orientationFactor
           }));
        } else {
           // Simulación estacional si no hay datos mensuales
           monthlyDistribution = Array.from({ length: CALCULATION_CONSTANTS.MONTHS_IN_YEAR }, (_, i) => ({
             month: i + 1,
             production: (annualProduction / CALCULATION_CONSTANTS.MONTHS_IN_YEAR) * (1 + Math.sin((i - 6) * Math.PI / 6) * CALCULATION_CONSTANTS.SEASONALITY_AMPLITUDE)
           }));
        }

        return { annualProduction, monthlyDistribution };
      }
    } catch (e) {
      console.warn("Fallo PVGIS, usando modelo interno:", e);
    }

    // 2. Fallback: Modelo interno interpolado
    let baseProduction = 0;
    
    if (this.historicalData && this.historicalData.solar.length > 0) {
      baseProduction = interpolateProduction(lat, lon, this.historicalData.solar) * capacityKw;
    } else {
      baseProduction = FALLBACK_DATA.SOLAR_BASE_PRODUCTION * capacityKw; // Fallback
    }

    // Aplicar factores técnicos
    const { tilt = PHYSICS_CONSTANTS.OPTIMAL_TILT, azimuth = PHYSICS_CONSTANTS.OPTIMAL_AZIMUTH, performanceRatio = PHYSICS_CONSTANTS.PERFORMANCE_RATIO_DEFAULT } = params;
    const orientationFactor = calculateOrientationFactor(tilt, azimuth);
    
    // Ajuste final
    const finalAnnualProduction = baseProduction * orientationFactor * (performanceRatio / PHYSICS_CONSTANTS.PERFORMANCE_RATIO_DEFAULT); // Normalizado
    
    // Generar distribución mensual simulada para fallback
    const monthlyDistribution = Array.from({ length: CALCULATION_CONSTANTS.MONTHS_IN_YEAR }, (_, i) => ({
        month: i + 1,
        production: (finalAnnualProduction / CALCULATION_CONSTANTS.MONTHS_IN_YEAR) * (1 + Math.sin((i - 6) * Math.PI / 6) * CALCULATION_CONSTANTS.SEASONALITY_AMPLITUDE)
    }));

    return { annualProduction: finalAnnualProduction, monthlyDistribution };
  }

  async predictWind(lat, lon, capacityKw, params = {}) {
    if (!this.isInitialized) await this.initialize();

    console.log(`[EnergyService] Predicting Wind for ${lat}, ${lon}, Power: ${capacityKw}kW`);
    console.log(`[EnergyService] Params:`, params);

    // 1. Intentar obtener datos reales de viento (Open-Meteo)
    try {
      const weatherData = await dynamicAPIService.getHistoricalWeatherData(lat, lon);
      
      if (weatherData && (weatherData.data || (weatherData.wind && weatherData.wind.avgSpeed))) {
        let annualProduction = 0;
        let monthlyDistribution = [];
        
        // Si tenemos datos detallados diarios (el nuevo formato estandarizado que devuelve dynamicService o el backend local)
        // Necesitamos asegurar que weatherData.data sea un array de días
        // Nota: dynamicAPIService.getHistoricalWeatherData a veces devuelve un resumen. 
        // Vamos a intentar obtener el raw data si es posible o usar lo que tengamos.
        
        // Si weatherData tiene 'data' (array diario), usamos calculateWindOutput (Weibull)
        if (weatherData.data && Array.isArray(weatherData.data)) {
             console.log(`[EnergyService] Using detailed daily data (${weatherData.data.length} days)`);
             const dailyData = weatherData.data.map(d => ({
                 wind_speed_10m_mean: d.windspeed_mean || d.wind_speed_10m_mean,
                 wind_speed_10m_max: d.windspeed_max || d.wind_speed_10m_max
             }));
             
             // Calculamos un año típico promediando
             const totalEnergy = calculateWindOutput({}, dailyData, capacityKw, params);
             // Normalizar a 1 año (weatherData suele traer 3-5 años)
             const daysInDataset = dailyData.length;
             const yearsInDataset = daysInDataset / 365;
             annualProduction = totalEnergy / yearsInDataset;
             
        } else if (weatherData.wind && weatherData.wind.avgSpeed) {
             // Fallback a cálculo simple Weibull con velocidad media anual si no hay datos diarios
             const avgSpeed = weatherData.wind.avgSpeed;
             const { height = CALCULATION_CONSTANTS.WIND_REF_HEIGHT } = params;
             const adjustedSpeed = adjustWindSpeedForHeight(avgSpeed, CALCULATION_CONSTANTS.WIND_REF_HEIGHT, height);
             
             console.log(`[EnergyService] Using average speed: ${avgSpeed} m/s (Adjusted: ${adjustedSpeed.toFixed(2)})`);
             
             // Estimación usando Weibull diario x 365
             const dailyProd = calculateWeibullProduction(adjustedSpeed, capacityKw, params);
             annualProduction = dailyProd * 365;
        }

        console.log(`[EnergyService] Calculated Annual Production: ${annualProduction.toFixed(2)} kWh`);

        // Calcular Factor de Planta (Capacity Factor)
        // CF = Producción Real / (Capacidad * Horas)
        const theoreticalMax = capacityKw * PHYSICS_CONSTANTS.HOURS_IN_YEAR;
        const capacityFactor = theoreticalMax > 0 ? (annualProduction / theoreticalMax) : 0;
        
        // Procesar datos mensuales simulados o reales
        if (weatherData.wind && weatherData.wind.monthlyAvg && weatherData.wind.monthlyAvg.length > 0) {
             // Si tenemos promedios mensuales, distribuimos la producción anual según esos pesos
             const monthlyWeights = weatherData.wind.monthlyAvg.map(m => m.avgSpeed);
             const totalWeight = monthlyWeights.reduce((a,b) => a+b, 0);
             
             monthlyDistribution = weatherData.wind.monthlyAvg.map((m, i) => ({
                 month: i + 1,
                 production: annualProduction * (m.avgSpeed / totalWeight)
             }));
        } else {
             // Simulación estacional
             monthlyDistribution = Array.from({ length: CALCULATION_CONSTANTS.MONTHS_IN_YEAR }, (_, i) => ({
                 month: i + 1,
                 production: (annualProduction / CALCULATION_CONSTANTS.MONTHS_IN_YEAR) * (1 + Math.sin((i - 6) * Math.PI / 6) * CALCULATION_CONSTANTS.SEASONALITY_AMPLITUDE)
             }));
        }

        return { annualProduction, monthlyDistribution, capacityFactor };
      }
    } catch (e) {
      console.warn("Fallo Wind Service, usando modelo interno:", e);
    }

    // 2. Fallback: Modelo interno interpolado
    console.log("[EnergyService] Using internal model fallback");
    let baseProduction = 0;
    
    // ... logic de fallback existente ...
    // Necesitamos estimar la velocidad media interpolada para usar Weibull, no solo producción directa
    // Por simplicidad en fallback, mantenemos interpolación de producción directa calibrada
    
    if (this.historicalData && this.historicalData.wind.length > 0) {
      baseProduction = interpolateProduction(lat, lon, this.historicalData.wind) * (capacityKw / FALLBACK_DATA.TRAINING_TURBINE_POWER);
    } else {
      baseProduction = FALLBACK_DATA.WIND_BASE_PRODUCTION * capacityKw;
    }
    
    const monthlyDistribution = Array.from({ length: CALCULATION_CONSTANTS.MONTHS_IN_YEAR }, (_, i) => ({
      month: i + 1,
      production: (baseProduction / CALCULATION_CONSTANTS.MONTHS_IN_YEAR) * (1 + Math.sin((i - 6) * Math.PI / 6) * CALCULATION_CONSTANTS.SEASONALITY_AMPLITUDE)
    }));

    // Estimación CF para fallback
    const cfFallback = baseProduction / (capacityKw * PHYSICS_CONSTANTS.HOURS_IN_YEAR);

    return { annualProduction: baseProduction, monthlyDistribution, capacityFactor: cfFallback };
  }


  async analyzeEconomics(investment, production, selfConsumption, years = ECONOMIC_DEFAULTS.DEFAULT_PROJECT_LIFESPAN, params = {}) {
    const prices = await fetchCurrentMarketPrices();
    return calculateEconomics(investment, production, selfConsumption, prices, years, params);
  }

  setConfig(config) {
    // Método de compatibilidad
    console.log("Configuración actualizada en EnergyService");
  }
}

const energyService = new EnergyService();
export default energyService;
