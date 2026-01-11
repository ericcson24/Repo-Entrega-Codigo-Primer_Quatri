function getRegionCoordinates(region) {
  const coordinates = {
    'Madrid - Centro': { lat: 40.4168, lon: -3.7038 },
    'Barcelona - Cataluña': { lat: 41.3851, lon: 2.1734 },
    'Sevilla - Andalucía': { lat: 37.3891, lon: -5.9845 },
    'Valencia - Comunidad Valenciana': { lat: 39.4699, lon: -0.3763 },
    'Zaragoza - Aragón': { lat: 41.6488, lon: -0.8891 },
    'Bilbao - País Vasco': { lat: 43.2630, lon: -2.9350 },
    'Las Palmas - Canarias': { lat: 28.1235, lon: -15.4363 },
    'Palma - Baleares': { lat: 39.5696, lon: 2.6502 }
  };
  return coordinates[region] || coordinates['Madrid - Centro'];
}

function calculateSolarIrradiation(latitude, weatherCondition) {
  const baseIrradiation = 1600; // kWh/m²/year
  const latitudeFactor = Math.cos((latitude * Math.PI) / 180);
  const weatherFactor = weatherCondition === 'Clear' ? 1.0 : 0.7;
  return Math.round(baseIrradiation * latitudeFactor * weatherFactor);
}

function calculateCapacityFactors(windSpeed, latitude) {
  // Simplified capacity factor calculation
  const solarCF = 0.18; // Typical for Spain
  const windCF = Math.min(0.4, windSpeed / 10); // Rough estimation
  return { solar: solarCF, wind: windCF };
}

module.exports = {
  getRegionCoordinates,
  calculateSolarIrradiation,
  calculateCapacityFactors
};
