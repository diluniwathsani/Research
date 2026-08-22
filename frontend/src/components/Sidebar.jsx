import React from 'react';
import { LayoutDashboard, FileCode, Users, Calendar, GitPullRequest, Sparkles, ChevronRight, HardDrive, Layers } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, reqCount, epicCount }) {
  const menuItems = [
    {
      id: 'artifacts',
      label: 'Development Artifacts',
      subtitle: 'Requirements, Epics & AC',
      icon: FileCode,
      badge: reqCount > 0 ? `${reqCount} Items` : 'Active',
      color: 'from-purple-500 to-indigo-600',
    },
    {
      id: 'dashboard',
      label: 'Executive Overview',
      subtitle: 'Landing Page & Charts',
      icon: LayoutDashboard,
      badge: null,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'resources',
      label: 'Resource Management',
      subtitle: 'Reserved for Team Member',
      icon: Users,
      badge: 'Blank',
      color: 'from-slate-400 to-slate-500',
    },
    {
      id: 'projects',
      label: 'Project Management',
      subtitle: 'Reserved for Team Member',
      icon: Calendar,
      badge: 'Blank',
      color: 'from-slate-400 to-slate-500',
    },
    {
      id: 'changerequests',
      label: 'Change Requests',
      subtitle: 'ReqChange AI & Governance',
      icon: GitPullRequest,
      badge: 'Active',
      color: 'from-amber-500 to-rose-600',
    },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-800/95 border-r border-slate-200 dark:border-slate-700/80 flex flex-col justify-between shrink-0 transition-colors duration-200 shadow-sm">
      
      {/* Navigation Links */}
      <div className="p-4 space-y-6">
        <div>
          <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
            Core Modules
          </h3>
          <nav className="space-y-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-left ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/80 dark:border-indigo-800/50 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg transition-transform duration-200 group-hover:scale-110 ${
                        isActive
                          ? `bg-gradient-to-tr ${item.color} text-white shadow-sm`
                          : 'bg-slate-100 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon size={18} />
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-bold block truncate leading-snug">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    {item.badge && (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight
                      size={14}
                      className={`transition-transform duration-200 ${
                        isActive ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5' : 'text-slate-400 opacity-0 group-hover:opacity-100'
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick System Stats Box */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md border border-indigo-900/50 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1">
              <Sparkles size={12} /> ML Stats
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          <div className="grid grid-cols-2 gap-2 my-2 text-center">
            <div className="bg-white/5 p-1.5 rounded-lg border border-white/10">
              <span className="text-xs text-slate-400 block">Requirements</span>
              <span className="text-sm font-bold text-white">{reqCount}</span>
            </div>
            <div className="bg-white/5 p-1.5 rounded-lg border border-white/10">
              <span className="text-xs text-slate-400 block">Epics</span>
              <span className="text-sm font-bold text-indigo-300">{epicCount}</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 text-center">
            SVM & spaCy NLP Pipeline
          </p>
        </div>
      </div>

      {/* Footer System Info */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-slate-100 dark:bg-slate-700/70 rounded-lg text-slate-500 dark:text-slate-400">
            <Layers size={16} />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-700 dark:text-slate-300">Research System</p>
            <p className="text-[10px] text-slate-400">Dialog Axiata Research</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
