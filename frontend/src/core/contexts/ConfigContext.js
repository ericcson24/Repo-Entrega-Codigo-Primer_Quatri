import React, { createContext, useContext, useState, useEffect } from 'react';
import dynamicAPIService from '../services/dynamicAPIService';

const ConfigContext = createContext();

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(`${dynamicAPIService.backendURL}/api/config`);
        if (!response.ok) throw new Error('Failed to fetch configuration');
        const data = await response.json();
        
        // Transform backend config to frontend format
        const formattedConfig = {
          MARKET: data.market,
          PHYSICS: {
            SOLAR: data.solar,
            WIND: data.wind,
            WEATHER: data.weather
          },
          CITIES: data.cities
        };
        
        setConfig(formattedConfig);
      } catch (err) {
        console.error('Error loading config:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  // Default fallback values if API fails (to prevent crash, but user requested API only)
  // We will return null if loading to force wait
  
  return (
    <ConfigContext.Provider value={{ config, loading, error }}>
      {children}
    </ConfigContext.Provider>
  );
};
