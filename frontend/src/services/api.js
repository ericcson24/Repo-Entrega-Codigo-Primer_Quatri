import axios from 'axios';

// URL base de nuestra API backend
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api'; 

export const apiService = {
  // Ejecuta una simulación de proyecto renovable
  simulate: async (data) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/simulate`, data);
      return response.data;
    } catch (error) {
      console.error("Error API Simulación:", error);
      throw error;
    }
  },
  
  // Alias de simulate para compatibilidad
  runSimulation: async (data) => {
    return apiService.simulate(data);
  },

  // Obtiene el historial de simulaciones de un usuario
  getHistory: async (userEmail) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/history?user_email=${userEmail}`);
      return response.data;
    } catch (error) {
      console.error("Error API Historial:", error);
      throw error;
    }
  },

  // Obtiene datos meteorológicos y potencial solar
  getWeather: async (lat, lon) => {
      try {
        const response = await axios.get(`${API_BASE_URL}/solar-potential`, { params: { lat, lon } });
        return response.data; 
      } catch (error) {
        console.warn("Error API Clima:", error);
        // Valor por defecto si falla
        return { peak_sun_hours: 1500 };
      }
  },

  // Obtiene el catálogo de componentes (paneles, turbinas, etc.)
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
