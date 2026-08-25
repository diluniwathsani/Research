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

const changeRequestRoutes = require('./routes/changeRequestRoutes');
const changeRequestController = require('./controllers/changeRequestController');
const { log } = require('console');
app.use('/api/change-requests', changeRequestRoutes);
app.get('/api/projects', changeRequestController.getAllProjects);

// ================= REQUIREMENTS ENDPOINTS =================

// Upload Excel requirements
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const { batch_name, project_name } = req.body;
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const uploadTime = new Date().toISOString();
        const client = await pool.connect();
        const effectiveProjectName = project_name || batch_name || 'Aurora ERP System';
        const effectiveProjectId = `P${Date.now().toString().slice(-6)}`;

        // Save Project to database outside transaction block to prevent transaction abortion
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
            await pool.query(
                `INSERT INTO public.projects (project_id, project_name, description, project_manager, team_size, progress_percent, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (project_id) DO UPDATE SET project_name = EXCLUDED.project_name`,
                [effectiveProjectId, effectiveProjectName, 'Uploaded from Development Artifact Module', 'Michael Henry (Lead PM)', 8, 30, 'ACTIVE']
            );

            // Auto-create sprint entries in sprints table
            try {
                await pool.query(`
                    INSERT INTO public.sprints (sprint_id, project_id, sprint_name, sprint_number, status, capacity_story_points)
                    VALUES 
                    ($1, $2, 'Sprint 1 - Core Development', 1, 'ACTIVE', 30),
                    ($3, $2, 'Sprint 2 - Refinement & Integration', 2, 'PENDING', 30)
                    ON CONFLICT (sprint_id) DO NOTHING
                `, [`${effectiveProjectId}-SPR-01`, effectiveProjectId, `${effectiveProjectId}-SPR-02`]);
            } catch (spErr) {
                console.warn('Notice creating project sprints:', spErr.message);
            }
        } catch (pErr) {
            console.warn('Notice saving uploaded project:', pErr.message);
        }

        try {
            await client.query('BEGIN');

            // Defensive table auto-creation check
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
                    created_at TEXT
                )
            `);

            for (const row of data) {
                let reqText = '';
                // 1. Check known common column keys first
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

                // 2. Fallback: inspect all cell values in row and pick non-empty text
                if (!reqText) {
                    const values = Object.values(row)
                        .filter(v => v !== undefined && v !== null)
                        .map(v => String(v).trim())
                        .filter(v => v.length > 0);
                    if (values.length > 0) {
                        // Pick longest cell text to capture complete requirement sentence
                        values.sort((a, b) => b.length - a.length);
                        reqText = values[0];
                    }
                }

                if (reqText && reqText.length > 0) {
                    const reqRes = await client.query(
                        "INSERT INTO public.requirements (requirement_sentence, created_at, batch_name) VALUES ($1, $2, $3) RETURNING id",
                        [reqText, uploadTime, effectiveProjectName]
                    );
                    const insertedId = reqRes.rows[0]?.id;
                    if (insertedId) {
                        const cleanText = reqText.endsWith('.') ? reqText.slice(0, -1) : reqText;
                        const generatedStoryTitle = `As a System User, I want to ${cleanText.charAt(0).toLowerCase() + cleanText.slice(1)}.`;
                        const points = Math.min(8, Math.max(2, Math.round(reqText.length / 18)));
                        try {
                            await client.query(
                                `INSERT INTO public.user_stories (story_id, user_story_id, project_id, sprint_id, title, description, story_points, priority, status, assigned_to)
                                 VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
                                 ON CONFLICT (story_id) DO UPDATE SET 
                                 project_id = EXCLUDED.project_id,
                                 title = EXCLUDED.title,
                                 story_points = EXCLUDED.story_points`,
                                [
                                    `US-${insertedId}`,
                                    effectiveProjectId,
                                    'SPR-01',
                                    generatedStoryTitle,
                                    `Acceptance Criteria: Verify ${cleanText}`,
                                    points,
                                    points >= 5 ? 'High' : 'Medium',
                                    'IN_PROGRESS',
                                    'Unassigned'
                                ]
                            );
                        } catch (uErr) {
                            console.warn('Notice generating story during upload:', uErr.message);
                        }
                    }
                }
            }

            await client.query('COMMIT');
            res.json({ message: 'File uploaded and project created successfully', project_id: effectiveProjectId, project_name: effectiveProjectName });
        } catch (dbErr) {
            await client.query('ROLLBACK');
            console.error('Upload DB error:', dbErr);
            res.status(500).json({ error: dbErr.message || 'Failed to insert requirements into database' });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('File process error:', err);
        res.status(500).json({ error: 'Failed to process file' });
    }
});

// Get Requirements
app.get('/api/requirements', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM requirements ORDER BY id DESC");
        res.json(result.rows || []);
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
        const result = await pool.query("SELECT id, requirement_sentence FROM requirements");
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
                const fallbackResults = rows.map(r => ({
                    id: r.id,
                    status: r.requirement_sentence.length > 20 ? 'Complete' : 'Incomplete: Too short',
                    epic: 'Pending Generation',
                    feature: 'Pending',
                    user_story: 'Pending',
                    acceptance_criteria: 'Pending'
                }));

                await updateDatabase(fallbackResults, res);
                return;
            }

            try {
                const results = JSON.parse(stdout);
                const idLookup = {};
                rows.forEach(r => { idLookup[r.requirement_sentence] = r.id; });

                const finalResults = results.map(resultItem => ({
                    ...resultItem,
                    id: idLookup[resultItem.requirement]
                }));


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
        for (const r of results) {
            await client.query(
                `UPDATE requirements 
                 SET completeness_status = $1, 
                     epic = $2, feature = $3, user_story = $4, acceptance_criteria = $5
                 WHERE id = $6`,
                [
                    r.status,
                    r.epic || '',
                    r.feature || '',
                    r.user_story || '',
                    r.acceptance_criteria || '',
                    r.id
                ]
            );

            // Save generated user story into user_stories table for cross-module integration
            if (r.user_story && r.user_story !== 'Pending') {
                try {
                    await client.query(
                        `INSERT INTO user_stories (story_id, user_story_id, project_id, sprint_id, title, description, story_points, priority, status, assigned_to)
                         VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
                         ON CONFLICT (story_id) DO UPDATE SET
                         title = EXCLUDED.title,
                         description = EXCLUDED.description`,
                        [
                            `US-${r.id}`,
                            'P00001',
                            'SPR-01',
                            r.user_story,
                            r.acceptance_criteria || r.requirement || '',
                            5,
                            'Medium',
                            'IN_PROGRESS',
                            'Unassigned'
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
    const { timestamp } = req.query;
    if (!timestamp) return res.status(400).json({ error: 'Timestamp is required' });

    try {
        const result = await pool.query("SELECT * FROM requirements WHERE created_at = $1", [timestamp]);
        const rows = result.rows;
        if (rows.length === 0) return res.status(404).json({ error: 'No requirements found for this batch' });

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
        const result = await pool.query("SELECT * FROM requirements ORDER BY id ASC");
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

const PROJECTS = [{ id: 1, project_id: 'P00001', name: 'AI Sprint Allocation System', project_name: 'AI Sprint Allocation System' }];

app.get('/api/projects', async (req, res) => {
    try {
        const result = await pool.query("SELECT project_id, project_name, description, project_manager, status FROM projects WHERE UPPER(status) IN ('ACTIVE', 'IN_PROGRESS', 'PLANNING') ORDER BY project_name ASC");
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
        console.warn("⚠️ Projects DB fetch error, using fallback:", err.message);
    }
    res.json(PROJECTS);
});

// ================= SPRINTS =================

const SPRINTS = [
    { id: 1, sprint_id: 'SPR-01', name: 'Sprint 1', sprint_name: 'Sprint 1', projectId: 1, project_id: 'P00001' },
    { id: 2, sprint_id: 'SPR-02', name: 'Sprint 2', sprint_name: 'Sprint 2', projectId: 1, project_id: 'P00001' }
];

app.get('/api/projects/:projectId/sprints', async (req, res) => {
    const projectIdParam = req.params.projectId;
    try {
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
        console.warn("⚠️ Sprints DB fetch error:", err.message);
    }
    const projectId = parseInt(projectIdParam) || 1;
    const filtered = SPRINTS.filter(s => s.projectId === projectId || s.project_id === projectIdParam);
    res.json(filtered.length > 0 ? filtered : SPRINTS);
});

// ================= TASKS =================

const TEST_TASKS = {
    1: [
        {
            story_id: 'US001',
            title: 'Fix login bug',
            priority: 'HIGH',
            estimated_hours: 8,
            story_points: 2,
            complexity: 'LOW',
            required_domain: 'backend',
            required_skills: ['JavaScript', 'SQL']
        },
        {
            story_id: 'US002',
            title: 'Add dark mode',
            priority: 'MEDIUM',
            estimated_hours: 16,
            story_points: 3,
            complexity: 'MEDIUM',
            required_domain: 'frontend',
            required_skills: ['JavaScript', 'React', 'CSS']
        },
        {
            story_id: 'US003',
            title: 'Write documentation',
            priority: 'LOW',
            estimated_hours: 4,
            story_points: 1,
            complexity: 'LOW',
            required_domain: 'general',
            required_skills: ['Communication']
        },
        {
            story_id: 'US007',
            title: 'Optimize database indexing',
            priority: 'HIGH',
            estimated_hours: 32,
            story_points: 8,
            complexity: 'HIGH',
            required_domain: 'backend',
            required_skills: ['SQL', 'Python', 'Database']
        },
        {
            story_id: 'US008',
            title: 'Train ML model',
            priority: 'HIGH',
            estimated_hours: 40,
            story_points: 13,
            complexity: 'HIGH',
            required_domain: 'ai',
            required_skills: ['Python', 'ML', 'TensorFlow']
        },
        {
            story_id: 'US009',
            title: 'Responsive design',
            priority: 'MEDIUM',
            estimated_hours: 20,
            story_points: 5,
            complexity: 'MEDIUM',
            required_domain: 'frontend',
            required_skills: ['CSS', 'React', 'HTML']
        }
    ],
    2: [
        {
            story_id: 'US004',
            title: 'Optimize database',
            priority: 'HIGH',
            estimated_hours: 24,
            story_points: 5,
            complexity: 'MEDIUM',
            required_domain: 'backend',
            required_skills: ['SQL', 'Python']
        },
        {
            story_id: 'US005',
            title: 'Create API docs',
            priority: 'LOW',
            estimated_hours: 6,
            story_points: 2,
            complexity: 'LOW',
            required_domain: 'general',
            required_skills: ['Communication', 'Writing']
        },
        {
            story_id: 'US006',
            title: 'Implement ML feature',
            priority: 'HIGH',
            estimated_hours: 40,
            story_points: 8,
            complexity: 'HIGH',
            required_domain: 'ai',
            required_skills: ['Python', 'ML', 'Data Science']
        }
    ]
};

app.get('/api/sprints/:sprintId/tasks', async (req, res) => {
    const sprintIdParam = req.params.sprintId;
    const projectIdParam = req.query.project_id;
    try {
        let query = "SELECT * FROM user_stories ORDER BY story_id DESC";
        let params = [];
        if (projectIdParam && projectIdParam !== 'ALL') {
            query = "SELECT * FROM user_stories WHERE project_id = $1 OR sprint_id = $2 OR sprint_id = $3 ORDER BY story_id DESC";
            params = [projectIdParam, sprintIdParam, `SPR-0${sprintIdParam}`];
        } else {
            query = "SELECT * FROM user_stories WHERE sprint_id = $1 OR sprint_id = $2 OR sprint_id = $3 OR $1 = '1' OR $1 = 'SPR-01' OR $1 = 'SPR-1' ORDER BY story_id DESC";
            params = [sprintIdParam, `SPR-0${sprintIdParam}`, `SPR-${sprintIdParam}`];
        }

        const dbRes = await pool.query(query, params);
        if (dbRes.rows && dbRes.rows.length > 0) {
            const tasks = dbRes.rows.map(row => ({
                story_id: row.story_id || row.user_story_id,
                title: row.title || row.user_story || 'User Story Requirement',
                priority: (row.priority || 'MEDIUM').toUpperCase(),
                estimated_hours: row.story_points ? row.story_points * 6 : (row.estimated_hours || 16),
                story_points: row.story_points || 3,
                complexity: row.story_points > 8 ? 'HIGH' : row.story_points > 4 ? 'MEDIUM' : 'LOW',
                required_domain: (row.title || '').toLowerCase().includes('database') || (row.title || '').toLowerCase().includes('sql') || (row.title || '').toLowerCase().includes('auth') ? 'backend' : ((row.title || '').toLowerCase().includes('ml') || (row.title || '').toLowerCase().includes('ai') ? 'ai' : 'frontend'),
                required_skills: ['JavaScript', 'Python', 'SQL']
            }));
            console.log(`📦 Serving ${tasks.length} user stories from database for sprint ${sprintIdParam}`);
            return res.json(tasks);
        }

        // Check requirements table fallback
        const reqRes = await pool.query("SELECT * FROM requirements ORDER BY id DESC");
        if (reqRes.rows && reqRes.rows.length > 0) {
            const tasks = reqRes.rows.map((row, idx) => ({
                story_id: `US-${row.id}`,
                title: row.user_story || row.requirement_sentence,
                priority: idx % 2 === 0 ? 'HIGH' : 'MEDIUM',
                estimated_hours: 16 + (idx % 3) * 8,
                story_points: 3 + (idx % 5),
                complexity: idx % 2 === 0 ? 'HIGH' : 'LOW',
                required_domain: row.epic ? row.epic.toLowerCase() : 'general',
                required_skills: ['JavaScript', 'Python', 'SQL']
            }));
            console.log(`📦 Serving ${tasks.length} requirements tasks from Module 1 for sprint ${sprintIdParam}`);
            return res.json(tasks);
        }
    } catch (err) {
        console.warn("⚠️ Task DB query notice:", err.message);
    }

    const sprintIdNum = parseInt(sprintIdParam) || 1;
    const tasks = TEST_TASKS[sprintIdNum] || TEST_TASKS[1] || [];
    console.log(`📦 Serving ${tasks.length} fallback tasks`);
    res.json(tasks);
});

// ================= DEVELOPERS CRUD =================

app.get('/api/developers', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM developers ORDER BY name');
        const developers = result.rows.map(dev => ({
            ...dev,
            languages: dev.languages ? dev.languages.split(',') : []
        }));
        res.json(developers);
    } catch (error) {
        console.error('Error fetching developers:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================= SIMPLIFIED ALLOCATION FUNCTION =================

function allocateTasks(tasks, developers) {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    // Sort tasks by priority
    const sortedTasks = [...tasks].sort((a, b) =>
        (priorityOrder[(a.priority || 'MEDIUM').toUpperCase()] ?? 2) - (priorityOrder[(b.priority || 'MEDIUM').toUpperCase()] ?? 2)
    );

    // Prepare developers with capacity tracking
    let devs = developers.map(dev => ({
        ...dev,
        remaining: Number(dev.capacity_hours) || 40,
        primary_domain: (dev.primary_domain || 'general').toLowerCase(),
        languages: Array.isArray(dev.languages) ? dev.languages : (dev.languages ? String(dev.languages).split(',').map(s => s.trim()) : [])
    }));

    const assignments = [];

    for (const task of sortedTasks) {
        const estHours = Number(task.estimated_hours) || (Number(task.story_points) ? Number(task.story_points) * 6 : 16);
        const neededDomain = (task.required_domain || 'general').toLowerCase();
        const requiredSkills = task.required_skills || [];

        // 1. Calculate Skill Match Score for all developers
        const candidates = devs.map(dev => ({
            ...dev,
            skillScore: calculateSkillMatchScore(dev.languages, requiredSkills)
        }));

        // 2. Filter by domain match & capacity
        let validCandidates = candidates.filter(dev => {
            const domainOk = (dev.primary_domain === neededDomain || neededDomain === 'general' || dev.primary_domain === 'general');
            const capacityOk = dev.remaining >= estHours;
            return domainOk && capacityOk;
        });

        // Fallback 1: Domain match regardless of remaining capacity
        if (validCandidates.length === 0) {
            validCandidates = candidates.filter(dev => 
                (dev.primary_domain === neededDomain || neededDomain === 'general' || dev.primary_domain === 'general')
            );
        }

        // Fallback 2: Any available developer
        if (validCandidates.length === 0) {
            validCandidates = [...candidates];
        }

        // Sort candidates: highest skill score first, then most remaining capacity
        validCandidates.sort((a, b) => {
            if (a.skillScore !== b.skillScore) return b.skillScore - a.skillScore;
            return b.remaining - a.remaining;
        });

        const chosen = validCandidates[0];
        const targetDevInMainList = devs.find(d => d.id === chosen.id);

        if (targetDevInMainList) {
            targetDevInMainList.remaining -= estHours;
        }

        assignments.push({
            story_id: task.story_id || task.id,
            title: task.title || task.user_story || 'User Story Requirement',
            developer_id: chosen.id,
            developer_name: chosen.name,
            allocated_hours: estHours,
            predicted_complexity: task.complexity || (task.story_points > 8 ? 'HIGH' : task.story_points > 4 ? 'MEDIUM' : 'LOW'),
            matched_domain: neededDomain,
            skill_match_score: chosen.skillScore
        });
    }

    return assignments;
}

// ================= RUN ALLOCATION =================

app.post('/api/allocate', async (req, res) => {
    try {
        const { tasks, sprint_id } = req.body;
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

        const assignments = allocateTasks(tasks, developers);

        // Save allocations to DB if sprint_id is provided
        if (sprint_id && assignments.length > 0) {
            const sprintIdStr = String(sprint_id);
            try {
                // Batch insert in chunks of 50 to avoid parameter limit
                const chunkSize = 50;
                for (let i = 0; i < assignments.length; i += chunkSize) {
                    const chunk = assignments.slice(i, i + chunkSize);
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
                console.warn('Notice saving allocations preview to DB:', allocErr.message);
            }
        }

        res.json({ success: true, assignments });
    } catch (error) {
        console.error('Allocation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// --- REST ENDPOINTS FOR CONNECTED MODULES ---


// Team Members / Resources
app.get('/api/resources', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM team_members ORDER BY name ASC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
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
        const result = await pool.query("SELECT * FROM sprint_tasks ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
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



// ================= USER STORIES API =================

app.get('/api/user-stories', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM user_stories ORDER BY story_id ASC");
        if (result.rows && result.rows.length > 0) {
            return res.json(result.rows);
        }
        const reqRes = await pool.query("SELECT * FROM requirements WHERE completeness_status = 'Complete' OR completeness_status = 'Completed by User'");
        const mapped = reqRes.rows.map((r, idx) => ({
            story_id: `US-${r.id}`,
            user_story_id: `US-${r.id}`,
            project_id: 'P00001',
            sprint_id: 'SPR-01',
            title: r.user_story || r.requirement_sentence,
            description: r.acceptance_criteria || '',
            story_points: 3 + (idx % 5),
            priority: idx % 2 === 0 ? 'HIGH' : 'MEDIUM',
            status: 'IN_PROGRESS',
            assigned_to: 'Unassigned'
        }));
        res.json(mapped);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

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
        let query = "SELECT * FROM user_stories ORDER BY story_id DESC";
        let params = [];
        if (projectId && projectId !== 'ALL') {
            query = "SELECT * FROM user_stories WHERE project_id = $1 OR project_id = 'P00001' ORDER BY story_id DESC";
            params = [projectId];
        }

        const storiesResult = await pool.query(query, params);
        let stories = storiesResult.rows;

        // If no user_stories exist in DB, fallback to requirements table
        if (!stories || stories.length === 0) {
            const reqResult = await pool.query("SELECT * FROM requirements ORDER BY id DESC");
            stories = reqResult.rows.map((r, idx) => ({
                story_id: `US-${r.id}`,
                title: r.user_story || r.requirement_sentence,
                story_points: 3 + (idx % 5),
                priority: idx % 2 === 0 ? 'HIGH' : 'MEDIUM',
                estimated_hours: (3 + (idx % 5)) * 6,
                status: 'IN_PROGRESS'
            }));
        }

        // 2-Week Sprint Allocation Engine (Max 30 SP per 2-week sprint)
        const MAX_SP_PER_SPRINT = 30;
        let currentSprint = 1;
        let currentSprintPoints = 0;
        const plannedTasks = [];

        for (let i = 0; i < stories.length; i++) {
            const story = stories[i];
            const points = Number(story.story_points) || 5;
            if (currentSprintPoints + points > MAX_SP_PER_SPRINT && currentSprintPoints > 0) {
                currentSprint++;
                currentSprintPoints = 0;
            }
            currentSprintPoints += points;
            plannedTasks.push({
                story_id: story.story_id || story.user_story_id || `US-${i+1}`,
                title: story.title || story.user_story || 'User Story Requirement',
                priority: (story.priority || 'MEDIUM').toUpperCase(),
                story_points: points,
                estimated_hours: points * 6,
                sprint_number: currentSprint,
                duration_weeks: 2,
                status: story.status || 'IN_PROGRESS'
            });
        }

        // Upsert calculated sprints into PostgreSQL sprints table
        try {
            const effectivePid = projectId && projectId !== 'ALL' ? projectId : 'P00001';
            for (let sNum = 1; sNum <= currentSprint; sNum++) {
                const sId = `SPR-0${sNum}`;
                await pool.query(`
                    INSERT INTO sprints (sprint_id, project_id, sprint_name, sprint_number, status, capacity_story_points)
                    VALUES ($1, $2, $3, $4, $5, 30)
                    ON CONFLICT (sprint_id) DO UPDATE SET
                    project_id = EXCLUDED.project_id,
                    status = EXCLUDED.status
                `, [sId, effectivePid, `Sprint ${sNum}`, sNum, sNum === 1 ? 'ACTIVE' : 'PENDING']);
            }
        } catch (spErr) {
            console.warn('Notice syncing sprint plan to DB:', spErr.message);
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

        // Fetch all stories and re-plan into 2-week sprints
        const storiesResult = await pool.query("SELECT * FROM user_stories ORDER BY story_points DESC, story_id ASC");
        let stories = storiesResult.rows;

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

// ================= SAVE FINAL ASSIGNMENTS =================

app.post('/api/task-assignments', async (req, res) => {
    try {
        const { sprint_id, assignments } = req.body;
        if (!sprint_id || !assignments) {
            return res.status(400).json({ error: 'Missing sprint_id or assignments' });
        }

        const sprintIdStr = String(sprint_id).startsWith('SPR-') ? String(sprint_id) : `SPR-0${sprint_id}`;

        // 1. Batch Insert into allocations table
        try {
            const chunkSize = 50;
            for (let i = 0; i < assignments.length; i += chunkSize) {
                const chunk = assignments.slice(i, i + chunkSize);
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

        // 2. Batch Sync to resource_allocations table
        try {
            const chunkSize = 50;
            for (let i = 0; i < assignments.length; i += chunkSize) {
                const chunk = assignments.slice(i, i + chunkSize);
                const valueRows = [];
                const valueParams = [];
                let paramIdx = 1;

                for (const a of chunk) {
                    valueRows.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
                    valueParams.push(
                        sprintIdStr,
                        'P00001',
                        a.story_id,
                        `RES-0${a.developer_id}`,
                        a.developer_name || 'Software Engineer',
                        'Software Engineer',
                        a.allocated_hours || 35,
                        100
                    );
                }

                await pool.query(
                    `INSERT INTO resource_allocations (sprint_id, project_id, user_story_id, resource_id, resource_name, role, allocated_hours, allocation_percentage) VALUES ${valueRows.join(', ')}`,
                    valueParams
                );
            }
        } catch (resErr) {
            console.warn('Notice syncing to resource_allocations table:', resErr.message);
        }

        res.json({ success: true, message: `Saved ${assignments.length} assignments across modules` });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Initialize models database and start Express server
initializeDatabase()
    .then(() => {
        console.log('✅ Models database initialized successfully');
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
    })
    .catch(err => {
        console.error('❌ Database initialization failed:', err.message);
    });


