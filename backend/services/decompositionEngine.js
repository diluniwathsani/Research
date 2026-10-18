/**
 * Hybrid User Story Decomposition & Keyword Classification Engine
 * 
 * Capabilities:
 * 1. Keyword-based Domain Identification (Reporting/Analytics, Engineering & Asset, Labour & Cost, Backend, Frontend, Database, etc.)
 * 2. Practical Required-Skill Detection (normalized, synonyms, mapped to real developer skills)
 * 3. Granular Technical Work Item Decomposition (Titles, Hours, Story Points, Predicted Complexity)
 * 4. Integration with PostgreSQL work_items table and Resource Management allocation algorithm
 */

const axios = require('axios');
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001/predict';

// ================= 1. DOMAIN TAXONOMY & NORMALIZATION =================
const DOMAIN_TAXONOMY = {
    REPORTING: 'Reporting/Analytics',
    ENGINEERING_ASSET: 'Engineering and Asset Management',
    LABOUR_COST: 'Labour and Cost Management',
    DATABASE: 'Database',
    API_INTEGRATION: 'API/Integration',
    FRONTEND: 'Frontend',
    BACKEND: 'Backend',
    QA: 'QA/Testing',
    DEVOPS_SECURITY: 'DevOps/Security',
    AI_ML: 'AI/ML'
};

// Maps any domain string to the developer allocation primary_domain (backend, frontend, ai, qa, devops)
function mapToAllocationDomain(domainStr) {
    if (!domainStr) return 'backend';
    const s = String(domainStr).toLowerCase().trim();
    if (s.includes('front') || s.includes('ui') || s.includes('ux') || s.includes('view') || s.includes('display')) {
        return 'frontend';
    }
    if (s.includes('qa') || s.includes('test')) {
        return 'qa';
    }
    if (s.includes('ai') || s.includes('ml') || s.includes('machine learning')) {
        return 'ai';
    }
    if (s.includes('devops') || s.includes('docker') || s.includes('cloud') || s.includes('infrastructure')) {
        return 'devops';
    }
    // Database, Reporting/Analytics, API/Integration, Labour/Cost, Engineering/Asset, Backend default to backend developers
    return 'backend';
}

// ================= 2. CONFIGURABLE KEYWORD MAPPINGS =================
const KEYWORD_DOMAIN_RULES = [
    // Reporting & Analytics
    {
        domain: DOMAIN_TAXONOMY.REPORTING,
        keywords: [
            'report', 'reports', 'reporting', 'analytics', 'export', 'download', 'pdf', 'excel',
            'csv', 'chart', 'summary report', 'kpi', 'metrics', 'print', 'data export', 'job card export'
        ]
    },
    // Labour & Cost Management
    {
        domain: DOMAIN_TAXONOMY.LABOUR_COST,
        keywords: [
            'overtime', 'labor', 'labour', 'cost', 'costing', 'wage', 'rate', 'hour', 'working hours',
            'salary', 'expense', 'payroll', 'budget', 'billing', 'time sheet', 'timesheet', 'calculate overtime'
        ]
    },
    // Engineering & Asset Management
    {
        domain: DOMAIN_TAXONOMY.ENGINEERING_ASSET,
        keywords: [
            'vessel', 'equipment', 'asset', 'materials', 'work order', 'maintenance', 'repair',
            'defect', 'job card', 'spare part', 'allocation', 'inspection', 'fleet', 'machinery', 'tool'
        ]
    },
    // Database & Persistence
    {
        domain: DOMAIN_TAXONOMY.DATABASE,
        keywords: [
            'database', 'schema', 'sql', 'postgresql', 'query', 'store', 'retrieve', 'table',
            'migration', 'index', 'persist', 'persistence', 'data model', 'entity', 'relational'
        ]
    },
    // API & Integration
    {
        domain: DOMAIN_TAXONOMY.API_INTEGRATION,
        keywords: [
            'endpoint', 'endpoints', 'rest api', 'restful', 'api development', 'integration',
            'webhook', 'service integration', 'microservice', 'http', 'external service', 'json api'
        ]
    },
    // AI / Machine Learning
    {
        domain: DOMAIN_TAXONOMY.AI_ML,
        keywords: [
            'machine learning', 'ml', 'nlp', 'spacy', 'scikit', 'svm', 'deep learning',
            'neural network', 'tensorflow', 'pytorch', 'classifier', 'ai service', 'model inference', 'training dataset'
        ]
    },
    // DevOps & Security
    {
        domain: DOMAIN_TAXONOMY.DEVOPS_SECURITY,
        keywords: [
            'docker', 'kubernetes', 'aws', 'cloud', 'ci/cd', 'pipeline', 'deploy', 'deployment',
            'nginx', 'auth', 'authentication', 'login', 'sso', 'oauth', 'security', 'role', 'permission', 'rbac'
        ]
    },
    // QA & Testing
    {
        domain: DOMAIN_TAXONOMY.QA,
        keywords: [
            'test', 'testing', 'qa', 'cypress', 'selenium', 'unit test', 'e2e', 'automation',
            'verification', 'verify', 'validation test', 'audit test', 'acceptance test'
        ]
    },
    // Frontend / UI
    {
        domain: DOMAIN_TAXONOMY.FRONTEND,
        keywords: [
            'display', 'view', 'screen', 'ui', 'ux', 'dashboard', 'user interface', 'visualize',
            'component', 'form', 'button', 'modal', 'table view', 'render', 'interactive', 'react', 'tailwind'
        ]
    }
];

// Repertoire of skills actually present in the developers database:
// Alice: ['JavaScript', 'Python', 'SQL']
// Bob: ['JavaScript', 'React']
// Charlie: ['HTML', 'CSS']
// David: ['Python', 'SQL', 'Security']
// Eve: ['ML', 'TensorFlow', 'Python']
// Frank Miller: ['JavaScript', 'React', 'Tailwind']
// Grace Hopper: ['JavaScript', 'React', 'jsPDF', 'CSS']
// Ian Malcolm: ['JavaScript', 'SQL', 'Node.js', 'PostgreSQL']
// Julia Roberts: ['Python', 'SQL', 'Node.js', 'OAuth']
// Laura Croft: ['Python', 'ML', 'NLP', 'Spacy']
// Michael Scott: ['Python', 'ML', 'Scikit-Learn', 'SVM']
// Nora Allen: ['QA Automation', 'Cypress', 'Selenium']
// Oscar Isaac: ['Docker', 'DevOps', 'Kubernetes', 'AWS']
// Vihanga: ['Node.js', 'JavaScript', 'requirement gathering']
// Nimthera: ['Node.js', 'PostgreSQL', 'JavaScript', 'React', 'Agile']
const SKILL_KEYWORD_RULES = [
    // React / Frontend UI
    {
        skills: ['React', 'JavaScript', 'HTML/CSS'],
        keywords: ['display', 'view', 'dashboard', 'user interface', 'screen', 'form', 'ui', 'ux', 'visualize', 'frontend', 'interactive', 'dialog', 'modal']
    },
    // Styling & Tailwind
    {
        skills: ['Tailwind', 'CSS'],
        keywords: ['styling', 'theme', 'dark mode', 'responsive', 'layout', 'tailwind', 'css']
    },
    // Export & Document Reporting
    {
        skills: ['jsPDF', 'React', 'JavaScript'],
        keywords: ['export', 'pdf', 'excel', 'csv', 'download', 'print report', 'export report', 'document export', 'print']
    },
    // Backend API & REST
    {
        skills: ['Node.js', 'JavaScript'],
        keywords: ['rest api', 'endpoint', 'backend', 'api', 'server', 'service', 'controller', 'http', 'business logic', 'business rules', 'calculate', 'overtime', 'validation']
    },
    // Database & SQL
    {
        skills: ['SQL', 'PostgreSQL'],
        keywords: ['database', 'query', 'store', 'retrieve', 'sql', 'postgresql', 'data model', 'schema', 'entity', 'persistence', 'allocation model', 'equipment allocation']
    },
    // Security & Auth
    {
        skills: ['OAuth', 'Security'],
        keywords: ['auth', 'login', 'security', 'permission', 'role', 'oauth', 'encrypt', 'token', 'authorization', 'access control', 'restrict', 'supervisor']
    },
    // Python & Machine Learning
    {
        skills: ['Python', 'ML', 'Scikit-Learn'],
        keywords: ['machine learning', 'ml', 'classifier', 'scikit', 'prediction', 'model', 'data processing']
    },
    // NLP & Text Processing
    {
        skills: ['NLP', 'Spacy', 'Python'],
        keywords: ['nlp', 'spacy', 'text processing', 'natural language', 'sentiment', 'extraction']
    },
    // Deep Learning
    {
        skills: ['TensorFlow', 'Python'],
        keywords: ['tensorflow', 'deep learning', 'neural network', 'pytorch']
    },
    // QA & Test Automation
    {
        skills: ['QA Automation', 'Cypress'],
        keywords: ['test', 'qa', 'cypress', 'automation', 'acceptance', 'verify', 'verification', 'e2e']
    },
    // DevOps & Cloud
    {
        skills: ['Docker', 'DevOps', 'AWS'],
        keywords: ['docker', 'devops', 'kubernetes', 'aws', 'cloud', 'container', 'ci/cd', 'pipeline', 'deploy']
    }
];

// ================= 3. CLASSIFICATION FUNCTIONS =================
/**
 * Classifies the appropriate domain for a requirement or work item.
 * Evaluates title, description, acceptance criteria, and epic.
 */
function classifyDomain(title, description = '', acceptanceCriteria = '', epic = '') {
    const fullText = `${title || ''} ${description || ''} ${acceptanceCriteria || ''} ${epic || ''}`.toLowerCase();

    // Check specific taxonomy keywords
    for (const rule of KEYWORD_DOMAIN_RULES) {
        for (const kw of rule.keywords) {
            const regex = new RegExp(`\\b${kw.replace('/', '\\/')}\\b`, 'i');
            if (regex.test(fullText)) {
                return rule.domain;
            }
        }
    }

    // Contextual fallback:
    if (/\b(export|report|analytics|chart)\b/i.test(fullText)) return DOMAIN_TAXONOMY.REPORTING;
    if (/\b(overtime|wage|labor|labour|cost|hour)\b/i.test(fullText)) return DOMAIN_TAXONOMY.LABOUR_COST;
    if (/\b(vessel|equipment|material|asset|repair|defect|work order)\b/i.test(fullText)) return DOMAIN_TAXONOMY.ENGINEERING_ASSET;
    if (/\b(display|view|ui|frontend|screen|form)\b/i.test(fullText)) return DOMAIN_TAXONOMY.FRONTEND;
    if (/\b(database|sql|query|table|schema)\b/i.test(fullText)) return DOMAIN_TAXONOMY.DATABASE;
    if (/\b(api|rest|endpoint|service)\b/i.test(fullText)) return DOMAIN_TAXONOMY.API_INTEGRATION;

    return DOMAIN_TAXONOMY.BACKEND;
}

/**
 * Detects required technical skills based on keywords and mapped to developer skills in DB.
 */
function detectRequiredSkills(title, description = '', acceptanceCriteria = '', domain = '') {
    const fullText = `${title || ''} ${description || ''} ${acceptanceCriteria || ''} ${domain || ''}`.toLowerCase();
    const matchedSkills = new Set();

    for (const rule of SKILL_KEYWORD_RULES) {
        for (const kw of rule.keywords) {
            const regex = new RegExp(`\\b${kw.replace('/', '\\/')}\\b`, 'i');
            if (regex.test(fullText)) {
                rule.skills.forEach(s => matchedSkills.add(s));
                break;
            }
        }
    }

    // Domain-targeted baseline skills if none matched
    const domNorm = String(domain).toLowerCase();
    if (matchedSkills.size === 0) {
        if (domNorm.includes('front') || domNorm.includes('ui')) {
            matchedSkills.add('React');
            matchedSkills.add('JavaScript');
        } else if (domNorm.includes('qa') || domNorm.includes('test')) {
            matchedSkills.add('QA Automation');
            matchedSkills.add('Cypress');
        } else if (domNorm.includes('ai') || domNorm.includes('ml')) {
            matchedSkills.add('Python');
            matchedSkills.add('ML');
        } else if (domNorm.includes('devops')) {
            matchedSkills.add('Docker');
            matchedSkills.add('DevOps');
        } else if (domNorm.includes('database') || domNorm.includes('sql')) {
            matchedSkills.add('SQL');
            matchedSkills.add('PostgreSQL');
        } else if (domNorm.includes('reporting')) {
            matchedSkills.add('SQL');
            matchedSkills.add('jsPDF');
            matchedSkills.add('JavaScript');
        } else {
            matchedSkills.add('JavaScript');
            matchedSkills.add('Node.js');
            matchedSkills.add('SQL');
        }
    }

    // Limit to top 3-4 distinct skills to avoid noise
    return Array.from(matchedSkills).slice(0, 4);
}

/**
 * Calculates deterministic predicted complexity based on points and estimated hours.
 */
function calculateComplexity(hours, storyPoints, titleOrText = '') {
    const hrs = Number(hours) || 0;
    const pts = Number(storyPoints) || 0;
    const text = String(titleOrText).toLowerCase();

    // High complexity indicators
    if (pts >= 8 || hrs >= 16 || /\b(machine learning|nlp|spacy|deep learning|security|encryption|oauth|audit tracking|emergency override)\b/i.test(text)) {
        return 'HIGH';
    }
    // Low complexity indicators
    if (pts <= 2 && hrs <= 8 && /\b(button|label|text field|minor|display only|view|static)\b/i.test(text)) {
        return 'LOW';
    }
    // Default
    if (pts >= 5 || hrs >= 12) {
        return 'MEDIUM';
    }
    return hrs <= 8 ? 'LOW' : 'MEDIUM';
}

/**
 * Calculates normalized priority score (0-100)
 */
function calculatePriorityScore(priorityStr, storyPoints) {
    const p = String(priorityStr || 'MEDIUM').toUpperCase();
    const pts = Number(storyPoints) || 3;
    let base = 50;
    if (p === 'CRITICAL') base = 90;
    else if (p === 'HIGH') base = 75;
    else if (p === 'LOW') base = 30;

    return Math.min(100, Math.max(10, base + pts * 2));
}

/**
 * Predicts complexity for a single work item using the ML service (ml-service/app.py).
 * Uses priority, estimated_hours, and story_points.
 * Safely falls back to calculateComplexity() if ML service fails, times out, or returns invalid values.
 */
async function predictComplexityWithML(priority, hours, storyPoints, storyId = 'WI-01', fallbackText = '') {
    const fallbackComplexity = calculateComplexity(hours, storyPoints, fallbackText);
    const serviceUrl = process.env.ML_SERVICE_URL || ML_SERVICE_URL;

    try {
        const payload = {
            tasks: [{
                story_id: String(storyId || 'WI-01'),
                priority: String(priority || 'MEDIUM').toUpperCase(),
                estimated_hours: Number(hours) || 8,
                story_points: Number(storyPoints) || 2
            }]
        };

        const response = await axios.post(serviceUrl, payload, {
            timeout: 2500,
            headers: { 'Content-Type': 'application/json' }
        });

        const pred = response?.data?.predictions?.[0];
        if (pred && pred.predicted_complexity) {
            const normalized = String(pred.predicted_complexity).toUpperCase();
            if (['HIGH', 'MEDIUM', 'LOW'].includes(normalized)) {
                return normalized;
            }
        }
    } catch (err) {
        // Fallback safely to rule-based prediction
    }

    return fallbackComplexity;
}

/**
 * Batch-predicts complexity for an array of work items using the existing ML service.
 * Handles missing values, network timeouts, and maps predicted_complexity to HIGH, MEDIUM, or LOW.
 * Falls back to calculateComplexity() on any ML service failure.
 */
async function predictBatchComplexityWithML(workItems) {
    if (!Array.isArray(workItems) || workItems.length === 0) return workItems;

    const serviceUrl = process.env.ML_SERVICE_URL || ML_SERVICE_URL;

    try {
        const tasks = workItems.map(item => ({
            story_id: String(item.work_item_id || item.story_id || 'WI-01'),
            priority: String(item.priority || 'MEDIUM').toUpperCase(),
            estimated_hours: Number(item.estimated_hours) || 8,
            story_points: Number(item.story_points) || 2
        }));

        const response = await axios.post(serviceUrl, { tasks }, {
            timeout: 3000,
            headers: { 'Content-Type': 'application/json' }
        });

        if (response && response.data && Array.isArray(response.data.predictions)) {
            const predMap = new Map();
            for (const p of response.data.predictions) {
                if (p && p.story_id && p.predicted_complexity) {
                    predMap.set(String(p.story_id), String(p.predicted_complexity).toUpperCase());
                }
            }

            for (const item of workItems) {
                const mlComp = predMap.get(String(item.work_item_id));
                if (mlComp && ['HIGH', 'MEDIUM', 'LOW'].includes(mlComp)) {
                    item.predicted_complexity = mlComp;
                }
            }
        }
    } catch (err) {
        console.warn(`[DecompositionEngine] ML service call failed (${err.message}). Using rule-based calculateComplexity fallback.`);
    }

    // Safety check: ensure every work item has a valid complexity
    for (const item of workItems) {
        if (!item.predicted_complexity || !['HIGH', 'MEDIUM', 'LOW'].includes(item.predicted_complexity)) {
            item.predicted_complexity = calculateComplexity(
                item.estimated_hours,
                item.story_points,
                `${item.title || ''} ${item.description || ''}`
            );
        }
    }

    return workItems;
}

// ================= 4. AGILE DECOMPOSITION PIPELINE =================
/**
 * Analyzes rule-based boundaries (CRUD, Workflow, Data, Validation).
 */
function analyzeRuleBasedBoundaries(story) {
    const title = story.title || story.user_story || story.requirement_sentence || '';
    const description = story.description || '';
    const ac = story.acceptance_criteria || story.ac || '';
    const fullText = `${title} ${description} ${ac}`.trim();

    const patternsDetected = [];
    const boundaries = [];

    // Pattern 1: Workflow Steps Pattern
    if (/\b(first|then|after|step|process|workflow|pipeline|stage|initiate|confirm|complete|submit|notify)\b/i.test(fullText)) {
        patternsDetected.push('Workflow Steps Pattern');
        boundaries.push({
            pattern: 'Workflow Steps',
            suggestion: 'Decompose by sequential steps: Form Input -> Processing -> Output / Notification'
        });
    }

    // Pattern 2: CRUD Operations Pattern
    if (/\b(create|add|enter|insert|read|view|display|fetch|search|list|filter|update|edit|modify|change|delete|remove)\b/i.test(fullText)) {
        patternsDetected.push('CRUD Operations Pattern');
    }

    // Pattern 3: Business Rules & Validation Pattern
    if (/\b(validate|validation|verify|rule|permission|role|auth|security|overtime|calculate|business rules)\b/i.test(fullText)) {
        patternsDetected.push('Business Rules & Validation Pattern');
    }

    // Pattern 4: Data Variations Pattern
    if (/\b(pdf|excel|export|print|report|batch|bulk|file|csv|import|download)\b/i.test(fullText)) {
        patternsDetected.push('Data Variations & Reporting Pattern');
    }

    return {
        patterns_detected: patternsDetected,
        boundaries: boundaries
    };
}

/**
 * Core User Story Decomposition function.
 * Generates granular, technically accurate work items with proper domains, skills, hours, and complexity.
 */
async function decomposeUserStory(story) {
    const parentId = story.story_id || story.id || story.user_story_id || 'US-01';
    const cleanSid = String(parentId).replace(/[^a-zA-Z0-9]/g, '');
    const parentTitle = story.title || story.user_story || story.requirement_sentence || 'User Story Requirement';
    const description = story.description || '';
    const ac = story.acceptance_criteria || story.ac || '';
    const epic = story.epic || '';
    const feature = story.feature || '';
    const parentPriority = (story.priority || story.priority_tier || 'MEDIUM').toUpperCase();
    const totalPoints = Number(story.story_points) || 5;
    const fullText = `${parentTitle} ${description} ${ac} ${epic} ${feature}`.toLowerCase();

    const ruleAnalysis = analyzeRuleBasedBoundaries(story);
    const workItems = [];
    let seq = 1;

    // Helper to build a work item with rule-based complexity as default/fallback
    const makeItem = (subTitle, desc, domainTaxonomy, customSkills = null, hours = 8, points = 2) => {
        const domain = domainTaxonomy;
        const requiredDomain = mapToAllocationDomain(domain);
        const skills = (customSkills && customSkills.length > 0)
            ? customSkills
            : detectRequiredSkills(subTitle, desc, ac, domain);

        const complexity = calculateComplexity(hours, points, `${subTitle} ${desc}`);
        const priorityScore = calculatePriorityScore(parentPriority, points);

        return {
            work_item_id: `WI-${cleanSid}-${seq++}`,
            story_id: parentId,
            parent_user_story_id: parentId,
            parent_story_title: parentTitle,
            requirement_sentence: story.requirement_sentence || description || parentTitle,
            epic: epic,
            feature: feature,
            title: subTitle,
            description: desc,
            domain: domain,
            required_domain: requiredDomain,
            work_item_type: domain.includes('Frontend') ? 'UI/UX' : (domain.includes('QA') ? 'Testing' : 'Development'),
            priority: parentPriority,
            priority_score: priorityScore,
            predicted_complexity: complexity,
            required_skills: skills,
            story_points: points,
            estimated_hours: hours,
            status: 'To Do',
            created_at: new Date().toISOString()
        };
    };

    // Helper to finalize work items using ML service predictions with rule-based fallback
    const finalizeResult = async (items) => {
        await predictBatchComplexityWithML(items);
        return {
            success: true,
            parent_user_story_id: parentId,
            rule_analysis: ruleAnalysis,
            work_items: items
        };
    };

    // -------------------------------------------------------------
    // SCENARIO 1: Reporting & Document Export Stories
    // Example: "Generate engineering reports from engineering data" / "Export engineering reports in required format"
    // -------------------------------------------------------------
    if (/\b(report|reports|reporting|export|download|pdf|excel|print|analytics|metrics)\b/i.test(fullText)) {
        // Item 1: Backend Data Query & Aggregation API
        workItems.push(makeItem(
            `Data Pipeline & Aggregation API for ${parentTitle}`,
            `Develop backend REST query endpoints and SQL data aggregators to extract operational engineering records.`,
            DOMAIN_TAXONOMY.REPORTING,
            ['SQL', 'Node.js', 'PostgreSQL'],
            12,
            2
        ));

        // Item 2: Frontend Report View & Export Formatting
        const isExportSpecific = /\b(export|pdf|excel|csv|download|print)\b/i.test(fullText);
        workItems.push(makeItem(
            isExportSpecific 
                ? `Document Export & File Serialization (PDF/Excel) for ${parentTitle}`
                : `Interactive Report Visualizer & Summary Dashboard for ${parentTitle}`,
            `Implement client-side data presentation, table filtering, and document export generation (jsPDF/Excel).`,
            DOMAIN_TAXONOMY.FRONTEND,
            ['React', 'JavaScript', 'jsPDF', 'HTML/CSS'],
            10,
            2
        ));

        // Item 3: QA Verification & Format Assertion
        workItems.push(makeItem(
            `QA Verification & Report Data Accuracy Testing for ${parentTitle}`,
            `Automated testing to verify numerical data calculations, report boundary limits, and export format compliance.`,
            DOMAIN_TAXONOMY.QA,
            ['QA Automation', 'Cypress'],
            6,
            1
        ));
        return await finalizeResult(workItems);
    }

    // -------------------------------------------------------------
    // SCENARIO 2: Vessel & Equipment Asset Management
    // Example: "Display vessel-wise equipment and materials" / "Vessel maintenance log"
    // -------------------------------------------------------------
    if (/\b(vessel|equipment|materials|material|spare part|machinery|allocation)\b/i.test(fullText)) {
        const isDisplayFocus = /\b(display|view|show|screen|dashboard|interface)\b/i.test(fullText);

        if (isDisplayFocus) {
            // Focus is displaying information
            workItems.push(makeItem(
                `UI Component: Vessel-wise Equipment & Material View for ${parentTitle}`,
                `Design and build responsive React data table and card views displaying vessel allocation and equipment status.`,
                DOMAIN_TAXONOMY.FRONTEND,
                ['React', 'JavaScript', 'HTML/CSS'],
                12,
                2
            ));

            workItems.push(makeItem(
                `Backend REST API: Vessel Equipment Retrieval & Filtering for ${parentTitle}`,
                `Develop secure REST endpoints with query filters to retrieve vessel equipment and inventory mappings.`,
                DOMAIN_TAXONOMY.ENGINEERING_ASSET,
                ['Node.js', 'SQL', 'PostgreSQL'],
                10,
                2
            ));
        } else {
            // Focus is data processing / updating equipment allocation
            workItems.push(makeItem(
                `Database Persistence & Schema: Equipment Allocation Model for ${parentTitle}`,
                `Design relational schemas, foreign keys, and indexes for vessel-to-equipment inventory mapping.`,
                DOMAIN_TAXONOMY.DATABASE,
                ['SQL', 'PostgreSQL'],
                10,
                2
            ));

            workItems.push(makeItem(
                `Backend Logic: Vessel Equipment Allocation Handler for ${parentTitle}`,
                `Build transactional logic, quantity validation, and status transitions for vessel assets.`,
                DOMAIN_TAXONOMY.ENGINEERING_ASSET,
                ['Node.js', 'JavaScript', 'SQL'],
                12,
                2
            ));

            workItems.push(makeItem(
                `Frontend Interactive UI: Vessel Equipment Selection & Form for ${parentTitle}`,
                `Build equipment selector components, search dialogs, and allocation confirmation views.`,
                DOMAIN_TAXONOMY.FRONTEND,
                ['React', 'JavaScript', 'HTML/CSS'],
                8,
                1
            ));
        }

        workItems.push(makeItem(
            `QA Integration & Verification for ${parentTitle}`,
            `Automate test scenarios verifying vessel equipment linkage, boundary limits, and error handling.`,
            DOMAIN_TAXONOMY.QA,
            ['QA Automation', 'Cypress'],
            6,
            1
        ));
        return await finalizeResult(workItems);
    }

    // -------------------------------------------------------------
    // SCENARIO 3: Labour, Cost & Overtime Calculations
    // Example: "Calculate overtime based on business rules" / "Labor cost allocation"
    // -------------------------------------------------------------
    if (/\b(overtime|wage|rate|cost|costing|hour|working hours|labour|labor|timesheet|payroll)\b/i.test(fullText)) {
        // Item 1: Business Logic Engine
        workItems.push(makeItem(
            `Business Rules Calculation Engine: Overtime & Cost Logic for ${parentTitle}`,
            `Implement business rule algorithms for overtime multipliers, shift allowances, and cost threshold checks.`,
            DOMAIN_TAXONOMY.LABOUR_COST,
            ['Node.js', 'JavaScript', 'SQL'],
            14,
            2
        ));

        // Item 2: Database Schema & Transaction Model
        workItems.push(makeItem(
            `Database Schema & Audit Model: Hours & Cost Records for ${parentTitle}`,
            `Create tables and stored queries for historical rate tracking, timestamps, and auditable calculations.`,
            DOMAIN_TAXONOMY.DATABASE,
            ['SQL', 'PostgreSQL'],
            10,
            2
        ));

        // Item 3: Frontend Time/Cost Review View
        workItems.push(makeItem(
            `Frontend UI: Overtime Review & Calculation Breakdown for ${parentTitle}`,
            `Develop review screen displaying hours worked, rule-applied breakdowns, and manager sign-off controls.`,
            DOMAIN_TAXONOMY.FRONTEND,
            ['React', 'JavaScript', 'HTML/CSS'],
            8,
            1
        ));

        // Item 4: QA Edge-Case & Math Validation Testing
        workItems.push(makeItem(
            `QA Math & Boundary Verification Testing for ${parentTitle}`,
            `Execute comprehensive test cases for standard, holiday, weekend rates, and edge-case calculation verification.`,
            DOMAIN_TAXONOMY.QA,
            ['QA Automation', 'Cypress'],
            6,
            1
        ));
        return await finalizeResult(workItems);
    }

    // -------------------------------------------------------------
    // SCENARIO 4: Work Order Management & Materials Requisition
    // Example: "Add materials required for a work order" / "Approve or reject work orders"
    // -------------------------------------------------------------
    if (/\b(work order|repair|defect|materials required|maintenance request|supervisor approval)\b/i.test(fullText)) {
        workItems.push(makeItem(
            `Backend REST API: Work Order & Materials Management for ${parentTitle}`,
            `Develop REST services for work order lifecycle, item validation, and status transitions.`,
            DOMAIN_TAXONOMY.ENGINEERING_ASSET,
            ['Node.js', 'JavaScript', 'SQL', 'PostgreSQL'],
            14,
            2
        ));

        workItems.push(makeItem(
            `Frontend Interface: Work Order Details & Materials Requisition for ${parentTitle}`,
            `Create interactive forms for adding required materials, quantity pickers, and approval actions.`,
            DOMAIN_TAXONOMY.FRONTEND,
            ['React', 'JavaScript', 'HTML/CSS'],
            10,
            2
        ));

        workItems.push(makeItem(
            `QA Automation: Work Order Workflow & State Transitions for ${parentTitle}`,
            `Automated test suite verifying material reservation, authorization barriers, and status persistence.`,
            DOMAIN_TAXONOMY.QA,
            ['QA Automation', 'Cypress'],
            6,
            1
        ));
        return await finalizeResult(workItems);
    }

    // -------------------------------------------------------------
    // SCENARIO 5: AI / Machine Learning / NLP Stories
    // -------------------------------------------------------------
    if (/\b(machine learning|nlp|spacy|scikit|svm|classifier|ai service|model inference|prediction)\b/i.test(fullText)) {
        workItems.push(makeItem(
            `AI Model Pipeline & Inference Architecture for ${parentTitle}`,
            `Implement model feature extraction vectorizer, trained inference pipeline, and confidence evaluation.`,
            DOMAIN_TAXONOMY.AI_ML,
            ['Python', 'ML', fullText.includes('nlp') ? 'NLP' : 'Scikit-Learn'],
            16,
            3
        ));

        workItems.push(makeItem(
            `Backend REST API: AI Model Prediction Endpoint for ${parentTitle}`,
            `Develop high-throughput REST endpoint exposing model inference with input validation and audit logging.`,
            DOMAIN_TAXONOMY.API_INTEGRATION,
            ['Python', 'Node.js', 'JavaScript'],
            10,
            2
        ));

        workItems.push(makeItem(
            `Frontend Dashboard: AI Prediction & Confidence Display for ${parentTitle}`,
            `Build visual prediction cards, confidence badges, and actionable suggestion interfaces.`,
            DOMAIN_TAXONOMY.FRONTEND,
            ['React', 'JavaScript', 'Tailwind'],
            8,
            1
        ));
        return await finalizeResult(workItems);
    }

    // -------------------------------------------------------------
    // SCENARIO 6: General Agile Software Feature (Deterministic Decomposition)
    // -------------------------------------------------------------
    const baseHoursPerPoint = 6;
    const totalHours = totalPoints * baseHoursPerPoint;

    // 1. Backend Service
    workItems.push(makeItem(
        `Backend REST API & Business Logic: ${parentTitle}`,
        `Implement service controller, validation schemas, and REST endpoints for ${parentTitle}.`,
        DOMAIN_TAXONOMY.BACKEND,
        ['Node.js', 'JavaScript', 'SQL'],
        Math.max(8, Math.round(totalHours * 0.45)),
        Math.max(1, Math.round(totalPoints * 0.4))
    ));

    // 2. Frontend View
    workItems.push(makeItem(
        `Frontend UI Component & State Management: ${parentTitle}`,
        `Design interactive interface components, form handling, and user feedback views for ${parentTitle}.`,
        DOMAIN_TAXONOMY.FRONTEND,
        ['React', 'JavaScript', 'HTML/CSS'],
        Math.max(6, Math.round(totalHours * 0.35)),
        Math.max(1, Math.round(totalPoints * 0.4))
    ));

    // 3. QA Testing
    workItems.push(makeItem(
        `QA Integration & Automated Verification: ${parentTitle}`,
        `Develop automated test cases verifying functional acceptance criteria and edge cases for ${parentTitle}.`,
        DOMAIN_TAXONOMY.QA,
        ['QA Automation', 'Cypress'],
        Math.max(4, Math.round(totalHours * 0.20)),
        Math.max(1, Math.round(totalPoints * 0.2))
    ));

    return await finalizeResult(workItems);
}

module.exports = {
    DOMAIN_TAXONOMY,
    classifyDomain,
    detectRequiredSkills,
    calculateComplexity,
    calculatePriorityScore,
    mapToAllocationDomain,
    analyzeRuleBasedBoundaries,
    decomposeUserStory,
    predictComplexityWithML,
    predictBatchComplexityWithML
};
