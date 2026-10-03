import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';

// Core Module Views
import DashboardView from './components/DashboardView';
import DevelopmentArtifactModule from './components/DevelopmentArtifactModule';
import WorkItemsModule from './components/WorkItemsModule';
import ResourceManagementModule from './components/ResourceManagementModule';
import ProjectManagementModule from './components/ProjectManagementModule';
import ChangeRequestModule from './components/ChangeRequestModule';

function App() {
  // --- STATE MANAGEMENT ---
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(true);
  
  // Navigation tab: 'artifacts', 'dashboard', 'resources', 'projects', 'changerequests'
  const [activeTab, setActiveTab] = useState('artifacts');

  // Global Project Selection State
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('P00001');

  const fetchProjects = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/projects');
      const list = Array.isArray(res.data) ? res.data : (res.data && res.data.data ? res.data.data : []);
      if (list.length > 0) {
        setProjects(list);
        setSelectedProjectId(prevId => {
          const exists = list.some(p => p.project_id === prevId || p.id === prevId);
          if (!prevId || !exists) {
            return list[0].project_id || list[0].id || prevId;
          }
          return prevId;
        });
      }
    } catch (err) {
      console.warn('Projects fetch error:', err.message);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [requirements]);

  // --- THEME SYNC ---
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // --- API HANDLERS ---
  const fetchRequirements = async (retryCount = 0) => {
    try {
      const url = selectedProjectId 
        ? `http://localhost:3000/api/requirements?project_id=${encodeURIComponent(selectedProjectId)}`
        : 'http://localhost:3000/api/requirements';
      const res = await axios.get(url);
      const list = Array.isArray(res.data) ? res.data : (res.data && res.data.data ? res.data.data : []);
      setRequirements(list);
      setError(null);
      fetchProjects();
    } catch (err) {
      console.error('Fetch requirements error:', err);
      setError("Failed to fetch requirements from backend.");
      // Auto-retry up to 4 times (every 2 seconds) if backend is still starting up
      if (retryCount < 4) {
        setTimeout(() => {
          fetchRequirements(retryCount + 1);
        }, 2000);
      }
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [selectedProjectId]);

  const handleProcess = async () => {
    setLoading(true);
    setError(null);
    try {
      await axios.post('http://localhost:3000/api/process');
      await fetchRequirements();
      setLoading(false);
    } catch (err) {
      console.error('Process error:', err);
      setError("Failed to process requirements via pipeline.");
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.location.href = 'http://localhost:3000/api/export';
  };

  // Count epics for sidebar stat badge
  const epicCount = new Set(requirements.map((r) => r.epic).filter(Boolean)).size;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200 text-slate-900 dark:text-slate-100">
        
        {/* Top Admin Header */}
        <Header 
          isDark={isDark} 
          setIsDark={setIsDark} 
          activeTab={activeTab} 
          reqCount={requirements.length}
          onRefresh={fetchRequirements} 
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={setSelectedProjectId}
        />

        {/* Main Body with Sidebar + View Container */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Sidebar Navigation */}
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            reqCount={requirements.length}
            epicCount={epicCount}
            selectedProjectId={selectedProjectId}
          />

          {/* Content View Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6">
            
            {activeTab === 'dashboard' && (
              <DashboardView 
                requirements={requirements}
                loading={loading}
                onRunAI={handleProcess}
                onExport={handleExport}
                onUploadSuccess={fetchRequirements}
                setActiveTab={setActiveTab}
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
              />
            )}

            {activeTab === 'artifacts' && (
              <DevelopmentArtifactModule
                requirements={requirements}
                loading={loading}
                error={error}
                onFetchRequirements={fetchRequirements}
                onProcess={handleProcess}
                onExport={handleExport}
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
              />
            )}

            {activeTab === 'workitems' && (
              <WorkItemsModule
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
              />
            )}

            {activeTab === 'resources' && (
              <ResourceManagementModule 
                requirements={requirements} 
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
              />
            )}

            {activeTab === 'projects' && (
              <ProjectManagementModule 
                requirements={requirements} 
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
              />
            )}

            {activeTab === 'changerequests' && (
              <ChangeRequestModule 
                requirements={requirements} 
                projects={projects}
                selectedProjectId={selectedProjectId}
                onSelectProject={setSelectedProjectId}
              />
            )}

          </main>
        </div>

        {/* Admin Dashboard Footer */}
        <Footer />
      </div>
    </DndProvider>
  );
}

export default App;
