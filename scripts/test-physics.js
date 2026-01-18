/**
 * Suite de Pruebas para Validación Física del Motor IA
 * Uso: node scripts/test-physics.js
 * (Asegúrate de que el servidor python esté corriendo en el puerto 8000)
 */
const axios = require('axios'); // Asegúrate de tener axios instalado: npm install axios

const API_URL = 'http://localhost:8000';

async function runTest(name, endpoint, payload) {
    console.log(`\n========================================`);
    console.log(`PRUEBA: ${name.toUpperCase()}`);
    console.log(`========================================`);
    console.log(`Enviando Payload:`, JSON.stringify(payload, null, 2));

    try {
        const startTime = Date.now();
        const response = await axios.post(`${API_URL}${endpoint}`, payload);
        const duration = Date.now() - startTime;

        console.log(`EXITO (${duration}ms)`);
        console.log(`Generación Anual: ${Math.round(response.data.annual_generation_kwh).toLocaleString()} kWh`);
        
        if (response.data.debug_info) {
            console.log(`\nLOGS DE DEPURACION FISICA (Paso a Paso):`);
            response.data.debug_info.logs.forEach(log => {
                console.log(`   > ${log}`);
            });

            console.log(`\nMETRICAS DE DATOS INTERNOS:`);
            console.log(JSON.stringify(response.data.debug_info.data, null, 2));
        }

    } catch (error) {
        console.error(`FALLO`);
        if (error.code === 'ECONNREFUSED') {
            console.error(`   No se pudo conectar al Motor IA en ${API_URL}. ¿Está corriendo?`);
            console.error(`   Ejecutar: cd backend/services/ai_engine && ../../../ai_env/bin/python main.py`);
        } else {
            console.error(`   Error: ${error.message}`);
            if (error.response) console.error(`   Respuesta del Servidor:`, error.response.data);
        }
    }
}

async function main() {
    // 1. PRUEBA SOLAR (Madrid, Inclinado, 5 años de antigüedad)
    await runTest('Solar FV (Física Avanzada)', '/predict/solar', {
        latitude: 40.4168,
        longitude: -3.7038,
        capacity_kw: 100,
        tilt: 35,
        azimuth: 180,
        years_operation: 5,
        soiling_loss: 0.03, // 3%
        debug: true
    });

    // 2. PRUEBA EÓLICA (Galicia, Torres Altas)
    await runTest('Turbina Eólica (Extrapolación de Buje)', '/predict/wind', {
        latitude: 43.36,
        longitude: -8.41,
        capacity_kw: 2000,
        hub_height: 120, // Torre muy alta
        rotor_diameter: 100,
        hellman_exponent: 0.16, // Terreno rugoso
        debug: true
    });

    // 3. PRUEBA HIDRO (Río Pequeño)
    await runTest('Hidráulica (Duración de Caudal)', '/predict/hydro', {
        latitude: 42.0,
        longitude: -1.0,
        capacity_kw: 500,
        flow_rate_design: 5.0,
        gross_head: 25.0,
        penstock_length: 100,
        penstock_diameter: 1.2,
        debug: true
    });
    
    // 4. PRUEBA BIOMASA (Pellets)
    await runTest('Biomasa (Ciclo Rankine)', '/predict/biomass', {
        latitude: 39.0,
        longitude: -3.0,
        capacity_kw: 1000,
        feedstock_type: 'pellets',
        moisture_content: 8.0, // Seco
        debug: true
    });
}

main();
