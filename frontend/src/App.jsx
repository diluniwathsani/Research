import React, { useState, useEffect } from 'react';
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

function App() {
  // --- STATE MANAGEMENT ---
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDark, setIsDark] = useState(true);
  
  // Navigation tab: 'artifacts', 'dashboard', 'resources', 'projects', 'changerequests'
  const [activeTab, setActiveTab] = useState('artifacts');

  // --- THEME SYNC ---
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // --- API HANDLERS ---
  const fetchRequirements = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/requirements');
      setRequirements(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch requirements from backend.");
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  const handleProcess = async () => {
    setLoading(true);
    setError(null);
    try {
      await axios.post('http://localhost:3000/api/process');
      await fetchRequirements();
    } catch (err) {
      console.error(err);
      setError("Failed to process requirements via AI pipeline.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.location.href = 'http://localhost:3000/api/export';
  };

  // Count epics for sidebar stat badge
  const epicSet = new Set(requirements.map(r => r.epic).filter(Boolean));
  const epicCount = epicSet.size;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-200 font-sans antialiased">
      
      {/* Top Admin Header */}
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
            />
          )}

          {activeTab === 'resources' && (
            <ResourceManagementModule requirements={requirements} />
          )}

          {activeTab === 'projects' && (
            <ProjectManagementModule requirements={requirements} />
          )}

          {activeTab === 'changerequests' && (
            <ChangeRequestModule requirements={requirements} />
          )}

        </main>
      </div>

      {/* Admin Dashboard Footer */}
      <Footer />
    </div>
  );
}

export default App;

