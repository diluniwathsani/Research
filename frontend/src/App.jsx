import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';

// Core Module Views
import DashboardView from './components/DashboardView';
import DevelopmentArtifactModule from './components/DevelopmentArtifactModule';
import ResourceManagementModule from './components/ResourceManagementModule';
import ProjectManagementModule from './components/ProjectManagementModule';
import ChangeRequestModule from './components/ChangeRequestModule';

// Auth Components
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';

function MainLayout() {
  const { user, isAuthenticated } = useAuth();

  // --- STATE MANAGEMENT ---
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(true);
  
  // Navigation tab: 'artifacts', 'dashboard', 'resources', 'projects', 'changerequests'
  const [activeTab, setActiveTab] = useState('artifacts');
  const [projectInitialTab, setProjectInitialTab] = useState('sprint-plan');

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
  }, []);

  // --- THEME SYNC ---
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // --- API HANDLERS ---
  const fetchRequirements = async (overrideProjectId = null, retryCount = 0) => {
    try {
      const pid = (typeof overrideProjectId === 'string' && overrideProjectId) ? overrideProjectId : selectedProjectId;
      const url = pid 
        ? `http://localhost:3000/api/requirements?project_id=${encodeURIComponent(pid)}`
        : 'http://localhost:3000/api/requirements';
      const res = await axios.get(url);
      const list = Array.isArray(res.data) ? res.data : (res.data && res.data.data ? res.data.data : []);
      setRequirements(list);
      setError(null);
      fetchProjects();
    } catch (err) {
      console.error('Fetch requirements error:', err);
      setError("Failed to fetch requirements from backend.");
      if (retryCount < 4) {
        setTimeout(() => {
          fetchRequirements(overrideProjectId, retryCount + 1);
        }, 2000);
      }
    }
  };

  const handleUploadSuccess = (uploadData) => {
    if (uploadData && uploadData.project_id) {
      setSelectedProjectId(uploadData.project_id);
      fetchRequirements(uploadData.project_id);
    } else {
      fetchRequirements();
    }
    fetchProjects();
  };

  useEffect(() => {
    fetchRequirements();
  }, [selectedProjectId]);

  const handleProcess = async () => {
    setLoading(true);
    setError(null);
    try {
      await axios.post('http://localhost:3000/api/process', { email: user?.email });
      await fetchRequirements();
      setLoading(false);
    } catch (err) {
      console.error('Process error:', err);
      setError("Failed to process requirements via pipeline.");
      setLoading(false);
    }
  };

  const handleExport = () => {
    const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
    window.location.href = `http://localhost:3000/api/export${emailParam}`;
  };

  const epicCount = new Set(requirements.map((r) => r.epic).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans transition-colors duration-200 text-slate-900 dark:text-slate-100">
      
      {/* Top Header */}
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
              onUploadSuccess={handleUploadSuccess}
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
              onFetchRequirements={handleUploadSuccess}
              onProcess={handleProcess}
              onExport={handleExport}
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              onNavigateToSprintPlan={() => {
                setProjectInitialTab('sprint-plan');
                setActiveTab('projects');
              }}
            />
          )}

          {activeTab === 'projects' && (
            <ProjectManagementModule 
              requirements={requirements} 
              initialTab={projectInitialTab}
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              onNavigateToArtifacts={() => setActiveTab('artifacts')}
              onNavigateToChangeRequests={() => setActiveTab('changerequests')}
              onNavigateToResources={() => setActiveTab('resources')}
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

      {/* Auth Modal */}
      <AuthModal />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <AuthProvider>
        <MainLayout />
      </AuthProvider>
    </DndProvider>
  );
}
