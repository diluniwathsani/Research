// Load environment variables from the current directory
require('dotenv').config({ path: './.env' });

// Debug: Check if .env is loaded
console.log('📁 Current directory:', __dirname);
console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? '✅ Found' : '❌ Not found');
const express = require('express');
const cors = require('cors');
const pool = require('./database');  // ← Use database.js
require('dotenv').config();

const app = express();
const PORT = 3001;  // Change to 3002 if port 3001 is busy

app.use(cors());
app.use(express.json());

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

}

// ================= PROJECTS =================

const PROJECTS = [{ id: 1, name: 'AI Sprint Allocation System' }];
app.get('/api/projects', (req, res) => { res.json(PROJECTS); });

// ================= SPRINTS =================

const SPRINTS = [
    { id: 1, name: 'Sprint 1', projectId: 1 },
    { id: 2, name: 'Sprint 2', projectId: 1 }
];
app.get('/api/projects/:projectId/sprints', (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const filtered = SPRINTS.filter(s => s.projectId === projectId);
    res.json(filtered);
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

app.get('/api/sprints/:sprintId/tasks', (req, res) => {
    const sprintId = parseInt(req.params.sprintId);
    const tasks = TEST_TASKS[sprintId] || [];
    console.log(`📦 Serving ${tasks.length} tasks`);
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
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };

    // Sort tasks by priority
    const sortedTasks = [...tasks].sort((a, b) =>
        (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1)
    );

    // Prepare developers
    let devs = developers.map(dev => ({
        ...dev,
        remaining: dev.capacity_hours,
        primary_domain: dev.primary_domain || 'general',
        languages: Array.isArray(dev.languages) ? dev.languages : (dev.languages ? dev.languages.split(',').map(s => s.trim()) : [])
    }));

    const assignments = [];

    for (const task of sortedTasks) {
        const neededDomain = task.required_domain || 'general';
        const requiredSkills = task.required_skills || [];

        // Step 1: Filter developers by PRIMARY DOMAIN + CAPACITY
        let candidates = devs.map(dev => ({
            ...dev,
            skillScore: calculateSkillMatchScore(dev.languages, requiredSkills)
        })).filter(dev => {
            const domainOk = (dev.primary_domain === neededDomain || neededDomain === 'general');
            const capacityOk = dev.remaining >= task.estimated_hours;
            return domainOk && capacityOk;
        });

        // Fallback: Any developer with capacity
        if (candidates.length === 0) {
            candidates = devs.filter(dev => dev.remaining >= task.estimated_hours)
                .map(dev => ({ ...dev, skillScore: calculateSkillMatchScore(dev.languages, requiredSkills) }));
            console.warn(`⚠️ No domain match for task ${task.story_id}; using any available developer.`);
        }

        if (candidates.length === 0) {
            console.warn(`❌ No developer with capacity for task ${task.story_id}`);
            continue;
        }

        // Sort by Skill Match Score (highest first)
        candidates.sort((a, b) => {
            if (a.skillScore !== b.skillScore) return b.skillScore - a.skillScore;
            return b.remaining - a.remaining;
        });

        const chosen = candidates[0];

        // Assign task
        chosen.remaining -= task.estimated_hours;

        console.log(`
✅ Assigned ${task.story_id} - "${task.title}"
   Developer: ${chosen.name} (${chosen.primary_domain})
   Skill Match: ${chosen.skillScore}%
   Remaining Capacity: ${chosen.remaining}h
        `);

        assignments.push({
            story_id: task.story_id,
            title: task.title || '',
            developer_id: chosen.id,
            developer_name: chosen.name,
            allocated_hours: task.estimated_hours,
            predicted_complexity: task.complexity,
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
            for (const a of assignments) {
                await pool.query(
                    `INSERT INTO allocations (sprint_id, story_id, developer_id, allocated_hours, predicted_complexity)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [sprint_id, a.story_id, a.developer_id, a.allocated_hours, a.predicted_complexity]
                );
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
        const result = await db.query("SELECT * FROM team_members ORDER BY name ASC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/resources', async (req, res) => {
    const { id, name, role, avatar, color, capacity_hours, allocated_hours, assigned_epics, skills, status } = req.body;
    try {
        await db.query(
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
        const result = await db.query("SELECT * FROM sprint_tasks ORDER BY id DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sprint-tasks', async (req, res) => {
    const { id, requirement_sentence, epic, user_story, acceptance_criteria, column_name, points, assignee } = req.body;
    try {
        await db.query(
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

// Change Requests
app.get('/api/change-requests', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM change_requests ORDER BY request_date DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/change-requests', async (req, res) => {
    const { id, req_id, title, category, priority, impact_score, requested_by, request_date, status, description, rework_hours } = req.body;
    try {
        await db.query(
            `INSERT INTO change_requests (id, req_id, title, category, priority, impact_score, requested_by, request_date, status, description, rework_hours)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
            [id, req_id, title, category, priority, impact_score, requested_by, request_date, status || 'Pending', description, rework_hours || 4]
        );
        res.json({ message: 'Change request saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3000;

// ================= SAVE FINAL ASSIGNMENTS =================

app.post('/api/task-assignments', async (req, res) => {
    try {
        const { sprint_id, assignments } = req.body;
        if (!sprint_id || !assignments) {
            return res.status(400).json({ error: 'Missing sprint_id or assignments' });
        }

        for (const a of assignments) {
            await pool.query(
                `INSERT INTO allocations (sprint_id, story_id, developer_id, allocated_hours, predicted_complexity)
                 VALUES ($1, $2, $3, $4, $5)`,
                [sprint_id, a.story_id, a.developer_id, a.allocated_hours, a.predicted_complexity]
            );
        }

        res.json({ success: true, message: `Saved ${assignments.length} assignments` });
    } catch (error) {
        console.error('Save error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================= START SERVER =================

app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`✅ Backend running on http://localhost:${PORT}`);
    console.log('='.repeat(50));
});


