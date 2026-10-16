import React, { useState } from 'react';
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
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-700 bg-slate-800/80 rounded-xl p-1.5 gap-2 shadow-lg">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 font-bold text-sm rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/30'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleClearSampleData}
          className="px-3.5 py-2 text-xs font-bold rounded-lg text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all flex items-center gap-1.5"
          title="Clear all sample user stories, work items, and sprint allocations"
        >
          <span>🗑️ Clear Sample Data</span>
        </button>
      </div>

      <div className="w-full bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 shadow-xl min-h-[500px]">
        {activeTab === 'dashboard' && <SprintDashboard requirements={requirements} />}
        {activeTab === 'add-stories' && <AddStories onStoryAdded={() => setActiveTab('sprint-plan')} />}
        {activeTab === 'sprint-plan' && (
          <SprintPlanOutput 
            requirements={requirements} 
            onNavigateToAddStories={() => setActiveTab('add-stories')}
            onNavigateToArtifacts={onNavigateToArtifacts}
            onNavigateToResources={handleNavigateToResources}
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
  );
}