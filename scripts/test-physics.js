/**
 * Test Suite for AI Engine Physics Validation
 * Usage: node scripts/test-physics.js
 * (Ensure python server is running on port 8000)
 */
const axios = require('axios'); // Ensure axios is installed: npm install axios

const API_URL = 'http://localhost:8000';

async function runTest(name, endpoint, payload) {
    console.log(`\n========================================`);
    console.log(`🧪 TESTING: ${name.toUpperCase()}`);
    console.log(`========================================`);
    console.log(`📤 Sending Payload:`, JSON.stringify(payload, null, 2));

    try {
        const startTime = Date.now();
        const response = await axios.post(`${API_URL}${endpoint}`, payload);
        const duration = Date.now() - startTime;

        console.log(`✅ SUCCESS (${duration}ms)`);
        console.log(`📉 Annual Generation: ${Math.round(response.data.annual_generation_kwh).toLocaleString()} kWh`);
        
        if (response.data.debug_info) {
            console.log(`\n🛠️  PHYSICS DEBUG LOGS (Step-by-Step):`);
            response.data.debug_info.logs.forEach(log => {
                console.log(`   > ${log}`);
            });

            console.log(`\n📊 INTERNAL DATA METRICS:`);
            console.log(JSON.stringify(response.data.debug_info.data, null, 2));
        }

    } catch (error) {
        console.error(`❌ FAILED`);
        if (error.code === 'ECONNREFUSED') {
            console.error(`   Could not connect to AI Engine at ${API_URL}. Is it running?`);
            console.error(`   Run: cd backend/services/ai_engine && ../../../ai_env/bin/python main.py`);
        } else {
            console.error(`   Error: ${error.message}`);
            if (error.response) console.error(`   Server Response:`, error.response.data);
        }
    }
}

async function main() {
    // 1. SOLAR TEST (Madrid, Tilted, 5 years old)
    await runTest('Solar PV (Advanced Physics)', '/predict/solar', {
        latitude: 40.4168,
        longitude: -3.7038,
        capacity_kw: 100,
        tilt: 35,
        azimuth: 180,
        years_operation: 5,
        soiling_loss: 0.03, // 3%
        debug: true
    });

    // 2. WIND TEST (Galicia, High Towers)
    await runTest('Wind Turbine (Hub Extrapolation)', '/predict/wind', {
        latitude: 43.36,
        longitude: -8.41,
        capacity_kw: 2000,
        hub_height: 120, // Very high tower
        rotor_diameter: 100,
        hellman_exponent: 0.16, // Rough terrain
        debug: true
    });

    // 3. HYDRO TEST (Small River)
    await runTest('Hydro (Flow Duration)', '/predict/hydro', {
        latitude: 42.0,
        longitude: -1.0,
        capacity_kw: 500,
        flow_rate_design: 5.0,
        gross_head: 25.0,
        penstock_length: 100,
        penstock_diameter: 1.2,
        debug: true
    });
    
    // 4. BIOMASS TEST (Pellets)
    await runTest('Biomass (Rankine Cycle)', '/predict/biomass', {
        latitude: 39.0,
        longitude: -3.0,
        capacity_kw: 1000,
        feedstock_type: 'pellets',
        moisture_content: 8.0, // Dry
        debug: true
    });
}

main();
