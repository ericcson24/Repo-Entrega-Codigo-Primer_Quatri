const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'renewables_db',
  password: process.env.DB_PASS || 'password123',
  port: process.env.DB_PORT || 5432,
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize Tables
const initDb = async () => {
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
        console.log("Database tables initialized");
    } catch (err) {
        console.error("Error initializing tables:", err);
    } finally {
        client.release();
    }
};

initDb();

module.exports = { pool };
