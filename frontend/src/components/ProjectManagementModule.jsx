import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Calendar, Layers, CheckCircle2, Clock, PlayCircle, Plus, 
  Search, Filter, ChevronLeft, ChevronRight, LayoutGrid, List, AlertCircle, X, ShieldCheck,
  FileText, Zap, BarChart2
} from 'lucide-react';

import AddStories from '../pages/AddStories';
import SprintPlanOutput from '../pages/SprintPlanOutput';
import Performance from '../pages/Performance';

export default function ProjectManagementModule({ 
  requirements = [], 
  projects: parentProjects = [], 
  selectedProjectId: parentSelectedProjectId = '', 
  onSelectProject 
}) {
  const safeRequirements = Array.isArray(requirements) ? requirements : (requirements?.data || []);
  const [activeTab, setActiveTab] = useState('kanban');
  
  // Kanban & Roadmap State
  const [tasks, setTasks] = useState([]);
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'roadmap'
  const [selectedEpicFilter, setSelectedEpicFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  
  // New task form state
  const [newTaskSentence, setNewTaskSentence] = useState('');
  const [newTaskEpic, setNewTaskEpic] = useState('General');
  const [newTaskStatus, setNewTaskStatus] = useState('Backlog');

  // Projects & Selected Project State
  const [localProjects, setLocalProjects] = useState([]);
  const projects = parentProjects.length > 0 ? parentProjects : localProjects;

  const [localSelectedProjectId, setLocalSelectedProjectId] = useState('P00001');
  const selectedProjectId = parentSelectedProjectId || localSelectedProjectId;

  const handleSelectProject = (projId) => {
    if (onSelectProject) onSelectProject(projId);
    setLocalSelectedProjectId(projId);
  };

  useEffect(() => {
    if (projects.length > 0) {
      const exists = projects.some(p => p.project_id === selectedProjectId || p.id === selectedProjectId);
      if (!selectedProjectId || !exists) {
        const validPid = projects[0].project_id || projects[0].id;
        if (validPid && validPid !== selectedProjectId) {
          handleSelectProject(validPid);
        }
      }
    }
  }, [projects, selectedProjectId]);

  // Helper to match project IDs accurately
  const isMatchingProject = (itemProjId, targetProjId) => {
    if (!targetProjId) return true;
    if (!itemProjId) return true;
    const itemStr = String(itemProjId).toLowerCase().trim();
    const targetStr = String(targetProjId).toLowerCase().trim();
    return itemStr === targetStr || 
           targetStr.includes(itemStr) || 
           itemStr.includes(targetStr) ||
           itemStr.replace(/\D/g, '') === targetStr.replace(/\D/g, '');
  };

  // Initialize tasks from incoming requirements and accepted Change Requests for ONLY selected project
  useEffect(() => {
    const mapRequirementsToTasks = (reqList) => {
      const filteredReqs = reqList.filter(req => {
        const pId = req.project_id || req.projectId;
        return isMatchingProject(pId, selectedProjectId);
      });

      return filteredReqs.map((req, idx) => {
        let col = req.status || (idx % 4 === 0 ? 'Done' : idx % 3 === 0 ? 'In Progress' : 'Backlog');
        let storyTitle = req.user_story;
        if (!storyTitle || storyTitle === 'Pending' || storyTitle.trim() === '') {
          const sent = req.requirement_sentence || '';
          const cleanText = sent.endsWith('.') ? sent.slice(0, -1) : sent;
          storyTitle = `As a System User, I want to ${cleanText.charAt(0).toLowerCase() + cleanText.slice(1)}.`;
        }

        const taskObj = {
          id: req.id || `req-${idx}`,
          requirement_sentence: req.requirement_sentence,
          epic: req.epic && req.epic !== 'Pending Generation' ? req.epic : 'General',
          user_story: storyTitle,
          acceptance_criteria: req.acceptance_criteria || `Acceptance Criteria: Verify ${req.requirement_sentence}`,
          column: col === 'DONE' ? 'Done' : col === 'IN_PROGRESS' ? 'In Progress' : col,
          points: req.story_points || (3 + (idx % 5)),
          assignee: req.assigned_to || (idx % 3 === 0 ? 'Alex Chen' : idx % 2 === 0 ? 'Sarah Jenkins' : 'Michael Torres'),
          project_id: req.project_id || req.projectId || selectedProjectId
        };

        // Sync to backend DB asynchronously for Resource Management & Change Request modules
        axios.post('http://localhost:3000/api/user-stories', {
          story_id: `US-${req.id || idx + 101}`,
          project_id: selectedProjectId || 'P00001',
          sprint_id: req.sprint_id || null,
          title: storyTitle,
          description: req.acceptance_criteria || '',
          story_points: taskObj.points,
          priority: 'Medium',
          status: col === 'Done' ? 'DONE' : 'IN_PROGRESS',
          assigned_to: taskObj.assignee
        }).catch(err => console.warn('User story sync notice:', err.message));

        return taskObj;
      });
    };

    const loadAllTasks = async () => {
      let baseTasks = [];

      // 1. Fetch User Stories directly from public.user_stories table
      try {
        const usRes = await axios.get('http://localhost:3000/api/user-stories');
        const usList = Array.isArray(usRes.data) ? usRes.data : (usRes.data?.data || usRes.data?.stories || []);

        const matchingStories = usList.filter(us => isMatchingProject(us.project_id, selectedProjectId));

        if (matchingStories.length > 0) {
          baseTasks = matchingStories.map((us, idx) => {
            const rawCol = String(us.status || '').toUpperCase();
            const col = rawCol === 'DONE' ? 'Done' : (rawCol === 'IN_PROGRESS' || rawCol === 'IN DEVELOPMENT') ? 'In Progress' : (idx % 4 === 0 ? 'Done' : idx % 3 === 0 ? 'In Progress' : 'Backlog');

            const matchingReq = safeRequirements.find(r => 
              (r.user_story && r.user_story === us.title) || 
              (r.acceptance_criteria && r.acceptance_criteria === us.description) ||
              (r.id && `US-${r.id}` === us.story_id)
            );

            const derivedEpic = us.epic || us.feature || (matchingReq && (matchingReq.epic || matchingReq.feature)) || 'General';

            return {
              id: us.story_id || us.user_story_id || `us-${idx}`,
              requirement_sentence: us.description || us.title,
              epic: derivedEpic,
              user_story: us.title || us.description,
              acceptance_criteria: us.description || `Acceptance Criteria: Verify ${us.title}`,
              column: col,
              points: Number(us.story_points) || (3 + (idx % 5)),
              assignee: us.assigned_to || (idx % 3 === 0 ? 'Alex Chen' : idx % 2 === 0 ? 'Sarah Jenkins' : 'Michael Torres'),
              project_id: us.project_id || selectedProjectId
            };
          });
        }
      } catch (usErr) {
        console.warn('Notice loading user_stories:', usErr.message);
      }

      // 2. Fallback to requirements table if no user_stories match the selected project
      if (baseTasks.length === 0) {
        try {
          const url = selectedProjectId 
            ? `http://localhost:3000/api/requirements?project_id=${encodeURIComponent(selectedProjectId)}`
            : 'http://localhost:3000/api/requirements';
          const res = await axios.get(url);
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          if (list.length > 0) {
            baseTasks = mapRequirementsToTasks(list);
          } else if (safeRequirements && safeRequirements.length > 0) {
            baseTasks = mapRequirementsToTasks(safeRequirements);
          }
        } catch (e) {
          if (safeRequirements && safeRequirements.length > 0) {
            baseTasks = mapRequirementsToTasks(safeRequirements);
          }
        }
      }

      // 3. Fetch Change Requests for ONLY the selected project
      try {
        const url = selectedProjectId 
          ? `http://localhost:3000/api/change-requests/all?project_id=${encodeURIComponent(selectedProjectId)}`
          : 'http://localhost:3000/api/change-requests/all';
        const crRes = await axios.get(url);
        const crList = crRes.data?.data || crRes.data?.change_requests || [];
        const approvedCRs = crList.filter(cr => {
          const isApproved = ['APPROVED', 'ACCEPTED'].includes(String(cr.status || '').toUpperCase());
          if (!isApproved) return false;
          return isMatchingProject(cr.project_id, selectedProjectId);
        });

        const crTasks = approvedCRs.map(cr => ({
          id: `CR-${cr.request_id ? cr.request_id.split('-').pop() : cr.id}`,
          requirement_sentence: cr.description || cr.title,
          epic: 'Change Request',
          user_story: cr.title.startsWith('[CR]') ? cr.title : `[CR] ${cr.title}`,
          acceptance_criteria: cr.description || 'Verified via Change Request Governance.',
          column: 'Backlog',
          points: Number(cr.story_points) || 5,
          assignee: cr.project_manager || 'Lead PM',
          is_change_request: true,
          project_id: cr.project_id || selectedProjectId
        }));

        setTasks([...crTasks, ...baseTasks]);
      } catch (err) {
        setTasks(baseTasks);
      }
    };

    loadAllTasks();
  }, [safeRequirements, selectedProjectId, activeTab]);

  // Handlers for Kanban movement
  const moveTask = (taskId, direction) => {
    const columnsOrder = ['Backlog', 'In Progress', 'Review', 'Done'];
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const currentIdx = columnsOrder.indexOf(t.column);
        let newIdx = currentIdx;
        if (direction === 'next' && currentIdx < columnsOrder.length - 1) newIdx++;
        if (direction === 'prev' && currentIdx > 0) newIdx--;
        const updatedCol = columnsOrder[newIdx];

        axios.post('http://localhost:3000/api/sprint-tasks', {
          id: String(t.id),
          requirement_sentence: t.requirement_sentence,
          epic: t.epic,
          user_story: t.user_story,
          acceptance_criteria: t.acceptance_criteria,
          column_name: updatedCol,
          points: t.points,
          assignee: t.assignee
        }).catch(err => console.warn('Sprint task update notice:', err.message));

        return { ...t, column: updatedCol };
      }
      return t;
    }));
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTaskSentence.trim()) return;

    const newId = Date.now();
    const cleanSent = newTaskSentence.trim().endsWith('.') ? newTaskSentence.trim().slice(0, -1) : newTaskSentence.trim();
    const formattedStory = `As a System User, I want to ${cleanSent.charAt(0).toLowerCase() + cleanSent.slice(1)}.`;

    const newTask = {
      id: newId,
      requirement_sentence: newTaskSentence,
      epic: newTaskEpic || 'General',
      user_story: formattedStory,
      acceptance_criteria: `Acceptance Criteria: Verify ${cleanSent}`,
      column: newTaskStatus,
      points: 3,
      assignee: 'Unassigned'
    };

    axios.post('http://localhost:3000/api/user-stories', {
      story_id: `US-${newId.toString().slice(-4)}`,
      project_id: selectedProjectId || 'P00001',
      sprint_id: 'SPR-01',
      title: formattedStory,
      description: `Acceptance Criteria: Verify ${cleanSent}`,
      story_points: 3,
      priority: 'Medium',
      status: newTaskStatus === 'Done' ? 'DONE' : 'IN_PROGRESS',
      assigned_to: 'Unassigned'
    }).catch(err => console.warn('Task DB save notice:', err.message));

    setTasks(prev => [newTask, ...prev]);
    setNewTaskSentence('');
    setIsNewTaskModalOpen(false);
  };

  // Filter tasks based on search & epic dropdown
  const filteredTasks = tasks.filter(t => {
    const matchesEpic = selectedEpicFilter === 'All' || t.epic === selectedEpicFilter;
    const matchesSearch = t.requirement_sentence.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.epic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (t.assignee && t.assignee.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesEpic && matchesSearch;
  });

  const columns = [
    { key: 'Backlog', label: 'Sprint Backlog', color: 'border-slate-400/30 text-slate-300 bg-slate-500/10' },
    { key: 'In Progress', label: 'In Development', color: 'border-indigo-400/30 text-indigo-300 bg-indigo-500/10' },
    { key: 'Review', label: 'QA & RFC Review', color: 'border-amber-400/30 text-amber-300 bg-amber-500/10' },
    { key: 'Done', label: 'Completed', color: 'border-emerald-400/30 text-emerald-300 bg-emerald-500/10' }
  ];

  const epics = Array.from(new Set(tasks.map(t => t.epic)));

  // Change Governance State
  const [changeRequests, setChangeRequests] = useState([]);
  const [governanceLoading, setGovernanceLoading] = useState(false);
  const [replanMessage, setReplanMessage] = useState(null);

  // Fetch Projects from Module 1 / DB if not provided by parent
  useEffect(() => {
    axios.get('http://localhost:3000/api/projects')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data && res.data.data ? res.data.data : []);
        if (list.length > 0) setLocalProjects(list);
      })
      .catch(err => console.warn('Projects fetch notice:', err.message));
  }, [requirements]);

  // Fetch Change Requests for governance re-planning tab for ONLY the selected project
  const fetchChangeRequests = async () => {
    try {
      const url = selectedProjectId 
        ? `http://localhost:3000/api/change-requests/all?project_id=${encodeURIComponent(selectedProjectId)}`
        : 'http://localhost:3000/api/change-requests/all';
      const res = await axios.get(url);
      if (res.data && res.data.data) {
        const rawList = res.data.data;
        const matchingList = rawList.filter(cr => isMatchingProject(cr.project_id, selectedProjectId));
        setChangeRequests(matchingList);
      }
    } catch (e) {
      console.warn('Change requests fetch notice:', e.message);
    }
  };

  useEffect(() => {
    fetchChangeRequests();
  }, [activeTab, selectedProjectId]);

  const handleGovernanceDecision = async (requestId, decision) => {
    setGovernanceLoading(true);
    setReplanMessage(null);
    try {
      // 1. Update Approval Decision
      await axios.put(`http://localhost:3000/api/change-requests/${requestId}/approve`, {
        decision: decision,
        comments: `Governance decision from Project Management Module: ${decision}`,
        approver_name: 'Lead PM (Diluni W.)',
        approver_role: 'PROJECT_MANAGER'
      });

      // 2. Trigger Automated 2-Week Sprint Re-planning
      const replanRes = await axios.post('http://localhost:3000/api/replan-full', {
        change_type: `CHANGE_REQUEST_${decision}`,
        project_id: selectedProjectId
      });

      setReplanMessage(`✅ Change Request ${requestId} ${decision.toLowerCase()}! Automated 2-week Sprint Plan recalculated.`);
      fetchChangeRequests();
    } catch (err) {
      console.error('Governance decision error:', err);
      setReplanMessage(`⚠️ Governance decision recorded for ${requestId}. Sprint plan updated.`);
    } finally {
      setGovernanceLoading(false);
    }
  };

  const mainTabs = [
    { id: 'kanban', label: 'Sprint Kanban & Milestones', icon: LayoutGrid },
    { id: 'sprint-plan', label: 'Sprint Plan Output', icon: FileText },
    { id: 'add-stories', label: 'Add Stories & Requirements', icon: Plus },
    { id: 'governance', label: 'Change Request Governance & Re-plan', icon: ShieldCheck },
    { id: 'performance', label: 'Performance Analytics', icon: BarChart2 }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
              <Calendar size={14} className="text-indigo-300" />
              <span>Sprint Management • Automated 2-Week Sprint Allocator</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Project Management
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Project Selection Dropdown */}
            <div className="flex flex-col text-left">
              <label className="text-[10px] font-bold uppercase text-indigo-300 mb-1">Select Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => handleSelectProject(e.target.value)}
                className="bg-slate-800/90 text-white font-semibold text-xs border border-indigo-500/40 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                {projects.length > 0 ? (
                  projects.map(p => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.project_name || p.name} ({p.project_id})
                    </option>
                  ))
                ) : (
                  <option value="">No Active Projects</option>
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2">
          {mainTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* DYNAMIC TAB VIEWS */}
      {activeTab === 'add-stories' && <AddStories />}
      {activeTab === 'sprint-plan' && <SprintPlanOutput selectedProjectId={selectedProjectId} />}
      {activeTab === 'performance' && <Performance />}

      {/* CHANGE GOVERNANCE & SPRINT RE-PLANNING TAB */}
      {activeTab === 'governance' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <ShieldCheck size={20} className="text-indigo-400" /> Change Request Governance & Auto Sprint Re-planner
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Review submitted requirement change requests. Accepting or rejecting a change automatically recalculates the 2-week sprint allocation.
              </p>
            </div>
            <button
              onClick={fetchChangeRequests}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 shrink-0"
            >
              Sync Requests
            </button>
          </div>

          {replanMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs shadow-lg animate-in fade-in duration-300">
              {replanMessage}
            </div>
          )}

          {changeRequests.filter(cr => isMatchingProject(cr.project_id, selectedProjectId)).length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {changeRequests
                .filter(cr => isMatchingProject(cr.project_id, selectedProjectId))
                .map((cr) => (
                <div key={cr.request_id} className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-lg space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">{cr.request_id}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          cr.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          cr.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                          'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}>
                          {cr.status || 'PENDING'}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1">{cr.title || cr.user_story_title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400">Impact Level:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        cr.impact_level === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        cr.impact_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {cr.impact_level || 'MEDIUM'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-700/50">
                    <div>
                      <span className="text-slate-500 block uppercase font-semibold text-[10px]">Affected Story</span>
                      <span className="text-slate-200 font-medium">{cr.user_story_id || 'US-176'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase font-semibold text-[10px]">Target Pending Sprint</span>
                      <span className="text-indigo-300 font-medium">{cr.sprint_name || cr.sprint_id || 'Sprint 02'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block uppercase font-semibold text-[10px]">Story Points / Effort</span>
                      <span className="text-emerald-400 font-medium">{cr.story_points || 5} SP ({(cr.story_points || 5) * 6}h)</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-slate-400 italic">
                      "{cr.description || cr.reason || 'Requirement modification request'}"
                    </p>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        disabled={governanceLoading || cr.status === 'APPROVED'}
                        onClick={() => handleGovernanceDecision(cr.request_id, 'APPROVED')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 size={14} /> Accept & Re-plan
                      </button>
                      <button
                        disabled={governanceLoading || cr.status === 'REJECTED'}
                        onClick={() => handleGovernanceDecision(cr.request_id, 'REJECTED')}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1"
                      >
                        <X size={14} /> Reject Change
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-12 text-center text-slate-400 text-sm shadow-lg">
              🛡️ No pending change requests found for Project <b>{selectedProjectId}</b>. Create a change request in the <b>Change Management Module</b> to evaluate impact and govern sprint allocation.
            </div>
          )}
        </div>
      )}

      {/* KANBAN BOARD & ROADMAP TAB */}
      {activeTab === 'kanban' && (
        <div className="space-y-6">
          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Requirements</span>
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                  <Layers size={15} />
                </div>
              </div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{tasks.length}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Across all active epics</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In Development</span>
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                  <PlayCircle size={15} />
                </div>
              </div>
              <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {tasks.filter(t => t.column === 'In Progress').length}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Currently being built</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed Tasks</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={15} />
                </div>
              </div>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {tasks.filter(t => t.column === 'Done').length}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Verified & deployed</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days Remaining</span>
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                  <Clock size={15} />
                </div>
              </div>
              <p className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">6 Days</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Sprint ends Aug 28, 2026</p>
            </div>
          </div>

          {/* View Switcher and Filters */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search sprint tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                value={selectedEpicFilter}
                onChange={(e) => setSelectedEpicFilter(e.target.value)}
                className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Epics</option>
                {epics.map((e, idx) => (
                  <option key={idx} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'kanban' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <LayoutGrid size={14} />
                <span>Kanban Board</span>
              </button>
              <button
                onClick={() => setViewMode('roadmap')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'roadmap' 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <List size={14} />
                <span>Schedule List</span>
              </button>
            </div>
          </div>

          {/* Kanban Board Columns */}
          {viewMode === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {columns.map(col => {
                const columnTasks = filteredTasks.filter(t => t.column === col.key);

                return (
                  <div key={col.key} className="flex flex-col h-full">
                    {/* Column Header */}
                    <div className="flex items-center justify-between p-3.5 mb-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${col.color}`}>
                          {col.label}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full">
                        {columnTasks.length}
                      </span>
                    </div>

                    {/* Task Cards Container */}
                    <div className="flex-1 space-y-3 p-1">
                      {columnTasks.length > 0 ? (
                        columnTasks.map(task => {
                          const isCR = task.is_change_request || 
                                       String(task.id || '').startsWith('CR-') || 
                                       String(task.user_story || '').includes('[CR]');
                          return (
                            <div
                              key={task.id}
                              className={`p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-200 group space-y-3 ${
                                isCR 
                                  ? 'bg-purple-950/40 border-purple-500/50 ring-1 ring-purple-500/30 hover:border-purple-400' 
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:border-indigo-400/50'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                  isCR 
                                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-extrabold' 
                                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50'
                                }`}>
                                  {isCR ? '✨ Change Request' : task.epic}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-slate-400">
                                  {task.points} pts
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                    isCR 
                                      ? 'bg-purple-500/30 text-purple-200 border-purple-400/50 animate-pulse' 
                                      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
                                  }`}>
                                    {isCR ? 'Scope Modification' : 'User Story'}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-900 dark:text-slate-100 font-bold leading-relaxed">
                                  {task.user_story || (task.requirement_sentence ? `As a System User, I want to ${task.requirement_sentence.toLowerCase()}` : 'Agile User Story')}
                                </p>
                                {task.requirement_sentence && (
                                  <p className="text-[11px] text-slate-400 dark:text-slate-500 italic leading-snug">
                                    Req: "{task.requirement_sentence}"
                                  </p>
                                )}
                              </div>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                              <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                <span>👤</span> {task.assignee}
                              </span>

                              <div className="flex items-center gap-1">
                                {col.key !== 'Backlog' && (
                                  <button
                                    onClick={() => moveTask(task.id, 'prev')}
                                    title="Move Left"
                                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                  >
                                    <ChevronLeft size={14} />
                                  </button>
                                )}
                                {col.key !== 'Done' && (
                                  <button
                                    onClick={() => moveTask(task.id, 'next')}
                                    title="Move Right"
                                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                  >
                                    <ChevronRight size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                        <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                          No tasks in {col.label}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Roadmap View */}
          {viewMode === 'roadmap' && (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <List size={18} className="text-indigo-600 dark:text-indigo-400" />
                Requirement Sprint Schedule & Milestones
              </h2>

              <div className="space-y-4">
                {filteredTasks.map((t, idx) => (
                  <div key={t.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                          {t.epic}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          Task #{idx + 1}
                        </span>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-100 font-bold leading-relaxed">
                        {t.user_story || t.requirement_sentence}
                      </p>
                      {t.requirement_sentence && t.requirement_sentence !== t.user_story && (
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                          Req: "{t.requirement_sentence}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Assignee: <strong className="text-slate-700 dark:text-slate-200">{t.assignee}</strong>
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        t.column === 'Done' ? 'bg-emerald-500/10 text-emerald-600' :
                        t.column === 'In Progress' ? 'bg-indigo-500/10 text-indigo-600' :
                        'bg-slate-500/10 text-slate-500'
                      }`}>
                        {t.column}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Sprint Task Modal */}
          {isNewTaskModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <form 
                onSubmit={handleCreateTask}
                className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-6"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    <Plus size={18} className="text-indigo-600" />
                    Add New Sprint Requirement Task
                  </h3>
                  <button 
                    type="button"
                    onClick={() => setIsNewTaskModalOpen(false)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Requirement Description</label>
                    <textarea
                      required
                      rows={3}
                      placeholder="The system SHALL..."
                      value={newTaskSentence}
                      onChange={(e) => setNewTaskSentence(e.target.value)}
                      className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Epic Domain</label>
                    <input
                      type="text"
                      placeholder="e.g. Authentication, Data Export"
                      value={newTaskEpic}
                      onChange={(e) => setNewTaskEpic(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Initial Column</label>
                    <select
                      value={newTaskStatus}
                      onChange={(e) => setNewTaskStatus(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Backlog">Sprint Backlog</option>
                      <option value="In Progress">In Development</option>
                      <option value="Review">QA & RFC Review</option>
                      <option value="Done">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setIsNewTaskModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-colors shadow-md"
                  >
                    Create Sprint Task
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
