// backend/controllers/changeRequestController.js
const { getDatabase } = require('../models/database');
const modelLoader = require('../ml_model/modelLoader');

// External Microservice URLs if configured
const PROJECT_API_URL = process.env.PROJECT_API_URL || 'http://localhost:5002';
const SPRINT_API_URL = process.env.SPRINT_API_URL || 'http://localhost:8080';

// Generate unique, readable Change Request ID
function generateRequestId() {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `CR-${year}-${rand}-${suffix}`;
}

// Helper: Extract domain and required skills dynamically from task title/text
function extractDomainAndSkills(titleOrText) {
    const text = (titleOrText || '').toLowerCase();
    if (/\b(machine learning|nlp|spacy|scikit|svm|deep learning|neural network|tensorflow|pytorch|classifier|ai service|ml model|training dataset)\b/i.test(text) || (/\b(ml|ai)\b/i.test(text) && !text.includes('email') && !text.includes('detail') && !text.includes('main'))) {
        let skills = ['Python', 'ML'];
        if (text.includes('nlp') || text.includes('spacy')) skills.push('NLP');
        if (text.includes('svm') || text.includes('scikit')) skills.push('Scikit-Learn');
        return { domain: 'ai', required_domain: 'ai', skills, required_skills: skills };
    }
    if (/\b(enter|input|form|ui|ux|frontend|react|dashboard|dark mode|css|tailwind|export|pdf|excel|component|layout|view|display|screen|button|render)\b/i.test(text)) {
        let skills = ['JavaScript', 'React'];
        if (text.includes('dark mode') || text.includes('css') || text.includes('tailwind')) skills.push('Tailwind');
        if (text.includes('pdf') || text.includes('excel') || text.includes('export') || text.includes('print')) skills.push('jsPDF');
        if (text.includes('enter') || text.includes('input') || text.includes('form')) skills.push('HTML/CSS');
        return { domain: 'frontend', required_domain: 'frontend', skills, required_skills: skills };
    }
    if (/\b(test|qa|cypress|selenium|unit test|jest|audit check|verification|verify|validation|validate)\b/i.test(text)) {
        const skills = ['QA Automation', 'Cypress'];
        return { domain: 'qa', required_domain: 'qa', skills, required_skills: skills };
    }
    if (/\b(devops|docker|kubernetes|aws|cloud|ci\/cd|pipeline|deploy|nginx|dockerfile)\b/i.test(text)) {
        const skills = ['Docker', 'DevOps'];
        return { domain: 'devops', required_domain: 'devops', skills, required_skills: skills };
    }
    if (/\b(defect|repair|vessel|equipment|overtime|labor|labour|history|audit|version|status|approve|reject|permission|role|user|login|auth|database|sql|postgres|backend|api|server|crud|link|assign|cost|costing)\b/i.test(text)) {
        let skills = ['JavaScript', 'SQL'];
        if (text.includes('login') || text.includes('auth') || text.includes('permission') || text.includes('role')) skills.push('OAuth');
        if (text.includes('database') || text.includes('sql') || text.includes('postgres') || text.includes('history') || text.includes('audit') || text.includes('version')) skills.push('PostgreSQL');
        if (text.includes('api') || text.includes('backend') || text.includes('defect') || text.includes('repair') || text.includes('approve') || text.includes('reject')) skills.push('Node.js');
        return { domain: 'backend', required_domain: 'backend', skills, required_skills: skills };
    }
    const defaultSkills = ['JavaScript', 'SQL', 'Node.js'];
    return { domain: 'backend', required_domain: 'backend', skills: defaultSkills, required_skills: defaultSkills };
}

// Helper: Calculate Skill Match Score percentage
function calculateSkillMatchScore(developerSkills, requiredSkills) {
    if (!requiredSkills || requiredSkills.length === 0) return 100;
    if (!developerSkills || developerSkills.length === 0) return 0;
    let devSkillArray = [];
    if (Array.isArray(developerSkills)) {
        devSkillArray = developerSkills.map(s => String(s).trim().toLowerCase());
    } else if (typeof developerSkills === 'string') {
        devSkillArray = developerSkills.split(',').map(s => String(s).trim().toLowerCase());
    }
    const requiredLower = requiredSkills.map(s => String(s).trim().toLowerCase());
    let matched = 0;
    for (const req of requiredLower) {
        if (devSkillArray.includes(req)) matched++;
    }
    return Math.round((matched / requiredSkills.length) * 100);
}

// Helper: Run AI Sprint Allocation & save assignments for a sprint using full weighted composite engine
async function performSprintAllocation(sprintId, targetUserStoryId = null) {
    try {
        const db = getDatabase();

        const stories = await db.all(
            `SELECT * FROM user_stories WHERE sprint_id = $1 OR sprint_id = $2 OR sprint_id = $3`,
            [sprintId, `SPR-0${sprintId}`, `SPR-${sprintId}`]
        );

        if (!stories || stories.length === 0) return { assignments: [], allocatedDeveloper: null };

        const currentProjectId = stories[0]?.project_id || 'P00001';

        const tasks = stories.map((row) => {
            const parsed = extractDomainAndSkills(row.title || row.description || '');
            const sp = Number(row.story_points) || 5;
            const hrs = sp * 6;
            let complexity = 'LOW';
            if (sp >= 8 || hrs >= 12) complexity = 'HIGH';
            else if (sp >= 5 || hrs >= 8) complexity = 'MEDIUM';

            return {
                story_id: row.story_id || row.user_story_id,
                title: row.title || 'Requirement Change',
                priority: (row.priority || 'MEDIUM').toUpperCase(),
                estimated_hours: hrs,
                story_points: sp,
                predicted_complexity: complexity,
                required_domain: parsed.required_domain,
                required_skills: parsed.required_skills
            };
        });

        const developers = await db.all(`SELECT id, name, role, capacity_hours, primary_domain, languages FROM developers ORDER BY id`);
        if (!developers || developers.length === 0) return { assignments: [], allocatedDeveloper: null };

        // Load cross-project commitments map
        let commitmentsMap = {};
        try {
            const allocRows = await db.all(`
                SELECT a.developer_id, u.project_id, SUM(a.allocated_hours) as project_hours 
                FROM allocations a 
                LEFT JOIN user_stories u ON a.story_id = u.story_id 
                GROUP BY a.developer_id, u.project_id
            `);
            (allocRows || []).forEach(r => {
                const devId = String(r.developer_id);
                if (!commitmentsMap[devId]) commitmentsMap[devId] = [];
                commitmentsMap[devId].push({
                    project_id: r.project_id || 'P00001',
                    hours: Number(r.project_hours) || 0
                });
            });
        } catch (e) {}

        // STEP 1 — Process work items by priority (CRITICAL > HIGH > MEDIUM > LOW)
        const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const sortedTasks = [...tasks].sort((a, b) =>
            (priorityOrder[(a.priority || 'MEDIUM').toUpperCase()] ?? 2) - 
            (priorityOrder[(b.priority || 'MEDIUM').toUpperCase()] ?? 2)
        );

        let devs = developers.map(dev => {
            const cap = Number(dev.capacity_hours) || 40;
            const commitments = commitmentsMap[String(dev.id)] || [];
            const otherProjectHours = commitments
                .filter(c => currentProjectId && String(c.project_id) !== String(currentProjectId))
                .reduce((sum, c) => sum + (Number(c.hours) || 0), 0);
            const availableCap = Math.max(0, cap - otherProjectHours);

            return {
                ...dev,
                capacity_hours: cap,
                other_project_hours: otherProjectHours,
                remaining: availableCap,
                primary_domain: (dev.primary_domain || 'backend').toLowerCase(),
                languages: Array.isArray(dev.languages) ? dev.languages : (dev.languages ? String(dev.languages).split(',').map(s => s.trim()) : [])
            };
        });

        const assignments = [];

        for (const task of sortedTasks) {
            const estHours = Number(task.estimated_hours) || 16;
            const taskDomainNorm = (task.required_domain || task.domain || 'backend').toLowerCase();
            const requiredSkills = task.required_skills || task.skills || [];

            // ML Complexity Prediction (HIGH / MEDIUM / LOW)
            let rawComplexity = task.predicted_complexity || task.complexity;
            if (!rawComplexity) {
                const hrs = Number(task.estimated_hours) || 0;
                if (hrs >= 12) rawComplexity = 'HIGH';
                else if (hrs >= 8) rawComplexity = 'MEDIUM';
                else rawComplexity = 'LOW';
            }
            const predictedComplexity = String(rawComplexity).toUpperCase();

            // STEP 2 — Check developer availability: Exclude developers with remaining capacity <= 0
            const availableDevs = devs.filter(dev => dev.remaining > 0);

            if (availableDevs.length === 0) {
                continue;
            }

            // STEP 3, 4, 5 — Evaluate Candidates
            const evaluatedCandidates = availableDevs.map(dev => {
                const devDomainNorm = (dev.primary_domain || 'backend').toLowerCase();
                
                // Domain Match (Step 3): Exact domain match
                const exactDomainMatch = devDomainNorm === taskDomainNorm;

                // Required Skill Match (Step 4): skillMatchPercentage
                const skillMatchPct = calculateSkillMatchScore(dev.languages, requiredSkills);

                // Complexity & Seniority Suitability (Step 5)
                const roleStr = (dev.role || '').toLowerCase();
                const isSenior = roleStr.includes('senior') || roleStr.includes('lead') || roleStr.includes('architect');
                const isJunior = roleStr.includes('junior') || roleStr.includes('intern');
                let senioritySuitability = 1;
                if (predictedComplexity === 'HIGH') {
                    senioritySuitability = isSenior ? 3 : (isJunior ? 1 : 2);
                } else if (predictedComplexity === 'LOW') {
                    senioritySuitability = (isJunior || !isSenior) ? 2 : 1;
                } else { // MEDIUM
                    senioritySuitability = (isSenior || !isJunior) ? 2 : 1;
                }

                return {
                    ...dev,
                    exactDomainMatch,
                    skillMatchPct,
                    senioritySuitability
                };
            });

            // STEP 6 — Select Best Candidate (Rule-Based Ranking)
            // 1. Exact domain match
            // 2. Higher skill-match percentage
            // 3. Better complexity/seniority suitability
            // 4. Higher remaining capacity
            evaluatedCandidates.sort((a, b) => {
                if (a.exactDomainMatch !== b.exactDomainMatch) {
                    return (b.exactDomainMatch ? 1 : 0) - (a.exactDomainMatch ? 1 : 0);
                }
                if (b.skillMatchPct !== a.skillMatchPct) {
                    return b.skillMatchPct - a.skillMatchPct;
                }
                if (b.senioritySuitability !== a.senioritySuitability) {
                    return b.senioritySuitability - a.senioritySuitability;
                }
                return b.remaining - a.remaining;
            });

            const chosen = evaluatedCandidates[0];

            // STEP 7 — Allocate Hours & Update Remaining Capacity
            const allocHours = Math.min(estHours, chosen.remaining);

            const masterDev = devs.find(d => d.id === chosen.id);
            if (masterDev) {
                masterDev.remaining -= allocHours;
            }

            assignments.push({
                story_id: task.story_id,
                title: task.title,
                developer_id: chosen.id,
                developer_name: chosen.name,
                allocated_hours: allocHours,
                predicted_complexity: predictedComplexity,
                matched_domain: taskDomainNorm,
                skill_match_score: Math.round(chosen.skillMatchPct),
                complexity_suitability_score: Math.round((chosen.senioritySuitability / 3) * 100),
                composite_allocation_score: Math.round(chosen.skillMatchPct)
            });
        }

        const sprintIdStr = String(sprintId);
        for (const a of assignments) {
            try {
                await db.run(
                    `INSERT INTO allocations (sprint_id, story_id, developer_id, allocated_hours, predicted_complexity) VALUES ($1, $2, $3, $4, $5)`,
                    [sprintIdStr, a.story_id, a.developer_id, a.allocated_hours, a.predicted_complexity]
                );
            } catch (e) {}

            try {
                await db.run(
                    `INSERT INTO resource_allocations (sprint_id, project_id, user_story_id, resource_id, resource_name, role, allocated_hours, allocation_percentage)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                    [sprintIdStr, currentProjectId, a.story_id, `RES-0${a.developer_id}`, a.developer_name, 'Software Engineer', a.allocated_hours, 100]
                );
            } catch (e) {}

            try {
                await db.run(
                    `UPDATE user_stories SET assigned_to = $1 WHERE story_id = $2 OR user_story_id = $2`,
                    [a.developer_name, a.story_id]
                );
            } catch (e) {}
        }

        const allocatedDeveloper = targetUserStoryId ? assignments.find(a => a.story_id === targetUserStoryId) : (assignments.length > 0 ? assignments[0] : null);
        return { assignments, allocatedDeveloper };
    } catch (err) {
        console.warn('Notice in performSprintAllocation:', err.message);
        return { assignments: [], allocatedDeveloper: null };
    }
}

// ============================================
// 1. GET ALL EXISTING / ACTIVE PROJECTS
// ============================================
// Retrieves only currently active/existing projects.
// Excludes COMPLETED, ARCHIVED, CLOSED, CANCELLED, and DELETED projects.
async function getAllProjects(req, res) {
    try {
        const db = getDatabase();

        // Query relational database for active projects with exact requirement counts, newest first
        let activeProjects = [];
        try {
            activeProjects = await db.all(`
                SELECT 
                    p.project_id, 
                    p.project_name, 
                    p.description, 
                    p.project_manager, 
                    p.team_size, 
                    p.progress_percent, 
                    p.budget_usd, 
                    p.risk_level, 
                    p.complexity_level, 
                    p.priority, 
                    p.status,
                    p.created_at,
                    COUNT(r.id)::int AS requirement_count,
                    COUNT(CASE WHEN r.completeness_status = 'Complete' OR r.completeness_status = 'Completed by User' THEN 1 END)::int AS complete_count
                FROM public.projects p
                LEFT JOIN public.requirements r ON (r.project_id = p.project_id OR r.batch_name = p.project_name)
                WHERE p.status IS NULL OR UPPER(p.status) IN ('ACTIVE', 'IN_PROGRESS', 'PLANNING')
                GROUP BY p.project_id, p.project_name, p.description, p.project_manager, p.team_size, p.progress_percent, p.budget_usd, p.risk_level, p.complexity_level, p.priority, p.status, p.created_at
                ORDER BY p.created_at DESC NULLS LAST, p.project_name ASC
            `);
        } catch (queryErr) {
            console.warn('Notice in joined projects query, falling back to basic projects:', queryErr.message);
            activeProjects = await db.all(`
                SELECT * FROM public.projects 
                WHERE status IS NULL OR UPPER(status) IN ('ACTIVE', 'IN_PROGRESS', 'PLANNING')
                ORDER BY created_at DESC NULLS LAST, project_name ASC
            `);
        }

        if (!activeProjects || activeProjects.length === 0) {
            try {
                activeProjects = await db.all(`SELECT * FROM public.projects ORDER BY created_at DESC NULLS LAST, project_name ASC`);
            } catch (fallbackErr) {}
        }

        const mapped = (activeProjects || []).map((p, idx) => ({
            ...p,
            id: p.project_id || `P${idx + 1}`,
            project_id: p.project_id || `P${idx + 1}`,
            name: p.project_name || `Project ${idx + 1}`,
            project_name: p.project_name || `Project ${idx + 1}`,
            requirement_count: Number(p.requirement_count) || 0,
            complete_count: Number(p.complete_count) || 0,
            status: p.status || 'ACTIVE'
        }));

        return res.json({
            success: true,
            count: mapped.length,
            data: mapped,
            projects: mapped
        });

    } catch (error) {
        console.error('❌ Error fetching active projects:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve active projects',
            error: error.message
        });
    }
}

// ============================================
// 2. GET PROJECT DETAILS BY ID
// ============================================
async function getProjectDetails(req, res) {
    try {
        const { projectId } = req.params;
        const db = getDatabase();

        const project = await db.get(`
            SELECT * FROM projects WHERE project_id = ?
        `, [projectId]);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: `Project ${projectId} not found`
            });
        }

        res.json({
            success: true,
            data: project
        });

    } catch (error) {
        console.error('❌ Error fetching project details:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch project details',
            error: error.message
        });
    }
}

// ============================================
// 3. GET USER STORIES FOR A PROJECT
// ============================================
async function getProjectUserStories(req, res) {
    try {
        const { projectId } = req.params;
        const db = getDatabase();

        const userStories = await db.all(`
            SELECT 
                us.user_story_id,
                us.project_id,
                us.sprint_id,
                s.sprint_name,
                s.sprint_number,
                s.status as sprint_status,
                us.title,
                us.description,
                us.story_points,
                us.priority,
                us.status,
                us.assigned_to,
                us.created_at
            FROM user_stories us
            LEFT JOIN sprints s ON us.sprint_id = s.sprint_id
            WHERE us.project_id = ?
        `, [projectId]);

        userStories.sort((a, b) => {
            const idA = parseInt((a.user_story_id || a.story_id || '').replace(/\D/g, '')) || 0;
            const idB = parseInt((b.user_story_id || b.story_id || '').replace(/\D/g, '')) || 0;
            return idA - idB;
        });

        res.json({
            success: true,
            count: userStories.length,
            data: userStories
        });

    } catch (error) {
        console.error('❌ Error fetching project user stories:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user stories for project',
            error: error.message
        });
    }
}

// ============================================
// 4. GET PENDING / ACTIVE SPRINTS FOR A PROJECT
// ============================================
// Retrieves only pending/active sprints.
// Strictly excludes COMPLETED, CLOSED, or CANCELLED sprints.
async function getProjectSprints(req, res) {
    try {
        const { projectId } = req.params;
        const db = getDatabase();

        const sprints = await db.all(`
            SELECT 
                s.sprint_id,
                s.project_id,
                s.sprint_name,
                s.sprint_number,
                s.status,
                s.start_date,
                s.end_date,
                s.capacity_story_points,
                COUNT(us.user_story_id) as total_user_stories,
                COALESCE(SUM(us.story_points), 0) as committed_story_points
            FROM sprints s
            LEFT JOIN user_stories us ON s.sprint_id = us.sprint_id
            WHERE s.project_id = ?
              AND UPPER(s.status) IN ('PENDING', 'ACTIVE', 'IN_PROGRESS', 'PLANNING')
              AND UPPER(s.status) NOT IN ('COMPLETED', 'CLOSED', 'CANCELLED')
            GROUP BY s.sprint_id, s.project_id, s.sprint_name, s.sprint_number, s.status, s.start_date, s.end_date, s.capacity_story_points
            ORDER BY s.sprint_number ASC
        `, [projectId]);

        res.json({
            success: true,
            count: sprints.length,
            data: sprints
        });

    } catch (error) {
        console.error('❌ Error fetching active sprints:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch active sprints',
            error: error.message
        });
    }
}

// ============================================
// 5. GET RESOURCE ALLOCATIONS FOR SPRINT / STORY
// ============================================
async function getSprintResources(req, res) {
    try {
        const { sprintId } = req.params;
        const { userStoryId } = req.query;
        const db = getDatabase();

        let query = `
            SELECT 
                ra.id,
                ra.sprint_id,
                ra.project_id,
                ra.user_story_id,
                us.title as user_story_title,
                ra.resource_id,
                ra.resource_name,
                ra.role,
                ra.allocated_hours,
                ra.allocation_percentage,
                ra.created_at
            FROM resource_allocations ra
            LEFT JOIN user_stories us ON ra.user_story_id = us.user_story_id
            WHERE ra.sprint_id = ?
        `;
        const params = [sprintId];

        if (userStoryId) {
            query += ` AND (ra.user_story_id = ? OR ra.user_story_id IS NULL)`;
            params.push(userStoryId);
        }

        query += ` ORDER BY ra.resource_name ASC`;

        const resources = await db.all(query, params);

        res.json({
            success: true,
            count: resources.length,
            data: resources
        });

    } catch (error) {
        console.error('❌ Error fetching resource allocations:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch resource allocations',
            error: error.message
        });
    }
}

// ============================================
// 6. SUBMIT CHANGE REQUEST (Integrated Validation & ML Inference)
// ============================================
async function submitChangeRequest(req, res) {
    try {
        const db = getDatabase();
        const {
            project_id,
            user_story_id,
            sprint_id,
            title,
            description,
            change_type,
            story_points,
            urgency,
            reason,
            submitter
        } = req.body;

        // 1. Mandatory Validations
        if (!project_id) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error: Existing Project is mandatory.'
            });
        }
        if (!description || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error: Change Request Description is mandatory.'
            });
        }
        if (!user_story_id) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error: Affected User Story is mandatory.'
            });
        }
        if (!sprint_id) {
            return res.status(400).json({
                success: false,
                message: 'Validation Error: Sprint is mandatory.'
            });
        }

        // 2. Validate Project Status (Active only)
        const project = await db.get(`SELECT * FROM projects WHERE project_id = ?`, [project_id]);
        if (!project) {
            return res.status(400).json({
                success: false,
                message: `Project ${project_id} not found.`
            });
        }
        const activeStatuses = ['ACTIVE', 'IN_PROGRESS', 'PLANNING'];
        if (!activeStatuses.includes(project.status?.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: `Cannot create Change Request on non-active project (Status: ${project.status}).`
            });
        }

        // 3. Validate User Story belongs to Project
        const userStory = await db.get(`
            SELECT * FROM user_stories 
            WHERE user_story_id = ? AND project_id = ?
        `, [user_story_id, project_id]);

        if (!userStory) {
            return res.status(400).json({
                success: false,
                message: `User Story ${user_story_id} does not belong to Project ${project_id}.`
            });
        }

        // 4. Validate Sprint Status & association
        const sprint = await db.get(`
            SELECT * FROM sprints 
            WHERE sprint_id = ? AND project_id = ?
        `, [sprint_id, project_id]);

        if (!sprint) {
            return res.status(400).json({
                success: false,
                message: `Sprint ${sprint_id} is not associated with Project ${project_id}.`
            });
        }

        const disallowedSprintStatuses = ['COMPLETED', 'CLOSED', 'CANCELLED'];
        if (disallowedSprintStatuses.includes(sprint.status?.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: `Cannot associate Change Request with a ${sprint.status} Sprint. Please select an active/pending Sprint.`
            });
        }

        // 5. Fetch associated resource allocation details for audit & record
        const resourceAllocations = await db.all(`
            SELECT resource_id, resource_name, role, allocated_hours, allocation_percentage 
            FROM resource_allocations 
            WHERE sprint_id = ? AND (user_story_id = ? OR user_story_id IS NULL)
        `, [sprint_id, user_story_id]);

        const resourceAllocationInfo = JSON.stringify(resourceAllocations);

        // 6. ML Model Impact Assessment
        const points = parseInt(story_points) || userStory.story_points || 5;
        const estimatedHours = points * 6;
        const sprintNumber = sprint.sprint_number || 2;

        const predictionInput = {
            priority: project.priority || 'Medium',
            risk_level: project.risk_level || 'Medium',
            complexity_level: project.complexity_level || 'Medium',
            urgency: urgency || 'MEDIUM',
            team_size: project.team_size || 8,
            estimated_hours: estimatedHours,
            budget_usd: project.budget_usd || 100000,
            progress_percent: project.progress_percent || 25,
            affected_sprint: sprintNumber
        };

        console.log("🤖 Running ML Model Inference:", predictionInput);
        let prediction = await modelLoader.predict(predictionInput);
        if (!prediction || prediction.error) {
            console.warn("Prediction returned fallback or warning:", prediction?.error);
        }

        // Recommendation formulation
        let recommendation = '';
        if (prediction.impact_level === 'HIGH') {
            recommendation = `High Risk Change: Significant impact on Sprint ${sprintNumber} schedule and resource allocation. Requires formal Change Control Board & Project Manager sign-off.`;
        } else if (prediction.impact_level === 'MEDIUM') {
            recommendation = `Moderate Impact: Review capacity for Sprint ${sprintNumber}. Adjust user story story-points and verify assigned team member availability.`;
        } else {
            recommendation = `Low Risk Change: Routine requirement adjustment. Can be safely incorporated into Sprint ${sprintNumber} with standard PM approval.`;
        }

        // 7. Generate Unique Change Request ID
        const requestId = generateRequestId();

        // 8. Insert into Database & Sync User Story to Sprint
        try {
            await db.run(`
                INSERT INTO sprints (sprint_id, project_id, sprint_name, sprint_number, status)
                VALUES (?, ?, ?, ?, 'ACTIVE')
                ON CONFLICT (sprint_id) DO NOTHING
            `, [sprint.sprint_id, project.project_id, sprint.sprint_name || `Sprint ${sprintNumber}`, sprintNumber]);
            await db.run(`
                INSERT INTO user_stories (story_id, user_story_id, project_id, sprint_id, title, description, story_points, priority, status, assigned_to)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (story_id) DO UPDATE SET
                sprint_id = EXCLUDED.sprint_id,
                title = EXCLUDED.title,
                story_points = EXCLUDED.story_points
            `, [userStory.user_story_id, userStory.user_story_id, project.project_id, sprint.sprint_id, title || userStory.title, description, points, urgency || 'Medium', 'IN_PROGRESS', 'Unassigned']);
        } catch (usErr) {
            console.warn('Notice syncing user story on CR submit:', usErr.message);
        }

        // Run AI Sprint Task Allocation engine for target sprint
        const allocationResult = await performSprintAllocation(sprint.sprint_id, userStory.user_story_id);
        const assignedDev = allocationResult.allocatedDeveloper || (allocationResult.assignments.length > 0 ? allocationResult.assignments[0] : null);

        // Update Change Request record with allocation info
        const updatedResourceAllocInfo = allocationResult.assignments.length > 0
            ? JSON.stringify(allocationResult.assignments.map(a => ({ resource_name: a.developer_name, role: 'Software Engineer', allocated_hours: a.allocated_hours, allocation_percentage: 100 })))
            : resourceAllocationInfo;

        await db.run(`
            INSERT INTO change_requests (
                request_id, project_id, project_name, user_story_id, user_story_title,
                sprint_id, sprint_name, resource_allocation_info, title, description,
                change_type, story_points, urgency, reason, team_size, progress_percent,
                project_manager, status, impact_level, confidence, recommendation, probabilities,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `, [
            requestId,
            project.project_id,
            project.project_name,
            userStory.user_story_id,
            userStory.title,
            sprint.sprint_id,
            sprint.sprint_name,
            updatedResourceAllocInfo,
            title || `Change for ${userStory.user_story_id}`,
            description,
            change_type || 'REQUIREMENT_CHANGE',
            points,
            urgency || 'MEDIUM',
            reason || '',
            project.team_size,
            project.progress_percent,
            project.project_manager,
            'PENDING',
            prediction.impact_level,
            prediction.confidence,
            recommendation,
            JSON.stringify(prediction.probabilities || {})
        ]);

        // 9. Record in Audit Trail
        await db.run(`
            INSERT INTO audit_trail (request_id, action, actor, actor_role, details, timestamp)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `, [
            requestId,
            'SUBMITTED',
            submitter || project.project_manager || 'Requirements Engineer',
            'Author',
            JSON.stringify({
                project_id: project.project_id,
                user_story_id: userStory.user_story_id,
                sprint_id: sprint.sprint_id,
                impact: prediction.impact_level,
                allocated_developer: assignedDev ? assignedDev.developer_name : 'Unassigned'
            })
        ]);

        console.log(`✅ Change request successfully stored with AI Allocation: ${requestId}`);

        // 10. Return complete integrated response
        res.status(201).json({
            success: true,
            message: 'Change request submitted, sprint updated, and AI task allocated successfully',
            data: {
                request_id: requestId,
                project: {
                    project_id: project.project_id,
                    project_name: project.project_name,
                    project_manager: project.project_manager,
                    team_size: project.team_size,
                    progress_percent: project.progress_percent
                },
                user_story: {
                    user_story_id: userStory.user_story_id,
                    title: userStory.title,
                    story_points: points,
                    priority: userStory.priority,
                    assigned_to: assignedDev ? assignedDev.developer_name : (userStory.assigned_to || 'Unassigned')
                },
                sprint: {
                    sprint_id: sprint.sprint_id,
                    sprint_name: sprint.sprint_name,
                    sprint_number: sprint.sprint_number,
                    status: sprint.status
                },
                assigned_developer: assignedDev,
                sprint_assignments: allocationResult.assignments,
                resource_allocations: resourceAllocations,
                change_details: {
                    title: title || `Change for ${userStory.user_story_id}`,
                    description: description,
                    change_type: change_type || 'REQUIREMENT_CHANGE',
                    story_points: points,
                    urgency: urgency || 'MEDIUM',
                    reason: reason || ''
                },
                impact_level: prediction.impact_level,
                confidence: prediction.confidence,
                recommendation: recommendation,
                probabilities: prediction.probabilities
            }
        });

    } catch (error) {
        console.error('❌ Submit error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit change request',
            error: error.message
        });
    }
}

// ============================================
// 7. GET ALL CHANGE REQUESTS
// ============================================
async function getAllChangeRequests(req, res) {
    try {
        const db = getDatabase();
        const requests = await db.all(`
            SELECT * FROM change_requests 
            ORDER BY created_at DESC
        `);

        const formatted = requests.map(r => ({
            ...r,
            probabilities: r.probabilities ? JSON.parse(r.probabilities) : null,
            resource_allocation_info: r.resource_allocation_info ? JSON.parse(r.resource_allocation_info) : []
        }));

        res.json({
            success: true,
            count: formatted.length,
            data: formatted
        });
    } catch (error) {
        console.error('Fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch change requests',
            error: error.message
        });
    }
}

// ============================================
// 8. GET CHANGE REQUEST BY ID
// ============================================
async function getChangeRequestById(req, res) {
    try {
        const db = getDatabase();
        const { id } = req.params;

        const request = await db.get(
            'SELECT * FROM change_requests WHERE request_id = ?',
            [id]
        );

        if (!request) {
            return res.status(404).json({
                success: false,
                message: `Change request ${id} not found`
            });
        }

        const approvals = await db.all(
            'SELECT * FROM approvals WHERE request_id = ? ORDER BY created_at DESC',
            [id]
        );

        const audit = await db.all(
            'SELECT * FROM audit_trail WHERE request_id = ? ORDER BY timestamp DESC',
            [id]
        );

        res.json({
            success: true,
            data: {
                ...request,
                probabilities: request.probabilities ? JSON.parse(request.probabilities) : null,
                resource_allocation_info: request.resource_allocation_info ? JSON.parse(request.resource_allocation_info) : [],
                approvals,
                audit
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch change request',
            error: error.message
        });
    }
}

// ============================================
// 9. UPDATE APPROVAL STATUS
// ============================================
async function updateApproval(req, res) {
    try {
        const db = getDatabase();
        const { id } = req.params;
        const { decision, comments, justification, approver_name, approver_role } = req.body;

        if (!['APPROVED', 'REJECTED', 'NEEDS_CLARIFICATION'].includes(decision)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid decision: Must be APPROVED, REJECTED, or NEEDS_CLARIFICATION'
            });
        }

        let newStatus = 'PENDING';
        if (decision === 'APPROVED') newStatus = 'APPROVED';
        if (decision === 'REJECTED') newStatus = 'REJECTED';
        if (decision === 'NEEDS_CLARIFICATION') newStatus = 'NEEDS_CLARIFICATION';

        let allocationData = null;

        if (decision === 'APPROVED') {
            const cr = await db.get('SELECT * FROM change_requests WHERE request_id = ?', [id]);
            if (cr) {
                try {
                    await db.run(`
                        INSERT INTO user_stories (story_id, user_story_id, project_id, sprint_id, title, description, story_points, priority, status, assigned_to)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (story_id) DO UPDATE SET
                        sprint_id = EXCLUDED.sprint_id,
                        title = EXCLUDED.title,
                        story_points = EXCLUDED.story_points
                    `, [cr.user_story_id, cr.user_story_id, cr.project_id, cr.sprint_id, cr.title, cr.description, cr.story_points || 5, cr.urgency || 'Medium', 'IN_PROGRESS', 'Unassigned']);
                } catch (e) {}

                allocationData = await performSprintAllocation(cr.sprint_id, cr.user_story_id);
            }
        }

        await db.run(`
            UPDATE change_requests 
            SET status = ?, updated_at = datetime('now')
            WHERE request_id = ?
        `, [newStatus, id]);

        await db.run(`
            INSERT INTO approvals (request_id, approver_name, approver_role, decision, comments, justification, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
        `, [id, approver_name || 'Project Manager', approver_role || 'MANAGER', decision, comments || '', justification || '']);

        await db.run(`
            INSERT INTO audit_trail (request_id, action, actor, actor_role, details, timestamp)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `, [id, decision, approver_name || 'Project Manager', approver_role || 'MANAGER', JSON.stringify({ decision, comments, allocation: allocationData?.allocatedDeveloper })]);

        res.json({
            success: true,
            message: `Change request ${decision.toLowerCase()} and AI task allocated successfully`,
            data: { 
                status: newStatus,
                allocation: allocationData?.allocatedDeveloper || null,
                sprint_assignments: allocationData?.assignments || []
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update approval',
            error: error.message
        });
    }
}

// ============================================
// 9b. MANUAL ALLOCATION FOR CHANGE REQUEST
// ============================================
async function allocateChangeRequestTask(req, res) {
    try {
        const db = getDatabase();
        const { id } = req.params;
        const request = await db.get('SELECT * FROM change_requests WHERE request_id = ?', [id]);
        if (!request) {
            return res.status(404).json({ success: false, message: `Change request ${id} not found` });
        }
        const allocation = await performSprintAllocation(request.sprint_id, request.user_story_id);
        res.json({
            success: true,
            message: `AI Task Allocation executed for Sprint ${request.sprint_id}`,
            data: allocation
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to execute allocation',
            error: error.message
        });
    }
}

// ============================================
// 10. GET DASHBOARD STATS
// ============================================
async function getDashboardStats(req, res) {
    try {
        const db = getDatabase();

        const total = await db.get('SELECT COUNT(*) as count FROM change_requests');
        const pending = await db.get("SELECT COUNT(*) as count FROM change_requests WHERE status = 'PENDING'");
        const approved = await db.get("SELECT COUNT(*) as count FROM change_requests WHERE status = 'APPROVED'");
        const rejected = await db.get("SELECT COUNT(*) as count FROM change_requests WHERE status = 'REJECTED'");

        const lowImpact = await db.get("SELECT COUNT(*) as count FROM change_requests WHERE impact_level = 'LOW'");
        const mediumImpact = await db.get("SELECT COUNT(*) as count FROM change_requests WHERE impact_level = 'MEDIUM'");
        const highImpact = await db.get("SELECT COUNT(*) as count FROM change_requests WHERE impact_level = 'HIGH'");

        const activeProjects = await db.get("SELECT COUNT(*) as count FROM projects WHERE UPPER(status) IN ('ACTIVE', 'IN_PROGRESS', 'PLANNING')");

        res.json({
            success: true,
            data: {
                total: total?.count || 0,
                pending: pending?.count || 0,
                approved: approved?.count || 0,
                rejected: rejected?.count || 0,
                active_projects: activeProjects?.count || 0,
                impact_distribution: {
                    LOW: lowImpact?.count || 0,
                    MEDIUM: mediumImpact?.count || 0,
                    HIGH: highImpact?.count || 0
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch stats',
            error: error.message
        });
    }
}

// ============================================
// 11. SCOPE CREEP DETECTION
// ============================================
async function getScopeCreepAlert(req, res) {
    try {
        const db = getDatabase();
        const { projectId } = req.params;

        const recentChanges = await db.all(`
            SELECT * FROM change_requests 
            WHERE project_id = ? 
            AND created_at > datetime('now', '-30 days')
            ORDER BY created_at DESC
        `, [projectId]);

        const totalChanges = recentChanges.length;
        const highImpactChanges = recentChanges.filter(c => c.impact_level === 'HIGH').length;

        let alert = null;
        let riskLevel = 'LOW';

        if (totalChanges > 10 && highImpactChanges > 3) {
            alert = '⚠️ High volume of high-impact changes detected. Review sprint scope immediately.';
            riskLevel = 'HIGH';
        } else if (totalChanges > 5) {
            alert = '📈 Elevated change request frequency. Monitor sprint velocity closely.';
            riskLevel = 'MEDIUM';
        }

        res.json({
            success: true,
            data: {
                project_id: projectId,
                total_changes_30d: totalChanges,
                high_impact_changes: highImpactChanges,
                alert: alert,
                risk_level: riskLevel
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to detect scope creep',
            error: error.message
        });
    }
}

module.exports = {
    getAllProjects,
    getProjectDetails,
    getProjectUserStories,
    getProjectSprints,
    getSprintResources,
    submitChangeRequest,
    getAllChangeRequests,
    getChangeRequestById,
    updateApproval,
    allocateChangeRequestTask,
    getDashboardStats,
    getScopeCreepAlert
};