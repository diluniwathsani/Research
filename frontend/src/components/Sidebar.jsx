import React from 'react';
import { 
  FileCode, Calendar, Users, GitPullRequest, LayoutDashboard 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user } = useAuth();

  const menuItems = [
    {
      id: 'artifacts',
      label: 'Development Artifacts',
      subtitle: 'Requirements & User Stories',
      icon: FileCode,
      badge: 'Active',
      color: 'from-purple-500 to-indigo-600',
    },
    {
      id: 'projects',
      label: 'Project Management',
      subtitle: 'AI Sprint Planning & DAG',
      icon: Calendar,
      badge: 'Active',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'resources',
      label: 'Resource Management',
      subtitle: 'Capacity & Staff Allocation',
      icon: Users,
      badge: 'Active',
      color: 'from-indigo-500 to-purple-600',
    },
    {
      id: 'changerequests',
      label: 'Change Requests',
      subtitle: 'Impact & Scope Governance',
      icon: GitPullRequest,
      badge: 'Active',
      color: 'from-amber-500 to-rose-600',
    },
    {
      id: 'dashboard',
      label: 'Executive Overview',
      subtitle: 'Landing Page & Charts',
      icon: LayoutDashboard,
      badge: null,
      color: 'from-blue-500 to-indigo-600',
    },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-800/95 border-r border-slate-200 dark:border-slate-700/80 flex flex-col justify-between shrink-0 transition-colors duration-200 shadow-sm">
      
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
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Profile Preview */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
            {user?.name?.[0] || 'U'}
          </div>
          <div className="truncate text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{user?.name || 'Local User'}</span>
            <span className="text-[10px] text-slate-400 block truncate">{user?.email || 'Active Session'}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}