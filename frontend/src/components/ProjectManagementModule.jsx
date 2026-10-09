import React, { useState } from 'react';
import SprintDashboard from '../pages/SprintDashboard';
import AddStories from '../pages/AddStories';
import SprintPlanOutput from '../pages/SprintPlanOutput';
import Replanning from '../pages/Replanning';
import Performance from '../pages/Performance';

export default function ProjectManagementModule({ 
  requirements = [], 
  initialTab = 'sprint-plan', 
  onNavigateToArtifacts, 
  onNavigateToChangeRequests,
  onNavigateToResources
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
    { id: 'replanning', label: 'Replanning' },
    { id: 'performance', label: 'Performance' },
  ];

  return (
    <div className="w-full min-h-screen bg-slate-900 text-slate-100 p-6 space-y-6">
      <div className="flex flex-wrap border-b border-slate-700 bg-slate-800/80 rounded-xl p-1.5 gap-2 shadow-lg">
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

      <div className="w-full bg-slate-800/40 border border-slate-700/60 rounded-2xl p-6 shadow-xl min-h-[500px]">
        {activeTab === 'dashboard' && <SprintDashboard requirements={requirements} />}
        {activeTab === 'add-stories' && <AddStories onStoryAdded={() => setActiveTab('sprint-plan')} />}
        {activeTab === 'sprint-plan' && (
          <SprintPlanOutput 
            requirements={requirements} 
            onNavigateToAddStories={() => setActiveTab('add-stories')}
            onNavigateToArtifacts={onNavigateToArtifacts}
            onNavigateToResources={onNavigateToResources}
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