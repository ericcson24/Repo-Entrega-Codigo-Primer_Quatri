const Matrix = require('../lib/matrix');
const fs = require('fs');
const path = require('path');

class NeuralNetwork {
  constructor(input_nodes, hidden_nodes, output_nodes) {
    this.input_nodes = input_nodes;
    this.hidden_nodes = hidden_nodes;
    this.output_nodes = output_nodes;
    
    // Deep Architecture: 2 Hidden Layers (Same size for simplicity in this implementation)
    // In a real generic class we would pass an array [3, 16, 16, 1]
    // Here we hardcode 2 generic hidden layers for "Deep" upgrade.
    
    this.weights_ih = new Matrix(this.hidden_nodes, this.input_nodes);
    this.weights_hh = new Matrix(this.hidden_nodes, this.hidden_nodes); // Layer 1 -> Layer 2
    this.weights_ho = new Matrix(this.output_nodes, this.hidden_nodes);
    
    this.weights_ih.randomize();
    this.weights_hh.randomize();
    this.weights_ho.randomize();

    this.bias_h1 = new Matrix(this.hidden_nodes, 1);
    this.bias_h2 = new Matrix(this.hidden_nodes, 1);
    this.bias_o = new Matrix(this.output_nodes, 1);
    
    this.bias_h1.randomize();
    this.bias_h2.randomize();
    this.bias_o.randomize();

    this.learning_rate = 0.05; // Slightly higher for deep net
  }

  // Sigmoid activation
  sigmoid(x) {
    return 1 / (1 + Math.exp(-x));
  }

  // Derivative of Sigmoid
  dsigmoid(y) {
    return y * (1 - y);
  }

  predict(input_array) {
    // Hidden Layer 1
    let inputs = Matrix.fromArray(input_array);
    let hidden1 = Matrix.multiply(this.weights_ih, inputs);
    hidden1.add(this.bias_h1);
    hidden1.map(this.sigmoid);
    
    // Hidden Layer 2 (Deep Feature Extraction)
    let hidden2 = Matrix.multiply(this.weights_hh, hidden1);
    hidden2.add(this.bias_h2);
    hidden2.map(this.sigmoid);

    // Output Layer
    let output = Matrix.multiply(this.weights_ho, hidden2);
    output.add(this.bias_o);
    output.map(this.sigmoid);

    return output.toArray();
  }

  train(input_array, target_array) {
    // --- FEEDFORWARD ---
    
    // Hidden 1
    let inputs = Matrix.fromArray(input_array);
    let hidden1 = Matrix.multiply(this.weights_ih, inputs);
    hidden1.add(this.bias_h1);
    hidden1.map(this.sigmoid);
    
    // Hidden 2
    let hidden2 = Matrix.multiply(this.weights_hh, hidden1);
    hidden2.add(this.bias_h2);
    hidden2.map(this.sigmoid);

    // Output
    let outputs = Matrix.multiply(this.weights_ho, hidden2);
    outputs.add(this.bias_o);
    outputs.map(this.sigmoid);

    // --- BACKPROPAGATION ---

    let targets = Matrix.fromArray(target_array);

    // 1. Output Error
    let output_errors = Matrix.subtract(targets, outputs);

    // 2. Output Gradients
    let gradients = Matrix.map(outputs, this.dsigmoid);
    gradients.multiply(output_errors);
    gradients.multiply(this.learning_rate);

    // 3. Hidden 2 Deltas
    let hidden2_T = Matrix.transpose(hidden2);
    let weight_ho_deltas = Matrix.multiply(gradients, hidden2_T);

    // Adjust Output Weights
    this.weights_ho.add(weight_ho_deltas);
    this.bias_o.add(gradients);

    // 4. Hidden 2 Errors
    let who_t = Matrix.transpose(this.weights_ho);
    let hidden2_errors = Matrix.multiply(who_t, output_errors);

    // 5. Hidden 2 Gradients
    let hidden2_gradient = Matrix.map(hidden2, this.dsigmoid);
    hidden2_gradient.multiply(hidden2_errors);
    hidden2_gradient.multiply(this.learning_rate);

    // 6. Hidden 1 Deltas (Input to Hidden 2)
    let hidden1_T = Matrix.transpose(hidden1);
    let weight_hh_deltas = Matrix.multiply(hidden2_gradient, hidden1_T);
    
    // Adjust Hidden 2 Weights
    this.weights_hh.add(weight_hh_deltas);
    this.bias_h2.add(hidden2_gradient);
    
    // 7. Hidden 1 Errors
    let whh_t = Matrix.transpose(this.weights_hh);
    let hidden1_errors = Matrix.multiply(whh_t, hidden2_errors);
    
    // 8. Hidden 1 Gradients
    let hidden1_gradient = Matrix.map(hidden1, this.dsigmoid);
    hidden1_gradient.multiply(hidden1_errors);
    hidden1_gradient.multiply(this.learning_rate);
    
    // 9. Input Deltas
    let inputs_T = Matrix.transpose(inputs);
    let weight_ih_deltas = Matrix.multiply(hidden1_gradient, inputs_T);
    
    // Adjust Hidden 1 Weights
    this.weights_ih.add(weight_ih_deltas);
    this.bias_h1.add(hidden1_gradient);
  }
  
  serialize() {
      return {
          weights_ih: this.weights_ih.data,
          weights_hh: this.weights_hh.data,
          weights_ho: this.weights_ho.data,
          bias_h1: this.bias_h1.data,
          bias_h2: this.bias_h2.data,
          bias_o: this.bias_o.data,
          architecture: {
              input: this.input_nodes,
              hidden: this.hidden_nodes,
              layers: 2,
              output: this.output_nodes
          }
      }
  }
}

// ---------------------------------------------------------
// DATA LOADING AND PREPROCESSING (SOLAR)
// ---------------------------------------------------------

console.log("🚀 Initializing Advanced AI Training Pipeline (Solar + Wind)...");

const DATA_DIR = path.join(__dirname, '../data');

function loadSolarData() {
    console.log("Phase 1A: Generating Solar Physics-Informed Data...");
    let trainingData = [];
    
    // Generate 10000 samples covering different weather conditions (Improved Data Volume)
    for(let i=0; i<10000; i++) {
        // Random weather conditions (Simulation of historical data distribution)
        const temp = Math.random() * 45; // 0 to 45C (Summer peaks)
        const irradiation = Math.random() * 1200; // 0 to 1200 W/m2
        const wind = Math.random() * 25; // 0 to 25 m/s
        
        // Calculate "Real" Output (Target) using Advanced Physics
        
        // 1. Module Temperature Model (Sandia Model Simplified)
        // Cell Temp is higher than Air Temp based on Sun, but Lowered by Wind
        const coolingFactor = Math.max(0, wind * 1.0); // Wind cools the panel
        const heatingFromSun = (irradiation / 1000) * 25; // Sun heats the panel
        
        // Calculate Effective Cell Temperature
        let cellTemp = temp + heatingFromSun - coolingFactor;
        
        // 2. Efficiency Loss Formula
        // Efficiency drops 0.35% per degree above 25C (Cell Temp, not Air Temp)
        let tempLoss = 1.0;
        if (cellTemp > 25) {
            tempLoss = 1.0 - ((cellTemp - 25) * 0.0035);
        } else {
             // Efficiency increases slightly below 25C
             tempLoss = 1.0 + ((25 - cellTemp) * 0.001);
        }
        
        // Base Performance Ratio (Systems have losses: cable, inverter)
        const basePR = 0.85; 
        
        // Calculated Ratio (Target for NN to learn)
        let targetPR = basePR * tempLoss;
        
        // Clamp logical limits
        if (targetPR > 0.95) targetPR = 0.95; 
        if (targetPR < 0.10) targetPR = 0.10;
        
        // Add random noise (Real world sensor noise)
        targetPR += (Math.random() * 0.02 - 0.01);
        
        // Normalize Inputs (0-1) for Neural Network Stability
        const normTemp = temp / 50.0; 
        const normIrr = irradiation / 1200.0; 
        const normWind = wind / 30.0;
        
        trainingData.push({
            inputs: [normTemp, normIrr, normWind],
            target: [targetPR]
        });
    }
    
    return trainingData;
}

function loadWindData() {
    console.log("Phase 1B: Generating Wind Physics-Informed Data...");
    let trainingData = [];
    
    // Generate 10000 samples for Wind
    for(let i=0; i<10000; i++) {
        // Inputs
        const windSpeed = Math.random() * 30; // 0 to 30 m/s
        const airDensity = 1.1 + Math.random() * 0.2; // 1.1 to 1.3 kg/m3 (Standard is 1.225)
        
        // Wind Physics Truth (Power Curve + Air Density)
        
        // 1. Logic for Typical 5MW Turbine (approximated)
        // Cut-in: 3.5 m/s
        // Rated: 12 m/s
        // Cut-out: 25 m/s
        
        let outputPowerFactor = 0; // 0 to 1
        
        if (windSpeed < 3.5) {
            outputPowerFactor = 0;
        } else if (windSpeed >= 25.0) {
            outputPowerFactor = 0; // Cut-out
        } else if (windSpeed >= 12.0) {
            outputPowerFactor = 1.0; // Rated Power
        } else {
            // Cubic ramp up region
            // P ~ v^3
            // Interpolate between 3.5 and 12
            // Simple interp: ((v - 3.5) / (12 - 3.5))^3
            
            // Betz limit is theoretical, but we model the power Curve
            const ramp = (windSpeed - 3.5) / (12.0 - 3.5);
            outputPowerFactor = Math.pow(ramp, 3);
        }
        
        // 2. Air Density Correction
        // Power is directly proportional to density. 
        // We normalize around 1.225
        const densityFactor = airDensity / 1.225;
        
        let targetOutput = outputPowerFactor * densityFactor;
        
        // Cap at 1.0 (Inverters usually clip even if density is high)
        if (targetOutput > 1.0) targetOutput = 1.0;
        
        // Add Noise
        targetOutput += (Math.random() * 0.02 - 0.01);
        if (targetOutput < 0) targetOutput = 0;
        
        // Normalize Inputs
        const normWind = windSpeed / 30.0;
        const normDensity = (airDensity - 1.0) / 0.5; // Map 1.0-1.5 to 0-1 approx range
        
        trainingData.push({
            inputs: [normWind, normDensity],
            target: [targetOutput]
        });
    }
    return trainingData;
}

function loadEconomicsData() {
    console.log("Phase 1C: Generating Economic Market Data (Cannibalization Ratio)...");
    let trainingData = [];
    
    // Simulate 20,000 market hours
    for(let i=0; i<20000; i++) {
        // Inputs: 
        // 1. Renewable Penetration (0-1)
        // 2. Demand Factor (0-1)
        // 3. Gas Price Factor (0-1)
        
        const renewables = Math.random();
        const demand = Math.random();
        const gasPrice = Math.random(); // 0.0 = Cheap Gas, 1.0 = Crisis
        
        // --- LOGIC V2: RELATIVE CORRECTION FACTOR ---
        // We want a factor that multiplies the User's Average Price.
        // Baseline = 1.0
        
        let cannibalization = 1.0;
        
        // 1. Merit Order Effect (Renewables push prices down)
        // Only impactful if penetration is significant (>20%)
        if (renewables > 0.2) {
             // Up to 60% reduction in extreme saturation (100% renewables)
             const impact = (renewables - 0.2) * 0.75; 
             cannibalization -= impact;
        }
        
        // 2. Demand Curve (High demand supports prices, Low demand crashes them)
        // +/- 10% based on demand
        cannibalization += (demand - 0.5) * 0.2; 
        
        // 3. Gas Price (Crisis increases ALL prices)
        // +/- 20% based on gas
        cannibalization += (gasPrice - 0.5) * 0.4;
        
        // Clamp: Price shouldn't go negative or be infinite.
        // Range: 0.2 (Free energy times) to 1.5 (Energy Crisis)
        // Normalized for output?
        // No, the Neural Net should output the Factor directly.
        // But our Sigmoid outputs 0-1.
        // We will map 0.0 -> 0.0 factor, 1.0 -> 2.0 factor.
        // So target 0.5 means Factor 1.0.
        
        let targetFactor = cannibalization;
        
        // Map factor (0.2 to 1.8) into Sigmoid Range (0 to 1)
        // let's say Factor 1.0 = Sigmoid 0.6 ?
        // Easier: Just normalize target to be [0, 1] representing [0.0, 2.0] factor
        
        let normalizedTarget = targetFactor / 2.0;
        
        // Clamp
        normalizedTarget = Math.max(0.1, Math.min(0.95, normalizedTarget));
        
        trainingData.push({
            inputs: [renewables, demand, gasPrice],
            target: [normalizedTarget]
        });
    }
    return trainingData;
}

const solarData = loadSolarData();
const windData = loadWindData();
const econData = loadEconomicsData();


// ---------------------------------------------------------
// TRAINING HELPERS
// ---------------------------------------------------------

function trainModel(data, inputs, hidden, outputs, name, epochs=50000) {
    console.log(`\nPhase 3 [${name}]: Training Ultra-Deep MLP (${inputs} In -> ${hidden} Hidden -> ${outputs} Out) for ${epochs} Epochs...`);
    const model = new NeuralNetwork(inputs, hidden, outputs);
    
    // Train (Long Duration)
    for (let i = 0; i < epochs; i++) {
        const sample = data[Math.floor(Math.random() * data.length)];
        model.train(sample.inputs, sample.target);
        
        if (i % 10000 === 0) {
            let errorSum = 0;
            for(let j=0; j<100; j++) {
                const s = data[Math.floor(Math.random() * data.length)];
                const p = model.predict(s.inputs);
                const e = s.target[0] - p[0];
                errorSum += e * e;
            }
            console.log(`   > ${name} Epoch ${i} Loss (MSE): ${(errorSum/100).toFixed(7)}`);
        }
    }
    return model;
}

// ---------------------------------------------------------
// EXECUTION
// ---------------------------------------------------------

const solarNN = trainModel(solarData, 3, 24, 1, "SOLAR", 50000); // 24 neurons, 50k epochs
const windNN = trainModel(windData, 2, 24, 1, "WIND", 50000);
const econNN = trainModel(econData, 3, 16, 1, "ECONOMY", 50000);

// ---------------------------------------------------------
// VERIFICATION
// ---------------------------------------------------------
console.log("\nPhase 5: Verification & Physics Compliance Test");

function verifySolar(temp, irr, wind, desc) {
    const normTemp = temp / 50.0;
    const normIrr = irr / 1200.0;
    const normWind = wind / 30.0;
    const output = solarNN.predict([normTemp, normIrr, normWind]);
    const predictedPR = output[0] * 100; // %
    console.log(`   SOLAR TEST: ${desc} (T=${temp}ºC, Irr=${irr}W, Wind=${wind}) -> PR: ${predictedPR.toFixed(2)}%`);
    return predictedPR;
}

function verifyWind(speed, density, desc) {
    const normWind = speed / 30.0;
    const normDensity = (density - 1.0) / 0.5;
    const output = windNN.predict([normWind, normDensity]);
    const powerPct = output[0] * 100;
    console.log(`   WIND TEST: ${desc} (Speed=${speed}m/s, Rho=${density}) -> Power: ${powerPct.toFixed(2)}% of Capacity`);
    return powerPct;
}

function verifyEcon(renewables, demand, gas, desc) {
    const output = econNN.predict([renewables, demand, gas]);
    const priceFactor = output[0];
    console.log(`   ECON TEST: ${desc} (Ren=${renewables.toFixed(2)}, Dem=${demand.toFixed(2)}) -> Price Factor: ${priceFactor.toFixed(3)}`);
    return priceFactor;
}

// Solar Tests
const prHotNoWind = verifySolar(35, 1000, 2, "Hot+NoWind");
const prHotWindy = verifySolar(35, 1000, 15, "Hot+Windy");

// Wind Tests
verifyWind(8, 1.225, "Ramp Up"); 

// Econ Tests
const pricePeak = verifyEcon(0.1, 0.9, 0.5, "Peak Hour (Low Ren, High Demand)");
const priceGlut = verifyEcon(0.8, 0.4, 0.5, "Cannibalization (High Ren, Low Demand)");

if (priceGlut < pricePeak * 0.6) console.log("   ✅ ECON PASS: Cannibalization Effect Learned (Price Crash).");

if (prHotWindy > prHotNoWind) console.log("   ✅ SOLAR PASS: Wind Cooling Learned.");

// ---------------------------------------------------------
// SAVE
// ---------------------------------------------------------
const savePath = path.join(DATA_DIR, 'models/ai_models.json');
const modelData = {
    solar_model: {
        type: "neural_network_mlp",
        architecture: "3-24-1", // Ultra Deep
        weights: solarNN.serialize(),
        normalization: {
            temp_max: 50,
            irr_max: 1200,
            wind_max: 30
        },
        metadata: { trained_at: new Date().toISOString() }
    },
    wind_model: {
        type: "neural_network_mlp",
        architecture: "2-24-1", 
        weights: windNN.serialize(),
        normalization: {
            wind_max: 30,
            density_offset: 1.0,
            density_scale: 0.5
        },
        metadata: { trained_at: new Date().toISOString() }
    },
    econ_model: {
        type: "neural_network_mlp",
        architecture: "3-16-1",
        weights: econNN.serialize(),
        normalization: {
            // Inputs are already 0-1
        },
        metadata: { trained_at: new Date().toISOString() }
    }
};

fs.writeFileSync(savePath, JSON.stringify(modelData, null, 2));
console.log(`\n💾 Models saved to ${savePath}`);
