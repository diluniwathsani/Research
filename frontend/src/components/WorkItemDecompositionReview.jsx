import React from 'react';
import { ArrowLeft, CheckCircle2, Trash2, Plus, Sparkles, AlertCircle } from 'lucide-react';

export default function WorkItemDecompositionReview({
  workItems = [],
  ruleAnalysis = {},
  onUpdateWorkItem,
  onDeleteWorkItem,
  onAddWorkItem,
  onApproveAll,
  onProceedToAllocation,
  onBack,
  loading = false,
}) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all"
            title="Back to Task Preview"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="text-indigo-600 dark:text-indigo-400" size={20} />
              Work Item Decomposition Review
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Review and approve decomposed engineering work items before AI staff allocation.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onApproveAll}
            disabled={loading || workItems.length === 0}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>Approve All</span>
          </button>

          <button
            onClick={onProceedToAllocation}
            disabled={loading || workItems.length === 0}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles size={16} />
            <span>Run Allocation</span>
          </button>
        </div>
      </div>

      {/* Work Items Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Decomposed Tasks ({workItems.length})
          </h3>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[500px] overflow-y-auto">
          {workItems.length > 0 ? (
            workItems.map((item, idx) => (
              <div key={item.id || idx} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {item.task_id || `TASK-${idx + 1}`}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {item.domain || 'General'}
                    </span>
                    {item.is_approved && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Approved
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                    {item.title || item.user_story || item.task_title}
                  </p>
                  {item.required_skills && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(Array.isArray(item.required_skills) ? item.required_skills : [item.required_skills]).map((sk, sIdx) => (
                        <span key={sIdx} className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                    {item.estimated_hours || 40} hrs
                  </span>
                  {onDeleteWorkItem && (
                    <button
                      onClick={() => onDeleteWorkItem(item.id || idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              No decomposed work items available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
