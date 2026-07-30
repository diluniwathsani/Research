import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Upload, Download, Cpu, RefreshCw, FileText, Moon, Sun } from 'lucide-react';
import FileUpload from './components/Upload';
import RequirementsTable from './components/RequirementsTable';

function App() {
  // --- STATE MANAGEMENT ---
  // requirements: holds the array of requirement objects fetched from the DB
  const [requirements, setRequirements] = useState([]);
  // loading: toggles the UI spinner during backend processing
  const [loading, setLoading] = useState(false);
  // error: stores error messages for display in the UI
  const [error, setError] = useState(null);
  // isDark: controls the application's light/dark mode theme
  const [isDark, setIsDark] = useState(true);

  // --- THEME SYNC ---
  // Applies the 'dark' class to the document root whenever isDark changes
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // --- API HANDLERS ---
  
  // fetchRequirements: GETs the latest requirement records from the backend
  const fetchRequirements = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/requirements');
      setRequirements(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch requirements from backend.");
    }
  };

  // Run on initial mount
  useEffect(() => {
    fetchRequirements();
  }, []);

  // handleProcess: Triggers the Python AI pipeline on the backend
  const handleProcess = async () => {
    setLoading(true);
    try {
      // POST request to start clustering, validation, and story generation
      await axios.post('http://localhost:3000/api/process');
      // Refresh the table with updated AI artifacts
      await fetchRequirements();
    } catch (err) {
      console.error(err);
      setError("Failed to process requirements.");
    } finally {
      setLoading(false);
    }
  };

  // handleExport: Redirects to the backend export endpoint for Excel download
  const handleExport = () => {
    window.location.href = 'http://localhost:3000/api/export';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-200">
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-lg px-6 py-4 flex items-center justify-between sticky top-0 z-50 transition-colors duration-200">
        <div className="flex items-center space-x-3">
          <div className="bg-primary p-2 rounded-lg">
            <Cpu size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            AI Requirements Engine
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-700 rounded-lg"
            title="Toggle Theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={fetchRequirements}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-white transition-colors bg-slate-100 dark:bg-slate-700 rounded-lg"
            title="Refresh Data"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* Header Section */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-md dark:shadow-xl border border-slate-200 dark:border-slate-700 transition-colors duration-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 w-full">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-slate-800 dark:text-white">
                <FileText size={20} className="text-primary"/> 
                Upload Template
              </h2>
              <FileUpload onUploadSuccess={fetchRequirements} />
            </div>
            
            <div className="hidden md:block w-px h-32 bg-slate-200 dark:bg-slate-700 transition-colors duration-200"></div>

            <div className="flex-1 w-full flex flex-col items-center justify-center space-y-4">
               <h2 className="text-lg font-semibold w-full text-center mb-2 text-slate-800 dark:text-white">Actions</h2>
               <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                <button 
                  onClick={handleProcess} 
                  disabled={loading || requirements.length === 0}
                  className="relative group overflow-hidden rounded-xl bg-primary px-8 py-4 font-bold text-white transition-all hover:scale-105 hover:shadow-[0_0_40px_8px_rgba(99,102,241,0.3)] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -translate-x-full skew-x-12"></div>
                  {loading ? <RefreshCw className="animate-spin" size={20} /> : <Cpu size={20} />}
                  <span>{loading ? 'Processing ML Pipeline...' : 'Run AI Analysis'}</span>
                </button>

                <button 
                  onClick={handleExport}
                  disabled={requirements.length === 0}
                  className="rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-8 py-4 font-bold text-slate-700 dark:text-white transition-all hover:bg-slate-200 dark:hover:bg-slate-600 hover:shadow-md dark:hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  <Download size={20} />
                  <span>Export Excel</span>
                </button>
               </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 p-4 rounded-xl">
            {error}
          </div>
        )}

        {/* Data Section */}
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-md dark:shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors duration-200">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 transition-colors duration-200">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Requirements Data</h2>
            <span className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 text-sm py-1 px-3 rounded-full border border-slate-300 dark:border-slate-700">
              Total: {requirements.length}
            </span>
          </div>
          <RequirementsTable requirements={requirements} onUpdate={fetchRequirements} />
        </section>

      </main>
    </div>
  );
}

export default App;
