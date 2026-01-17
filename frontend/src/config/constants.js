export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Professional Defaults (Project Finance)
export const SIMULATION_DEFAULTS = {
    YEARS: 25,
    PROJECT_TYPES: [
        { value: 'solar', label: 'Solar Fotovoltaica' },
        { value: 'wind', label: 'Energía Eólica' },
        { value: 'hydro', label: 'Mini-Hidráulica' },
        { value: 'biomass', label: 'Biomasa' }
    ],
    // Default Financial Params exposed to UI
    FINANCIAL: {
        DEBT_RATIO: 0.70, // 70% Loan
        INTEREST_RATE: 0.045, // 4.5%
        LOAN_TERM: 15
    }
};

export const CHART_COLORS = {
    revenue: '#10B981', // Emerald 500
    cost: '#EF4444',    // Red 500
    cashFlow: '#3B82F6' // Blue 500
};
