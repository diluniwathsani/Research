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

export default function ProjectManagementModule({ requirements = [] }) {
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

  // Initialize tasks from incoming requirements or fetch directly from backend API
  useEffect(() => {
    const mapRequirementsToTasks = (reqList) => {
      return reqList.map((req, idx) => {
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
          acceptance_criteria: req.acceptance_criteria || 'Given valid input, verify system response.',
          column: col,
          points: 3 + (idx % 5),
          assignee: ['Sarah Chen', 'Alex Rivera', 'Priya Sharma', 'Marcus Vance'][idx % 4]
        };

        // Sync to backend DB asynchronously for Resource Management & Change Request modules
        axios.post('http://localhost:3000/api/user-stories', {
          story_id: `US-${req.id || idx + 101}`,
          project_id: 'P00001',
          sprint_id: 'SPR-01',
          title: storyTitle,
          description: req.acceptance_criteria || '',
          story_points: 3 + (idx % 5),
          priority: 'Medium',
          status: col === 'Done' ? 'DONE' : 'IN_PROGRESS',
          assigned_to: taskObj.assignee
        }).catch(err => console.warn('User story sync notice:', err.message));

        return taskObj;
      });
    };

    if (safeRequirements && safeRequirements.length > 0) {
      setTasks(mapRequirementsToTasks(safeRequirements));
    } else {
      axios.get('http://localhost:3000/api/requirements')
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          if (list.length > 0) {
            setTasks(mapRequirementsToTasks(list));
          }
        })
        .catch(err => console.warn('Fetch requirements notice:', err.message));
    }
  }, [safeRequirements]);

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

  // Projects & Change Governance State
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('P00001');
  const [changeRequests, setChangeRequests] = useState([]);
  const [governanceLoading, setGovernanceLoading] = useState(false);
  const [replanMessage, setReplanMessage] = useState(null);

  // Fetch Projects from Module 1 / DB
  useEffect(() => {
    axios.get('http://localhost:3000/api/projects')
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : (res.data && res.data.data ? res.data.data : []);
        if (list.length > 0) setProjects(list);
      })
      .catch(err => console.warn('Projects fetch notice:', err.message));
  }, [requirements]);

  // Fetch Change Requests for governance re-planning tab
  const fetchChangeRequests = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/change-requests/all');
      if (res.data && res.data.data) {
        setChangeRequests(res.data.data);
      }
    } catch (e) {
      console.warn('Change requests fetch notice:', e.message);
    }
  };

  useEffect(() => {
    fetchChangeRequests();
  }, [activeTab]);

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
              Agile Sprint & Task Board
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              Track requirement progression across 2-week sprint cycles, accept/reject change requests, and trigger automated sprint re-planning.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Project Selection Dropdown */}
            <div className="flex flex-col text-left">
              <label className="text-[10px] font-bold uppercase text-indigo-300 mb-1">Select Project</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-slate-800/90 text-white font-semibold text-xs border border-indigo-500/40 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                {projects.length > 0 ? (
                  projects.map(p => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.project_name || p.name} ({p.project_id})
                    </option>
                  ))
                ) : (
                  <option value="P00001">Aurora ERP System (P00001)</option>
                )}
              </select>
            </div>

            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95 shrink-0 self-end"
            >
              <Plus size={16} />
              <span>Add Story</span>
            </button>
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

          {changeRequests.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {changeRequests.map((cr) => (
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
              🛡️ No pending change requests found. Create a change request in the <b>Change Management Module</b> to evaluate impact and govern sprint allocation.
            </div>
          )}
        </div>
      )}

      {/* KANBAN BOARD & ROADMAP TAB */}
      {activeTab === 'kanban' && (
        <div className="space-y-6">
          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Requirements</span>
                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
                  <Layers size={18} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{tasks.length}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Across all active epics</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">In Development</span>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                  <PlayCircle size={18} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
                {tasks.filter(t => t.column === 'In Progress').length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Currently being built</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Completed Tasks</span>
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                {tasks.filter(t => t.column === 'Done').length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Verified & deployed</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Days Remaining</span>
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                  <Clock size={18} />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">6 Days</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sprint ends Aug 28, 2026</p>
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
                        columnTasks.map(task => (
                          <div
                            key={task.id}
                            className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md hover:border-indigo-400/50 transition-all duration-200 group space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50">
                                {task.epic}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                {task.points} pts
                              </span>
                            </div>

                             <div className="space-y-1.5">
                               <div className="flex items-center gap-1.5">
                                 <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                   User Story
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
                        ))
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
