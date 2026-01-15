const axios = require('axios');
const apis = require('../config/apis');
const SIMULATION_CONSTANTS = require('../config/simulationParams');

class SolarService {
  /**
   * Comprehensive solar simulation using PVGIS
   * Maps user detailed parameters to PVGIS API calls and calculates physics-based losses
   */
  async getAdvancedSolarData(coords, params) {
    try {
      // 1. Extract Physics & Tech params
      const {
        tilt = SIMULATION_CONSTANTS.SOLAR.TECHNICAL.OPTIMAL_ANGLE, 
        azimuth = SIMULATION_CONSTANTS.SOLAR.TECHNICAL.OPTIMAL_ASPECT, 
        peakPowerKw = 1,
        systemLoss = (1 - SIMULATION_CONSTANTS.SOLAR.TECHNICAL.SYSTEM_PERFORMANCE_RATIO) * 100, // 14-15% typical
        technology = 'crystSi', // "crystSi", "CIS", "CdTe", "Unknown"
        mountingPlace = 'free' // "free" or "building"
      } = params;

      // 2. Call PVGIS Market/SeriesCalc
      // Using Hourly Data for maximum precision is ideal, but Monthly is often sufficient for faster estimates.
      // We will use Monthly (PVcalc) for generation profiling.
      
      // AZIMUTH CORRECTION (CRITICAL):
      // PVGIS API uses: 0=South, -90=East, 90=West.
      // Frontends typically use Compass: 180=South.
      // If we receive ~180, we MUST convert to 0 to avoid simulating North-facing panels (which yields ~50-60% less energy).
      
      let pvgisAzimuth = Number(azimuth);
      if (Math.abs(pvgisAzimuth - 180) < 5) {
          console.log(`[SolarService] ⚠️ Detected Azimuth ${pvgisAzimuth} (Compass South). Converting to PVGIS Standard (0=South).`);
          pvgisAzimuth = 0;
      }
      
      console.log(`[SolarService] Calling PVGIS with Capacity: ${peakPowerKw} kW, Loss: ${systemLoss}%, Tilt: ${tilt}, Azimuth: ${pvgisAzimuth} (Original: ${azimuth})`);

      const pvgisResponse = await axios.get(`${apis.electricity.pvgis}/PVcalc`, {
        params: {
          lat: Number(coords.lat),
          lon: Number(coords.lon),
          peakpower: Number(peakPowerKw),
          loss: Number(systemLoss),
          angle: Number(tilt),
          aspect: pvgisAzimuth,
          mountingplace: mountingPlace,
          pvtechchoice: technology,
          outputformat: 'json'
        }
      });

      const outputs = pvgisResponse.data.outputs;
      const meta = pvgisResponse.data.inputs;

      // 3. Process Monthly Data for Seasonality
      const monthlyData = outputs.monthly.fixed.map(m => ({
        month: m.month,
        productionKwh: m.E_m,         // Energy production
        irradiationKwhM2: m['H(i)_m'],   // Plane of array irradiation
        stdDeviation: m.SD_m          // Variability
      }));

      // 4. Calculate Annual Metrics
      const annualProduction = outputs.totals.fixed.E_y; // Yearly PV production (kWh)
      const annualIrradiation = outputs.totals.fixed['H(i)_y']; // Yearly in-plane irradiation (kWh/m2)
      
      // Calculate specific yield (kWh / kWp)
      const specificYield = annualProduction / peakPowerKw;

      // 5. Advanced Temperature Loss Estimation (If we wanted to go deeper than PVGIS internal)
      // PVGIS already accounts for temperature loosely based on "mountingPlace" and "pvtechchoice".
      
      return {
        success: true,
        source: 'PVGIS (European Commission)',
        location: coords,
        specs: {
          installedCapacityKw: peakPowerKw,
          tilt: meta.mounting_system.fixed.slope.value,
          azimuth: meta.mounting_system.fixed.azimuth.value,
          technology: meta.pv_module.technology,
          systemLossPercent: meta.economic_data.system_loss
        },
        production: {
          annualKwh: annualProduction,
          monthly: monthlyData,
          specificYieldInfo: "kWh/kWp/year",
          specificYield: specificYield
        },
        climate: {
          annualIrradiation: annualIrradiation // In-plane
        }
      };

    } catch (error) {
      console.error('Advanced Solar API error:', error.message);
      throw new Error(`Solar Simulation Failed: ${error.message}`);
    }
  }

  // Legacy wrapper for compatibility
  // PVGIS API usage with correct PVcalc endpoint
  async getSolarData(regionCoords, options = {}) {
    try {
      const loss = options.loss || (1 - SIMULATION_CONSTANTS.SOLAR.TECHNICAL.SYSTEM_PERFORMANCE_RATIO)*100 || 14;
      const angle = options.angle || SIMULATION_CONSTANTS.SOLAR.TECHNICAL.OPTIMAL_ANGLE || 35;
      const aspect = options.azimuth || options.aspect || SIMULATION_CONSTANTS.SOLAR.TECHNICAL.OPTIMAL_ASPECT || 0;

      // Get solar irradiation data from PVGIS
       const pvgisResponse = await axios.get(`${apis.electricity.pvgis}/PVcalc`, {
        params: {
          lat: regionCoords.lat,
          lon: regionCoords.lon,
          peakpower: 1, // Normalized to 1kWp
          loss: loss,
          angle: angle,
          aspect: aspect,
          outputformat: 'json'
        }
      });
      
      const outputs = pvgisResponse.data.outputs;

      // Mapping old structure to new data
      return {
        source: 'PVGIS (European Commission)',
        solarIrradiation: outputs.totals.fixed['H(i)_y'] || 1600,
        annualProduction: outputs.totals.fixed.E_y, 
        monthlyData: outputs.monthly.fixed.map(m => ({
            month: m.month,
            production: m.E_m
        })),
        optimalAngle: angle,
        capacityFactor: (outputs.totals.fixed.E_y / (1 * 8760)) // CF = Energy / (Capacity * Hours)
      };
    } catch (error) {
      console.error('Solar API error:', error.message); 
      throw new Error("PVGIS API Failed and Fallbacks are disabled.");
    }
  }

}

module.exports = new SolarService();
