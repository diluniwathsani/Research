import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import {
  Users, Cpu, Clock, CheckCircle2, AlertCircle, RefreshCw, Save,
  Tag, Target, BarChart2, Info, Layers, Code, Shield, Sparkles,
  Database, ChevronDown, ChevronRight, Zap
} from 'lucide-react';
import ProjectSelection from './ProjectSelection.jsx';
import ManageTeamModal from './ManageTeamModal.jsx';
import AllocationResults from './AllocationResults.jsx';

// API Configuration
const EXPRESS_API = 'http://localhost:3000/api';
const PROJECT_ENGINE_API = 'http://localhost:8082/api';

// ══════════════════════════════════════════════════════════════
// Keyword Method: Identifies Domain and Required Skills
// dynamically from sub-task title
// ══════════════════════════════════════════════════════════════
function extractDomainAndSkills(titleOrText) {
  const text = (titleOrText || '').toLowerCase();

  // 1. Explicit AI / Machine Learning Keywords
  if (/\b(machine learning|nlp|spacy|scikit|svm|deep learning|neural network|tensorflow|pytorch|classifier|ai service|ml model|training dataset)\b/i.test(text) || (/\b(ml|ai)\b/i.test(text) && !text.includes('email') && !text.includes('detail') && !text.includes('main'))) {
    let skills = ['Python', 'ML'];
    if (text.includes('nlp') || text.includes('spacy')) skills.push('NLP');
    if (text.includes('svm') || text.includes('scikit')) skills.push('Scikit-Learn');
    return { domain: 'ai', required_domain: 'ai', skills, required_skills: skills };
  }

  // 2. Explicit Frontend UI / UX / Form / Entry Keywords
  if (/\b(enter|input|form|ui|ux|frontend|react|dashboard|dark mode|css|tailwind|export|pdf|excel|component|layout|view|display|screen|button|render)\b/i.test(text)) {
    let skills = ['JavaScript', 'React'];
    if (text.includes('dark mode') || text.includes('css') || text.includes('tailwind')) skills.push('Tailwind');
    if (text.includes('pdf') || text.includes('excel') || text.includes('export') || text.includes('print')) skills.push('jsPDF');
    if (text.includes('enter') || text.includes('input') || text.includes('form')) skills.push('HTML/CSS');
    return { domain: 'frontend', required_domain: 'frontend', skills, required_skills: skills };
  }

  // 3. QA / Testing / Automation Keywords
  if (/\b(test|qa|cypress|selenium|unit test|jest|audit check|verification|verify|validation|validate)\b/i.test(text)) {
    const skills = ['QA Automation', 'Cypress'];
    return { domain: 'qa', required_domain: 'qa', skills, required_skills: skills };
  }

  // 4. DevOps / Infrastructure Keywords
  if (/\b(devops|docker|kubernetes|aws|cloud|ci\/cd|pipeline|deploy|nginx|dockerfile)\b/i.test(text)) {
    const skills = ['Docker', 'DevOps'];
    return { domain: 'devops', required_domain: 'devops', skills, required_skills: skills };
  }

  // 5. Backend / API / Database / Workflow / Transactional Logic
  if (/\b(defect|repair|vessel|equipment|overtime|labor|labour|history|audit|version|status|approve|reject|permission|role|user|login|auth|database|sql|postgres|backend|api|server|crud|link|assign|cost|costing)\b/i.test(text)) {
    let skills = ['JavaScript', 'SQL'];
    if (text.includes('login') || text.includes('auth') || text.includes('permission') || text.includes('role')) skills.push('OAuth');
    if (text.includes('database') || text.includes('sql') || text.includes('postgres') || text.includes('history') || text.includes('audit') || text.includes('version')) skills.push('PostgreSQL');
    if (text.includes('api') || text.includes('backend') || text.includes('defect') || text.includes('repair') || text.includes('approve') || text.includes('reject')) skills.push('Node.js');
    return { domain: 'backend', required_domain: 'backend', skills, required_skills: skills };
  }

  // 6. Dynamic Fallback: Default Core System Development
  const defaultSkills = ['JavaScript', 'SQL', 'Node.js'];
  return { domain: 'backend', required_domain: 'backend', skills: defaultSkills, required_skills: defaultSkills };
}

// ══════════════════════════════════════════════════════════════
// Format Sub-Task Title: Converts raw User Story into actionable
// technical deliverable title (e.g. "To implement Core Business API & Database Logic for...")
// ══════════════════════════════════════════════════════════════
export function formatSubTaskTitle(rawTitle, domainHint) {
  if (!rawTitle) return '';
  let str = String(rawTitle).trim();

  // If already formatted as a technical deliverable subtask, preserve it
  if (/^To (implement|build|conduct|configure|develop|integrate)\b/i.test(str) && !/As a\s+/i.test(str)) {
    return str;
  }

  // Extract core action: strip "As a ..., I want to", "The system shall...", etc.
  let clean = str.replace(/\[Part\s*\d+[^\]]*\]/gi, '').trim();
  clean = clean.replace(/^(?:as\s+(?:an?|the)\s+[^,]+,\s*)?i\s+want\s+(?:to\s+)?/i, '').trim();
  clean = clean.replace(/^the\s+system\s+(?:shall|should|must)\s+(?:allow\s+[^,]+\s+to\s+)?/i, '').trim();
  clean = clean.replace(/^the\s+system\s+(?:shall|should|must)\s+/i, '').trim();
  clean = clean.replace(/^to\s+/i, '').trim();

  // Split off trailing rationale ("so that...", "in order to...")
  const coreAction = clean.split(/\s+so\s+that\s+|\s+in\s+order\s+to\s+/i)[0].trim();
  const capAction = coreAction ? (coreAction.charAt(0).toUpperCase() + coreAction.slice(1)) : 'Core Capability';

  const lower = str.toLowerCase();
  const d = (domainHint || '').toLowerCase();

  // 1. Explicit Frontend keywords
  if (d.includes('front') || /\b(view|display|ui|ux|frontend|react|screen|dashboard|form|input|button|render|dark mode|export|pdf|excel)\b/i.test(lower)) {
    return `To build Frontend UI View, Input Validation & Testing for ${capAction}`;
  }

  // 2. QA / Testing
  if (d.includes('qa') || /\b(test|qa|cypress|selenium|jest|unit test|audit check|verification|verify|validation|validate)\b/i.test(lower)) {
    return `To conduct Security, Edge Case Testing & QA Verification for ${capAction}`;
  }

  // 3. DevOps
  if (d.includes('devops') || /\b(devops|docker|kubernetes|aws|cloud|ci\/cd|pipeline|deploy|nginx)\b/i.test(lower)) {
    return `To configure DevOps Pipeline, Docker & Infrastructure for ${capAction}`;
  }

  // 4. AI / ML
  if (d.includes('ai') || /\b(machine learning|ml|ai|nlp|spacy|scikit|svm|deep learning|neural network|tensorflow|pytorch)\b/i.test(lower)) {
    return `To develop Machine Learning Model & AI Inference Service for ${capAction}`;
  }

  // 5. Default: Core Business API & Database Logic
  return `To implement Core Business API & Database Logic for ${capAction}`;
}

// ══════════════════════════════════════════════════════════════
// Helper: styling functions
// ══════════════════════════════════════════════════════════════
const priorityStyle = (p) => {
  const v = (p || 'MEDIUM').toUpperCase();
  if (v === 'CRITICAL') return 'bg-red-500/15 text-red-500 border-red-500/30';
  if (v === 'HIGH')     return 'bg-orange-500/15 text-orange-500 border-orange-500/30';
  if (v === 'MEDIUM')   return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
  return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
};

const domainStyle = (d) => {
  const v = (d || 'backend').toLowerCase();
  if (v.includes('front'))  return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
  if (v.includes('ai') || v.includes('ml')) return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
  if (v.includes('qa'))     return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
  if (v.includes('devops')) return 'bg-teal-500/15 text-teal-400 border-teal-500/30';
  return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
};

const domainIcon = (d) => {
  const v = (d || '').toLowerCase();
  if (v.includes('front'))  return <Code size={11} />;
  if (v.includes('ai'))     return <Sparkles size={11} />;
  if (v.includes('qa'))     return <Shield size={11} />;
  if (v.includes('devops')) return <Cpu size={11} />;
  return <Database size={11} />;
};

// ══════════════════════════════════════════════════════════════
// Allocation logic helpers (mirrors backend server.js)
// ══════════════════════════════════════════════════════════════
function normDomain(d) {
  const s = (Array.isArray(d) ? d.join(' ') : String(d || '')).toLowerCase();
  if (s.includes('front'))  return 'frontend';
  if (s.includes('qa') || s.includes('test')) return 'qa';
  if (s.includes('devops')) return 'devops';
  if (s.includes('ai') || s.includes('ml')) return 'ai';
  return 'backend';
}

function getSeniorityRank(role) {
  const r = (role || '').toLowerCase();
  if (r.includes('senior') || r.includes('lead') || r.includes('principal') || r.includes('architect')) return 'SENIOR';
  if (r.includes('junior') || r.includes('intern') || r.includes('associate')) return 'JUNIOR';
  return 'MID';
}

function calcSenioritySuitability(complexity, role) {
  const seniority = getSeniorityRank(role);
  const c = (complexity || 'MEDIUM').toUpperCase();
  if (c === 'HIGH')   return seniority === 'SENIOR' ? 3 : seniority === 'MID' ? 2 : 1;
  if (c === 'LOW')    return seniority === 'JUNIOR' || seniority === 'MID' ? 2 : 1;
  return seniority === 'MID' || seniority === 'SENIOR' ? 2 : 1;
}

function calcSkillMatch(devSkills, requiredSkills) {
  const req = (requiredSkills || []).map(s => s.trim().toLowerCase());
  if (req.length === 0) return 100;
  const devList = Array.isArray(devSkills)
    ? devSkills.map(s => s.trim().toLowerCase())
    : (typeof devSkills === 'string' ? devSkills.split(',').map(s => s.trim().toLowerCase()) : []);
  if (devList.length === 0) return 0;
  const matched = req.filter(r => devList.includes(r)).length;
  return Math.round((matched / req.length) * 100);
}

// ══════════════════════════════════════════════════════════════
// MAIN MODULE COMPONENT
// ══════════════════════════════════════════════════════════════
export default function ResourceManagementModule({
  requirements = [],
  projects: parentProjects = [],
  selectedProjectId: parentSelectedProjectId = '',
  onSelectProject
}) {
  // ── State ──
  const [localProjects, setLocalProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [allSprintPlanTasks, setAllSprintPlanTasks] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isManageTeamOpen, setIsManageTeamOpen] = useState(false);

  // Phase: 'subtasks' = show sub-tasks table | 'results' = show allocation results
  const [phase, setPhase] = useState('subtasks');
  const [allocations, setAllocations] = useState([]);
  const [savedOk, setSavedOk] = useState(false);
  // resultsView: 'table' (default detailed table) | 'board' (drag-and-drop Kanban board)
  const [resultsView, setResultsView] = useState('board');

  // ══════════════════════════════════════════════════════════
  // 1. DYNAMIC PROJECTS LIST
  // ══════════════════════════════════════════════════════════
  const unifiedProjects = useMemo(() => {
    const list = [];
    const seenNames = new Set();

    const cleanTitle = (raw) => {
      const str = (raw || '').trim();
      if (!str || str.toLowerCase() === 'untitled' || str.toLowerCase() === 'untitled batch') return '';
      return str;
    };

    const dbProjects = parentProjects.length > 0 ? parentProjects : localProjects;
    dbProjects.forEach((p, idx) => {
      const pName = cleanTitle(p.project_name || p.name);
      const pId = String(p.project_id || p.id || `P0000${idx + 1}`);
      if (pName && !seenNames.has(pName)) {
        seenNames.add(pName);
        list.push({ ...p, id: pId, project_id: pId, project_name: pName, name: pName, source: 'database' });
      }
    });

    if (list.length === 0) {
      list.push({ id: 'P00001', project_id: 'P00001', project_name: 'Enterprise Core Platform', name: 'Enterprise Core Platform' });
    }
    return list;
  }, [requirements, parentProjects, localProjects]);

  // Sync selectedProject
  useEffect(() => {
    if (unifiedProjects.length > 0) {
      setSelectedProject(prev => {
        if (prev) {
          const match = unifiedProjects.find(p => String(p.id) === String(prev.id));
          if (match) return match;
        }
        if (parentSelectedProjectId) {
          const match = unifiedProjects.find(p => String(p.id) === String(parentSelectedProjectId) || String(p.project_id) === String(parentSelectedProjectId));
          if (match) return match;
        }
        return unifiedProjects[0];
      });
    }
  }, [unifiedProjects, parentSelectedProjectId]);

  const handleSelectProject = (proj) => {
    if (!proj) return;
    setSelectedProject(proj);
    if (onSelectProject) onSelectProject(proj.project_id || proj.id);
    setPhase('subtasks');
    setAllocations([]);
    setSavedOk(false);
  };

  // ══════════════════════════════════════════════════════════
  // 2. LOAD DB PROJECTS FALLBACK
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    if (parentProjects.length === 0) {
      axios.get(`${EXPRESS_API}/projects`)
        .then(res => setLocalProjects(Array.isArray(res.data) ? res.data : (res.data?.data || [])))
        .catch(() => {});
    }
  }, [parentProjects]);

  // ══════════════════════════════════════════════════════════
  // 3. LOAD DEVELOPERS
  // ══════════════════════════════════════════════════════════
  const loadDevelopers = useCallback(async () => {
    try {
      const pid = selectedProject?.project_id || selectedProject?.id || '';
      const url = pid ? `${EXPRESS_API}/developers?project_id=${pid}` : `${EXPRESS_API}/developers`;
      const res = await axios.get(url);
      setDevelopers(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (_) {}
  }, [selectedProject]);

  useEffect(() => { loadDevelopers(); }, [loadDevelopers]);

  // ══════════════════════════════════════════════════════════
  // 4. FETCH SPRINT PLAN FROM PROJECT MODULE
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);
    setPhase('subtasks');
    setAllocations([]);
    setSavedOk(false);

    const loadPlan = async () => {
      try {
        const projId = selectedProject?.project_id || selectedProject?.id || '';
        let planTasks = [];
        let planSprints = [];

        // 1. Fetch real project sprints from Express API
        if (projId) {
          try {
            const spRes = await axios.get(`${EXPRESS_API}/projects/${projId}/sprints`);
            if (spRes.data?.data && Array.isArray(spRes.data.data) && spRes.data.data.length > 0) {
              planSprints = spRes.data.data;
            }
          } catch (_) {}
        }

        // 2. Fallback: Gantt for sprint dates or Flask API
        if (planSprints.length === 0) {
          try {
            const g = await axios.get(`${PROJECT_ENGINE_API}/timeline/gantt`, { timeout: 5000 });
            planSprints = g?.data?.sprints || [];
          } catch (_) {}
        }

        // 3. Try Flask API then Express for sprint-plan
        for (const ep of [`${PROJECT_ENGINE_API}/sprint-plan`, `${EXPRESS_API}/sprint-plan`]) {
          try {
            const r = await axios.get(ep, { timeout: 5000 });
            if (r?.data?.tasks?.length > 0) { planTasks = r.data.tasks; break; }
          } catch (_) {}
        }

        // Build sprint list
        let sprintList = [];
        if (planSprints.length > 0 && planSprints[0].sprint_id) {
          sprintList = planSprints.map(s => ({
            id: s.sprint_id,
            sprint_id: s.sprint_id,
            sprint_number: Number(s.sprint_number) || 1,
            name: s.sprint_name || `Sprint ${s.sprint_number}`,
            sprint_name: s.start_date && s.end_date ? `${s.sprint_name || `Sprint ${s.sprint_number}`} (${s.start_date} → ${s.end_date})` : (s.sprint_name || `Sprint ${s.sprint_number}`),
            start_date: s.start_date || null,
            end_date: s.end_date || null,
            working_days: s.working_days || 10,
            story_points: Number(s.committed_story_points) || Number(s.capacity_story_points) || 30
          }));
        }

        // If sprintList still empty, build from tasks
        if (sprintList.length === 0 && planTasks.length > 0) {
          const sprintNums = new Set(planTasks.map(t => Number(t.sprint_number)).filter(n => n > 0));
          if (sprintNums.size === 0) sprintNums.add(1);
          sprintList = Array.from(sprintNums).sort((a, b) => a - b).map(sNum => ({
            id: `SPR-0${sNum}`,
            sprint_id: `SPR-0${sNum}`,
            sprint_number: sNum,
            name: `Sprint ${sNum}`,
            sprint_name: `Sprint ${sNum}`,
            start_date: null,
            end_date: null,
            working_days: 10,
            story_points: 30
          }));
        }

        // Fallback default sprint
        if (sprintList.length === 0) {
          sprintList = [{
            id: 'SPR-01',
            sprint_id: 'SPR-01',
            sprint_number: 1,
            name: 'Sprint 1',
            sprint_name: 'Sprint 1',
            working_days: 10,
            story_points: 30
          }];
        }

        setSprints(sprintList);
        const initialSprint = sprintList[0];
        setSelectedSprint(initialSprint);

        // Fetch tasks for the initial sprint
        const sprintId = initialSprint.sprint_id || `SPR-0${initialSprint.sprint_number}`;
        try {
          const tRes = await axios.get(`${EXPRESS_API}/sprints/${sprintId}/tasks?project_id=${projId}`);
          if (Array.isArray(tRes.data) && tRes.data.length > 0) {
            planTasks = tRes.data;
          }
        } catch (_) {}

        // Fallback: user stories from DB if still empty
        if (planTasks.length === 0) {
          try {
            const r = await axios.get(`${EXPRESS_API}/user-stories`);
            const raw = Array.isArray(r.data) ? r.data : (r.data?.data || []);
            planTasks = raw.map((s, i) => ({
              story_id: s.story_id || `US00${i + 1}`,
              title: s.title || s.user_story || 'User Story',
              sprint_number: 1,
              story_points: Number(s.story_points) || 5,
              estimated_hours: (Number(s.story_points) || 5) * 6,
              priority: (s.priority || 'MEDIUM').toUpperCase(),
              sub_tasks: []
            }));
          } catch (_) {}
        }

        // Normalize tasks + enrich with domain/skills
        const normalized = planTasks.map((t, idx) => {
          const rawTitle = t.title || t.user_story || 'User Story';
          const title = formatSubTaskTitle(rawTitle, t.domain || t.required_domain);
          const detected = extractDomainAndSkills(title);
          const points = Number(t.story_points) || Number(t.points) || 5;
          const hours = Number(t.estimated_hours) || Number(t.hours) || (points * 6);

          const rawSubTasks = Array.isArray(t.sub_tasks) ? t.sub_tasks : [];
          const normalizedSubTasks = rawSubTasks.map((sub, sIdx) => {
            const rawSubTitle = sub.title || `Subtask ${sIdx + 1}`;
            const subTitle = formatSubTaskTitle(rawSubTitle, sub.domain || sub.required_domain || t.domain);
            const subDetected = extractDomainAndSkills(subTitle);
            const subPts = Number(sub.story_points) || Number(sub.points) || 1;
            const subHrs = Number(sub.estimated_hours) || Number(sub.hours) || (subPts * 6);
            return {
              ...sub,
              id: sub.id || sub.story_id || `${t.story_id || t.id}.${sIdx + 1}`,
              story_id: sub.story_id || sub.id || `${t.story_id || t.id}.${sIdx + 1}`,
              parent_id: t.story_id || t.id,
              parent_title: title,
              title: subTitle,
              description: sub.description || '',
              story_points: subPts,
              estimated_hours: subHrs,
              status: sub.status || t.status || 'To Do',
              priority: (sub.priority || sub.priority_tier || t.priority || 'MEDIUM').toUpperCase(),
              domain: subDetected.domain,
              required_domain: subDetected.required_domain,
              skills: subDetected.skills,
              required_skills: subDetected.required_skills,
              gherkin_criteria: sub.gherkin_criteria || '',
              start_date: sub.start_date || null,
              end_date: sub.end_date || null
            };
          });

          return {
            ...t,
            id: t.story_id || t.id || `US${idx + 1}`,
            story_id: t.story_id || t.id || `US${idx + 1}`,
            title,
            user_story: rawTitle,
            sprint_number: parseInt(t.sprint_number || initialSprint.sprint_number || 1, 10),
            story_points: points,
            estimated_hours: hours,
            priority: (t.priority || t.priority_tier || 'MEDIUM').toUpperCase(),
            domain: detected.domain,
            required_domain: detected.required_domain,
            skills: detected.skills,
            required_skills: detected.required_skills,
            sub_tasks: normalizedSubTasks,
            start_date: t.start_date || null,
            end_date: t.end_date || null
          };
        });

        setAllSprintPlanTasks(normalized);
      } catch (err) {
        console.error('Error loading sprint plan:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlan();

    const handleSprintsUpdated = () => loadPlan();
    window.addEventListener('sprints-updated', handleSprintsUpdated);
    return () => window.removeEventListener('sprints-updated', handleSprintsUpdated);
  }, [selectedProject]);

  // When selectedSprint changes, fetch tasks for that sprint
  useEffect(() => {
    if (!selectedProject || !selectedSprint) return;
    const projId = selectedProject.project_id || selectedProject.id || '';
    const sprintId = selectedSprint.sprint_id || selectedSprint.id || `SPR-0${selectedSprint.sprint_number}`;

    let isCancelled = false;
    axios.get(`${EXPRESS_API}/sprints/${sprintId}/tasks?project_id=${projId}`)
      .then(r => {
        if (isCancelled) return;
        if (Array.isArray(r.data) && r.data.length > 0) {
          const mapped = r.data.map((t, idx) => {
            const rawTitle = t.title || t.user_story || 'User Story Requirement';
            const title = formatSubTaskTitle(rawTitle, t.domain || t.required_domain);
            const detected = extractDomainAndSkills(title);
            const pts = Number(t.story_points) || Number(t.points) || 5;
            const hrs = Number(t.estimated_hours) || Number(t.hours) || (pts * 6);
            return {
              ...t,
              id: t.story_id || t.id || `US${idx + 1}`,
              story_id: t.story_id || t.id || `US${idx + 1}`,
              title,
              user_story: rawTitle,
              sprint_number: Number(selectedSprint.sprint_number) || 1,
              story_points: pts,
              estimated_hours: hrs,
              priority: (t.priority || 'MEDIUM').toUpperCase(),
              domain: detected.domain,
              required_domain: detected.required_domain,
              skills: detected.skills,
              required_skills: detected.required_skills,
              sub_tasks: t.sub_tasks || []
            };
          });
          setAllSprintPlanTasks(mapped);
        }
      })
      .catch(() => {});

    return () => { isCancelled = true; };
  }, [selectedProject, selectedSprint]);

  // ══════════════════════════════════════════════════════════
  // 4b. RESTORE SAVED ALLOCATIONS WHEN SPRINT CHANGES
  //     Uses GET /api/task-assignments as the authoritative source.
  //     If saved assignments exist for this sprint they are loaded
  //     directly into the board without re-running the algorithm.
  // ══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!selectedProject || !selectedSprint) return;
    const projId  = selectedProject.project_id || selectedProject.id || '';
    const sprintId = selectedSprint.sprint_id || selectedSprint.id || `SPR-0${selectedSprint.sprint_number}`;

    let cancelled = false;
    axios.get(`${EXPRESS_API}/task-assignments`, { params: { sprint_id: sprintId, project_id: projId } })
      .then(res => {
        if (cancelled) return;
        const saved = res.data?.assignments;
        if (Array.isArray(saved) && saved.length > 0) {
          // Merge with local developer data so all fields are present
          const enriched = saved.map(a => {
            const dev = developers.find(d => String(d.id) === String(a.developer_id));
            return {
              ...a,
              // Normalise domain-match flag
              domain_match: !!(a.developer_id && normDomain(a.developer_domain) === normDomain(a.required_domain)),
              // Derive skill / seniority metrics if not already present
              skill_match_pct: a.skill_match_score ?? calcSkillMatch(
                dev?.languages || dev?.skills || [],
                Array.isArray(a.required_skills) ? a.required_skills : []
              ),
              seniority_suitability_score: a.complexity_suitability_score ?? 0,
              seniority_rank: getSeniorityRank(a.developer_role || (dev?.role) || ''),
              developer_name: a.developer_id ? (a.developer_name || dev?.name || 'Assigned') : null,
              unassigned_reason: a.developer_id ? null : (a.unassigned_reason || 'Not assigned')
            };
          });
          setAllocations(enriched);
          setPhase('results');
        } else {
          // No saved allocations for this sprint — clear board and return to sub-tasks view
          setAllocations([]);
          setPhase('subtasks');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAllocations([]);
          setPhase('subtasks');
        }
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSprint]);


  // ══════════════════════════════════════════════════════════
  // 5. DERIVE SPRINT WORK ITEMS (sub-tasks)
  // ══════════════════════════════════════════════════════════
  const currentSprintNum = selectedSprint ? (Number(selectedSprint.sprint_number) || 1) : 1;

  const sprintStories = useMemo(() => {
    if (!allSprintPlanTasks.length) return [];
    const filtered = allSprintPlanTasks.filter(t => (Number(t.sprint_number) || 1) === currentSprintNum);
    return filtered.length > 0 ? filtered : allSprintPlanTasks;
  }, [allSprintPlanTasks, currentSprintNum]);

  // Flatten to atomic work items (sub-tasks) & Sort by Priority (CRITICAL -> HIGH -> MEDIUM -> LOW)
  const workItems = useMemo(() => {
    const rawItems = sprintStories.flatMap((story, si) => {
      const parentId = story.story_id || story.id || `US${si + 1}`;
      const rawParentTitle = story.title || story.user_story || 'User Story';
      const parentTitle = formatSubTaskTitle(rawParentTitle, story.domain || story.required_domain);

      if (Array.isArray(story.sub_tasks) && story.sub_tasks.length > 0) {
        return story.sub_tasks.map((sub, idx) => {
          const rawSubTitle = sub.title || `Subtask ${idx + 1}`;
          const subTitle = formatSubTaskTitle(rawSubTitle, sub.domain || sub.required_domain || story.domain);
          const detected = extractDomainAndSkills(subTitle);
          return {
            ...sub,
            id: sub.id || sub.story_id || `${parentId}.${idx + 1}`,
            story_id: sub.id || sub.story_id || `${parentId}.${idx + 1}`,
            parent_story_id: parentId,
            parent_story_title: parentTitle,
            title: subTitle,
            sprint_number: currentSprintNum,
            story_points: Number(sub.story_points) || 2,
            estimated_hours: Number(sub.estimated_hours) || 16,
            priority: (sub.priority || sub.priority_tier || story.priority || 'MEDIUM').toUpperCase(),
            domain: detected.domain,
            required_domain: detected.required_domain,
            skills: detected.skills,
            required_skills: detected.required_skills,
            status: sub.status || 'To Do',
            start_date: sub.start_date || null,
            end_date: sub.end_date || null
          };
        });
      }
      // If no sub-tasks, story itself is the work item formatted with sub-task deliverable title
      const subTitle = formatSubTaskTitle(story.title || story.user_story, story.domain || story.required_domain);
      const detected = extractDomainAndSkills(subTitle);
      return [{
        ...story,
        id: parentId,
        story_id: parentId,
        parent_story_id: parentId,
        parent_story_title: parentTitle,
        title: subTitle,
        domain: detected.domain,
        required_domain: detected.required_domain,
        skills: detected.skills,
        required_skills: detected.required_skills,
        priority: (story.priority || story.priority_tier || 'MEDIUM').toUpperCase(),
        sprint_number: currentSprintNum
      }];
    });

    // ── STRICT PRIORITY SCHEDULING QUEUE ──
    // CRITICAL (0) -> HIGH (1) -> MEDIUM (2) -> LOW (3)
    const priorityWeights = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const domainOrder = { backend: 0, ai: 1, frontend: 2, qa: 3, devops: 4 };

    return [...rawItems].sort((a, b) => {
      // 1. Business Priority First: Critical & High assigned first to guarantee capacity
      const pA = priorityWeights[(a.priority || 'MEDIUM').toUpperCase()] ?? 2;
      const pB = priorityWeights[(b.priority || 'MEDIUM').toUpperCase()] ?? 2;
      if (pA !== pB) return pA - pB;

      // 2. Architectural Dependency Tier: Backend/API foundation before Frontend/UI before QA
      const dA = domainOrder[(a.domain || '').toLowerCase()] ?? 5;
      const dB = domainOrder[(b.domain || '').toLowerCase()] ?? 5;
      if (dA !== dB) return dA - dB;

      // 3. Effort / Story Points (descending: bigger deliverables scheduled first)
      const ptsA = Number(a.story_points) || 0;
      const ptsB = Number(b.story_points) || 0;
      if (ptsA !== ptsB) return ptsB - ptsA;

      const idA = parseInt(String(a.id || a.story_id || '').replace(/\D/g, '')) || 0;
      const idB = parseInt(String(b.id || b.story_id || '').replace(/\D/g, '')) || 0;
      return idA - idB;
    });
  }, [sprintStories, currentSprintNum]);

  // Metrics
  const totalPts = workItems.reduce((s, i) => s + (Number(i.story_points) || 0), 0);
  const totalHrs = workItems.reduce((s, i) => s + (Number(i.estimated_hours) || 0), 0);
  const critCount = workItems.filter(i => (i.priority || '').toUpperCase() === 'CRITICAL').length;
  const highCount = workItems.filter(i => (i.priority || '').toUpperCase() === 'HIGH').length;
  const medCount = workItems.filter(i => (i.priority || '').toUpperCase() === 'MEDIUM').length;

  // ══════════════════════════════════════════════════════════
  // 6. RUN SKILL-BASED ALLOCATION
  // ══════════════════════════════════════════════════════════
  const runAllocation = async () => {
    if (workItems.length === 0) return alert('No sub-tasks found for this sprint.');
    if (developers.length === 0) return alert('No developers found. Click "Manage Resources & Skills" to add developers.');

    setLoading(true);
    setAllocations([]);
    setSavedOk(false);

    try {
      // ── STEP 1: Prefer backend allocation (single source of truth) ──────────
      let backendResults = null;
      try {
        const r = await axios.post(`${EXPRESS_API}/allocate`, {
          tasks: workItems,
          sprint_id: selectedSprint?.sprint_id || `SPR-0${currentSprintNum}`,
          project_id: selectedProject?.project_id || 'P00001'
        });
        if (Array.isArray(r.data?.assignments) && r.data.assignments.length > 0) {
          backendResults = r.data.assignments;
        }
      } catch (_) {}

      if (backendResults) {
        // Backend result is authoritative — enrich with full task metadata for the board
        const enriched = backendResults.map(a => {
          const item = workItems.find(w => String(w.story_id || w.id) === String(a.story_id));
          const dev  = developers.find(d => String(d.id) === String(a.developer_id));
          return {
            // Task fields from workItems
            story_id: a.story_id,
            title: a.title || item?.title || a.story_id,
            parent_story_id: item?.parent_story_id,
            parent_story_title: item?.parent_story_title,
            story_points: item?.story_points || 2,
            estimated_hours: item?.estimated_hours || a.allocated_hours || 16,
            priority: item?.priority || 'MEDIUM',
            domain: item?.domain,
            required_domain: a.matched_domain || item?.required_domain || 'backend',
            required_skills: item?.required_skills || [],
            predicted_complexity: a.predicted_complexity || 'MEDIUM',
            status: item?.status || 'To Do',
            start_date: item?.start_date || null,
            end_date: item?.end_date || null,
            // Developer assignment from backend
            developer_id: a.developer_id ?? null,
            developer_name: a.developer_id ? (a.developer_name || dev?.name || null) : null,
            developer_role: dev?.role || null,
            developer_domain: normDomain(dev?.primary_domain || dev?.domain),
            developer_skills: dev?.languages || dev?.skills || [],
            developer_capacity: Number(dev?.capacity_hours) || 40,
            developer_remaining_after: null,
            allocated_hours: a.allocated_hours || 0,
            // Scoring
            domain_match: !!(a.developer_id),
            skill_match_pct: a.skill_match_score ?? 0,
            seniority_suitability_score: a.complexity_suitability_score ?? 0,
            seniority_rank: getSeniorityRank(dev?.role || ''),
            unassigned_reason: a.developer_id ? null : (a.unassigned_reason || 'Not assigned')
          };
        });
        setAllocations(enriched);
        setPhase('results');
        return;
      }

      // ── STEP 2: Client-side fallback (mirrors backend allocateTasks + MRV) ──
      // Used only when backend is unreachable.
      const devPool = developers.map(dev => ({
        ...dev,
        remaining: Math.max(0, (Number(dev.capacity_hours) || 40) - (Number(dev.other_project_hours) || 0)),
        languages: dev.languages || dev.skills || [],
        primary_domain: normDomain(dev.primary_domain || dev.domain)
      }));

      const hoursUsed = {};
      devPool.forEach(d => { hoursUsed[d.id] = 0; });

      // Build snapRemaining for MRV eligibility counts
      const snapRemaining = {};
      devPool.forEach(d => { snapRemaining[d.id] = d.remaining; });

      function countEligible(task) {
        const estHrs  = Number(task.estimated_hours) || 16;
        const domain  = normDomain(task.required_domain || task.domain);
        return devPool.filter(d => d.primary_domain === domain && (snapRemaining[d.id] ?? 0) >= estHrs).length;
      }

      // Sort: priority first, then MRV (fewer eligible → earlier), then larger tasks, then index
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const sorted = workItems
        .map((item, idx) => ({ item, idx, eligibleCount: countEligible(item) }))
        .sort((a, b) => {
          const pA = priorityOrder[(a.item.priority || 'MEDIUM').toUpperCase()] ?? 2;
          const pB = priorityOrder[(b.item.priority || 'MEDIUM').toUpperCase()] ?? 2;
          if (pA !== pB) return pA - pB;
          if (a.eligibleCount !== b.eligibleCount) return a.eligibleCount - b.eligibleCount;
          const hA = Number(a.item.estimated_hours) || 16;
          const hB = Number(b.item.estimated_hours) || 16;
          if (hA !== hB) return hB - hA;
          return a.idx - b.idx;
        })
        .map(x => x.item);

      const results = sorted.map(item => {
        const itemHrs   = Number(item.estimated_hours) || 16;
        const itemDomain = normDomain(item.required_domain || item.domain);
        const reqSkills  = Array.isArray(item.required_skills) && item.required_skills.length > 0
          ? item.required_skills : (item.skills || []);

        let complexity = item.predicted_complexity || item.complexity;
        if (!complexity) {
          const sp  = Number(item.story_points) || 0;
          const hrs = Number(item.estimated_hours) || 0;
          if (sp >= 8 || hrs >= 12) complexity = 'HIGH';
          else if (sp >= 5 || hrs >= 8) complexity = 'MEDIUM';
          else complexity = 'LOW';
        }
        complexity = complexity.toUpperCase();

        // Strict domain filter
        const domainDevs = devPool.filter(d => d.primary_domain === itemDomain);
        if (domainDevs.length === 0) {
          return {
            story_id: item.story_id || item.id, title: item.title,
            parent_story_id: item.parent_story_id, parent_story_title: item.parent_story_title,
            story_points: item.story_points || 2, estimated_hours: itemHrs,
            priority: item.priority, domain: item.domain, required_domain: itemDomain,
            required_skills: reqSkills, predicted_complexity: complexity,
            status: item.status || 'To Do', start_date: item.start_date || null, end_date: item.end_date || null,
            developer_id: null, developer_name: null, developer_role: null, developer_domain: null,
            developer_skills: [], developer_capacity: 0, developer_remaining_after: 0, allocated_hours: 0,
            domain_match: false, skill_match_pct: 0, seniority_suitability_score: 0, seniority_rank: 0,
            unassigned_reason: `No developers found in domain '${itemDomain}'`
          };
        }

        // Capacity filter
        const capableDevs = domainDevs
          .filter(d => (d.remaining - (hoursUsed[d.id] || 0)) >= itemHrs)
          .map(d => {
            const available = d.remaining - (hoursUsed[d.id] || 0);
            const skillPct  = calcSkillMatch(d.languages, reqSkills);
            const seniority = calcSenioritySuitability(complexity, d.role);
            return { ...d, available, skillPct, seniority };
          });

        if (capableDevs.length === 0) {
          return {
            story_id: item.story_id || item.id, title: item.title,
            parent_story_id: item.parent_story_id, parent_story_title: item.parent_story_title,
            story_points: item.story_points || 2, estimated_hours: itemHrs,
            priority: item.priority, domain: item.domain, required_domain: itemDomain,
            required_skills: reqSkills, predicted_complexity: complexity,
            status: item.status || 'To Do', start_date: item.start_date || null, end_date: item.end_date || null,
            developer_id: null, developer_name: null, developer_role: null, developer_domain: null,
            developer_skills: [], developer_capacity: 0, developer_remaining_after: 0, allocated_hours: 0,
            domain_match: false, skill_match_pct: 0, seniority_suitability_score: 0, seniority_rank: 0,
            unassigned_reason: `No ${itemDomain} developer with sufficient capacity (${itemHrs}h required)`
          };
        }

        // Rank candidates
        const candidates = [...capableDevs].sort((a, b) => {
          if (b.skillPct  !== a.skillPct)  return b.skillPct  - a.skillPct;
          if (b.seniority !== a.seniority) return b.seniority - a.seniority;
          if (b.available !== a.available) return b.available - a.available;
          return String(a.id).localeCompare(String(b.id));
        });

        const best = candidates[0];
        const allocHrs = itemHrs;
        hoursUsed[best.id] = (hoursUsed[best.id] || 0) + allocHrs;

        const maxSuit  = complexity === 'HIGH' ? 3 : 2;
        const suitScore = Math.round((best.seniority / maxSuit) * 100);

        return {
          story_id: item.story_id || item.id, title: item.title,
          parent_story_id: item.parent_story_id, parent_story_title: item.parent_story_title,
          story_points: item.story_points || 2, estimated_hours: itemHrs,
          priority: item.priority, domain: item.domain, required_domain: itemDomain,
          required_skills: reqSkills, predicted_complexity: complexity,
          status: item.status || 'To Do', start_date: item.start_date || null, end_date: item.end_date || null,
          developer_id: best.id, developer_name: best.name,
          developer_role: best.role, developer_domain: best.primary_domain,
          developer_skills: best.languages, developer_capacity: Number(best.remaining) + allocHrs,
          developer_remaining_after: best.available - allocHrs, allocated_hours: allocHrs,
          domain_match: true, skill_match_pct: best.skillPct,
          seniority_suitability_score: suitScore, seniority_rank: getSeniorityRank(best.role),
          unassigned_reason: null
        };
      }).filter(Boolean);

      setAllocations(results);
      setPhase('results');
    } catch (e) {
      console.error('Allocation error:', e);
      alert('Allocation error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };


  // ══════════════════════════════════════════════════════════
  // 7. SAVE ALLOCATION TO DATABASE
  // ══════════════════════════════════════════════════════════
  const saveAllocation = async () => {
    try {
      const pid = selectedProject?.project_id || 'P00001';
      const projName = selectedProject?.project_name || 'Project';
      const spId = selectedSprint?.sprint_id || `SPR-0${currentSprintNum}`;

      await axios.post(`${EXPRESS_API}/task-assignments`, {
        sprint_id: spId,
        project_id: pid,
        project_name: projName,
        assignments: allocations.map(a => ({
          story_id: a.story_id,
          title: a.title,
          developer_id: a.developer_id,
          developer_name: a.developer_name,
          allocated_hours: a.allocated_hours,
          predicted_complexity: a.predicted_complexity,
          matched_domain: a.required_domain,
          skill_match_score: a.skill_match_pct,
          priority: a.priority
        }))
      });
      setSavedOk(true);
      alert(`✅ Allocations saved for "${projName}" (${pid})!\n\n${allocations.length} sub-tasks allocated to ${new Set(allocations.map(a => a.developer_id)).size} developers.`);
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.error || e.message));
    }
  };

  // ══════════════════════════════════════════════════════════
  // 8. DRAG-AND-DROP TASK REASSIGNMENT (Board View)
  // ══════════════════════════════════════════════════════════
  const handleTaskMove = useCallback((task, fromDevId, toDevId) => {
    if (String(fromDevId) === String(toDevId)) return;

    // Moving to unassigned
    if (!toDevId || toDevId === 'unassigned' || toDevId === 'null') {
      setAllocations(prev => prev.map(a => {
        if (String(a.story_id) === String(task.story_id)) {
          return {
            ...a,
            developer_id: null,
            developer_name: 'Unassigned',
            developer_role: null,
            developer_domain: null,
            allocated_hours: 0,
            domain_match: false,
            skill_match_pct: 0,
            seniority_suitability_score: 0,
            unassigned_reason: 'Manually unassigned'
          };
        }
        return a;
      }));
      return;
    }

    const newDev = developers.find(d => String(d.id) === String(toDevId));
    if (!newDev) return;

    // Strict domain check
    const taskDomain = normDomain(task.required_domain || task.matched_domain || task.domain);
    const targetDomain = normDomain(newDev.primary_domain || newDev.domain);
    if (taskDomain !== targetDomain) {
      alert(`⛔ Reassignment Blocked!\n\nThis task requires a "${taskDomain.toUpperCase()}" developer, but ${newDev.name} is in the "${targetDomain.toUpperCase()}" domain.\n\nStrict domain matching is enforced.`);
      return;
    }

    // Capacity validation
    const capacity = Number(newDev.capacity_hours) || 40;
    const otherProjectHours = Number(newDev.other_project_hours) || 0;
    const taskHours = Number(task.estimated_hours) || Number(task.allocated_hours) || 16;
    const currentDevTasks = allocations.filter(a => String(a.developer_id) === String(toDevId) && String(a.story_id) !== String(task.story_id));
    const currentSprintUsed = currentDevTasks.reduce((s, a) => s + (Number(a.allocated_hours) || 0), 0);

    if (currentSprintUsed + otherProjectHours + taskHours > capacity) {
      const remainingAvail = Math.max(0, capacity - (currentSprintUsed + otherProjectHours));
      alert(`⚠️ Capacity Exceeded for ${newDev.name}!\n\nDeveloper has only ${remainingAvail}h available remaining capacity, but task requires ${taskHours}h.\n\nTask cannot exceed permitted capacity.`);
      return;
    }

    const reqSkills = Array.isArray(task.required_skills) && task.required_skills.length > 0
      ? task.required_skills : (task.skills || []);
    const skillPct = calcSkillMatch(newDev.languages || newDev.skills || [], reqSkills);
    const seniority = calcSenioritySuitability(task.predicted_complexity || 'MEDIUM', newDev.role);
    const maxSuit = (task.predicted_complexity || '').toUpperCase() === 'HIGH' ? 3 : 2;
    const suitScore = Math.round((seniority / maxSuit) * 100);

    setAllocations(prev => prev.map(a => {
      if (String(a.story_id) === String(task.story_id)) {
        return {
          ...a,
          developer_id: newDev.id,
          developer_name: newDev.name,
          developer_role: newDev.role,
          developer_domain: newDev.primary_domain,
          developer_skills: newDev.languages || newDev.skills || [],
          allocated_hours: taskHours,
          domain_match: true,
          skill_match_pct: skillPct,
          seniority_suitability_score: suitScore,
          seniority_rank: getSeniorityRank(newDev.role),
          unassigned_reason: null
        };
      }
      return a;
    }));
  }, [developers, allocations]);

  const avgSkillMatch = allocations.length > 0
    ? Math.round(allocations.reduce((s, a) => s + a.skill_match_pct, 0) / allocations.length) : 0;

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">

      {/* ────── Header Banner ────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
              <Users size={14} className="text-indigo-300" />
              <span>Skill-Based Staff & Capacity Allocation System</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Sprint Resource Allocation Module
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Select project → select sprint → view sub-tasks with identified domain & skills → run allocation → save results.
            </p>
          </div>
          <button
            onClick={() => setIsManageTeamOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all border border-indigo-400/40 cursor-pointer shrink-0"
          >
            <Users size={16} />
            <span>Manage Resources & Skills</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono font-extrabold ml-1">
              {developers.length}
            </span>
          </button>
        </div>
      </div>

      {/* ────── Project & Sprint Selection ────── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Project */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Select Project</h3>
            <ProjectSelection
              projects={unifiedProjects}
              selectedProject={selectedProject}
              onSelect={handleSelectProject}
            />
          </div>
          {/* Sprint */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Select Sprint</h3>
            <select
              value={selectedSprint ? (selectedSprint.sprint_id || selectedSprint.id) : ''}
              onChange={(e) => {
                const sp = sprints.find(s => String(s.sprint_id || s.id) === e.target.value);
                setSelectedSprint(sp || null);
                setPhase('subtasks');
                setAllocations([]);
                setSavedOk(false);
              }}
              disabled={!selectedProject || sprints.length === 0}
              className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
            >
              {!selectedProject ? (
                <option value="">Select a project first...</option>
              ) : sprints.length === 0 ? (
                <option value="">No Sprints Available</option>
              ) : (
                sprints.map(s => (
                  <option key={s.sprint_id || s.id} value={s.sprint_id || s.id}>
                    {s.sprint_name || s.name || `Sprint ${s.sprint_number || 1}`}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Sprint meta info */}
        {selectedSprint && workItems.length > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {selectedSprint.start_date && selectedSprint.end_date && (
              <span className="flex items-center gap-1"><Clock size={12} /> {selectedSprint.start_date} → {selectedSprint.end_date}</span>
            )}
            {selectedSprint.working_days && (
              <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> {selectedSprint.working_days} working days</span>
            )}
            <span className="flex items-center gap-1"><Layers size={12} /> {workItems.length} sub-tasks</span>
            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold">⬡ {totalPts} pts</span>
            <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-bold">⏱ {totalHrs}h effort</span>
          </div>
        )}
      </div>

      {/* ────── Loading ────── */}
      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-16 text-center">
          <RefreshCw size={32} className="animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {phase === 'subtasks' ? 'Loading sprint plan…' : 'Running allocation engine…'}
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          PHASE 1: SUB-TASKS TABLE
      ══════════════════════════════════════════════════════ */}
      {!loading && selectedProject && phase === 'subtasks' && workItems.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">

          {/* Table header bar */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Layers size={16} className="text-indigo-500" />
                  Sprint Sub-Tasks — Domain & Skill Identification
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold uppercase tracking-wide">
                  <Zap size={11} className="text-amber-500" /> Priority Queue (Critical & High First)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span>Tasks are sorted in execution priority: Critical and High tasks are assigned first to guarantee senior capacity.</span>
                {critCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 font-bold text-[10px]">
                    {critCount} Critical
                  </span>
                )}
                {highCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-bold text-[10px]">
                    {highCount} High
                  </span>
                )}
                {medCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-[10px]">
                    {medCount} Medium
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={runAllocation}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/25 transition-all hover:scale-105 cursor-pointer shrink-0"
            >
              <Cpu size={15} className={loading ? 'animate-spin' : ''} />
              <span>Run Allocation Engine</span>
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/70 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Sub-task ID</th>
                  <th className="px-4 py-3 whitespace-nowrap">Parent Story</th>
                  <th className="px-4 py-3">Deliverable Title</th>
                  <th className="px-4 py-3">Identified Domain</th>
                  <th className="px-4 py-3">Required Skills</th>
                  <th className="px-4 py-3 text-center">Points</th>
                  <th className="px-4 py-3 text-center">Hours</th>
                  <th className="px-4 py-3 text-center">Priority</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800/80">
                {workItems.map((item, idx) => {
                  const itemId = item.story_id || item.id;
                  const dom = item.domain || 'backend';
                  const skills = Array.isArray(item.required_skills) && item.required_skills.length > 0
                    ? item.required_skills : (item.skills || ['JavaScript']);
                  const isCrit = item.priority === 'CRITICAL';
                  const isHigh = item.priority === 'HIGH';
                  return (
                    <tr
                      key={itemId || idx}
                      className={`transition-colors ${
                        isCrit
                          ? 'bg-red-500/[0.04] hover:bg-red-500/[0.08] border-l-4 border-l-red-500'
                          : isHigh
                          ? 'bg-orange-500/[0.03] hover:bg-orange-500/[0.07] border-l-4 border-l-orange-500'
                          : 'hover:bg-indigo-50/30 dark:hover:bg-slate-700/30'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-400/30 text-sky-700 dark:text-sky-300 font-mono font-bold text-[10px] inline-flex items-center gap-1">
                          <span>↳</span> {itemId}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px]">
                        {item.parent_story_id}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-semibold text-slate-900 dark:text-white leading-snug">{item.title}</div>
                        {item.start_date && item.end_date && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{item.start_date} → {item.end_date}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${domainStyle(dom)}`}>
                          {domainIcon(dom)} {dom}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {skills.map((sk, si) => (
                            <span key={si} className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                        {item.story_points} pts
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {item.estimated_hours}h
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityStyle(item.priority)}`}>
                          {item.priority}
                        </span>
                        {isCrit && (
                          <div className="text-[9px] font-extrabold text-red-500 mt-0.5 tracking-tight">Queue #1</div>
                        )}
                        {isHigh && (
                          <div className="text-[9px] font-extrabold text-orange-500 mt-0.5 tracking-tight">Queue #2</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {item.status || 'To Do'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && selectedProject && workItems.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-12 text-center">
          <Layers size={40} className="mx-auto mb-3 text-indigo-400 opacity-60" />
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No sub-tasks found for this sprint.</p>
          <p className="text-xs text-slate-400 mt-1">Generate a sprint plan in the Project Management module first.</p>
        </div>
      )}

      {/* No project selected */}
      {!loading && !selectedProject && (
        <div className="text-center py-12">
          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 inline-block mb-4">
            <Code size={40} />
          </div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Select a Project</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Choose a project to allocate development resources.</p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          PHASE 2: ALLOCATION RESULTS
      ══════════════════════════════════════════════════════ */}
      {!loading && phase === 'results' && allocations.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">

          {/* Results header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-2">
                <CheckCircle2 size={13} /> Allocation Complete — {allocations.length} sub-tasks assigned
              </div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Target size={16} className="text-emerald-600" />
                {resultsView === 'board' ? 'Allocation Board — Developer Task Lanes' : 'Allocation Results — Why Each Developer Was Selected'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {resultsView === 'board'
                  ? 'Drag & drop tasks between developer columns to reassign. Each card shows task title, complexity and hours.'
                  : 'Domain match → Skill match % → Seniority suitability vs complexity → Remaining capacity'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {/* View Toggle */}
              <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
                <button
                  onClick={() => setResultsView('board')}
                  className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    resultsView === 'board'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <Layers size={12} /> Board
                </button>
                <button
                  onClick={() => setResultsView('table')}
                  className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    resultsView === 'table'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <BarChart2 size={12} /> Table
                </button>
              </div>
              <button
                onClick={() => { setPhase('subtasks'); setAllocations([]); setSavedOk(false); setResultsView('board'); }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all border border-slate-200 dark:border-slate-600 cursor-pointer"
              >
                ← Back to Sub-Tasks
              </button>
              {savedOk ? (
                <span className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Saved ✓
                </span>
              ) : (
                <button
                  onClick={saveAllocation}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  <Save size={13} /> Save to Database
                </button>
              )}
            </div>
          </div>

          {/* ── Board View ── */}
          {resultsView === 'board' && (
            <div className="p-5">
              <AllocationResults
                assignments={allocations}
                developers={developers}
                tasks={workItems}
                selectedProject={selectedProject}
                selectedSprint={selectedSprint}
                onRebalance={runAllocation}
                onSave={saveAllocation}
                onTaskMove={handleTaskMove}
                onBack={() => { setPhase('subtasks'); setAllocations([]); setSavedOk(false); setResultsView('board'); }}
                onOpenManageTeam={() => setIsManageTeamOpen(true)}
                loading={loading}
              />
            </div>
          )}

          {/* ── Table View ── */}
          {resultsView === 'table' && <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Sub-task</th>
                  <th className="px-4 py-3">Deliverable</th>
                  <th className="px-4 py-3 text-center">Domain</th>
                  <th className="px-4 py-3">Required Skills</th>
                  <th className="px-4 py-3 text-center">Pts / Hrs</th>
                  <th className="px-4 py-3 text-center">Priority</th>
                  <th className="px-4 py-3 text-center">Complexity</th>
                  {/* Decision columns */}
                  <th className="px-4 py-3 whitespace-nowrap text-indigo-600 dark:text-indigo-400">Assigned Developer</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap text-emerald-600 dark:text-emerald-400">Domain Match</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap text-purple-600 dark:text-purple-400">Skill Match</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap text-amber-600 dark:text-amber-400">Seniority Fit</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap text-sky-600 dark:text-sky-400">Remaining Cap</th>
                  <th className="px-4 py-3 text-center">Alloc Hrs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800/80">
                {allocations.map((a, idx) => (
                  <tr key={a.story_id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-lg bg-sky-500/10 border border-sky-400/30 text-sky-700 dark:text-sky-300 font-mono font-bold text-[10px]">
                        ↳ {a.story_id}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-semibold text-slate-900 dark:text-white text-[12px] leading-snug line-clamp-2">{a.title}</div>
                      {a.parent_story_id && a.parent_story_id !== a.story_id && (
                        <div className="text-[10px] text-slate-400 mt-0.5 font-mono">↑ {a.parent_story_id}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${domainStyle(a.domain)}`}>
                        {domainIcon(a.domain)} {a.domain}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {(a.required_skills || []).map((sk, si) => (
                          <span key={si} className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="font-bold text-purple-600 dark:text-purple-400 font-mono">{a.story_points} pts</div>
                      <div className="text-slate-500 dark:text-slate-400 font-mono">{a.estimated_hours}h</div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityStyle(a.priority)}`}>
                        {a.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        a.predicted_complexity === 'HIGH' ? 'bg-red-500/15 text-red-500 border-red-500/30' :
                        a.predicted_complexity === 'MEDIUM' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' :
                        'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                      }`}>
                        {a.predicted_complexity}
                      </span>
                    </td>

                    {/* ─── Decision columns ─── */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {(a.developer_name || '?').charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100 text-[12px]">{a.developer_name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">{a.developer_role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {a.domain_match ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                          <CheckCircle2 size={10} /> Match
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                          <AlertCircle size={10} /> Partial
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className={`font-extrabold font-mono text-sm ${a.skill_match_pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : a.skill_match_pct >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500'}`}>
                        {a.skill_match_pct}%
                      </div>
                      <div className="w-14 mx-auto h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden mt-1">
                        <div className={`h-full rounded-full ${a.skill_match_pct >= 80 ? 'bg-emerald-500' : a.skill_match_pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${a.skill_match_pct}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className={`font-extrabold font-mono text-sm ${a.seniority_suitability_score >= 80 ? 'text-purple-600 dark:text-purple-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {a.seniority_suitability_score}%
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5 font-bold uppercase">{a.seniority_rank}</div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className={`font-extrabold font-mono text-sm ${a.developer_remaining_after > 0 ? 'text-sky-600 dark:text-sky-400' : 'text-red-500'}`}>
                        {Math.max(0, a.developer_remaining_after)}h
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5">left after</div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-mono font-extrabold text-[11px]">
                        {a.allocated_hours}h
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}

          {/* Summary KPIs — only in table view */}
          {resultsView === 'table' && <div>
          <div className="p-5 border-t border-slate-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/30">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: <CheckCircle2 size={18} className="text-emerald-500" />, label: 'Tasks Allocated', value: allocations.length, color: 'text-emerald-600 dark:text-emerald-400' },
                { icon: <BarChart2 size={18} className="text-purple-500" />, label: 'Avg Skill Match', value: `${avgSkillMatch}%`, color: avgSkillMatch >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400' },
                { icon: <Clock size={18} className="text-indigo-500" />, label: 'Total Hours Allocated', value: `${allocations.reduce((s, a) => s + a.allocated_hours, 0)}h`, color: 'text-indigo-600 dark:text-indigo-400' },
                { icon: <Users size={18} className="text-sky-500" />, label: 'Developers Used', value: new Set(allocations.map(a => a.developer_id)).size, color: 'text-sky-600 dark:text-sky-400' }
              ].map((m, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900">{m.icon}</div>
                  <div>
                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{m.label}</div>
                    <div className={`text-lg font-extrabold ${m.color}`}>{m.value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
              <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full bg-emerald-500" /> Domain Match = task domain == developer's primary domain</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full bg-purple-500" /> Skill Match = % of required skills found in developer's skill set</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full bg-amber-500" /> Seniority Fit = Senior→HIGH, Mid→MEDIUM, Junior→LOW complexity</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-1 rounded-full bg-sky-500" /> Remaining Cap = developer's hours left after this allocation</div>
            </div>
          </div></div>}
        </div>
      )}

      {/* ────── Footer Status ────── */}
      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
          <Info size={14} />
          <span>Synchronized with Project Management Sprint Planning Engine</span>
        </div>
        <div>
          Powered by Skill & Capacity-Aware Allocation
        </div>
      </div>

      {/* ────── Manage Team Modal ────── */}
      <ManageTeamModal
        isOpen={isManageTeamOpen}
        onClose={() => setIsManageTeamOpen(false)}
        developers={developers}
        onTeamUpdated={loadDevelopers}
      />
    </div>
  );
}
