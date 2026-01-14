const fs = require('fs');
const path = require('path');
const Matrix = require('../lib/matrix');

class AIService {
    constructor() {
        this.modelsPath = path.join(__dirname, '../data/models/ai_models.json');
        this.models = null;
        this._loadModels();
    }

    _loadModels() {
        try {
            if (fs.existsSync(this.modelsPath)) {
                this.models = JSON.parse(fs.readFileSync(this.modelsPath, 'utf8'));
            }
        } catch (err) {
            console.error("AIService: Failed to load models", err.message);
        }
    }

    getSolarModel() {
        if (!this.models) this._loadModels();
        return this.models ? this.models.solar_model : null;
    }

    getWindModel() {
        if (!this.models) this._loadModels();
        return this.models ? this.models.wind_model : null;
    }

    getEconModel() {
        if (!this.models) this._loadModels();
        return this.models ? this.models.econ_model : null;
    }

    /**
     * Run inference for a single data point (Solar)
     * @param {number} temp Temperature (C)
     * @param {number} irr Irradiance (W/m2)
     * @param {number} wind Wind Speed (m/s)
     */
    predictPerformanceRatio(temp, irr, wind) {
        const model = this.getSolarModel();
        if (!model) {
            // Fallback physics if no AI
            // 0.85 base - temp loss
            const tempLoss = Math.max(0, (temp - 25) * 0.004);
            return 0.85 * (1 - tempLoss);
        }

        if (model.type === "neural_network_mlp") {
             // Clamping
             const safeTemp = Math.max(-10, Math.min(temp, 50));
             const safeIrr = Math.max(0, Math.min(irr, 1200));
             const safeWind = Math.max(0, Math.min(wind, 30));
             
             // Normalize
             const normTemp = safeTemp / model.normalization.temp_max;
             const normIrr = safeIrr / model.normalization.irr_max;
             const normWind = safeWind / model.normalization.wind_max;

             // Forward Pass
             return this._runNeuralNet(model, [normTemp, normIrr, normWind]);
        }
        
        // Linear regression fallback
        if (model.coefficients) {
             const pred = model.coefficients.pr_base + (model.coefficients.temp_loss_factor * temp);
             return Math.max(0, Math.min(1, pred));
        }

        return 0.8;
    }

    /**
     * Run inference for Wind Turbine Power Output
     * @param {number} windSpeed Wind Speed msg (m/s)
     * @param {number} airDensity Air Density (kg/m3) - Default 1.225
     * @returns {number} Normalized Power Output (0-1)
     */
    predictWindPower(windSpeed, airDensity = 1.225) {
        const model = this.getWindModel();
        
        // Safety clamps
        const speed = Math.max(0, Math.min(windSpeed, 35));
        const density = Math.max(0.5, Math.min(airDensity, 1.5));
        
        if (!model || !model.normalization) {
            // Fallback Physics Model (Standard Vestas V90-like curve)
            if (speed < 3.0 || speed > 25) return 0;
            if (speed >= 12) return 1.0;
            
            // Physical Formula: P = 0.5 * rho * A * Cp * v^3
            // Assuming generic 2MW turbine stats relative to its capacity
            // This is a normalized curve (0-1), so we just need the curve shape
            
            // Simple generic polynomial fit for modern pitch-controlled turbine
            // This is better than raw v^3 which underestimates low-mid range
            const t = speed;
            const powerCoeff = -0.0015 * Math.pow(t, 3) + 0.045 * Math.pow(t, 2) - 0.15 * t + 0.15;
            
            // Simpler approach: Cubic with higher base Cp
            // Normalized Power ~ (v / v_rated)^k where k ~ 2 to 2.5 usually fits better than 3 due to control
            const production = Math.pow((speed - 3.0) / (12.0 - 3.0), 2.0); 
            
            return Math.max(0, Math.min(1.0, production));
        }

        // Normalize
        const normWind = speed / model.normalization.wind_max;
        const normDensity = (density - model.normalization.density_offset) / model.normalization.density_scale;

        // Inference
        let result = this._runNeuralNet(model, [normWind, normDensity]);
        
        // Post-process
        return Math.max(0, Math.min(1, result));
    }

    /**
     * Predict Market Price Factor (Cannibalization)
     * @param {number} renewablePenetration (0-1)
     * @param {number} demandFactor (0-1)
     * @param {number} gasPriceFactor (0-1)
     */
    predictPriceFactor(renewablePenetration, demandFactor, gasPriceFactor = 0.5) {
        const model = this.getEconModel();
        if (!model) return 1.0; // Fallback

        const res = this._runNeuralNet(model, [
            renewablePenetration, 
            demandFactor, 
            gasPriceFactor
        ]);
        
        // Output from NN is normalized 0-1 representing a factor of 0.0x to 2.0x
        // Map back: 0.5 -> 1.0
        const realFactor = res * 2.0;

        return Math.max(0.1, Math.min(2.0, realFactor));
    }

    predict(modelType, inputs) {
        if (!this.models) this._loadModels();
        if (modelType === 'ECONOMY') {
            const model = this.getEconModel();
            if(!model) return null;
            
            // Normalize inputs if needed (Assumes inputs are already 0-1 for this model)
            // But let's be safe
            const [renewablePenetration, demandFactor, gasPriceFactor] = inputs;
            
            return [this._runNeuralNet(model, [
                renewablePenetration,
                demandFactor,
                gasPriceFactor
            ])];
        }
        return null;
    }

    _runNeuralNet(modelData, inputs) {
        function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

        // Architecture check: Deep (2 layers) or Shallow (1 layer)?
        const isDeep = modelData.weights.architecture.layers === 2;

        const weights_ih = new Matrix(
            modelData.weights.architecture.hidden, 
            modelData.weights.architecture.input, 
            modelData.weights.weights_ih
        );
        
        const bias_h1 = new Matrix(
            modelData.weights.architecture.hidden, 
            1, 
            isDeep ? modelData.weights.bias_h1 : modelData.weights.bias_h
        );

        let inputMatrix = Matrix.fromArray(inputs);
        
        // --- Layer 1 ---
        let hidden1 = Matrix.multiply(weights_ih, inputMatrix);
        hidden1.add(bias_h1);
        hidden1.map(sigmoid);

        let lastLayerOutput = hidden1;

        // --- Layer 2 (Optional: Deep Network) ---
        if (isDeep) {
             const weights_hh = new Matrix(
                 modelData.weights.architecture.hidden,
                 modelData.weights.architecture.hidden,
                 modelData.weights.weights_hh
             );
             const bias_h2 = new Matrix(
                 modelData.weights.architecture.hidden,
                 1,
                 modelData.weights.bias_h2
             );

             let hidden2 = Matrix.multiply(weights_hh, hidden1);
             hidden2.add(bias_h2);
             hidden2.map(sigmoid);
             
             lastLayerOutput = hidden2;
        }

        // --- Output Layer ---
        const weights_ho = new Matrix(
            modelData.weights.architecture.output, 
            modelData.weights.architecture.hidden, 
            modelData.weights.weights_ho
        );
        const bias_o = new Matrix(
            modelData.weights.architecture.output, 
            1, 
            modelData.weights.bias_o
        );

        let output = Matrix.multiply(weights_ho, lastLayerOutput);
        output.add(bias_o);
        output.map(sigmoid);

        return output.data[0][0]; 
    }
}

module.exports = new AIService();