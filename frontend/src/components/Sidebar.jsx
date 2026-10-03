import React, { useState, useEffect } from 'react';
import { LayoutDashboard, FileCode, CheckSquare, Users, Calendar, GitPullRequest, Sparkles, ChevronRight, Layers } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, reqCount, epicCount, selectedProjectId }) {
  const [member2Stats, setMember2Stats] = useState({ stories: 0, sprints: 0, reqs: 0, epics: 0 });

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

        setMember2Stats({
          stories: activeStories.length,
          reqs: activeStories.length,
          epics: epicsSet.size || (activeStories.length > 0 ? Math.max(1, Math.ceil(activeStories.length / 5)) : (epicCount || 0)),
          sprints: calculatedSprints,
        });
      })
      .catch((err) => console.error("Sidebar API Error:", err));
  }, [reqCount, epicCount, selectedProjectId]);

  const menuItems = [
    {
      id: 'artifacts',
      label: 'Development Artifacts',
      subtitle: 'Module 1: User Stories & AC',
      icon: FileCode,
      badge: reqCount > 0 ? `${reqCount} Items` : 'Active',
      color: 'from-purple-500 to-indigo-600',
    },
    {
      id: 'dashboard',
      label: 'Executive Overview',
      subtitle: 'Landing Page & Analytics',
      icon: LayoutDashboard,
      badge: null,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 'workitems',
      label: 'Work Items',
      subtitle: 'Module 2: Work Items',
      icon: CheckSquare,
      badge: 'Active',
      color: 'from-blue-600 to-cyan-600',
    },
    {
      id: 'resources',
      label: 'Resource Allocation',
      subtitle: 'Module 3: Resource Management',
      icon: Users,
      badge: 'Active',
      color: 'from-indigo-500 to-purple-600',
    },
    {
      id: 'projects',
      label: 'Sprint Planning',
      subtitle: 'Module 4: Project Management',
      icon: Calendar,
      badge: member2Stats.stories > 0 ? `${member2Stats.stories} Stories` : 'Active',
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 'changerequests',
      label: 'Change Requests',
      subtitle: 'Governance & Impact Analysis',
      icon: GitPullRequest,
      badge: 'Active',
      color: 'from-amber-500 to-rose-600',
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

        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white shadow-md border border-indigo-900/50 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl"></div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center gap-1">
              <Sparkles size={12} /> Analytics Summary
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 my-2 text-center">
            <div className="bg-white/5 p-1.5 rounded-lg border border-white/10">
              <span className="text-[9px] text-slate-400 block uppercase">Reqs</span>
              <span className="text-sm font-bold text-white">{member2Stats.reqs || reqCount}</span>
            </div>
            <div className="bg-white/5 p-1.5 rounded-lg border border-white/10">
              <span className="text-[9px] text-slate-400 block uppercase">Epics</span>
              <span className="text-sm font-bold text-indigo-300">{member2Stats.epics || epicCount}</span>
            </div>
            <div className="bg-emerald-900/20 p-1.5 rounded-lg border border-emerald-500/30">
              <span className="text-[9px] text-emerald-400 block uppercase">Stories</span>
              <span className="text-sm font-bold text-white">{member2Stats.stories}</span>
            </div>
            <div className="bg-emerald-900/20 p-1.5 rounded-lg border border-emerald-500/30">
              <span className="text-[9px] text-emerald-400 block uppercase">Sprints</span>
              <span className="text-sm font-bold text-emerald-300">{member2Stats.sprints}</span>
            </div>
          </div>
          
          <p className="text-[9px] text-slate-400 text-center leading-tight mt-1">
            ML Analytics Engine
          </p>
        </div>
      </div>
    </aside>
  );
}