const express = require('express');
const router = express.Router();

const weatherController = require('../controllers/weatherController');
const marketController = require('../controllers/marketController');
const solarController = require('../controllers/solarController');
const componentsController = require('../controllers/componentsController');
const modelsController = require('../controllers/modelsController');
const configController = require('../controllers/configController');
const simulationController = require('../controllers/simulationController');
const aiController = require('../controllers/aiController');

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simulation Routes (New)
router.post('/simulate/wind', simulationController.calculateWind);
router.post('/simulate/hydro', simulationController.calculateHydro);
router.post('/simulate/biomass', simulationController.calculateBiomass);
router.post('/simulate/solar', simulationController.calculateSolar);
router.post('/simulate/financials', simulationController.calculateFinancials);
router.post('/financial/panel-payback', simulationController.calculatePanelInvestment); // New payback calculation route

// AI & Optimization Routes
router.post('/ai/predict', aiController.predictEnergy);
router.post('/ai/optimize', aiController.optimizeSystem);
router.post('/ai/simulate', aiController.runFullSimulation);
router.post('/ai/train', aiController.trainModel); // New training endpoint

// Config routes
router.get('/config', configController.getConfig);

// Weather routes
router.get('/weather/:region', weatherController.getWeather);

// Market routes
router.get('/market/:marketType', marketController.getMarketData);

// Solar routes
router.get('/solar/:region', solarController.getSolarData);

// Components routes
router.get('/solar-panels', componentsController.getSolarPanels);
router.get('/solar-inverters', componentsController.getSolarInverters);
router.get('/wind-turbines', componentsController.getWindTurbines);
router.get('/wind-towers', componentsController.getWindTowers);
router.get('/batteries', componentsController.getBatteries);

// Models routes
router.get('/models', modelsController.getModels);

module.exports = router;
