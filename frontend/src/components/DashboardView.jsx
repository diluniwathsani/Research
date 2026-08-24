import React from 'react';
import { 
  FileText, ShieldCheck, Layers, ArrowUpRight, LayoutDashboard, Calendar, Zap, Target 
} from 'lucide-react';

export default function DashboardView({ 
  requirements = [], 
  loading, 
  onRunAI, 
  onExport, 
  setActiveTab 
}) {
  const total = requirements.length;
  const completeCount = requirements.filter(r => r.completeness_status === 'Complete').length;
  const completenessRate = total > 0 ? Math.round((completeCount / total) * 100) : 0;
  const epicSet = new Set(requirements.map(r => r.epic).filter(Boolean));

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-xl border border-indigo-800/40">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <LayoutDashboard size={14} className="text-indigo-300" />
              <span>Executive Overview</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              AI Requirements & Sprint Engine Platform
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Unified platform integrating NLP requirement engineering with automated Machine Learning sprint planning and effort estimation.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('projects')}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 flex items-center gap-2"
            >
              <Calendar size={16} />
              <span>Open Sprint Engine</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid — Combining Member 1 & Your ML Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Member 1: Requirements Count */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Requirements</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <FileText size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{total}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Parsed from Excel batch</p>
        </div>

        {/* Member 1: Completeness Rate */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Completeness Score</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{completenessRate}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{completeCount} / {total} valid requirements</p>
        </div>

        {/* YOUR ML STAT: Priority Prediction Accuracy */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Priority AI Accuracy</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-400">
              <Zap size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-indigo-500 dark:text-indigo-400 mt-2">67.58%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Random Forest Classifier</p>
        </div>

        {/* YOUR ML STAT: Effort Model R² Score */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Effort Model R²</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
              <Target size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">0.992</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">MAE: 1.78 story points</p>
        </div>

      </div>

      {/* System Modules Overview Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <LayoutDashboard size={20} className="text-indigo-600 dark:text-indigo-400" />
          System Modules & Research Contributions
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                <FileText size={18} />
                <span>Development Artifacts</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                Member 1
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Complete requirement sentence ingestion, spaCy NLP dependency parsing, RFC 2119 completeness validation, and SVM topic clustering.
            </p>
            <button onClick={() => setActiveTab('artifacts')} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 pt-1">
              Go to Module <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <Calendar size={18} />
                <span>Project Management & Re-Planning</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                Member 2 (Your Module)
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              AI Sprint Planning Engine featuring Random Forest priority prediction, effort estimation (R² 0.992), dynamic Bin-Packing sprint allocation, and scope change replanning.
            </p>
            <button onClick={() => setActiveTab('projects')} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 pt-1">
              Go to Module <ArrowUpRight size={14} />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}