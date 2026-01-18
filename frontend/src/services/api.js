import axios from 'axios';

// En producción usa la variable de entorno, en local usa el proxy o relativo
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api'; 

export const apiService = {
  simulate: async (data) => {
    try {
      // Datos contienen: { project_type, capacity_kw, latitude, longitude, etc. }
      const response = await axios.post(`${API_BASE_URL}/simulate`, data);
      return response.data;
    } catch (error) {
      console.error("Error API Simulación:", error);
      throw error;
    }
  },
  
  runSimulation: async (data) => {
    return apiService.simulate(data);
  },

  // Endpoints futuros
  getHistory: async (userEmail) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/history?user_email=${userEmail}`);
      return response.data;
    } catch (error) {
      console.error("Error API Historial:", error);
      throw error;
    }
  },

  getWeather: async (lat, lon) => {
      // Usado para potencial solar por ahora
      try {
        const response = await axios.get(`${API_BASE_URL}/solar-potential`, { params: { lat, lon } });
        return response.data; 
      } catch (error) {
        console.warn("Error API Clima:", error);
        return { peak_sun_hours: 1500 };
      }
  },

  getCatalog: async (technology) => {
    try {
        const response = await axios.get(`${API_BASE_URL}/catalog/${technology}`);
        return response.data;
    } catch (error) {
        console.error("Error API Catálogo:", error);
        return [];
    }
  },
};
