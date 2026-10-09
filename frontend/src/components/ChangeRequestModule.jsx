// Research/frontend/src/components/ChangeRequestModule.jsx
import React, { useState } from 'react';
import { 
  GitPullRequest, 
  LayoutDashboard, 
  PlusCircle, 
  FileCheck2, 
  Sparkles, 
  Activity, 
  ShieldCheck 
} from 'lucide-react';
import ChangeRequestDashboard from './change-requests/ChangeRequestDashboard';
import ChangeRequestForm from './change-requests/ChangeRequestForm';
import ChangeRequestList from './change-requests/ChangeRequestList';

export default function ChangeRequestModule({ projects = [], selectedProjectId, onSelectProject }) {
  // Sub-tabs: 'dashboard', 'form', 'list'
  const [subTab, setSubTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
              <GitPullRequest size={14} className="text-indigo-300" />
              <span>Change Request Governance</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Change Requests
            </h1>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="mt-8 pt-4 border-t border-slate-800/80 flex flex-wrap gap-2">
          <button
            onClick={() => setSubTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              subTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
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
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
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
                : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <FileCheck2 size={15} />
            <span>Change Requests Registry</span>
          </button>
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
          />
        )}

        {subTab === 'form' && (
          <ChangeRequestForm 
            onSuccess={() => setSubTab('list')} 
          />
        )}

        {subTab === 'list' && (
          <ChangeRequestList 
            onNavigateToNew={() => setSubTab('form')} 
          />
        )}
      </div>
    </div>
  );
}
