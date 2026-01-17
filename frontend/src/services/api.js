import axios from 'axios';

// Correct API base logic based on port 4001 config
const API_BASE_URL = '/api'; 

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
  
  // Future endpoints
  getWeather: async (lat, lon) => {
    // Implementation needed
  }
};
