const axios = require('axios');
const FinancialService = require('../services/financialService');
const physicsService = require('../services/physicsService');
const { URLS } = require('../config/constants');
const { pool } = require('../config/db');

class SimulationController {
    
    // Obtiene el potencial solar de una ubicación
    static async getSolarPotential(req, res) {
        try {
            const { lat, lon } = req.query;
            if (!lat || !lon) {
                return res.status(400).json({ error: "Faltan parámetros de latitud/longitud" });
            }
            
            const data = await physicsService.getSolarPotential(parseFloat(lat), parseFloat(lon));
            res.json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Error al obtener el potencial solar" });
        }
    }

    // Obtiene el historial de simulaciones de un usuario
    static async getHistory(req, res) {
        try {
            const { user_email } = req.query;
            if (!user_email) {
                return res.status(400).json({ error: "El correo electrónico es obligatorio" });
            }

            // Intentamos obtener datos de la base de datos
            try {
                const result = await pool.query(
                    'SELECT id, project_type, input_params, results, created_at FROM simulations WHERE user_email = $1 ORDER BY created_at DESC LIMIT 50',
                    [user_email]
                );
                res.json(result.rows);
            } catch (dbErr) {
                console.warn("Advertencia de base de datos en getHistory:", dbErr.message);
                res.json([]);
            }
        } catch (error) {
            console.error("Error obteniendo historial:", error);
            res.status(500).json({ error: "Error Interno del Servidor" });
        }
    }

    // Ejecuta una simulación completa de proyecto renovable
    static async runSimulation(req, res) {
        try {
            const { 
                project_type, 
                latitude, 
                longitude, 
                capacity_kw, 
                budget, 
                parameters,
                financial_params,
                user_email
            } = req.body;
            const physicsUrl = URLS.PHYSICS_ENGINE_BASE_URL;

            // Validamos que vengan todos los parámetros necesarios
            if (!project_type || !latitude || !longitude || !capacity_kw || !budget) {
                return res.status(400).json({ error: "Faltan parámetros obligatorios" });
            }

            // 1. Pedimos al motor de física que calcule la generación de energía
            const endpoint = `${physicsUrl}/predict/${project_type}`;

            let genResponse;
            const payload = {
                project_type,
                latitude, 
                longitude, 
                capacity_kw, 
                parameters,
                financial_params
            };

            try {
                const MAX_RETRIES = 5;
                const RETRY_DELAY = 1000;

                // Intentamos conectar con el motor IA hasta 5 veces
                for (let i = 0; i < MAX_RETRIES; i++) {
                    try {
                        genResponse = await axios.post(endpoint, payload);
                        break;
                    } catch (err) {
                        const isConnRefused = err.code === 'ECONNREFUSED' || (err.response && err.response.status === 503);
                        if (isConnRefused && i < MAX_RETRIES - 1) {
                            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
                        } else {
                            throw err;
                        }
                    }
                }
            } catch (aiError) {
                console.error("Error conectando con Motor de Estimación:", aiError.message);
                
                // Si no hay datos meteorológicos, avisamos claramente
                if (aiError.response && aiError.response.status === 404) {
                    return res.status(404).json({ error: "No se encontraron datos meteorológicos para esta ubicación." });
                }
                
                // Si hay errores de validación, los mostramos
                if (aiError.response && aiError.response.status === 422) {
                     console.error("Error de Validación desde Python:", JSON.stringify(aiError.response.data, null, 2));
                     console.error("Payload enviado:", JSON.stringify(payload, null, 2));
                }

                throw aiError;
            }

            // Procesamos los datos de generación que nos devuelve el motor de cálculo
            const generationData = genResponse.data;
            const hourlyGen = generationData.hourly_generation_kwh;

            // Normalizamos los datos (diferentes versiones del motor usan nombres distintos)
            const annualGen = generationData.total_annual_generation_kwh || generationData.annual_generation_kwh || 0;
            let monthlyGen = generationData.monthly_generation_kwh || generationData.monthly_generation || [];
            if (!Array.isArray(monthlyGen) && typeof monthlyGen === 'object') {
                monthlyGen = Object.values(monthlyGen);
            }

            // Generamos proyección a largo plazo si no viene del motor IA
            let longTermGen = generationData.long_term_monthly_generation_kwh || null;
            if (!longTermGen && monthlyGen.length > 0) {
                 const degradation = 0.005; 
                 longTermGen = [];

                 // Usamos la duración del proyecto configurada o 25 años por defecto
                 const projectYears = (financial_params && financial_params.project_lifetime) 
                    ? parseInt(financial_params.project_lifetime) 
                    : 25;

                 // Usamos los 12 meses reales o un promedio
                 const baseMonths = (monthlyGen.length === 12) ? monthlyGen : Array(12).fill(annualGen / 12);
                 for(let y=0; y<projectYears; y++) {
                     const factor = Math.pow(1 - degradation, y);
                     longTermGen.push(...baseMonths.map(m => m * factor));
                 }
            }

            // 2. Obtenemos los precios de mercado eléctrico
            // Primero miramos si el usuario especificó un precio fijo
            let userPrice = null;
            if (financial_params) {
                 if (financial_params.electricity_price) userPrice = parseFloat(financial_params.electricity_price);
                 else if (financial_params.energy_price) userPrice = parseFloat(financial_params.energy_price);
            }
            
            // Calculamos los ingresos del primer año
            let hourlyPrices = [];
            let year1Revenue = 0;

            if (userPrice !== null && userPrice > 0) {
                 // El usuario puso un precio fijo
                 year1Revenue = annualGen * userPrice;
            } else {
                // Pedimos los precios de mercado al motor de cálculo
                let initialPrice = undefined;
                if (financial_params && financial_params.initial_electricity_price) {
                     initialPrice = parseFloat(financial_params.initial_electricity_price);
                }

                const priceResponse = await axios.post(`${physicsUrl}/market/prices`, { 
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

            // 3. Generamos la proyección financiera completa
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
                    leverage_ratio: projection.financials.leverage_ratio,
                    total_nominal_profit: projection.financials.total_nominal_profit,
                    total_interest_paid: projection.financials.total_interest_paid
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
