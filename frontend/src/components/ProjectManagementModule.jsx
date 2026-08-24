import React, { useState, useEffect } from 'react';
import { 
  Calendar, Code, Layers, CheckCircle2, Clock, PlayCircle, Plus, 
  Search, Filter, ChevronLeft, ChevronRight, LayoutGrid, List, AlertCircle, X, ShieldCheck,
  LayoutDashboard, FileText, Zap, BarChart2
} from 'lucide-react';

import DashboardView from './DashboardView';
import AddStories from '../pages/AddStories';
import SprintPlanOutput from '../pages/SprintPlanOutput';
import Performance from '../pages/Performance';

export default function ProjectManagementModule({ requirements = [] }) {
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

  // Initialize tasks from incoming requirements or defaults
  useEffect(() => {
    if (requirements.length > 0) {
      const initial = requirements.map((req, idx) => {
        let col = 'Backlog';
        if (req.completeness_status === 'Complete') {
          col = idx % 2 === 0 ? 'Done' : 'Review';
        } else if (req.completeness_status === 'Completed by User') {
          col = 'In Progress';
        } else {
          col = idx % 3 === 0 ? 'In Progress' : 'Backlog';
        }
        return {
          id: req.id || `req-${idx}`,
          requirement_sentence: req.requirement_sentence,
          epic: req.epic || 'Unassigned',
          user_story: req.user_story || 'As a system user, I want this feature implemented.',
          acceptance_criteria: req.acceptance_criteria || 'Given valid input, verify system response.',
          column: col,
          points: 3 + (idx % 5),
          assignee: ['Sarah Chen', 'Alex Rivera', 'Priya Sharma', 'Marcus Vance'][idx % 4]
        };
      });
      setTasks(initial);
    } else {
      // Default initial tasks if none loaded yet
      setTasks([
        {
          id: 1,
          requirement_sentence: 'The system SHALL authenticate users using PostgreSQL OAuth2 connection pool.',
          epic: 'Authentication',
          user_story: 'As a user, I want secure OAuth login.',
          acceptance_criteria: 'Must return valid JWT token upon auth.',
          column: 'In Progress',
          points: 5,
          assignee: 'Sarah Chen'
        },
        {
          id: 2,
          requirement_sentence: 'The system SHALL process batch requirement NLP analysis via Python AI engine.',
          epic: 'AI Processing',
          user_story: 'As an analyst, I want automated story generation.',
          acceptance_criteria: 'NLP engine must parse RFC 2119 keywords.',
          column: 'Backlog',
          points: 8,
          assignee: 'Alex Rivera'
        },
        {
          id: 3,
          requirement_sentence: 'The system SHALL export filtered sprint backlog requirements into formatted Excel sheets.',
          epic: 'Data Export',
          user_story: 'As a PM, I want custom spreadsheet exports.',
          acceptance_criteria: 'Exported file must contain timestamps.',
          column: 'Done',
          points: 3,
          assignee: 'Priya Sharma'
        }
      ]);
    }
  }, [requirements]);

  // Handlers for Kanban movement
  const moveTask = (taskId, direction) => {
    const columnsOrder = ['Backlog', 'In Progress', 'Review', 'Done'];
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const currentIdx = columnsOrder.indexOf(t.column);
        let newIdx = currentIdx;
        if (direction === 'next' && currentIdx < columnsOrder.length - 1) newIdx++;
        if (direction === 'prev' && currentIdx > 0) newIdx--;
        return { ...t, column: columnsOrder[newIdx] };
      }
      return t;
    }));
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTaskSentence.trim()) return;

    const newTask = {
      id: Date.now(),
      requirement_sentence: newTaskSentence,
      epic: newTaskEpic || 'General',
      user_story: 'As a user, I want this requirement fulfilled.',
      acceptance_criteria: 'Acceptance criteria pending validation.',
      column: newTaskStatus,
      points: 3,
      assignee: 'Unassigned'
    };

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

  const mainTabs = [
    { id: 'kanban', label: 'Sprint Kanban & Milestones', icon: LayoutGrid },
    { id: 'dashboard', label: 'Sprint AI Dashboard', icon: LayoutDashboard },
    { id: 'add-stories', label: 'Add Stories & Requirements', icon: Plus },
    { id: 'sprint-plan', label: 'Sprint Plan Output', icon: FileText },
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
              <span>Sprint Management • AI Project Planner</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Agile Sprint & Task Board
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              Track requirement progression across sprint cycles, assign resources, and monitor real-time completion status.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all transform active:scale-95"
            >
              <Plus size={16} />
              <span>Add Sprint Requirement</span>
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
      {activeTab === 'dashboard' && <DashboardView />}
      {activeTab === 'add-stories' && <AddStories />}
      {activeTab === 'sprint-plan' && <SprintPlanOutput />}
      {activeTab === 'performance' && <Performance />}

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

                            <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold leading-relaxed">
                              {task.requirement_sentence}
                            </p>

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
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        {t.requirement_sentence}
                      </p>
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
