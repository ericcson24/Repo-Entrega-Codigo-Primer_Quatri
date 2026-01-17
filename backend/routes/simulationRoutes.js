const express = require('express');
const router = express.Router();
const SimulationController = require('../controllers/simulationController');

// Route: POST /api/simulate
router.post('/simulate', SimulationController.runSimulation);

module.exports = router;
