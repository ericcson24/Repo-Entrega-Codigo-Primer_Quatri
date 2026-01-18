const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { pool } = require('./config/db');
const simulationRoutes = require('./routes/simulationRoutes');
const catalogRoutes = require('./routes/catalogRoutes');

const app = express();

// Cloud Run requiere escuchar en 0.0.0.0, no solo en localhost
const host = '0.0.0.0';
const port = process.env.PORT || 4000;

// Configuración de Middleware
app.use(cors());
app.use(express.json());

// Ruta raíz
app.get('/', (req, res) => {
  res.send('API del Backend del Simulador de Energía Renovable operativa');
});

// Rutas de la API
app.use('/api', simulationRoutes);
app.use('/api', catalogRoutes);

app.listen(port, host, () => {
  console.log(`Servidor escuchando en http://${host}:${port}`);
});
