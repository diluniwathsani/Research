// backend/models/database.js
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Try to load .env from multiple locations
const envPaths = [
    path.join(__dirname, '..', '.env'),        // backend/.env
    path.join(__dirname, '..', '..', '.env'),  // root .env
    path.join(process.cwd(), '.env'),          // current working directory
    path.join(__dirname, '.env'),              // backend/models/.env
];

let loaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        if (process.env.DATABASE_URL) {
            console.log(`✅ Loaded .env from: ${envPath}`);
            loaded = true;
            break;
        }
    }
}

if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env file in any location');
    console.error('   Checked locations:');
    envPaths.forEach(p => console.error(`   - ${p}`));
    console.error('');
    console.error('⚠️ Please ensure DATABASE_URL is defined:');
    console.error('   DATABASE_URL=postgresql://...');
}

// ============================================
// DATABASE CONNECTOR: Neon PostgreSQL ONLY
// ============================================

// Use single shared connection pool from database.js
const pool = require('../database');

let db = null;

// PostgreSQL wrapper exposing SQLite-like interface (.all, .get, .run, .exec)
class PostgresDbWrapper {
    constructor(pool) {
        this.pool = pool;
    }

    async queryWithRetry(fn) {
        try {
            return await fn();
        } catch (err) {
            if (err.message.includes('terminated') || err.message.includes('timeout')) {
                console.warn('⚠️ Neon PostgreSQL connection dropped, retrying query...');
                await new Promise(r => setTimeout(r, 100));
                return await fn();
            }
            throw err;
        }
    }

    async all(sql, params = []) {
        try {
            const adaptedSql = this.adaptSql(sql);
            return await this.queryWithRetry(async () => {
                const res = await this.pool.query(adaptedSql, params);
                return res.rows;
            });
        } catch (error) {
            console.error('PostgreSQL all() error:', error.message);
            console.error('SQL:', sql);
            throw error;
        }
    }

    async get(sql, params = []) {
        try {
            const adaptedSql = this.adaptSql(sql);
            return await this.queryWithRetry(async () => {
                const res = await this.pool.query(adaptedSql, params);
                return res.rows[0] || null;
            });
        } catch (error) {
            console.error('PostgreSQL get() error:', error.message);
            console.error('SQL:', sql);
            throw error;
        }
    }

    async run(sql, params = []) {
        try {
            const adaptedSql = this.adaptSql(sql);
            return await this.queryWithRetry(async () => {
                return await this.pool.query(adaptedSql, params);
            });
        } catch (error) {
            console.error('PostgreSQL run() error:', error.message);
            console.error('SQL:', sql);
            throw error;
        }
    }

    async exec(sql) {
        try {
            const adaptedSql = this.adaptSql(sql);
            return await this.queryWithRetry(async () => {
                return await this.pool.query(adaptedSql);
            });
        } catch (error) {
            console.error('PostgreSQL exec() error:', error.message);
            console.error('SQL:', sql);
            throw error;
        }
    }

    // Convert SQLite '?' placeholders and date functions to PostgreSQL equivalents
    adaptSql(sql) {
        let index = 1;
        let adapted = sql.replace(/\?/g, () => `$${index++}`);
        adapted = adapted.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
        adapted = adapted.replace(/datetime\('now',\s*'-(\d+)\s*days'\)/gi, "(CURRENT_TIMESTAMP - INTERVAL '$1 days')");
        // Handle SQLite INSERT OR IGNORE -> PostgreSQL ON CONFLICT DO NOTHING
        adapted = adapted.replace(/INSERT OR IGNORE INTO/gi, 'INSERT INTO');
        return adapted;
    }
}

async function initializeDatabase() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('❌ DATABASE_URL not found in .env file');
        console.error('⚠️ Please add: DATABASE_URL=postgresql://...');
        throw new Error('DATABASE_URL is required');
    }

    if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
        console.error('❌ Invalid DATABASE_URL format. Must start with postgresql:// or postgres://');
        throw new Error('Invalid DATABASE_URL format');
    }

    try {
        console.log('📡 Connecting to Neon PostgreSQL database using shared connection pool...');
        
        db = new PostgresDbWrapper(pool);

        await createTables();
        await seedDataIfEmpty();

        console.log('✅ Database initialized successfully');
        return db;
    } catch (error) {
        console.error('❌ Failed to connect to PostgreSQL:', error.message);
        throw error;
    }
}

// ============================================
// CREATE TABLES
// ============================================
async function createTables() {
    console.log('📋 Creating PostgreSQL tables...');
    
    try {
        // 1. Projects Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS projects (
                project_id TEXT PRIMARY KEY,
                project_name TEXT NOT NULL,
                description TEXT,
                project_manager TEXT NOT NULL,
                team_size INTEGER DEFAULT 8,
                progress_percent INTEGER DEFAULT 0,
                budget_usd DECIMAL(15,2) DEFAULT 100000,
                risk_level TEXT DEFAULT 'Medium',
                complexity_level TEXT DEFAULT 'Medium',
                priority TEXT DEFAULT 'Medium',
                status TEXT NOT NULL DEFAULT 'ACTIVE',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Projects table created');

        // Requirements Table
        await db.exec(`
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
            );
        `);
        console.log('✅ Requirements table created');

        // 2. Sprints Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS sprints (
                sprint_id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                sprint_name TEXT NOT NULL,
                sprint_number INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING',
                start_date DATE,
                end_date DATE,
                capacity_story_points INTEGER DEFAULT 40,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(project_id)
            );
        `);
        // Clean up duplicate project-prefixed sprint entries (e.g., P393882-SPR-01) if standard SPR-01 exists
        try {
            await db.exec(`
                DELETE FROM sprints
                WHERE sprint_id LIKE '%-SPR-%'
                  AND EXISTS (
                    SELECT 1 FROM sprints s2
                    WHERE s2.project_id = sprints.project_id
                      AND s2.sprint_number = sprints.sprint_number
                      AND s2.sprint_id NOT LIKE '%-SPR-%'
                  );
            `);
        } catch (sprintCleanErr) {
            // Ignore if clean fails
        }
        console.log('✅ Sprints table created and deduplicated');

        // 3. User Stories Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS user_stories (
                story_id TEXT PRIMARY KEY,
                user_story_id TEXT,
                project_id TEXT,
                sprint_id TEXT,
                title TEXT NOT NULL,
                description TEXT,
                story_points INTEGER DEFAULT 5,
                priority TEXT DEFAULT 'Medium',
                status TEXT DEFAULT 'IN_PROGRESS',
                assigned_to TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(project_id),
                FOREIGN KEY (sprint_id) REFERENCES sprints(sprint_id)
            );
        `);
        console.log('✅ User Stories table created');

        // 4. Resource Allocations Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS resource_allocations (
                id SERIAL PRIMARY KEY,
                sprint_id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                user_story_id TEXT,
                resource_id TEXT NOT NULL,
                resource_name TEXT NOT NULL,
                role TEXT NOT NULL,
                allocated_hours INTEGER DEFAULT 40,
                allocation_percentage INTEGER DEFAULT 100,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sprint_id) REFERENCES sprints(sprint_id),
                FOREIGN KEY (project_id) REFERENCES projects(project_id),
                FOREIGN KEY (user_story_id) REFERENCES user_stories(story_id)
            );
        `);
        console.log('✅ Resource Allocations table created');

        // 5. Change Requests Table (Auto-repair if old schema exists without request_id)
        await db.exec(`
            DO $$ 
            BEGIN 
                IF EXISTS (
                    SELECT 1 FROM information_schema.tables WHERE table_name = 'change_requests'
                ) AND NOT EXISTS (
                    SELECT 1 FROM information_schema.columns WHERE table_name = 'change_requests' AND column_name = 'request_id'
                ) THEN 
                    DROP TABLE change_requests CASCADE; 
                END IF; 
            END $$;

            CREATE TABLE IF NOT EXISTS change_requests (
                id SERIAL PRIMARY KEY,
                request_id TEXT UNIQUE NOT NULL,
                project_id TEXT NOT NULL,
                project_name TEXT NOT NULL,
                user_story_id TEXT NOT NULL,
                user_story_title TEXT,
                sprint_id TEXT NOT NULL,
                sprint_name TEXT,
                resource_allocation_info TEXT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                change_type TEXT NOT NULL,
                story_points INTEGER DEFAULT 5,
                urgency TEXT DEFAULT 'MEDIUM',
                reason TEXT,
                team_size INTEGER DEFAULT 8,
                progress_percent INTEGER DEFAULT 25,
                project_manager TEXT,
                status TEXT DEFAULT 'PENDING',
                impact_level TEXT,
                confidence DECIMAL(5,2),
                recommendation TEXT,
                probabilities TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(project_id),
                FOREIGN KEY (user_story_id) REFERENCES user_stories(story_id),
                FOREIGN KEY (sprint_id) REFERENCES sprints(sprint_id)
            );
        `);
        console.log('✅ Change Requests table created');

        // 6. Approvals Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS approvals (
                id SERIAL PRIMARY KEY,
                request_id TEXT NOT NULL,
                approver_name TEXT NOT NULL,
                approver_role TEXT NOT NULL,
                decision TEXT CHECK(decision IN ('APPROVED', 'REJECTED', 'NEEDS_CLARIFICATION')),
                comments TEXT,
                justification TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (request_id) REFERENCES change_requests(request_id)
            );
        `);
        console.log('✅ Approvals table created');

        // 7. Audit Trail Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS audit_trail (
                id SERIAL PRIMARY KEY,
                request_id TEXT NOT NULL,
                action TEXT NOT NULL,
                actor TEXT NOT NULL,
                actor_role TEXT NOT NULL,
                details TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (request_id) REFERENCES change_requests(request_id)
            );
        `);
        console.log('✅ Audit Trail table created');

        // 8. Developers Table
        await db.exec(`
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
            );
        `);
        console.log('✅ Developers table created');

        // 9. Allocations Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS allocations (
                id SERIAL PRIMARY KEY,
                sprint_id TEXT,
                story_id TEXT,
                work_item_id TEXT,
                developer_id INTEGER,
                allocated_hours INTEGER,
                predicted_complexity TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (developer_id) REFERENCES developers(id)
            );
        `);
        console.log('✅ Allocations table created');

        // 10. Work Items Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS work_items (
                work_item_id TEXT PRIMARY KEY,
                story_id TEXT NOT NULL,
                parent_story_title TEXT,
                project_id TEXT NOT NULL DEFAULT 'P00001',
                title TEXT NOT NULL,
                description TEXT,
                domain TEXT NOT NULL,
                required_skills TEXT[],
                estimated_hours NUMERIC DEFAULT 8,
                story_points INT DEFAULT 1,
                status TEXT DEFAULT 'generated',
                assigned_developer_id TEXT,
                assigned_developer_name TEXT,
                sprint_id TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        try {
            await db.exec(`ALTER TABLE work_items ADD COLUMN IF NOT EXISTS story_points INT DEFAULT 1`);
            await db.exec(`ALTER TABLE work_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'generated'`);
            await db.exec(`ALTER TABLE work_items ADD COLUMN IF NOT EXISTS parent_story_title TEXT`);
        } catch (wiColErr) {
            // Column already exists
        }
        console.log('✅ Work Items table created');

        // 11. Team Members Table
        await db.exec(`
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
            );
        `);
        console.log('✅ Team Members table created');

        // 12. Sprint Tasks Table
        await db.exec(`
            CREATE TABLE IF NOT EXISTS sprint_tasks (
                id TEXT PRIMARY KEY,
                requirement_sentence TEXT NOT NULL,
                epic TEXT,
                user_story TEXT,
                acceptance_criteria TEXT,
                column_name TEXT DEFAULT 'Backlog',
                points INT DEFAULT 3,
                assignee TEXT
            );
        `);
        console.log('✅ Sprint Tasks table created');

        console.log('✅ All PostgreSQL tables created successfully');

    } catch (error) {
        console.error('❌ Error creating PostgreSQL tables:', error.message);
        throw error;
    }
}

// ============================================
// SEED DATA
// ============================================
async function seedDataIfEmpty() {
    try {
        console.log('🌱 Checking PostgreSQL database status...');
    } catch (err) {
        console.error('❌ Error checking database status:', err.message);
    }
}

function getDatabase() {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}

module.exports = {
    initializeDatabase,
    getDatabase
};