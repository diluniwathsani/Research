const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Debug: Check if .env is loaded
console.log('📁 Current directory:', __dirname);
console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Found' : '❌ Not found');
const express = require('express');
const cors = require('cors');
const pool = require('./database');  // ← Use database.js
const { initializeDatabase } = require('./models/database');
require('dotenv').config();

const multer = require('multer');
const xlsx = require('xlsx');

// Ensure uploads directory exists cleanly
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer for Excel file uploads with absolute destination
const upload = multer({ dest: uploadsDir });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'UP', message: 'Backend service operational', timestamp: new Date().toISOString() });
});

const changeRequestRoutes = require('./routes/changeRequestRoutes');
const changeRequestController = require('./controllers/changeRequestController');
const decompositionEngine = require('./services/decompositionEngine');
const { log } = require('console');
app.use('/api/change-requests', changeRequestRoutes);
app.get('/api/projects', changeRequestController.getAllProjects);
app.get('/api/projects/:projectId/sprints', changeRequestController.getProjectSprints);

function extractDomainAndSkills(titleOrText) {
    const text = (titleOrText || '').toLowerCase();
    if (/\b(machine learning|nlp|spacy|scikit|svm|deep learning|neural network|tensorflow|pytorch|classifier|ai service|ml model|training dataset)\b/i.test(text) || (/\b(ml|ai)\b/i.test(text) && !text.includes('email') && !text.includes('detail') && !text.includes('main'))) {
        let skills = ['Python', 'ML'];
        if (text.includes('nlp') || text.includes('spacy')) skills.push('NLP');
        if (text.includes('svm') || text.includes('scikit')) skills.push('Scikit-Learn');
        return { domain: 'AI', required_domain: 'AI', skills, required_skills: skills };
    }
    if (/\b(enter|input|form|ui|ux|frontend|react|dashboard|dark mode|css|tailwind|export|pdf|excel|component|layout|view|display|screen|button|render)\b/i.test(text)) {
        let skills = ['JavaScript', 'React'];
        if (text.includes('dark mode') || text.includes('css') || text.includes('tailwind')) skills.push('Tailwind');
        if (text.includes('pdf') || text.includes('excel') || text.includes('export') || text.includes('print')) skills.push('jsPDF');
        if (text.includes('enter') || text.includes('input') || text.includes('form')) skills.push('HTML/CSS');
        return { domain: 'Frontend', required_domain: 'Frontend', skills, required_skills: skills };
    }
    if (/\b(test|qa|cypress|selenium|unit test|jest|audit check|verification|verify|validation|validate)\b/i.test(text)) {
        const skills = ['QA Automation', 'Cypress'];
        return { domain: 'QA/Testing', required_domain: 'QA/Testing', skills, required_skills: skills };
    }
    if (/\b(devops|docker|kubernetes|aws|cloud|ci\/cd|pipeline|deploy|nginx|dockerfile)\b/i.test(text)) {
        const skills = ['Docker', 'DevOps'];
        return { domain: 'DevOps', required_domain: 'DevOps', skills, required_skills: skills };
    }
    if (/\b(defect|repair|vessel|equipment|overtime|labor|labour|history|audit|version|status|approve|reject|permission|role|user|login|auth|database|sql|postgres|backend|api|server|crud|link|assign|cost|costing)\b/i.test(text)) {
        let skills = ['JavaScript', 'SQL'];
        if (text.includes('login') || text.includes('auth') || text.includes('permission') || text.includes('role')) skills.push('OAuth');
        if (text.includes('database') || text.includes('sql') || text.includes('postgres') || text.includes('history') || text.includes('audit') || text.includes('version')) skills.push('PostgreSQL');
        if (text.includes('api') || text.includes('backend') || text.includes('defect') || text.includes('repair') || text.includes('approve') || text.includes('reject')) skills.push('Node.js');
        return { domain: 'Backend', required_domain: 'Backend', skills, required_skills: skills };
    }
    const defaultSkills = ['JavaScript', 'SQL', 'Node.js'];
    return { domain: 'Backend', required_domain: 'Backend', skills: defaultSkills, required_skills: defaultSkills };
}

function getPriorityRank(p, text = '') {
    const lowerText = (text || '').toLowerCase();
    if (/\b(defect|defects|repair request|repair requests|onshore engineer|onshore engineers)\b/i.test(lowerText)) {
        return 1;
    }
    const str = (p || '').toUpperCase();
    if (str === 'CRITICAL' || str === 'HIGH') return 1;
    const isHighKw = ['security', 'auth', 'login', 'sso', 'saml', 'payment', 'crash', 'audit', 'critical', 'timeout', 'admin', 'compliance', 'access control'].some(kw => lowerText.includes(kw));
    if (isHighKw) return 1;
    if (str === 'MEDIUM') return 2;
    return 3;
}

function sortStoriesByDependencyTier(stories) {
    if (!Array.isArray(stories) || stories.length === 0) return stories;
    const sorted = [...stories];
    sorted.forEach((s, idx) => {
        const meta = analyzeProcessAndDependencyTier(s.title || s.user_story || s.requirement_sentence || '', s.description || s.acceptance_criteria || '');
        s.dependencyTier = meta.tier;
        s.dependency_tier = meta.tier;
        s.processStep = meta.processStep;
        s.process_step = meta.processStep;
        s.processGroup = meta.group;
        s.process_group = meta.group;
        s.priorityRank = getPriorityRank(s.priority, `${s.title || ''} ${s.description || ''}`);
        if (s.requirement_order === undefined || s.requirement_order === null) {
            s.requirement_order = idx + 1;
        }
    });
    // REQUIREMENT 1: Maintain original Excel requirement order throughout system
    sorted.sort((a, b) => {
        const orderA = a.requirement_order !== undefined && a.requirement_order !== null ? Number(a.requirement_order) : 999999;
        const orderB = b.requirement_order !== undefined && b.requirement_order !== null ? Number(b.requirement_order) : 999999;
        if (orderA !== orderB) return orderA - orderB;
        const idA = parseInt(String(a.story_id || a.user_story_id || a.id || '').replace(/\D/g, '')) || 0;
        const idB = parseInt(String(b.story_id || b.user_story_id || b.id || '').replace(/\D/g, '')) || 0;
        return idA - idB;
    });
    return sorted;
}

app.get('/api/sprints/:sprintId/tasks', async (req, res) => {
    try {
        const { sprintId } = req.params;
        const projectId = req.query.project_id;
        const numMatch = String(sprintId).match(/\d+/);
        const sprintNum = numMatch ? parseInt(numMatch[0], 10) : 1;
        const sprintIdFormatted = `SPR-${sprintNum < 10 ? '0' + sprintNum : sprintNum}`;

        let query = `SELECT * FROM user_stories WHERE (sprint_id = $1 OR sprint_id = $2 OR sprint_id = $3)`;
        let params = [sprintIdFormatted, String(sprintNum), `SPR-0${sprintNum}`];

        if (projectId && projectId !== 'ALL') {
            query += ` AND (project_id = $4 OR project_id = 'P00001')`;
            params.push(projectId);
        }

        let tasksRes = await pool.query(query, params);
        let tasks = tasksRes.rows || [];

        if (!tasks || tasks.length === 0) {
            const allStoriesRes = await pool.query("SELECT * FROM user_stories");
            const allStories = sortStoriesByDependencyTier(allStoriesRes.rows || []);
            const MAX_SP_PER_SPRINT = 30;
            let currentSprint = 1;
            let currentSprintPoints = 0;

            for (let i = 0; i < allStories.length; i++) {
                const story = allStories[i];
                const p = Number(story.story_points) || 5;
                if (currentSprintPoints + p > MAX_SP_PER_SPRINT && currentSprintPoints > 0) {
                    currentSprint++;
                    currentSprintPoints = 0;
                }
                currentSprintPoints += p;
                if (currentSprint === sprintNum) {
                    tasks.push(story);
                }
            }
        }

        const sortedStories = sortStoriesByDependencyTier(tasks);

        const mappedTasks = sortedStories.map((t, idx) => {
            const taskTitle = t.title || t.user_story || 'User Story Requirement';
            const parsed = extractDomainAndSkills(taskTitle);
            return {
                id: t.story_id || t.user_story_id || `US-${idx + 1}`,
                story_id: t.story_id || t.user_story_id || `US-${idx + 1}`,
                title: taskTitle,
                user_story: taskTitle,
                description: t.description || t.acceptance_criteria || '',
                priority: (t.priority || 'MEDIUM').toUpperCase(),
                hours: (Number(t.story_points) || 5) * 6,
                estimated_hours: (Number(t.story_points) || 5) * 6,
                points: Number(t.story_points) || 5,
                story_points: Number(t.story_points) || 5,
                domain: parsed.domain,
                required_domain: parsed.required_domain,
                skills: parsed.skills,
                required_skills: parsed.required_skills,
                dependency_tier: t.dependency_tier ?? 1,
                process_step: t.process_step ?? 1,
                process_group: t.process_group || 'GENERAL'
            };
        });

        res.json(mappedTasks);
    } catch (err) {
        console.error('Error fetching sprint tasks:', err);
        res.status(500).json({ error: err.message });
    }
});

// ================= REQUIREMENTS ENDPOINTS =================

/**
 * Helper: Dynamic Epics, Features, User Stories & Acceptance Criteria Generator
 * 
 * Takes a raw requirement text sentence (e.g. "The system shall allow users to edit work orders...")
 * and applies domain rules & NLP extraction to return structured software engineering artifacts:
 * - Epic: Domain theme (e.g. Work Order & Maintenance Management)
 * - Feature: Actionable business feature (e.g. Work Order Data Modification & Updates)
 * - User Story: Standard Agile format ("As a System User, I want to... so that...")
 * - Acceptance Criteria: Scenario-based Gherkin test specification (Given / When / Then)
 * - Completeness Status: RFC 2119 engineering rule check (length >= 15 & modal verbs)
 */
function generateDynamicArtifacts(reqText) {
    // 0. Clean and normalize input text & fix typos
    let cleanText = (reqText || '').trim().replace(/\.$/, '');
    cleanText = cleanText
        .replace(/\breate\b/gi, 'create')
        .replace(/\bwrok\b/gi, 'work')
        .replace(/\beork\b/gi, 'work')
        .replace(/\bdministrator\b/gi, 'administrator');

    const lower = cleanText.toLowerCase();

    // 1. Dynamic Epic Categorization & Meaningful Business Feature Extraction
    let epic = "General System Operations";
    let feature = "Core Functional Feature";

    if (/\b(permission|auth|login|access control|role|password|encrypt|sso|jwt|oauth|restrict|permitted|user account|privilege)\b/i.test(lower)) {
        epic = "User Access Control & Role Governance";
        if (/\b(restrict|permission|role|action|privilege)\b/i.test(lower)) {
            feature = "Role Permission & Action Restriction";
        } else if (/\b(login|auth|password|user account|account)\b/i.test(lower)) {
            feature = "User Access & Authentication Management";
        } else {
            feature = "Security & Access Governance";
        }
    }
    else if (/\b(defect|defects|issue|severity|priority|quality|inspection|repair|repairs|repair request)\b/i.test(lower)) {
        epic = "Defect & Quality Management";
        if (/\b(priority|severity|assign|level)\b/i.test(lower)) {
            feature = "Repair Priority & Severity Management";
        } else if (/\b(status|update|change|supervisor)\b/i.test(lower)) {
            feature = "Defect Status & Repair Tracking";
        } else if (/\b(create|manage|log|record)\b/i.test(lower)) {
            feature = "Defect Logging & Record Management";
        } else {
            feature = "Defect & Repair Management";
        }
    }
    else if (/\b(labour|labor|overtime|hourly|rate|cost|salary|timesheet|costing)\b/i.test(lower)) {
        epic = "Labour & Cost Management";
        if (/\b(overtime)\b/i.test(lower)) {
            feature = "Overtime Rules & Calculation";
        } else if (/\b(rate|cost|calculate|costing|hourly)\b/i.test(lower)) {
            feature = "Labour Rate & Cost Calculation";
        } else {
            feature = "Labour Resource Management";
        }
    }
    else if (/\b(notification|notifications|email|template|alert|cc|export|print|job card)\b/i.test(lower)) {
        epic = "Job Card & Communication Management";
        if (/\b(template|soc|approved)\b/i.test(lower)) {
            feature = "Email Template Approval";
        } else if (/\b(print|export|job card|pdf|excel)\b/i.test(lower)) {
            feature = "Job Card Export & Communication";
        } else {
            feature = "Email Notification Management";
        }
    }
    else if (/\b(rename|configuration|field|setup|field name|specifications|power rating)\b/i.test(lower)) {
        epic = "System Configuration & Equipment Setup";
        feature = "Equipment & Field Naming Configuration";
    }
    else if (/\b(vessel|equipment|material|materials|asset)\b/i.test(lower)) {
        epic = "Equipment & Vessel Asset Management";
        if (/\b(allocated|display|material|equipment)\b/i.test(lower)) {
            feature = "Equipment & Material Allocation Display";
        } else if (/\b(select|vessel|create)\b/i.test(lower)) {
            feature = "Vessel & Equipment Maintenance Log";
        } else {
            feature = "Asset & Equipment Management";
        }
    }
    else if (/\b(work order|work orders|maintenance|servicing|schedule|start date|end date|date\/time|workshop|supervisor)\b/i.test(lower) || (lower.includes('work') && lower.includes('order'))) {
        epic = "Work Order & Maintenance Management";
        if (/\b(edit|update|detail|modify|change)\b/i.test(lower)) {
            feature = "Work Order Data Modification & Updates";
        } else if (/\b(start date|end date|date\/time|schedule|time)\b/i.test(lower)) {
            feature = "Work Order Schedule & Time Entry";
        } else if (/\b(approve|approval|sign-off|manager|workshop)\b/i.test(lower)) {
            feature = "Work Order Approval Workflow";
        } else if (/\b(status|display|current)\b/i.test(lower)) {
            feature = "Work Order Status Tracking";
        } else {
            feature = "Work Order Core Processing";
        }
    }
    else if (/\b(audit|history|version|trail|search|filter|report|reports|activity|query|engineering)\b/i.test(lower)) {
        epic = "Engineering & Audit Management";
        if (/\b(search|filter|query)\b/i.test(lower)) {
            feature = "Engineering Search & Filter Querying";
        } else if (/\b(audit|history|version|trail|activity)\b/i.test(lower)) {
            feature = "Audit Trail & Version History Tracking";
        } else if (/\b(report|reports|analytics)\b/i.test(lower)) {
            feature = "Engineering Reporting & Data Analytics";
        } else {
            feature = "Engineering Activity Tracking";
        }
    }

    // 3. Dynamic Agile User Story Construction
    let action = cleanText;
    let goal = `the ${feature.toLowerCase()} is executed correctly`;

    for (const indicator of ["so that", "in order to", "to ensure", "to allow"]) {
        if (lower.includes(indicator)) {
            const parts = cleanText.split(new RegExp(indicator, "i"));
            action = parts[0].trim();
            goal = parts[1].trim();
            break;
        }
    }

    let actor = 'System User';
    let cleanAction = action;

    // Direct Role Phrase Matching (Highest Priority)
    const roleList = [
        'onshore engineer', 'onshore engineers',
        'workshop manager', 'workshop managers',
        'project manager', 'project managers',
        'team member', 'team members',
        'supervisor', 'supervisors',
        'administrator', 'administrators', 'admin',
        'system user', 'system users',
        'engineer', 'engineers',
        'manager', 'managers',
        'user', 'users'
    ];

    for (const role of roleList) {
        const roleRegex = new RegExp(`^(?:The|A|An)?\\s*${role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (roleRegex.test(cleanAction)) {
            actor = role;
            cleanAction = cleanAction.replace(roleRegex, '').trim();
            break;
        }
    }

    actor = actor.trim();
    if (actor.toLowerCase().endsWith('s') && !actor.toLowerCase().endsWith('ss') && !actor.toLowerCase().endsWith('us')) {
        actor = actor.slice(0, -1);
    }
    actor = actor.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    cleanAction = cleanAction
        .replace(/^as a system user, i want to /i, '')
        .replace(/^as a [a-z0-9\s]+, i want to /i, '')
        .replace(/^the system shall /i, '')
        .replace(/^the system must /i, '')
        .replace(/^the platform shall /i, '')
        .replace(/^the platform must /i, '')
        .replace(/^users shall /i, '')
        .replace(/^users must /i, '')
        .replace(/^need to /i, '')
        .replace(/^needs to /i, '')
        .replace(/^shall be able to /i, '')
        .replace(/^must be able to /i, '')
        .replace(/^is required to /i, '')
        .replace(/^are required to /i, '')
        .replace(/^shall /i, '')
        .replace(/^must /i, '')
        .replace(/^can /i, '')
        .replace(/^should /i, '')
        .replace(/^will /i, '')
        .replace(/^the\s+/i, '')
        .trim();

    const actionVerbs = ['create', 'creates', 'manage', 'manages', 'enter', 'enters', 'allow', 'allows', 'display', 'displays', 'show', 'shows', 'record', 'records', 'approve', 'approves', 'reject', 'rejects', 'update', 'updates', 'select', 'selects', 'assign', 'assigns', 'maintain', 'maintains', 'calculate', 'calculates', 'provide', 'provides', 'support', 'supports', 'store', 'stores', 'obtain', 'obtains', 'use', 'uses', 'view', 'views', 'export', 'exports', 'include', 'includes', 'restrict', 'restricts', 'send', 'sends', 'filter', 'filters', 'search', 'searches'];
    const wordsInAction = cleanAction.toLowerCase().split(/\s+/);
    const hasVerb = actionVerbs.some(v => wordsInAction.includes(v));
    if (!hasVerb) {
        cleanAction = 'create and manage ' + cleanAction;
    }

    const verbUninflectMap = {
        'enters': 'enter', 'approves': 'approve', 'rejects': 'reject', 'assigns': 'assign',
        'updates': 'update', 'selects': 'select', 'maintains': 'maintain', 'calculates': 'calculate',
        'provides': 'provide', 'allows': 'allow', 'supports': 'support', 'displays': 'display',
        'stores': 'store', 'obtains': 'obtain', 'uses': 'use', 'creates': 'create', 'manages': 'manage',
        'searches': 'search'
    };
    const firstWord = cleanAction.split(/\s+/)[0]?.toLowerCase() || '';
    if (verbUninflectMap[firstWord]) {
        cleanAction = verbUninflectMap[firstWord] + cleanAction.slice(firstWord.length);
    }

    cleanAction = cleanAction.replace(/\.+$/, '').trim();
    goal = goal.replace(/\.+$/, '').trim();
    const article = ['a', 'e', 'i', 'o', 'u'].includes(actor.charAt(0).toLowerCase()) ? 'an' : 'a';
    const userStory = `As ${article} ${actor}, I want to ${cleanAction.charAt(0).toLowerCase() + cleanAction.slice(1)} so that ${goal}.`;

    // 4. Dynamic Acceptance Criteria Generation (Gherkin Format)
    const acceptanceCriteria = 
        `Scenario: Verify ${feature}\n` +
        `1. Given the system is operational and ready for ${feature.toLowerCase()}\n` +
        `2. When the ${actor.toLowerCase()} performs: ${cleanAction.toLowerCase()}\n` +
        `3. Then the system must validate the input according to ${epic.toLowerCase()} rules\n` +
        `4. And the ${feature.toLowerCase()} records should be updated successfully.`;

    // 5. RFC 2119 Engineering Completeness Rule Evaluation
    const completenessStatus = cleanText.length >= 15 ? 'Complete' : 'Incomplete: Needs refinement';

    return {
        epic,
        feature,
        userStory,
        acceptanceCriteria,
        completenessStatus
    };
}

/**
 * Endpoint: POST /api/upload
 * Purpose: Handles Excel/CSV file upload, registers new projects, and performs high-speed vector batch insertion
 * into PostgreSQL tables ('requirements' and 'user_stories').
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    let client = null;
    try {
        const { batch_name, project_name } = req.body;
        
        // Read uploaded Excel sheet using 'xlsx' parser
        const workbook = xlsx.readFile(req.file.path);
        if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
            return res.status(400).json({ error: 'Invalid or empty Excel file' });
        }
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!Array.isArray(data) || data.length === 0) {
            return res.status(400).json({ error: 'Spreadsheet contains no data rows' });
        }

        const uploadTime = new Date().toISOString();
        client = await pool.connect();
        const effectiveProjectName = (project_name || batch_name || 'Aurora ERP System').trim();
        const effectiveProjectId = `P${Date.now().toString().slice(-6)}`;

        // Step A: Register new Project in database
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS public.projects (
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
                )
            `);
            // Step A: Register Project entry into public.projects database table
            await pool.query(
                `INSERT INTO public.projects (project_id, project_name, description, project_manager, team_size, progress_percent, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (project_id) DO UPDATE SET project_name = EXCLUDED.project_name`,
                [effectiveProjectId, effectiveProjectName, 'Uploaded from Development Artifact Module', 'Unassigned', 8, 30, 'ACTIVE']
            );

            // Step B: Auto-create default sprint entries in public.sprints table
            try {
                await pool.query(`
                    CREATE TABLE IF NOT EXISTS public.sprints (
                        sprint_id TEXT PRIMARY KEY,
                        project_id TEXT NOT NULL,
                        sprint_name TEXT NOT NULL,
                        sprint_number INTEGER NOT NULL,
                        status TEXT NOT NULL DEFAULT 'PENDING',
                        start_date DATE,
                        end_date DATE,
                        capacity_story_points INTEGER DEFAULT 40,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                await pool.query(`
                    INSERT INTO public.sprints (sprint_id, project_id, sprint_name, sprint_number, status, capacity_story_points)
                    VALUES 
                    ('SPR-01', $1, 'Sprint 1 - Core Development', 1, 'ACTIVE', 30),
                    ('SPR-02', $1, 'Sprint 2 - Refinement & Integration', 2, 'PENDING', 30)
                    ON CONFLICT (sprint_id) DO NOTHING
                `, [effectiveProjectId]);
            } catch (spErr) {
                console.warn('Notice creating project sprints:', spErr.message);
            }
        } catch (pErr) {
            console.warn('Notice saving uploaded project:', pErr.message);
        }

        try {
            // Step C: Begin database transaction for requirement batch ingestion
            await client.query('BEGIN');

            // Step D: Defensive auto-creation check for requirements & user_stories tables
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
            await client.query(`ALTER TABLE public.user_stories ADD COLUMN IF NOT EXISTS project_id TEXT DEFAULT 'P00001'`);
            await client.query(`ALTER TABLE public.user_stories ADD COLUMN IF NOT EXISTS requirement_order INTEGER DEFAULT 1`);
            await client.query(`ALTER TABLE public.user_stories ADD COLUMN IF NOT EXISTS assigned_to TEXT DEFAULT 'Unassigned'`);

            // Step E: Loop over Excel data rows to extract requirement text and generate artifacts
            const reqBatch = [];
            let rowSeq = 1;
            for (const row of data) {
                let reqText = '';
                
                // Inspect cell keys for requirement sentence text
                for (const key of Object.keys(row)) {
                    const lowerKey = key.toLowerCase();
                    const val = row[key];
                    if (val !== undefined && val !== null && String(val).trim().length > 0) {
                        if (lowerKey.includes('sentence') || lowerKey.includes('description') || lowerKey.includes('requirement') || lowerKey.includes('user story') || lowerKey.includes('story') || lowerKey.includes('text') || lowerKey.includes('spec')) {
                            reqText = String(val).trim();
                            break;
                        }
                    }
                }

                // Fallback: Pick longest string cell if no standard column title matched
                if (!reqText) {
                    const values = Object.values(row)
                        .filter(v => v !== undefined && v !== null)
                        .map(v => String(v).trim())
                        .filter(v => v.length > 0);
                    if (values.length > 0) {
                        values.sort((a, b) => b.length - a.length);
                        reqText = values[0];
                    }
                }

                // Generate artifacts if non-empty requirement sentence was found
                if (reqText && reqText.length > 0) {
                    const artifacts = generateDynamicArtifacts(reqText);
                    reqBatch.push({ reqText, artifacts, requirement_order: rowSeq++ });
                }
            }

            // Step F: Execute High-Performance Multi-Row Batch Insertion if batch has items
            if (reqBatch.length > 0) {
                // Construct parameterized query for public.requirements (1 single network roundtrip)
                const reqPlaceholders = [];
                const reqParams = [];
                reqBatch.forEach((item, i) => {
                    const base = i * 10;
                    reqPlaceholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`);
                    reqParams.push(
                        item.reqText,
                        item.artifacts.completenessStatus,
                        item.artifacts.epic,
                        item.artifacts.feature,
                        item.artifacts.userStory,
                        item.artifacts.acceptanceCriteria,
                        uploadTime,
                        effectiveProjectName,
                        effectiveProjectId,
                        item.requirement_order
                    );
                });

                // Execute requirements multi-row insert and retrieve inserted primary keys & order
                const reqRes = await client.query(
                    `INSERT INTO public.requirements (requirement_sentence, completeness_status, epic, feature, user_story, acceptance_criteria, created_at, batch_name, project_id, requirement_order)
                     VALUES ${reqPlaceholders.join(', ')} RETURNING id, requirement_order`,
                    reqParams
                );

                // Step G: Partition user stories using Process-Tier Dependency Allocator
                const insertedRows = reqRes.rows || [];
                if (insertedRows.length > 0) {
                    const uploadStories = insertedRows.map((row, i) => {
                        const item = reqBatch[i] || reqBatch[0];
                        const points = Math.min(8, Math.max(2, Math.round((item.reqText || '').length / 18)));
                        return {
                            story_id: `US-${row.id}`,
                            user_story_id: `US-${row.id}`,
                            title: item.artifacts.userStory,
                            description: item.artifacts.acceptanceCriteria,
                            story_points: points,
                            priority: points >= 5 ? 'HIGH' : 'MEDIUM',
                            requirement_order: row.requirement_order || item.requirement_order || (i + 1)
                        };
                    });

                    // Sort stories by process tier and dependency order
                    const sortedUploadStories = sortStoriesByDependencyTier(uploadStories);

                    // Allocate into 2-week capacity sprints (Max 30 SP)
                    const MAX_SP_PER_SPRINT = 30;
                    let currentSprint = 1;
                    let currentSprintPoints = 0;

                    sortedUploadStories.forEach(story => {
                        const p = story.story_points;
                        if (currentSprintPoints + p > MAX_SP_PER_SPRINT && currentSprintPoints > 0) {
                            currentSprint++;
                            currentSprintPoints = 0;
                        }
                        currentSprintPoints += p;
                        story.sprint_id = `SPR-${currentSprint < 10 ? '0' + currentSprint : currentSprint}`;
                    });

                    // Auto-create missing sprint entries in public.sprints before inserting user_stories
                    for (let sNum = 1; sNum <= currentSprint; sNum++) {
                        const sprintCode = `SPR-${sNum < 10 ? '0' + sNum : sNum}`;
                        try {
                            await client.query(`
                                INSERT INTO public.sprints (sprint_id, project_id, sprint_name, sprint_number, status, capacity_story_points)
                                VALUES 
                                ($1, $2, $3, $4, $5, 30)
                                ON CONFLICT (sprint_id) DO UPDATE SET project_id = EXCLUDED.project_id
                            `, [sprintCode, effectiveProjectId, `Sprint ${sNum}`, sNum, sNum === 1 ? 'ACTIVE' : 'PENDING']);
                        } catch (sErr) {
                            console.warn(`Notice creating sprint ${sprintCode}:`, sErr.message);
                        }
                    }

                    const storyPlaceholders = [];
                    const storyParams = [];
                    sortedUploadStories.forEach((s, i) => {
                        const base = i * 11;
                        storyPlaceholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11})`);
                        storyParams.push(
                            s.story_id,
                            s.user_story_id,
                            effectiveProjectId,
                            s.sprint_id,
                            s.title,
                            s.description,
                            s.story_points,
                            s.priority,
                            'IN_PROGRESS',
                            'Unassigned',
                            s.requirement_order
                        );
                    });

                    // Execute user_stories multi-row insert with ON CONFLICT resolution
                    await client.query(
                        `INSERT INTO public.user_stories (story_id, user_story_id, project_id, sprint_id, title, description, story_points, priority, status, assigned_to, requirement_order)
                         VALUES ${storyPlaceholders.join(', ')}
                         ON CONFLICT (story_id) DO UPDATE SET 
                         project_id = EXCLUDED.project_id,
                         sprint_id = EXCLUDED.sprint_id,
                         title = EXCLUDED.title,
                         description = EXCLUDED.description,
                         story_points = EXCLUDED.story_points,
                         requirement_order = EXCLUDED.requirement_order`,
                        storyParams
                    );
                }
            }

            // Step H: Commit database transaction
            await client.query('COMMIT');

            // Clean up temporary upload file from disk
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (e) {}
            }

            res.json({ message: 'File uploaded and project created successfully', project_id: effectiveProjectId, project_name: effectiveProjectName });
        } catch (dbErr) {
            // Rollback transaction on database error
            if (client) await client.query('ROLLBACK');
            console.error('Upload DB error:', dbErr);
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (e) {}
            }
            res.status(500).json({ error: dbErr.message || 'Failed to insert requirements into database' });
        }
    } catch (err) {
        console.error('File process error:', err);
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) {}
        }
        res.status(500).json({ error: err.message || 'Failed to process file' });
    } finally {
        if (client) client.release();
    }
});

// Get Requirements
app.get('/api/requirements', async (req, res) => {
    const { project_id } = req.query;
    try {
        await pool.query("ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS project_id TEXT DEFAULT 'P00001'");
        await pool.query("ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS requirement_order INTEGER DEFAULT 1");
        if (project_id) {
            const result = await pool.query(
                "SELECT * FROM requirements WHERE project_id = $1 OR project_id = $2 OR $1 = '' ORDER BY requirement_order ASC, id ASC",
                [project_id, `P${project_id}`]
            );
            if (result.rows && result.rows.length > 0) {
                return res.json(result.rows);
            }
        }
        const allResult = await pool.query("SELECT * FROM requirements ORDER BY requirement_order ASC, id ASC");
        res.json(allResult.rows || []);
    } catch (err) {
        console.warn('Notice querying requirements table:', err.message);
        res.json([]);
    }
});

// Update a requirement manually
app.put('/api/requirements/:id', async (req, res) => {
    const { requirement_sentence } = req.body;
    try {
        await pool.query(
            "UPDATE requirements SET requirement_sentence = $1, completeness_status = 'Completed by User' WHERE id = $2",
            [requirement_sentence, req.params.id]
        );
        res.json({ message: 'Requirement updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Rename a Batch
app.put('/api/batches/:timestamp', async (req, res) => {
    const { batch_name } = req.body;
    const { timestamp } = req.params;

    try {
        const result = await pool.query(
            "UPDATE requirements SET batch_name = $1 WHERE created_at = $2",
            [batch_name, timestamp]
        );
        res.json({ message: 'Batch renamed successfully', count: result.rowCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Process Requirements (NLP & Generation)
app.post('/api/process', async (req, res) => {
    log(req.body);
    try {
        const result = await pool.query("SELECT id, requirement_sentence, requirement_order FROM requirements ORDER BY requirement_order ASC, id ASC");
        const rows = result.rows;

        if (rows.length === 0) return res.status(400).json({ error: 'No requirements found' });

        const sentences = rows.map(r => r.requirement_sentence);
        const scriptPath = path.join(__dirname, 'ml_model', 'ai_service.py');

        const { spawn } = require('child_process');
        const pythonProcess = spawn('python', [scriptPath, 'process']);
        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', async (code) => {
            if (code !== 0) {
                console.error("Python script error:", stderr);
                const fallbackResults = rows.map(r => {
                    const artifacts = generateDynamicArtifacts(r.requirement_sentence);
                    return {
                        id: r.id,
                        requirement: r.requirement_sentence,
                        status: artifacts.completenessStatus,
                        epic: artifacts.epic,
                        feature: artifacts.feature,
                        user_story: artifacts.userStory,
                        acceptance_criteria: artifacts.acceptanceCriteria,
                        requirement_order: r.requirement_order || r.id
                    };
                });

                await updateDatabase(fallbackResults, res);
                return;
            }

            try {
                const results = JSON.parse(stdout);
                const idLookup = {};
                rows.forEach(r => {
                    if (r.requirement_sentence) {
                        idLookup[r.requirement_sentence.trim()] = r.id;
                    }
                });

                const finalResults = results.map((resultItem, idx) => {
                    const cleanReq = (resultItem.requirement || '').trim();
                    const matchedRow = rows.find(r => (r.requirement_sentence || '').trim() === cleanReq) || rows[idx];
                    const foundId = matchedRow ? matchedRow.id : (idx + 1);
                    const reqOrder = matchedRow ? (matchedRow.requirement_order || idx + 1) : (idx + 1);
                    return {
                        ...resultItem,
                        id: foundId,
                        requirement_order: reqOrder
                    };
                });

                log("finalResults ===============================");
                log(finalResults);
                log("finalResults ===============================");
                await updateDatabase(finalResults, res);

            } catch (parseErr) {
                console.error("Parse error:", parseErr, stdout);
                res.status(500).json({ error: 'Failed to parse AI service output' });
            }
        });

        pythonProcess.stdin.write(JSON.stringify(sentences));
        pythonProcess.stdin.end();

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

async function updateDatabase(results, res) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (let idx = 0; idx < results.length; idx++) {
            const r = results[idx];
            const targetId = r.id || (idx + 1);
            const reqOrder = r.requirement_order || (idx + 1);

            await client.query(
                `UPDATE requirements 
                 SET completeness_status = $1, 
                     epic = $2, feature = $3, user_story = $4, acceptance_criteria = $5,
                     requirement_order = $6
                 WHERE id = $7 OR requirement_sentence = $8`,
                [
                    r.status || 'Complete',
                    r.epic || '',
                    r.feature || '',
                    r.user_story || '',
                    r.acceptance_criteria || '',
                    reqOrder,
                    targetId,
                    r.requirement || ''
                ]
            );

            // Save generated user story into user_stories table for cross-module integration
            if (r.user_story && r.user_story !== 'Pending') {
                try {
                    await client.query(
                        `INSERT INTO user_stories (story_id, user_story_id, project_id, sprint_id, title, description, story_points, priority, status, assigned_to, requirement_order)
                         VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                         ON CONFLICT (story_id) DO UPDATE SET
                         title = EXCLUDED.title,
                         description = EXCLUDED.description,
                         requirement_order = EXCLUDED.requirement_order`,
                        [
                            `US-${targetId}`,
                            'P00001',
                            'SPR-01',
                            r.user_story,
                            r.acceptance_criteria || r.requirement || '',
                            5,
                            'Medium',
                            'IN_PROGRESS',
                            'Unassigned',
                            reqOrder
                        ]
                    );
                } catch (storyErr) {
                    console.warn('Notice saving user story to DB:', storyErr.message);
                }
            }
        }
        await client.query('COMMIT');

        // Save final response results to a .json file named with current date and time for debugging
        try {
            const now = new Date();
            const dateStr = now.toISOString().replace(/[:.]/g, '-');
            const fileName = `final_results_${dateStr}.json`;
            const filePath = path.join(__dirname, fileName);
            fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
            console.log(`📁 Debug JSON file saved successfully: ${filePath}`);
        } catch (fsErr) {
            console.error("❌ Error saving debug JSON file:", fsErr.message);
        }

        res.json({ message: "Processing complete", count: results.length, data: results, results: results });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("DB Update Error:", err);
        res.status(500).json({ error: "DB Update Failed" });
    } finally {
        client.release();
    }
}

// Export batch to Excel
app.get('/api/export/batch', async (req, res) => {
    let { timestamp } = req.query;

    try {
        if (!timestamp) {
            const latestRes = await pool.query("SELECT created_at FROM requirements ORDER BY id DESC LIMIT 1");
            if (latestRes.rows.length > 0) {
                timestamp = latestRes.rows[0].created_at;
            } else {
                return res.status(200).json({ success: true, count: 0, data: [], message: 'No requirements found to export' });
            }
        }

        const result = await pool.query("SELECT * FROM requirements WHERE created_at = $1 ORDER BY requirement_order ASC, id ASC", [timestamp]);
        const rows = result.rows;
        if (rows.length === 0) return res.status(200).json({ success: true, count: 0, data: [], message: 'No requirements found for this batch' });

        const worksheet = xlsx.utils.json_to_sheet(rows);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "Batch Artifacts");

        const fileName = `requirement_set_${timestamp.replace(/[:.]/g, '-')}.xlsx`;
        const filePath = path.join(__dirname, fileName);
        xlsx.writeFile(workbook, filePath);

        res.download(filePath, (downloadErr) => {
            if (!downloadErr) {
                const fs = require('fs');
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Export all to Excel
app.get('/api/export', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM requirements ORDER BY requirement_order ASC, id ASC");
        const rows = result.rows;

        const worksheet = xlsx.utils.json_to_sheet(rows);
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, "All Artifacts");

        const filePath = path.join(__dirname, 'all_requirements.xlsx');
        xlsx.writeFile(workbook, filePath);

        res.download(filePath);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});


// ================= SKILL MATCHING HELPER =================

function calculateSkillMatchScore(developerSkills, requiredSkills) {
    // If there are no required skills, any developer is a 100% match
    if (!requiredSkills || requiredSkills.length === 0) {
        return 100;
    }
    // If required skills exist but developer has no skills, match is 0%
    if (!developerSkills || developerSkills.length === 0) {
        return 0;
    }

    // Normalize developer skills into a consistent array of trimmed, lowercase strings
    let devSkillArray = [];
    if (Array.isArray(developerSkills)) {
        devSkillArray = developerSkills.map(s => s.trim().toLowerCase());
    } else if (typeof developerSkills === 'string') {
        devSkillArray = developerSkills.split(',').map(s => s.trim().toLowerCase());
    } else {
        devSkillArray = [];
    }

    const requiredLower = requiredSkills.map(s => s.trim().toLowerCase());

    let matched = 0;
    for (const req of requiredLower) {
        if (devSkillArray.includes(req)) {
            matched++;
        }
    }

    const score = (matched / requiredSkills.length) * 100;
    return Math.round(score);
}

// ================= PROJECTS =================

app.get('/api/projects', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.projects (
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
            )
        `);
        const result = await pool.query("SELECT project_id, project_name, description, project_manager, status FROM public.projects WHERE UPPER(status) IN ('ACTIVE', 'IN_PROGRESS', 'PLANNING') ORDER BY project_name ASC");
        if (result.rows && result.rows.length > 0) {
            const mapped = result.rows.map((p, idx) => ({
                id: p.project_id || idx + 1,
                project_id: p.project_id || `P0000${idx + 1}`,
                name: p.project_name,
                project_name: p.project_name,
                description: p.description,
                project_manager: p.project_manager,
                status: p.status
            }));
            return res.json(mapped);
        }
    } catch (err) {
        console.warn("⚠️ Projects DB fetch notice:", err.message);
    }
    res.json([]);
});

// ================= SPRINTS =================

app.get('/api/projects/:projectId/sprints', async (req, res) => {
    const projectIdParam = req.params.projectId;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.sprints (
                sprint_id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                sprint_name TEXT NOT NULL,
                sprint_number INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING',
                start_date DATE,
                end_date DATE,
                capacity_story_points INTEGER DEFAULT 40,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        const result = await pool.query(
            "SELECT sprint_id, sprint_name, sprint_number, project_id, status FROM sprints WHERE project_id = $1 OR project_id = $2 OR $1 = '1' ORDER BY sprint_number ASC",
            [projectIdParam, `P0000${projectIdParam}`]
        );
        if (result.rows && result.rows.length > 0) {
            const mapped = result.rows.map(s => ({
                id: s.sprint_id,
                sprint_id: s.sprint_id,
                name: s.sprint_name,
                sprint_name: s.sprint_name,
                projectId: s.project_id,
                status: s.status
            }));
            return res.json(mapped);
        }
    } catch (err) {
        console.warn("⚠️ Sprints DB fetch notice:", err.message);
    }
    res.json([]);
});

app.put('/api/sprints/:sprintId/status', async (req, res) => {
    const { sprintId } = req.params;
    const { status } = req.body;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.sprints (
                sprint_id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                sprint_name TEXT NOT NULL,
                sprint_number INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'PENDING',
                capacity_story_points INTEGER DEFAULT 30,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(
            "UPDATE public.sprints SET status = $1 WHERE sprint_id = $2 OR sprint_id = $3",
            [status, sprintId, `SPR-0${sprintId}`]
        );

        console.log(`✅ Sprint ${sprintId} status updated to ${status}`);
        res.json({ success: true, sprint_id: sprintId, status });
    } catch (err) {
        console.error('Error updating sprint status:', err);
        res.status(500).json({ error: err.message });
    }
});

// Tasks endpoint is defined above using process-tier dependency ordering

// ================= DEVELOPERS CRUD =================

app.get('/api/developers', async (req, res) => {
    const { project_id } = req.query;
    try {
        const result = await pool.query('SELECT * FROM developers ORDER BY name');

        // Fetch cross-project allocation commitments from PostgreSQL
        let commitmentsMap = {};
        try {
            const allocQuery = await pool.query(`
                SELECT a.developer_id, u.project_id, SUM(a.allocated_hours) as project_hours 
                FROM allocations a 
                LEFT JOIN user_stories u ON a.story_id = u.story_id 
                GROUP BY a.developer_id, u.project_id
            `);
            (allocQuery.rows || []).forEach(r => {
                const devId = String(r.developer_id);
                if (!commitmentsMap[devId]) commitmentsMap[devId] = [];
                commitmentsMap[devId].push({
                    project_id: r.project_id || 'P00001',
                    hours: Number(r.project_hours) || 0
                });
            });
        } catch (allocErr) {
            console.warn('Notice loading developer commitments:', allocErr.message);
        }

        const developers = result.rows.map(dev => {
            const devIdStr = String(dev.id);
            const commitments = commitmentsMap[devIdStr] || [];
            const capacity = Number(dev.capacity_hours) || 40;

            const otherProjectHours = commitments
                .filter(c => project_id && String(c.project_id) !== String(project_id))
                .reduce((sum, c) => sum + c.hours, 0);

            const totalHours = commitments.reduce((sum, c) => sum + c.hours, 0);

            return {
                ...dev,
                languages: dev.languages ? dev.languages.split(',') : [],
                project_commitments: commitments,
                other_project_hours: otherProjectHours,
                total_allocated_hours: totalHours,
                available_capacity_hours: Math.max(0, capacity - otherProjectHours),
                is_fully_allocated: otherProjectHours >= capacity
            };
        });
        res.json(developers);
    } catch (error) {
        console.error('Error fetching developers:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================= SIMPLIFIED ALLOCATION FUNCTION =================

function allocateTasks(tasks, developers, currentProjectId) {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    // Sort tasks by priority
    const sortedTasks = [...tasks].sort((a, b) =>
        (priorityOrder[(a.priority || 'MEDIUM').toUpperCase()] ?? 2) - (priorityOrder[(b.priority || 'MEDIUM').toUpperCase()] ?? 2)
    );

    // Prepare developers with capacity tracking & cross-project limits
    let devs = developers.map(dev => {
        const capacity = Number(dev.capacity_hours) || 40;
        const commitments = dev.project_commitments || [];
        const otherProjectHours = commitments
            .filter(c => currentProjectId && String(c.project_id) !== String(currentProjectId))
            .reduce((sum, c) => sum + (Number(c.hours) || 0), 0);

        const availableCrossProject = Math.max(0, capacity - otherProjectHours);

        return {
            ...dev,
            capacity_hours: capacity,
            other_project_hours: otherProjectHours,
            remaining: availableCrossProject, // Available capacity for tasks in this project
            is_fully_allocated_elsewhere: otherProjectHours >= capacity,
            primary_domain: (dev.primary_domain || 'general').toLowerCase(),
            languages: Array.isArray(dev.languages) ? dev.languages : (dev.languages ? String(dev.languages).split(',').map(s => s.trim()) : [])
        };
    });

    const assignments = [];

    for (const task of sortedTasks) {
        const estHours = Number(task.estimated_hours) || (Number(task.story_points) ? Number(task.story_points) * 6 : 16);
        const rawNeededDomain = (task.required_domain || task.domain || 'general').toLowerCase();
        const neededDomain = rawNeededDomain.includes('qa') ? 'qa' : rawNeededDomain;
        const requiredSkills = task.required_skills || task.skills || [];

        // Calculate Skill Match Score for all candidates
        const candidates = devs.map(dev => {
            const devDomain = dev.primary_domain;
            const domainOk = devDomain === neededDomain || 
                             neededDomain.includes(devDomain) || 
                             devDomain.includes(neededDomain) || 
                             neededDomain === 'general' || 
                             devDomain === 'general';
            return {
                ...dev,
                domainOk,
                skillScore: calculateSkillMatchScore(dev.languages, requiredSkills)
            };
        });

        // RULE: Exclude developers who are 100% fully allocated to another project!
        let availableCandidates = candidates.filter(dev => !dev.is_fully_allocated_elsewhere && dev.remaining > 0);

        if (availableCandidates.length === 0) {
            availableCandidates = candidates.filter(dev => dev.remaining > 0);
        }

        if (availableCandidates.length === 0) {
            availableCandidates = candidates.filter(dev => !dev.is_fully_allocated_elsewhere);
        }

        if (availableCandidates.length === 0) {
            availableCandidates = [...candidates];
        }

        // Priority 1: Domain Match AND Enough Remaining Capacity for this task
        let validCandidates = availableCandidates.filter(dev => dev.domainOk && dev.remaining >= estHours);

        // Priority 2: Any Domain WITH Enough Remaining Capacity for this task
        if (validCandidates.length === 0) {
            validCandidates = availableCandidates.filter(dev => dev.remaining >= estHours);
        }

        // Priority 3: Domain Match WITH Partial Remaining Capacity
        if (validCandidates.length === 0) {
            validCandidates = availableCandidates.filter(dev => dev.domainOk && dev.remaining > 0);
        }

        // Priority 4: Any Developer WITH Partial Capacity
        if (validCandidates.length === 0) {
            validCandidates = availableCandidates.filter(dev => dev.remaining > 0);
        }

        if (validCandidates.length === 0) {
            validCandidates = [...availableCandidates];
        }

        // ================= ML PREDICTED COMPLEXITY SCORING ENGINE =================
        // Extract ML Predicted Complexity: HIGH, MEDIUM, or LOW
        let rawComplexity = task.predicted_complexity || task.complexity;
        if (!rawComplexity) {
            const sp = Number(task.story_points) || 0;
            const hrs = Number(task.estimated_hours) || 0;
            if (sp >= 8 || hrs >= 12) rawComplexity = 'HIGH';
            else if (sp >= 5 || hrs >= 8) rawComplexity = 'MEDIUM';
            else rawComplexity = 'LOW';
        }
        const predictedComplexity = String(rawComplexity).toUpperCase();

        // Calculate Complexity Suitability Score & Composite Score for candidates
        validCandidates.forEach(dev => {
            const roleStr = (dev.role || '').toLowerCase();
            const langCount = Array.isArray(dev.languages) ? dev.languages.length : 0;

            // Determine Developer Expertise / Specialization Level
            const isSeniorOrSpecialist = roleStr.includes('senior') || roleStr.includes('lead') || roleStr.includes('principal') || roleStr.includes('architect') || langCount >= 3;
            const isJunior = roleStr.includes('junior') || roleStr.includes('intern') || roleStr.includes('associate');

            // 1. Complexity Suitability Score (0 - 100) based on ML predicted complexity
            let complexityScore = 70; // default baseline score
            if (predictedComplexity === 'HIGH') {
                // HIGH complexity task: prefer Senior / Specialist developers for difficult tasks
                complexityScore = isSeniorOrSpecialist ? 100 : (isJunior ? 30 : 60);
            } else if (predictedComplexity === 'MEDIUM') {
                // MEDIUM complexity task: prefer Standard / Mid-level developers
                complexityScore = isSeniorOrSpecialist ? 85 : (isJunior ? 70 : 100);
            } else if (predictedComplexity === 'LOW') {
                // LOW complexity task: prefer Mid/Junior developers to preserve Senior capacity for difficult tasks
                complexityScore = isJunior ? 100 : (!isSeniorOrSpecialist ? 90 : 70);
            }

            // 2. Domain Suitability Score (0 - 100)
            const domainScore = dev.primary_domain === neededDomain ? 100 : (dev.domainOk ? 75 : 50);

            // 3. Capacity Availability Score (0 - 100)
            const capScore = dev.capacity_hours > 0 ? Math.min(100, (dev.remaining / dev.capacity_hours) * 100) : 50;

            // 4. Weighted Final Composite Score:
            // Formula: Skill Score (35%) + Complexity Suitability (30%) + Domain Match (20%) + Capacity (15%)
            dev.complexityScore = complexityScore;
            dev.compositeScore = (
                (dev.skillScore * 0.35) + 
                (complexityScore * 0.30) + 
                (domainScore * 0.20) + 
                (capScore * 0.15)
            );
        });

        // Sort candidates: Highest Weighted Composite Score FIRST, then highest remaining capacity
        validCandidates.sort((a, b) => {
            if (Math.abs(b.compositeScore - a.compositeScore) > 0.01) {
                return b.compositeScore - a.compositeScore;
            }
            if (a.remaining !== b.remaining) return b.remaining - a.remaining;
            return b.skillScore - a.skillScore;
        });

        const chosen = validCandidates[0];
        const targetDevInMainList = devs.find(d => d.id === chosen.id);
        const maxDevCap = targetDevInMainList ? targetDevInMainList.remaining : 40;
        const allocHours = Math.min(estHours, maxDevCap > 0 ? maxDevCap : estHours);

        if (targetDevInMainList) {
            targetDevInMainList.remaining = Math.max(0, targetDevInMainList.remaining - allocHours);
        }

        assignments.push({
            story_id: task.story_id || task.id,
            title: task.title || task.user_story || 'User Story Requirement',
            developer_id: chosen.id,
            developer_name: chosen.name,
            allocated_hours: allocHours,
            predicted_complexity: predictedComplexity,
            matched_domain: neededDomain,
            skill_match_score: chosen.skillScore,
            complexity_suitability_score: Math.round(chosen.complexityScore),
            composite_allocation_score: Math.round(chosen.compositeScore)
        });
    }

    return assignments;
}

// ================= RUN ALLOCATION =================

app.post('/api/allocate', async (req, res) => {
    try {
        const { tasks, sprint_id, project_id } = req.body;
        if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
            return res.status(400).json({ error: 'No tasks provided' });
        }

        // Load developers from PostgreSQL
        const result = await pool.query(
            'SELECT id, name, role, capacity_hours, primary_domain, languages FROM developers'
        );

        const developers = result.rows;

        if (developers.length === 0) {
            return res.status(400).json({ error: 'No developers found' });
        }

        // Load cross-project commitments map
        let commitmentsMap = {};
        try {
            const allocQuery = await pool.query(`
                SELECT a.developer_id, u.project_id, SUM(a.allocated_hours) as project_hours 
                FROM allocations a 
                LEFT JOIN user_stories u ON a.story_id = u.story_id 
                GROUP BY a.developer_id, u.project_id
            `);
            (allocQuery.rows || []).forEach(r => {
                const devId = String(r.developer_id);
                if (!commitmentsMap[devId]) commitmentsMap[devId] = [];
                commitmentsMap[devId].push({
                    project_id: r.project_id || 'P00001',
                    hours: Number(r.project_hours) || 0
                });
            });
        } catch (e) {}

        const devListWithCommitments = developers.map(d => ({
            ...d,
            project_commitments: commitmentsMap[String(d.id)] || []
        }));

        const assignments = allocateTasks(tasks, devListWithCommitments, project_id);

        res.json({ success: true, assignments });
    } catch (error) {
        console.error('Allocation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================= HYBRID USER STORY DECOMPOSITION ENDPOINTS =================

/**
 * 1. Rule-Based & LLM-Assisted Decomposition for a Single User Story
 */
app.post(['/api/user-stories/:storyId/decompose', '/api/user-stories/:storyId/generate-work-items'], async (req, res) => {
    try {
        const { storyId } = req.params;
        let storyData = req.body.story;

        if (!storyData || !storyData.title) {
            const dbStoryRes = await pool.query(
                `SELECT * FROM user_stories WHERE story_id = $1 OR user_story_id = $1 LIMIT 1`,
                [storyId]
            );
            if (dbStoryRes.rows && dbStoryRes.rows.length > 0) {
                storyData = dbStoryRes.rows[0];
            }
        }

        if (!storyData || (!storyData.title && !storyData.user_story && !storyData.requirement_sentence)) {
            return res.status(404).json({ error: 'User Story not found' });
        }

        const parentTitle = storyData.title || storyData.user_story || storyData.requirement_sentence || '';
        const result = await decompositionEngine.decomposeUserStory({
            story_id: storyId,
            ...storyData
        });

        // Persist generated work items in PostgreSQL work_items table
        if (result.work_items && result.work_items.length > 0) {
            const sid = storyId || storyData.story_id || storyData.id;
            const cleanSid = (sid || '').replace(/[^a-zA-Z0-9]/g, '');
            if (cleanSid) {
                await pool.query(
                    `DELETE FROM work_items WHERE REGEXP_REPLACE(story_id, '[^a-zA-Z0-9]', '', 'g') = $1 AND status != 'approved'`,
                    [cleanSid]
                );
            }
            for (const item of result.work_items) {
                await pool.query(
                    `INSERT INTO work_items (
                        work_item_id, story_id, parent_story_title, project_id, title, description, domain, required_skills, estimated_hours, story_points, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    ON CONFLICT (work_item_id) DO UPDATE SET
                        parent_story_title = EXCLUDED.parent_story_title,
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        domain = EXCLUDED.domain,
                        required_skills = EXCLUDED.required_skills,
                        estimated_hours = EXCLUDED.estimated_hours,
                        story_points = EXCLUDED.story_points,
                        status = EXCLUDED.status`,
                    [
                        item.work_item_id,
                        item.story_id || storyId,
                        item.parent_story_title || parentTitle,
                        item.project_id || req.body.project_id || 'P00001',
                        item.title,
                        item.description,
                        item.domain,
                        item.required_skills || [],
                        item.estimated_hours || 8,
                        item.story_points || 1,
                        item.status || 'generated'
                    ]
                );
            }
        }

        res.json(result);
    } catch (err) {
        console.error('Error decomposing user story:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * 2. Batch Hybrid Decomposition for all User Stories in a Sprint or Project
 */
app.post('/api/user-stories/decompose-batch', async (req, res) => {
    try {
        const { stories = [], project_id = 'P00001' } = req.body;
        let storyList = stories;

        if (!storyList || storyList.length === 0) {
            const dbStories = await pool.query(
                `SELECT * FROM user_stories WHERE project_id = $1 OR $1 = 'P00001'`,
                [project_id]
            );
            storyList = dbStories.rows || [];
        }

        const allResults = [];
        for (const story of storyList) {
            const parentTitle = story.title || story.user_story || story.requirement_sentence || '';
            const resData = await decompositionEngine.decomposeUserStory(story);
            allResults.push(resData);

            if (resData.work_items && resData.work_items.length > 0) {
                const sid = story.story_id || story.id;
                const cleanSid = (sid || '').replace(/[^a-zA-Z0-9]/g, '');
                if (cleanSid) {
                    await pool.query(
                        `DELETE FROM work_items WHERE REGEXP_REPLACE(story_id, '[^a-zA-Z0-9]', '', 'g') = $1 AND status != 'approved'`,
                        [cleanSid]
                    );
                }
                for (const item of resData.work_items) {
                    await pool.query(
                        `INSERT INTO work_items (
                            work_item_id, story_id, parent_story_title, project_id, title, description, domain, required_skills, estimated_hours, story_points, status
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        ON CONFLICT (work_item_id) DO UPDATE SET
                            parent_story_title = EXCLUDED.parent_story_title,
                            title = EXCLUDED.title,
                            description = EXCLUDED.description,
                            domain = EXCLUDED.domain,
                            required_skills = EXCLUDED.required_skills,
                            estimated_hours = EXCLUDED.estimated_hours,
                            story_points = EXCLUDED.story_points,
                            status = EXCLUDED.status`,
                        [
                            item.work_item_id,
                            item.story_id || story.story_id || story.id,
                            item.parent_story_title || parentTitle,
                            project_id,
                            item.title,
                            item.description,
                            item.domain,
                            item.required_skills || [],
                            item.estimated_hours || 8,
                            item.story_points || 1,
                            item.status || 'generated'
                        ]
                    );
                }
            }
        }

        res.json({ success: true, count: allResults.length, results: allResults });
    } catch (err) {
        console.error('Error batch decomposing stories:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * 3. GET Work Items by Story ID, Project ID, Status, or Type with full traceability
 */
app.get('/api/work-items', async (req, res) => {
    try {
        const { story_id, project_id, status, work_item_type } = req.query;
        let query = `
            SELECT 
                w.*,
                COALESCE(w.parent_story_title, u.title, u.description, r.user_story, 'User Story Requirement') as parent_story_title,
                COALESCE(w.requirement_sentence, r.requirement_sentence, 'Requirement Sentence') as requirement_sentence,
                COALESCE(w.epic, r.epic, 'General') as epic,
                COALESCE(w.feature, r.feature, 'General Feature') as feature
            FROM work_items w
            LEFT JOIN user_stories u ON (w.story_id = u.story_id OR w.story_id = u.user_story_id)
            LEFT JOIN requirements r ON (u.story_id = 'US-' || r.id OR u.user_story_id = 'US-' || r.id OR w.story_id = 'US-' || r.id OR w.story_id = r.id::text)
            WHERE 1=1
        `;
        const params = [];

        if (story_id) {
            params.push(story_id);
            query += ` AND (w.story_id = $${params.length} OR u.story_id = $${params.length})`;
        }
        if (project_id) {
            params.push(project_id);
            query += ` AND (w.project_id = $${params.length} OR w.project_id = 'P00001')`;
        }
        if (status) {
            params.push(status);
            query += ` AND LOWER(w.status) = LOWER($${params.length})`;
        }
        if (work_item_type) {
            params.push(work_item_type);
            query += ` AND LOWER(w.work_item_type) = LOWER($${params.length})`;
        }

        query += ` ORDER BY w.created_at ASC, w.work_item_id ASC`;

        const result = await pool.query(query, params);
        res.json(result.rows || []);
    } catch (err) {
        console.error('Error fetching work items:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * 4. Save / Update a Single Work Item
 */
app.post('/api/work-items', async (req, res) => {
    try {
        const item = req.body;
        if (!item || !item.title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const workItemId = item.work_item_id || `WI-${(item.story_id || 'US').replace(/[^a-zA-Z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;
        const itemStatus = item.status || 'To Do';

        await pool.query(
            `INSERT INTO work_items (
                work_item_id, story_id, parent_story_title, requirement_sentence, epic, feature, project_id, title, description, domain, work_item_type, priority, required_skills, estimated_hours, story_points, status, assigned_to, start_date, end_date, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, CURRENT_TIMESTAMP)
            ON CONFLICT (work_item_id) DO UPDATE SET
                story_id = EXCLUDED.story_id,
                parent_story_title = EXCLUDED.parent_story_title,
                requirement_sentence = EXCLUDED.requirement_sentence,
                epic = EXCLUDED.epic,
                feature = EXCLUDED.feature,
                project_id = EXCLUDED.project_id,
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                domain = EXCLUDED.domain,
                work_item_type = EXCLUDED.work_item_type,
                priority = EXCLUDED.priority,
                required_skills = EXCLUDED.required_skills,
                estimated_hours = EXCLUDED.estimated_hours,
                story_points = EXCLUDED.story_points,
                status = EXCLUDED.status,
                assigned_to = EXCLUDED.assigned_to,
                start_date = EXCLUDED.start_date,
                end_date = EXCLUDED.end_date,
                updated_at = CURRENT_TIMESTAMP`,
            [
                workItemId,
                item.story_id || item.parent_user_story_id || 'US-01',
                item.parent_story_title || item.story_title || '',
                item.requirement_sentence || '',
                item.epic || '',
                item.feature || '',
                item.project_id || 'P00001',
                item.title,
                item.description || '',
                item.domain || item.work_item_type || 'Backend',
                item.work_item_type || item.domain || 'Development',
                item.priority || 'Medium',
                Array.isArray(item.required_skills) ? item.required_skills : (item.required_skills ? String(item.required_skills).split(',') : []),
                Number(item.estimated_hours || item.estimated_effort) || 8,
                Number(item.story_points) || 1,
                itemStatus,
                item.assigned_to || item.assigned_resource || 'Unassigned',
                item.start_date || null,
                item.end_date || null
            ]
        );

        res.json({ success: true, work_item_id: workItemId });
    } catch (err) {
        console.error('Error saving work item:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * 5. Update individual Work Item
 */
app.put('/api/work-items/:workItemId', async (req, res) => {
    try {
        const { workItemId } = req.params;
        const { title, description, domain, work_item_type, priority, required_skills, estimated_hours, estimated_effort, story_points, status, assigned_to, assigned_resource, start_date, end_date } = req.body;

        await pool.query(
            `UPDATE work_items SET
                title = COALESCE($1, title),
                description = COALESCE($2, description),
                domain = COALESCE($3, domain),
                work_item_type = COALESCE($4, work_item_type),
                priority = COALESCE($5, priority),
                required_skills = COALESCE($6, required_skills),
                estimated_hours = COALESCE($7, estimated_hours),
                story_points = COALESCE($8, story_points),
                status = COALESCE($9, status),
                assigned_to = COALESCE($10, assigned_to),
                start_date = COALESCE($11, start_date),
                end_date = COALESCE($12, end_date),
                updated_at = CURRENT_TIMESTAMP
             WHERE work_item_id = $13`,
            [title, description, domain || work_item_type, work_item_type || domain, priority, required_skills, estimated_hours || estimated_effort, story_points, status, assigned_to || assigned_resource, start_date, end_date, workItemId]
        );

        res.json({ success: true, message: `Work item ${workItemId} updated successfully` });
    } catch (err) {
        console.error('Error updating work item:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * 6. Delete a Work Item
 */
app.delete('/api/work-items/:workItemId', async (req, res) => {
    try {
        const { workItemId } = req.params;
        await pool.query(`DELETE FROM work_items WHERE work_item_id = $1`, [workItemId]);
        res.json({ success: true, message: `Work item ${workItemId} deleted successfully` });
    } catch (err) {
        console.error('Error deleting work item:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * 7. Approve Work Items for Resource Allocation
 */
app.post('/api/work-items/approve', async (req, res) => {
    try {
        const { work_item_ids = [], story_id, project_id } = req.body;

        if (work_item_ids.length > 0) {
            await pool.query(
                `UPDATE work_items SET status = 'approved' WHERE work_item_id = ANY($1::text[])`,
                [work_item_ids]
            );
        } else if (story_id) {
            await pool.query(
                `UPDATE work_items SET status = 'approved' WHERE story_id = $1`,
                [story_id]
            );
        } else {
            await pool.query(`UPDATE work_items SET status = 'approved' WHERE status != 'approved'`);
        }

        const approvedRes = await pool.query(
            `SELECT * FROM work_items WHERE status = 'approved' ${project_id ? 'AND project_id = $1' : ''}`,
            project_id ? [project_id] : []
        );

        res.json({ success: true, approved_work_items: approvedRes.rows || [] });
    } catch (err) {
        console.error('Error approving work items:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * 8. Generate standard Work Items for a given User Story
 */
app.post('/api/user-stories/:storyId/generate-work-items', async (req, res) => {
    try {
        const { storyId } = req.params;
        let storyData = req.body.story;

        if (!storyData || !storyData.title) {
            const dbStoryRes = await pool.query(
                `SELECT * FROM user_stories WHERE story_id = $1 OR user_story_id = $1 LIMIT 1`,
                [storyId]
            );
            if (dbStoryRes.rows && dbStoryRes.rows.length > 0) {
                storyData = dbStoryRes.rows[0];
            }
        }

        if (!storyData) {
            return res.status(404).json({ error: 'User Story not found' });
        }

        const parentTitle = storyData.title || storyData.user_story || 'User Story';
        const reqSentence = storyData.requirement_sentence || storyData.description || parentTitle;
        const epic = storyData.epic || 'General';
        const feature = storyData.feature || 'Feature Logic';
        const projectId = storyData.project_id || req.body.project_id || 'P00001';
        const cleanSid = String(storyId).replace(/[^a-zA-Z0-9]/g, '');

        const standardItems = [
            { type: 'UI/UX', title: `UI/UX: ${parentTitle}`, domain: 'Frontend', hours: 8, points: 2, skills: ['React', 'JavaScript', 'HTML/CSS'] },
            { type: 'API/Backend', title: `API/Backend: ${parentTitle}`, domain: 'Backend', hours: 12, points: 3, skills: ['Node.js', 'Express', 'SQL'] },
            { type: 'Database', title: `Database Schema & Logic: ${parentTitle}`, domain: 'Backend', hours: 8, points: 2, skills: ['PostgreSQL', 'SQL'] },
            { type: 'Testing', title: `QA Integration & Testing: ${parentTitle}`, domain: 'QA', hours: 6, points: 1, skills: ['Cypress', 'QA Automation'] },
            { type: 'Documentation', title: `Technical & User Documentation: ${parentTitle}`, domain: 'Documentation', hours: 4, points: 1, skills: ['Markdown'] }
        ];

        const insertedWIs = [];
        for (let i = 0; i < standardItems.length; i++) {
            const item = standardItems[i];
            const wiId = `WI-${cleanSid}-${i + 1}`;
            await pool.query(
                `INSERT INTO work_items (
                    work_item_id, story_id, parent_story_title, requirement_sentence, epic, feature, project_id, title, description, domain, work_item_type, priority, required_skills, estimated_hours, story_points, status, assigned_to
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                ON CONFLICT (work_item_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    domain = EXCLUDED.domain,
                    work_item_type = EXCLUDED.work_item_type,
                    estimated_hours = EXCLUDED.estimated_hours,
                    story_points = EXCLUDED.story_points`,
                [
                    wiId,
                    storyId,
                    parentTitle,
                    reqSentence,
                    epic,
                    feature,
                    projectId,
                    item.title,
                    `Implement ${item.type} requirements for ${parentTitle}`,
                    item.domain,
                    item.type,
                    storyData.priority || 'Medium',
                    item.skills,
                    item.hours,
                    item.points,
                    'To Do',
                    'Unassigned'
                ]
            );
            insertedWIs.push({ work_item_id: wiId, story_id: storyId, title: item.title, work_item_type: item.type, estimated_hours: item.hours, status: 'To Do' });
        }

        res.json({ success: true, work_items: insertedWIs });
    } catch (err) {
        console.error('Error generating work items:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- REST ENDPOINTS FOR CONNECTED MODULES ---


// Team Members / Resources
app.get('/api/resources', async (req, res) => {
    try {
        await pool.query(`
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
        const result = await pool.query("SELECT * FROM team_members ORDER BY name ASC");
        res.json(result.rows || []);
    } catch (err) {
        console.warn('Notice querying team_members:', err.message);
        res.json([]);
    }
});

app.post('/api/resources', async (req, res) => {
    const { id, name, role, avatar, color, capacity_hours, allocated_hours, assigned_epics, skills, status } = req.body;
    try {
        await pool.query(
            `INSERT INTO team_members (id, name, role, avatar, color, capacity_hours, allocated_hours, assigned_epics, skills, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (id) DO UPDATE SET 
             allocated_hours = EXCLUDED.allocated_hours, 
             assigned_epics = EXCLUDED.assigned_epics, 
             status = EXCLUDED.status`,
            [id, name, role, avatar, color, capacity_hours || 40, allocated_hours || 0, assigned_epics || [], skills || [], status || 'Optimal']
        );
        res.json({ message: 'Resource saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Sprint Tasks / Kanban Items
app.get('/api/sprint-tasks', async (req, res) => {
    try {
        await pool.query(`
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
        const result = await pool.query("SELECT * FROM sprint_tasks ORDER BY id DESC");
        res.json(result.rows || []);
    } catch (err) {
        console.warn('Notice querying sprint_tasks:', err.message);
        res.json([]);
    }
});

app.post('/api/sprint-tasks', async (req, res) => {
    const { id, requirement_sentence, epic, user_story, acceptance_criteria, column_name, points, assignee } = req.body;
    try {
        await pool.query(
            `INSERT INTO sprint_tasks (id, requirement_sentence, epic, user_story, acceptance_criteria, column_name, points, assignee)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET column_name = EXCLUDED.column_name, assignee = EXCLUDED.assignee`,
            [id, requirement_sentence, epic, user_story, acceptance_criteria, column_name || 'Backlog', points || 3, assignee || 'Unassigned']
        );
        res.json({ message: 'Sprint task saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});



// ================= WORK ITEM BREAKDOWN ENGINE & DEPENDENCY TIER ENGINE =================

// Process Sequence & Dependency Tier Resolver
// Rule 1: Dependency Order - Prerequisite User Stories must come before dependent User Stories.
// Rule 2: Process Flow - User Stories follow the actual business workflow (Defect -> Repair Request -> Approval/Conversion -> Work Order -> Execution -> Closure).
// Rule 3 & 4: Related Stories Together - Stories in the same process group stay in the same sprint whenever feasible.
// Rule 5: Logical Splitting - Split across sprints only at clean functional boundaries (e.g. Tier 1 -> Tier 2).
// Rule 6: End-to-End Thinking - Progressive system build from foundation to dependent functionality.
// Rule 7: Dependencies > Capacity Balancing - Do not shift dependent stories to earlier sprints to balance story points.
// Rule 8: Validation Pass - Enforce S(Dependent) >= S(Prerequisite) before final allocation.

function analyzeProcessAndDependencyTier(titleOrText = '', descOrText = '') {
    const text = `${titleOrText || ''} ${descOrText || ''}`.toLowerCase();

    // 0. Foundational Security, Role Permissions & Access Control (TIER 0)
    if (/\b(permission|permissions|permitted|role|user roles|access control|security|auth|login|assigned permissions)\b/i.test(text) &&
        !/\b(approve or reject work orders|approve work order|approve the eork|defect|repair|overtime|notification|report)\b/i.test(text)) {
        let step = 0.1;
        if (/\b(view engineering records|assigned permissions)\b/i.test(text)) step = 0.1;
        else if (/\b(restrict users|assigned role)\b/i.test(text)) step = 0.2;
        else if (/\b(user roles|access to engineering functions)\b/i.test(text)) step = 0.3;
        else if (/\b(status changes|required permission)\b/i.test(text)) step = 0.4;
        return { tier: 0, processStep: step, group: 'FOUNDATION_AUTH_SECURITY' };
    }

    // 1. Defect & Repair Initiation (TIER 1)
    if (/\b(defect|defects|defect record|defect records|repair record|repair records|repair activity|repair activities)\b/i.test(text) &&
        !/\b(link defects|link repair|display the current status|work order|job card)\b/i.test(text)) {
        let step = 1.1;
        if (/\b(create and manage defect|manage defect|defect records)\b/i.test(text)) step = 1.1;
        else if (/\b(priority and severity to each defect|assign a priority)\b/i.test(text)) step = 1.2;
        else if (/\b(update the status of defects|status of defects)\b/i.test(text)) step = 1.3;
        else if (/\b(create and manage repair|repair records)\b/i.test(text)) step = 1.4;
        else if (/\b(priority and severity to repair|repair activities)\b/i.test(text)) step = 1.5;
        return { tier: 1, processStep: step, group: 'DEFECT_REPAIR_INITIATION' };
    }

    // 7. Audit Trail, Reports & Activity History (TIER 7) - Check early for version history & audit
    if (/\b(audit trail|date\/time associated with applicable record|engineering reports|reports to be filtered|reports to be exported|history of engineering activities|version history of work order|version history)\b/i.test(text)) {
        let step = 7.1;
        if (/\b(audit trail)\b/i.test(text)) step = 7.1;
        else if (/\b(record the user and date\/time)\b/i.test(text)) step = 7.2;
        else if (/\b(provide engineering reports)\b/i.test(text)) step = 7.3;
        else if (/\b(engineering reports to be filtered)\b/i.test(text)) step = 7.4;
        else if (/\b(engineering reports to be exported)\b/i.test(text)) step = 7.5;
        else if (/\b(history of engineering activities)\b/i.test(text)) step = 7.6;
        else if (/\b(version history of work order|version history)\b/i.test(text)) step = 7.7;
        return { tier: 7, processStep: step, group: 'AUDIT_REPORTS_HISTORY' };
    }

    // 6. Email Notifications & Communication Templates (TIER 6)
    if (/\b(send notifications|emails to notify|cc\/notification|approved templates|template confirmation)\b/i.test(text)) {
        let step = 6.1;
        if (/\b(send notifications)\b/i.test(text)) step = 6.1;
        else if (/\b(emails to notify)\b/i.test(text)) step = 6.2;
        else if (/\b(cc\/notification)\b/i.test(text)) step = 6.3;
        else if (/\b(approved templates)\b/i.test(text)) step = 6.4;
        else if (/\b(template confirmation)\b/i.test(text)) step = 6.5;
        return { tier: 6, processStep: step, group: 'NOTIFICATIONS_TEMPLATES' };
    }

    // 5. Job Cards & Search / Filtering (TIER 5)
    if (/\b(job card|job cards|search functionality|filter engineering records)\b/i.test(text)) {
        let step = 5.1;
        if (/\b(generate a job card)\b/i.test(text)) step = 5.1;
        else if (/\b(include relevant work order, vessel, equipment|include relevant work order)\b/i.test(text)) step = 5.2;
        else if (/\b(print or export the job card)\b/i.test(text)) step = 5.3;
        else if (/\b(excel\/pdf format|exporting job cards)\b/i.test(text)) step = 5.4;
        else if (/\b(search functionality)\b/i.test(text)) step = 5.5;
        else if (/\b(filter engineering records)\b/i.test(text)) step = 5.6;
        return { tier: 5, processStep: step, group: 'JOB_CARDS_SEARCH_FILTER' };
    }

    // 4. Offshore Vessels, Costing & Overtime Business Rules (TIER 4)
    if (/\b(vessel-wise|select the relevant vessel|equipment allocated to the selected vessel|materials allocated to the selected vessel|field name specifications|hourly labour rate|hourly overhead rate|estimated cost of a work order|third-party vessel costs|calculate labour costs|overtime|exceeding 9 hours|saturday working hours|sunday working hours|1.5 times)\b/i.test(text)) {
        let step = 4.1;
        if (/\b(vessel-wise)\b/i.test(text)) step = 4.1;
        else if (/\b(select the relevant vessel)\b/i.test(text)) step = 4.2;
        else if (/\b(equipment allocated to the selected vessel)\b/i.test(text)) step = 4.3;
        else if (/\b(materials allocated to the selected vessel)\b/i.test(text)) step = 4.4;
        else if (/\b(field name specifications|capacity)\b/i.test(text)) step = 4.5;
        else if (/\b(hourly labour rate)\b/i.test(text)) step = 4.6;
        else if (/\b(hourly overhead rate)\b/i.test(text)) step = 4.7;
        else if (/\b(estimated cost of a work order)\b/i.test(text)) step = 4.8;
        else if (/\b(third-party vessel costs)\b/i.test(text)) step = 4.9;
        else if (/\b(calculate labour costs)\b/i.test(text)) step = 4.10;
        else if (/\b(defined overtime business rules|calculate overtime)\b/i.test(text)) step = 4.11;
        else if (/\b(weekday working hours|exceeding 9 hours)\b/i.test(text)) step = 4.12;
        else if (/\b(saturday working hours)\b/i.test(text)) step = 4.13;
        else if (/\b(sunday working hours)\b/i.test(text)) step = 4.14;
        else if (/\b(1.5 times)\b/i.test(text)) step = 4.15;
        return { tier: 4, processStep: step, group: 'VESSEL_COSTING_OVERTIME' };
    }

    // 3. Work Order Execution, Time Entry, Status & Materials Allocation (TIER 3)
    if (/\b(start date and time|end date and time|estimated working hours|actual working hours|display the current status|assign engineers or labour|add materials|workshop and warehouse materials|stock category)\b/i.test(text)) {
        let step = 3.1;
        if (/\b(start date and time)\b/i.test(text)) step = 3.1;
        else if (/\b(end date and time)\b/i.test(text)) step = 3.2;
        else if (/\b(estimated working hours)\b/i.test(text)) step = 3.3;
        else if (/\b(actual working hours)\b/i.test(text)) step = 3.4;
        else if (/\b(display the current status)\b/i.test(text)) step = 3.5;
        else if (/\b(assign engineers or labour)\b/i.test(text)) step = 3.6;
        else if (/\b(add materials required|add materials)\b/i.test(text)) step = 3.7;
        else if (/\b(workshop and warehouse materials)\b/i.test(text)) step = 3.8;
        else if (/\b(stock category)\b/i.test(text)) step = 3.9;
        return { tier: 3, processStep: step, group: 'WORK_ORDER_EXECUTION_RESOURCES' };
    }

    // 2. Core Work Order Creation, Linking & Workflow Approvals (TIER 2)
    if (/\b(work order|work orders|create work order|enter.*work order|view existing work orders|edit work order|link defects|link repair|update the status of a work order|approve work order|approve the eork orders|approve or reject work orders)\b/i.test(text)) {
        let step = 2.1;
        if (/\b(enter.*work order details|create work order|create work orders|enter work order|enter the work order|required work order details)\b/i.test(text)) step = 2.1;
        else if (/\b(view existing work orders)\b/i.test(text)) step = 2.2;
        else if (/\b(edit work order details|edit work order)\b/i.test(text)) step = 2.3;
        else if (/\b(link defects)\b/i.test(text)) step = 2.4;
        else if (/\b(link repair|link repair activities)\b/i.test(text)) step = 2.5;
        else if (/\b(update the status of a work order)\b/i.test(text)) step = 2.6;
        else if (/\b(approve the eork orders|approve the work orders|approve work order)\b/i.test(text)) step = 2.7;
        else if (/\b(approve or reject work orders)\b/i.test(text)) step = 2.8;
        else if (/\b(emergency override|change request|\[cr\]|cr-us)\b/i.test(text)) step = 2.9;
        return { tier: 2, processStep: step, group: 'WORK_ORDER_CREATION_APPROVAL' };
    }

    return { tier: 2, processStep: 2.1, group: 'WORK_ORDER_CREATION_APPROVAL' };
}

function getDependencyTier(title = '', desc = '') {
    return analyzeProcessAndDependencyTier(title, desc).tier;
}

// Auto-generate granular Work Items (FE, BE, QA, AI, DevOps) for a User Story / Change Request
function buildWorkItemsForStory(story) {
    const storyId = story.story_id || story.user_story_id || story.id;
    const projectId = story.project_id || 'P00001';
    const sprintId = story.sprint_id || 'SPR-01';
    const text = `${story.title || ''} ${story.description || ''} ${story.requirement_sentence || ''}`.toLowerCase();
    const totalPoints = Number(story.story_points) || 5;
    const totalHours = totalPoints * 6;

    const workItemsToCreate = [];

    // 1. Frontend / UI Component Work Item
    workItemsToCreate.push({
        work_item_id: `WI-${storyId}-FE`,
        story_id: storyId,
        project_id: projectId,
        title: `UI Component: ${story.title || 'User Interface & Forms'}`,
        description: `Build UI layout, form validation, and interactive components for ${story.title || storyId}`,
        domain: 'frontend',
        required_skills: ['JavaScript', 'React', 'HTML/CSS'],
        estimated_hours: Math.round(totalHours * 0.40) || 8,
        status: 'PENDING',
        sprint_id: sprintId
    });

    // 2. Backend API & DB Work Item
    workItemsToCreate.push({
        work_item_id: `WI-${storyId}-BE`,
        story_id: storyId,
        project_id: projectId,
        title: `Backend API & DB Query: ${story.title || 'Business Logic & Persistence'}`,
        description: `Develop REST endpoints, database schemas, and queries for ${story.title || storyId}`,
        domain: 'backend',
        required_skills: ['Node.js', 'SQL', 'PostgreSQL'],
        estimated_hours: Math.round(totalHours * 0.40) || 8,
        status: 'PENDING',
        sprint_id: sprintId
    });

    // 3. QA Automation Work Item
    workItemsToCreate.push({
        work_item_id: `WI-${storyId}-QA`,
        story_id: storyId,
        project_id: projectId,
        title: `QA Testing & Verification: ${story.title || 'Acceptance Testing'}`,
        description: `Write automated tests and execute verification for ${story.title || storyId}`,
        domain: 'qa',
        required_skills: ['QA Automation', 'Cypress'],
        estimated_hours: Math.max(4, Math.round(totalHours * 0.20)) || 4,
        status: 'PENDING',
        sprint_id: sprintId
    });

    // 4. AI/ML Work Item (if applicable)
    if (/\b(machine learning|nlp|spacy|scikit|svm|deep learning|neural network|tensorflow|pytorch|classifier|ai service|ml model)\b/i.test(text)) {
        workItemsToCreate.push({
            work_item_id: `WI-${storyId}-AI`,
            story_id: storyId,
            project_id: projectId,
            title: `AI/ML Pipeline Integration: ${story.title || 'Model Inference'}`,
            description: `Configure ML model inference and data preprocessing for ${story.title || storyId}`,
            domain: 'ai',
            required_skills: ['Python', 'ML', 'Scikit-Learn', 'NLP'],
            estimated_hours: 8,
            status: 'PENDING',
            sprint_id: sprintId
        });
    }

    // 5. DevOps / Security Work Item (if applicable)
    if (/\b(docker|kubernetes|aws|cloud|ci\/cd|pipeline|deploy|auth|login|sso|security|role|permission)\b/i.test(text)) {
        workItemsToCreate.push({
            work_item_id: `WI-${storyId}-DEVOPS`,
            story_id: storyId,
            project_id: projectId,
            title: `DevOps & Access Control: ${story.title || 'Security Hardening'}`,
            description: `Set up containerization, security policies, and access controls for ${story.title || storyId}`,
            domain: 'devops',
            required_skills: ['Docker', 'DevOps', 'OAuth', 'Security'],
            estimated_hours: 6,
            status: 'PENDING',
            sprint_id: sprintId
        });
    }

    return workItemsToCreate;
}

async function generateWorkItemsForStory(story) {
    const storyId = story.story_id || story.user_story_id || story.id;
    try {
        const existing = await pool.query("SELECT * FROM public.work_items WHERE story_id = $1", [storyId]);
        if (existing.rows && existing.rows.length > 0) {
            return existing.rows;
        }
    } catch (e) {}
    return buildWorkItemsForStory(story);
}

// REST ENDPOINTS FOR WORK ITEMS
app.get('/api/work-items', async (req, res) => {
    try {
        const { story_id, project_id, sprint_id } = req.query;
        let sql = "SELECT * FROM public.work_items";
        let params = [];
        let conditions = [];
        if (story_id) {
            conditions.push(`story_id = $${conditions.length + 1}`);
            params.push(story_id);
        }
        if (project_id && project_id !== 'ALL') {
            conditions.push(`(project_id = $${conditions.length + 1} OR project_id = 'P00001' OR project_id = 'research')`);
            params.push(project_id);
        }
        if (sprint_id) {
            conditions.push(`sprint_id = $${conditions.length + 1}`);
            params.push(sprint_id);
        }
        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }
        sql += " ORDER BY work_item_id ASC";
        const result = await pool.query(sql, params);
        res.json({ success: true, count: result.rows.length, data: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/work-items/generate', async (req, res) => {
    try {
        const { story_id, project_id } = req.body;
        let stories = [];
        if (story_id) {
            const sRes = await pool.query("SELECT * FROM public.user_stories WHERE story_id = $1 OR user_story_id = $1", [story_id]);
            stories = sRes.rows || [];
        } else {
            let sql = "SELECT * FROM public.user_stories";
            let params = [];
            if (project_id && project_id !== 'ALL') {
                sql += " WHERE project_id = $1 OR project_id = 'P00001'";
                params.push(project_id);
            }
            const sRes = await pool.query(sql, params);
            stories = sRes.rows || [];
        }

        let allCreated = [];
        for (const story of stories) {
            const items = await generateWorkItemsForStory(story);
            allCreated.push(...items);
        }
        res.json({ success: true, count: allCreated.length, data: allCreated });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/work-items/:id/assign', async (req, res) => {
    try {
        const { id } = req.params;
        const { developer_id, developer_name } = req.body;
        await pool.query(
            "UPDATE public.work_items SET assigned_developer_id = $1, assigned_developer_name = $2, status = 'ASSIGNED' WHERE work_item_id = $3",
            [developer_id, developer_name, id]
        );
        res.json({ success: true, message: `Work item ${id} assigned to ${developer_name}` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ================= USER STORIES API =================

app.get('/api/user-stories', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.user_stories (
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // Auto-sync Change Requests from change_requests table into user_stories for Resource Management
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS public.change_requests (
                    id SERIAL PRIMARY KEY,
                    request_id TEXT UNIQUE NOT NULL,
                    project_id TEXT NOT NULL,
                    project_name TEXT NOT NULL,
                    user_story_id TEXT NOT NULL,
                    user_story_title TEXT,
                    sprint_id TEXT NOT NULL,
                    sprint_name TEXT,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    change_type TEXT NOT NULL,
                    story_points INTEGER DEFAULT 5,
                    urgency TEXT DEFAULT 'MEDIUM',
                    status TEXT DEFAULT 'PENDING',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                ALTER TABLE public.change_requests 
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS resource_allocation_info TEXT,
                ADD COLUMN IF NOT EXISTS reason TEXT,
                ADD COLUMN IF NOT EXISTS team_size INTEGER DEFAULT 8,
                ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 25,
                ADD COLUMN IF NOT EXISTS project_manager TEXT,
                ADD COLUMN IF NOT EXISTS impact_level TEXT DEFAULT 'MEDIUM',
                ADD COLUMN IF NOT EXISTS confidence DECIMAL(5,2) DEFAULT 0.85,
                ADD COLUMN IF NOT EXISTS recommendation TEXT,
                ADD COLUMN IF NOT EXISTS probabilities TEXT;
            `);
            const crRes = await pool.query("SELECT * FROM public.change_requests");
            for (const cr of (crRes.rows || [])) {
                const crStoryId = `CR-US-${cr.request_id.split('-').pop() || cr.id}`;
                const titleStr = (cr.title || '').startsWith('[CR]') ? cr.title : `[CR] ${cr.title}`;
                await pool.query(`
                    INSERT INTO public.user_stories (
                        story_id, user_story_id, project_id, sprint_id, title, description, story_points, priority, status
                    ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (story_id) DO UPDATE SET
                        title = EXCLUDED.title,
                        story_points = EXCLUDED.story_points;
                `, [
                    crStoryId,
                    cr.project_id || 'P00001',
                    cr.sprint_id || 'SPR-01',
                    titleStr,
                    cr.description || '',
                    Number(cr.story_points) || 5,
                    (cr.urgency || 'HIGH').toUpperCase(),
                    cr.status || 'PENDING'
                ]);
            }
        } catch (crSyncErr) {
            console.warn('Notice syncing change_requests in GET /api/user-stories:', crSyncErr.message);
        }

        const { project_id } = req.query;
        let query = "SELECT * FROM user_stories ORDER BY requirement_order ASC, story_id ASC";
        let params = [];

        if (project_id && project_id !== 'ALL') {
            query = "SELECT * FROM user_stories WHERE LOWER(project_id) = LOWER($1) OR LOWER($1) LIKE '%' || LOWER(project_id) || '%' OR LOWER(project_id) LIKE '%' || LOWER($1) || '%' ORDER BY requirement_order ASC, story_id ASC";
            params = [project_id];
        }

        const result = await pool.query(query, params);
        let rows = result.rows || [];

        // Fallback: If no stories matched the project filter, return all user stories
        if (rows.length === 0 && project_id) {
            const allRes = await pool.query("SELECT * FROM user_stories ORDER BY requirement_order ASC, story_id ASC");
            rows = allRes.rows || [];
        }

        if (rows && rows.length > 0) {
            // Attach resource allocation status and work items if present
            try {
                const allocRes = await pool.query("SELECT * FROM public.resource_allocations");
                const allocs = allocRes.rows || [];
                const allocMap = {};
                allocs.forEach(a => {
                    if (a.user_story_id) {
                        if (!allocMap[a.user_story_id]) allocMap[a.user_story_id] = [];
                        allocMap[a.user_story_id].push(a);
                    }
                });

                rows.forEach(s => {
                    const matchedAllocs = allocMap[s.story_id] || allocMap[s.user_story_id] || [];
                    s.is_resource_allocated = matchedAllocs.length > 0 || (s.assigned_to && s.assigned_to !== 'Unassigned');
                    s.resource_allocations = matchedAllocs;
                });
            } catch (aErr) {}

            const orderedRows = await reorderUserStoriesWithGemini(rows);
            return res.json(orderedRows);
        }
        
        let reqRes = { rows: [] };
        try {
            reqRes = await pool.query("SELECT * FROM requirements WHERE completeness_status = 'Complete' OR completeness_status = 'Completed by User'");
        } catch (rErr) {}

        const mapped = (reqRes.rows || []).map((r, idx) => ({
            story_id: `US-${r.id}`,
            user_story_id: `US-${r.id}`,
            project_id: r.project_id || project_id || 'P00001',
            sprint_id: 'SPR-01',
            title: r.user_story || r.requirement_sentence,
            description: r.acceptance_criteria || '',
            story_points: 3 + (idx % 5),
            priority: idx % 2 === 0 ? 'HIGH' : 'MEDIUM',
            status: 'IN_PROGRESS',
            assigned_to: 'Unassigned',
            is_resource_allocated: false,
            resource_allocations: []
        }));
        const orderedMapped = await reorderUserStoriesWithGemini(mapped);
        res.json(orderedMapped);
    } catch (err) {
        console.warn('Notice fetching user_stories:', err.message);
        res.json([]);
    }
});

/**
 * Re-orders User Stories using Process Tier & Dependency Sorting Algorithm
 */
async function reorderUserStoriesWithGemini(stories) {
    if (!Array.isArray(stories) || stories.length === 0) return stories;
    return sortStoriesByDependencyTier(stories);
}

app.get('/api/user-stories/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "SELECT * FROM user_stories WHERE story_id = $1 OR user_story_id = $1 OR story_id = $2 OR user_story_id = $2",
            [id, `US-${id}`]
        );
        if (result.rows && result.rows.length > 0) {
            return res.json({ success: true, data: result.rows[0] });
        }
        res.status(404).json({ success: false, message: 'User Story not found' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/user-stories', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.user_stories (
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        const { story_id, project_id, sprint_id, title, description, story_points, priority, status, assigned_to } = req.body;
        if (!title) return res.status(400).json({ error: 'Title is required' });

        const sid = story_id || `US-${Date.now()}`;
        const pid = project_id || 'P00001';
        const spid = sprint_id || 'SPR-01';

        await pool.query(
            `INSERT INTO user_stories (story_id, user_story_id, project_id, sprint_id, title, description, story_points, priority, status, assigned_to)
             VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (story_id) DO UPDATE SET 
             sprint_id = EXCLUDED.sprint_id,
             title = EXCLUDED.title,
             description = EXCLUDED.description,
             story_points = EXCLUDED.story_points,
             status = EXCLUDED.status,
             assigned_to = EXCLUDED.assigned_to`,
            [sid, pid, spid, title, description || '', story_points || 5, priority || 'Medium', status || 'IN_PROGRESS', assigned_to || 'Unassigned']
        );

        res.json({ success: true, message: 'User story saved successfully', story_id: sid });
    } catch (err) {
        console.error('Error saving user story:', err);
        res.status(500).json({ error: err.message });
    }
});

// ================= AUTOMATED 2-WEEK SPRINT PLAN ENGINE =================

app.get('/api/sprint-plan', async (req, res) => {
    try {
        const projectId = req.query.project_id;
        let effectivePid = (projectId && projectId !== 'ALL') ? projectId : 'P00001';

        // Auto-ensure effectivePid exists in public.projects to satisfy foreign key constraints
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS public.projects (
                    project_id TEXT PRIMARY KEY,
                    project_name TEXT NOT NULL,
                    description TEXT,
                    project_manager TEXT,
                    team_size INT DEFAULT 5,
                    progress_percent INT DEFAULT 0,
                    budget_usd NUMERIC(15,2) DEFAULT 50000.00,
                    risk_level TEXT DEFAULT 'Low',
                    complexity_level TEXT DEFAULT 'Medium',
                    priority TEXT DEFAULT 'HIGH',
                    status TEXT DEFAULT 'ACTIVE',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            const projCheck = await pool.query("SELECT project_id FROM public.projects WHERE project_id = $1", [effectivePid]);
            if (projCheck.rows.length === 0) {
                const firstProj = await pool.query("SELECT project_id FROM public.projects ORDER BY created_at DESC LIMIT 1");
                if (firstProj.rows.length > 0) {
                    effectivePid = firstProj.rows[0].project_id;
                }
            }
        } catch (pErr) {
            console.warn('Notice resolving project_id:', pErr.message);
        }

        // Defensive table auto-creation check to prevent relation error
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS public.user_stories (
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
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
        } catch (tableErr) {
            console.warn('Notice ensuring user_stories table:', tableErr.message);
        }

        // ================= DEPENDENCY-AWARE & PROCESS-FLOW-AWARE SPRINT ALLOCATION ENGINE =================
        // Rule 1: Dependency Order - Prerequisite User Stories must come before dependent User Stories.
        // Rule 2: Process Flow - User Stories follow the actual business workflow (Defect -> Repair Request -> Approval/Conversion -> Work Order -> Execution -> Closure).
        // Rule 3 & 4: Related Stories Together - Stories in the same process group stay in the same sprint whenever feasible without breaking flow.
        // Rule 5: Logical Splitting - Split across sprints only at clean functional boundaries (e.g. Tier 1 -> Tier 2).
        // Rule 6: End-to-End Thinking - Progressive system build from foundation to dependent functionality.
        // Rule 7: Dependencies > Capacity Balancing - Do not shift dependent stories to earlier sprints to balance story points.
        // Rule 8: Validation Pass - Enforce S(Dependent) >= S(Prerequisite) before final allocation.

        const getPriorityRank = (p, text = '') => {
            const lowerText = (text || '').toLowerCase();
            if (/\b(defect|defects|repair request|repair requests|onshore engineer|onshore engineers)\b/i.test(lowerText)) {
                return 1;
            }
            const str = (p || '').toUpperCase();
            if (str === 'CRITICAL' || str === 'HIGH') return 1;
            const isHighKw = ['security', 'auth', 'login', 'sso', 'saml', 'payment', 'crash', 'audit', 'critical', 'timeout', 'admin', 'compliance', 'access control'].some(kw => lowerText.includes(kw));
            if (isHighKw) return 1;
            if (str === 'MEDIUM') return 2;
            return 3;
        };

        // 1. Auto-sync any APPROVED / ACCEPTED change requests from change_requests into user_stories
        try {
            await pool.query(`
                CREATE TABLE IF NOT EXISTS public.change_requests (
                    id SERIAL PRIMARY KEY,
                    request_id TEXT UNIQUE NOT NULL,
                    project_id TEXT NOT NULL,
                    project_name TEXT NOT NULL,
                    user_story_id TEXT NOT NULL,
                    user_story_title TEXT,
                    sprint_id TEXT NOT NULL,
                    sprint_name TEXT,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    change_type TEXT NOT NULL,
                    story_points INTEGER DEFAULT 5,
                    urgency TEXT DEFAULT 'MEDIUM',
                    status TEXT DEFAULT 'PENDING',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                ALTER TABLE public.change_requests 
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS resource_allocation_info TEXT,
                ADD COLUMN IF NOT EXISTS reason TEXT,
                ADD COLUMN IF NOT EXISTS team_size INTEGER DEFAULT 8,
                ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 25,
                ADD COLUMN IF NOT EXISTS project_manager TEXT,
                ADD COLUMN IF NOT EXISTS impact_level TEXT DEFAULT 'MEDIUM',
                ADD COLUMN IF NOT EXISTS confidence DECIMAL(5,2) DEFAULT 0.85,
                ADD COLUMN IF NOT EXISTS recommendation TEXT,
                ADD COLUMN IF NOT EXISTS probabilities TEXT;
            `);
            const approvedCRsRes = await pool.query(
                "SELECT * FROM public.change_requests WHERE UPPER(status) IN ('APPROVED', 'ACCEPTED')"
            );
            const approvedCRs = approvedCRsRes.rows || [];
            for (const cr of approvedCRs) {
                const crStoryId = `CR-US-${cr.request_id.split('-').pop() || cr.id}`;
                const titleStr = (cr.title || '').startsWith('[CR]') ? cr.title : `[CR] ${cr.title}`;
                await pool.query(`
                    INSERT INTO public.user_stories (
                        story_id, user_story_id, project_id, sprint_id, title, description, story_points, priority, status
                    ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, 'ACCEPTED')
                    ON CONFLICT (story_id) DO UPDATE SET
                        title = EXCLUDED.title,
                        status = 'ACCEPTED',
                        story_points = EXCLUDED.story_points;
                `, [
                    crStoryId,
                    cr.project_id || 'P00001',
                    cr.sprint_id || 'SPR-01',
                    titleStr,
                    cr.description || '',
                    Number(cr.story_points) || 5,
                    (cr.urgency || 'HIGH').toUpperCase()
                ]);
            }
        } catch (crSyncErr) {
            console.warn('Notice syncing change_requests to user_stories:', crSyncErr.message);
        }

        // 2. Fetch user stories from DB (or requirements fallback)
        let stories = [];
        try {
            let query = "SELECT * FROM user_stories ORDER BY requirement_order ASC, story_id ASC";
            let params = [];
            if (projectId && projectId !== 'ALL') {
                query = "SELECT * FROM user_stories WHERE project_id = $1 OR project_id = 'P00001' OR project_id = 'research' ORDER BY requirement_order ASC, story_id ASC";
                params = [projectId];
            }

            const storiesResult = await pool.query(query, params);
            stories = storiesResult.rows || [];

            if (stories.length === 0) {
                const allStoriesRes = await pool.query("SELECT * FROM user_stories ORDER BY requirement_order ASC, story_id ASC");
                stories = allStoriesRes.rows || [];
            }
        } catch (qErr) {
            console.warn('Notice querying user_stories:', qErr.message);
        }

        if (!stories || stories.length === 0) {
            try {
                const reqResult = await pool.query("SELECT * FROM requirements ORDER BY requirement_order ASC, id ASC");
                const reqRows = reqResult.rows || [];
                
                for (let idx = 0; idx < reqRows.length; idx++) {
                    const r = reqRows[idx];
                    const sId = `US-${r.id}`;
                    const cleanSent = (r.requirement_sentence || '').endsWith('.') ? r.requirement_sentence.slice(0, -1) : r.requirement_sentence;
                    const storyTitle = r.user_story && r.user_story !== 'Pending' ? r.user_story : `As a System User, I want to ${cleanSent ? cleanSent.charAt(0).toLowerCase() + cleanSent.slice(1) : 'use this feature'}.`;
                    const points = 3 + (idx % 5);
                    const rank = getPriorityRank('MEDIUM', `${storyTitle} ${r.acceptance_criteria || ''}`);
                    const calcPriority = rank === 1 ? 'HIGH' : (points >= 5 ? 'HIGH' : 'MEDIUM');
                    const rOrder = r.requirement_order || (idx + 1);

                    try {
                        await pool.query(`
                            INSERT INTO user_stories (story_id, user_story_id, project_id, sprint_id, title, description, story_points, priority, status, assigned_to, requirement_order)
                            VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                            ON CONFLICT (story_id) DO UPDATE SET project_id = EXCLUDED.project_id, requirement_order = EXCLUDED.requirement_order
                        `, [sId, effectivePid, 'SPR-01', storyTitle, r.acceptance_criteria || '', points, calcPriority, 'IN_PROGRESS', 'Unassigned', rOrder]);
                    } catch (uErr) {}
                }

                const freshStoriesRes = await pool.query("SELECT * FROM user_stories ORDER BY requirement_order ASC, story_id ASC");
                stories = freshStoriesRes.rows || [];
            } catch (rErr) {
                console.warn('Notice reading requirements fallback:', rErr.message);
            }
        }

        // Load existing resource allocations and work items map
        let allocMap = {};
        try {
            const allocRes = await pool.query("SELECT * FROM public.resource_allocations");
            (allocRes.rows || []).forEach(a => {
                const sId = a.user_story_id;
                if (sId) {
                    if (!allocMap[sId]) allocMap[sId] = [];
                    allocMap[sId].push(a);

                    const cleanId = String(sId).replace(/^WI-/, '').replace(/-\d+$/, '').replace(/[^a-zA-Z0-9]/g, '');
                    if (cleanId && !allocMap[cleanId]) allocMap[cleanId] = [];
                    if (cleanId && !allocMap[cleanId].includes(a)) allocMap[cleanId].push(a);
                }
            });
        } catch (aErr) {}

        let workItemsMap = {};
        try {
            const wiRes = await pool.query("SELECT * FROM public.work_items");
            (wiRes.rows || []).forEach(w => {
                const sId = w.story_id || w.parent_user_story_id;
                if (sId) {
                    if (!workItemsMap[sId]) workItemsMap[sId] = [];
                    workItemsMap[sId].push(w);

                    const cleanId = String(sId).replace(/[^a-zA-Z0-9]/g, '');
                    if (cleanId && !workItemsMap[cleanId]) workItemsMap[cleanId] = [];
                    if (cleanId && !workItemsMap[cleanId].includes(w)) workItemsMap[cleanId].push(w);
                }
            });
        } catch (wErr) {}

        // 3. ANNOTATE STORIES WITH PROCESS TIERS, PROCESS STEPS, AND DEPENDENCIES
        stories.forEach(s => {
            const processMeta = analyzeProcessAndDependencyTier(s.title, s.description);
            s.dependencyTier = processMeta.tier;
            s.dependency_tier = processMeta.tier;
            s.processStep = processMeta.processStep;
            s.process_step = processMeta.processStep;
            s.processGroup = processMeta.group;
            s.process_group = processMeta.group;

            const rank = getPriorityRank(s.priority, `${s.title || ''} ${s.description || ''}`);
            if (rank === 1) {
                s.priority = 'HIGH';
            }
            s.priorityRank = rank;

            const sid = s.story_id || s.user_story_id;
            const cleanSid = String(sid || '').replace(/[^a-zA-Z0-9]/g, '');
            const matchedAllocs = allocMap[sid] || allocMap[`US-${sid}`] || allocMap[cleanSid] || [];
            const matchedWIs = workItemsMap[sid] || workItemsMap[cleanSid] || [];

            const wiDevNames = matchedWIs.map(w => w.assigned_developer_name).filter(Boolean);
            const allocDevNames = matchedAllocs.map(a => a.resource_name || a.developer_name).filter(Boolean);
            const allAssignedDevs = Array.from(new Set([...wiDevNames, ...allocDevNames]));

            if (allAssignedDevs.length > 0 && (!s.assigned_to || s.assigned_to === 'Unassigned')) {
                s.assigned_to = allAssignedDevs.join(', ');
            }

            s.is_resource_allocated = matchedAllocs.length > 0 || wiDevNames.length > 0 || (s.assigned_to && s.assigned_to !== 'Unassigned');
            s.resource_allocations = matchedAllocs;
            s.db_work_items = matchedWIs;
        });

        // 4. DEPENDENCY TOPOLOGICAL SORTING (Rules 1, 2, 6, 7)
        // Sort Priority Order: Dependency Tier ASC -> Process Step ASC -> Priority Rank ASC -> Natural Story ID ASC
        stories.sort((a, b) => {
            if (a.dependencyTier !== b.dependencyTier) {
                return a.dependencyTier - b.dependencyTier;
            }
            if (a.processStep !== b.processStep) {
                return a.processStep - b.processStep;
            }
            if (a.priorityRank !== b.priorityRank) {
                return a.priorityRank - b.priorityRank;
            }
            const idA = parseInt((a.story_id || '').replace(/\D/g, '')) || 0;
            const idB = parseInt((b.story_id || '').replace(/\D/g, '')) || 0;
            return idA - idB;
        });

        // 5. PROCESS-FLOW-AWARE SPRINT ASSIGNMENT (Rules 3, 4, 5, 7)
        // Group stories by processGroup & dependencyTier.
        // Do NOT balance story counts at the expense of breaking process flow.
        const MAX_SP_PER_SPRINT = 30;
        let currentSprint = 1;
        let currentSprintPoints = 0;
        let currentProcessGroup = null;

        stories.forEach(story => {
            const points = Number(story.story_points) || 5;

            // Check if adding this story exceeds sprint capacity
            const exceedsCapacity = (currentSprintPoints + points > MAX_SP_PER_SPRINT) && (currentSprintPoints > 0);
            
            // Check if process group changed at a logical functional boundary
            const isGroupBoundary = currentProcessGroup && (currentProcessGroup !== story.processGroup);

            if (exceedsCapacity || (isGroupBoundary && currentSprintPoints >= 20)) {
                currentSprint++;
                currentSprintPoints = 0;
            }

            currentSprintPoints += points;
            currentProcessGroup = story.processGroup;
            story.assignedSprintNumber = currentSprint;
        });

        // 6. RULE 8: MANDATORY VALIDATION & CORRECTION PASS
        // Validate that S(Dependent) >= S(Prerequisite). If S(Dependent) < S(Prerequisite), adjust S(Dependent) = S(Prerequisite).
        let violationFound = true;
        let passCount = 0;
        while (violationFound && passCount < 10) {
            violationFound = false;
            passCount++;

            for (let i = 0; i < stories.length; i++) {
                const story = stories[i];

                // Find any prerequisite stories that must precede this story
                const prereqs = stories.filter(p => {
                    if (p.story_id === story.story_id) return false;
                    // Prerequisite if lower dependency tier or lower process step within same group
                    return (p.dependencyTier < story.dependencyTier) || 
                           (p.dependencyTier === story.dependencyTier && p.processStep < story.processStep);
                });

                for (const prereq of prereqs) {
                    if (story.assignedSprintNumber < prereq.assignedSprintNumber) {
                        console.warn(`⚠️ Rule 8 Enforcement: ${story.story_id} (${story.title}) assigned to Sprint ${story.assignedSprintNumber} was less than prerequisite ${prereq.story_id} (Sprint ${prereq.assignedSprintNumber}). Adjusting ${story.story_id} to Sprint ${prereq.assignedSprintNumber}.`);
                        story.assignedSprintNumber = prereq.assignedSprintNumber;
                        violationFound = true;
                    }
                }
            }
        }

        // Re-calculate total sprints count after validation
        let maxFinalSprint = 1;
        stories.forEach(s => {
            if (s.assignedSprintNumber > maxFinalSprint) {
                maxFinalSprint = s.assignedSprintNumber;
            }
        });

        // 7. BUILD FINAL RESPONSE & PERSIST TO DB
        const plannedTasks = [];
        const updatePromises = [];

        for (let i = 0; i < stories.length; i++) {
            const story = stories[i];
            const points = Number(story.story_points) || 5;
            const sNum = story.assignedSprintNumber;
            const targetSprintId = `SPR-${sNum < 10 ? '0' + sNum : sNum}`;
            story.sprint_id = targetSprintId;

            const workItems = (story.db_work_items && story.db_work_items.length > 0) 
                ? story.db_work_items 
                : buildWorkItemsForStory(story);

            plannedTasks.push({
                story_id: story.story_id || story.user_story_id || `US-${i+1}`,
                title: story.title || story.user_story || 'User Story Requirement',
                priority: (story.priority || 'MEDIUM').toUpperCase(),
                story_points: points,
                estimated_hours: points * 6,
                sprint_number: sNum,
                sprint_id: targetSprintId,
                duration_weeks: 2,
                status: story.status || 'IN_PROGRESS',
                assigned_to: story.assigned_to || 'Unassigned',
                is_resource_allocated: story.is_resource_allocated || false,
                resource_allocations: story.resource_allocations || [],
                dependency_tier: story.dependencyTier,
                process_step: story.processStep,
                process_group: story.processGroup,
                work_items: workItems
            });

            if (story.story_id) {
                updatePromises.push(
                    pool.query(
                        "UPDATE user_stories SET sprint_id = $1, project_id = $2, priority = $3 WHERE story_id = $4 OR user_story_id = $4",
                        [targetSprintId, effectivePid, (story.priority || 'MEDIUM').toUpperCase(), story.story_id]
                    ).catch(() => {})
                );
            }
        }

        try {
            await Promise.all(updatePromises);
            for (let sNum = 1; sNum <= maxFinalSprint; sNum++) {
                const sId = `SPR-${sNum < 10 ? '0' + sNum : sNum}`;
                await pool.query(`
                    INSERT INTO sprints (sprint_id, project_id, sprint_name, sprint_number, status, capacity_story_points)
                    VALUES ($1, $2, $3, $4, $5, 30)
                    ON CONFLICT (sprint_id) DO UPDATE SET
                    project_id = EXCLUDED.project_id,
                    status = EXCLUDED.status
                `, [sId, effectivePid, `Sprint ${sNum}`, sNum, sNum === 1 ? 'ACTIVE' : 'PENDING']);
            }
        } catch (spErr) {
            console.warn('Notice syncing sprint rows:', spErr.message);
        }

        res.json({
            status: 'success',
            tasks: plannedTasks,
            sprint_duration_weeks: 2
        });
    } catch (err) {
        console.error('Sprint plan error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

app.post('/api/replan-full', async (req, res) => {
    try {
        const { story_id, title, description, story_points, project_id } = req.body;
        const sid = story_id || `US00${Math.floor(100 + Math.random() * 900)}`;
        const pid = project_id || 'P00001';
        const points = Number(story_points) || 5;

        // Upsert story if title provided
        if (title) {
            await pool.query(
                `INSERT INTO user_stories (story_id, user_story_id, project_id, sprint_id, title, description, story_points, priority, status, assigned_to)
                 VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (story_id) DO UPDATE SET 
                 title = EXCLUDED.title,
                 description = EXCLUDED.description,
                 story_points = EXCLUDED.story_points`,
                [sid, pid, 'SPR-01', title, description || '', points, points > 8 ? 'HIGH' : 'MEDIUM', 'IN_PROGRESS', 'Unassigned']
            );
        }

        // Fetch all stories and re-plan into 2-week sprints using Dependency Tier Sorting
        const storiesResult = await pool.query("SELECT * FROM user_stories ORDER BY story_id ASC");
        let stories = storiesResult.rows;

        stories.forEach(s => {
            s.dependencyTier = getDependencyTier(s.title, s.description);
            s.priorityRank = getPriorityRank(s.priority, `${s.title || ''} ${s.description || ''}`);
        });

        // Dependency tier sorting
        stories.sort((a, b) => {
            if (a.dependencyTier !== b.dependencyTier) return a.dependencyTier - b.dependencyTier;
            if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
            return 0;
        });

        const MAX_SP_PER_SPRINT = 30;
        let currentSprint = 1;
        let currentSprintPoints = 0;
        const plannedTasks = [];

        for (let i = 0; i < stories.length; i++) {
            const story = stories[i];
            const p = Number(story.story_points) || 5;
            if (currentSprintPoints + p > MAX_SP_PER_SPRINT && currentSprintPoints > 0) {
                currentSprint++;
                currentSprintPoints = 0;
            }
            currentSprintPoints += p;
            plannedTasks.push({
                story_id: story.story_id || story.user_story_id,
                title: story.title,
                priority: (story.priority || 'MEDIUM').toUpperCase(),
                story_points: p,
                estimated_hours: p * 6,
                sprint_number: currentSprint,
                duration_weeks: 2
            });
        }

        // Upsert calculated sprints into PostgreSQL sprints table
        try {
            for (let sNum = 1; sNum <= currentSprint; sNum++) {
                const sId = `SPR-${sNum < 10 ? '0' + sNum : sNum}`;
                await pool.query(`
                    INSERT INTO sprints (sprint_id, project_id, sprint_name, sprint_number, status, capacity_story_points)
                    VALUES ($1, $2, $3, $4, $5, 30)
                    ON CONFLICT (sprint_id) DO UPDATE SET
                    project_id = EXCLUDED.project_id,
                    status = EXCLUDED.status
                `, [sId, pid, `Sprint ${sNum}`, sNum, sNum === 1 ? 'ACTIVE' : 'PENDING']);
            }
        } catch (spErr) {
            console.warn('Notice syncing replan to DB:', spErr.message);
        }

        res.json({
            status: 'success',
            tasks: plannedTasks,
            message: 'Automated 2-week sprint plan recalculated successfully'
        });
    } catch (err) {
        console.error('Replan error:', err);
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Helper to ensure allocation tables exist with project_name column
async function ensureAllocationTablesExist() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.allocations (
                id SERIAL PRIMARY KEY,
                sprint_id TEXT NOT NULL,
                story_id TEXT NOT NULL,
                developer_id TEXT NOT NULL,
                allocated_hours NUMERIC DEFAULT 0,
                predicted_complexity TEXT DEFAULT 'MEDIUM',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS public.resource_allocations (
                id SERIAL PRIMARY KEY,
                sprint_id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                project_name TEXT,
                user_story_id TEXT NOT NULL,
                resource_id TEXT NOT NULL,
                resource_name TEXT NOT NULL,
                role TEXT NOT NULL,
                allocated_hours NUMERIC DEFAULT 0,
                allocation_percentage NUMERIC DEFAULT 100,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // Ensure project_name column exists if table was created previously
        await pool.query(`
            ALTER TABLE public.resource_allocations ADD COLUMN IF NOT EXISTS project_name TEXT;
            ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS current_workload_hours NUMERIC DEFAULT 0;
            ALTER TABLE public.developers ADD COLUMN IF NOT EXISTS is_fully_allocated BOOLEAN DEFAULT false;
        `);
    } catch (err) {
        console.warn('Notice ensuring allocation tables exist:', err.message);
    }
}

app.post('/api/task-assignments', async (req, res) => {
    try {
        const { sprint_id, assignments } = req.body;
        if (!sprint_id || !assignments || !Array.isArray(assignments) || assignments.length === 0) {
            return res.status(400).json({ error: 'Missing sprint_id or assignments array' });
        }

        // Ensure database tables exist before performing queries
        await ensureAllocationTablesExist();

        const sprintIdStr = String(sprint_id).startsWith('SPR-') ? String(sprint_id) : `SPR-0${sprint_id}`;
        const pid = req.body.project_id || 'P00001';

        // Load developers to verify capacity & availability status
        const devRes = await pool.query('SELECT * FROM developers');
        const devMap = {};
        (devRes.rows || []).forEach(d => {
            devMap[String(d.id)] = d;
        });

        // Map and validate assignments that have a valid developer_id and story_id
        const validAssignments = (assignments || []).filter(a => {
            if (!a || (!a.story_id && !a.id)) return false;
            const devId = a.developer_id !== undefined && a.developer_id !== null ? String(a.developer_id) : null;
            return devId && devId !== '0' && devId !== 'null' && devId !== 'undefined';
        }).map(a => {
            const devIdStr = String(a.developer_id);
            const matchedDev = devMap[devIdStr] || {};
            return {
                story_id: a.story_id || a.id,
                developer_id: a.developer_id,
                developer_name: a.developer_name || matchedDev.name || 'Software Engineer',
                developer_role: a.developer_role || matchedDev.role || 'Software Engineer',
                allocated_hours: Number(a.allocated_hours) || 35,
                predicted_complexity: a.predicted_complexity || 'MEDIUM'
            };
        });

        if (validAssignments.length === 0) {
            return res.status(400).json({ error: 'No active task assignments provided to save.' });
        }

        // Clear previous allocations for this sprint to prevent duplicate rows
        try {
            await pool.query('DELETE FROM allocations WHERE sprint_id = $1', [sprintIdStr]);
            await pool.query('DELETE FROM resource_allocations WHERE sprint_id = $1', [sprintIdStr]);
        } catch (delErr) {
            console.warn('Notice clearing previous sprint allocations:', delErr.message);
        }

        // Dynamic Resolution: Ensure project_id & project_name accurately reflect the chosen project
        let resolvedProjectId = req.body.project_id || '';
        let projectName = req.body.project_name || '';

        try {
            const projRes = await pool.query(
                'SELECT project_id, project_name FROM projects WHERE project_id = $1', 
                [resolvedProjectId]
            );
            if (projRes.rows && projRes.rows.length > 0) {
                if (projRes.rows[0].project_id) resolvedProjectId = projRes.rows[0].project_id;
                if (projRes.rows[0].project_name) projectName = projRes.rows[0].project_name;
            } else {
                const sprintRes = await pool.query(`
                    SELECT p.project_id, p.project_name 
                    FROM sprints s 
                    JOIN projects p ON s.project_id = p.project_id
                    WHERE s.sprint_id = $1
                `, [sprintIdStr]);
                if (sprintRes.rows && sprintRes.rows.length > 0) {
                    if (sprintRes.rows[0].project_id) resolvedProjectId = sprintRes.rows[0].project_id;
                    if (sprintRes.rows[0].project_name) projectName = sprintRes.rows[0].project_name;
                }
            }
        } catch (pErr) {
            console.warn('Notice resolving project details:', pErr.message);
        }

        const finalProjectId = resolvedProjectId || req.body.project_id || 'P729182';
        const finalProjectName = projectName || req.body.project_name || 'Project tracker';

        // 1. Batch Insert into allocations table
        try {
            const chunkSize = 50;
            for (let i = 0; i < validAssignments.length; i += chunkSize) {
                const chunk = validAssignments.slice(i, i + chunkSize);
                const valueRows = [];
                const valueParams = [];
                let paramIdx = 1;

                for (const a of chunk) {
                    valueRows.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
                    valueParams.push(sprintIdStr, a.story_id, a.developer_id, a.allocated_hours, a.predicted_complexity);
                }

                await pool.query(
                    `INSERT INTO allocations (sprint_id, story_id, developer_id, allocated_hours, predicted_complexity) VALUES ${valueRows.join(', ')}`,
                    valueParams
                );
            }
        } catch (allocErr) {
            console.warn('Notice saving allocations table:', allocErr.message);
        }

        // Load user_stories mapping to ensure each story uses its exact project_id and project_name
        const storyMap = {};
        try {
            const storyRes = await pool.query(`
                SELECT u.story_id, u.user_story_id, u.project_id, p.project_name
                FROM public.user_stories u
                LEFT JOIN public.projects p ON u.project_id = p.project_id
            `);
            (storyRes.rows || []).forEach(s => {
                const sData = {
                    project_id: s.project_id || finalProjectId,
                    project_name: s.project_name || finalProjectName
                };
                if (s.story_id) storyMap[String(s.story_id)] = sData;
                if (s.user_story_id) storyMap[String(s.user_story_id)] = sData;
            });
        } catch (sErr) {}

        // 2. Batch Sync to resource_allocations table (with per-story project_id and project_name)
        try {
            const chunkSize = 50;
            for (let i = 0; i < validAssignments.length; i += chunkSize) {
                const chunk = validAssignments.slice(i, i + chunkSize);
                const valueRows = [];
                const valueParams = [];
                let paramIdx = 1;

                for (const a of chunk) {
                    const sInfo = storyMap[String(a.story_id)] || { project_id: finalProjectId, project_name: finalProjectName };
                    const itemProjId = sInfo.project_id || finalProjectId;
                    const itemProjName = sInfo.project_name || finalProjectName;
                    const resIdStr = String(a.developer_id).startsWith('RES-') ? String(a.developer_id) : `RES-${String(a.developer_id).padStart(3, '0')}`;

                    valueRows.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
                    valueParams.push(
                        sprintIdStr,
                        itemProjId,
                        itemProjName,
                        a.story_id,
                        resIdStr,
                        a.developer_name,
                        a.developer_role,
                        a.allocated_hours,
                        100
                    );
                }

                await pool.query(
                    `INSERT INTO resource_allocations (sprint_id, project_id, project_name, user_story_id, resource_id, resource_name, role, allocated_hours, allocation_percentage) VALUES ${valueRows.join(', ')}`,
                    valueParams
                );
            }
        } catch (resErr) {
            console.warn('Notice syncing to resource_allocations table:', resErr.message);
        }

        // 3. Sync developer names to user_stories and work_items tables
        try {
            for (const a of validAssignments) {
                if (a.story_id && a.developer_name) {
                    // Update user_stories table directly if story_id matches
                    await pool.query(
                        `UPDATE user_stories SET assigned_to = $1 WHERE story_id = $2 OR user_story_id = $2`,
                        [a.developer_name, a.story_id]
                    );

                    // If a.story_id is a work_item_id (e.g. WI-...), update work_items table AND parent user story
                    if (String(a.story_id).startsWith('WI-')) {
                        await pool.query(
                            `UPDATE work_items SET assigned_developer_id = $1, assigned_developer_name = $2, status = 'ASSIGNED' WHERE work_item_id = $3`,
                            [a.developer_id, a.developer_name, a.story_id]
                        );

                        const parentStoryId = a.user_story_id || a.story_id.replace(/^WI-/, '').replace(/-\d+$/, '');
                        if (parentStoryId) {
                            await pool.query(
                                `UPDATE user_stories SET assigned_to = $1 WHERE story_id = $2 OR user_story_id = $2 OR REGEXP_REPLACE(story_id, '[^a-zA-Z0-9]', '', 'g') = $3`,
                                [a.developer_name, parentStoryId, parentStoryId.replace(/[^a-zA-Z0-9]/g, '')]
                            );
                        }
                    }
                }
            }
        } catch (usErr) {
            console.warn('Notice syncing assigned_to in user_stories & work_items:', usErr.message);
        }

        // 4. Auto-sync exact project_id & project_name from user_stories & projects tables
        try {
            await pool.query(`
                UPDATE public.resource_allocations ra 
                SET project_id = u.project_id,
                    project_name = p.project_name 
                FROM public.user_stories u 
                JOIN public.projects p ON u.project_id = p.project_id 
                WHERE ra.user_story_id = u.story_id OR ra.user_story_id = u.user_story_id
            `);
        } catch (syncErr) {
            console.warn('Notice syncing exact project names:', syncErr.message);
        }

        res.json({ 
            success: true, 
            message: `Successfully saved ${validAssignments.length} task assignments to database for project "${finalProjectName}".`, 
            project_id: finalProjectId,
            project_name: finalProjectName,
            savedCount: validAssignments.length 
        });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================= RESOURCE ALLOCATION DASHBOARD API =================
app.get('/api/resource-allocations/dashboard', async (req, res) => {
    try {
        const { project_id } = req.query;
        let sql = `
            SELECT 
                a.id,
                a.story_id,
                COALESCE(u.title, a.story_id) as story_title,
                COALESCE(u.priority, 'MEDIUM') as priority,
                COALESCE(u.story_points, 5) as story_points,
                a.developer_id,
                COALESCE(d.name, 'Unassigned Developer') as developer_name,
                COALESCE(d.role, 'Software Engineer') as developer_role,
                COALESCE(d.primary_domain, 'Full Stack') as primary_domain,
                COALESCE(d.capacity_hours, 40) as developer_capacity,
                a.allocated_hours,
                COALESCE(a.predicted_complexity, 'MEDIUM') as predicted_complexity,
                COALESCE(u.project_id, 'P00001') as project_id,
                COALESCE(p.project_name, 'Aurora System') as project_name,
                COALESCE(a.sprint_id, 'SPR-01') as sprint_id,
                a.created_at
            FROM public.allocations a
            LEFT JOIN public.developers d ON CAST(a.developer_id AS TEXT) = CAST(d.id AS TEXT)
            LEFT JOIN public.user_stories u ON a.story_id = u.story_id
            LEFT JOIN public.projects p ON u.project_id = p.project_id
        `;
        let params = [];
        if (project_id && project_id !== 'ALL') {
            sql += ` WHERE u.project_id = $1 OR a.sprint_id IN (SELECT sprint_id FROM sprints WHERE project_id = $1)`;
            params.push(project_id);
        }
        sql += ` ORDER BY a.created_at DESC, a.id DESC`;

        const result = await pool.query(sql, params);
        let allocations = result.rows || [];

        res.json({
            success: true,
            count: allocations.length,
            allocations: allocations
        });
    } catch (err) {
        console.error('Resource allocation dashboard API error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Clear all allocation data endpoint
app.delete('/api/resource-allocations/clear', async (req, res) => {
    try {
        await pool.query('TRUNCATE TABLE allocations, resource_allocations RESTART IDENTITY');
        res.json({ success: true, message: 'All past allocation data successfully cleared.' });
    } catch (err) {
        console.warn('Notice clearing allocations:', err.message);
        try {
            await pool.query('DELETE FROM allocations; DELETE FROM resource_allocations;');
            res.json({ success: true, message: 'Cleared allocations table rows.' });
        } catch (deleteErr) {
            res.status(500).json({ error: deleteErr.message });
        }
    }
});

// Start Express server immediately so port 3000 is accessible without delay
const server = app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log('='.repeat(50));
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use by another process.`);
        console.error(`👉 Please terminate any orphaned node process on port ${PORT} or update PORT in .env`);
        process.exit(1);
    } else {
        console.error('❌ Server error:', err);
    }
});

// Initialize models database asynchronously in the background
initializeDatabase()
    .then(() => {
        console.log('✅ Models database initialized successfully');
    })
    .catch(err => {
        console.warn('⚠️ Database initialization warning:', err.message);
    });

// Process resilience handlers for Neon serverless PostgreSQL connection resets
process.on('uncaughtException', (err) => {
    console.warn('⚠️ Process Notice (uncaughtException):', err.message || err);
});

process.on('unhandledRejection', (reason) => {
    console.warn('⚠️ Process Notice (unhandledRejection):', reason?.message || reason);
});




