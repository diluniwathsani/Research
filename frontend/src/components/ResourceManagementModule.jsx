import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Code, Info, Sparkles, Layers } from 'lucide-react';
import ProjectSelection from './ProjectSelection.jsx';
import TaskPreview from './TaskPreview.jsx';
import WorkItemDecompositionReview from './WorkItemDecompositionReview.jsx';
import AllocationResults from './AllocationResults.jsx';

// API Configuration
const EXPRESS_API = 'http://localhost:3000/api';

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

  // 2. Explicit Frontend UI / UX / Form / Entry Keywords (Evaluates UI input actions like "enter details")
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
  projects: parentProjects = [], 
  selectedProjectId: parentSelectedProjectId = '', 
  onSelectProject 
}) {
  // ================= STATE =================
  const [localProjects, setLocalProjects] = useState([]);
  const projects = parentProjects.length > 0 ? parentProjects : localProjects;
  const [selectedProject, setSelectedProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiSource, setApiSource] = useState('express');

  // Decomposition & Workflow State
  // View Modes: 'backlog' | 'decomposition_review' | 'allocation_results'
  const [viewMode, setViewMode] = useState('backlog');
  const [workItems, setWorkItems] = useState([]);
  const [ruleAnalysis, setRuleAnalysis] = useState(null);

  // Sync parentSelectedProjectId to selectedProject
  useEffect(() => {
    if (projects.length > 0) {
      const match = projects.find(
        p => String(p.project_id) === String(parentSelectedProjectId) || String(p.id) === String(parentSelectedProjectId)
      );
      setSelectedProject(prev => match || prev || projects[0]);
    }
  }, [projects, parentSelectedProjectId]);

  const handleSelectProject = (proj) => {
    setSelectedProject(proj);
    const pid = proj ? (proj.project_id || proj.id) : '';
    if (onSelectProject && pid) {
      onSelectProject(pid);
    }
  };

  // ================= LOAD PROJECTS FALLBACK =================
  useEffect(() => {
    if (parentProjects.length === 0) {
      axios.get(`${EXPRESS_API}/projects`)
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.projects || res.data?.data || []);
          setLocalProjects(list);
          setSelectedProject(prev => prev || (list.length > 0 ? list[0] : null));
        })
        .catch(err => console.error('Error loading projects:', err));
    }
  }, [parentProjects]);

  // ================= LOAD DEVELOPERS =================
  useEffect(() => {
    const projId = selectedProject ? (selectedProject.id || selectedProject.project_id) : '';
    const url = projId ? `${EXPRESS_API}/developers?project_id=${projId}` : `${EXPRESS_API}/developers`;
    axios.get(url)
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setDevelopers(list);
      })
      .catch(err => console.error('Error loading developers:', err));
  }, [selectedProject]);

  // ================= LOAD SPRINTS FOR SELECTED PROJECT =================
  useEffect(() => {
    if (!selectedProject) {
      setSprints([]);
      setSelectedSprint(null);
      return;
    }
    const projId = selectedProject.id || selectedProject.project_id;

    const fetchSprints = async () => {
      try {
        let list = [];
        try {
          const spRes = await axios.get(`${EXPRESS_API}/projects/${projId}/sprints`);
          list = Array.isArray(spRes.data) ? spRes.data : (spRes.data?.data || []);
        } catch (e) {}

        if (!list || list.length === 0) {
          let planRes = await axios.get(`${EXPRESS_API}/sprint-plan?project_id=${projId}`);
          let tasksFromPlan = planRes.data?.tasks || [];
          const sprintMap = {};
          tasksFromPlan.forEach(t => {
            const sNum = t.sprint_number || 1;
            if (!sprintMap[sNum]) {
              const sprintId = t.sprint_id || `SPR-${sNum < 10 ? '0' + sNum : sNum}`;
              sprintMap[sNum] = {
                id: sprintId,
                sprint_id: sprintId,
                name: `Sprint ${sNum}`,
                sprint_name: `Sprint ${sNum}`,
                sprint_number: sNum
              };
            }
          });
          list = Object.values(sprintMap).sort((a, b) => a.sprint_number - b.sprint_number);
        }

        if (!list || list.length === 0) {
          list = [
            { id: 'SPR-01', sprint_id: 'SPR-01', name: 'Sprint 1 - Core Development', sprint_name: 'Sprint 1', sprint_number: 1 },
            { id: 'SPR-02', sprint_id: 'SPR-02', name: 'Sprint 2 - Integration & Testing', sprint_name: 'Sprint 2', sprint_number: 2 }
          ];
        }

        setSprints(list);
        setSelectedSprint(prev => {
          if (prev && list.some(s => String(s.sprint_id || s.id) === String(prev.sprint_id || prev.id))) {
            return prev;
          }
          return list[0] || null;
        });
      } catch (err) {
        console.warn('Notice loading sprints:', err.message);
      }
    };

    fetchSprints();
  }, [selectedProject]);

  // ================= LOAD ALL PROJECT USER STORIES FOR RESOURCE ALLOCATION =================
  useEffect(() => {
    if (!selectedProject) return;
    const projId = selectedProject.id || selectedProject.project_id;
    setLoading(true);

    const fetchProjectStories = async () => {
      try {
        const res = await axios.get(`${EXPRESS_API}/user-stories?project_id=${projId}`);
        const rawStories = Array.isArray(res.data) ? res.data : (res.data?.data || []);

        let loadedTasks = [];
        if (rawStories.length > 0) {
          loadedTasks = rawStories.map((t, idx) => {
            const taskTitle = t.title || t.user_story || 'User Story Requirement';
            const domainAndSkills = extractDomainAndSkills(taskTitle);
            return {
              id: t.story_id || t.user_story_id || `US00${idx + 1}`,
              story_id: t.story_id || t.user_story_id || `US00${idx + 1}`,
              title: taskTitle,
              priority: (t.priority || 'MEDIUM').toUpperCase(),
              hours: (Number(t.story_points) || 5) * 6,
              estimated_hours: (Number(t.story_points) || 5) * 6,
              points: Number(t.story_points) || 5,
              story_points: Number(t.story_points) || 5,
              domain: domainAndSkills.domain,
              required_domain: domainAndSkills.required_domain,
              skills: domainAndSkills.skills,
              required_skills: domainAndSkills.required_skills,
              is_resource_allocated: t.is_resource_allocated || false,
              assigned_to: t.assigned_to || 'Unassigned'
            };
          });
        }

        setTasks(loadedTasks);
        setApiSource('express');

        // Fetch existing work items for these project user stories
        try {
          const wiRes = await axios.get(`${EXPRESS_API}/work-items?project_id=${projId}`);
          const fetchedWIs = Array.isArray(wiRes.data) ? wiRes.data : (wiRes.data?.data || []);
          setWorkItems(fetchedWIs);
        } catch (wiErr) {
          console.warn('Notice fetching work items:', wiErr.message);
        }
      } catch (err) {
        console.error('Error loading project stories:', err);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectStories();
    setAssignments([]);
    setViewMode('backlog');
  }, [selectedProject]);

  // ================= 1 & 2. HYBRID USER STORY DECOMPOSITION =================
  const handleDecomposeStories = async (targetTask) => {
    const isSingleTask = targetTask && typeof targetTask === 'object' && Boolean(targetTask.story_id || targetTask.id) && !targetTask.preventDefault;
    const storiesToDecompose = isSingleTask ? [targetTask] : tasks;
    if (storiesToDecompose.length === 0) {
      alert('No user stories found in this sprint to decompose.');
      return;
    }
    setLoading(true);
    try {
      const pid = selectedProject ? (selectedProject.id || selectedProject.project_id) : 'P00001';
      const response = await axios.post(`${EXPRESS_API}/user-stories/decompose-batch`, {
        stories: storiesToDecompose,
        project_id: pid
      });

      if (response.data && response.data.results) {
        const generatedItems = [];
        let combinedRules = { patterns_detected: [] };

        response.data.results.forEach(res => {
          if (res.work_items) {
            generatedItems.push(...res.work_items);
          }
          if (res.rule_analysis && res.rule_analysis.patterns_detected) {
            res.rule_analysis.patterns_detected.forEach(p => {
              if (!combinedRules.patterns_detected.includes(p)) {
                combinedRules.patterns_detected.push(p);
              }
            });
          }
        });

        setWorkItems(generatedItems);
        setRuleAnalysis(combinedRules);
        setViewMode('decomposition_review');
      }
    } catch (err) {
      console.error('Decomposition error:', err);
      alert('Failed to decompose User Stories: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // ================= 3. HUMAN-IN-THE-LOOP VALIDATION HANDLERS =================
  const handleUpdateWorkItem = async (updatedItem) => {
    try {
      await axios.put(`${EXPRESS_API}/work-items/${updatedItem.work_item_id}`, updatedItem);
      setWorkItems(prev => prev.map(wi => wi.work_item_id === updatedItem.work_item_id ? updatedItem : wi));
    } catch (err) {
      console.error('Error updating work item:', err);
      alert('Failed to update work item: ' + err.message);
    }
  };

  const handleDeleteWorkItem = async (workItemId) => {
    try {
      await axios.delete(`${EXPRESS_API}/work-items/${workItemId}`);
      setWorkItems(prev => prev.filter(wi => wi.work_item_id !== workItemId));
    } catch (err) {
      console.error('Error deleting work item:', err);
      alert('Failed to delete work item: ' + err.message);
    }
  };

  const handleAddWorkItem = async (newItem) => {
    try {
      const pid = selectedProject ? (selectedProject.id || selectedProject.project_id) : 'P00001';
      const itemToSave = { ...newItem, project_id: pid };
      const res = await axios.post(`${EXPRESS_API}/work-items`, itemToSave);
      setWorkItems(prev => [...prev, { ...itemToSave, work_item_id: res.data?.work_item_id || newItem.work_item_id }]);
    } catch (err) {
      console.error('Error adding work item:', err);
      alert('Failed to add work item: ' + err.message);
    }
  };

  const handleApproveAllWorkItems = async () => {
    try {
      const pid = selectedProject ? (selectedProject.id || selectedProject.project_id) : 'P00001';
      const workItemIds = workItems.map(w => w.work_item_id);
      await axios.post(`${EXPRESS_API}/work-items/approve`, {
        work_item_ids: workItemIds,
        project_id: pid
      });
      setWorkItems(prev => prev.map(wi => ({ ...wi, status: 'approved' })));
      alert('✅ All Work Items approved! You can now proceed to Resource Allocation.');
    } catch (err) {
      console.error('Error approving work items:', err);
      alert('Failed to approve work items: ' + err.message);
    }
  };

  // ================= 4. INTEGRATION WITH EXISTING RESOURCE ALLOCATION =================
  const runAllocation = async () => {
    if (developers.length === 0) {
      alert('No developers found. Please add developers first.');
      return;
    }

    // Determine tasks for allocation: If work items exist, pass approved Work Items into existing allocation algorithm
    let itemsToAllocate = [];
    if (workItems && workItems.length > 0) {
      itemsToAllocate = workItems.map(wi => {
        const parentStory = tasks.find(t => t.story_id === wi.story_id || t.id === wi.story_id) || {};
        return {
          story_id: wi.work_item_id,
          user_story_id: wi.story_id,
          title: `${wi.work_item_id}: ${wi.title}`,
          description: wi.description,
          priority: parentStory.priority || 'MEDIUM',
          estimated_hours: Number(wi.estimated_hours) || 8,
          story_points: Number(wi.story_points) || 1,
          domain: (wi.domain || 'Backend').toLowerCase(),
          required_domain: (wi.domain || 'Backend').toLowerCase(),
          skills: Array.isArray(wi.required_skills) ? wi.required_skills : (wi.required_skills ? String(wi.required_skills).split(',').map(s => s.trim()) : ['JavaScript', 'SQL']),
          required_skills: Array.isArray(wi.required_skills) ? wi.required_skills : (wi.required_skills ? String(wi.required_skills).split(',').map(s => s.trim()) : ['JavaScript', 'SQL'])
        };
      });
    } else {
      itemsToAllocate = tasks;
    }

    if (itemsToAllocate.length === 0) {
      alert('No tasks or work items found for allocation.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${EXPRESS_API}/allocate`, {
        tasks: itemsToAllocate,
        sprint_id: selectedSprint ? (selectedSprint.id || selectedSprint.sprint_id) : null,
        project_id: selectedProject ? (selectedProject.id || selectedProject.project_id) : null
      });
      const allocs = response.data?.assignments || response.data?.data || [];
      setAssignments(allocs);
      setViewMode('allocation_results');
    } catch (error) {
      console.error('Allocation error:', error);
      alert('Allocation failed: ' + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  // ================= REBALANCE =================
  const handleRebalance = async () => {
    setLoading(true);
    try {
      let itemsToAllocate = workItems.length > 0 ? workItems.map(wi => ({
        story_id: wi.work_item_id,
        user_story_id: wi.story_id,
        title: `${wi.work_item_id}: ${wi.title}`,
        priority: 'MEDIUM',
        estimated_hours: Number(wi.estimated_hours) || 8,
        domain: (wi.domain || 'Backend').toLowerCase(),
        required_domain: (wi.domain || 'Backend').toLowerCase(),
        skills: wi.required_skills || ['JavaScript', 'SQL'],
        required_skills: wi.required_skills || ['JavaScript', 'SQL']
      })) : tasks;

      const response = await axios.post(`${EXPRESS_API}/allocate`, {
        tasks: itemsToAllocate,
        sprint_id: selectedSprint ? (selectedSprint.id || selectedSprint.sprint_id) : null
      });
      const allocs = response.data?.assignments || response.data?.data || [];
      setAssignments(allocs);
    } catch (error) {
      console.error('Rebalance error:', error);
      alert('Rebalance failed: ' + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  // ================= SAVE ALLOCATION =================
  const handleSaveAllocation = async () => {
    try {
      const pid = selectedProject ? (selectedProject.project_id || selectedProject.id) : 'P00001';
      const projName = selectedProject ? (selectedProject.project_name || selectedProject.name || selectedProject.title) : 'Project Tracker';
      const spId = selectedSprint ? (selectedSprint.id || selectedSprint.sprint_id) : 'SPR-01';

      const res = await axios.post(`${EXPRESS_API}/task-assignments`, {
        sprint_id: spId,
        project_id: pid,
        project_name: projName,
        assignments: assignments
      });

      const confirmedProject = res.data?.project_name || projName;
      alert(`✅ Resource allocations saved to database for project "${confirmedProject}" (${pid})!\n\nUser stories and allocated work items are now ready for Sprint Planning in Module 3 (Project Management).`);
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save allocation: ' + (error.response?.data?.error || error.message));
    }
  };

  // ================= DRAG & DROP =================
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

  // ================= BACK TO TASKS =================
  const handleBackToTasks = () => {
    setViewMode('backlog');
  };

  // Map tasks with decomposed work items for TaskPreview (deduplicated by domain)
  const getUniqueWorkItemsForTask = (tId) => {
    const cleanTId = String(tId || '').replace(/[^a-zA-Z0-9]/g, '');
    const matched = workItems.filter(wi => {
      const cleanWiStoryId = String(wi.story_id || wi.parent_user_story_id || '').replace(/[^a-zA-Z0-9]/g, '');
      return cleanWiStoryId === cleanTId;
    });

    const seenDomains = new Set();
    const unique = [];
    for (const item of matched) {
      const domUpper = (item.domain || '').toUpperCase();
      let normDomain = domUpper;
      if (domUpper.includes('BACKEND')) normDomain = 'BACKEND';
      else if (domUpper.includes('FRONTEND')) normDomain = 'FRONTEND';
      else if (domUpper.includes('QA') || domUpper.includes('TESTING')) normDomain = 'QA';
      else if (domUpper.includes('DEVOPS')) normDomain = 'DEVOPS';
      else if (domUpper.includes('AI') || domUpper.includes('ML')) normDomain = 'AI';

      if (!seenDomains.has(normDomain)) {
        seenDomains.add(normDomain);
        unique.push(item);
      }
    }
    return unique;
  };

  const tasksWithWorkItems = tasks.map(t => ({
    ...t,
    work_items: getUniqueWorkItemsForTask(t.story_id || t.id)
  }));

  const approvedWorkItemsCount = workItems.filter(w => w.status === 'approved').length;

  // ================= RENDER =================
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
              <Users size={14} className="text-indigo-300" />
              <span>Sprint Resource Allocation System</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Sprint Resource Allocation Module
            </h1>
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
              projects={projects}
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

        {/* VIEW MODE SWITCHING */}
        {viewMode === 'backlog' && selectedProject && (
          <TaskPreview
            tasks={tasksWithWorkItems}
            onRunAllocation={runAllocation}
            onDecomposeStories={handleDecomposeStories}
            onReviewWorkItems={() => setViewMode('decomposition_review')}
            hasWorkItems={workItems.length > 0}
            approvedWorkItemsCount={approvedWorkItemsCount}
            loading={loading}
            apiSource={apiSource}
            apiStatus={{ pooliyadda: false, express: true }}
          />
        )}

        {viewMode === 'decomposition_review' && selectedProject && (
          <WorkItemDecompositionReview
            workItems={workItems}
            ruleAnalysis={ruleAnalysis}
            onUpdateWorkItem={handleUpdateWorkItem}
            onDeleteWorkItem={handleDeleteWorkItem}
            onAddWorkItem={handleAddWorkItem}
            onApproveAll={handleApproveAllWorkItems}
            onProceedToAllocation={runAllocation}
            onBack={() => setViewMode('backlog')}
            loading={loading}
          />
        )}

        {viewMode === 'allocation_results' && (
          <AllocationResults
            assignments={assignments}
            developers={developers}
            tasks={workItems.length > 0 ? workItems : tasks}
            selectedProject={selectedProject}
            selectedSprint={selectedSprint}
            onRebalance={handleRebalance}
            onSave={handleSaveAllocation}
            onTaskMove={handleTaskMove}
            onBack={() => setViewMode('decomposition_review')}
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
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Choose a project to view and decompose User Stories</p>
          </div>
        )}
      </div>

      {/* Footer Status */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-700">
          <Info size={14} />
          <span>Status: Hybrid User Story Decomposition Preprocessing Active</span>
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          Powered by Capacity & Priority-Aware Allocation Engine
        </div>
      </div>
    </div>
  );
}
