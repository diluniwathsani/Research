import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
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

  // --- THEME SYNC ---
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // --- API HANDLERS (ISOLATED PER USER EMAIL) ---
  const fetchRequirements = useCallback(async () => {
    if (!user?.email) {
      setRequirements([]);
      return;
    }

    try {
      setError(null);
      const res = await axios.get(`http://localhost:3000/api/requirements?email=${encodeURIComponent(user.email)}`);
      setRequirements(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch user requirements from backend.");
    }
  }, [user?.email]);

  // Auto-refresh and isolate data when user account changes or signs in
  useEffect(() => {
    if (user?.email) {
      fetchRequirements();
    } else {
      setRequirements([]);
    }
  }, [user?.email, fetchRequirements]);

  const handleProcess = async () => {
    setLoading(true);
    setError(null);
    try {
      await axios.post('http://localhost:3000/api/process', { email: user?.email });
      await fetchRequirements();
    } catch (err) {
      console.error(err);
      setError("Failed to process requirements via AI pipeline.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
    window.location.href = `http://localhost:3000/api/export${emailParam}`;
  };

  // Count epics for sidebar stat badge
  const epicSet = new Set(requirements.map(r => r.epic).filter(Boolean));
  const epicCount = epicSet.size;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-200 font-sans antialiased">
      
      {/* Top Header */}
      <Header 
        isDark={isDark} 
        setIsDark={setIsDark} 
        activeTab={activeTab} 
        reqCount={requirements.length}
        onRefresh={fetchRequirements} 
      />

      {/* Main Body with Sidebar + View Container */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Navigation */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          reqCount={requirements.length}
          epicCount={epicCount}
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
              onNavigateToSprintPlan={() => setActiveTab('projects')}
            />
          )}

          {activeTab === 'resources' && (
            <ResourceManagementModule requirements={requirements} />
          )}

          {activeTab === 'projects' && (
            <ProjectManagementModule 
              requirements={requirements} 
              initialTab={projectInitialTab}
              onNavigateToArtifacts={() => setActiveTab('artifacts')}
              onNavigateToChangeRequests={() => setActiveTab('changerequests')}
              onNavigateToResources={() => setActiveTab('resources')}
            />
          )}

          {activeTab === 'changerequests' && (
            <ChangeRequestModule />
          )}

        </main>
      </div>

      {/* Global Auth Modal */}
      <AuthModal />

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
