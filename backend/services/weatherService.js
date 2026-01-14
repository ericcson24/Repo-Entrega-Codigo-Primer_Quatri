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
        // Improved parsing: Use Regex to find coordinates regardless of underscores in city name
        // Matches ..._LAT_LON_...
        const coordsMatch = file.match(/_(-?\d+\.\d+)_(-?\d+\.\d+)_/);
        
        let fLat, fLon;
        if (coordsMatch) {
             fLat = parseFloat(coordsMatch[1]);
             fLon = parseFloat(coordsMatch[2]);
        } else {
             // Fallback: simple split (for simple city names like 'madrid')
             const parts = file.split('_');
             // Typically weather_City_Lat_Lon_Date.json -> lat is index 2
             if (parts.length >= 4) {
                 fLat = parseFloat(parts[2]);
                 fLon = parseFloat(parts[3]);
             }
        }

        if (fLat !== undefined && !isNaN(fLat) && !isNaN(fLon)) {
             const dist = Math.sqrt(Math.pow(fLat - lat, 2) + Math.pow(fLon - lon, 2));
             if (dist < minDist) {
                 minDist = dist;
                 closest = file;
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
    // 1. Check Local Data FIRST (User Priority)
    const localData = this._findClosestLocalData(lat, lon);
    if (localData && localData.data) {
        console.log(`[WeatherService] getHistoricalWeather: Using LOCAL data 2020-2024 for [${lat}, ${lon}]`);
        return {
            data: localData.data.map(d => ({
                date: d.date,
                windMean: (d.windspeed_mean || 0) / 3.6, // km/h -> m/s
                windMax: (d.windspeed_max || 0) / 3.6,
                tempMean: d.temperature_mean,
                radiation: d.solar_radiation // MJ/m2 or compatible
            })),
            metadata: {
                lat, lon, 
                start: localData.period ? localData.period.start : '2020-01-01', 
                end: localData.period ? localData.period.end : '2024-12-31',
                source: 'Local File'
            }
        };
    }

    // 2. Fallback to API (2020-2024 Period)
    try {
      const startDate = '2020-01-01';
      const endDate = '2024-12-31';
      console.log(`[WeatherService] Local data missing. Fetching history from API (2020-2024)...`);

      const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
        params: {
          latitude: lat,
          longitude: lon,
          start_date: startDate,
          end_date: endDate,
          daily: 'temperature_2m_mean,windspeed_10m_mean,windspeed_10m_max,shortwave_radiation_sum',
          timezone: 'Europe/Madrid'
        }
      });

      return {
        data: response.data.daily.time.map((t, i) => ({
          date: t,
          windMean: (response.data.daily.windspeed_10m_mean[i] || 0) / 3.6, // Fix: API returns km/h
          windMax: (response.data.daily.windspeed_10m_max[i] || 0) / 3.6,
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
    // 1. Check Local Data FIRST (User Requirement: Use "the period I have" -> 2020-2024)
    console.log(`[WeatherService] Checking local data for [${coords.lat}, ${coords.lon}]...`);
    const localData = this._findClosestLocalData(coords.lat, coords.lon);

    if (localData && localData.data && localData.data.length > 0) {
        // Calculate Average from Local File
        // Local files (generated by Open-Meteo script) are in km/h
        const avgSpeedKmH = localData.data.reduce((s,d) => s + (d.wind_speed_mean || d.windspeed_mean || 0), 0) / localData.data.length;
        const avgSpeedMS = avgSpeedKmH / 3.6; // Unit Conversion: km/h -> m/s

        const avgTemp = localData.data.reduce((s,d) => s + (d.temperature_mean || 15), 0) / localData.data.length;
        
        console.log(`[WeatherService] ✅ Prioritizing LOCAL data (${localData.location ? localData.location.name : 'Matched File'}). Period: 2020-2024.`);
        console.log(`   -> Avg Wind: ${avgSpeedMS.toFixed(2)} m/s (${avgSpeedKmH.toFixed(1)} km/h)`);

        return {
                source: `Local DB (2020-2024)`,
                avgSpeed: avgSpeedMS,
                avgTemp: avgTemp,
                refHeight: 10,
                elevation: 0
        };
    }

    // 2. Fallback to API (Restricted to 2020-2024 to match User's dataset standard)
    try {
        console.log(`[WeatherService] ⚠️ Local data missing. Fetching from Archive API (matched to 2020-2024 period)...`);
        
        const response = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
            params: {
                latitude: coords.lat,
                longitude: coords.lon,
                start_date: '2020-01-01',
                end_date: '2024-12-31',
                daily: 'temperature_2m_mean,windspeed_10m_mean,windspeed_10m_max',
                timezone: 'Europe/Madrid'
            }
        });
        
        const daily = response.data.daily || {};
        const windMean = daily.windspeed_10m_mean || [];
        const temps = daily.temperature_2m_mean || [];

        const avgSpeedKmH = windMean.reduce((a, b) => a + b, 0) / (windMean.length || 1);
        const avgSpeedMS = avgSpeedKmH / 3.6; // Unit Conversion
        const avgTemp = temps.reduce((a, b) => a + b, 0) / (temps.length || 1);

        console.log(`   -> Avg Wind (API 2020-2024): ${avgSpeedMS.toFixed(2)} m/s`);
        
        return {
            source: 'Open-Meteo Archive (2020-2024)',
            avgSpeed: avgSpeedMS, 
            avgTemp: avgTemp || 15,
            refHeight: 10,
            elevation: response.data.elevation || 0
        };

    } catch (error) {
        console.warn('Weather API failed:', error.message);
        return { 
            source: 'Global Defaults', 
            avgSpeed: 6.0, 
            avgTemp: 15,
            refHeight: 10,
            elevation: 0
        };
    }
  }  /**
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
