const simulationService = require('../services/simulationService');

async function debug() {
    console.log("=== DEBUGGING SIMULATION SERVICE ===");
    
    // --- TEST 1: FULL SOLAR SIMULATION (Including new Financial Loop) ---
    console.log("\n--- TEST 1: Full Solar Financial Simulation ---\n");
    const testInput = {
        location: { lat: 40.4168, lon: -3.7038, name: "Madrid Debug" },
        technical: {
            capacityKw: 5,
            lifetimeYears: 25,
            degradationRate: 0.0055
        },
        financial: {
            // Remove hardcoded values to test Defaults
            /*
            electricityPrice: 0.20,
            surplusPrice: 0.05,
            discountRate: 0.05,
            energyInflation: 0.03,
            */
           // Rely on backend/config/simulationParams.js
        },
        costs: {
            // totalOverride: 6000 --> Remove to test conservative default (1300/kW * 5 = 6500)
        }
    };

    try {
        const result = await simulationService.runFullSolarSimulation(testInput);
        
        console.log("\n--- RESULT METRICS ---");
        // Check financial.metrics path from simulationService return structure
        const m = result.financial?.metrics || result.summary; 
        
        console.log("ROI:", m.roi, "%");
        console.log("Payback:", m.paybackPeriod, "years");
        console.log("NPV:", m.npv, "€");
        console.log("LCOE:", m.lcoe, "€/kWh"); 
        console.log("CO2 Avoided:", m.co2tonnes, "t"); 
        console.log("Trees:", m.trees);
        
        
        // Check year 12 for inverter replacement
        const year12Check = result.financial.cashFlows.find(c => c.year === 12);
        if(year12Check) {
            console.log("Year 12 Expenses (Check Replacement):", year12Check.opex);
        }

    } catch (error) {
        console.error("Simulation Failed:", error);
    }

    // --- TEST 2: FULL WIND FINANCIAL SIMULATION ---
    console.log("\n--- TEST 2: Full Wind Financial Simulation (Las Palmas - Proven Local Data) ---\n");
    const testInputWind = {
        location: { lat: 28.1235, lon: -15.4363, name: "Las Palmas Wind" }, // Using Las Palmas where we verified we have 17km/h data
        technical: {
            turbineCapacityKw: 2000, 
            hubHeight: 80, 
            rotorDiameter: 90, 
            lifetimeYears: 25
        },
        financial: {
            // Remove hardcoded values to test Defaults from simulationParams.js
            // electricityPrice: 0.20, --> Should fallback to 0.135 (0.15 * 0.9 capture)
            // surplusPrice: 0.05, --> Should fallback to 0.045 * 0.9
        },
        costs: {
            // totalOverride: 1500000 --> Let backend calculate using new default (1600/kW)
        }
    };

    try {
        const resultWind = await simulationService.runFullWindSimulation(testInputWind);
        
        console.log("\n--- WIND RESULT METRICS ---");
        const m = resultWind.financial.metrics;
        
        console.log("ROI:", m.roi, "%");
        console.log("Payback:", m.paybackPeriod, "years");
        console.log("NPV:", m.npv, "€");
        console.log("LCOE:", m.lcoe, "€/kWh"); 
        console.log("CO2 Avoided:", m.co2tonnes, "t"); 
        
        console.log("Year 1 Production:", resultWind.financial.cashFlows[1].production.toFixed(0), "kWh");

    } catch (error) {
        console.error("Wind Simulation Failed:", error);
    }
}
debug();
