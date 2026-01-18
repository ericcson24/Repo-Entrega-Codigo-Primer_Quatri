const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'renewables_db',
  password: process.env.DB_PASS || 'password123',
  port: process.env.DB_PORT || 5432,
  // SSL es requerido para la mayoría de bases dedatos en nube (Neon, Supabase, Heroku)
  ssl: process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== 'timescaledb' 
       ? { rejectUnauthorized: false } 
       : false
});

pool.on('error', (err, client) => {
  console.error('Error inesperado en cliente inactivo', err);
  process.exit(-1);
});

// Inicializar Tablas
const initDb = async () => {
    try {
        const client = await pool.connect();
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS simulations (
                    id SERIAL PRIMARY KEY,
                    user_email VARCHAR(255) NOT NULL,
                    project_type VARCHAR(50) NOT NULL,
                    input_params JSONB NOT NULL,
                    results JSONB NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log("Database initialized successfully");
        } finally {
            client.release();
        }
    } catch (err) {
        console.warn("Database connection failed. Running in memory-only mode. History will not be saved.");
        console.error(err.message);
    }
};

initDb();

module.exports = { pool };
