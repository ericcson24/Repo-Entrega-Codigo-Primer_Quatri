const express = require('express');
const router = express.Router();
const SimulationController = require('../controllers/simulationController');

// Route: GET /api/solar-potential
router.get('/solar-potential', SimulationController.getSolarPotential);

// Route: POST /api/simulate
router.post('/simulate', SimulationController.runSimulation);

// Route: GET /api/history
router.get('/history', SimulationController.getHistory);

module.exports = router;
