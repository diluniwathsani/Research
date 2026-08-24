require('dotenv').config();
const db = require('./database');

async function testConnection() {
    try {
        console.log('Testing Neon PostgreSQL database connection...');
        const countRes = await db.query('SELECT COUNT(*) FROM requirements');
        console.log('Total records in Neon DB:', countRes.rows[0].count);

        const sampleRes = await db.query('SELECT id, requirement_sentence, completeness_status, epic, feature, batch_name FROM requirements ORDER BY id ASC LIMIT 3');
        console.log('Sample Records from Neon DB:');
        console.log(JSON.stringify(sampleRes.rows, null, 2));

        console.log('✅ Connection test successful!');
    } catch (err) {
        console.error('❌ Connection test failed:', err);
    } finally {
        await db.end();
    }
}

testConnection();
