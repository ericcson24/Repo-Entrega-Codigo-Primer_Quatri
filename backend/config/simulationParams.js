// Definición de las constantes por defecto y límites
const SIMULATION_CONSTANTS = {
  // === PARAMETROS FINANCIEROS GLOBALES (PARA CÁLCULOS) ===
  ECONOMICS: {
      VAT: 0.21, // IVA General España
      ELECTRICITY_TAX: 0.051127, // Impuesto Electricidad
      TOLLS_AND_CHARGES: 0.08, // €/kWh estimado de peajes y cargos transporte/distribución
      METER_RENTAL: 0.81, // €/mes (aprox)
  },

  // === FOTOVOLTAICA (SOLAR) ===
  SOLAR: {
    TECHNICAL: {
      // Por defecto: Temperatura ambiente de 25°C que es la estándar de testeo (STC)
      // Coeficiente de pérdida de potencia por temperatura (~ -0.35%/°C para paneles monocristalinos)
      TEMP_COEFF_PMAX: -0.0035, 
      SYSTEM_PERFORMANCE_RATIO: 0.85, // 85% rendimiento por defecto
      OPTIMAL_ANGLE: 35, // Inclinación óptima promedio España
      OPTIMAL_ASPECT: 0, // Azimut 0 (Sur)
      INVERTER_EFFICIENCY: 0.96, // 96%
      WIRING_LOSSES: 0.02, // 2%
      DIRT_LOSSES: 0.02, // 2% (Suciedad)
      DEGRADATION_RATE: 0.0055, // 0.55% anual
      LIFETIME_YEARS: 25,
    },
    FINANCIAL: {
        OPEX_PERCENTAGE: 0.015, // 1.5% del CAPEX
        DEFAULT_CAPEX_PER_KW: 1300 // Standardize default cost (Conservative)
    }
  },

  // === EÓLICA (WIND) ===
  WIND: {
    TECHNICAL: {
      AIR_DENSITY_SEA_LEVEL: 1.225, // kg/m3
      WEIBULL_K_DEFAULT: 2.0, // Factor de forma Rayleigh por defecto
      ROUGHNESS_CLASS_DEFAULT: 1.5, // Rugosidad media
      SHEAR_EXPONENT: 0.143, // Ley logarítmica perfil viento (terreno neutral)
      CUT_IN_SPEED: 3.0, // m/s (Modern low-wind machines)
      CUT_OUT_SPEED: 25.0, // m/s
      RATED_SPEED: 13.0, // m/s (Standard for large rotors)
      AVAILABILITY_FACTOR: 0.96, // 96% availability for onshore
      WAKE_LOSSES: 0.08, // 8% total system losses (Wake + Grid + Hysteresis)
      DEGRADATION_RATE: 0.0, // No degradation in power curve usually, done via events
      LIFETIME_YEARS: 25, 
      REPOWERING_YEAR: 20
    },
    FINANCIAL: {
        OPEX_PERCENTAGE: 0.0, // Calculated explicitly now (EUR/MW/year)
        OPEX_EUR_PER_KW_YEAR: 45, // ~45k€/MW/year = 225k/year for 5MW 
        DEFAULT_CAPEX_PER_KW: 1500, // 1.5M€/MW -> 7.5M€ for 5MW (Realista 2024 onshore)
        DISMANTLING_PROVISION: 0.05
    }
  },
  
  // === PARAMETROS FINANCIEROS (DEFAULTS) ===
  FINANCIAL: {
    INFLATION_ENERGY: 0.035, // 3.5% anual (historico largo plazo España)
    INFLATION_MAINTENANCE: 0.02, // 2% anual (IPC normal)
    DISCOUNT_RATE: 0.05, // 5% WACC / Tasa de descuento
  },

  // === ESCENARIOS DE SIMULACIÓN (NUEVO: Ajuste por Feedback Inversor) ===
  SCENARIOS: {
      PESSIMISTIC: {
          PRICE_CAP: 0.30, // Techo de precio bajo
          VOLATILITY: 0.35, // Alta volatilidad (+/- 17.5% base)
          INFLATION_ADJUSTMENT: -0.025, // Deflación energética relativa
          STARTING_PRICE_FACTOR: 0.9,
          CURTAILMENT_RISK: 0.4 // Alto riesgo de vertidos
      },
      BASE: { // "Real Base" - Más conservador que antes
          PRICE_CAP: 0.35, // Techo realista
          VOLATILITY: 0.25, // Volatilidad media (+/- 12.5% base) + Shocks
          INFLATION_ADJUSTMENT: -0.01, // Ligera corrección a la baja vs inflación general
          STARTING_PRICE_FACTOR: 1.0,
          CURTAILMENT_RISK: 0.2
      },
      OPTIMISTIC: { // El escenario original (Inflationary)
          PRICE_CAP: 0.45, // Techo alto
          VOLATILITY: 0.10, // Mercado estable
          INFLATION_ADJUSTMENT: 0.015, // Inflación energética positiva
          STARTING_PRICE_FACTOR: 1.05,
          CURTAILMENT_RISK: 0.05
      }
  },

  // === MARKET DEFAULTS ===
  MARKET: {
    FEED_IN_TARIFF_SOLAR: 0.05, 
    FEED_IN_TARIFF_WIND: 0.045, // Eólica suele vender más barato (noche/viento fuerte)
    GRID_PRICE: 0.15,
    SELF_CONSUMPTION_RATIO_WIND: 0.30, // UPDATED: More realistic default (30%). 70% is only for heavy industry with constant 24h load.
    SELF_CONSUMPTION_RATIO: 0.40, // Base default
  }
};

module.exports = SIMULATION_CONSTANTS;
