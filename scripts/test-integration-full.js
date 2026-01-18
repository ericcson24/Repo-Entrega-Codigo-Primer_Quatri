const axios = require('axios');

const API_URL = 'http://localhost:4000/api/simulate';

const testScenarios = [
    {
        name: "WIND Advanced (High Roughness)",
        payload: {
            project_type: 'wind',
            latitude: 40.4,
            longitude: -3.7,
            capacity_kw: 2000,
            budget: 2500000,
            parameters: {
                hub_height: 100,
                rotor_diameter: 100,
                hellman_exponent: 0.25, // Urban/Rough terrain
                weibull_shape: 2.0,
                weibull_scale: 7.0
            }
        }
    },
    {
        name: "HYDRO Advanced (Eco Flow High)",
        payload: {
            project_type: 'hydro',
            latitude: 42.0,
            longitude: -1.0,
            capacity_kw: 500,
            budget: 1200000,
            parameters: {
                flow_rate_design: 4.0,
                gross_head: 20.0,
                ecological_flow: 2.0, // High restriction
                turbine_efficiency: 0.9,
                penstock_length: 200,
                penstock_diameter: 0.8
            }
        }
    },
    {
        name: "SOLAR Advanced (Tracking)",
        payload: {
            project_type: 'solar',
            latitude: 37.0,
            longitude: -5.0,
            capacity_kw: 100,
            budget: 60000,
            parameters: {
                panel_type: 'monocrystalline',
                orientation: 'tracking', // Should boost production
                tilt: 35, // Required by PVLib even if tracking logic overrides it
                system_loss: 0.1,
                inverter_efficiency: 0.98
            }
        }
    },
    {
        name: "BIOMASS (Wet Wood)",
        payload: {
            project_type: 'biomass',
            latitude: 43.0,
            longitude: -8.0,
            capacity_kw: 1000,
            budget: 3000000,
            parameters: {
                feedstock_type: 'wood_chips', // Required
                moisture_content: 50, // Very wet, should lower efficiency
                calorific_value_dry: 19.0,
                plant_efficiency: 0.22
            }
        }
    }
];

async function runTests() {
    console.log("Iniciando Pruebas de Integración End-to-End...");
    console.log(`Objetivo: ${API_URL}`);
    console.log("------------------------------------------------");

    for (const test of testScenarios) {
        console.log(`\nProbando: ${test.name}`);
        try {
            const start = Date.now();
            const response = await axios.post(API_URL, test.payload);
            const duration = Date.now() - start;

            if (response.status === 200 && response.data.financials) {
                console.log(`EXITO (${duration}ms)`);
                console.log(`   VAN: €${response.data.financials.npv_eur.toLocaleString()}`);
                console.log(`   TIR: ${response.data.financials.irr_percent.toFixed(2)}%`);
                // Check if meta reflects the call
                // console.log(`   Meta:`, response.data.meta);
            } else {
                console.log(`ADVERTENCIA ESTADO RECIBIDO ${response.status} pero formato de datos inválido`);
            }
        } catch (error) {
            console.error(`FALLO`);
            if (error.code === 'ECONNREFUSED') {
                console.error("   Conexión rechazada. ¿Está el Servidor Backend (Puerto 4000) en ejecución?");
            } else if (error.response) {
                console.error(`   Estado: ${error.response.status}`);
                console.error(`   Datos:`, error.response.data);
            } else {
                console.error(`   Error:`, error.message);
            }
        }
    }
    console.log("\n------------------------------------------------");
    console.log("Pruebas Completadas.");
}

runTests();
