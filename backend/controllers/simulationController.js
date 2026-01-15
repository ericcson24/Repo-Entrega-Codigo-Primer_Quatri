const simulationService = require('../services/simulationService');
const investmentService = require('../services/investmentService');

exports.calculateWind = async (req, res) => {
    try {
        console.log("-> [SimulationController] Recibida petición Eólica:", req.body.location?.name);
        
        // Nuevo flujo "Full Stack" para Eólica
        // Se espera estructura: { location, technical, financial, costs }
        
        const lat = req.body.lat || req.body.location?.lat;
        const lon = req.body.lon || req.body.location?.lon;
        const capacity = req.body.capacity || req.body.technical?.turbineCapacityKw;

        if (!lat || !lon || !capacity) {
            return res.status(400).json({ error: 'Missing required parameters: lat, lon, capacity' });
        }

        // Recuperar parámetros técnicos avanzados
        // Si vienen en 'req.body.technical', genial. Si no, construimos.
        const technical = req.body.technical || {};
        technical.turbineCapacityKw = parseFloat(capacity); // Ensure sync
        
        // Ejecutar simulación COMPLETA en backend (Physics + Financials)
        const result = await simulationService.runFullWindSimulation({
            location: { lat: parseFloat(lat), lon: parseFloat(lon), name: req.body.location?.name },
            technical: technical,
            financial: req.body.financial || {},
            costs: req.body.costs || { totalOverride: req.body.financial?.budget }
        });

        // Devolver formato similar al Solar para consistencia
        res.json(result);

    } catch (error) {
        console.error('Wind Simulation Error:', error);
        res.status(500).json({ error: 'Internal Simulation Error: ' + error.message });
    }
};

exports.calculateHydro = async (req, res) => {
    try {
        console.log("-> [SimulationController] Recibida petición Hidráulica");
        // { technical: { flowRate, headHeight, ... }, financial: {}, costs: {} }
        
        const result = await simulationService.runFullHydroSimulation({
             location: req.body.location || {}, // No crítico para física simple, útil para reporte
             technical: req.body.technical || {},
             financial: req.body.financial || {},
             costs: req.body.costs || {}
        });
        res.json(result);
    } catch (error) {
        console.error('Hydro Simulation Error:', error);
        res.status(500).json({ error: 'Internal Simulation Error: ' + error.message });
    }
};

exports.calculateBiomass = async (req, res) => {
    try {
        console.log("-> [SimulationController] Recibida petición Biomasa");
        // { technical: { capacityKw, ... }, financial: {}, costs: { fuelCostPerTon } }
        
        const result = await simulationService.runFullBiomassSimulation({
             location: req.body.location || {},
             technical: req.body.technical || {},
             financial: req.body.financial || {},
             costs: req.body.costs || {}
        });
        res.json(result);
    } catch (error) {
        console.error('Biomass Simulation Error:', error);
        res.status(500).json({ error: 'Internal Simulation Error: ' + error.message });
    }
};

exports.calculateSolar = async (req, res) => {
    try {
        
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
        console.log("-> [SimulationController] Recibida petición Financiera Simple");
        const { investment, annualProduction, selfConsumption, ...params } = req.body;
        console.log(`   > Params: Inv=${investment}€, Prod=${annualProduction}kWh, Self=${selfConsumption}`);

        if (!investment || !annualProduction) {
            return res.status(400).json({ error: 'Missing parameters: investment, annualProduction' });
        }
        
        // Delegamos a investmentService en lugar de simulationService para desacoplar
        const result = await investmentService.calculateSolarInvestment(
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

exports.calculatePanelInvestment = async (req, res) => {
    try {
         console.log("-> [SimulationController] Recibida petición Inversión Paneles");
         const { totalCost, monthlySavings } = req.body;
         
         if (!totalCost || !monthlySavings) {
             return res.status(400).json({ error: 'Missing parameters: totalCost, monthlySavings' });
         }

         const result = investmentService.calculatePaybackSimple(
             parseFloat(totalCost),
             parseFloat(monthlySavings)
         );
         
         res.json({
             paybackMonths: result.months,
             paybackYears: result.years,
             message: `Tiempo de recuperación estimado: ${result.years.toFixed(1)} años`
         });

    } catch(error) {
        console.error('Panel Investment calculation error', error);
        res.status(500).json({ error: 'Internal Calculation Error' });
    }
};
