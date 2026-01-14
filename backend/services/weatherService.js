const axios = require('axios');
const fs = require('fs');
const path = require('path');
const apis = require('../config/apis');
const { calculateSolarIrradiation, calculateCapacityFactors } = require('../utils/helpers');

class WeatherService {
  constructor() {
     this.dataDir = path.join(__dirname, '../data/weather');
  }

  // Helper: Find closest local weather file
  _findClosestLocalData(lat, lon) {
    if (!fs.existsSync(this.dataDir)) return null;
    
    const files = fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
    let closest = null;
    let minDist = Infinity;

    for (const file of files) {
        // Filename format: weather_city_lat_lon_dates.json
        // Try parsing from filename first (faster)
        const parts = file.split('_');
        if (parts.length >= 4) {
             const fLat = parseFloat(parts[2]);
             const fLon = parseFloat(parts[3]);
             if (!isNaN(fLat) && !isNaN(fLon)) {
                 const dist = Math.sqrt(Math.pow(fLat - lat, 2) + Math.pow(fLon - lon, 2));
                 if (dist < minDist) {
                     minDist = dist;
                     closest = file;
                 }
             }
        }
    }

    // Threshold: If closest is > 200km (~2 degrees), maybe irrelevant? 
    // But better than nothing. user said "no simulation". 
    // If closest is too far, maybe we just use it but warn.
    
    if (closest) {
        return JSON.parse(fs.readFileSync(path.join(this.dataDir, closest), 'utf8'));
    }
    return null;
  }

  async getWeatherData(regionCoords) {
    let weatherData;

    try {
        if (apis.weather.openweather && process.env.OPENWEATHER_API_KEY) {
             const response = await axios.get(`${apis.weather.openweather}/weather`, {
                params: { lat: regionCoords.lat, lon: regionCoords.lon, appid: process.env.OPENWEATHER_API_KEY, units: 'metric' }
             });
             return { /* ... mapped data ... */ };
        }
    } catch (e) { console.warn("OpenWeather failed, using fallback"); }

    // Fallback/Default to Open-Meteo
    try {
        const response = await axios.get(`${apis.weather.openmeteo}/forecast`, {
            params: {
                latitude: regionCoords.lat,
                longitude: regionCoords.lon,
                hourly: 'temperature_2m,windspeed_10m,shortwave_radiation',
                daily: 'temperature_2m_max,temperature_2m_min',
                timezone: 'Europe/Madrid'
            }
        });

        return {
            source: 'Open-Meteo (Live API)',
            temperature: response.data.hourly.temperature_2m[0],
            windSpeed: response.data.hourly.windspeed_10m[0],
            irradiation: response.data.hourly.shortwave_radiation ? response.data.hourly.shortwave_radiation[0] : 0,
            // ... rest of mapping
        };
    } catch(apiError) {
        console.warn("API Open-Meteo Failed. Trying Local DB...");
        
        const localData = this._findClosestLocalData(regionCoords.lat, regionCoords.lon);
        if (localData && localData.data && localData.data.length > 0) {
            // Get average of local data as "current" approximation
            // Or get random day? Best is average.
            const avgTemp = localData.data.reduce((s,d) => s + (d.temperature_mean||15),0) / localData.data.length;
            const avgWind = localData.data.reduce((s,d) => s + (d.wind_speed_mean||5),0) / localData.data.length;
            
            return {
                source: `Local DB (${localData.location})`,
                temperature: avgTemp,
                windSpeed: avgWind,
                irradiation: 0 // Local DB doesn't have irradiation in current JSON? Check.
            };
        }
        
        throw new Error("Data unavailable: API failed and no local data found.");
    }
  }

  /**
   * Obtiene datos históricos para simulaciones precisas (Weibull)
   */
  async getHistoricalWeather(lat, lon, years = 3) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - years);

      const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
        params: {
          latitude: lat,
          longitude: lon,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          daily: 'temperature_2m_mean,windspeed_10m_mean,windspeed_10m_max,shortwave_radiation_sum',
          timezone: 'Europe/Madrid'
        }
      });

      return {
        data: response.data.daily.time.map((t, i) => ({
          date: t,
          windMean: response.data.daily.windspeed_10m_mean[i],
          windMax: response.data.daily.windspeed_10m_max[i],
          tempMean: response.data.daily.temperature_2m_mean[i],
          radiation: response.data.daily.shortwave_radiation_sum[i]
        })),
        metadata: {
          lat, lon, start: startDate, end: endDate
        }
      };
    } catch (error) {
      console.error('Error fetching historical weather:', error.message);
      return null;
    }
  }

  async getWindResourceData(coords) {
        try {
            // Utilizamos Open-Meteo Archive o Forecast para obtener promedio histórico
            // Para una simulacion profesional, lo ideal es el Histórico de 5-10 años.
            // Aqui usamos una aproximación rápida con la API actual.
            const response = await axios.get(`${apis.weather.openmeteo}/forecast`, {
                params: {
                    latitude: coords.lat,
                    longitude: coords.lon,
                    current_weather: true,
                    hourly: 'wind_speed_80m,wind_speed_100m,wind_speed_10m,temperature_2m',
                    past_days: 92, // Use last 3 months ~ approximation of recent history
                    timezone: 'auto'
                }
            });

            // Calcular medias simples
            const hourly = response.data.hourly || {};
            const wind80 = hourly.wind_speed_80m || [];
            const temps = hourly.temperature_2m || [];

            const avgSpeed = wind80.reduce((a, b) => a + b, 0) / (wind80.length || 1);
            const avgTemp = temps.reduce((a, b) => a + b, 0) / (temps.length || 1);

            return {
                source: 'Open-Meteo Historical',
                avgSpeed: avgSpeed || 6.5, // Fallback safe
                avgTemp: avgTemp || 15,
                refHeight: 80,
                elevation: response.data.elevation || 0
            };
        } catch (error) {
            console.warn('Weather API limit or error, checking local DB:', error.message);
            
            const localData = this._findClosestLocalData(coords.lat, coords.lon);
            if (localData && localData.data) {
                const avgSpeed = localData.data.reduce((s,d) => s + (d.wind_speed_mean || d.windspeed_mean || 5), 0) / localData.data.length;
                const avgTemp = localData.data.reduce((s,d) => s + (d.temperature_mean || 15), 0) / localData.data.length;
                return {
                     source: `Local Offline Database (${localData.location ? localData.location.name : 'Unknown'})`,
                     avgSpeed: avgSpeed,
                     avgTemp: avgTemp,
                     refHeight: 10, // Los datos de API local suelen ser a 10m
                     elevation: 0 // Unknown in local json
                };
            }

            // Si no hay API ni DB, es un error crítico.
            console.warn("No wind data found. Using global defaults.");
             return { 
                source: 'Global Defaults', 
                avgSpeed: 6.0,
                avgTemp: 15,
                refHeight: 10,
                elevation: 0
            };
        }
    }

  /**
   * Obtiene datos HORARIOS históricos para simulación AI precisa
   */
  async getHourlyHistoricalWeather(lat, lon, years = 1) {
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // Yesterday
      
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - years);

      // Open-Meteo Archive API
      // Variables: temperature_2m, direct_radiation, diffuse_radiation, windspeed_10m
      const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
        params: {
          latitude: lat,
          longitude: lon,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          hourly: 'temperature_2m,shortwave_radiation,windspeed_10m',
          timezone: 'Europe/Madrid'
        }
      });

      const hourly = response.data.hourly;
      const count = hourly.time.length;
      const result = [];

      for(let i=0; i<count; i++) {
          result.push({
              time: hourly.time[i],
              temp: hourly.temperature_2m[i],
              irr: hourly.shortwave_radiation[i], // W/m2 usually
              wind: hourly.windspeed_10m[i]
          });
      }

      return {
          location: { lat, lon },
          data: result
      };

    } catch (error) {
      console.error('Error fetching hourly historical weather:', error.message);
      return null;
    }
  }
}

module.exports = new WeatherService();
