// Constantes Financieras y Económicas Globales
// NOTA: Estos valores deben ser revisados periódicamente.

module.exports = {
    FINANCIAL: {
        // Tasa de descuento (Weighted Average Cost of Capital)
        WACC: parseFloat(process.env.FINANCIAL_WACC || 0.05),
        
        // Parámetros de Deuda por Defecto (Project Finance)
        DEFAULT_DEBT_RATIO: parseFloat(process.env.DEFAULT_DEBT_RATIO || 0.70),
        DEFAULT_INTEREST_RATE: parseFloat(process.env.DEFAULT_INTEREST_RATE || 0.045),
        DEFAULT_LOAN_TERM: parseInt(process.env.DEFAULT_LOAN_TERM || 15),

        // Tasa de inflación general anual estimada
        INFLATION_RATE: parseFloat(process.env.INFLATION_RATE || 0.02),
        
        // Tasa de inflación específica para precios de energía
        ENERGY_INFLATION_RATE: parseFloat(process.env.ENERGY_INFLATION_RATE || 0.015),
        
        // Impuesto de Sociedades (Corporate Tax Rate) - Ejemplo España
        TAX_RATE: parseFloat(process.env.TAX_RATE || 0.25),
        
        // Años de simulación por defecto
        SIMULATION_YEARS: parseInt(process.env.SIMULATION_YEARS || 25),
        
        // Coste de Operación y Mantenimiento (O&M) aproximado por kW instalado (Anual)
        OM_COST_PER_KW_SOLAR: parseFloat(process.env.OM_COST_SOLAR || 15), 
        OM_COST_PER_KW_WIND: parseFloat(process.env.OM_COST_WIND || 25),  
        OM_COST_PER_KW_HYDRO: parseFloat(process.env.OM_COST_HYDRO || 70), 
        OM_COST_PER_KW_BIOMASS: parseFloat(process.env.OM_COST_BIOMASS || 40)
    },
    
    TECHNICAL: {
        // Degradación anual de eficiencia de los paneles solares
        DEGRADATION_RATE_SOLAR: parseFloat(process.env.DEG_SOLAR || 0.005),
        
        // Degradación mecánica de turbinas eólicas
        DEGRADATION_RATE_WIND: parseFloat(process.env.DEG_WIND || 0.01)
    },

    URLS: {
        PHYSICS_ENGINE_BASE_URL: process.env.PHYSICS_ENGINE_URL || 'http://localhost:8000'
    }
};
