const axios = require('axios');
const FinancialService = require('../services/financialService');
const { URLS } = require('../config/constants');

class SimulationController {
    
    static async runSimulation(req, res) {
        try {
            const { 
                project_type, 
                latitude, 
                longitude, 
                capacity_kw, 
                budget, 
                parameters,
                financial_params // { debtRatio, interestRate, loanTerm }
            } = req.body;
            const aiUrl = URLS.AI_ENGINE_BASE_URL;

            // Validación básica pendiente de refactorizar a middleware
            if (!project_type || !latitude || !longitude || !capacity_kw || !budget) {
                return res.status(400).json({ error: "Faltan parámetros obligatorios" });
            }

            // 1. Obtener Predicción de Generación del AI Engine
            // Mapeamos el endpoint según tecnología
            const endpoint = `${aiUrl}/predict/${project_type}`;
            
            let genResponse;
            try {
                genResponse = await axios.post(endpoint, {
                    latitude, 
                    longitude, 
                    capacity_kw, 
                    parameters, // Pasamos parámetros avanzados de tech
                    project_type 
                });
            } catch (aiError) {
                console.error("Error conectando con AI Engine:", aiError.message);
                
                // Si el AI engine devuelve 404 (No data), comunicarlo al cliente limpiamente
                if (aiError.response && aiError.response.status === 404) {
                    return res.status(404).json({ error: "No se encontraron datos meteorológicos para esta ubicación." });
                }
                throw aiError;
            }

            const generationData = genResponse.data;
            const hourlyGen = generationData.hourly_generation_kwh; 

            // 2. Obtener Precios de Mercado del AI Engine
            const priceResponse = await axios.post(`${aiUrl}/market/prices`, { 
                latitude, longitude, capacity_kw, project_type 
            });
            const hourlyPrices = priceResponse.data.prices_eur_mwh;

            // 3. Cálculos de Ingresos (Año 1)
            // Validar longitud de series
            if (!hourlyGen || !hourlyPrices || hourlyGen.length !== hourlyPrices.length) {
                // En biomasa, la longitud podría diferir si no se estandariza a 8760, pero asumiremos año estándar
                 // Si no coinciden, logs de advertencia.
                 console.warn(`Longitud de series diferente: Gen ${hourlyGen?.length} - Precios ${hourlyPrices?.length}`);
            }

            let year1Revenue = 0;
            // Usamos la longitud mínima para evitar out of bounds
            const limit = Math.min(hourlyGen.length, hourlyPrices.length);

            for(let i=0; i<limit; i++) {
                // Generación (kWh) / 1000 = MWh. Precio en EUR/MWh.
                year1Revenue += (hourlyGen[i] / 1000.0) * hourlyPrices[i];
            }

            // 4. Proyección Financiera con Servicio Dedicado
            const projection = FinancialService.generateProjection(budget, year1Revenue, capacity_kw, project_type, financial_params);

            // 5. Respuesta
            res.json({
                meta: {
                    project_type,
                    location: { lat: latitude, lon: longitude },
                    capacity_kw,
                    status: "success"
                },
                financials: {
                    npv_eur: projection.financials.npv,
                    irr_percent: projection.financials.irr * 100,
                    payback_years: projection.financials.payback,
                    roi_percent: projection.financials.roi_percent,
                    // Project Specifics included for expert view
                    project_npv_eur: projection.financials.project_npv,
                    project_irr_percent: projection.financials.project_irr * 100,
                    total_investment: budget,
                    leverage_ratio: financial_params?.debtRatio || 0.70
                },
                generation: {
                    annual_kwh: generationData.total_annual_generation_kwh,
                    monthly_kwh: generationData.monthly_generation_kwh
                },
                graphs: {
                    cash_flow: projection.cashFlows,
                    annual_breakdown: projection.annualBreakdown,
                    // Convertimos el objeto mensual a array si es necesario para el frontend, o lo dejamos como dict
                    // El frontend probablemente quiera arrays para Chart.js
                    monthly_generation: generationData.monthly_generation_kwh
                }
            });

        } catch (error) {
            console.error(error);
            // Manejo de errores 500
            res.status(500).json({ error: error.message || "Error Interno de Simulación" });
        }
    }
}

module.exports = SimulationController;
