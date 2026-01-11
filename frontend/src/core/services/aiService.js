/**
 * SERVICIO DE CÁLCULO ENERGÉTICO (CLIENTE)
 * Ahora delega los cálculos pesados al Backend.
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

class EnergyService {
  constructor() {
    this.isInitialized = true; // Ya no necesitamos inicialización pesada local
  }

  async initialize() {
    // Legacy support: No-op
    return Promise.resolve();
  }

  /**
   * Predicción Solar via Backend
   */
  async predictSolar(lat, lon, capacityKw, params = {}) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/simulate/solar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, capacity: capacityKw, ...params })
      });

      if (!response.ok) throw new Error('Backend simulation failed');
      return await response.json();
    } catch (error) {
      console.error('Solar Simulation Error:', error);
      // Fallback básico para no romper UI
      return { 
        annualProduction: capacityKw * 1600 * 0.75, 
        monthlyDistribution: [] 
      };
    }
  }

  /**
   * Predicción Eólica via Backend (Weibull + Hellmann)
   */
  async predictWind(lat, lon, capacityKw, params = {}) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/simulate/wind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lon, capacity: capacityKw, ...params })
      });

      if (!response.ok) throw new Error('Backend simulation failed');
      return await response.json();
    } catch (error) {
      console.error('Wind Simulation Error:', error);
      return {
        annualProduction: 0,
        monthlyDistribution: [],
        capacityFactor: 0,
        error: true
      };
    }
  }

  /**
   * Análisis Financiero via Backend
   */
  async analyzeEconomics(investment, annualProduction, selfConsumption, years = 20, params = {}) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/simulate/financials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          investment, 
          annualProduction, 
          selfConsumption, 
          years,
          ...params 
        })
      });

      if (!response.ok) throw new Error('Backend economic analysis failed');
      return await response.json();
    } catch (error) {
      console.error('Financial Analysis Error:', error);
      return { roi: 0, payback: 0, npv: 0, annualSavings: 0, cashFlows: [] };
    }
  }

  setConfig(config) {
    console.log("Config update ignored (backend managed)");
  }
}

const energyService = new EnergyService();
export default energyService;
