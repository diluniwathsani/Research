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

const { Pool } = require('pg');

let db = null;
let pool = null;

// PostgreSQL wrapper exposing SQLite-like interface (.all, .get, .run, .exec)
class PostgresDbWrapper {
    constructor(pool) {
        this.pool = pool;
    }

    async all(sql, params = []) {
        try {
            const adaptedSql = this.adaptSql(sql);
            const res = await this.pool.query(adaptedSql, params);
            return res.rows;
        } catch (error) {
            console.error('PostgreSQL all() error:', error.message);
            console.error('SQL:', sql);
            throw error;
        }
    }

    async get(sql, params = []) {
        try {
            const adaptedSql = this.adaptSql(sql);
            const res = await this.pool.query(adaptedSql, params);
            return res.rows[0] || null;
        } catch (error) {
            console.error('PostgreSQL get() error:', error.message);
            console.error('SQL:', sql);
            throw error;
        }
    }

    async run(sql, params = []) {
        try {
            const adaptedSql = this.adaptSql(sql);
            const res = await this.pool.query(adaptedSql, params);
            return res;
        } catch (error) {
            console.error('PostgreSQL run() error:', error.message);
            console.error('SQL:', sql);
            throw error;
        }
    }

    async exec(sql) {
        try {
            const adaptedSql = this.adaptSql(sql);
            return await this.pool.query(adaptedSql);
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
        console.log('📡 Connecting to Neon PostgreSQL database...');
        console.log(`📡 Connection string: ${databaseUrl.substring(0, 50)}...`);
        
        pool = new Pool({
            connectionString: databaseUrl,
            ssl: { 
                rejectUnauthorized: false 
            },
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });

        // Test connection with timeout
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000);
        });
        
        const connectionPromise = pool.query('SELECT NOW()');
        await Promise.race([connectionPromise, timeoutPromise]);
        
        console.log('✅ Connected to Neon PostgreSQL successfully!');

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
        console.log('✅ Sprints table created');

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

        // 5. Change Requests Table
        await db.exec(`
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
        console.log('🌱 Checking if seed data is needed...');
        
        const pCount = await db.get("SELECT COUNT(*) as count FROM projects");
        if (pCount && parseInt(pCount.count) > 0) {
            console.log('📊 Data already exists, skipping seed');
            return;
        }
        
        console.log('🌱 Seeding projects...');
        
        const projects = [
            { project_id: 'P00001', project_name: 'Aurora ERP', description: 'Enterprise resource planning and financial tracking system.', project_manager: 'Michael Henry', team_size: 9, progress_percent: 45, budget_usd: 89900, risk_level: 'Medium', complexity_level: 'Medium', priority: 'High', status: 'ACTIVE' },
            { project_id: 'P00002', project_name: 'Fusion Portal', description: 'AI-driven customer analytics and self-service portal.', project_manager: 'Anthony Harmon', team_size: 13, progress_percent: 20, budget_usd: 484000, risk_level: 'High', complexity_level: 'High', priority: 'High', status: 'ACTIVE' },
            { project_id: 'P00003', project_name: 'Aurora Mobile', description: 'Cross-platform mobile companion for warehouse operations.', project_manager: 'Teresa Mcfarland', team_size: 17, progress_percent: 60, budget_usd: 136000, risk_level: 'Low', complexity_level: 'Medium', priority: 'Medium', status: 'ACTIVE' },
            { project_id: 'P00004', project_name: 'Zenith Connect', description: 'Legacy payment gateway integration (Cancelled project).', project_manager: 'Dana Thornton', team_size: 11, progress_percent: 73, budget_usd: 120000, risk_level: 'High', complexity_level: 'Medium', priority: 'Low', status: 'CANCELLED' },
            { project_id: 'P00005', project_name: 'Nimbus Connect', description: 'Cloud file synchronizer (Completed project).', project_manager: 'Lisa Lopez', team_size: 12, progress_percent: 100, budget_usd: 28000, risk_level: 'Low', complexity_level: 'Low', priority: 'Medium', status: 'COMPLETED' }
        ];

        for (const p of projects) {
            await db.run(`
                INSERT INTO projects (project_id, project_name, description, project_manager, team_size, progress_percent, budget_usd, risk_level, complexity_level, priority, status)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                ON CONFLICT (project_id) DO NOTHING;
            `, [p.project_id, p.project_name, p.description, p.project_manager, p.team_size, p.progress_percent, p.budget_usd, p.risk_level, p.complexity_level, p.priority, p.status]);
        }
        console.log('✅ Projects seeded');

        console.log('🌱 Seeding sprints...');
        
        const sprints = [
            { sprint_id: 'SPR-01', project_id: 'P00001', sprint_name: 'Sprint 1 - Core Auth & Setup', sprint_number: 1, status: 'COMPLETED', start_date: '2026-06-01', end_date: '2026-06-15', capacity_story_points: 35 },
            { sprint_id: 'SPR-02', project_id: 'P00001', sprint_name: 'Sprint 2 - Financial Ledger Module', sprint_number: 2, status: 'ACTIVE', start_date: '2026-08-10', end_date: '2026-08-25', capacity_story_points: 40 },
            { sprint_id: 'SPR-03', project_id: 'P00001', sprint_name: 'Sprint 3 - Multi-Currency Reporting', sprint_number: 3, status: 'PENDING', start_date: '2026-08-26', end_date: '2026-09-10', capacity_story_points: 45 },
            { sprint_id: 'SPR-04', project_id: 'P00002', sprint_name: 'Sprint 1 - AI Pipeline & Ingestion', sprint_number: 1, status: 'ACTIVE', start_date: '2026-08-01', end_date: '2026-08-20', capacity_story_points: 50 },
            { sprint_id: 'SPR-05', project_id: 'P00002', sprint_name: 'Sprint 2 - Dashboard Widgets & Alerts', sprint_number: 2, status: 'PENDING', start_date: '2026-08-21', end_date: '2026-09-05', capacity_story_points: 45 },
            { sprint_id: 'SPR-06', project_id: 'P00002', sprint_name: 'Sprint 0 - Feasibility Spike', sprint_number: 0, status: 'CLOSED', start_date: '2026-07-01', end_date: '2026-07-15', capacity_story_points: 20 },
            { sprint_id: 'SPR-07', project_id: 'P00003', sprint_name: 'Sprint 1 - Barcode Scanner Integration', sprint_number: 1, status: 'COMPLETED', start_date: '2026-07-01', end_date: '2026-07-15', capacity_story_points: 30 },
            { sprint_id: 'SPR-08', project_id: 'P00003', sprint_name: 'Sprint 2 - Offline Sync Engine', sprint_number: 2, status: 'ACTIVE', start_date: '2026-08-12', end_date: '2026-08-28', capacity_story_points: 42 },
            { sprint_id: 'SPR-09', project_id: 'P00003', sprint_name: 'Sprint 3 - Bluetooth Thermal Printing', sprint_number: 3, status: 'PENDING', start_date: '2026-08-29', end_date: '2026-09-12', capacity_story_points: 38 }
        ];

        for (const s of sprints) {
            await db.run(`
                INSERT INTO sprints (sprint_id, project_id, sprint_name, sprint_number, status, start_date, end_date, capacity_story_points)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (sprint_id) DO NOTHING;
            `, [s.sprint_id, s.project_id, s.sprint_name, s.sprint_number, s.status, s.start_date, s.end_date, s.capacity_story_points]);
        }
        console.log('✅ Sprints seeded');

        console.log('🌱 Seeding user stories...');
        
        const stories = [
            { story_id: 'US-101', user_story_id: 'US-101', project_id: 'P00001', sprint_id: 'SPR-02', title: 'Automated General Ledger Tax Reconciliation', description: 'As an accountant, I want automated tax calculation on invoices so that quarterly tax filings are reconciled with zero manual data entry.', story_points: 8, priority: 'High', status: 'IN_PROGRESS', assigned_to: 'Sarah Jenkins' },
            { story_id: 'US-102', user_story_id: 'US-102', project_id: 'P00001', sprint_id: 'SPR-02', title: 'Double-Entry Journal Validation Rules', description: 'As a financial auditor, I want debits and credits validation with balance alerts before posting ledger entries.', story_points: 5, priority: 'High', status: 'IN_PROGRESS', assigned_to: 'David Kim' },
            { story_id: 'US-103', user_story_id: 'US-103', project_id: 'P00001', sprint_id: 'SPR-03', title: 'Multi-Currency Real-Time Exchange Rate Sync', description: 'As a global finance manager, I want automatic currency rate conversions based on daily ECB and Fed forex feeds.', story_points: 13, priority: 'Medium', status: 'TO_DO', assigned_to: 'Sarah Jenkins' },
            { story_id: 'US-104', user_story_id: 'US-104', project_id: 'P00001', sprint_id: 'SPR-01', title: 'SSO SAML 2.0 Identity Provider Login', description: 'As an enterprise user, I want single sign-on with Okta and Azure AD.', story_points: 5, priority: 'High', status: 'DONE', assigned_to: 'Elena Rostova' },
            { story_id: 'US-201', user_story_id: 'US-201', project_id: 'P00002', sprint_id: 'SPR-04', title: 'Predictive Churn Risk Classification Model', description: 'As a customer success lead, I want real-time churn risk indicators on account overview dashboards.', story_points: 13, priority: 'Critical', status: 'IN_PROGRESS', assigned_to: 'Dr. Marcus Vance' },
            { story_id: 'US-202', user_story_id: 'US-202', project_id: 'P00002', sprint_id: 'SPR-04', title: 'Automated Anomaly Alerting Webhook Trigger', description: 'As a site reliability engineer, I want instant alerts when customer engagement metrics drop below standard thresholds.', story_points: 5, priority: 'Medium', status: 'IN_PROGRESS', assigned_to: 'Alex Rivera' },
            { story_id: 'US-203', user_story_id: 'US-203', project_id: 'P00002', sprint_id: 'SPR-05', title: 'Interactive Heatmap Visualization of User Engagement', description: 'As a product owner, I want visual engagement heatmaps across portal navigation funnels.', story_points: 8, priority: 'Medium', status: 'TO_DO', assigned_to: 'Priya Sharma' },
            { story_id: 'US-301', user_story_id: 'US-301', project_id: 'P00003', sprint_id: 'SPR-08', title: 'Offline SQLite Local Cache & Delta Sync', description: 'As a warehouse worker, I want to scan inventory offline in basement zones and sync deltas once Wi-Fi connects.', story_points: 8, priority: 'High', status: 'IN_PROGRESS', assigned_to: 'Carlos Gomez' },
            { story_id: 'US-302', user_story_id: 'US-302', project_id: 'P00003', sprint_id: 'SPR-09', title: 'ESC/POS Bluetooth Receipt & Dispatch Slip Printer', description: 'As a warehouse operator, I want immediate dispatch slips printed via portable Zebra Bluetooth devices.', story_points: 5, priority: 'Medium', status: 'TO_DO', assigned_to: 'Carlos Gomez' }
        ];

        for (const st of stories) {
            await db.run(`
                INSERT INTO user_stories (story_id, user_story_id, project_id, sprint_id, title, description, story_points, priority, status, assigned_to)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                ON CONFLICT (story_id) DO NOTHING;
            `, [st.story_id, st.user_story_id, st.project_id, st.sprint_id, st.title, st.description, st.story_points, st.priority, st.status, st.assigned_to]);
        }
        console.log('✅ User stories seeded');

        console.log('🌱 Seeding resource allocations...');
        
        const allocations = [
            { sprint_id: 'SPR-02', project_id: 'P00001', user_story_id: 'US-101', resource_id: 'RES-01', resource_name: 'Sarah Jenkins', role: 'Lead Backend Engineer', allocated_hours: 40, allocation_percentage: 100 },
            { sprint_id: 'SPR-02', project_id: 'P00001', user_story_id: 'US-102', resource_id: 'RES-02', resource_name: 'David Kim', role: 'Senior Database Engineer', allocated_hours: 35, allocation_percentage: 85 },
            { sprint_id: 'SPR-02', project_id: 'P00001', user_story_id: 'US-101', resource_id: 'RES-03', resource_name: 'Elena Rostova', role: 'QA Automation Lead', allocated_hours: 25, allocation_percentage: 60 },
            { sprint_id: 'SPR-02', project_id: 'P00001', user_story_id: 'US-102', resource_id: 'RES-04', resource_name: 'Mark Taylor', role: 'Financial Domain Analyst', allocated_hours: 20, allocation_percentage: 50 },
            { sprint_id: 'SPR-03', project_id: 'P00001', user_story_id: 'US-103', resource_id: 'RES-01', resource_name: 'Sarah Jenkins', role: 'Lead Backend Engineer', allocated_hours: 40, allocation_percentage: 100 },
            { sprint_id: 'SPR-03', project_id: 'P00001', user_story_id: 'US-103', resource_id: 'RES-05', resource_name: 'James Wilson', role: 'Cloud Integration Specialist', allocated_hours: 30, allocation_percentage: 75 },
            { sprint_id: 'SPR-04', project_id: 'P00002', user_story_id: 'US-201', resource_id: 'RES-06', resource_name: 'Dr. Marcus Vance', role: 'Principal ML Scientist', allocated_hours: 45, allocation_percentage: 100 },
            { sprint_id: 'SPR-04', project_id: 'P00002', user_story_id: 'US-202', resource_id: 'RES-07', resource_name: 'Alex Rivera', role: 'Senior Platform Engineer', allocated_hours: 40, allocation_percentage: 100 },
            { sprint_id: 'SPR-04', project_id: 'P00002', user_story_id: 'US-201', resource_id: 'RES-08', resource_name: 'Priya Sharma', role: 'UI/UX Design Specialist', allocated_hours: 30, allocation_percentage: 75 },
            { sprint_id: 'SPR-05', project_id: 'P00002', user_story_id: 'US-203', resource_id: 'RES-08', resource_name: 'Priya Sharma', role: 'UI/UX Design Specialist', allocated_hours: 35, allocation_percentage: 85 },
            { sprint_id: 'SPR-05', project_id: 'P00002', user_story_id: 'US-203', resource_id: 'RES-07', resource_name: 'Alex Rivera', role: 'Senior Platform Engineer', allocated_hours: 20, allocation_percentage: 50 },
            { sprint_id: 'SPR-08', project_id: 'P00003', user_story_id: 'US-301', resource_id: 'RES-09', resource_name: 'Carlos Gomez', role: 'Lead Mobile Architect', allocated_hours: 40, allocation_percentage: 100 },
            { sprint_id: 'SPR-08', project_id: 'P00003', user_story_id: 'US-301', resource_id: 'RES-10', resource_name: 'Anita Patel', role: 'Mobile QA Specialist', allocated_hours: 30, allocation_percentage: 75 },
            { sprint_id: 'SPR-09', project_id: 'P00003', user_story_id: 'US-302', resource_id: 'RES-09', resource_name: 'Carlos Gomez', role: 'Lead Mobile Architect', allocated_hours: 35, allocation_percentage: 85 }
        ];

        for (const a of allocations) {
            await db.run(`
                INSERT INTO resource_allocations (sprint_id, project_id, user_story_id, resource_id, resource_name, role, allocated_hours, allocation_percentage)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [a.sprint_id, a.project_id, a.user_story_id, a.resource_id, a.resource_name, a.role, a.allocated_hours, a.allocation_percentage]);
        }
        console.log('✅ Resource allocations seeded');

        console.log('✅ PostgreSQL seed data complete');

    } catch (err) {
        console.error('❌ Error seeding PostgreSQL data:', err.message);
        throw err;
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