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
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
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

        // ================= CREATE PROJECTS TABLE =================
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS public.projects (
                    project_id TEXT PRIMARY KEY,
                    project_name TEXT NOT NULL,
                    description TEXT,
                    project_manager TEXT NOT NULL DEFAULT 'Unassigned',
                    team_size INTEGER DEFAULT 8,
                    progress_percent INTEGER DEFAULT 0,
                    budget_usd DECIMAL(15,2) DEFAULT 100000,
                    risk_level TEXT DEFAULT 'Medium',
                    complexity_level TEXT DEFAULT 'Medium',
                    priority TEXT DEFAULT 'Medium',
                    status TEXT NOT NULL DEFAULT 'ACTIVE',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ Projects table created');
        } catch (pErr) {
            console.warn('Notice creating projects table:', pErr.message);
        }

        // ================= CREATE REQUIREMENTS TABLE =================
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS public.requirements (
                    id SERIAL PRIMARY KEY,
                    requirement_sentence TEXT NOT NULL,
                    completeness_status TEXT DEFAULT 'Pending',
                    epic TEXT,
                    feature TEXT,
                    user_story TEXT,
                    acceptance_criteria TEXT,
                    batch_name TEXT DEFAULT 'Untitled Batch',
                    project_id TEXT DEFAULT 'P00001',
                    requirement_order INTEGER DEFAULT 1,
                    created_at TEXT
                )
            `);
            await client.query(`ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS project_id TEXT DEFAULT 'P00001'`);
            await client.query(`ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS requirement_order INTEGER DEFAULT 1`);
        } catch (reqTableErr) {
            console.warn('Notice creating requirements table:', reqTableErr.message);
        }

        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS public.team_members (
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
                CREATE TABLE IF NOT EXISTS public.sprint_tasks (
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
            CREATE TABLE IF NOT EXISTS public.developers (
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
        try {
            await client.query(`ALTER TABLE requirements ADD COLUMN IF NOT EXISTS user_email TEXT;`);
        } catch (_) {}
        console.log('✅ Developers table is ready.');

        // ================= CREATE ALLOCATIONS TABLE =================
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.allocations (
                id SERIAL PRIMARY KEY,
                sprint_id TEXT,
                story_id TEXT,
                work_item_id TEXT,
                developer_id INTEGER,
                allocated_hours INTEGER,
                predicted_complexity TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (developer_id) REFERENCES public.developers(id)
            )
        `);
        try {
            await client.query(`ALTER TABLE public.allocations ALTER COLUMN sprint_id TYPE TEXT USING sprint_id::text`);
            await client.query(`ALTER TABLE public.allocations ADD COLUMN IF NOT EXISTS work_item_id TEXT`);
        } catch (alterErr) {
            // Ignore if column is already TEXT or alter fails
        }
        console.log('✅ Allocations table is ready.');

        // ================= CREATE USER STORIES TABLE =================
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS public.user_stories (
                    story_id TEXT PRIMARY KEY,
                    user_story_id TEXT,
                    project_id TEXT DEFAULT 'P00001',
                    sprint_id TEXT DEFAULT 'SPR-01',
                    title TEXT NOT NULL,
                    description TEXT,
                    story_points INTEGER DEFAULT 5,
                    priority TEXT DEFAULT 'Medium',
                    status TEXT DEFAULT 'IN_PROGRESS',
                    assigned_to TEXT DEFAULT 'Unassigned',
                    requirement_order INTEGER DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await client.query(`ALTER TABLE public.user_stories ADD COLUMN IF NOT EXISTS requirement_order INTEGER DEFAULT 1`);
            await client.query(`ALTER TABLE public.user_stories ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT 'Unassigned'`);
            await client.query(`ALTER TABLE public.user_stories ADD COLUMN IF NOT EXISTS epic TEXT`);
            await client.query(`ALTER TABLE public.user_stories ADD COLUMN IF NOT EXISTS feature TEXT`);

            // Sync epic & feature from requirements table into user_stories table
            await client.query(`
                UPDATE public.user_stories u 
                SET epic = COALESCE(u.epic, r.epic, 'General Epic'),
                    feature = COALESCE(u.feature, r.feature, 'General Feature')
                FROM public.requirements r 
                WHERE (u.epic IS NULL OR u.feature IS NULL)
                  AND (u.story_id = 'US-' || r.id OR u.user_story_id = 'US-' || r.id OR u.story_id = r.id::text)
            `);
            console.log('✅ User Stories table created and synced with Epics & Features');
        } catch (usErr) {
            console.warn('Notice creating user_stories table:', usErr.message);
        }

        // ================= CREATE WORK ITEMS TABLE =================
        try {
            await client.query(`
                CREATE TABLE IF NOT EXISTS public.work_items (
                    work_item_id TEXT PRIMARY KEY,
                    story_id TEXT NOT NULL,
                    parent_story_title TEXT,
                    requirement_sentence TEXT,
                    epic TEXT,
                    feature TEXT,
                    project_id TEXT NOT NULL DEFAULT 'P00001',
                    title TEXT NOT NULL,
                    description TEXT,
                    domain TEXT DEFAULT 'Backend',
                    work_item_type TEXT DEFAULT 'Development',
                    priority TEXT DEFAULT 'Medium',
                    required_skills TEXT[],
                    estimated_hours NUMERIC DEFAULT 8,
                    story_points INT DEFAULT 1,
                    status TEXT DEFAULT 'Pending',
                    assigned_developer_id TEXT,
                    assigned_developer_name TEXT,
                    assigned_to TEXT DEFAULT 'Unassigned',
                    sprint_id TEXT,
                    start_date DATE,
                    end_date DATE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `);
            await client.query(`ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS story_points INT DEFAULT 1`);
            await client.query(`ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending'`);
            await client.query(`ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS parent_story_title TEXT`);
            await client.query(`ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS requirement_sentence TEXT`);
            await client.query(`ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS epic TEXT`);
            await client.query(`ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS feature TEXT`);
            await client.query(`ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS work_item_type TEXT DEFAULT 'Development'`);
            await client.query(`ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium'`);
            await client.query(`ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT 'Unassigned'`);
            await client.query(`ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS start_date DATE`);
            await client.query(`ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS end_date DATE`);
            await client.query(`ALTER TABLE public.work_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);
            await client.query(`ALTER TABLE work_items ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT 'Unassigned'`);
            await client.query(`ALTER TABLE work_items ADD COLUMN IF NOT EXISTS start_date DATE`);
            await client.query(`ALTER TABLE work_items ADD COLUMN IF NOT EXISTS end_date DATE`);
            await client.query(`ALTER TABLE work_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);
            
            // Clean up legacy titles
            await client.query(`UPDATE work_items SET title = 'Backend Development' WHERE UPPER(domain) LIKE '%BACKEND%' AND (title LIKE '%As a %' OR title LIKE '%I want%' OR title LIKE '%Implement %' OR title LIKE '%Build %')`);
            await client.query(`UPDATE work_items SET title = 'Frontend Development' WHERE UPPER(domain) LIKE '%FRONTEND%' AND (title LIKE '%As a %' OR title LIKE '%I want%' OR title LIKE '%Implement %' OR title LIKE '%Build %')`);
            await client.query(`UPDATE work_items SET title = 'QA and Testing' WHERE (UPPER(domain) LIKE '%QA%' OR UPPER(domain) LIKE '%TESTING%') AND (title LIKE '%As a %' OR title LIKE '%I want%' OR title LIKE '%Implement %' OR title LIKE '%Conduct %')`);

            // Deduplicate work items per story: Keep only 1 latest item per domain per story_id
            await client.query(`
                DELETE FROM work_items 
                WHERE ctid NOT IN (
                    SELECT ctid FROM (
                        SELECT ctid, ROW_NUMBER() OVER (
                            PARTITION BY 
                              REGEXP_REPLACE(story_id, '[^a-zA-Z0-9]', '', 'g'), 
                              CASE 
                                WHEN UPPER(domain) LIKE '%BACKEND%' THEN 'BACKEND'
                                WHEN UPPER(domain) LIKE '%FRONTEND%' THEN 'FRONTEND'
                                WHEN UPPER(domain) LIKE '%QA%' OR UPPER(domain) LIKE '%TESTING%' THEN 'QA'
                                WHEN UPPER(domain) LIKE '%DEVOPS%' THEN 'DEVOPS'
                                WHEN UPPER(domain) LIKE '%AI%' OR UPPER(domain) LIKE '%ML%' THEN 'AI'
                                ELSE UPPER(domain)
                              END
                            ORDER BY 
                              CASE WHEN status = 'approved' THEN 1 WHEN status = 'edited' THEN 2 ELSE 3 END,
                              created_at DESC, 
                              work_item_id DESC
                        ) as rn
                        FROM work_items
                    ) sub
                    WHERE sub.rn = 1
                )
            `);
            console.log('✅ Work Items table created and deduplicated.');
        } catch (wiErr) {
            console.error('ERROR creating work_items table:', wiErr);
        }
        console.log('✅ Work Items table is ready and deduplicated.');

        // ================= SEED / SYNC DEVELOPERS =================
        await client.query(`
            INSERT INTO developers (name, email, role, languages, capacity_hours, primary_domain)
            VALUES
                ('Charlie', 'charlie@example.com', 'Junior', 'HTML,CSS', 40, 'frontend'),
                ('Alice', 'alice@example.com', 'Senior', 'JavaScript,Python,SQL', 40, 'backend'),
                ('Bob', 'bob@example.com', 'Senior', 'JavaScript,React', 40, 'frontend'),
                ('David', 'david@example.com', 'Senior', 'Python,SQL,Security', 40, 'backend'),
                ('Eve', 'eve@example.com', 'Specialist', 'ML,TensorFlow,Python', 40, 'ai'),
                ('Frank Miller', 'frank@example.com', 'Senior', 'JavaScript,React,Tailwind', 40, 'frontend'),
                ('Grace Hopper', 'grace@example.com', 'Lead', 'JavaScript,React,jsPDF,CSS', 40, 'frontend'),
                ('Ian Malcolm', 'ian@example.com', 'Senior', 'JavaScript,SQL,Node.js,PostgreSQL', 40, 'backend'),
                ('Julia Roberts', 'julia@example.com', 'Senior', 'Python,SQL,Node.js,OAuth', 40, 'backend'),
                ('Laura Croft', 'laura@example.com', 'Specialist', 'Python,ML,NLP,Spacy', 40, 'ai'),
                ('Michael Scott', 'michael@example.com', 'Senior', 'Python,ML,Scikit-Learn,SVM', 40, 'ai'),
                ('Nora Allen', 'nora@example.com', 'Senior', 'QA Automation,Cypress,Selenium', 40, 'qa'),
                ('Oscar Isaac', 'oscar@example.com', 'Senior', 'Docker,DevOps,Kubernetes,AWS', 40, 'devops')
            ON CONFLICT (email) DO UPDATE SET 
                role = EXCLUDED.role,
                languages = EXCLUDED.languages,
                primary_domain = EXCLUDED.primary_domain;
        `);
        console.log('✅ Developers table seeded with full developer team.');

        console.log('✅ Database initialization complete!');
    } catch (err) {
        console.error('❌ Error connecting to Neon PostgreSQL:', err.message);
    } finally {
        if (client) client.release();
    }
})();

// ================= EXPORT POOL FOR USE IN SERVER.JS =================
module.exports = pool;

