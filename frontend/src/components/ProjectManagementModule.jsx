import React, { useState } from 'react';
import { 
  Clock, Layers, Calendar, TrendingUp, Flame, Network, Sparkles 
} from 'lucide-react';
import SprintDashboard from '../pages/SprintDashboard';
import AddStories from '../pages/AddStories';
import SprintPlanOutput from '../pages/SprintPlanOutput';
import Replanning from '../pages/Replanning';
import Performance from '../pages/Performance';
import ResourceManagementModule from './ResourceManagementModule';

export default function ProjectManagementModule({ 
  requirements = [], 
  initialTab = 'sprint-plan', 
  onNavigateToArtifacts, 
  onNavigateToChangeRequests,
  onNavigateToResources: parentOnNavigateToResources,
  projects = [],
  selectedProjectId = '',
  onSelectProject
}) {
  const [activeTab, setActiveTab] = useState(initialTab || 'sprint-plan');
  const [sprintViewTab, setSprintViewTab] = useState('gantt');
  const [storiesCount, setStoriesCount] = useState(null);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'add-stories', label: 'Add Stories' },
    { id: 'sprint-plan', label: 'Sprint Plan' },
    { id: 'resources', label: 'Resource Allocation' },
    { id: 'replanning', label: 'Replanning' },
    { id: 'performance', label: 'Performance' },
  ];

  const handleNavigateToResources = () => {
    setActiveTab('resources');
    if (parentOnNavigateToResources) {
      parentOnNavigateToResources();
    }
  };

  const handleClearSampleData = async () => {
    if (!window.confirm("Are you sure you want to clear all sample data in the Project Management module?")) {
      return;
    }
    try {
      await fetch('http://localhost:8082/api/sprint-plan/reset', { method: 'POST' }).catch(() => {});
      await fetch('http://localhost:3000/api/project-management/clear', { method: 'DELETE' }).catch(() => {});
      
      localStorage.removeItem('resource_management_handoff');
      localStorage.removeItem('sprint_plan_notice');
      sessionStorage.removeItem('sprint_plan_notice');

      alert("✅ All sample data in Project Management module cleared successfully!");
      window.dispatchEvent(new Event('sprints-updated'));
      window.location.reload();
    } catch (err) {
      console.error("Clear error:", err);
      alert("Failed to clear sample data: " + err.message);
    }
  };

  return (
    <div className="w-full min-h-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200">
      
      {/* Full Top Navigation Panel (Sticky Docked Header, Solid, Edge-to-Edge) */}
      <div className="sticky top-0 z-30 w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs transition-colors duration-200">
        {/* Tier 1: Core Module Navigation Tabs */}
        <div className="px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 sm:px-4 py-2 font-bold text-xs sm:text-sm rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/40'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleClearSampleData}
            className="px-3.5 py-2 text-xs font-bold rounded-xl text-rose-600 dark:text-rose-300 bg-rose-500/10 border border-rose-300 dark:border-rose-500/30 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 active:scale-95"
            title="Clear all sample user stories, work items, and sprint allocations"
          >
            <span>🗑️ Clear Sample Data</span>
          </button>
        </div>

        {/* Tier 2: Sprint Plan Sub-Navigation Pane (When on sprint-plan tab) */}
        {activeTab === 'sprint-plan' && (
          <div className="px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 bg-slate-50/90 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800/50">
            <div className="inline-flex flex-wrap items-center gap-1 bg-slate-200/70 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-slate-300/60 dark:border-slate-800 shadow-inner">
              <button
                onClick={() => setSprintViewTab("gantt")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 duration-150 active:scale-[0.98] ${
                  sprintViewTab === "gantt"
                    ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60"
                }`}
              >
                <Clock size={14} className={sprintViewTab === "gantt" ? "text-indigo-600 dark:text-white" : "text-slate-500 dark:text-slate-400"} />
                <span>Gantt Timeline</span>
              </button>
              <button
                onClick={() => setSprintViewTab("kanban")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 duration-150 active:scale-[0.98] ${
                  sprintViewTab === "kanban"
                    ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60"
                }`}
              >
                <Layers size={14} className={sprintViewTab === "kanban" ? "text-indigo-600 dark:text-white" : "text-slate-500 dark:text-slate-400"} />
                <span>Kanban Board</span>
              </button>
              <button
                onClick={() => setSprintViewTab("plan")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 duration-150 active:scale-[0.98] ${
                  sprintViewTab === "plan"
                    ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60"
                }`}
              >
                <Calendar size={14} className={sprintViewTab === "plan" ? "text-indigo-600 dark:text-white" : "text-slate-500 dark:text-slate-400"} />
                <span>Sprint Plans</span>
              </button>
              <button
                onClick={() => setSprintViewTab("burndown")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 duration-150 active:scale-[0.98] ${
                  sprintViewTab === "burndown"
                    ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60"
                }`}
              >
                <TrendingUp size={14} className={sprintViewTab === "burndown" ? "text-indigo-600 dark:text-white" : "text-slate-500 dark:text-slate-400"} />
                <span>Burndown & Velocity</span>
              </button>
              <button
                onClick={() => setSprintViewTab("cpm")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 duration-150 active:scale-[0.98] ${
                  sprintViewTab === "cpm"
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-rose-400/40"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60"
                }`}
              >
                <Flame size={14} className={sprintViewTab === "cpm" ? "text-amber-300 animate-pulse" : "text-rose-500 dark:text-rose-400"} />
                <span>Critical Path (CPM)</span>
              </button>
              <button
                onClick={() => setSprintViewTab("dag")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 duration-150 active:scale-[0.98] ${
                  sprintViewTab === "dag"
                    ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60"
                }`}
              >
                <Network size={14} className={sprintViewTab === "dag" ? "text-indigo-600 dark:text-white" : "text-indigo-500 dark:text-indigo-400"} />
                <span>Dependency Network</span>
              </button>
              <button
                onClick={() => setSprintViewTab("benchmark")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 duration-150 active:scale-[0.98] ${
                  sprintViewTab === "benchmark"
                    ? "bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-900/5 dark:ring-white/20"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/60"
                }`}
              >
                <Sparkles size={14} className={sprintViewTab === "benchmark" ? "text-indigo-600 dark:text-white" : "text-amber-500 dark:text-amber-400"} />
                <span>3-Way Benchmark</span>
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-xl bg-slate-200/60 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{storiesCount ? `${storiesCount} Stories Allocated` : 'Stories Allocated'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Workspace Body */}
      <div className="p-4 sm:p-6 space-y-6">
        <div className="w-full bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 rounded-3xl p-4 sm:p-6 shadow-sm dark:shadow-xl min-h-[500px] transition-colors duration-200">
          {activeTab === 'dashboard' && <SprintDashboard requirements={requirements} />}
          {activeTab === 'add-stories' && <AddStories onStoryAdded={() => setActiveTab('sprint-plan')} />}
          {activeTab === 'sprint-plan' && (
            <SprintPlanOutput 
              requirements={requirements} 
              onNavigateToAddStories={() => setActiveTab('add-stories')}
              onNavigateToArtifacts={onNavigateToArtifacts}
              onNavigateToResources={handleNavigateToResources}
              activeTab={sprintViewTab}
              setActiveTab={setSprintViewTab}
              onStoriesCountChange={setStoriesCount}
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={onSelectProject}
            />
          )}
          {activeTab === 'resources' && (
            <ResourceManagementModule
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={onSelectProject}
              onNavigateToSprintPlan={() => setActiveTab('sprint-plan')}
            />
          )}
          {activeTab === 'replanning' && (
            <Replanning 
              requirements={requirements} 
              onNavigateToChangeRequests={onNavigateToChangeRequests} 
            />
          )}
          {activeTab === 'performance' && <Performance />}
        </div>
      </div>
    </div>
  );
}