const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: './.env' });

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Serve static data files
app.use('/data', express.static(path.join(__dirname, 'data')));

// Routes
app.use('/api', apiRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📦 Component catalogs: http://localhost:${PORT}/api/solar-panels`);
});

module.exports = app;
