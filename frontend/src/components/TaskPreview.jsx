import React from 'react';
import { Cpu, Layers, Sparkles, CheckCircle, Edit3 } from 'lucide-react';

export default function TaskPreview({ 
  tasks = [], 
  onRunAllocation, 
  onDecomposeStories,
  onReviewWorkItems,
  hasWorkItems = false,
  approvedWorkItemsCount = 0,
  loading = false, 
  apiSource, 
  apiStatus 
}) {
  const safeTasks = Array.isArray(tasks) ? tasks : (tasks?.data || []);

  return (
    <div className="space-y-6">
      {/* Top Workflow Banner */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                Module 2: Resource Management Workflow
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers size={18} className="text-indigo-600 dark:text-indigo-400" />
              Project User Stories
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onDecomposeStories && onDecomposeStories()}
              disabled={loading || safeTasks.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Sparkles size={15} className={loading ? 'animate-spin' : 'text-amber-300'} />
              <span>{loading ? 'Decomposing...' : 'Decompose Stories'}</span>
            </button>

            {hasWorkItems && (
              <button
                onClick={onReviewWorkItems}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 transition-all hover:scale-105 flex items-center justify-center gap-1.5"
              >
                <Edit3 size={15} />
                <span>Review Work Items</span>
              </button>
            )}

            <button
              onClick={onRunAllocation}
              disabled={loading || safeTasks.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Cpu size={15} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Allocating...' : 'Allocate Resources'}</span>
            </button>
          </div>
        </div>

        {approvedWorkItemsCount > 0 && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="shrink-0 flex items-center gap-1 text-emerald-500 font-bold">
              <CheckCircle size={14} /> {approvedWorkItemsCount} Work Items Ready
            </span>
          </div>
        )}
      </div>

      {/* Stories Table */}
      {safeTasks.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3.5">Story ID</th>
                <th className="p-3.5">User Story Title & Decomposed Work Items</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Hours</th>
                <th className="p-3.5">Points</th>
                <th className="p-3.5">Domain</th>
                <th className="p-3.5">Required Skills</th>
                <th className="p-3.5 text-right">Decomposition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
              {safeTasks.map((task, idx) => {
                const isNew = task.is_new || 
                              task.status === 'ACCEPTED' || 
                              String(task.story_id || '').startsWith('CR-') || 
                              String(task.user_story_id || '').startsWith('CR-') || 
                              String(task.title || '').includes('[CR]');
                const hasDecomposedItems = Array.isArray(task.work_items) && task.work_items.length > 0;

                return (
                  <tr 
                    key={task.story_id || idx}
                    className={`transition-colors ${
                      isNew 
                        ? 'bg-purple-500/10 dark:bg-purple-950/40 border-l-4 border-l-purple-500 hover:bg-purple-500/20' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                    }`}
                  >
                    <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      <div className="flex items-center gap-2">
                        <span>{task.story_id || task.id}</span>
                        {isNew && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-600 text-white shadow-md animate-pulse">
                            ✨ Newly Added
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5 font-semibold text-slate-900 dark:text-white max-w-md">
                      <div>{task.title}</div>
                      {hasDecomposedItems ? (
                        <div className="mt-2 space-y-1">
                          <span className="text-[10px] uppercase font-extrabold text-indigo-500 block">
                            Decomposed Work Items ({task.work_items.length}):
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {task.work_items.map((wi, wIdx) => {
                              let cleanTitle = wi.title || '';
                              if (/\bAs\s+a\b|\bI\s+want\s+to\b|\bImplement\b|\bBuild\b|\bConduct\b/i.test(cleanTitle)) {
                                const dom = (wi.domain || 'Backend').toUpperCase();
                                if (dom.includes('BACKEND')) cleanTitle = 'Backend Development';
                                else if (dom.includes('FRONTEND')) cleanTitle = 'Frontend Development';
                                else if (dom.includes('QA') || dom.includes('TESTING')) cleanTitle = 'QA and Testing';
                                else if (dom.includes('DEVOPS')) cleanTitle = 'DevOps Development';
                                else if (dom.includes('AI') || dom.includes('ML')) cleanTitle = 'AI Development';
                                else cleanTitle = `${wi.domain} Development`;
                              }
                              return (
                                <span key={wIdx} className="px-2.5 py-1 rounded-md text-[9px] font-bold bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center gap-1">
                                  🔧 {wi.work_item_id}: {cleanTitle} ({wi.estimated_hours}h)
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1 text-[10px] text-slate-400 font-normal italic">
                          Click "Decompose Stories" to split into technical Work Items
                        </div>
                      )}
                    </td>

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
                            : (Array.isArray(task.required_skills) && task.required_skills.length > 0 ? task.required_skills : ['JavaScript', 'SQL']);
                          return skillsList.map((skill, sIdx) => (
                            <span key={sIdx} className="px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-slate-300 text-[10px] font-semibold">
                              {skill}
                            </span>
                          ));
                        })()}
                      </div>
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => onDecomposeStories && onDecomposeStories(task)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold transition-all flex items-center gap-1 ml-auto"
                      >
                        <Sparkles size={12} className="text-amber-500" />
                        Decompose
                      </button>
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