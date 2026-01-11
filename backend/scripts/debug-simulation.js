const simulationService = require('../services/simulationService');

async function debug() {
    console.log("=== DEBUGGING SIMULATION SERVICE ===");
    
    // Test Wind Simulation
    // Zaragoza coordinates (High wind potential)
    const lat = 41.6488;
    const lon = -0.8891;
    const capacity = 5; // 5 kW Turbine (Small domestic)

    console.log(`\n1. Testing Wind Simulation for Zaragoza (${lat}, ${lon}, ${capacity}kW)...`);
    try {
        const windRes = await simulationService.simulateWind(lat, lon, capacity, {
            height: 15, // Small turbine height
            cutIn: 3,
            rated: 12,
            cutOut: 25,
            rotorDiameter: 4 // Small
        });
        console.log("Wind Result:", JSON.stringify({
            annualProduction: windRes.annualProduction,
            capacityFactor: windRes.capacityFactor,
            model: windRes.meta?.model
        }, null, 2));

        if (windRes.annualProduction > capacity * 8760) {
            console.error("CRITICAL: Production cannot exceed theoretical max!");
        }
    } catch (e) { console.error("Wind Error:", e); }

    console.log(`\n2. Testing Solar Simulation for Zaragoza...`);
    try {
        const solarRes = await simulationService.simulateSolar(lat, lon, capacity, {
            tilt: 35,
            azimuth: 0,
            performanceRatio: 0.75
        });
        console.log("Solar Result:", JSON.stringify({
            annualProduction: solarRes.annualProduction,
            source: solarRes.source
        }, null, 2));
    } catch (e) { console.error("Solar Error:", e); }
}

debug();
