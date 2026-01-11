module.exports = {
  MARKET: {
    DEFAULT_PRICE: 120, // €/MWh (Precio mayorista medio realista 2024-25)
    DEFAULT_RENEWABLE_SHARE: 0.60,
    DEFAULT_CO2_INTENSITY: 140,
    DEFAULT_DEMAND: 30000,
    MARKET_TYPE: 'Iberian',
    // Precios Consumidor Final (con peajes e impuestos ~21% IVA + IEE)
    CONSUMER_PRICE: 0.22, // €/kWh (Tarifa regulada/libre media)
    SELL_BACK_PRICE: 0.08, // €/kWh (Excedentes)
    ANNUAL_INCREASE: 3, // Inflación energética %
    DISCOUNT_RATE: 4, // Tasa de descuento financiero %
    MIN_PRICE: 0.05,
    MAX_PRICE: 0.45
  },
  SOLAR: {
    DEFAULT_IRRADIATION: 1600,
    DEFAULT_CAPACITY_FACTOR: 0.18,
    OPTIMAL_ANGLE: 35,
    OPTIMAL_ASPECT: 0,
    SYSTEM_LOSS: 14,
    EFFICIENCY: 0.82, // PR más realista para sistemas modernos (0.75 era muy conservador)
    TEMP_COEFFICIENT: 0.0035, // Paneles modernos
    CLOUD_FACTOR: 0.7,
    STANDARD_TEMP: 25,
    DEGRADATION_RATE: 0.5,
    MAINTENANCE_COST: 50, // €/año (Limpieza + Seguros simples residencial)
    CABLE_LOSSES: 1,
    INVERTER_EFFICIENCY: 98,
    MISMATCH_LOSSES: 1,
    DIRT_LOSSES: 2,
    TEMP_COEFFICIENT_PMAX: -0.35,
    DEFAULT_PANEL_PRICE: 180, // Bajada de precios 2024
    DEFAULT_INVERTER_PRICE: 1000,
    DEFAULT_PANEL_AREA: 2,
    DEFAULT_INSTALLATION_COST_KW: 1100, // Llave en mano (~1.1€/Wp)
    DEFAULT_HOME_PANEL_COST_KW: 900,
    DEFAULT_HOME_INSTALLATION_COST_KW: 800,
    DEFAULT_ALTITUDE: 650,
    DEFAULT_AREA: 40,
    DEFAULT_PANELS: 10,
    DEFAULT_INVERTERS: 1,
    DEFAULT_BATTERY_CAPACITY: 5,
    GRID_VOLTAGE: 230,
    MAX_POWER_CONTRACT: 9.2,
    DEFAULT_CONSUMPTION: 4000, // kWh anuales hogar medio
    DEFAULT_BUDGET: 8000,
    DEFAULT_SYSTEM_SIZE: 4.5
  },
  WIND: {
    CUT_IN_SPEED: 3,
    RATED_SPEED: 12,
    CUT_OUT_SPEED: 25,
    RATED_POWER: 2500,
    AVAILABILITY: 97,
    ARRAY_LOSSES: 5,
    ELECTRICAL_LOSSES: 3,
    ENVIRONMENTAL_LOSSES: 2,
    CURTAILMENT: 1,
    OM_COST_FIXED: 50000,
    OM_COST_VARIABLE: 0.01,
    INSURANCE_COST: 15000,
    LAND_LEASE_COST: 5000,
    ELECTRICITY_PRICE: 0.08,
    SUBSIDY_PRICE: 0.02,
    CAPACITY_PAYMENT: 10000,
    LIFESPAN: 20,
    DEGRADATION_RATE: 1.6,
    DISCOUNT_RATE: 6,
    INFLATION_RATE: 2,
    WIND_VARIABILITY: 10,
    PRICE_VOLATILITY: 15,
    DEFAULT_ALTITUDE: 650,
    DEFAULT_ROUGHNESS: 1.5,
    DEFAULT_HUB_HEIGHT: 80,
    DEFAULT_ROTOR_DIAMETER: 90,
    DEFAULT_WIND_SPEED: 7.5,
    WIND_SHEAR_EXPONENT: 0.14,
    WEIBULL_K: 2.0,
    TURBULENCE_INTENSITY: 15,
    AIR_DENSITY: 1.225,
    DEFAULT_BUDGET: 3000000,
    DEFAULT_TURBINE_COST: 1200000,
    DEFAULT_TOWER_COST: 300000,
    DEFAULT_FOUNDATION_COST: 200000,
    DEFAULT_INSTALLATION_COST: 150000,
    DEFAULT_ELECTRICAL_COST: 100000,
    DEFAULT_ENGINEERING_COST: 80000
  },
  WEATHER: {
    DEFAULT_TEMP: 20,
    DEFAULT_WIND_SPEED: 5,
    DEFAULT_HUMIDITY: 50
  },
  CITIES: [
    { name: 'Madrid', province: 'Madrid', lat: 40.4168, lon: -3.7038 },
    { name: 'Barcelona', province: 'Barcelona', lat: 41.3851, lon: 2.1734 },
    { name: 'Sevilla', province: 'Sevilla', lat: 37.3891, lon: -5.9845 },
    { name: 'Valencia', province: 'Valencia', lat: 39.4699, lon: -0.3763 },
    { name: 'A Coruña', province: 'A Coruña', lat: 43.3623, lon: -8.4115 },
    { name: 'Zaragoza', province: 'Zaragoza', lat: 41.6488, lon: -0.8891 },
    { name: 'Málaga', province: 'Málaga', lat: 36.7213, lon: -4.4214 },
    { name: 'Bilbao', province: 'Vizcaya', lat: 43.2630, lon: -2.9350 },
    { name: 'Las Palmas', province: 'Las Palmas', lat: 28.1235, lon: -15.4363 },
    { name: 'Palma', province: 'Islas Baleares', lat: 39.5696, lon: 2.6502 }
  ]
};
