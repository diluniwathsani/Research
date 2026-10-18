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
const axios = require('axios');
const xlsx = require('xlsx');
const mammoth = require('mammoth');
const pdfParseModule = require('pdf-parse');

/**
 * Helper: Extract clean requirement sentences from raw text extracted from Word, PDF, or text files.
 */
function extractRequirementsFromText(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];

    // 1. Normalize line endings and strip PDF/Word page markers & control chars
    const cleaned = rawText
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
        .replace(/--\s*Page\s+\d+(?:\s+of\s+\d+)?\s*--/gi, '')
        .replace(/Page\s+\d+\s+of\s+\d+/gi, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    const headerExcludeRegex = /^(?:table of contents|software requirement[s]? specification|system requirement[s]? specification|srs document|document revision history|functional requirement[s]?|non-functional requirement[s]?|system overview|project scope|introduction|scope|revision history|appendix\s*[a-z0-9]|confidential|all rights reserved|prepared by|approved by|version\s*\d+[\.\d]*)\s*$/i;
    const headerNames = new Set([
        'requirement', 'requirements', 'sentence', 'description', 'user story', 
        'story', 'text', 'spec', 'specification', 'id', 'no', 's.no', 'req id', 
        'req_id', '#', 'num', 'number', 'title', 'details', 'detail', 'priority', 
        'status', 'epic', 'feature', 'acceptance criteria'
    ]);

    const reqModalOrActionVerb = /\b(shall|must|should|will|can|needs?|needs to|need to|is required to|are required to|allow[s]?|provide[s]?|support[s]?|enable[s]?|record[s]?|display[s]?|show[s]?|create[s]?|manage[s]?|update[s]?|edit[s]?|delete[s]?|remove[s]?|calculate[s]?|approve[s]?|reject[s]?|assign[s]?|search|filter|export|import|upload|download|notify|notifies|authenticate|verify|verifies|validat|track[s]?|log[s]?|generate[s]?|as a\b)/i;
    const prefixRegex = /^(?:(?:REQ|FR|NFR|SR|US|CR|BR)[-\s_]?\d*[:.\-–—\s]+|\d+(?:\.\d+)*[\.\)\:\-–—]\s+|[-•*–—▪▫◦•]\s+|Requirement\s*\d*[:.\-–—\s]+)\s*/i;

    const rawBlocks = cleaned.split(/\n+/);
    const candidateSentences = [];

    for (const rawBlock of rawBlocks) {
        const trimmed = rawBlock.trim();
        if (!trimmed) continue;

        if (/^(?:[-•*–—▪▫◦•]|(?:REQ|FR|NFR|SR|US|CR|BR)[-\s_]?\d*|\d+(?:\.\d+)*[\.\)\:\-–—]|Requirement\s*\d*)/i.test(trimmed)) {
            candidateSentences.push(trimmed);
        } else {
            const sentences = trimmed.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
            for (const s of sentences) {
                if (s && s.trim()) candidateSentences.push(s.trim());
            }
        }
    }

    const matchedRequirements = [];
    const fallbackSentences = [];
    const seen = new Set();

    for (let sentence of candidateSentences) {
        let clean = sentence.replace(prefixRegex, '').trim();
        clean = clean.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();

        if (clean.length < 15) continue;

        const words = clean.split(/\s+/).filter(Boolean);
        if (words.length < 4 && !/\b(shall|must|should|will|can|need|allow|user)\b/i.test(clean)) continue;

        const lower = clean.toLowerCase();
        if (headerExcludeRegex.test(lower)) continue;
        if (headerNames.has(lower)) continue;
        if (/^(?:section|chapter|module|part)\s+\d+[:.]?\s*$/i.test(lower)) continue;
        if (/^[A-Z][a-z0-9/&]+(?:\s+[A-Z][a-z0-9/&]+){1,3}$/.test(clean) && !/\b(shall|must|should|will|can|is|are|to)\b/i.test(clean)) continue;

        if (seen.has(lower)) continue;
        seen.add(lower);

        if (reqModalOrActionVerb.test(clean)) {
            matchedRequirements.push(clean);
        } else {
            fallbackSentences.push(clean);
        }
    }

    return matchedRequirements.length > 0 ? matchedRequirements : fallbackSentences;
}

/**
 * Helper: Extract text from PDF buffer using pdf-parse (supports both v1 function & v2 class).
 */
async function parsePdfBuffer(buffer) {
    if (!buffer) return '';
    try {
        if (pdfParseModule && pdfParseModule.PDFParse) {
            const parser = new pdfParseModule.PDFParse({ data: buffer });
            const res = await parser.getText();
            if (typeof parser.destroy === 'function') {
                try { await parser.destroy(); } catch (_) {}
            }
            return (res && res.text) ? res.text : '';
        } else if (typeof pdfParseModule === 'function') {
            const res = await pdfParseModule(buffer);
            return (res && res.text) ? res.text : '';
        }
    } catch (err) {
        console.error('PDF parsing error in parsePdfBuffer:', err.message);
        throw err;
    }
    return '';
}

/**
 * Helper: Extract text from Word document (.docx / .doc) using mammoth.
 */
async function parseWordDocument(filePath, buffer) {
    let text = '';
    try {
        if (filePath && fs.existsSync(filePath)) {
            const res = await mammoth.extractRawText({ path: filePath });
            if (res && res.value) text = res.value;
        }
    } catch (_) {}

    if (!text && buffer) {
        try {
            const res = await mammoth.extractRawText({ buffer: buffer });
            if (res && res.value) text = res.value;
        } catch (_) {}
    }

    // Fallback: If older binary .doc format or mammoth couldn't read ZIP XML, extract ASCII/UTF strings
    if (!text && buffer && buffer.length > 0) {
        try {
            const asciiStrings = buffer.toString('utf-8').match(/[A-Za-z0-9\s.,;:'"()\-–—]{15,}/g) || [];
            if (asciiStrings.length > 0) {
                text = asciiStrings.join('\n');
            }
        } catch (_) {}
    }

    return text;
}

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

    // 1. Determine first appearance order (min requirement_order) for each Epic
    const epicMinOrder = {};
    sorted.forEach((s, idx) => {
        const epicName = (s.epic || 'General Epic').trim();
        const order = s.requirement_order !== undefined && s.requirement_order !== null 
            ? Number(s.requirement_order) 
            : (parseInt(String(s.story_id || s.user_story_id || s.id || '').replace(/\D/g, '')) || (idx + 1));
        
        if (epicMinOrder[epicName] === undefined || order < epicMinOrder[epicName]) {
            epicMinOrder[epicName] = order;
        }

        const meta = analyzeProcessAndDependencyTier(s.title || s.user_story || s.requirement_sentence || '', s.description || s.acceptance_criteria || '');
        s.dependencyTier = meta.tier;
        s.dependency_tier = meta.tier;
        s.processStep = meta.processStep;
        s.process_step = meta.processStep;
        s.processGroup = meta.group;
        s.process_group = meta.group;
        s.priorityRank = getPriorityRank(s.priority, `${s.title || ''} ${s.description || ''}`);
        if (s.requirement_order === undefined || s.requirement_order === null) {
            s.requirement_order = order;
        }
    });

    // 2. Sort by Epic creation order first, then requirement_order / story_id within each Epic
    sorted.sort((a, b) => {
        const epicA = (a.epic || 'General Epic').trim();
        const epicB = (b.epic || 'General Epic').trim();
        const epicOrderA = epicMinOrder[epicA] !== undefined ? epicMinOrder[epicA] : 999999;
        const epicOrderB = epicMinOrder[epicB] !== undefined ? epicMinOrder[epicB] : 999999;

        if (epicOrderA !== epicOrderB) {
            return epicOrderA - epicOrderB;
        }

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
/**
 * Evaluates whether a requirement sentence is Complete, Incomplete, Inconsistent, or Ambiguous.
 * Standards:
 * - Incomplete: Missing Subject (Actor), Missing Action (Verb), Missing RFC 2119 Modal keyword (shall/must), or Too short / unfinished clause.
 * - Inconsistent: Conflicting affirmative and negative directives (shall vs shall not), conflicting permissions, contradictory states/retention, or conflicting timing.
 * - Ambiguous: Subjective non-verifiable quality terms (fast, user-friendly, robust), vague quantifiers (etc., and/or, various), weak modals (if possible, as needed).
 * - Complete: Meets all syntactic and semantic quality criteria.
 */
function evaluateRequirementQuality(reqText) {
    if (!reqText || typeof reqText !== 'string') return "Incomplete: Empty text";
    const clean = reqText.trim();
    const words = clean.split(/\s+/).filter(Boolean);
    const lower = clean.toLowerCase();

    // 1. INCOMPLETE CHECKS
    if (words.length < 5 || clean.length < 15) {
        return "Incomplete: Too short";
    }

    if (/\b(tbd|tba|todo|to be determined|to be decided|placeholder)\b/i.test(lower)) {
        return "Incomplete: Contains unfinished placeholder (TBD/TODO)";
    }

    if (/(\.{3,}|…|\bsuch as\s*[.,;:]*$|\bincluding\s*[.,;:]*$|\be\.g\.?\s*[.,;:]*$|\bi\.e\.?\s*[.,;:]*$|\band\s*[.,;:]*$|\bor\s*[.,;:]*$|\bwith\s*[.,;:]*$|\bto\s*[.,;:]*$)/i.test(clean)) {
        return "Incomplete: Trailing incomplete clause or ellipsis";
    }

    // Comprehensive list of software requirement action verbs
    const actionVerbRegex = /\b(add|adds|edit|edits|create|creates|delete|deletes|remove|removes|update|updates|modify|modifies|change|changes|manage|manages|enter|enters|input|inputs|allow|allows|permit|permits|enable|enables|disable|disables|prevent|prevents|prohibit|prohibits|restrict|restricts|display|displays|show|shows|hide|hides|view|views|see|sees|record|records|log|logs|track|tracks|capture|captures|store|stores|save|saves|retrieve|retrieves|fetch|fetches|load|loads|export|exports|import|imports|upload|uploads|download|downloads|send|sends|receive|receives|notify|notifies|alert|alerts|prompt|prompts|request|requests|respond|responds|approve|approves|reject|rejects|review|reviews|validate|validates|verify|verifies|authenticate|authenticates|authorize|authorizes|calculate|calculates|compute|computes|estimate|estimates|determine|determines|assess|assesses|evaluate|evaluates|consider|considers|process|processes|generate|generates|produce|produces|assign|assigns|allocate|allocates|distribute|distributes|schedule|schedules|select|selects|choose|chooses|filter|filters|search|searches|sort|sorts|order|orders|query|queries|maintain|maintains|support|supports|provide|provides|offer|offers|ensure|ensures|enforce|enforces|apply|applies|perform|performs|execute|executes|run|runs|initiate|initiates|trigger|triggers|start|starts|stop|stops|halt|halts|pause|pauses|resume|resumes|cancel|cancels|close|closes|open|opens|complete|completes|finish|finishes|archive|archives|attach|attaches|convert|converts|format|formats|parse|parses|extract|extracts|sync|syncs|synchronize|synchronizes|connect|connects|disconnect|disconnects|integrate|integrates|link|links|be|been|have|has|contain|contains|include|includes|consist|consists|require|requires|accept|accepts|refuse|refuses|handle|handles|use|uses|used|using|obtain|obtains|obtained|obtaining|utilize|utilizes|utilized|utilizing|consume|consumes|employ|employs|operate|operates|transfer|transfers|transmit|transmits|identify|identifies|identified|identifying|find|finds|found|detect|detects|detected)\b/i;

    // Check for modal or semi-modal phrasing (shall, must, should, will, can, could, may, need to, needs to, etc.)
    const modalMatch = clean.match(/\b(shall|should|must|will|can|could|may|needs?\s+to|need\s+to|is\s+required\s+to|are\s+required\s+to|has\s+to|have\s+to|is\s+able\s+to|are\s+able\s+to)\b/i);

    if (modalMatch) {
        // Subject / Actor check: There must be a subject preceding the modal keyword
        const beforeModal = clean.slice(0, modalMatch.index)
            .replace(/^(?:(?:REQ|FR|NFR|SR|US|CR|BR)[-\s_]?\d*[:.\-–—\s]+|\d+(?:\.\d+)*[\.\)\:\-–—]\s+|[-•*–—▪▫◦•]\s+|Requirement\s*\d*[:.\-–—\s]+)\s*/i, '')
            .trim();

        if (!beforeModal || beforeModal.length === 0) {
            return "Incomplete: Missing a subject (Who/What?)";
        }

        const afterModal = clean.slice(modalMatch.index + modalMatch[0].length).trim();
        if (!afterModal || afterModal.length === 0) {
            return "Incomplete: Missing an action (Does what?)";
        }

        // Check if the content following modal has an action verb
        const afterModalClean = afterModal.replace(/^(?:not|never|always|automatically|only|promptly|immediately|periodically|dynamically|securely|directly)\s+/i, '').trim();
        const firstWord = afterModalClean.split(/\s+/)[0].toLowerCase();
        const invalidFirstWords = new Set(['a', 'an', 'the', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'to', 'into', 'about', 'his', 'her', 'their', 'my', 'our', 'its', 'them', 'him', 'it', 'me', 'us']);

        if (invalidFirstWords.has(firstWord) && !actionVerbRegex.test(afterModalClean)) {
            return "Incomplete: Missing an action (Does what?)";
        }

        if (!actionVerbRegex.test(afterModal)) {
            return "Incomplete: Missing an action (Does what?)";
        }
    } else {
        // Natural declarative requirement (no modal auxiliary)
        const cleanNoPrefix = clean.replace(/^(?:(?:REQ|FR|NFR|SR|US|CR|BR)[-\s_]?\d*[:.\-–—\s]+|\d+(?:\.\d+)*[\.\)\:\-–—]\s+|[-•*–—▪▫◦•]\s+|Requirement\s*\d*[:.\-–—\s]+)\s*/i, '').trim();

        if (!actionVerbRegex.test(cleanNoPrefix)) {
            return "Incomplete: Missing an action (Does what?)";
        }

        const firstWordOfSentence = cleanNoPrefix.split(/\s+/)[0].toLowerCase();
        const imperativeVerbs = /^(add|edit|create|delete|remove|update|modify|change|manage|enter|input|record|log|track|capture|store|save|retrieve|fetch|load|export|import|upload|download|send|receive|notify|alert|prompt|request|respond|approve|reject|review|validate|verify|authenticate|authorize|calculate|compute|estimate|determine|assess|evaluate|process|generate|produce|assign|allocate|distribute|schedule|select|choose|filter|search|sort|maintain|provide|support|execute|run|start|stop|cancel|close|open|complete|convert|sync|connect|disconnect|integrate|link|obtain|utilize|operate|transfer|transmit)$/i;
        if (imperativeVerbs.test(firstWordOfSentence)) {
            return "Incomplete: Missing a subject (Who/What?)";
        }
    }

    // 2. INCONSISTENT CHECKS (Direct Contradictions & Conflicts)
    const negModalRegex = /\b(shall\s+not|must\s+not|cannot|can\s+not|shall\s+never|must\s+never|shall\s+under\s+no\s+circumstance)\b/i;
    const hasNegModal = negModalRegex.test(lower);
    const textWithoutNegModals = lower.replace(new RegExp(negModalRegex.source, 'gi'), '');
    const hasPosModal = /\b(shall|must)\b/i.test(textWithoutNegModals);
    if (hasPosModal && hasNegModal) {
        return "Inconsistent: Conflicting affirmative and negative directives ('shall' vs 'shall not')";
    }

    const hasPublicAccess = /\b(without authentication|unauthenticated\s+access|anonymous\s+access|publicly accessible|all users without login|any user without credentials|open to everyone)\b/i.test(lower);
    const hasRestrictedAccess = /\b(restricted to|only authorized|admin only|only administrators|requires login|confidential|private access|restricted access)\b/i.test(lower);
    if (hasPublicAccess && hasRestrictedAccess) {
        return "Inconsistent: Conflicting access rules (public/unauthenticated vs restricted access)";
    }

    const hasShallAllow = /\b(shall allow|must allow|shall permit|must permit|shall enable)\b/i.test(lower);
    const hasShallProhibit = /\b(shall prohibit|must prohibit|shall disallow|must disallow|shall prevent|must prevent|shall disable)\b/i.test(lower);
    if (hasShallAllow && hasShallProhibit) {
        return "Inconsistent: Conflicting action directives (allow/permit vs prohibit/disallow)";
    }

    const hasDelete = /\b(permanently delete|permanently deleted|purge|purged|destroy|destroyed)\b/i.test(lower);
    const hasRetain = /\b(retain indefinitely|keep forever|archive permanently|store permanently|retained forever)\b/i.test(lower);
    if (hasDelete && hasRetain) {
        return "Inconsistent: Conflicting data lifecycle rules (permanently delete vs retain indefinitely)";
    }

    const hasStorePlaintext = /\b(store in plain\s*text|save as plain\s*text|transmit in plain\s*text|stored unencrypted|transmitted unencrypted|as plain\s*text)\b/i.test(lower);
    const hasEncrypt = /\b(encrypt|encrypted|encryption|hashed|hash)\b/i.test(lower);
    const isNegatedPlaintext = /\b(never|not|no|prevent|prohibit|disallow)\s+(?:store in\s+|transmit in\s+|save as\s+|in\s+)?(?:plain\s*text|unencrypted)\b/i.test(lower);
    if (hasStorePlaintext && hasEncrypt && !isNegatedPlaintext) {
        return "Inconsistent: Conflicting security directives (plaintext vs encrypted)";
    }

    const hasRealtime = /\b(real-time|real time|instantaneously|immediately|zero latency)\b/i.test(lower);
    const hasBatch = /\b(daily batch|overnight batch|end of day|end of month|monthly batch|delayed processing)\b/i.test(lower);
    if (hasRealtime && hasBatch) {
        return "Inconsistent: Conflicting timing constraints (real-time vs batch processing)";
    }

    const hasMandatory = /\b(mandatory|compulsory|strictly required)\b/i.test(lower);
    const hasOptional = /\b(optional|discretionary|not required|if desired)\b/i.test(lower);
    if (hasMandatory && hasOptional) {
        return "Inconsistent: Conflicting requirement necessity (mandatory vs optional)";
    }

    // 3. AMBIGUOUS CHECKS (Vague / Non-verifiable Terms)
    const ambiguousSubjectiveList = [
        { regex: /\b(user-friendly|user friendly)\b/i, name: "user-friendly" },
        { regex: /\b(easy to use|easy to learn|simple to use)\b/i, name: "easy to use" },
        { regex: /\bfast(?!\s*-\s*forward)\b|\b(quickly|very quick|super fast)\b/i, name: "fast/quickly" },
        { regex: /\b(high performance|high-performance|high quality|high-quality|state of the art|state-of-the-art)\b/i, name: "high performance/quality" },
        { regex: /\b(optimal|optimally)\b/i, name: "optimal" },
        { regex: /\b(seamless|seamlessly)\b/i, name: "seamless" },
        { regex: /\b(robust|robustly)\b/i, name: "robust" },
        { regex: /\b(efficient|efficiently)\b/i, name: "efficient" },
        { regex: /\b(intuitive|intuitively)\b/i, name: "intuitive" },
        { regex: /\b(sufficient|sufficiently|adequate|adequately|acceptable)\b/i, name: "sufficient/adequate" },
        { regex: /\b(reasonable|reasonably|convenient|conveniently)\b/i, name: "reasonable/convenient" },
        { regex: /\b(as much as possible|as soon as possible|as far as possible|asap)\b/i, name: "as soon/much as possible" },
        { regex: /\b(best possible|highest possible|minimal delay|minimal effort)\b/i, name: "best/minimal possible" }
    ];

    for (const item of ambiguousSubjectiveList) {
        if (item.regex.test(lower)) {
            return `Ambiguous: Subjective term '${item.name}' lacks verifiable acceptance criteria`;
        }
    }

    const ambiguousQuantifiers = [
        { regex: /\b(etc\.?|and\/or|and or|so on|and so forth)\b/i, name: "etc/and-or" },
        { regex: /\b(various|several|some|roughly|approximately|about\s+\d+|nearly|almost)\b/i, name: "vague quantifier" },
        { regex: /\b(as needed|as required|as appropriate|if necessary|if possible|when appropriate)\b/i, name: "open-ended conditional" },
        { regex: /\b(might|may perhaps|can perhaps|could possibly)\b/i, name: "non-committal modal" }
    ];

    for (const item of ambiguousQuantifiers) {
        const m = lower.match(item.regex);
        if (m) {
            return `Ambiguous: Open-ended qualifier '${m[0]}' is non-verifiable`;
        }
    }

    // 4. COMPLETE
    return "Complete";
}

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
        'team leader', 'team leaders',
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

    const actionVerbs = ['create', 'creates', 'manage', 'manages', 'enter', 'enters', 'allow', 'allows', 'display', 'displays', 'show', 'shows', 'record', 'records', 'approve', 'approves', 'reject', 'rejects', 'update', 'updates', 'select', 'selects', 'assign', 'assigns', 'maintain', 'maintains', 'calculate', 'calculates', 'provide', 'provides', 'support', 'supports', 'store', 'stores', 'obtain', 'obtains', 'use', 'uses', 'view', 'views', 'export', 'exports', 'include', 'includes', 'restrict', 'restricts', 'send', 'sends', 'filter', 'filters', 'search', 'searches', 'identify', 'identifies', 'generate', 'generates', 'receive', 'receives', 'log', 'logs', 'notify', 'notifies', 'alert', 'alerts'];
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
        'searches': 'search', 'views': 'view', 'identifies': 'identify', 'receives': 'receive',
        'generates': 'generate', 'logs': 'log', 'notifies': 'notify', 'alerts': 'alert'
    };
    const firstWord = cleanAction.split(/\s+/)[0]?.toLowerCase() || '';
    if (verbUninflectMap[firstWord]) {
        cleanAction = verbUninflectMap[firstWord] + cleanAction.slice(firstWord.length);
    }

    cleanAction = cleanAction.replace(/\.+$/, '').trim();
    goal = goal.replace(/\.+$/, '').trim();
    const article = actor.toLowerCase() === 'user' ? 'a' : (['a', 'e', 'i', 'o', 'u'].includes(actor.charAt(0).toLowerCase()) ? 'an' : 'a');
    const userStory = `As ${article} ${actor}, I want to ${cleanAction.charAt(0).toLowerCase() + cleanAction.slice(1)} so that ${goal}.`;

    // 4. Dynamic Acceptance Criteria Generation (Gherkin Format)
    const acceptanceCriteria = 
        `Scenario: Verify ${feature}\n` +
        `1. Given the system is operational and ready for ${feature.toLowerCase()}\n` +
        `2. When the ${actor.toLowerCase()} performs: ${cleanAction.toLowerCase()}\n` +
        `3. Then the system must validate the input according to ${epic.toLowerCase()} rules\n` +
        `4. And the ${feature.toLowerCase()} records should be updated successfully.`;

    // 5. Engineering Completeness, Ambiguity & Inconsistency Evaluation
    const completenessStatus = evaluateRequirementQuality(reqText || cleanText);

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
        const { batch_name, project_name, project_id } = req.body;
        const uploadTime = new Date().toISOString();
        const originalName = req.file.originalname || '';
        const ext = path.extname(originalName).toLowerCase();

        // 1. File Format Validation: Allow Word (.docx, .doc), PDF (.pdf), and Excel/CSV
        const allowedFormats = ['.docx', '.doc', '.pdf', '.xlsx', '.xls', '.csv'];
        if (!allowedFormats.includes(ext)) {
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            return res.status(400).json({ 
                error: `Unsupported file format (${ext || 'unknown'}). Supported formats: Word (.docx, .doc), PDF (.pdf), Excel (.xlsx, .xls), or CSV (.csv).` 
            });
        }

        // 2. Corrupted / Unreadable File Validation (Magic Header & Parser Check)
        let fileBuffer;
        try {
            fileBuffer = fs.readFileSync(req.file.path);
        } catch (readErr) {
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            return res.status(400).json({ 
                error: 'The uploaded file is corrupted or unreadable. Please check the file and try again.' 
            });
        }

        // Validate 0-byte blank files
        if (!fileBuffer || fileBuffer.length === 0) {
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            return res.status(400).json({ 
                error: 'Blank document detected. The uploaded file is empty (0 bytes). Please upload a valid requirements document.' 
            });
        }

        // Validate Magic Headers:
        // .pdf starts with %PDF- (0x25 0x50 0x44 0x46)
        // .docx and .xlsx are ZIP archives (0x50 0x4B)
        // .xls is OLE2 Compound Document (0xD0 0xCF)
        if (ext === '.pdf') {
            if (fileBuffer.length < 5 || fileBuffer.slice(0, 4).toString('ascii') !== '%PDF') {
                if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                    try { fs.unlinkSync(req.file.path); } catch (_) {}
                }
                return res.status(400).json({ 
                    error: 'The uploaded PDF is invalid or corrupted. Please verify the document format.' 
                });
            }
        } else if (ext === '.docx') {
            if (fileBuffer.length < 4 || fileBuffer[0] !== 0x50 || fileBuffer[1] !== 0x4B) {
                if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                    try { fs.unlinkSync(req.file.path); } catch (_) {}
                }
                return res.status(400).json({ 
                    error: 'The uploaded Word (.docx) file is invalid or corrupted. Please verify the document format.' 
                });
            }
        } else if (ext === '.xlsx') {
            if (fileBuffer.length < 4 || fileBuffer[0] !== 0x50 || fileBuffer[1] !== 0x4B) {
                if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                    try { fs.unlinkSync(req.file.path); } catch (_) {}
                }
                return res.status(400).json({ 
                    error: 'The uploaded Excel (.xlsx) file is invalid or corrupted. Please verify the document format.' 
                });
            }
        } else if (ext === '.xls') {
            if (fileBuffer.length < 4 || fileBuffer[0] !== 0xD0 || fileBuffer[1] !== 0xCF) {
                if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                    try { fs.unlinkSync(req.file.path); } catch (_) {}
                }
                return res.status(400).json({ 
                    error: 'The uploaded Excel (.xls) file is invalid or corrupted. Please verify the document format.' 
                });
            }
        }

        let reqSentences = [];

        // 3. Document Content Parsing & Requirement Extraction
        if (ext === '.docx' || ext === '.doc') {
            let rawText = '';
            try {
                rawText = await parseWordDocument(req.file.path, fileBuffer);
            } catch (docxErr) {
                console.error('Word parse error:', docxErr.message);
                if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                    try { fs.unlinkSync(req.file.path); } catch (_) {}
                }
                return res.status(400).json({ 
                    error: 'The uploaded Word document could not be read. Please check the file and try again.' 
                });
            }

            if (!rawText || rawText.trim().length === 0) {
                if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                    try { fs.unlinkSync(req.file.path); } catch (_) {}
                }
                return res.status(400).json({ 
                    error: 'The uploaded Word document is blank or contains no readable text. Please upload a document containing requirements.' 
                });
            }

            reqSentences = extractRequirementsFromText(rawText);

        } else if (ext === '.pdf') {
            let rawText = '';
            try {
                rawText = await parsePdfBuffer(fileBuffer);
            } catch (pdfErr) {
                console.error('PDF parse error:', pdfErr.message);
                if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                    try { fs.unlinkSync(req.file.path); } catch (_) {}
                }
                return res.status(400).json({ 
                    error: 'The uploaded PDF document could not be read. Please check the file and try again.' 
                });
            }

            if (!rawText || rawText.trim().length === 0) {
                if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                    try { fs.unlinkSync(req.file.path); } catch (_) {}
                }
                return res.status(400).json({ 
                    error: 'The uploaded PDF document is blank or contains no readable text. Please upload a document containing requirements.' 
                });
            }

            reqSentences = extractRequirementsFromText(rawText);

        } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
            let workbook;
            try {
                workbook = xlsx.readFile(req.file.path);
                if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0 || !workbook.Sheets || Object.keys(workbook.Sheets).length === 0) {
                    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                        try { fs.unlinkSync(req.file.path); } catch (_) {}
                    }
                    return res.status(400).json({ 
                        error: 'The uploaded spreadsheet is blank or contains no valid sheets. Please upload a spreadsheet containing requirements.' 
                    });
                }
            } catch (parseErr) {
                console.error('File parse error:', parseErr.message);
                if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                    try { fs.unlinkSync(req.file.path); } catch (_) {}
                }
                return res.status(400).json({ 
                    error: 'The uploaded file is corrupted or unreadable. Please check the file and try again.' 
                });
            }

            const sheetName = workbook.SheetNames[0];
            const rawSheet = workbook.Sheets[sheetName];
            if (!rawSheet || Object.keys(rawSheet).length === 0) {
                if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                    try { fs.unlinkSync(req.file.path); } catch (_) {}
                }
                return res.status(400).json({ 
                    error: 'The uploaded spreadsheet sheet is blank. Please upload a spreadsheet containing requirements.' 
                });
            }

            const data = xlsx.utils.sheet_to_json(rawSheet);
            if (!Array.isArray(data) || data.length === 0) {
                if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                    try { fs.unlinkSync(req.file.path); } catch (_) {}
                }
                return res.status(400).json({ 
                    error: 'The uploaded spreadsheet is blank or contains no data rows. Please upload a spreadsheet containing requirements.' 
                });
            }

            const headerNames = new Set([
                'requirement', 'requirements', 'sentence', 'description', 'user story', 
                'story', 'text', 'spec', 'specification', 'id', 'no', 's.no', 'req id', 
                'req_id', '#', 'num', 'number', 'title', 'details', 'detail'
            ]);

            for (const row of data) {
                if (!row || typeof row !== 'object') continue;
                let reqText = '';
                
                for (const key of Object.keys(row)) {
                    const lowerKey = key.toLowerCase().trim();
                    const val = row[key];
                    if (val !== undefined && val !== null) {
                        const strVal = String(val).trim();
                        if (strVal.length > 0) {
                            if (lowerKey.includes('sentence') || lowerKey.includes('description') || lowerKey.includes('requirement') || lowerKey.includes('user story') || lowerKey.includes('story') || lowerKey.includes('text') || lowerKey.includes('spec')) {
                                reqText = strVal;
                                break;
                            }
                        }
                    }
                }

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

                if (reqText && reqText.length > 0) {
                    const lowerText = reqText.toLowerCase().trim();
                    if (!headerNames.has(lowerText)) {
                        reqSentences.push(reqText);
                    }
                }
            }
        }

        if (!reqSentences || reqSentences.length === 0) {
            if (req.file && req.file.path && fs.existsSync(req.file.path)) {
                try { fs.unlinkSync(req.file.path); } catch (_) {}
            }
            return res.status(400).json({ 
                error: 'The uploaded document is blank or contains no valid requirements. Please upload a document containing requirements.' 
            });
        }

        client = await pool.connect();
        const effectiveProjectName = (project_name || batch_name || originalName.replace(/\.[^/.]+$/, '') || 'Aurora ERP System').trim();
        const effectiveProjectId = (project_id && String(project_id).trim()) ? String(project_id).trim() : `P${Date.now().toString().slice(-6)}`;

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

            // Step D: Defensive auto-creation check for requirements, user_stories & sprints tables
            await client.query(`
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

            // Step E: Loop over extracted requirement sentences and generate artifacts
            const reqBatch = [];
            let rowSeq = 1;
            for (const reqText of reqSentences) {
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
                            await client.query('SAVEPOINT sprint_sp');
                            await client.query(`
                                INSERT INTO public.sprints (sprint_id, project_id, sprint_name, sprint_number, status, capacity_story_points)
                                VALUES 
                                ($1, $2, $3, $4, $5, 30)
                                ON CONFLICT (sprint_id) DO UPDATE SET project_id = EXCLUDED.project_id
                            `, [sprintCode, effectiveProjectId, `Sprint ${sNum}`, sNum, sNum === 1 ? 'ACTIVE' : 'PENDING']);
                            await client.query('RELEASE SAVEPOINT sprint_sp');
                        } catch (sErr) {
                            await client.query('ROLLBACK TO SAVEPOINT sprint_sp');
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

            res.json({ 
                message: 'File uploaded and project created successfully', 
                project_id: effectiveProjectId, 
                project_name: effectiveProjectName,
                count: reqBatch.length 
            });
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
        if (project_id && project_id !== 'ALL') {
            const cleanId = String(project_id).trim();
            const result = await pool.query(
                "SELECT * FROM requirements WHERE project_id = $1 OR project_id = $2 OR batch_name = $1 ORDER BY requirement_order ASC, id ASC",
                [cleanId, cleanId.startsWith('P') ? cleanId : `P${cleanId}`]
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
    const { batch_name, project_id } = req.body;
    const { timestamp } = req.params;

    try {
        let result;
        if (project_id) {
            result = await pool.query(
                "UPDATE requirements SET batch_name = $1 WHERE project_id = $2 OR created_at = $3",
                [batch_name, project_id, timestamp]
            );
        } else {
            result = await pool.query(
                "UPDATE requirements SET batch_name = $1 WHERE created_at = $2",
                [batch_name, timestamp]
            );
        }
        res.json({ message: 'Batch renamed successfully', count: result.rowCount });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// Bridge Proxy Endpoint for Phase 4 Sprint Planning (Port 8082 bridge)
app.post('/api/import-requirements', async (req, res) => {
    try {
        const response = await axios.post('http://127.0.0.1:8082/api/import-requirements', req.body, { timeout: 45000 });
        res.json(response.data);
    } catch (err) {
        console.error('Proxy error to port 8082 /api/import-requirements:', err.message);
        res.status(err.response?.status || 502).json(err.response?.data || { error: 'Failed to communicate with Sprint Planning API (port 8082).' });
    }
});

app.get('/api/sprint-plan', async (req, res) => {
    try {
        const response = await axios.get('http://127.0.0.1:8082/api/sprint-plan', { timeout: 15000 });
        res.json(response.data);
    } catch (err) {
        res.status(err.response?.status || 502).json(err.response?.data || { error: 'Sprint planning service unavailable.' });
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

        pythonProcess.stdin.write(JSON.stringify(sentences));
        pythonProcess.stdin.end();

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
    let { timestamp, project_id } = req.query;

    try {
        let result;
        if (project_id) {
            result = await pool.query("SELECT * FROM requirements WHERE project_id = $1 ORDER BY requirement_order ASC, id ASC", [project_id]);
        } else if (timestamp) {
            result = await pool.query("SELECT * FROM requirements WHERE created_at = $1 ORDER BY requirement_order ASC, id ASC", [timestamp]);
        } else {
            const latestRes = await pool.query("SELECT created_at FROM requirements ORDER BY id DESC LIMIT 1");
            if (latestRes.rows.length > 0) {
                timestamp = latestRes.rows[0].created_at;
                result = await pool.query("SELECT * FROM requirements WHERE created_at = $1 ORDER BY requirement_order ASC, id ASC", [timestamp]);
            } else {
                return res.status(200).json({ success: true, count: 0, data: [], message: 'No requirements found to export' });
            }
        }

        const rows = result ? result.rows : [];
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
// Unified handler returning active projects with live requirement counts and timestamps
app.get('/api/projects', changeRequestController.getAllProjects);

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

// POST /api/developers - Add new developer with custom skills
app.post('/api/developers', async (req, res) => {
    try {
        const { name, role, primary_domain, languages, skills, capacity_hours, email } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Developer name is required' });
        }

        let langStr = '';
        if (Array.isArray(languages)) {
            langStr = languages.map(s => String(s).trim()).filter(Boolean).join(',');
        } else if (Array.isArray(skills)) {
            langStr = skills.map(s => String(s).trim()).filter(Boolean).join(',');
        } else if (typeof languages === 'string') {
            langStr = languages;
        } else if (typeof skills === 'string') {
            langStr = skills;
        }

        const domain = (primary_domain || 'general').toLowerCase();
        const capacity = parseInt(capacity_hours, 10) || 40;
        const devRole = role || 'Full-Stack Developer';
        const devEmail = email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;

        const result = await pool.query(
            `INSERT INTO developers (name, role, primary_domain, languages, capacity_hours, email, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING *`,
            [name.trim(), devRole, domain, langStr, capacity, devEmail]
        );

        const newDev = result.rows[0];
        res.status(201).json({
            success: true,
            developer: {
                ...newDev,
                languages: newDev.languages ? newDev.languages.split(',') : []
            }
        });
    } catch (error) {
        console.error('Error creating developer:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/developers/:id - Edit developer & skills
app.put('/api/developers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, role, primary_domain, languages, skills, capacity_hours, email } = req.body;

        let langStr = undefined;
        if (Array.isArray(languages)) {
            langStr = languages.map(s => String(s).trim()).filter(Boolean).join(',');
        } else if (Array.isArray(skills)) {
            langStr = skills.map(s => String(s).trim()).filter(Boolean).join(',');
        } else if (typeof languages === 'string') {
            langStr = languages;
        } else if (typeof skills === 'string') {
            langStr = skills;
        }

        const domain = primary_domain ? primary_domain.toLowerCase() : undefined;
        const capacity = capacity_hours !== undefined ? (parseInt(capacity_hours, 10) || 40) : undefined;

        const check = await pool.query('SELECT * FROM developers WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Developer not found' });
        }
        const current = check.rows[0];

        const updatedName = name !== undefined ? name.trim() : current.name;
        const updatedRole = role !== undefined ? role : current.role;
        const updatedDomain = domain !== undefined ? domain : current.primary_domain;
        const updatedLanguages = langStr !== undefined ? langStr : current.languages;
        const updatedCapacity = capacity !== undefined ? capacity : current.capacity_hours;
        const updatedEmail = email !== undefined ? email : current.email;

        const result = await pool.query(
            `UPDATE developers 
             SET name = $1, role = $2, primary_domain = $3, languages = $4, capacity_hours = $5, email = $6, updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [updatedName, updatedRole, updatedDomain, updatedLanguages, updatedCapacity, updatedEmail, id]
        );

        const updatedDev = result.rows[0];
        res.json({
            success: true,
            developer: {
                ...updatedDev,
                languages: updatedDev.languages ? updatedDev.languages.split(',') : []
            }
        });
    } catch (error) {
        console.error('Error updating developer:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/developers/:id - Delete developer
app.delete('/api/developers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        try {
            await pool.query('DELETE FROM allocations WHERE developer_id = $1', [id]);
        } catch (_) {}

        const result = await pool.query('DELETE FROM developers WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Developer not found' });
        }
        res.json({ success: true, message: `Developer ${result.rows[0].name} deleted successfully` });
    } catch (error) {
        console.error('Error deleting developer:', error);
        res.status(500).json({ error: error.message });
    }
});

// ================= DETERMINISTIC RULE-BASED ALLOCATION ENGINE =================

function getSeniorityRank(roleStr) {
    const role = (roleStr || '').toLowerCase();
    if (role.includes('senior') || role.includes('lead') || role.includes('principal') || role.includes('architect')) {
        return 'SENIOR';
    }
    if (role.includes('junior') || role.includes('intern') || role.includes('associate')) {
        return 'JUNIOR';
    }
    return 'MID';
}

function calculateComplexitySenioritySuitability(predictedComplexity, roleStr) {
    const seniority = getSeniorityRank(roleStr);
    const complexity = (predictedComplexity || 'MEDIUM').toUpperCase();

    // Deterministic rules:
    // HIGH complexity:
    // 1. Senior or Lead developers (3)
    // 2. Mid-level developers (2)
    // 3. Junior developers (1)
    // MEDIUM complexity:
    // 1. Mid-level or Senior developers (2)
    // 2. Junior developers (1)
    // LOW complexity:
    // 1. Junior or Mid-level developers (2)
    // 2. Senior developers if needed (1)
    if (complexity === 'HIGH') {
        if (seniority === 'SENIOR') return 3;
        if (seniority === 'MID') return 2;
        return 1;
    } else if (complexity === 'LOW') {
        if (seniority === 'JUNIOR' || seniority === 'MID') return 2;
        return 1;
    } else { // MEDIUM (default fallback)
        if (seniority === 'MID' || seniority === 'SENIOR') return 2;
        return 1;
    }
}

function extractSkillList(skills) {
    if (!skills) return [];
    if (Array.isArray(skills)) {
        return skills.map(s => String(s).trim().toLowerCase()).filter(Boolean);
    }
    if (typeof skills === 'string') {
        const trimmed = skills.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    return parsed.map(s => String(s).trim().toLowerCase()).filter(Boolean);
                }
            } catch (e) {}
        }
        return trimmed.split(',').map(s => String(s).trim().toLowerCase()).filter(Boolean);
    }
    return [];
}

function calculateSkillMatchPercentage(devSkills, requiredSkills) {
    const reqList = extractSkillList(requiredSkills);
    // If a work item has no required skills, handle safely without division by zero with neutral 100%
    if (reqList.length === 0) return 100;

    const devSkillList = extractSkillList(devSkills);
    if (devSkillList.length === 0) return 0;

    const normalizeSkill = (s) => {
        const clean = String(s || '').toLowerCase().trim();
        if (clean === 'postgres' || clean === 'postgresql' || clean === 'psql') return 'sql';
        if (clean === 'reactjs') return 'react';
        if (clean === 'node' || clean === 'nodejs') return 'node.js';
        if (clean === 'rest' || clean === 'rest api' || clean === 'api development') return 'api';
        if (clean === 'qa' || clean === 'testing' || clean === 'qa testing') return 'qa automation';
        return clean;
    };

    const matchesEquivalent = (devS, reqS) => {
        if (devS === reqS) return true;
        const normDev = normalizeSkill(devS);
        const normReq = normalizeSkill(reqS);
        if (normDev === normReq) return true;
        if ((normDev === 'sql' || devS === 'sql') && (normReq === 'sql' || reqS === 'database')) return true;
        return false;
    };

    let matched = 0;
    for (const req of reqList) {
        if (devSkillList.some(devS => matchesEquivalent(devS, req))) {
            matched++;
        }
    }

    return (matched / reqList.length) * 100;
}

function normalizeDomainString(d) {
    if (!d) return 'backend';
    if (Array.isArray(d)) {
        d = d.join(' ');
    }
    const s = String(d).toLowerCase().trim();
    if (s.includes('qa') || s.includes('testing')) return 'qa';
    if (s.includes('front') || s.includes('ui') || s.includes('ux') || s.includes('view') || s.includes('display')) return 'frontend';
    if (s.includes('devops') || s.includes('docker') || s.includes('cloud') || s.includes('infrastructure')) return 'devops';
    if (s.includes('ai') || s.includes('ml') || s.includes('machine learning')) return 'ai';
    if (s.includes('back') || s.includes('database') || s.includes('sql') || s.includes('api') || s.includes('integration') || s.includes('report') || s.includes('analytics') || s.includes('asset') || s.includes('equipment') || s.includes('labour') || s.includes('labor') || s.includes('cost') || s.includes('overtime')) {
        return 'backend';
    }
    return s;
}

function allocateTasks(tasks, developers, currentProjectId) {
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) return [];
    if (!developers || !Array.isArray(developers) || developers.length === 0) return [];

    // STEP 1 — Process work items by priority (CRITICAL → HIGH → MEDIUM → LOW)
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

    // Preserve relative order for items with same priority
    const tasksWithIndex = tasks.map((task, idx) => ({ task, idx }));
    tasksWithIndex.sort((a, b) => {
        const pA = priorityOrder[(a.task.priority || 'MEDIUM').toUpperCase()] ?? 2;
        const pB = priorityOrder[(b.task.priority || 'MEDIUM').toUpperCase()] ?? 2;
        if (pA !== pB) return pA - pB;
        return a.idx - b.idx;
    });
    const sortedTasks = tasksWithIndex.map(item => item.task);

    // Initialize developer capacity tracking using existing cross-project load logic
    let devs = developers.map(dev => {
        const capacity = (dev.capacity_hours !== undefined && dev.capacity_hours !== null && !isNaN(Number(dev.capacity_hours))) ? Number(dev.capacity_hours) : 40;
        const commitments = dev.project_commitments || [];
        const otherProjectHours = commitments
            .filter(c => currentProjectId && String(c.project_id) !== String(currentProjectId))
            .reduce((sum, c) => sum + (Number(c.hours) || 0), 0);

        const availableCap = Math.max(0, capacity - otherProjectHours);

        return {
            ...dev,
            capacity_hours: capacity,
            other_project_hours: otherProjectHours,
            remaining: availableCap,
            primary_domain: normalizeDomainString(dev.primary_domain || dev.domain),
            languages: dev.languages || dev.skills || []
        };
    });

    const assignments = [];

    for (const task of sortedTasks) {
        const estHours = Number(task.estimated_hours) || (Number(task.story_points) ? Number(task.story_points) * 6 : 16);
        const taskDomainNorm = normalizeDomainString(task.required_domain || task.domain);
        const requiredSkills = task.required_skills || task.skills || [];

        // ML Complexity Prediction (HIGH / MEDIUM / LOW)
        let rawComplexity = task.predicted_complexity || task.complexity;
        if (!rawComplexity) {
            const sp = Number(task.story_points) || 0;
            const hrs = Number(task.estimated_hours) || 0;
            if (sp >= 8 || hrs >= 12) rawComplexity = 'HIGH';
            else if (sp >= 5 || hrs >= 8) rawComplexity = 'MEDIUM';
            else rawComplexity = 'LOW';
        }
        const predictedComplexity = String(rawComplexity).toUpperCase();

        // STEP 2 — Filter Developers by Remaining Capacity: Exclude developers with remaining <= 0
        const availableDevs = devs.filter(dev => dev.remaining > 0);

        if (availableDevs.length === 0) {
            continue; // Cannot assign work to a developer who has no available capacity
        }

        // STEP 3, 4, 5 — Evaluate Candidates
        const evaluatedCandidates = availableDevs.map(dev => {
            const devDomainNorm = normalizeDomainString(dev.primary_domain);
            
            // Step 3 — Compare Domains: Exact domain match (higher ranking) vs no match (lower ranking)
            const exactDomainMatch = devDomainNorm === taskDomainNorm;

            // Step 4 — Calculate Required Skill-Match Percentage
            const skillMatchPct = calculateSkillMatchPercentage(dev.languages, requiredSkills);

            // Step 5 — Complexity & Seniority Suitability
            const senioritySuitability = calculateComplexitySenioritySuitability(predictedComplexity, dev.role);

            return {
                ...dev,
                exactDomainMatch,
                skillMatchPct,
                senioritySuitability
            };
        });

        // STEP 6 — Rank All Eligible Developers
        // Order of ranking:
        // 1. Exact domain match first
        // 2. Higher skill-match percentage first
        // 3. Better complexity/seniority suitability first
        // 4. Higher remaining capacity first
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
            if (b.remaining !== a.remaining) {
                return b.remaining - a.remaining;
            }
            return String(a.id).localeCompare(String(b.id));
        });

        const chosen = evaluatedCandidates[0];

        // STEP 7 — Allocate Hours and Update Capacity
        const allocHours = Math.min(estHours, chosen.remaining);

        if (allocHours <= 0) {
            continue;
        }

        // Immediately update developer remaining capacity
        const masterDev = devs.find(d => d.id === chosen.id);
        if (masterDev) {
            masterDev.remaining -= allocHours;
        }
        chosen.remaining -= allocHours;

        const maxSuitability = predictedComplexity === 'HIGH' ? 3 : 2;
        const suitabilityScore = Math.round((chosen.senioritySuitability / maxSuitability) * 100);

        assignments.push({
            story_id: task.story_id || task.id || task.taskId,
            taskId: task.story_id || task.id || task.taskId,
            title: task.title || task.user_story || 'User Story Requirement',
            developer_id: chosen.id,
            developerId: chosen.id,
            developer_name: chosen.name,
            allocated_hours: allocHours,
            allocatedHours: allocHours,
            predicted_complexity: predictedComplexity,
            matched_domain: taskDomainNorm,
            skill_match_score: Math.round(chosen.skillMatchPct),
            complexity_suitability_score: suitabilityScore,
            composite_allocation_score: Math.round(chosen.skillMatchPct)
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

        // Normalize task data types and fallback fields
        const normalizedTasks = tasks.map(t => {
            let reqSkills = t.required_skills || t.skills || [];
            if (typeof reqSkills === 'string') {
                reqSkills = reqSkills.replace(/^\{|\}$/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
            }
            return {
                ...t,
                story_id: t.story_id || t.work_item_id || t.id,
                title: t.title || t.parent_story_title || 'Work Item',
                estimated_hours: Number(t.estimated_hours) || (Number(t.story_points) ? Number(t.story_points) * 6 : 8),
                story_points: Number(t.story_points) || 1,
                required_domain: t.required_domain || t.domain || 'Backend',
                domain: t.domain || t.required_domain || 'Backend',
                required_skills: reqSkills,
                predicted_complexity: (t.predicted_complexity || t.complexity || 'MEDIUM').toUpperCase(),
                priority: t.priority || 'MEDIUM'
            };
        });

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

        const assignments = allocateTasks(normalizedTasks, devListWithCommitments, project_id);

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
                        work_item_id, story_id, parent_story_title, project_id, title, description, domain, required_domain, required_skills, estimated_hours, story_points, predicted_complexity, priority, priority_score, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (work_item_id) DO UPDATE SET
                        parent_story_title = EXCLUDED.parent_story_title,
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        domain = EXCLUDED.domain,
                        required_domain = EXCLUDED.required_domain,
                        required_skills = EXCLUDED.required_skills,
                        estimated_hours = EXCLUDED.estimated_hours,
                        story_points = EXCLUDED.story_points,
                        predicted_complexity = EXCLUDED.predicted_complexity,
                        priority = EXCLUDED.priority,
                        priority_score = EXCLUDED.priority_score,
                        status = EXCLUDED.status`,
                    [
                        item.work_item_id,
                        item.story_id || storyId,
                        item.parent_story_title || parentTitle,
                        item.project_id || req.body.project_id || 'P00001',
                        item.title,
                        item.description,
                        item.domain,
                        item.required_domain || item.domain,
                        item.required_skills || [],
                        item.estimated_hours || 8,
                        item.story_points || 1,
                        item.predicted_complexity || 'MEDIUM',
                        item.priority || storyData.priority || 'Medium',
                        item.priority_score || 50,
                        item.status || 'To Do'
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
                            work_item_id, story_id, parent_story_title, project_id, title, description, domain, required_domain, required_skills, estimated_hours, story_points, predicted_complexity, priority, priority_score, status
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                        ON CONFLICT (work_item_id) DO UPDATE SET
                            parent_story_title = EXCLUDED.parent_story_title,
                            title = EXCLUDED.title,
                            description = EXCLUDED.description,
                            domain = EXCLUDED.domain,
                            required_domain = EXCLUDED.required_domain,
                            required_skills = EXCLUDED.required_skills,
                            estimated_hours = EXCLUDED.estimated_hours,
                            story_points = EXCLUDED.story_points,
                            predicted_complexity = EXCLUDED.predicted_complexity,
                            priority = EXCLUDED.priority,
                            priority_score = EXCLUDED.priority_score,
                            status = EXCLUDED.status`,
                        [
                            item.work_item_id,
                            item.story_id || story.story_id || story.id,
                            item.parent_story_title || parentTitle,
                            project_id,
                            item.title,
                            item.description,
                            item.domain,
                            item.required_domain || item.domain,
                            item.required_skills || [],
                            item.estimated_hours || 8,
                            item.story_points || 1,
                            item.predicted_complexity || 'MEDIUM',
                            item.priority || story.priority || 'Medium',
                            item.priority_score || 50,
                            item.status || 'To Do'
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
        const { story_id, project_id, status, work_item_type, sprint_id } = req.query;
        let query = `
            SELECT 
                w.*,
                COALESCE(w.required_domain, w.domain, 'Backend') as required_domain,
                COALESCE(w.domain, w.required_domain, 'Backend') as domain,
                COALESCE(w.predicted_complexity, 'MEDIUM') as predicted_complexity,
                COALESCE(w.priority, 'Medium') as priority,
                COALESCE(w.priority_score, 50) as priority_score,
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
        if (project_id && project_id !== 'ALL') {
            params.push(project_id);
            query += ` AND (w.project_id = $${params.length} OR w.project_id = 'P00001' OR w.project_id = 'research')`;
        }
        if (sprint_id) {
            params.push(sprint_id);
            query += ` AND w.sprint_id = $${params.length}`;
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
        const rows = (result.rows || []).map(row => {
            let skills = row.required_skills || [];
            if (typeof skills === 'string') {
                skills = skills.replace(/^\{|\}$/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
            }
            return {
                ...row,
                required_skills: Array.isArray(skills) ? skills : [],
                estimated_hours: Number(row.estimated_hours) || 8,
                story_points: Number(row.story_points) || 1,
                priority_score: Number(row.priority_score) || 50,
                predicted_complexity: (row.predicted_complexity || 'MEDIUM').toUpperCase()
            };
        });
        res.json(rows);
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
                work_item_id, story_id, parent_story_title, requirement_sentence, epic, feature, project_id, title, description, domain, required_domain, work_item_type, priority, priority_score, required_skills, estimated_hours, story_points, predicted_complexity, status, assigned_to, start_date, end_date, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP)
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
                required_domain = EXCLUDED.required_domain,
                work_item_type = EXCLUDED.work_item_type,
                priority = EXCLUDED.priority,
                priority_score = EXCLUDED.priority_score,
                required_skills = EXCLUDED.required_skills,
                estimated_hours = EXCLUDED.estimated_hours,
                story_points = EXCLUDED.story_points,
                predicted_complexity = EXCLUDED.predicted_complexity,
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
                item.domain || item.required_domain || 'Backend',
                item.required_domain || item.domain || 'Backend',
                item.work_item_type || item.domain || 'Development',
                item.priority || 'Medium',
                Number(item.priority_score) || 50,
                Array.isArray(item.required_skills) ? item.required_skills : (item.required_skills ? String(item.required_skills).split(',') : []),
                Number(item.estimated_hours || item.estimated_effort) || 8,
                Number(item.story_points) || 1,
                (item.predicted_complexity || item.complexity || 'MEDIUM').toUpperCase(),
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

        const parentTitle = storyData.title || storyData.user_story || storyData.requirement_sentence || '';
        const result = await decompositionEngine.decomposeUserStory({
            story_id: storyId,
            ...storyData
        });

        if (result.work_items && result.work_items.length > 0) {
            const cleanSid = String(storyId).replace(/[^a-zA-Z0-9]/g, '');
            if (cleanSid) {
                await pool.query(
                    `DELETE FROM work_items WHERE REGEXP_REPLACE(story_id, '[^a-zA-Z0-9]', '', 'g') = $1 AND status != 'approved'`,
                    [cleanSid]
                );
            }
            for (const item of result.work_items) {
                await pool.query(
                    `INSERT INTO work_items (
                        work_item_id, story_id, parent_story_title, project_id, title, description, domain, required_domain, required_skills, estimated_hours, story_points, predicted_complexity, priority, priority_score, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (work_item_id) DO UPDATE SET
                        parent_story_title = EXCLUDED.parent_story_title,
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        domain = EXCLUDED.domain,
                        required_domain = EXCLUDED.required_domain,
                        required_skills = EXCLUDED.required_skills,
                        estimated_hours = EXCLUDED.estimated_hours,
                        story_points = EXCLUDED.story_points,
                        predicted_complexity = EXCLUDED.predicted_complexity,
                        priority = EXCLUDED.priority,
                        priority_score = EXCLUDED.priority_score,
                        status = EXCLUDED.status`,
                    [
                        item.work_item_id,
                        item.story_id || storyId,
                        item.parent_story_title || parentTitle,
                        item.project_id || req.body.project_id || 'P00001',
                        item.title,
                        item.description,
                        item.domain,
                        item.required_domain || item.domain,
                        item.required_skills || [],
                        item.estimated_hours || 8,
                        item.story_points || 1,
                        item.predicted_complexity || 'MEDIUM',
                        item.priority || storyData.priority || 'Medium',
                        item.priority_score || 50,
                        item.status || 'To Do'
                    ]
                );
            }
        }

        res.json({ success: true, work_items: result.work_items || [] });
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

    const decomp = await decompositionEngine.decomposeUserStory(story);
    if (decomp && decomp.work_items && decomp.work_items.length > 0) {
        for (const item of decomp.work_items) {
            try {
                await pool.query(
                    `INSERT INTO work_items (
                        work_item_id, story_id, parent_story_title, project_id, title, description, domain, required_domain, required_skills, estimated_hours, story_points, predicted_complexity, priority, priority_score, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (work_item_id) DO UPDATE SET
                        parent_story_title = EXCLUDED.parent_story_title,
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        domain = EXCLUDED.domain,
                        required_domain = EXCLUDED.required_domain,
                        required_skills = EXCLUDED.required_skills,
                        estimated_hours = EXCLUDED.estimated_hours,
                        story_points = EXCLUDED.story_points,
                        predicted_complexity = EXCLUDED.predicted_complexity,
                        priority = EXCLUDED.priority,
                        priority_score = EXCLUDED.priority_score,
                        status = EXCLUDED.status`,
                    [
                        item.work_item_id,
                        item.story_id || storyId,
                        item.parent_story_title || story.title || 'User Story',
                        story.project_id || 'P00001',
                        item.title,
                        item.description,
                        item.domain,
                        item.required_domain || item.domain,
                        item.required_skills || [],
                        item.estimated_hours || 8,
                        item.story_points || 1,
                        item.predicted_complexity || 'MEDIUM',
                        item.priority || story.priority || 'Medium',
                        item.priority_score || 50,
                        item.status || 'To Do'
                    ]
                );
            } catch (err) {}
        }
        return decomp.work_items;
    }
    return buildWorkItemsForStory(story);
}

// REST ENDPOINTS FOR WORK ITEMS

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
        let query = `
            SELECT 
                u.*,
                COALESCE(u.epic, r.epic, 'General Epic') as epic,
                COALESCE(u.feature, r.feature, 'General Feature') as feature
            FROM user_stories u
            LEFT JOIN requirements r ON (u.story_id = 'US-' || r.id OR u.user_story_id = 'US-' || r.id OR u.story_id = r.id::text OR u.title = r.user_story OR u.title = r.requirement_sentence)
            ORDER BY u.requirement_order ASC, u.story_id ASC
        `;
        let params = [];

        if (project_id && project_id !== 'ALL') {
            query = `
                SELECT 
                    u.*,
                    COALESCE(u.epic, r.epic, 'General Epic') as epic,
                    COALESCE(u.feature, r.feature, 'General Feature') as feature
                FROM user_stories u
                LEFT JOIN requirements r ON (u.story_id = 'US-' || r.id OR u.user_story_id = 'US-' || r.id OR u.story_id = r.id::text OR u.title = r.user_story OR u.title = r.requirement_sentence)
                WHERE LOWER(u.project_id) = LOWER($1) OR LOWER($1) LIKE '%' || LOWER(u.project_id) || '%' OR LOWER(u.project_id) LIKE '%' || LOWER($1) || '%'
                ORDER BY u.requirement_order ASC, u.story_id ASC
            `;
            params = [project_id];
        }

        const result = await pool.query(query, params);
        let rows = result.rows || [];

        // Fallback: If no stories matched the project filter, return all user stories
        if (rows.length === 0 && project_id) {
            const allRes = await pool.query(`
                SELECT 
                    u.*,
                    COALESCE(u.epic, r.epic, 'General Epic') as epic,
                    COALESCE(u.feature, r.feature, 'General Feature') as feature
                FROM user_stories u
                LEFT JOIN requirements r ON (u.story_id = 'US-' || r.id OR u.user_story_id = 'US-' || r.id OR u.story_id = r.id::text OR u.title = r.user_story OR u.title = r.requirement_sentence)
                ORDER BY u.requirement_order ASC, u.story_id ASC
            `);
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
            epic: r.epic || 'General Epic',
            feature: r.feature || 'General Feature',
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

// Clear all project management data (user_stories, work_items, allocations)
app.delete('/api/project-management/clear', async (req, res) => {
    try {
        await pool.query('DELETE FROM user_stories');
        await pool.query('DELETE FROM work_items');
        await pool.query('DELETE FROM allocations');
        await pool.query('DELETE FROM resource_allocations');
        res.json({ success: true, message: 'All project management sample data cleared successfully.' });
    } catch (err) {
        console.error('Error clearing project management data:', err);
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

let server;
if (require.main === module) {
    // Start Express server immediately so port 3000 is accessible without delay
    server = app.listen(PORT, () => {
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
}

// Process resilience handlers for Neon serverless PostgreSQL connection resets
process.on('uncaughtException', (err) => {
    console.warn('⚠️ Process Notice (uncaughtException):', err.message || err);
});

process.on('unhandledRejection', (reason) => {
    console.warn('⚠️ Process Notice (unhandledRejection):', reason?.message || reason);
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        app,
        allocateTasks,
        calculateSkillMatchPercentage,
        calculateComplexitySenioritySuitability,
        getSeniorityRank,
        normalizeDomainString
    };
}





