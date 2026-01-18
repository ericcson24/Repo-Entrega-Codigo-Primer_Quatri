const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool } = require('./config/db'); // Import properly
const simulationRoutes = require('./routes/simulationRoutes');
const catalogRoutes = require('./routes/catalogRoutes');

const app = express();

// Cloud Run requires listening on 0.0.0.0, not just localhost
const host = '0.0.0.0';
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('Renewable Energy Simulator Backend API Running');
});

// API Routes
app.use('/api', simulationRoutes);
app.use('/api', catalogRoutes);

app.listen(port, host, () => {
  console.log(`Backend listening at http://${host}:${port}`);
});
