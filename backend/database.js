// --- DATABASE CONFIGURATION (Neon PostgreSQL) ---
// This file initializes the PostgreSQL connection pool for Neon DB and ensures table schema existence.

require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_WwhL4l9AFUIr@ep-little-moon-ayl6lfl8.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test connection and initialize schema
(async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to Neon PostgreSQL database.');
        
        // --- SCHEMA INITIALIZATION ---
        await client.query(`
            CREATE TABLE IF NOT EXISTS requirements (
                id SERIAL PRIMARY KEY,
                requirement_sentence TEXT NOT NULL,
                completeness_status TEXT DEFAULT 'Pending',
                epic TEXT,
                feature TEXT,
                user_story TEXT,
                acceptance_criteria TEXT,
                batch_name TEXT DEFAULT 'Untitled Batch',
                created_at TEXT
            )
        `);
        client.release();
    } catch (err) {
        console.error('Error connecting to Neon PostgreSQL database:', err.message);
    }
})();

module.exports = pool;
