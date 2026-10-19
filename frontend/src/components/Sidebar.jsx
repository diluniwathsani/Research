import React, { useState } from 'react';
import { 
  FileCode, Calendar, Users, GitPullRequest, LayoutDashboard,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

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
    <aside 
      className={`${
        isCollapsed ? 'w-20' : 'w-72 sm:w-80'
      } bg-white dark:bg-slate-800/95 border-r border-slate-200 dark:border-slate-700/80 flex flex-col justify-between shrink-0 transition-all duration-300 ease-in-out shadow-sm select-none`}
    >
      <div className="p-3 sm:p-4 space-y-4">
        {/* Sidebar Header & Collapse Toggle */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-2'} pb-2 border-b border-slate-100 dark:border-slate-700/50`}>
          {!isCollapsed && (
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Core Modules
            </h3>
          )}
          <button
            onClick={toggleCollapse}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all focus:outline-hidden"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`w-full group flex items-center ${
                  isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-3'
                } rounded-2xl transition-all duration-200 text-left relative ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/60 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3.5'} min-w-0 flex-1`}>
                  <div
                    className={`p-2 rounded-xl transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                      isActive
                        ? `bg-gradient-to-tr ${item.color} text-white shadow-sm`
                        : 'bg-slate-100 dark:bg-slate-700/70 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-xs font-bold block leading-snug text-slate-900 dark:text-slate-100">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full shrink-0 tracking-wide uppercase ${
                              isActive
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 dark:text-slate-400 block leading-tight mt-0.5">
                        {item.subtitle}
                      </span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Profile Preview */}
      <div className={`p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700/80 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`} title={`${user?.name || 'Local User'} (${user?.email || 'Active Session'})`}>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
            {user?.name?.[0] || 'U'}
          </div>
          {!isCollapsed && (
            <div className="truncate text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{user?.name || 'Local User'}</span>
              <span className="text-[10px] text-slate-400 block truncate">{user?.email || 'Active Session'}</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}