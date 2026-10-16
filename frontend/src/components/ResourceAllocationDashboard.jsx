import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  Search, 
  Filter, 
  Briefcase, 
  Cpu, 
  TrendingUp, 
  Layers, 
  RefreshCw,
  Sparkles,
  BarChart3
} from 'lucide-react';

const EXPRESS_API = 'http://localhost:3000/api';

export default function ResourceAllocationDashboard({ projects = [], selectedProjectId, onSelectProject }) {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('ALL');

  // Load dashboard data
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const url = filterProject && filterProject !== 'ALL' 
        ? `${EXPRESS_API}/resource-allocations/dashboard?project_id=${filterProject}`
        : `${EXPRESS_API}/resource-allocations/dashboard`;
      const res = await axios.get(url);
      const list = res.data?.allocations || res.data?.data || [];
      setAllocations(list);
    } catch (err) {
      console.error('Error fetching resource allocations dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filterProject]);

  // Sync prop selectedProjectId to filterProject
  useEffect(() => {
    if (selectedProjectId) {
      setFilterProject(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Filter tasks by search query
  const filteredAllocations = allocations.filter(item => {
    const query = searchQuery.toLowerCase();
    const matchName = (item.developer_name || '').toLowerCase().includes(query);
    const matchTask = (item.story_title || '').toLowerCase().includes(query) || (item.story_id || '').toLowerCase().includes(query);
    const matchProject = (item.project_name || '').toLowerCase().includes(query) || (item.project_id || '').toLowerCase().includes(query);
    return matchName || matchTask || matchProject;
  });

  // Calculate Key Metrics
  const uniqueResources = new Set(allocations.map(a => a.developer_name || a.developer_id)).size;
  const totalTasks = allocations.length;
  const totalHours = allocations.reduce((sum, a) => sum + (Number(a.allocated_hours) || 0), 0);
  const totalCapacity = uniqueResources * 40 || 1;
  const avgUtilization = Math.min(100, Math.round((totalHours / totalCapacity) * 100));

  const handleClearData = async () => {
    if (!window.confirm("Are you sure you want to clear all past resource allocation data?")) return;
    try {
      await axios.delete(`${EXPRESS_API}/resource-allocations/clear`);
      setAllocations([]);
    } catch (err) {
      console.error('Error clearing allocation data:', err);
    }
  };

  return (
    <div className="space-y-6">

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Allocated Resources */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Allocated Resources
            </span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {uniqueResources}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active Engineers</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
            <CheckCircle2 size={12} className="text-emerald-500" /> Across registered projects
          </p>
        </div>

        {/* KPI 2: Total Allocated Tasks */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Allocated Tasks
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {totalTasks}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">User Stories</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">Assigned to sprints & resources</p>
        </div>

        {/* KPI 3: Total Allocated Hours */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Time Allocated
            </span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {totalHours}h
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Hours</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">Planned work commitment</p>
        </div>

        {/* KPI 4: Team Capacity Utilization */}
        <div className="bg-white dark:bg-slate-800/90 rounded-2xl p-5 border border-slate-200 dark:border-slate-700/80 shadow-sm relative overflow-hidden group hover:border-indigo-500/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Team Utilization
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {avgUtilization}%
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cap Utilization</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full" style={{ width: `${avgUtilization}%` }}></div>
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-80">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by resource, task or project..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400 shrink-0" />
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Projects</option>
              {projects.map(p => (
                <option key={p.project_id || p.id} value={p.project_id || p.id}>
                  {p.project_name || p.name} ({p.project_id || p.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboardData}
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleClearData}
            className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <span>🗑️ Clear Allocation Data</span>
          </button>
        </div>

      </div>

      {/* Resource Allocations Main Data Table */}
      <div className="bg-white dark:bg-slate-800/90 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-600 dark:text-indigo-400" />
              Allocated Resources & Tasks Breakdown
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live snapshot of resource assignments, projects, tasks, and allocated hours
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs border border-indigo-500/20">
            {filteredAllocations.length} Records
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw size={28} className="animate-spin text-indigo-500 mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading resource allocations...</p>
          </div>
        ) : filteredAllocations.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Users size={40} className="mx-auto mb-2 opacity-40 text-indigo-400" />
            <p className="text-sm font-bold text-slate-300">No Resources Allocated Yet</p>
            <p className="text-xs font-medium text-slate-400 max-w-md mx-auto">
              Allocation data is clean. Go to the <b>Resource Allocation Config & Execution</b> tab and click ⚡ <b>Run AI Resource Allocation Engine</b> to assign team members.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-5 py-3.5">Allocated Resource</th>
                  <th className="px-5 py-3.5">Task / User Story</th>
                  <th className="px-5 py-3.5">Project & Sprint</th>
                  <th className="px-5 py-3.5">Time Allocated</th>
                  <th className="px-5 py-3.5">Complexity & Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
                {filteredAllocations.map((item, idx) => {
                  const cap = Number(item.developer_capacity) || 40;
                  const hrs = Number(item.allocated_hours) || 16;
                  const util = Math.min(100, Math.round((hrs / cap) * 100));

                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      
                      {/* Allocated Resource */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                            {item.developer_name ? item.developer_name.charAt(0) : 'D'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                              {item.developer_name}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                              {item.developer_role || 'Software Engineer'} • <span className="text-indigo-600 dark:text-indigo-400">{item.primary_domain}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Task / User Story */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[10px] border border-indigo-200 dark:border-indigo-800">
                            {item.story_id}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            item.priority === 'HIGH' || item.priority === 'CRITICAL'
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          }`}>
                            {item.priority || 'MEDIUM'}
                          </span>
                        </div>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs line-clamp-2">
                          {item.story_title}
                        </div>
                      </td>

                      {/* Project & Sprint */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {item.project_name || 'Aurora ERP System'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-mono text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                            {item.project_id}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-300 text-[11px] font-bold border border-purple-500/20">
                            {item.sprint_id}
                          </span>
                        </div>
                      </td>

                      {/* Time Allocated */}
                      <td className="px-5 py-4">
                        <div className="flex items-baseline gap-1 mb-1">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {hrs} Hours
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">({util}% capacity)</span>
                        </div>
                        <div className="w-32 bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              util >= 90 ? 'bg-rose-500' : util > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${util}%` }}
                          />
                        </div>
                      </td>

                      {/* Complexity & Status */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[10px] w-max ${
                            item.predicted_complexity === 'HIGH'
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : item.predicted_complexity === 'MEDIUM'
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}>
                            <Cpu size={11} /> {item.predicted_complexity || 'MEDIUM'} COMPLEXITY
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                            <CheckCircle2 size={12} /> ALLOCATED
                          </span>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
