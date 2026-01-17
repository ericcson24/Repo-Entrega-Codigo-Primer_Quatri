const axios = require('axios');
const FinancialService = require('../services/financialService');
const { URLS } = require('../config/constants');
const { pool } = require('../config/db');

class SimulationController {
    
    static async getHistory(req, res) {
        try {
            const { user_email } = req.query;
            if (!user_email) {
                return res.status(400).json({ error: "Email is required" });
            }

            const result = await pool.query(
                'SELECT id, project_type, input_params, results, created_at FROM simulations WHERE user_email = $1 ORDER BY created_at DESC LIMIT 50',
                [user_email]
            );

            res.json(result.rows);
        } catch (error) {
            console.error("Error fetching history:", error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    static async runSimulation(req, res) {
        try {
            const { 
                project_type, 
                latitude, 
                longitude, 
                capacity_kw, 
                budget, 
                parameters,
                financial_params, // { debtRatio, interestRate, loanTerm }
                user_email // NEW: Optional for saving
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
            // Aplanamos 'parameters' para que Python reciba { latitude, hub_height, ... } en la raíz
            const payload = {
                latitude, 
                longitude, 
                capacity_kw, 
                ...parameters, 
                project_type 
            };

            try {
                genResponse = await axios.post(endpoint, payload);
            } catch (aiError) {
                console.error("Error conectando con AI Engine:", aiError.message);
                
                // Si el AI engine devuelve 404 (No data), comunicarlo al cliente limpiamente
                if (aiError.response && aiError.response.status === 404) {
                    return res.status(404).json({ error: "No se encontraron datos meteorológicos para esta ubicación." });
                }
                
                // NEW: Log validation errors from Python
                if (aiError.response && aiError.response.status === 422) {
                     console.error("Validation Error from Python:", JSON.stringify(aiError.response.data, null, 2));
                     console.error("Payload sent:", JSON.stringify(payload, null, 2));
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
            
            // Console log to debug Financial Params reception
            console.log("Controlador: Recibidos params financieros:", JSON.stringify(financial_params));

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
             // Extraer la generación mensual a largo plazo si existe
            const longTermGen = generationData.long_term_monthly_generation_kwh || null;
            const year1Gen = generationData.total_annual_generation_kwh || 0;

            const projection = FinancialService.generateProjection(
                budget, 
                year1Revenue, 
                capacity_kw, 
                project_type, 
                financial_params,
                longTermGen,
                year1Gen
            );

            // 5. Respuesta
            const resultData = {
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
                    initial_equity: projection.financials.initial_equity, // Send calculated equity
                    initial_debt: projection.financials.initial_debt, // Send calculated debt
                    leverage_ratio: projection.financials.leverage_ratio // Use calculated ratio from service
                },
                generation: {
                    annual_kwh: generationData.total_annual_generation_kwh,
                    monthly_kwh: generationData.monthly_generation_kwh,
                    long_term_monthly_kwh: generationData.long_term_monthly_generation_kwh // Return detailed series to frontend
                },
                graphs: {
                    cash_flow: projection.cashFlows,
                    annual_breakdown: projection.annualBreakdown,
                    // Convertimos el objeto mensual a array si es necesario para el frontend, o lo dejamos como dict
                    // El frontend probablemente quiera arrays para Chart.js
                    monthly_generation: generationData.monthly_generation_kwh,
                    hourly_generation: hourlyGen // Send full hourly data for advanced technical analysis
                }
            };

            // 6. Persistencia (Guardar si hay usuario)
            if (user_email) {
                try {
                    await pool.query(
                        'INSERT INTO simulations (user_email, project_type, input_params, results) VALUES ($1, $2, $3, $4)',
                        [
                            user_email, 
                            project_type, 
                            JSON.stringify(req.body), 
                            JSON.stringify(resultData)
                        ]
                    );
                } catch (dbError) {
                    console.error("Error saving simulation:", dbError);
                    // No fallamos la request si falla el guardado, solo logueamos
                }
            }

            res.json(resultData);

        } catch (error) {
            console.error(error);
            // Manejo de errores 500
            res.status(500).json({ error: error.message || "Error Interno de Simulación" });
        }
    }
}

module.exports = SimulationController;
