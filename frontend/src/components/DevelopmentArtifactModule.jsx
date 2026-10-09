import React from 'react';
import { FileText, Cpu, Download, RefreshCw, Layers, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import FileUpload from './Upload';
import RequirementsTable from './RequirementsTable';

export default function DevelopmentArtifactModule({ 
  requirements = [], 
  loading = false, 
  error = null, 
  onFetchRequirements, 
  onProcess, 
  onExport 
}) {
  const safeRequirements = Array.isArray(requirements) ? requirements : [];
  return (
    <div className="space-y-6">
      
      {/* Header Banner for Development Artifact Module */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 md:p-8 text-white border border-purple-800/40 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-semibold mb-2">
              <Sparkles size={14} className="text-purple-300" />
              <span>Module 1: Development Artifact Engineering</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Development Artifact Engineering Module
            </h1>
          </div>
        </div>
      </div>

      {/* Template Upload & Run AI Actions Card */}
      <section className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80 transition-colors">
        <div className="flex flex-col lg:flex-row items-stretch justify-between gap-6">
          
          {/* Left Column: File Upload */}
          <div className="flex-1">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileText size={18} className="text-indigo-600 dark:text-indigo-400" /> 
              Upload Requirement Spreadsheet (.xlsx, .csv)
            </h2>
            <FileUpload onUploadSuccess={onFetchRequirements} />
          </div>

          <div className="hidden lg:block w-px bg-slate-200 dark:bg-slate-700"></div>

          {/* Right Column: Execution Controls */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex flex-col sm:flex-row gap-3">
              <button 
                onClick={onProcess} 
                disabled={loading || safeRequirements.length === 0}
                className="flex-1 relative group overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3.5 font-bold text-white text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Cpu size={18} />}
                <span>{loading ? 'Processing ML Pipeline...' : 'Run AI Analysis & Clustering'}</span>
              </button>

              <button 
                onClick={onExport}
                disabled={safeRequirements.length === 0}
                className="rounded-2xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 px-6 py-3.5 font-bold text-xs text-slate-700 dark:text-slate-200 transition-all hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
              >
                <Download size={18} />
                <span>Export Excel</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs flex items-center gap-2">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Requirements Interactive Table */}
      <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700/80 overflow-hidden">
        <RequirementsTable requirements={safeRequirements} onUpdate={onFetchRequirements} />
      </section>

    </div>
  );
}
