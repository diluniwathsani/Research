import React from 'react';

const TaskPreview = ({ tasks, onRunAllocation, loading, apiSource, apiStatus }) => {
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const getPriorityClass = (priority) => {
    const p = priority?.toLowerCase();
    if (p === 'high') return 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
    if (p === 'medium') return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
  };

  const getPriorityDot = (priority) => {
    const p = priority?.toLowerCase();
    if (p === 'high') return 'bg-red-500';
    if (p === 'medium') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getConfidenceBar = (confidence) => {
    if (!confidence || confidence === 0) return null;
    const width = Math.min(confidence, 100);
    const color = width > 70 ? 'bg-emerald-500' : width > 50 ? 'bg-amber-500' : 'bg-red-500';
    return (
      <div className="w-full min-w-[80px] mt-1">
        <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${width}%` }} />
        </div>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{confidence}% confidence</div>
      </div>
    );
  };

  const domainStyles = {
    backend: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
    frontend: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-300',
    ai: 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-300',
    general: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  };

  const getDomainBadge = (domain) => {
    const key = domain?.toLowerCase();
    const cls = domainStyles[key] || domainStyles.general;
    return (
      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${cls}`}>
        {domain || 'general'}
      </span>
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900/40">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap px-5 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Sprint Tasks
          </h3>
          {apiSource && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
              {apiSource === 'pooliyadda' && apiStatus?.pooliyadda ? (
                <>
                  <span>🤖 ML Model: Random Forest (67.58% accuracy)</span>
                  <span>📊 TF-IDF Vectorization</span>
                </>
              ) : (
                <span>Showing {safeTasks.length} task{safeTasks.length === 1 ? '' : 's'} for this sprint</span>
              )}
            </p>
          )}
        </div>
        <button
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
          onClick={onRunAllocation}
          disabled={loading || safeTasks.length === 0}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block" />
              Allocating...
            </>
          ) : (
            <>Run AI Allocation</>
          )}
        </button>
      </div>

      {/* Body */}
      {loading && !safeTasks.length ? (
        <div className="text-center py-16">
          <span className="w-10 h-10 mx-auto rounded-full border-4 border-indigo-100 dark:border-indigo-500/20 border-t-indigo-500 animate-spin block mb-4" />
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading tasks...</p>
        </div>
      ) : safeTasks.length === 0 ? (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <div className="text-4xl mb-3 opacity-50">📭</div>
          <p className="text-sm">No tasks found for this sprint</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60">
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">ID</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">Title</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">Priority</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">Est. Hours</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">Story Points</th>
                {apiSource === 'pooliyadda' && (
                  <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">ML Confidence</th>
                )}
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">Domain</th>
                <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-200 dark:border-slate-700">Required Skills</th>
              </tr>
            </thead>
            <tbody>
              {safeTasks.map((task, idx) => (
                <tr
                  key={task.story_id || task.task_id || idx}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="px-5 py-4 align-top">
                    <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{task.story_id || task.task_id}</span>
                    {task.sprint_number && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">S{task.sprint_number}</div>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top text-sm text-slate-600 dark:text-slate-300">
                    {task.title}
                    {task.team_size && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Team: {task.team_size} 👥</div>
                    )}
                  </td>
                  <td className="px-5 py-4 align-top">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getPriorityClass(task.priority)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(task.priority)}`} />
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-5 py-4 align-top text-sm text-slate-600 dark:text-slate-300">⏱ {task.estimated_hours}h</td>
                  <td className="px-5 py-4 align-top text-sm text-slate-600 dark:text-slate-300">⭐ {task.story_points}</td>
                  {apiSource === 'pooliyadda' && (
                    <td className="px-5 py-4 align-top">
                      {task.priority_confidence ? getConfidenceBar(task.priority_confidence) : <span className="text-xs text-slate-400 dark:text-slate-500">—</span>}
                    </td>
                  )}
                  <td className="px-5 py-4 align-top">{getDomainBadge(task.required_domain)}</td>
                  <td className="px-5 py-4 align-top">
                    <div className="flex gap-1.5 flex-wrap max-w-[220px]">
                      {task.required_skills?.slice(0, 2).map((skill, i) => (
                        <span key={i} className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                          {skill}
                        </span>
                      ))}
                      {task.required_skills?.length > 2 && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                          +{task.required_skills.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {apiSource === 'pooliyadda' && apiStatus?.pooliyadda && (
            <div className="flex justify-between items-center flex-wrap gap-2 px-5 py-3 text-[11px] text-slate-400 dark:text-slate-500 bg-emerald-50/40 dark:bg-emerald-500/5 border-t border-slate-200 dark:border-slate-700">
              <div>🤖 <strong className="text-slate-500 dark:text-slate-400">ML Model:</strong> Random Forest + TF-IDF</div>
              <div>📊 <strong className="text-slate-500 dark:text-slate-400">Accuracy:</strong> 67.58%</div>
              <div>🎯 <strong className="text-slate-500 dark:text-slate-400">Classes:</strong> HIGH / LOW (Binary)</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskPreview;