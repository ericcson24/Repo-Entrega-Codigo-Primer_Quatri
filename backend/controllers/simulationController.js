const simulationService = require('../services/simulationService');

exports.calculateWind = async (req, res) => {
    try {
        // Nuevo flujo "Full Stack" para Eólica
        const lat = req.body.lat || req.body.location?.lat;
        const lon = req.body.lon || req.body.location?.lon;
        const capacity = req.body.capacity || req.body.technical?.turbineCapacityKw;

        if (!lat || !lon || !capacity) {
            return res.status(400).json({ error: 'Missing required parameters: lat, lon, capacity' });
        }

        const result = await simulationService.runFullWindSimulation({
            location: { 
                lat: parseFloat(lat), 
                lon: parseFloat(lon),
                altitude: req.body.location?.altitude || 0
            },
            technical: {
                ...req.body.technical,
                turbineCapacityKw: parseFloat(capacity)
            },
            financial: req.body.financial,
            costs: req.body.costs // CAPEX y OPEX específicos de eólica
        });

        res.json(result);
    } catch (error) {
        console.error('Wind Simulation Error:', error);
        res.status(500).json({ error: 'Internal Simulation Error' });
    }
};

exports.calculateSolar = async (req, res) => {
    try {
        // Nuevo flujo "Full Stack" - recibimos un objeto de configuración más completo
        // Se espera que el frontend envíe algo como:
        // {
        //   location: { lat, lon },
        //   technical: { angle, capacity, ... },
        //   financial: { ... }
        // }
        // Para compatibilidad hacia atrás, también aceptamos lat, lon en el root
        
        const lat = req.body.lat || req.body.location?.lat;
        const lon = req.body.lon || req.body.location?.lon;
        const capacity = req.body.capacity || req.body.technical?.capacityKw;

        if (!lat || !lon || !capacity) {
            return res.status(400).json({ error: 'Missing required parameters: lat, lon, capacity' });
        }

        // Llamamos al nuevo método de simulación completa
        const result = await simulationService.runFullSolarSimulation({
            location: { lat: parseFloat(lat), lon: parseFloat(lon) },
            technical: {
                ...req.body.technical,
                capacityKw: parseFloat(capacity)
            },
            financial: req.body.financial,
            costs: req.body.costs // CAPEX y OPEX explícitos
        });

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
