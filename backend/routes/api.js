const express = require('express');
const router = express.Router();

const weatherController = require('../controllers/weatherController');
const marketController = require('../controllers/marketController');
const solarController = require('../controllers/solarController');
const componentsController = require('../controllers/componentsController');
const modelsController = require('../controllers/modelsController');
const configController = require('../controllers/configController');
const simulationController = require('../controllers/simulationController');

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simulation Routes (New)
router.post('/simulate/wind', simulationController.calculateWind);
router.post('/simulate/solar', simulationController.calculateSolar);
router.post('/simulate/financials', simulationController.calculateFinancials);

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
