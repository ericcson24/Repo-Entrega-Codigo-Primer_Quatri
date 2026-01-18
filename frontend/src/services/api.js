import axios from 'axios';

// En producción usa la variable de entorno, en local usa el proxy o relativo
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api'; 

export const apiService = {
  simulate: async (data) => {
    try {
      // Data contains: { project_type, capacity_kw, latitude, longitude, etc. }
      const response = await axios.post(`${API_BASE_URL}/simulate`, data);
      return response.data;
    } catch (error) {
      console.error("Simulation API Error:", error);
      throw error;
    }
  },
  
  runSimulation: async (data) => {
    return apiService.simulate(data);
  },

  // Future endpoints
  getHistory: async (userEmail) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/history?user_email=${userEmail}`);
      return response.data;
    } catch (error) {
      console.error("History API Error:", error);
      throw error;
    }
  },

  getWeather: async (lat, lon) => {
      // Used for solar potential now
      try {
        const response = await axios.get(`${API_BASE_URL}/solar-potential`, { params: { lat, lon } });
        return response.data; 
      } catch (error) {
        console.warn("Weather API Error:", error);
        return { peak_sun_hours: 1500 };
      }
  },

  getCatalog: async (technology) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/catalog/${technology}`);
        return response.data;
    } catch (error) {
        console.error("Catalog API Error:", error);
        return [];
    }
  },
};
