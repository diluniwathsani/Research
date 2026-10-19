// Research/frontend/src/components/ChangeRequestModule.jsx
import React, { useState } from 'react';
import { 
  GitPullRequest, 
  LayoutDashboard, 
  PlusCircle, 
  FileCheck2, 
  Sparkles, 
  Activity, 
  ShieldCheck,
  ArrowRight,
  RotateCcw,
  ArrowUpRight
} from 'lucide-react';
import ChangeRequestDashboard from './change-requests/ChangeRequestDashboard';
import ChangeRequestForm from './change-requests/ChangeRequestForm';
import ChangeRequestList from './change-requests/ChangeRequestList';

export default function ChangeRequestModule({ 
  projects = [], 
  selectedProjectId, 
  onSelectProject,
  onNavigateToReplanning 
}) {
  // Sub-tabs: 'dashboard', 'form', 'list'
  const [subTab, setSubTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-6 md:p-8 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 shadow-md relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-indigo-400/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-2">
              <GitPullRequest size={14} className="text-indigo-600 dark:text-indigo-300" />
              <span>Change Request Governance</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
              Change Requests
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Analyze architectural change impacts, evaluate blast radius, and execute intelligent sprint replanning.
            </p>
          </div>

          {/* Quick Connect to Project Module Replanning Tab */}
          {onNavigateToReplanning && (
            <button
              onClick={onNavigateToReplanning}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-400 hover:via-orange-400 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all border border-amber-300/30 group cursor-pointer"
              title="Open Project Module's Sprint Replanning Engine"
            >
              <Sparkles size={16} className="text-amber-200 group-hover:rotate-12 transition-transform" />
              <span>Go to Project Sprint Replanning</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </button>
          )}
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSubTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              subTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard size={15} />
            <span>Change Request Details & Dashboard</span>
          </button>

          <button
            onClick={() => setSubTab('form')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              subTab === 'form'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PlusCircle size={15} />
            <span>Submit New Request (7-Step)</span>
          </button>

          <button
            onClick={() => setSubTab('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              subTab === 'list'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileCheck2 size={15} />
            <span>Change Requests Registry</span>
          </button>

          {onNavigateToReplanning && (
            <button
              onClick={onNavigateToReplanning}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/20 hover:text-amber-700 dark:hover:text-white transition-all ml-auto"
            >
              <RotateCcw size={14} />
              <span>Project Module (Replanning Tab)</span>
              <ArrowUpRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Module Content View */}
      <div className="transition-all duration-200">
        {subTab === 'dashboard' && (
          <ChangeRequestDashboard 
            onNavigate={(target) => {
              if (target === 'submit') setSubTab('form');
              else if (target === 'requests') setSubTab('list');
            }} 
            onNavigateToReplanning={onNavigateToReplanning}
          />
        )}

        {subTab === 'form' && (
          <ChangeRequestForm 
            onSuccess={() => setSubTab('list')} 
            onNavigateToReplanning={onNavigateToReplanning}
          />
        )}

        {subTab === 'list' && (
          <ChangeRequestList 
            onNavigateToNew={() => setSubTab('form')} 
            onNavigateToReplanning={onNavigateToReplanning}
          />
        )}
      </div>
    </div>
  );
}
