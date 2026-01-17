const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();
const simulationRoutes = require('./routes/simulationRoutes');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'timescaledb',
  database: process.env.DB_NAME || 'renewables_db',
  password: process.env.DB_PASS || 'password123',
  port: process.env.DB_PORT || 5432,
});

pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Connected to Database (TimescaleDB/Postgres)');
  release();
});

// Routes
app.get('/', (req, res) => {
  res.send('Renewable Energy Simulator Backend API Running');
});

// API Routes
app.use('/api', simulationRoutes);

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});
