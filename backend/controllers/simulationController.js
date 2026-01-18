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

            // Fallback for memory-only mode if DB is down
            try {
                const result = await pool.query(
                    'SELECT id, project_type, input_params, results, created_at FROM simulations WHERE user_email = $1 ORDER BY created_at DESC LIMIT 50',
                    [user_email]
                );
                res.json(result.rows);
            } catch (dbErr) {
                console.warn("Database error in getHistory:", dbErr.message);
                res.json([]); // Return empty history gracefully
            }
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
            // Structure payload strictly for Python Pydantic Model
            const payload = {
                project_type,
                latitude, 
                longitude, 
                capacity_kw, 
                parameters,      // Pass as dictionary
                financial_params // Pass as dictionary
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

            // --- NORMALIZATION: Unified Keys across AI Engine versions ---
            const annualGen = generationData.total_annual_generation_kwh || generationData.annual_generation_kwh || 0;
            let monthlyGen = generationData.monthly_generation_kwh || generationData.monthly_generation || [];
            if (!Array.isArray(monthlyGen) && typeof monthlyGen === 'object') {
                monthlyGen = Object.values(monthlyGen);
            }

            // Long Term Gen: Synthesize if missing (AI Engine mismatch)
            let longTermGen = generationData.long_term_monthly_generation_kwh || null;
            if (!longTermGen && monthlyGen.length > 0) {
                 const degradation = 0.005; 
                 longTermGen = [];

                 // Determine duration - Use financial params or Default 25
                 const projectYears = (financial_params && financial_params.project_lifetime) 
                    ? parseInt(financial_params.project_lifetime) 
                    : 25;

                 // Use 12 months data or average
                 const baseMonths = (monthlyGen.length === 12) ? monthlyGen : Array(12).fill(annualGen / 12);
                 for(let y=0; y<projectYears; y++) { // Project years dynamic
                     const factor = Math.pow(1 - degradation, y);
                     longTermGen.push(...baseMonths.map(m => m * factor));
                 }
            }

            // 2. Obtener Precios de Mercado del AI Engine (Solo si no viene impuesto por usuario)
            // Check if user set a fixed price (e.g. 0.22 €/kWh)
            let userPrice = null;
            if (financial_params) {
                 if (financial_params.electricity_price) userPrice = parseFloat(financial_params.electricity_price);
                 else if (financial_params.energy_price) userPrice = parseFloat(financial_params.energy_price);
            }
            
            // Si el usuario define un precio, lo usamos para el Año 1 (y FinancialService lo extrapola)
            // Si no, pedimos curva horaria al AI Engine.
            
            let hourlyPrices = [];
            let year1Revenue = 0;

            if (userPrice !== null && userPrice > 0) {
                 console.log(`[Controller] Using User Defined Energy Price: ${userPrice} €/kWh`);
                 year1Revenue = annualGen * userPrice;
                 // Mock hourly prices for completeness if needed? 
                 // FinancialService doesn't need them if we pass the Revenue.
            } else {
                // Determine if we should maintain a specific market price level
                let initialPrice = undefined;
                if (financial_params && financial_params.initial_electricity_price) {
                     initialPrice = parseFloat(financial_params.initial_electricity_price);
                }

                const priceResponse = await axios.post(`${aiUrl}/market/prices`, { 
                    latitude, longitude, capacity_kw, project_type,
                    initial_price: initialPrice
                });
                hourlyPrices = priceResponse.data.prices_eur_mwh;
                
                // 3. Cálculos de Ingresos con precios de mercado horaria
                if (hourlyGen && hourlyPrices && hourlyGen.length > 0) {
                    const limit = Math.min(hourlyGen.length, hourlyPrices.length);
                    for(let i=0; i<limit; i++) {
                        year1Revenue += (hourlyGen[i] / 1000.0) * hourlyPrices[i]; // kWh/1000 * €/MWh = €
                    }
                } else {
                     // Fallback revenue estimation (approx 50 €/MWh)
                     year1Revenue = (annualGen / 1000.0) * 50;
                }
            }

            // Console log to debug Financial Params reception
            console.log("Controlador: Recibidos params financieros:", JSON.stringify(financial_params));
            console.log(`Controlador: Year 1 Revenue Calculated: ${year1Revenue} €`);

            // 4. Proyección Financiera con Servicio Dedicado
            // IMPORTANTE: Pasamos 'energy_price' explícitamente en financial_params si lo calculamos aquí por otro medio (fallback 50)?
            // No, FinancialService ya lo manejará si se lo pasamos.
            
            const projection = FinancialService.generateProjection(
                budget, 
                year1Revenue, 
                capacity_kw, 
                project_type, 
                financial_params,
                longTermGen,
                annualGen
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
                    total_investment: projection.financials.initial_investment, // Corrected key from Service
                    initial_equity: projection.financials.initial_equity, 
                    initial_debt: projection.financials.initial_debt, 
                    leverage_ratio: projection.financials.leverage_ratio
                },
                generation: {
                    annual_kwh: annualGen,
                    monthly_kwh: monthlyGen, // Expected by some frontend components?
                    long_term_monthly_kwh: longTermGen,
                    // Specific Yield & CF
                    specific_yield: (capacity_kw > 0) ? annualGen / capacity_kw : 0,
                    capacity_factor: (capacity_kw > 0) ? (annualGen / (capacity_kw * 8760)) * 100 : 0
                },
                graphs: {
                    cash_flow: projection.cashFlows,
                    annual_breakdown: projection.annualBreakdown,
                    monthly_generation: monthlyGen, // Corrected for ResultsDashboard logic
                    hourly_generation: hourlyGen // Send full hourly data
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
                    console.error("Error saving simulation (continuing without save):", dbError.message);
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
