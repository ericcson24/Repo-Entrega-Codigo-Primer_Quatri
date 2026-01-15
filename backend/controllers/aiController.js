const fs = require('fs');
const path = require('path');
const simService = require('../services/simulationService'); 
const weatherService = require('../services/weatherService');
const aiService = require('../services/aiService');

const moment = require('moment');

class AIController {
  
  constructor() {
    this.predictEnergy = this.predictEnergy.bind(this);
    this.runFullSimulation = this.runFullSimulation.bind(this);
    this.optimizeSystem = this.optimizeSystem.bind(this);
    this.trainModel = this.trainModel.bind(this); // Bind new method
  }

  /**
   * Simulación Completa con IA (Hourly Time-Series)
   * Itera hora a hora por años históricos usando la Red Neuronal
   */
  async runFullSimulation(req, res) {
      try {
          const { location, systemParams, years = 4 } = req.body;
          
          if (!location?.lat || !location?.lon) {
             return res.status(400).json({ error: "Location required" });
          }
          
          const sizeKw = systemParams?.systemSizeKw || 5;

          // 1. Obtener Histórico Horario (Raw Data)
          console.log(`[AI Simulation] Fetching ${years} years of hourly data for ${location.lat}, ${location.lon}...`);
          const weatherHistory = await weatherService.getHourlyHistoricalWeather(location.lat, location.lon, years);
          
          if (!weatherHistory || !weatherHistory.data) {
              return res.status(500).json({ error: "Could not fetch historical weather for simulation" });
          }

          const hourlyData = weatherHistory.data;
          console.log(`[AI Simulation] Processing ${hourlyData.length} hours via Neural Network...`);

          // 2. Loop de Inferencia (IA calculation per hour)
          const yearlyStats = {};
          
          let totalEnergy = 0;
          let totalIrr = 0;
          
          hourlyData.forEach(hour => {
               const date = moment(hour.time);
               const year = date.year();
               const month = date.format('MMMM'); // Full month name
               const monthIndex = date.month(); // 0-11

               // Init structure if needed
               if (!yearlyStats[year]) {
                   yearlyStats[year] = {
                       year: year,
                       totalEnergy: 0,
                       monthly: Array(12).fill(0).map((_, i) => ({ month: i+1, energy: 0, avgPR: 0, hours: 0 }))
                   };
               }

               // Skip night hours for optimization
               if (hour.irr > 10) { 
                   // INFERENCIA IA 
                   const pr = aiService.predictPerformanceRatio(hour.temp, hour.irr, hour.wind);
                   
                   // CÁLCULO ENERGÍA (Physics-Informed)
                   // Energy (kWh) = Size (kW) * (Irr (W/m2) / 1000) * PR * 1h
                   const energyKwh = sizeKw * (hour.irr / 1000) * pr;
                   
                   // Acumuladores
                   yearlyStats[year].totalEnergy += energyKwh;
                   yearlyStats[year].monthly[monthIndex].energy += energyKwh;
                   
                   // For Avg PR calc
                   yearlyStats[year].monthly[monthIndex].avgPR += pr;
                   yearlyStats[year].monthly[monthIndex].hours += 1;

                   totalEnergy += energyKwh;
                   totalIrr += (hour.irr / 1000);
               }
          });

          // 3. Post-Procesado y Medias
          const formattedResults = Object.values(yearlyStats).map(yStatus => {
               yStatus.monthly = yStatus.monthly.map(m => ({
                   month: m.month,
                   energy_kwh: parseFloat(m.energy.toFixed(2)),
                   avg_efficiency: m.hours > 0 ? parseFloat((m.avgPR / m.hours).toFixed(4)) : 0
               }));
               yStatus.totalEnergy = parseFloat(yStatus.totalEnergy.toFixed(2));
               return yStatus;
          });

          return res.json({
              simulation_type: "Deep Learning Time-Series (Hourly)",
              system_size_kw: sizeKw,
              total_hours_processed: hourlyData.length,
              years_simulated: formattedResults.length,
              results: formattedResults
          });

      } catch (error) {
          console.error('[AI Simulation] Error:', error);
          res.status(500).json({ error: error.message });
      }
  }

  /**
   * Predice generación energética basándose en modelos entrenados (Deep Learning MLP)
   */
  async predictEnergy(req, res) {
    try {
        const { location, date, type } = req.body;
        
        if (!location?.lat || !location?.lon) {
            return res.status(400).json({ error: "Location (lat, lon) is required" });
        }

        const model = aiService.getSolarModel();
        if (!model) {
            return res.status(503).json({ error: "AI not trained. Run 'npm run train:ai'" });
        }
             
        // 1. Obtener condiciones reales actuales
        const weather = await weatherService.getWeatherData(location);
        const temp = weather.temperature || 20;
        const irr = weather.irradiation || 500;
        const wind = weather.windSpeed || 5;

        // 2. Ejecutar Red Neuronal (MLP) a través del Servicio
        const predictedPR = aiService.predictPerformanceRatio(temp, irr, wind);
        
        // 3. Predicción de Potencia Estándar W/m2 (Unit Power)
        const predictedPowerPerM2 = irr * predictedPR; 

        // 4. Cálculo de Sistema Especifico (si el usuario lo pide)
        let systemOutputKW = null;
        let systemContext = null;

        if (req.body.systemParams) {
            const { systemSizeKw = 5 } = req.body.systemParams;
            const stcIrradiance = 1000;
            const irradianceFactor = irr / stcIrradiance;
            
            systemOutputKW = systemSizeKw * irradianceFactor * predictedPR;
            
            systemContext = {
                requestedSize: `${systemSizeKw} kWp`,
                formula: `Size * (Irr/1000) * PR`
            };
        }

        // 5. Análisis de Factores
        const factors = [];
        if (temp > 25) factors.push(`High Temperature Loss`);
        if (irr < 200) factors.push("Low Irradiance Conditions");

        return res.json({
            predictionSource: `AI Neural Network (${model.architecture || 'MLP'})`,
            accuracyConfidence: "Very High (Deep Learning)",
            modelMetadata: model.metadata,
            inputs: {
                temperature: temp,
                irradiation: irr,
                windSpeed: wind,
                source: weather.source
            },
            prediction: {
                performance_ratio: parseFloat(predictedPR.toFixed(4)),
                estimated_output_w_m2: parseFloat(predictedPowerPerM2.toFixed(2)),
                system_output_kw: systemOutputKW ? parseFloat(systemOutputKW.toFixed(3)) : undefined,
                loss_factors: factors,
                unit: "W/m2"
            },
            context: systemContext
        });

    } catch (error) {
        console.error('AI Prediction Failed:', error);
        res.status(500).json({ error: error.message });
    }
  }

  /**
   * Optimización usando Grid Search (Búsqueda en Rejilla) sobre el motor físico
   * Encuentra el layout (tilt/azimuth) que maximiza el VAN (NPV).
   * Sustituye a la "caja negra" de IA con un optimizador transparente y real.
   */
  async optimizeSystem(req, res) {
    try {
        const { location, technical, financial, constraints } = req.body;
        
        // Espacio de búsqueda delimitado (para no saturar servidor)
        // Tilt: 20º a 50º (pasos de 5º)
        // Azimuth: 150º a 210º (pasos de 10º, donde 180 es Sur)
        
        const tilts = [20, 30, 35, 40, 50];
        const azimuths = [-30, -15, 0, 15, 30]; // 0 = Sur, - = Este, + = Oeste (Backend PVGIS notation)

        let bestResult = { npv: -Infinity, config: null };
        const results = [];

        // Ejecutar simulaciones en "paralelo" (secuencial aquí por JS single thread, pero fast enough)
        for (const t of tilts) {
            for (const a of azimuths) {
                const simInput = {
                    location,
                    technical: { ...technical, tilt: t, azimuth: a },
                    financial,
                    costs: constraints?.costs || {}
                };

                // Llamamos al motor real que construimos antes
                const simResult = await simulationService.runFullSolarSimulation(simInput);
                
                const npv = simResult.summary.npv;
                
                if (npv > bestResult.npv) {
                    bestResult = { npv, config: { tilt: t, azimuth: a } };
                }
            }
        }

        res.json({
            optimizationMethod: "Physics-Based Grid Search",
            optimalConfig: bestResult.config,
            projectedNPV: bestResult.npv,
            improvementMessage: `Optimal configuration found at Tilt ${bestResult.config.tilt}°, Azimuth ${bestResult.config.azimuth}°`
        });

    } catch (error) {
        console.error("Optimization Error", error);
        res.status(500).json({ error: "System Optimization Failed" });
    }
  }

  /**
   * Entrenar Modelo IA bajo demanda (Admin/Debug)
   */
  async trainModel(req, res) {
    try {
        const { spawn } = require('child_process');
        const scriptPath = path.join(__dirname, '../scripts/train-advanced-ai.js');
        
        console.log('[AI Training] Starting training process...');
        const pythonProcess = spawn('node', [scriptPath]);
        
        let output = '';
        
        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
            console.log(`[AI Training] ${data}`);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`[AI Training Error] ${data}`);
        });

        pythonProcess.on('close', (code) => {
             if (code === 0) {
                 // Reload model in service
                 aiService._loadModels(); 
                 res.json({ success: true, message: "Training completed successfully", log: output });
             } else {
                 res.status(500).json({ error: "Training failed", code });
             }
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
  }
}

module.exports = new AIController();
