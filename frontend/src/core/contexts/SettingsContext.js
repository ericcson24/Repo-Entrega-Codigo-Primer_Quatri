import React, { createContext, useContext, useState, useEffect } from 'react';
import * as CONSTANTS from '../config/constants';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  // Initialize state with a deep copy of constants to avoid mutation issues
  const [settings, setSettings] = useState(() => {
    return {
      PHYSICS_CONSTANTS: { ...CONSTANTS.PHYSICS_CONSTANTS },
      ECONOMIC_DEFAULTS: { ...CONSTANTS.ECONOMIC_DEFAULTS },
      CALCULATION_CONSTANTS: { ...CONSTANTS.CALCULATION_CONSTANTS },
      UI_DEFAULTS: { ...CONSTANTS.UI_DEFAULTS },
      CHART_CONSTANTS: { ...CONSTANTS.CHART_CONSTANTS }
    };
  });

  const updateSetting = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: parseFloat(value) || value // Handle numbers correctly
      }
    }));
  };

  const resetSettings = () => {
    setSettings({
      PHYSICS_CONSTANTS: { ...CONSTANTS.PHYSICS_CONSTANTS },
      ECONOMIC_DEFAULTS: { ...CONSTANTS.ECONOMIC_DEFAULTS },
      CALCULATION_CONSTANTS: { ...CONSTANTS.CALCULATION_CONSTANTS },
      UI_DEFAULTS: { ...CONSTANTS.UI_DEFAULTS },
      CHART_CONSTANTS: { ...CONSTANTS.CHART_CONSTANTS }
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
