import React from 'react';
import { Calendar, Code, Info } from 'lucide-react';

export default function ProjectManagementModule() {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
              <Calendar size={14} className="text-indigo-300" />
              <span>Project Management Module</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold">
              Agile Sprint & Roadmap Planning
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              This module slot is currently blank. Reserved for team member integration.
            </p>
          </div>
        </div>
      </div>

      {/* Blank Placeholder Body */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 border border-slate-200 dark:border-slate-700/80 shadow-sm text-center flex flex-col items-center justify-center space-y-4 min-h-[350px]">
        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700">
          <Code size={40} />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Module Ready for Team Integration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            The Project Management module features are left blank so that other team members can implement and integrate their respective components here.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-700">
          <Info size={14} />
          <span>Status: Pending Team Member Contribution</span>
        </div>
      </div>
    </div>
  );
}
