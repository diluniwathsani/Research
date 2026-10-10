import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Users, Code, Info, Calendar, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import ProjectSelection from './ProjectSelection.jsx';
import TaskPreview from './TaskPreview.jsx';
import AllocationResults from './AllocationResults.jsx';
import ManageTeamModal from './ManageTeamModal.jsx';

// API Configuration
const EXPRESS_API = 'http://localhost:3000/api';
const PROJECT_ENGINE_API = 'http://localhost:8082/api';

// Keyword Method: Identifies Domain and Required Skills dynamically from task title
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

export default function ResourceManagementModule({ 
  requirements = [],
  projects: parentProjects = [], 
  selectedProjectId: parentSelectedProjectId = '', 
  onSelectProject 
}) {
  // ================= STATE =================
  const [localProjects, setLocalProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [allSprintPlanTasks, setAllSprintPlanTasks] = useState([]);
  const [sprintTasks, setSprintTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [ganttTimeline, setGanttTimeline] = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiSource, setApiSource] = useState('project_engine');
  const [isManageTeamOpen, setIsManageTeamOpen] = useState(false);

  // View Modes: 'backlog' | 'allocation_results'
  const [viewMode, setViewMode] = useState('backlog');

  // ================= 1. DYNAMIC PROJECTS LIST FROM REQUIREMENTS & PROJECT MODULE =================
  const unifiedProjects = useMemo(() => {
    const list = [];
    const seenNames = new Set();
    const seenIds = new Set();

    const cleanTitle = (raw) => {
      const str = (raw || '').trim();
      if (!str || str.toLowerCase() === 'untitled' || str.toLowerCase() === 'untitled batch') {
        return '';
      }
      return str;
    };

    // 1. Database Projects (Primary source of truth)
    const dbProjects = parentProjects.length > 0 ? parentProjects : localProjects;
    dbProjects.forEach((p, idx) => {
      const pName = cleanTitle(p.project_name || p.name);
      const pId = String(p.project_id || p.id || `P0000${idx + 1}`);
      if (pName && !seenNames.has(pName)) {
        seenNames.add(pName);
        seenIds.add(pId);
        list.push({
          ...p,
          id: pId,
          project_id: pId,
          project_name: pName,
          name: pName,
          source: 'database'
        });
      }
    });

    // 2. Active Project Management project name
    try {
      const email = localStorage.getItem('user_email') || 'default';
      const activeSaved = cleanTitle(
        localStorage.getItem(`active_requirements_batch_${email}`) || 
        localStorage.getItem('active_requirements_batch') || 
        localStorage.getItem('active_project_name')
      );
      if (activeSaved && !seenNames.has(activeSaved)) {
        seenNames.add(activeSaved);
        list.push({
          id: 'PM-ACTIVE',
          project_id: 'PM-ACTIVE',
          project_name: activeSaved,
          name: activeSaved,
          description: 'Active project from Project Management & Sprint Planning Module',
          source: 'project_module'
        });
      }
    } catch (_) {}

    // 3. Batches derived from Requirements Module
    if (Array.isArray(requirements) && requirements.length > 0) {
      requirements.forEach((r, idx) => {
        const title = cleanTitle(r.batch_title || r.batch_name || r.file_name);
        if (title && !seenNames.has(title)) {
          seenNames.add(title);
          const uniqueBatchId = `BATCH-${idx + 1}`;
          list.push({
            id: uniqueBatchId,
            project_id: r.project_id || uniqueBatchId,
            project_name: title,
            name: title,
            description: `Requirements specification batch (${r.completeness_status || 'Active'})`,
            source: 'requirements_module'
          });
        }
      });
    }

    // 4. Default Fallback if empty
    if (list.length === 0) {
      list.push({
        id: 'P00001',
        project_id: 'P00001',
        project_name: 'Enterprise Core Platform',
        name: 'Enterprise Core Platform',
        description: 'Enterprise Core Platform Agile Suite'
      });
    }

    return list;
  }, [requirements, parentProjects, localProjects]);

  // Clean stale untitled batch in localStorage
  useEffect(() => {
    try {
      const email = localStorage.getItem('user_email') || 'default';
      ['active_requirements_batch', `active_requirements_batch_${email}`, 'active_project_name'].forEach(k => {
        const val = localStorage.getItem(k);
        if (val && (val.toLowerCase() === 'untitled' || val.toLowerCase() === 'untitled batch')) {
          localStorage.removeItem(k);
        }
      });
    } catch (_) {}
  }, []);

  // Sync selectedProject with unifiedProjects
  useEffect(() => {
    if (unifiedProjects.length > 0) {
      setSelectedProject(prev => {
        if (prev) {
          const matchPrev = unifiedProjects.find(
            p => String(p.id) === String(prev.id) || 
                 (p.project_name && prev.project_name && p.project_name.toLowerCase() === prev.project_name.toLowerCase())
          );
          if (matchPrev) return matchPrev;
        }
        if (parentSelectedProjectId) {
          const matchParent = unifiedProjects.find(
            p => String(p.id) === String(parentSelectedProjectId) || String(p.project_id) === String(parentSelectedProjectId)
          );
          if (matchParent) return matchParent;
        }
        return unifiedProjects[0];
      });
    }
  }, [unifiedProjects, parentSelectedProjectId]);

  const handleSelectProject = (proj) => {
    if (!proj) return;
    setSelectedProject(proj);
    const pid = proj.project_id || proj.id;
    if (onSelectProject && pid) {
      onSelectProject(pid);
    }
  };

  // ================= 2. LOAD DB PROJECTS AS FALLBACK =================
  useEffect(() => {
    if (parentProjects.length === 0) {
      axios.get(`${EXPRESS_API}/projects`)
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.projects || res.data?.data || []);
          setLocalProjects(list);
        })
        .catch(err => console.warn('Notice loading local projects:', err.message));
    }
  }, [parentProjects]);

  // ================= 3. LOAD DEVELOPERS =================
  const loadDevelopers = async () => {
    try {
      const res = await axios.get(`${EXPRESS_API}/developers`);
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setDevelopers(list);
    } catch (err) {
      console.warn('Error loading developers:', err.message);
    }
  };

  useEffect(() => {
    loadDevelopers();
  }, []);

  // ================= 4. FETCH SPRINT PLAN OUTPUT DIRECTLY FROM PROJECT MODULE =================
  useEffect(() => {
    if (!selectedProject) return;
    setLoading(true);

    const loadProjectModulePlan = async () => {
      try {
        // A. Fetch Sprint Plan output from Project Module Flask Engine (Port 8082)
        const planRes = await axios.get(`${PROJECT_ENGINE_API}/sprint-plan`).catch(() => null);
        let ganttRes = await axios.get(`${PROJECT_ENGINE_API}/timeline/gantt`).catch(() => null);

        let planTasks = planRes?.data?.tasks || [];
        let planSprints = ganttRes?.data?.sprints || [];
        setGanttTimeline(ganttRes?.data || null);

        // Fallback to Express backend if port 8082 had no active plan
        if (planTasks.length === 0) {
          try {
            const expPlan = await axios.get(`${EXPRESS_API}/sprint-plan`);
            planTasks = expPlan.data?.tasks || [];
          } catch (_) {}
        }

        // If still empty, load user stories from Requirements DB
        if (planTasks.length === 0) {
          try {
            const storiesRes = await axios.get(`${EXPRESS_API}/user-stories`);
            const rawStories = Array.isArray(storiesRes.data) ? storiesRes.data : (storiesRes.data?.data || []);
            planTasks = rawStories.map((s, idx) => ({
              story_id: s.story_id || `US00${idx + 1}`,
              title: s.title || s.user_story || s.requirement_sentence || 'User Story',
              sprint_number: idx < 6 ? 1 : 2,
              story_points: Number(s.story_points) || 5,
              estimated_hours: (Number(s.story_points) || 5) * 8,
              priority: (s.priority || 'MEDIUM').toUpperCase(),
              priority_tier: (s.priority || 'MEDIUM').toUpperCase()
            }));
          } catch (_) {}
        }

        // Normalize each task with domain, required skills, and duration
        const normalizedTasks = planTasks.map((t, idx) => {
          const title = t.title || t.user_story || 'User Story';
          const detected = extractDomainAndSkills(title);
          const points = Number(t.story_points) || Number(t.points) || 5;
          const hours = Number(t.estimated_hours) || Number(t.hours) || (points * 8);

          return {
            ...t,
            id: t.story_id || t.id || `US${idx + 1}`,
            story_id: t.story_id || t.id || `US${idx + 1}`,
            title: title,
            sprint_number: parseInt(t.sprint_number || 1, 10),
            story_points: points,
            estimated_hours: hours,
            priority: (t.priority || t.priority_tier || 'MEDIUM').toUpperCase(),
            priority_tier: (t.priority_tier || t.priority || 'MEDIUM').toUpperCase(),
            domain: detected.domain,
            required_domain: detected.required_domain,
            skills: t.skills || detected.skills,
            required_skills: t.skills || detected.skills
          };
        });

        setAllSprintPlanTasks(normalizedTasks);

        // Dynamically compute exact sprint list from project plan
        const sprintNumbersSet = new Set(normalizedTasks.map(t => t.sprint_number).filter(n => n > 0));
        if (sprintNumbersSet.size === 0) sprintNumbersSet.add(1);

        const sprintList = Array.from(sprintNumbersSet).sort((a, b) => a - b).map(sNum => {
          const matchingGantt = planSprints.find(gs => gs.sprint_number === sNum);
          return {
            id: `SPR-0${sNum}`,
            sprint_id: `SPR-0${sNum}`,
            sprint_number: sNum,
            name: `Sprint ${sNum}`,
            sprint_name: matchingGantt?.start_date && matchingGantt?.end_date 
              ? `Sprint ${sNum} (${matchingGantt.start_date} → ${matchingGantt.end_date})`
              : `Sprint ${sNum}`,
            start_date: matchingGantt?.start_date || null,
            end_date: matchingGantt?.end_date || null,
            working_days: matchingGantt?.working_days || 10,
            story_points: matchingGantt?.story_points || 30
          };
        });

        setSprints(sprintList);
        setSelectedSprint(prev => {
          if (prev && sprintList.some(s => s.sprint_number === prev.sprint_number)) {
            return sprintList.find(s => s.sprint_number === prev.sprint_number);
          }
          return sprintList[0] || null;
        });

        setApiSource('project_engine');
      } catch (err) {
        console.error('Error fetching Sprint Plan from Project Module:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProjectModulePlan();
    setAssignments([]);
    setViewMode('backlog');
  }, [selectedProject]);

  // ================= 5. FILTER TASKS FOR CURRENT SPRINT =================
  useEffect(() => {
    if (!selectedSprint) {
      setSprintTasks(allSprintPlanTasks);
      return;
    }
    const currentSprintNum = selectedSprint.sprint_number || 1;
    const filtered = allSprintPlanTasks.filter(t => t.sprint_number === currentSprintNum);
    setSprintTasks(filtered.length > 0 ? filtered : allSprintPlanTasks);
  }, [selectedSprint, allSprintPlanTasks]);

  // ================= 6. SKILL-BASED RESOURCE ALLOCATION TRIGGER =================
  const runSkillBasedAllocation = async () => {
    if (sprintTasks.length === 0) {
      alert('No user stories found in this sprint to allocate.');
      return;
    }

    setLoading(true);
    try {
      // 1. Try Express automated skill & capacity allocation endpoint
      let allocResult = null;
      try {
        const resp = await axios.post(`${EXPRESS_API}/allocate`, {
          tasks: sprintTasks,
          sprint_id: selectedSprint?.sprint_id || `SPR-0${selectedSprint?.sprint_number || 1}`,
          project_id: selectedProject?.project_id || 'P00001'
        });
        allocResult = resp.data?.assignments || resp.data?.data || null;
      } catch (expErr) {
        console.warn('Express allocation fallback:', expErr.message);
      }

      // 2. If Express returned assignments, use them!
      if (Array.isArray(allocResult) && allocResult.length > 0) {
        setAssignments(allocResult);
        setViewMode('allocation_results');
        setLoading(false);
        return;
      }

      // 3. Client-side Skill-Based Allocation algorithm using Project Module Developer assignments
      const developerPool = developers.length > 0 ? developers : [
        { id: 1, name: 'Alice', role: 'Senior', capacity_hours: 40, primary_domain: 'backend', languages: ['JavaScript', 'Python', 'SQL'] },
        { id: 2, name: 'Bob', role: 'Senior', capacity_hours: 40, primary_domain: 'frontend', languages: ['JavaScript', 'React', 'Tailwind'] },
        { id: 3, name: 'Charlie', role: 'Junior', capacity_hours: 40, primary_domain: 'frontend', languages: ['HTML', 'CSS', 'JavaScript'] },
        { id: 4, name: 'David', role: 'Senior', capacity_hours: 40, primary_domain: 'backend', languages: ['Python', 'SQL', 'PostgreSQL'] },
        { id: 5, name: 'Kasun Perera', role: 'Lead Architect', capacity_hours: 40, primary_domain: 'backend', languages: ['Python', 'OAuth', 'Security'] }
      ];

      const devHoursUsed = {};
      developerPool.forEach(d => { devHoursUsed[d.id] = 0; });

      const generatedAssignments = sprintTasks.map(task => {
        const taskHours = Number(task.estimated_hours) || 24;
        const taskDomain = (task.domain || 'backend').toLowerCase();
        const taskSkills = Array.isArray(task.required_skills) ? task.required_skills : ['JavaScript'];

        // Find developer matching primary domain with available capacity
        let bestDev = developerPool.find(d => 
          (d.primary_domain || '').toLowerCase() === taskDomain && 
          ((devHoursUsed[d.id] || 0) + taskHours <= (Number(d.capacity_hours) || 40))
        );

        // Fallback: Developer with lowest current workload
        if (!bestDev) {
          bestDev = [...developerPool].sort((a, b) => (devHoursUsed[a.id] || 0) - (devHoursUsed[b.id] || 0))[0];
        }

        if (bestDev) {
          devHoursUsed[bestDev.id] = (devHoursUsed[bestDev.id] || 0) + taskHours;
        }

        return {
          story_id: task.story_id,
          user_story_id: task.story_id,
          title: task.title,
          allocated_hours: taskHours,
          developer_id: bestDev?.id || 1,
          developer_name: bestDev?.name || 'Unassigned',
          predicted_complexity: task.priority_tier === 'CRITICAL' ? 'High' : (task.priority === 'HIGH' ? 'High' : 'Medium'),
          matched_domain: bestDev?.primary_domain || taskDomain,
          skills: taskSkills
        };
      });

      setAssignments(generatedAssignments);
      setViewMode('allocation_results');
    } catch (err) {
      console.error('Resource Allocation error:', err);
      alert('Resource Allocation error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ================= 7. DRAG & DROP REASSIGNMENT =================
  const handleTaskMove = (task, fromDevId, toDevId) => {
    const updatedAssignments = assignments.map(a => {
      if (String(a.story_id) === String(task.story_id)) {
        const targetDev = developers.find(d => String(d.id) === String(toDevId));
        return {
          ...a,
          developer_id: toDevId,
          developer_name: targetDev ? targetDev.name : a.developer_name
        };
      }
      return a;
    });
    setAssignments(updatedAssignments);
  };

  // ================= 8. REBALANCE =================
  const handleRebalance = async () => {
    await runSkillBasedAllocation();
  };

  // ================= 9. SAVE ALLOCATION =================
  const handleSaveAllocation = async () => {
    try {
      const pid = selectedProject ? (selectedProject.project_id || selectedProject.id) : 'P00001';
      const projName = selectedProject ? (selectedProject.project_name || selectedProject.name) : 'Agile Project';
      const spId = selectedSprint ? (selectedSprint.id || selectedSprint.sprint_id) : 'SPR-01';

      await axios.post(`${EXPRESS_API}/task-assignments`, {
        sprint_id: spId,
        project_id: pid,
        project_name: projName,
        assignments: assignments
      });

      alert(`✅ Skill-based Resource Allocations successfully saved to database for project "${projName}" (${pid})!\n\nAll tasks and developer workloads have been synchronized.`);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save allocation: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
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
              Consumes Sprint Plans, Story Points, Fibonacci Effort & Cadence Timelines directly from the Project Management Module.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsManageTeamOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all border border-indigo-400/40 cursor-pointer"
            >
              <Users size={16} />
              <span>Manage Resources & Skills</span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-mono font-extrabold ml-1">
                {developers.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm">
        {/* Project & Sprint Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Project Selection */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Select Project</h3>
            <ProjectSelection
              projects={unifiedProjects}
              selectedProject={selectedProject}
              onSelect={handleSelectProject}
            />
          </div>

          {/* Sprint Selection */}
          <div>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Select Sprint</h3>
            <select
              value={selectedSprint ? (selectedSprint.sprint_id || selectedSprint.id) : ''}
              onChange={(e) => {
                const sp = sprints.find(s => String(s.sprint_id || s.id) === e.target.value);
                setSelectedSprint(sp || null);
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

        {/* VIEW MODE 1: SPRINT STORIES & RESOURCE ALLOCATION TRIGGER */}
        {viewMode === 'backlog' && selectedProject && (
          <TaskPreview
            tasks={sprintTasks}
            sprintDetails={selectedSprint}
            onRunAllocation={runSkillBasedAllocation}
            hasAssignments={assignments.length > 0}
            onViewAssignments={() => setViewMode('allocation_results')}
            onOpenManageTeam={() => setIsManageTeamOpen(true)}
            loading={loading}
            apiSource={apiSource}
            apiStatus={{ pooliyadda: true, express: true }}
          />
        )}

        {/* VIEW MODE 2: RESOURCE ALLOCATION RESULTS & DRAG-AND-DROP BOARD */}
        {viewMode === 'allocation_results' && (
          <AllocationResults
            assignments={assignments}
            developers={developers}
            tasks={sprintTasks}
            selectedProject={selectedProject}
            selectedSprint={selectedSprint}
            onRebalance={handleRebalance}
            onSave={handleSaveAllocation}
            onTaskMove={handleTaskMove}
            onBack={() => setViewMode('backlog')}
            onOpenManageTeam={() => setIsManageTeamOpen(true)}
            loading={loading}
            apiSource={apiSource}
          />
        )}

        {/* Empty State when no project selected */}
        {!selectedProject && (
          <div className="text-center py-12">
            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 inline-block mb-4">
              <Code size={40} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Select a Project</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Choose a project to allocate development resources.</p>
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">
          <Info size={14} />
          <span>Status: Synchronized with Project Management Sprint Planning Engine</span>
        </div>
        <div>
          Powered by Capacity & Skill-Aware Developer Allocation
        </div>
      </div>

      {/* Manage Team & Technical Skills Modal */}
      <ManageTeamModal
        isOpen={isManageTeamOpen}
        onClose={() => setIsManageTeamOpen(false)}
        developers={developers}
        onTeamUpdated={loadDevelopers}
      />
    </div>
  );
}
