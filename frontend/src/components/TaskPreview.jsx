import React from 'react';
import { Cpu, Layers } from 'lucide-react';

export default function TaskPreview({ tasks = [], onRunAllocation, loading, apiSource, apiStatus }) {
  const safeTasks = Array.isArray(tasks) ? tasks : (tasks?.data || []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers size={18} className="text-indigo-600 dark:text-indigo-400" />
            Sprint Task Backlog ({safeTasks.length} Tasks)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review sprint tasks and required domain skills before running AI allocation engine
          </p>
        </div>

        <button
          onClick={onRunAllocation}
          disabled={loading || safeTasks.length === 0}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
        >
          <Cpu size={16} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'Executing AI Allocation...' : 'Run AI Task Allocation'}</span>
        </button>
      </div>

      {safeTasks.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">Story ID</th>
                <th className="p-3.5">Task Title</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Hours</th>
                <th className="p-3.5">Points</th>
                <th className="p-3.5">Domain</th>
                <th className="p-3.5">Required Skills</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
              {safeTasks.map((task, idx) => (
                <tr key={task.story_id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">{task.story_id}</td>
                  <td className="p-3.5 font-semibold text-slate-900 dark:text-white">{task.title}</td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      task.priority === 'HIGH' ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30' :
                      task.priority === 'MEDIUM' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30' :
                      'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                    }`}>
                      {task.priority || 'MEDIUM'}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200">{task.estimated_hours}h</td>
                  <td className="p-3.5 font-bold text-purple-600 dark:text-purple-400">{task.story_points} pts</td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-medium capitalize">
                      {task.required_domain || 'general'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(task.required_skills) ? (
                        task.required_skills.map((skill, sIdx) => (
                          <span key={sIdx} className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 font-italic">None specified</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
          No tasks found in this sprint.
        </div>
      )}
    </div>
  );
}