// backend/scripts/view_db.js
// Utility script to view all tables and records in Neon PostgreSQL
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const envPaths = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', '.env'),
    path.join(process.cwd(), '.env')
];

for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        if (process.env.DATABASE_URL) break;
    }
}

const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function viewDatabase() {
    try {
        console.log('\n======================================================');
        console.log('📊 LIVE NEON POSTGRESQL DATABASE VIEWER');
        console.log('======================================================\n');

        // 1. Change Requests Table
        console.log('--- 1. [change_requests] Table ---');
        const crRes = await pool.query(`
            SELECT request_id, project_name, user_story_id, sprint_name, change_type, story_points, status, impact_level, confidence 
            FROM change_requests 
            ORDER BY created_at DESC 
            LIMIT 10;
        `);
        console.table(crRes.rows);

        // 2. Approvals Table
        console.log('\n--- 2. [approvals] Table ---');
        const appRes = await pool.query(`
            SELECT request_id, approver_name, approver_role, decision, comments, created_at 
            FROM approvals 
            ORDER BY created_at DESC 
            LIMIT 10;
        `);
        console.table(appRes.rows);

        // 3. Audit Trail Table
        console.log('\n--- 3. [audit_trail] Table ---');
        const audRes = await pool.query(`
            SELECT id, request_id, action, actor, actor_role, timestamp 
            FROM audit_trail 
            ORDER BY id DESC 
            LIMIT 10;
        `);
        console.table(audRes.rows);

        // 4. Projects Table
        console.log('\n--- 4. [projects] Table ---');
        const projRes = await pool.query(`
            SELECT project_id, project_name, project_manager, team_size, progress_percent, status 
            FROM projects 
            ORDER BY project_id ASC;
        `);
        console.table(projRes.rows);

        // 5. Sprints Table
        console.log('\n--- 5. [sprints] Table ---');
        const sprRes = await pool.query(`
            SELECT sprint_id, project_id, sprint_name, sprint_number, status, capacity_story_points 
            FROM sprints 
            ORDER BY sprint_id ASC;
        `);
        console.table(sprRes.rows);

        // 6. User Stories Table
        console.log('\n--- 6. [user_stories] Table (Sample) ---');
        const usRes = await pool.query(`
            SELECT user_story_id, project_id, sprint_id, title, story_points, priority, status 
            FROM user_stories 
            LIMIT 10;
        `);
        console.table(usRes.rows);

        // 7. Resource Allocations Table
        console.log('\n--- 7. [resource_allocations] Table (Sample) ---');
        const raRes = await pool.query(`
            SELECT sprint_id, user_story_id, resource_name, role, allocated_hours, allocation_percentage 
            FROM resource_allocations 
            LIMIT 10;
        `);
        console.table(raRes.rows);

        await pool.end();
    } catch (err) {
        console.error('❌ Error querying database:', err.message);
    }
}

viewDatabase();
