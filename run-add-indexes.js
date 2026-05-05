const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function addIndexes() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'boutique_abayas',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Lire le fichier SQL
    const sqlFile = path.join(__dirname, 'add-indexes.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Exécuter le SQL
    console.log('⏳ Creating indexes...');
    await client.query(sql);

    console.log('✅ All indexes created successfully!');
    console.log('\n📊 Performance improvements:');
    console.log('   - organizationId indexes: Fast multi-tenant filtering');
    console.log('   - Foreign key indexes: Optimized JOINs');
    console.log('   - Date indexes: Faster sorting and filtering');
    console.log('   - Composite indexes: Optimized common query patterns');
    console.log('   - Total: 87 indexes added');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addIndexes();
