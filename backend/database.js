// ================= DATABASE CONFIGURATION =================
// Neon PostgreSQL connection

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_WwhL4l9AFUIr@ep-little-moon-ayl6lfl8.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require";

const { Pool } = require('pg');

// Create connection pool optimized for Neon Serverless PostgreSQL
const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    },
    max: 10,
    connectionTimeoutMillis: 0,
    idleTimeoutMillis: 10000,
});

pool.on('error', (err) => {
    console.warn('⚠️ Neon Pool Notice:', err.message);
});


// ================= TEST DATABASE CONNECTION & TABLE AUTO-CREATION =================

(async () => {
    let client = null;
    try {
        client = await pool.connect();
        console.log('✅ Connected to Neon PostgreSQL database.');

        // ================= CREATE REQUIREMENTS TABLE =================
        try {
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
        } catch (reqTableErr) {
            console.warn('Notice creating requirements table:', reqTableErr.message);
        }

        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS team_members (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    avatar TEXT,
                    color TEXT,
                    capacity_hours INT DEFAULT 40,
                    allocated_hours INT DEFAULT 0,
                    assigned_epics TEXT[],
                    skills TEXT[],
                    status TEXT DEFAULT 'Optimal'
                )
            `);
        } catch (tmErr) {
            console.warn('Notice creating team_members table:', tmErr.message);
        }

        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS sprint_tasks (
                    id TEXT PRIMARY KEY,
                    requirement_sentence TEXT NOT NULL,
                    epic TEXT,
                    user_story TEXT,
                    acceptance_criteria TEXT,
                    column_name TEXT DEFAULT 'Backlog',
                    points INT DEFAULT 3,
                    assignee TEXT
                )
            `);
        } catch (stErr) {
            console.warn('Notice creating sprint_tasks table:', stErr.message);
        }
        console.log('✅ Base requirements, team_members, and sprint_tasks tables ready.');

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
                sprint_id TEXT,
                story_id TEXT,
                developer_id INTEGER,
                allocated_hours INTEGER,
                predicted_complexity TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (developer_id) REFERENCES developers(id)
            )
        `);
        try {
            await client.query(`ALTER TABLE allocations ALTER COLUMN sprint_id TYPE TEXT USING sprint_id::text`);
        } catch (alterErr) {
            // Ignore if column is already TEXT or alter fails
        }
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

        console.log('✅ Database initialization complete!');
    } catch (err) {
        console.error('❌ Error connecting to Neon PostgreSQL:', err.message);
    } finally {
        if (client) client.release();
    }
})();

// ================= EXPORT POOL FOR USE IN SERVER.JS =================
module.exports = pool;

