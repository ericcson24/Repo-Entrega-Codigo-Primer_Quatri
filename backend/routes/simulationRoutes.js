const express = require('express');
const router = express.Router();
const SimulationController = require('../controllers/simulationController');

// Ruta: GET /api/solar-potential
router.get('/solar-potential', SimulationController.getSolarPotential);

// Ruta: POST /api/simulate
router.post('/simulate', SimulationController.runSimulation);

// Ruta: GET /api/history
router.get('/history', SimulationController.getHistory);

module.exports = router;
