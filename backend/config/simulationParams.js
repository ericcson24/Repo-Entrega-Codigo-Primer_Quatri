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
    }
  },

  // === EÓLICA (WIND) ===
  WIND: {
    TECHNICAL: {
      AIR_DENSITY_SEA_LEVEL: 1.225, // kg/m3
      WEIBULL_K_DEFAULT: 2.0, // Factor de forma Rayleigh por defecto
      ROUGHNESS_CLASS_DEFAULT: 1.5, // Rugosidad media
      SHEAR_EXPONENT: 0.143, // Ley logarítmica perfil viento (terreno neutral)
      CUT_IN_SPEED: 3.5, // m/s
      CUT_OUT_SPEED: 25.0, // m/s
      RATED_SPEED: 12.0, // m/s
      AVAILABILITY_FACTOR: 0.97, // 97% disponiblidad técnica
      WAKE_LOSSES: 0.05, // 5% perdidas por efecto estela
      DEGRADATION_RATE: 0.01, // 1% anual (mayor que solar por partes mecánicas)
      LIFETIME_YEARS: 25, // Extensión común hoy en día
      REPOWERING_YEAR: 20
    },
    FINANCIAL: {
        OPEX_PERCENTAGE: 0.035, // 3-4% del CAPEX (mucho más alto que solar)
        DISMANTLING_PROVISION: 0.05, // 5% del CAPEX reservado para final de vida
        CAPTURE_PRICE_FACTOR: 0.90 // 90% (Canibalización de precio)
    }
  },

  // === GENERALES / FINANCIEROS ===
  FINANCIAL: {
    DISCOUNT_RATE: 0.065, // 6.5% Tasa de descuento (WACC) - Riesgo ponderado
    INFLATION_ENERGY: 0.03, // 3% Inflación energética anual
    INFLATION_MAINTENANCE: 0.025, // 2.5% IPC industrial
    TAX_RATE: 0.25, // 25% Impuesto de sociedades
    LOAN_TERM: 12,
    LOAN_INTEREST: 0.055
  },

  // === MERCADO ===
  MARKET: {
    FEED_IN_TARIFF_SOLAR: 0.05, 
    FEED_IN_TARIFF_WIND: 0.045, // Eólica suele vender más barato (noche/viento fuerte)
    GRID_PRICE: 0.15,
    SELF_CONSUMPTION_RATIO_WIND: 0.70, // Eólica industrial suele ser para autoconsumo masivo 24h
  }
};

module.exports = SIMULATION_CONSTANTS;
