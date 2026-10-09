import React, { useState, useEffect } from 'react';
import { 
  FileCode, Calendar, Users, GitPullRequest, LayoutDashboard,
  CheckCircle2, Sparkles, FolderGit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, reqCount, epicCount, selectedProjectId }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({ stories: 0, sprints: 0, reqs: 0, epics: 0 });

  const isMatchingProject = (itemProjId, targetProjId) => {
    if (!targetProjId || !itemProjId) return true;
    const itemStr = String(itemProjId).toLowerCase().trim();
    const targetStr = String(targetProjId).toLowerCase().trim();
    return itemStr === targetStr || 
           targetStr.includes(itemStr) || 
           itemStr.includes(targetStr) ||
           (itemStr.replace(/\D/g, '') !== '' && itemStr.replace(/\D/g, '') === targetStr.replace(/\D/g, ''));
  };

  useEffect(() => {
    fetch("http://localhost:3000/api/user-stories")
      .then((res) => res.json())
      .then((data) => {
        const storiesList = Array.isArray(data) ? data : (data.stories || []);
        const filteredStories = storiesList.filter(s => isMatchingProject(s.project_id, selectedProjectId));
        const activeStories = (filteredStories.length > 0 || !selectedProjectId) ? filteredStories : storiesList;

        const epicsSet = new Set(activeStories.map(s => s.epic || s.feature).filter(Boolean));
        const totalSP = activeStories.reduce((acc, s) => acc + (Number(s.story_points) || 5), 0);
        const calculatedSprints = Math.max(activeStories.length > 0 ? 1 : 0, Math.ceil(totalSP / 30));

        setStats({
          stories: activeStories.length,
          reqs: activeStories.length,
          epics: epicsSet.size || (activeStories.length > 0 ? Math.max(1, Math.ceil(activeStories.length / 5)) : (epicCount || 0)),
          sprints: calculatedSprints,
        });
      })
      .catch((err) => {
        // Fallback to local storage if API not available
        const email = user?.email || 'default';
        const storedSprints = parseInt(localStorage.getItem(`planned_sprints_${email}`) || '0', 10);
        const storedStories = parseInt(localStorage.getItem(`planned_stories_${email}`) || '0', 10);
        setStats({
          stories: storedStories || 0,
          sprints: storedSprints || 0,
          reqs: reqCount || 0,
          epics: epicCount || 0
        });
      });
  }, [reqCount, epicCount, selectedProjectId, user?.email]);

  const menuItems = [
    {
      id: 'artifacts',
      label: 'Development Artifacts',
      subtitle: 'Requirements & User Stories',
      icon: FileCode,
      badge: reqCount > 0 ? `${reqCount} Items` : 'Active',
      color: 'from-purple-500 to-indigo-600',
    },
    {
      id: 'projects',
      label: 'Project Management',
      subtitle: 'AI Sprint Planning & DAG',
      icon: Calendar,
      badge: stats.stories > 0 ? `${stats.stories} Stories` : 'Active',
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

        {/* Live Agile Sync Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-slate-100 dark:to-slate-800 border border-indigo-500/20 space-y-2">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
            <Sparkles size={14} />
            <span>Research Metrics</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
            <div>
              <span className="text-slate-400 block text-[10px]">Stories</span>
              <strong className="text-sm font-black text-slate-800 dark:text-slate-100">{stats.stories}</strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Sprints</span>
              <strong className="text-sm font-black text-indigo-600 dark:text-indigo-400">{stats.sprints}</strong>
            </div>
          </div>
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