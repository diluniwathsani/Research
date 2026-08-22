import React, { useState, useEffect } from 'react';
import { 
  Calendar, Code, Layers, CheckCircle2, Clock, PlayCircle, Plus, 
  Search, Filter, ChevronLeft, ChevronRight, LayoutGrid, List, AlertCircle, X, ShieldCheck 
} from 'lucide-react';

export default function ProjectManagementModule({ requirements = [] }) {
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
      // Default sample tasks if no backend requirements loaded yet
      setTasks([
        {
          id: 't-1',
          requirement_sentence: 'The system SHALL provide multi-factor authentication via OTP.',
          epic: 'Authentication',
          user_story: 'As a user, I want OTP MFA to secure my account login.',
          acceptance_criteria: 'OTP must be sent within 5 seconds to user mobile.',
          column: 'Done',
          points: 5,
          assignee: 'Sarah Chen'
        },
        {
          id: 't-2',
          requirement_sentence: 'The system MUST export requirements artifacts to Excel format.',
          epic: 'Data Export',
          user_story: 'As a BA, I want to download requirements in XLSX.',
          acceptance_criteria: 'Excel workbook contains all requirement fields.',
          column: 'In Progress',
          points: 3,
          assignee: 'Alex Rivera'
        },
        {
          id: 't-3',
          requirement_sentence: 'The system SHOULD validate RFC 2119 keyword compliance.',
          epic: 'AI Validation',
          user_story: 'As a system analyst, I want automated RFC keyword checking.',
          acceptance_criteria: 'Flag non-compliant requirements with error status.',
          column: 'Review',
          points: 8,
          assignee: 'Priya Sharma'
        },
        {
          id: 't-4',
          requirement_sentence: 'The system MAY support custom dashboard theme switching.',
          epic: 'User Dashboard',
          user_story: 'As an admin, I want dark mode support.',
          acceptance_criteria: 'Toggle between dark and light themes dynamically.',
          column: 'Backlog',
          points: 2,
          assignee: 'Elena Rostova'
        }
      ]);
    }
  }, [requirements]);

  const epics = Array.from(new Set(tasks.map(t => t.epic).filter(Boolean)));

  // Move task to adjacent column
  const moveTask = (taskId, direction) => {
    const columnsOrder = ['Backlog', 'In Progress', 'Review', 'Done'];
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const currentIndex = columnsOrder.indexOf(t.column);
        const newIndex = direction === 'next' 
          ? Math.min(columnsOrder.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);
        return { ...t, column: columnsOrder[newIndex] };
      }
      return t;
    }));
  };

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTaskSentence.trim()) return;

    const newTask = {
      id: `task-custom-${Date.now()}`,
      requirement_sentence: newTaskSentence,
      epic: newTaskEpic || 'General',
      user_story: `As a user, I want ${newTaskSentence.slice(0, 40)}...`,
      acceptance_criteria: 'Verification pending execution.',
      column: newTaskStatus,
      points: 5,
      assignee: 'Sarah Chen'
    };

    setTasks(prev => [newTask, ...prev]);
    setIsNewTaskModalOpen(false);
    setNewTaskSentence('');
  };

  // Metrics
  const totalPoints = tasks.reduce((sum, t) => sum + t.points, 0);
  const donePoints = tasks.filter(t => t.column === 'Done').reduce((sum, t) => sum + t.points, 0);
  const sprintProgress = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;

  // Filter tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.requirement_sentence.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.epic.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.assignee.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesEpic = selectedEpicFilter === 'All' || t.epic === selectedEpicFilter;
    return matchesSearch && matchesEpic;
  });

  const columns = [
    { key: 'Backlog', label: 'Sprint Backlog', color: 'border-slate-300 dark:border-slate-700 bg-slate-100/50 dark:bg-slate-900/30' },
    { key: 'In Progress', label: 'In Development', color: 'border-indigo-400 dark:border-indigo-800 bg-indigo-50/40 dark:bg-indigo-950/20' },
    { key: 'Review', label: 'QA & RFC Review', color: 'border-amber-400 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20' },
    { key: 'Done', label: 'Completed & Verified', color: 'border-emerald-400 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Calendar size={14} className="text-indigo-300" />
              <span>Sprint & Agile Roadmap</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Sprint 14: Requirement Engineering Execution
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              Organize requirement backlog, track agile task progression, and monitor sprint burndown velocity.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Add Sprint Task</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Sprint Completion</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">{sprintProgress}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{donePoints} of {totalPoints} story points completed</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Backlog Items</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <Layers size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{tasks.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Live requirement tasks</p>
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
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Active dev tasks</p>
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'kanban' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <LayoutGrid size={14} />
            <span>Kanban Board</span>
          </button>
          <button
            onClick={() => setViewMode('roadmap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === 'roadmap' 
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <List size={14} />
            <span>Roadmap Timeline</span>
          </button>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {columns.map((col) => {
            const colTasks = filteredTasks.filter(t => t.column === col.key);
            return (
              <div 
                key={col.key}
                className={`rounded-3xl p-4 border ${col.color} space-y-4 min-h-[450px] flex flex-col justify-between`}
              >
                <div className="space-y-4">
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      {col.label}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-bold">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Task Cards Stack */}
                  <div className="space-y-3">
                    {colTasks.length > 0 ? (
                      colTasks.map((task) => (
                        <div 
                          key={task.id}
                          className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                              {task.epic}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-500">
                              {task.points} pts
                            </span>
                          </div>

                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug line-clamp-3">
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
  );
}

