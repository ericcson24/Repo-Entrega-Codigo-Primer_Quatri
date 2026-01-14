// Parámetros Físicos Universales (Synced with Backend)
export const PHYSICS_CONSTANTS = {
  // --- GENERALES ---
  AIR_DENSITY: 1.225, // kg/m3 (Match Backend WIND.TECHNICAL.AIR_DENSITY_SEA_LEVEL)
  HOURS_IN_YEAR: 8760,
  
  // --- FOTOVOLTAICA (SOLAR) ---
  SOLAR_DEFAULT_EFFICIENCY: 0.21,
  PERFORMANCE_RATIO_DEFAULT: 0.85, // Match Backend SOLAR.TECHNICAL.SYSTEM_PERFORMANCE_RATIO
  OPTIMAL_TILT: 35, // Match Backend OPTIMAL_ANGLE
  OPTIMAL_AZIMUTH: 180, // Front uses 180 for South (Backend uses 0 for aspect, logic differs but physics ok)
  TEMP_LOSS_COEFFICIENT: 0.0035, // Match Backend TEMP_COEFF_PMAX (-0.35%)
  STANDARD_TEMP: 25, 
  SOLAR_LIFETIME_YEARS: 25, // Match Backend LIFETIME_YEARS
  SOLAR_DEGRADATION: 0.0055, // Match Backend DEGRADATION_RATE
  
  // --- EÓLICA (WIND) ---
  // Must match Backend SIMULATION_CONSTANTS.WIND.TECHNICAL
  WIND_CUT_IN_SPEED: 3.0, 
  WIND_RATED_SPEED: 13.0,
  WIND_CUT_OUT_SPEED: 25.0,
  WIND_ROUGHNESS: 0.143, // Match SHEAR_EXPONENT
  WIND_AVAILABILITY: 0.96, // Match AVAILABILITY_FACTOR
  WIND_CP_DEFAULT: 0.45,
  WIND_SYSTEM_LOSS_FACTOR: 0.92, // 1 - WAKE_LOSSES(0.08)
  WIND_LIFETIME_YEARS: 25,
  WIND_DEGRADATION: 0.0,
};

export const ECONOMIC_DEFAULTS = {
  // --- PRECIOS & MERCADO ---
  DEFAULT_ELECTRICITY_PRICE: 0.15,
  WHOLESALE_ELECTRICITY_PRICE: 0.050, // 50 €/MWh
  LARGE_SYSTEM_THRESHOLD: 100,
  
  // --- COSTES ESPECÍFICOS ---
  WIND_REPLACEMENT_COST_PERCENT: 0.05, // Match DISMANTLING_PROVISION logic partially
  CONSUMER_PRICE_TOLLS: 0.08, // Match Backend ECONOMICS.TOLLS_AND_CHARGES (was 0.04)
  SURPLUS_PRICE: 0.05,
  DEFAULT_SELF_CONSUMPTION_RATIO: 0.40, 
  
  // --- MACROECONOMÍA ---
  VAT: 0.21, // Match Backend ECONOMICS.VAT
  INFLATION_ENERGY: 0.035, // Match Backend FINANCIAL.INFLATION_ENERGY
  DISCOUNT_RATE: 0.05, // Match Backend FINANCIAL.DISCOUNT_RATE
  
  // --- MANTENIMIENTO (OPEX) ---
  MAINTENANCE_SOLAR: 0.015, // Match Backend SOLAR.FINANCIAL.OPEX_PERCENTAGE
  MAINTENANCE_WIND: 45.0, // Match Backend WIND.FINANCIAL.OPEX_EUR_PER_KW_YEAR
};

export const UI_DEFAULTS = {
  // Configuración Inicial de Interfaz
  INITIAL_CITY: 'Madrid',
  INITIAL_LAT: 40.4168,
  INITIAL_LON: -3.7038,
  
  WIND_INITIAL_CITY: 'Zaragoza',
  WIND_INITIAL_LAT: 41.6488,
  WIND_INITIAL_LON: -0.8891,

  SOLAR: {
    DEFAULT_SYSTEM_SIZE: 5.0, // kWp (Residencial típico)
    DEFAULT_PANEL_POWER: 550, // W (Paneles actuales son de 500-600W)
    DEFAULT_PANEL_COUNT: 10,
    DEFAULT_BUDGET: 6000, // € (Bajada precios 2024-25)
    DEFAULT_CONSUMPTION: 400, // kWh/mes
    DEFAULT_BATTERY_CAPACITY: 5.0, // kWh
  },
  
  WIND: {
    DEFAULT_TURBINE_POWER: 5000, 
    DEFAULT_TURBINE_HEIGHT: 100,
    DEFAULT_ROTOR_DIAMETER: 145, 
    DEFAULT_BUDGET: 7500000, // Match Backend (5MW * 1500€/kW)
    DEFAULT_CONSUMPTION: 0,
  },
  SIMPLE: {
    DEFAULT_SYSTEM_SIZE: 5, // kWp
    DEFAULT_PANEL_COST: 600, // €/kWp
    DEFAULT_INSTALLATION_COST: 400, // €/kWp
    DEFAULT_ANNUAL_INCREASE: 2.5, // %
  },
};

export const CALCULATION_CONSTANTS = {
  W_TO_KW: 1000,
  MWH_TO_KWH: 1000,
  PERCENTAGE_DIVISOR: 100,
  INSTALLATION_COST_FACTOR: 1.25, // +25% Instalación/Legalización
  MIN_PRICE_THRESHOLD: 0.01,
  INTERPOLATION_WEIGHT_FACTOR: 1000,
  INTERPOLATION_DISTANCE_OFFSET: 0.01,
  
  // --- SOLAR TÉCNICO ---
  ORIENTATION_LOSS_MIN: 0.60,
  ORIENTATION_LOSS_MAX: 1.00,
  SEASONALITY_AMPLITUDE: 0.35, // Variación Verano/Invierno
  
  // --- EÓLICA CURVA POTENCIA (Simplificada UI) ---
  WIND_CF_SLOPE: 0.08, // Pendiente curva CP
  WIND_CF_INTERCEPT: 0.15,
  WIND_CF_MAX: 0.52, // Max teórico UI
  WIND_REF_HEIGHT: 10, // Altura referencia datos meteo
  MONTHS_IN_YEAR: 12,
};

export const CACHE_CONSTANTS = {
  DEFAULT_EXPIRY: 3600000, // 1 hour
  LONG_EXPIRY: 86400000, // 24 hours
};



export const FALLBACK_DATA = {
  SOLAR_BASE_PRODUCTION: 1500, // kWh/kWp anual
  SOLAR_DEFAULT_RADIATION: 1800, // kWh/m2 anual
  WIND_BASE_PRODUCTION: 2000, // kWh/kW anual
  TRAINING_WIND_FACTOR: 0.3, // Factor de conversión viento promedio -> producción
  TRAINING_TURBINE_POWER: 1000, // kW referencia
  TRAINING_SYSTEM_SIZE: 1, // kWp referencia
  TRAINING_DEFAULT_TEMP: 15, // ºC
  SOLAR_MAX_TRAINING_PRODUCTION: 3000,
  WIND_DEFAULT_AVG_SPEED: 5, // m/s
  DEFAULT_CITIES: [
    { name: 'madrid', lat: 40.4168, lon: -3.7038, annualSolar: 1600, annualWind: 1200 },
    { name: 'barcelona', lat: 41.3851, lon: 2.1734, annualSolar: 1500, annualWind: 1400 },
    { name: 'sevilla', lat: 37.3891, lon: -5.9845, annualSolar: 1750, annualWind: 1100 },
    { name: 'valencia', lat: 39.4699, lon: -0.3763, annualSolar: 1650, annualWind: 1300 },
    { name: 'bilbao', lat: 43.263, lon: -2.935, annualSolar: 1100, annualWind: 1500 },
    { name: 'zaragoza', lat: 41.6488, lon: -0.8891, annualSolar: 1550, annualWind: 2200 },
    { name: 'málaga', lat: 36.7213, lon: -4.4214, annualSolar: 1700, annualWind: 1200 },
    { name: 'palma', lat: 39.5696, lon: 2.6502, annualSolar: 1600, annualWind: 1300 },
    { name: 'las_palmas', lat: 28.1235, lon: -15.4363, annualSolar: 1800, annualWind: 2500 },
    { name: 'a_coruña', lat: 43.3623, lon: -8.4115, annualSolar: 1200, annualWind: 1800 }
  ]
};

export const CHART_CONSTANTS = {
  HEIGHT: {
    DEFAULT: 300,
    SMALL: 200,
    LARGE: 400,
    FULL: '100%'
  },
  WIDTH: {
    FULL: '100%'
  },
  COLORS: {
    PRODUCTION: '#10b981', // emerald-500
    CONSUMPTION: '#ff4466',
    BALANCE: '#00ff88',
    INVESTMENT: '#ef4444', // red-500
    PROFIT: '#10b981', // emerald-500
    GRID: 'var(--glass-border)',
    TEXT: 'var(--text-secondary)',
    TOOLTIP_BG: 'var(--bg-elevated)',
    TOOLTIP_TEXT: 'var(--text-primary)',
    VALUE: '#3b82f6', // blue-500
    ROI: '#f59e0b', // amber-500
    INCOME: '#10b981', // emerald-500
    MAINTENANCE: '#ef4444', // red-500
    PRODUCTION_LINE: '#8b5cf6' // violet-500
  },
  RADIUS: {
    PIE: 120
  },
  POSITIONS: {
    CENTER: '50%'
  },
  OPACITY: {
    HIGH: 0.8,
    LOW: 0,
    MEDIUM: 0.5,
    GRID: 0.3
  },
  OFFSETS: {
    GRADIENT_START: '5%',
    GRADIENT_END: '95%',
    LABEL_BOTTOM: -5
  },
  ANGLES: {
    Y_AXIS_LABEL: -90
  },
  STROKE: {
    DASH_3_3: '3 3',
    DASH_5_5: '5 5'
  }
};

export const SYSTEM_CONSTANTS = {
  COOKIE_EXPIRY_DAYS: 365,
  MILLISECONDS_IN_DAY: 86400000 // 24 * 60 * 60 * 1000
};
