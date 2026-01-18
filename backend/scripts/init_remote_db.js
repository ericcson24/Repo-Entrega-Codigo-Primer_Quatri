const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Se obtienen las credenciales de las variables de entorno
// Ejemplo: DB_CONNECTION_STRING='postgresql://usuario:password@host/db?sslmode=require'
const connectionString = process.env.DB_CONNECTION_STRING;

if (!connectionString) {
  console.error("Error: La variable de entorno DB_CONNECTION_STRING no está definida.");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  console.log('Iniciando conexión a la Base de Datos...');
  
  const client = await pool.connect();
  
  try {
    const sqlPath = path.join(__dirname, '../../database/init/01_init.sql');
    console.log(`Leyendo script SQL desde: ${sqlPath}`);
    
    let sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Ejecutando script de inicialización...');
    
    // Ejecución de la consulta
    await client.query(sql);
    
    console.log('Migración completada exitosamente.');
    
  } catch (err) {
    console.error('Error durante la migración:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
