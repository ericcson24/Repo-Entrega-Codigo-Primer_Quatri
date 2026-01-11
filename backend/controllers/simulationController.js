const simulationService = require('../services/simulationService');

exports.calculateWind = async (req, res) => {
    try {
        const { lat, lon, capacity, ...params } = req.body;
        
        if (!lat || !lon || !capacity) {
            return res.status(400).json({ error: 'Missing required parameters: lat, lon, capacity' });
        }

        const result = await simulationService.simulateWind(
            parseFloat(lat), 
            parseFloat(lon), 
            parseFloat(capacity), 
            params
        );

        res.json(result);
    } catch (error) {
        console.error('Wind Simulation Error:', error);
        res.status(500).json({ error: 'Internal Simulation Error' });
    }
};

exports.calculateSolar = async (req, res) => {
    try {
        const { lat, lon, capacity, ...params } = req.body;
        
        if (!lat || !lon || !capacity) {
            return res.status(400).json({ error: 'Missing required parameters: lat, lon, capacity' });
        }

        const result = await simulationService.simulateSolar(
            parseFloat(lat), 
            parseFloat(lon), 
            parseFloat(capacity), 
            params
        );

        res.json(result);
    } catch (error) {
        console.error('Solar Simulation Error:', error);
        res.status(500).json({ error: 'Internal Simulation Error' });
    }
};

exports.calculateFinancials = async (req, res) => {
    try {
        const { investment, annualProduction, selfConsumption, ...params } = req.body;

        if (!investment || !annualProduction) {
            return res.status(400).json({ error: 'Missing parameters: investment, annualProduction' });
        }

        const result = await simulationService.calculateFinancials(
            parseFloat(investment),
            parseFloat(annualProduction),
            parseFloat(selfConsumption || 0.5), // Default 50%
            params
        );

        res.json(result);
    } catch (error) {
        console.error('Financial Calculation Error:', error);
        res.status(500).json({ error: 'Internal Calculation Error' });
    }
};
