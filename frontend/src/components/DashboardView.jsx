import React from 'react';
import { 
  FileText, ShieldCheck, Layers, ArrowUpRight, Upload, RefreshCw, Download, Zap, LayoutDashboard, Code, Info 
} from 'lucide-react';

export default function DashboardView({ 
  requirements, 
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
              AI Requirements Engineering Platform
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              System dashboard for requirement completeness analysis, spaCy NLP RFC 2119 validation, and SVM Epic clustering.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('artifacts')}
              className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 flex items-center gap-2"
            >
              <FileText size={16} />
              <span>Open Development Artifacts</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards for Development Artifact Engineering */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Clustered Epics</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
              <Layers size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">{epicSet.size}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Extracted domain clusters</p>
        </div>
      </div>

      {/* Module Overview & Status Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-6">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <LayoutDashboard size={20} className="text-indigo-600 dark:text-indigo-400" />
          System Modules Overview & Integration Status
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Active Module Card */}
          <div className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold text-sm">
                <FileText size={18} />
                <span>Development Artifact Engineering Module</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                Active & Complete
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Complete requirement sentence ingestion, spaCy NLP dependency parsing, RFC 2119 completeness validation, SVM topic clustering, and automatic User Story & Acceptance Criteria generation.
            </p>
            <button
              onClick={() => setActiveTab('artifacts')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 pt-1"
            >
              Go to Module <ArrowUpRight size={14} />
            </button>
          </div>

          {/* Reserved Module Cards */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-700 dark:text-slate-300">Other System Modules</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                Blank Placeholders
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Resource Management, Project Management, and Change Request modules have been kept clean and blank for team member integration.
            </p>
            <div className="flex gap-2 text-[10px] text-slate-400 pt-1">
              <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Resource Mgmt</span>
              <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Project Mgmt</span>
              <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Change Requests</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
