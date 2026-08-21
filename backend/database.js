// ================= DATABASE CONFIGURATION =================
// Neon PostgreSQL connection

// Load environment variables FIRST
require('dotenv').config({ path: './.env' });

// Debug logging
console.log('📁 Current directory:', __dirname);
console.log('🔍 DATABASE_URL exists:', !!process.env.DATABASE_URL);

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not defined in .env');
    console.error('Please create a .env file with:');
    console.error('DATABASE_URL=postgresql://username:password@host/database');
    console.error('Current working directory:', process.cwd());
    process.exit(1);
}

// Create connection pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
});

// ================= TEST DATABASE CONNECTION =================

(async () => {
    try {
        const client = await pool.connect();
        console.log('✅ Connected to Neon PostgreSQL database.');

        // ================= CREATE REQUIREMENTS TABLE =================
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
        console.log('✅ Requirements table is ready.');

        // ================= CREATE DEVELOPERS TABLE =================
        await client.query(`
            CREATE TABLE IF NOT EXISTS developers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL,
                languages TEXT,
                profile TEXT,
                capacity_hours INTEGER DEFAULT 40,
                primary_domain TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Developers table is ready.');

        // ================= CREATE ALLOCATIONS TABLE =================
        await client.query(`
            CREATE TABLE IF NOT EXISTS allocations (
                id SERIAL PRIMARY KEY,
                sprint_id INTEGER,
                story_id TEXT,
                developer_id INTEGER,
                allocated_hours INTEGER,
                predicted_complexity TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (developer_id) REFERENCES developers(id)
            )
        `);
        console.log('✅ Allocations table is ready.');

        // ================= CHECK IF DEVELOPERS EXIST =================
        const result = await client.query('SELECT COUNT(*) FROM developers');
        if (parseInt(result.rows[0].count) === 0) {
            // Insert sample developers
            await client.query(`
                INSERT INTO developers (name, email, role, languages, capacity_hours, primary_domain)
                VALUES
                    ('Charlie', 'charlie@example.com', 'Junior', 'HTML,CSS', 40, 'frontend'),
                    ('Alice', 'alice@example.com', 'Senior', 'JavaScript,Python,SQL', 40, 'backend'),
                    ('Bob', 'bob@example.com', 'Senior', 'JavaScript,React', 40, 'frontend'),
                    ('David', 'david@example.com', 'Senior', 'Python,SQL,Security', 40, 'backend'),
                    ('Eve', 'eve@example.com', 'Specialist', 'ML,TensorFlow,Python', 40, 'ai')
            `);
            console.log('✅ Sample developers inserted.');
        }

        client.release();
        console.log('✅ Database initialization complete!');

    } catch (err) {
        console.error('❌ Error connecting to Neon PostgreSQL:', err.message);
        console.error('Please check your DATABASE_URL in .env file');
        process.exit(1);
    }
})();

// ================= EXPORT POOL FOR USE IN SERVER.JS =================
module.exports = pool;