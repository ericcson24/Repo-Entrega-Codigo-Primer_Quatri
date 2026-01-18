const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string from DOCS_DEPLOY.md
const connectionString = 'postgresql://neondb_owner:npg_rS6EFRuv3Mmt@ep-frosty-smoke-ahu1b8ye-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  console.log('🔌 Connecting to Neon Database...');
  
  const client = await pool.connect();
  
  try {
    const sqlPath = path.join(__dirname, '../../database/init/01_init.sql');
    console.log(`📂 Reading SQL file from: ${sqlPath}`);
    
    let sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Neon Free Tier might not support TimescaleDB easily or requires dashboard activation.
    // We will try to run the script. 
    // If it fails on CREATE EXTENSION, we might need a fallback, but let's try standard first.
    
    console.log('🚀 Executing SQL script...');
    await client.query(sql);
    
    console.log('✅ Upgrade Successful! Tables created.');
    
    // Check if tables exist
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('📊 Current Tables:', res.rows.map(r => r.table_name));

  } catch (err) {
    console.error('❌ Error executing script:', err.message);
    if (err.message.includes('timescaledb')) {
        console.log('⚠️  Note: TimescaleDB extension issues are common on free tiers. The standard tables might still have been created.');
    }
  } finally {
    client.release();
    pool.end();
  }
}

runMigration();
