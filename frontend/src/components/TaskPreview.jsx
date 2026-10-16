import React, { useState } from 'react';
import { Cpu, Layers, Users, Calendar, Clock, ChevronDown, ChevronRight, ListChecks, Sparkles, Filter } from 'lucide-react';

export default function TaskPreview({ 
  tasks = [], 
  sprintDetails = null,
  onRunAllocation, 
  hasAssignments = false,
  onViewAssignments,
  onOpenManageTeam,
  loading = false, 
  apiSource, 
  apiStatus 
}) {
  const [expandedSubtasks, setExpandedSubtasks] = useState({});
  const [viewMode, setViewMode] = useState('stories'); // 'stories' | 'all_subtasks'

  const safeTasks = Array.isArray(tasks) ? tasks : (tasks?.data || []);

  const totalPoints = safeTasks.reduce((sum, t) => sum + (Number(t.story_points) || Number(t.points) || 0), 0);
  const totalHours = safeTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || Number(t.hours) || 0), 0);
  const totalSubtasks = safeTasks.reduce((sum, t) => sum + (Array.isArray(t.sub_tasks) ? t.sub_tasks.length : 0), 0);

  // Flatten all sub-tasks across the current sprint for the flat view
  const allSubtasksList = safeTasks.flatMap((t) => {
    const subs = Array.isArray(t.sub_tasks) ? t.sub_tasks : [];
    return subs.map((sub) => ({
      ...sub,
      parent_story_id: t.story_id || t.id,
      parent_story_title: t.title,
      parent_epic: t.epic,
      sprint_number: t.sprint_number
    }));
  });

  const toggleSubtasks = (storyId) => {
    setExpandedSubtasks(prev => ({
      ...prev,
      [storyId]: !prev[storyId]
    }));
  };

  const handleToggleAll = (expand) => {
    const next = {};
    safeTasks.forEach(t => {
      const sid = t.story_id || t.id;
      if (t.sub_tasks && t.sub_tasks.length > 0) {
        next[sid] = expand;
      }
    });
    setExpandedSubtasks(next);
  };

  const anySubtasksAvailable = totalSubtasks > 0;
  const allExpanded = anySubtasksAvailable && safeTasks.filter(t => t.sub_tasks?.length > 0).every(t => expandedSubtasks[t.story_id || t.id]);

  return (
    <div className="space-y-6">
      {/* Top Workflow Banner */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                Module 2: Skill-Based Resource Allocation Workflow
              </span>
              {sprintDetails && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Calendar size={12} />
                  <span>
                    {sprintDetails.start_date && sprintDetails.end_date 
                      ? `${sprintDetails.start_date} → ${sprintDetails.end_date}` 
                      : `Sprint Cadence: 2 Weeks`}
                  </span>
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers size={18} className="text-indigo-600 dark:text-indigo-400" />
              <span>Sprint Plan User Stories & Workload</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Derived directly from Project Management Sprint Planning Engine (HiGHS ILP solver, Story Points & CPM float matrix).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {onOpenManageTeam && (
              <button
                onClick={onOpenManageTeam}
                className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users size={15} />
                <span>Manage Resources & Skills</span>
              </button>
            )}

            {hasAssignments && (
              <button
                onClick={onViewAssignments}
                className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users size={15} />
                <span>View Allocation Board</span>
              </button>
            )}

            <button
              onClick={onRunAllocation}
              disabled={loading || safeTasks.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Cpu size={15} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Allocating Resources...' : 'Allocate Resources'}</span>
            </button>
          </div>
        </div>

        {/* Sprint Summary Metrics Bar */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="text-slate-400">Stories:</span>
              <strong className="text-slate-800 dark:text-white">{safeTasks.length}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400">Sub-Tasks:</span>
              <strong className="text-sky-600 dark:text-sky-400 font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30">
                {totalSubtasks} Units
              </strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400">Total Story Points:</span>
              <strong className="text-purple-600 dark:text-purple-400">{totalPoints} pts</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400">Total Effort:</span>
              <strong className="text-indigo-600 dark:text-indigo-400">{totalHours}h</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {anySubtasksAvailable && (
              <button
                type="button"
                onClick={() => handleToggleAll(!allExpanded)}
                className="px-3 py-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
              >
                <Layers size={13} className="text-indigo-500 dark:text-indigo-400" />
                <span>{allExpanded ? 'Collapse All Sub-Tasks' : 'Expand All Sub-Tasks'}</span>
              </button>
            )}

            {sprintDetails?.working_days && (
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Clock size={13} className="text-emerald-500" />
                <span>{sprintDetails.working_days} Working Days (Company Holidays Observed)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Switcher Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('stories')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'stories'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-400/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Layers size={14} />
            <span>Sprint Stories & Sub-Tasks</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">{safeTasks.length}</span>
          </button>

          {totalSubtasks > 0 && (
            <button
              onClick={() => setViewMode('all_subtasks')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'all_subtasks'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-400/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
              }`}
            >
              <ListChecks size={14} />
              <span>All Sub-Tasks List</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">{totalSubtasks}</span>
            </button>
          )}
        </div>

        {viewMode === 'stories' && anySubtasksAvailable && (
          <span className="text-[11px] text-slate-400">
            Click on any <b className="text-indigo-400">Sub-Tasks</b> pill to reveal technical deliverables.
          </span>
        )}
      </div>

      {/* VIEW 1: STORIES & NESTED SUB-TASKS */}
      {viewMode === 'stories' && (
        safeTasks.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">Story ID</th>
                  <th className="p-3.5">User Story Title & Acceptance Scope</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5 text-center">Story Points</th>
                  <th className="p-3.5 text-center">Hours</th>
                  <th className="p-3.5">Domain</th>
                  <th className="p-3.5">Required Skills</th>
                  <th className="p-3.5 text-center">Sub-Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                {safeTasks.map((task, idx) => {
                  const storyId = task.story_id || task.id;
                  const hasSubtasks = Array.isArray(task.sub_tasks) && task.sub_tasks.length > 0;
                  const isExpanded = Boolean(expandedSubtasks[storyId]);

                  return (
                    <React.Fragment key={storyId || idx}>
                      <tr 
                        className={`transition-colors ${
                          isExpanded 
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                        }`}
                      >
                        <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {storyId}
                        </td>

                        <td className="p-3.5 font-semibold text-slate-900 dark:text-white max-w-md">
                          <div className="leading-snug">{task.title}</div>
                          {task.epic && (
                            <div className="mt-1 text-[10px] text-slate-400 font-normal">
                              Epic: <span className="font-semibold text-slate-500 dark:text-slate-300">{task.epic}</span>
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            (task.priority_tier === 'CRITICAL' || task.priority === 'HIGH') 
                              ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30' :
                            (task.priority === 'MEDIUM' || task.priority_tier === 'HIGH') 
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30' :
                            'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                          }`}>
                            {task.priority_tier || task.priority || 'MEDIUM'}
                          </span>
                        </td>

                        <td className="p-3.5 font-bold text-purple-600 dark:text-purple-400 text-center whitespace-nowrap">
                          {task.story_points || task.points || 5} pts
                        </td>

                        <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200 text-center whitespace-nowrap">
                          {task.estimated_hours || task.hours || 30}h
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          {(() => {
                            const dom = (task.domain || task.required_domain || 'Backend').toUpperCase();
                            const isBackend = dom.includes('BACKEND');
                            const isFrontend = dom.includes('FRONTEND');
                            const isAI = dom.includes('AI') || dom.includes('ML');
                            return (
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isBackend ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                isFrontend ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                isAI ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                                'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                              }`}>
                                {task.domain || task.required_domain || 'Backend'}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(() => {
                              const skillsList = Array.isArray(task.skills) && task.skills.length > 0
                                ? task.skills
                                : (Array.isArray(task.required_skills) && task.required_skills.length > 0 
                                    ? task.required_skills 
                                    : ['JavaScript', 'SQL']);
                              return skillsList.map((skill, sIdx) => (
                                <span key={sIdx} className="px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-slate-300 text-[10px] font-semibold">
                                  {skill}
                                </span>
                              ));
                            })()}
                          </div>
                        </td>

                        {/* SUB-TASKS COLUMN (Replaces Assigned Developer Column) */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {hasSubtasks ? (
                            <button
                              type="button"
                              onClick={() => toggleSubtasks(storyId)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                                isExpanded
                                  ? 'bg-indigo-600 text-white shadow-indigo-600/30 ring-2 ring-indigo-400/40'
                                  : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30'
                              }`}
                              title={isExpanded ? "Collapse sub-tasks" : "View sub-tasks breakdown"}
                            >
                              <Layers size={13} className={isExpanded ? 'text-white' : 'text-indigo-400'} />
                              <span>{task.sub_tasks.length} Sub-Tasks</span>
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              1 Unit (Atomic)
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Nested Sub-Tasks Row (Decomposed from Project Management Module) */}
                      {hasSubtasks && isExpanded && (
                        <tr className="bg-slate-950/70 border-b border-slate-800">
                          <td colSpan="8" className="p-3 pl-6 sm:pl-10">
                            <div className="bg-slate-900/95 rounded-2xl border border-indigo-500/40 p-4 space-y-3 shadow-lg shadow-black/40">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                    <Layers size={14} />
                                  </span>
                                  <span className="text-xs font-black text-white uppercase tracking-wider">
                                    ↳ Decomposed Sub-Tasks for {storyId}
                                  </span>
                                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold border border-indigo-500/30">
                                    {task.sub_tasks.length} Atomic Work Items
                                  </span>
                                </div>

                                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
                                  <span>
                                    Sub-tasks Effort: <strong className="text-purple-400">{task.sub_tasks.reduce((sum, s) => sum + (Number(s.story_points) || Number(s.points) || 0), 0)} pts</strong>
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Total Hours: <strong className="text-indigo-400">{task.sub_tasks.reduce((sum, s) => sum + (Number(s.estimated_hours) || Number(s.hours) || 0), 0)}h</strong>
                                  </span>
                                </div>
                              </div>

                              {/* Sub-tasks Table */}
                              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                                <table className="w-full text-left text-xs text-slate-300">
                                  <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-800">
                                    <tr>
                                      <th className="p-2.5 pl-3">Sub-Task ID</th>
                                      <th className="p-2.5">Technical Scope & Deliverable</th>
                                      <th className="p-2.5 text-center">Priority</th>
                                      <th className="p-2.5 text-center">Points</th>
                                      <th className="p-2.5 text-center">Hours</th>
                                      <th className="p-2.5">Domain</th>
                                      <th className="p-2.5">Required Skills</th>
                                      <th className="p-2.5 text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/60">
                                    {task.sub_tasks.map((sub, sIdx) => {
                                      const subDom = (sub.domain || sub.required_domain || 'Backend').toUpperCase();
                                      const isSubBackend = subDom.includes('BACKEND');
                                      const isSubFrontend = subDom.includes('FRONTEND');
                                      const isSubAI = subDom.includes('AI') || subDom.includes('ML');
                                      const subSkills = Array.isArray(sub.required_skills) && sub.required_skills.length > 0
                                        ? sub.required_skills
                                        : (Array.isArray(sub.skills) && sub.skills.length > 0 ? sub.skills : ['JavaScript', 'SQL']);

                                      return (
                                        <tr key={sub.id || sIdx} className="hover:bg-slate-900/60 transition-colors">
                                          <td className="p-2.5 pl-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                                            <span className="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/50">
                                              ↳ {sub.id || sub.story_id}
                                            </span>
                                          </td>
                                          <td className="p-2.5 font-semibold text-slate-200">
                                            <div className="leading-snug">{sub.title}</div>
                                            {sub.description && (
                                              <div className="text-[10px] text-slate-400 font-normal mt-0.5">{sub.description}</div>
                                            )}
                                          </td>
                                          <td className="p-2.5 text-center whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                              (sub.priority_tier === 'CRITICAL' || sub.priority === 'HIGH')
                                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                            }`}>
                                              {sub.priority_tier || sub.priority || 'MEDIUM'}
                                            </span>
                                          </td>
                                          <td className="p-2.5 text-center font-bold font-mono text-purple-400 whitespace-nowrap">
                                            {sub.story_points || sub.points} pts
                                          </td>
                                          <td className="p-2.5 text-center font-bold font-mono text-slate-300 whitespace-nowrap">
                                            {sub.estimated_hours || sub.hours}h
                                          </td>
                                          <td className="p-2.5 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                              isSubBackend ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                              isSubFrontend ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                              isSubAI ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                                              'bg-slate-700 text-slate-300'
                                            }`}>
                                              {sub.domain || sub.required_domain || 'Backend'}
                                            </span>
                                          </td>
                                          <td className="p-2.5">
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                              {subSkills.map((sk, kIdx) => (
                                                <span key={kIdx} className="px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[9px] font-semibold">
                                                  {sk}
                                                </span>
                                              ))}
                                            </div>
                                          </td>
                                          <td className="p-2.5 text-center whitespace-nowrap">
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                              {sub.status || 'To Do'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            No user stories found in this sprint.
          </div>
        )
      )}

      {/* VIEW 2: FLAT ALL SUB-TASKS LIST FOR SPRINT */}
      {viewMode === 'all_subtasks' && (
        allSubtasksList.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">Sub-Task ID</th>
                  <th className="p-3.5">Parent Story</th>
                  <th className="p-3.5">Deliverable Title & Scope</th>
                  <th className="p-3.5 text-center">Priority</th>
                  <th className="p-3.5 text-center">Points</th>
                  <th className="p-3.5 text-center">Hours</th>
                  <th className="p-3.5">Domain</th>
                  <th className="p-3.5">Required Skills</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                {allSubtasksList.map((sub, idx) => {
                  const subDom = (sub.domain || sub.required_domain || 'Backend').toUpperCase();
                  const isSubBackend = subDom.includes('BACKEND');
                  const isSubFrontend = subDom.includes('FRONTEND');
                  const isSubAI = subDom.includes('AI') || subDom.includes('ML');
                  const subSkills = Array.isArray(sub.required_skills) && sub.required_skills.length > 0
                    ? sub.required_skills
                    : (Array.isArray(sub.skills) && sub.skills.length > 0 ? sub.skills : ['JavaScript', 'SQL']);

                  return (
                    <tr key={sub.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-sky-500/10 dark:bg-sky-950/60 border border-sky-400/30 dark:border-sky-800/50">
                          {sub.id || sub.story_id}
                        </span>
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {sub.parent_story_id}
                        </span>
                        {sub.parent_epic && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            {sub.parent_epic}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 font-semibold text-slate-900 dark:text-white max-w-md">
                        <div className="leading-snug">{sub.title}</div>
                        {sub.description && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5 line-clamp-1">{sub.description}</div>
                        )}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          (sub.priority_tier === 'CRITICAL' || sub.priority === 'HIGH')
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30'
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                        }`}>
                          {sub.priority_tier || sub.priority || 'MEDIUM'}
                        </span>
                      </td>

                      <td className="p-3.5 text-center font-bold font-mono text-purple-600 dark:text-purple-400 whitespace-nowrap">
                        {sub.story_points || sub.points} pts
                      </td>

                      <td className="p-3.5 text-center font-bold font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {sub.estimated_hours || sub.hours}h
                      </td>

                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isSubBackend ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          isSubFrontend ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                          isSubAI ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                          'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                        }`}>
                          {sub.domain || sub.required_domain || 'Backend'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {subSkills.map((sk, kIdx) => (
                            <span key={kIdx} className="px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-slate-300 text-[10px] font-semibold">
                              {sk}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {sub.status || 'To Do'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            No decomposed sub-tasks found in this sprint.
          </div>
        )
      )}
    </div>
  );
}