import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, Code, Info, RefreshCw, Save } from 'lucide-react';
import ProjectSelection from './ProjectSelection.jsx';
import SprintSelection from './SprintSelection.jsx';
import TaskPreview from './TaskPreview.jsx';
import AllocationResults from './AllocationResults.jsx';

// API Configuration
const EXPRESS_API = 'http://localhost:3001/api';
const POOLIYADDA_API = 'http://localhost:5001/api';

export default function ResourceManagementModule() {
  // ================= STATE =================
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [apiSource, setApiSource] = useState('express');

  // ================= LOAD PROJECTS =================
  useEffect(() => {
    axios.get(`${EXPRESS_API}/projects`)
      .then(res => setProjects(res.data))
      .catch(err => console.error('Error loading projects:', err));
  }, []);

  // ================= LOAD DEVELOPERS =================
  useEffect(() => {
    axios.get(`${EXPRESS_API}/developers`)
      .then(res => setDevelopers(res.data))
      .catch(err => console.error('Error loading developers:', err));
  }, []);

  // ================= LOAD SPRINTS =================
  useEffect(() => {
    if (!selectedProject) return;
    axios.get(`${EXPRESS_API}/projects/${selectedProject.id}/sprints`)
      .then(res => setSprints(res.data))
      .catch(err => console.error('Error loading sprints:', err));
    setSelectedSprint(null);
    setTasks([]);
    setAssignments([]);
    setShowResults(false);
  }, [selectedProject]);

  // ================= LOAD TASKS =================
  useEffect(() => {
    if (!selectedSprint) return;
    setLoading(true);
    axios.get(`${EXPRESS_API}/sprints/${selectedSprint.id}/tasks`)
      .then(res => {
        const taskData = Array.isArray(res.data) ? res.data : [];
        setTasks(taskData);
        setApiSource('express');
      })
      .catch(err => {
        console.error('Error loading tasks:', err);
        setTasks([]);
      })
      .finally(() => setLoading(false));
    setAssignments([]);
    setShowResults(false);
  }, [selectedSprint]);

  // ================= RUN AI ALLOCATION =================
  const runAllocation = async () => {
    if (developers.length === 0) {
      alert('No developers found. Please add developers first.');
      return;
    }
    if (tasks.length === 0) {
      alert('No tasks found for this sprint.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${EXPRESS_API}/allocate`, {
        tasks: tasks,
        sprint_id: selectedSprint ? selectedSprint.id : null
      });
      setAssignments(response.data.assignments);
      setShowResults(true);
    } catch (error) {
      console.error('Allocation error:', error);
      alert('Allocation failed: ' + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  // ================= REBALANCE =================
  const handleRebalance = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${EXPRESS_API}/allocate`, {
        tasks: tasks,
        sprint_id: selectedSprint ? selectedSprint.id : null
      });
      setAssignments(response.data.assignments);
    } catch (error) {
      console.error('Rebalance error:', error);
      alert('Rebalance failed: ' + (error.response?.data?.error || error.message));
    }
    setLoading(false);
  };

  // ================= SAVE ALLOCATION =================
  const handleSaveAllocation = async () => {
    if (!selectedSprint) return;
    try {
      await axios.post(`${EXPRESS_API}/task-assignments`, {
        sprint_id: selectedSprint.id,
        assignments: assignments
      });
      alert('Allocation saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save allocation');
    }
  };

  // ================= DRAG & DROP =================
  const handleTaskMove = (task, fromDevId, toDevId) => {
    const updatedAssignments = assignments.map(a => {
      if (a.story_id === task.story_id) {
        const targetDev = developers.find(d => d.id === toDevId);
        return {
          ...a,
          developer_id: toDevId,
          developer_name: targetDev ? targetDev.name : a.developer_name
        };
      }
      return a;
    });
    setAssignments(updatedAssignments);
  };

  // ================= BACK TO TASKS =================
  const handleBackToTasks = () => {
    setShowResults(false);
  };

  // ================= RENDER =================
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
              <Users size={14} className="text-indigo-300" />
              <span>AI Sprint Allocation System</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold">
              Team Resource & Capacity Management
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
              AI-powered task allocation based on developer skills, domain expertise, and capacity
            </p>
          </div>
        </div>
      </div>

      {/* MAIN ALLOCATION CONTENT */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm">
        {!showResults ? (
          <>
            {/* Project Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Select Project</h3>
              <ProjectSelection
                projects={projects}
                selectedProject={selectedProject}
                onSelect={setSelectedProject}
              />
            </div>

            {/* Sprint Selection */}
            {selectedProject && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">Select Sprint</h3>
                <SprintSelection
                  sprints={sprints}
                  selectedSprint={selectedSprint}
                  onSelect={setSelectedSprint}
                />
              </div>
            )}

            {/* Task Preview */}
            {selectedSprint && (
              <TaskPreview
                tasks={tasks}
                onRunAllocation={runAllocation}
                loading={loading}
                apiSource={apiSource}
                apiStatus={{ pooliyadda: false, express: true }}
              />
            )}

            {/* Empty State when no sprint selected */}
            {!selectedSprint && selectedProject && (
              <div className="text-center py-12">
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 inline-block mb-4">
                  <Code size={40} />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Select a Sprint</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Choose a sprint to view and allocate tasks</p>
              </div>
            )}
          </>
        ) : (
          /* Allocation Results */
          <AllocationResults
            assignments={assignments}
            developers={developers}
            tasks={tasks}
            selectedSprint={selectedSprint}
            onRebalance={handleRebalance}
            onSave={handleSaveAllocation}
            onTaskMove={handleTaskMove}
            onBack={handleBackToTasks}
            loading={loading}
            apiSource={apiSource}
          />
        )}
      </div>

      {/* Footer Status */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-700">
          <Info size={14} />
          <span>Status: AI Allocation System Active</span>
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500">
          Powered by Rule-Based Allocation Engine
        </div>
      </div>
    </div>
  );
}