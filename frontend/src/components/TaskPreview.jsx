import React from 'react';
import { Cpu, Layers, Users, Calendar, CheckCircle, Clock } from 'lucide-react';

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
  const safeTasks = Array.isArray(tasks) ? tasks : (tasks?.data || []);

  const totalPoints = safeTasks.reduce((sum, t) => sum + (Number(t.story_points) || Number(t.points) || 0), 0);
  const totalHours = safeTasks.reduce((sum, t) => sum + (Number(t.estimated_hours) || Number(t.hours) || 0), 0);

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
                className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Users size={15} />
                <span>Manage Resources & Skills</span>
              </button>
            )}

            {hasAssignments && (
              <button
                onClick={onViewAssignments}
                className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Users size={15} />
                <span>View Allocation Board</span>
              </button>
            )}

            <button
              onClick={onRunAllocation}
              disabled={loading || safeTasks.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Cpu size={15} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Allocating Resources...' : 'Allocate Resources'}</span>
            </button>
          </div>
        </div>

        {/* Sprint Summary Metrics Bar */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="text-slate-400">Stories:</span>
              <strong className="text-slate-800 dark:text-white">{safeTasks.length}</strong>
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

          {sprintDetails?.working_days && (
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Clock size={13} className="text-emerald-500" />
              <span>{sprintDetails.working_days} Working Days (Company Holidays Observed)</span>
            </div>
          )}
        </div>
      </div>

      {/* Stories Table */}
      {safeTasks.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">Story ID</th>
                <th className="p-3.5">User Story Title & Acceptance Scope</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Story Points</th>
                <th className="p-3.5">Hours</th>
                <th className="p-3.5">Domain</th>
                <th className="p-3.5">Required Skills</th>
                <th className="p-3.5">Assigned Developer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
              {safeTasks.map((task, idx) => {
                const dev = task.assigned_developer;
                const devName = typeof dev === 'object' ? dev?.name : (dev || task.assigned_to || 'Pending Allocation');
                const devRole = typeof dev === 'object' ? dev?.role : null;
                const devFit = typeof dev === 'object' ? dev?.skill_match_pct : null;

                return (
                  <tr 
                    key={task.story_id || idx}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      {task.story_id || task.id}
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

                    <td className="p-3.5 font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                      {task.story_points || task.points || 5} pts
                    </td>

                    <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
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

                    <td className="p-3.5 whitespace-nowrap">
                      {devName && devName !== 'Pending Allocation' && devName !== 'Unassigned' ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                            <span>{devName}</span>
                          </div>
                          {devFit && (
                            <div className="text-[10px] font-semibold text-emerald-500">
                              {devFit}% Skill Alignment
                            </div>
                          )}
                          {devRole && (
                            <div className="text-[10px] text-slate-400">
                              {devRole}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                          Unassigned
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
          No user stories found in this sprint.
        </div>
      )}
    </div>
  );
}