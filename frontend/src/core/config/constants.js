export const PHYSICS_CONSTANTS = {
  AIR_DENSITY: 1.225, // kg/m3
  WIND_CP_DEFAULT: 0.35, // Coeficiente de potencia típico
  WIND_ROUGHNESS: 0.14, // Coeficiente de rugosidad Hellmann
  SOLAR_RADIATION_CONVERSION: 0.2777, // Conversión de unidades
  TEMP_LOSS_COEFFICIENT: 0.004, // 0.4% por grado Celsius
  STANDARD_TEMP: 25, // Grados Celsius
  OPTIMAL_TILT: 35,
  OPTIMAL_AZIMUTH: 180,
  TILT_LOSS_FACTOR: 0.0005,
  AZIMUTH_LOSS_FACTOR: 0.00005,
  PERFORMANCE_RATIO_DEFAULT: 0.75,
  WIND_CUT_IN_SPEED: 3, // m/s
  WIND_RATED_SPEED: 12, // m/s
  WIND_CUT_OUT_SPEED: 25, // m/s
  HOURS_IN_YEAR: 8760,
  DAYS_IN_YEAR: 365,
  WIND_DAILY_CAPACITY_FACTOR: 0.35, // Factor de carga diario estimado
  WIND_SEASONALITY_FACTOR: 0.4,
  SOLAR_DEFAULT_EFFICIENCY: 0.20,
};

export const UI_DEFAULTS = {
  SOLAR: {
    DEFAULT_SYSTEM_SIZE: 5.4, // kWp
    DEFAULT_PANEL_POWER: 450, // W
    DEFAULT_PANEL_COUNT: 12,
    DEFAULT_BUDGET: 8000, // €
    DEFAULT_CONSUMPTION: 350, // kWh/mes
    DEFAULT_BATTERY_CAPACITY: 0,
  },
  WIND: {
    DEFAULT_TURBINE_POWER: 5, // kW
    DEFAULT_TURBINE_HEIGHT: 12, // m
    DEFAULT_ROTOR_DIAMETER: 4, // m
    DEFAULT_BUDGET: 12000, // €
    DEFAULT_CONSUMPTION: 350, // kWh/mes
  },
  SIMPLE: {
    DEFAULT_SYSTEM_SIZE: 5, // kWp
    DEFAULT_PANEL_COST: 600, // €/kWp
    DEFAULT_INSTALLATION_COST: 400, // €/kWp
    DEFAULT_ANNUAL_INCREASE: 2.5, // %
  },
  INITIAL_CITY: 'Madrid',
  INITIAL_LAT: 40.4168,
  INITIAL_LON: -3.7038,
  WIND_INITIAL_CITY: 'Zaragoza',
  WIND_INITIAL_LAT: 41.6488,
  WIND_INITIAL_LON: -0.8891,
};

export const CALCULATION_CONSTANTS = {
  W_TO_KW: 1000,
  MWH_TO_KWH: 1000,
  PERCENTAGE_DIVISOR: 100,
  INSTALLATION_COST_FACTOR: 1.25, // 25% extra for installation
  MIN_PRICE_THRESHOLD: 0.01,
  INTERPOLATION_WEIGHT_FACTOR: 1000,
  INTERPOLATION_DISTANCE_OFFSET: 0.01,
  ORIENTATION_LOSS_MIN: 0.5,
  ORIENTATION_LOSS_MAX: 1,
  SEASONALITY_AMPLITUDE: 0.3,
  WIND_CF_SLOPE: 0.08,
  WIND_CF_INTERCEPT: 0.15,
  WIND_CF_MAX: 0.50,
  WIND_REF_HEIGHT: 10,
  MONTHS_IN_YEAR: 12,
};

export const CACHE_CONSTANTS = {
  DEFAULT_EXPIRY: 3600000, // 1 hour
  LONG_EXPIRY: 86400000, // 24 hours
};

export const ECONOMIC_DEFAULTS = {
  INFLATION_RATE: 0.02,
  DEGRADATION_RATE: 0.005,
  DISCOUNT_RATE: 0.04,
  MAINTENANCE_RATE: 0.01,
  INVERTER_REPLACEMENT_COST: 0.15, // % del coste inicial
  INVERTER_REPLACEMENT_YEAR: 10,
  DEFAULT_ELECTRICITY_PRICE: 0.15,
  DEFAULT_SURPLUS_PRICE: 0.05,
  DEFAULT_GRID_PRICE: 0.18,
  DEFAULT_SELL_PRICE: 0.06,
  MARKET_SELL_RATIO: 0.4, // Ratio precio venta / precio compra
  DEFAULT_SELF_CONSUMPTION: 0.4,
  DEFAULT_PROJECT_LIFESPAN: 25,
  DEFAULT_IRR: 0.15,
  MAX_PAYBACK_YEARS: 25,
  CONSUMER_PRICE_TOLLS: 0.10,
  VAT: 1.21
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
