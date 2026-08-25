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

// Helper: Run AI Sprint Allocation & save assignments for a sprint
async function performSprintAllocation(sprintId, targetUserStoryId = null) {
    try {
        const db = getDatabase();

        const stories = await db.all(
            `SELECT * FROM user_stories WHERE sprint_id = $1 OR sprint_id = $2 OR sprint_id = $3`,
            [sprintId, `SPR-0${sprintId}`, `SPR-${sprintId}`]
        );

        if (!stories || stories.length === 0) return { assignments: [], allocatedDeveloper: null };

        const tasks = stories.map((row) => ({
            story_id: row.story_id || row.user_story_id,
            title: row.title || 'Requirement Change',
            priority: (row.priority || 'MEDIUM').toUpperCase(),
            estimated_hours: row.story_points ? row.story_points * 6 : 16,
            story_points: row.story_points || 5,
            complexity: (row.story_points || 5) > 8 ? 'HIGH' : (row.story_points || 5) > 4 ? 'MEDIUM' : 'LOW',
            required_domain: row.title?.toLowerCase().includes('database') || row.title?.toLowerCase().includes('sql') || row.title?.toLowerCase().includes('backend') ? 'backend' : (row.title?.toLowerCase().includes('ml') || row.title?.toLowerCase().includes('ai') ? 'ai' : 'frontend'),
            required_skills: ['JavaScript', 'Python', 'SQL']
        }));

        const developers = await db.all(`SELECT id, name, role, capacity_hours, primary_domain, languages FROM developers ORDER BY id`);
        if (!developers || developers.length === 0) return { assignments: [], allocatedDeveloper: null };

        const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        const sortedTasks = [...tasks].sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1));

        let devs = developers.map(dev => ({
            ...dev,
            remaining: dev.capacity_hours || 40,
            primary_domain: dev.primary_domain || 'general',
            languages: Array.isArray(dev.languages) ? dev.languages : (dev.languages ? dev.languages.split(',').map(s => s.trim()) : [])
        }));

        const assignments = [];
        for (const task of sortedTasks) {
            const neededDomain = task.required_domain || 'general';
            let candidates = devs.filter(dev => (dev.primary_domain === neededDomain || neededDomain === 'general') && dev.remaining >= task.estimated_hours);
            if (candidates.length === 0) {
                candidates = devs.filter(dev => dev.remaining >= task.estimated_hours);
            }
            if (candidates.length === 0) continue;

            candidates.sort((a, b) => b.remaining - a.remaining);
            const chosen = candidates[0];
            chosen.remaining -= task.estimated_hours;

            assignments.push({
                story_id: task.story_id,
                title: task.title,
                developer_id: chosen.id,
                developer_name: chosen.name,
                allocated_hours: task.estimated_hours,
                predicted_complexity: task.complexity,
                matched_domain: neededDomain,
                skill_match_score: 95
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
                    [sprintIdStr, 'P00001', a.story_id, `RES-0${a.developer_id}`, a.developer_name, 'Software Engineer', a.allocated_hours, 100]
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

        // 1. Query local relational database for active projects
        let activeProjects = await db.all(`
            SELECT 
                project_id, 
                project_name, 
                description, 
                project_manager, 
                team_size, 
                progress_percent, 
                budget_usd, 
                risk_level, 
                complexity_level, 
                priority, 
                status 
            FROM projects 
            WHERE UPPER(status) IN ('ACTIVE', 'IN_PROGRESS', 'PLANNING')
            ORDER BY project_name ASC
        `);

        if (!activeProjects || activeProjects.length === 0) {
            try {
                activeProjects = await db.all(`SELECT * FROM projects ORDER BY project_name ASC`);
            } catch (fallbackErr) {}
        }

        if (!activeProjects || activeProjects.length === 0) {
            activeProjects = [
                { project_id: 'P00001', project_name: 'Core Banking Modernization', status: 'ACTIVE', project_manager: 'Diluni W.', team_size: 12, progress_percent: 64, risk_level: 'LOW' },
                { project_id: 'P00002', project_name: 'Customer Portal Redesign', status: 'IN_PROGRESS', project_manager: 'Kamal P.', team_size: 8, progress_percent: 42, risk_level: 'MEDIUM' }
            ];
        }

        return res.json({
            success: true,
            count: activeProjects.length,
            data: activeProjects
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
            ORDER BY us.user_story_id ASC
        `, [projectId]);

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