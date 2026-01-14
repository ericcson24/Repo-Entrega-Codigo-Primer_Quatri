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

    /**
     * Run inference for a single data point
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

    _runNeuralNet(modelData, inputs) {
        function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

        const weights_ih = new Matrix(modelData.weights.architecture.hidden, modelData.weights.architecture.input, modelData.weights.weights_ih);
        const weights_ho = new Matrix(modelData.weights.architecture.output, modelData.weights.architecture.hidden, modelData.weights.weights_ho);
        const bias_h = new Matrix(modelData.weights.architecture.hidden, 1, modelData.weights.bias_h);
        const bias_o = new Matrix(modelData.weights.architecture.output, 1, modelData.weights.bias_o);

        let inputMatrix = Matrix.fromArray(inputs);
        
        // Hidden
        let hidden = Matrix.multiply(weights_ih, inputMatrix);
        hidden.add(bias_h);
        hidden.map(sigmoid);

        // Output
        let output = Matrix.multiply(weights_ho, hidden);
        output.add(bias_o);
        output.map(sigmoid);

        return output.data[0][0]; 
    }
}

module.exports = new AIService();