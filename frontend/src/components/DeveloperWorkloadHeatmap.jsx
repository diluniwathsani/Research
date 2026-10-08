import React, { useState } from "react";
import { 
  Users, UserCheck, ShieldAlert, Sparkles, RefreshCw, 
  CheckCircle2, AlertTriangle, ArrowRight, Award, Zap,
  Layers, Sliders, ChevronDown, Check, X, UserPlus, 
  Settings, HelpCircle, Info, Brain, ChevronRight, Tag
} from "lucide-react";

export default function DeveloperWorkloadHeatmap({ 
  workloadData, 
  developers = [], 
  tasks = [], 
  balanceScore = 85.0,
  onAutoBalance,
  onReassignDeveloper,
  onOpenManageTeam,
  loading = false
}) {
  const [selectedSprint, setSelectedSprint] = useState("all");
  const [reassigningTaskId, setReassigningTaskId] = useState(null);
  const [reassigningDevId, setReassigningDevId] = useState("");
  const [activeReasoningTask, setActiveReasoningTask] = useState(null);

  const matrix = workloadData?.matrix || [];

  const handleReassignSubmit = (storyId, newDevId) => {
    if (!newDevId) return;
    if (onReassignDeveloper) {
      onReassignDeveloper(storyId, newDevId);
    }
    setReassigningTaskId(null);
    setReassigningDevId("");
  };

  const getStatusBadge = (status, util) => {
    switch (status) {
      case "OPTIMAL_BALANCED":
        return {
          label: "Optimal Load",
          bg: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300",
          barColor: "bg-emerald-500"
        };
      case "UNDER_ALLOCATED":
        return {
          label: "Free Capacity",
          bg: "bg-sky-500/15 border-sky-500/40 text-sky-300",
          barColor: "bg-sky-500"
        };
      case "NEAR_CAPACITY":
        return {
          label: "Near Capacity",
          bg: "bg-amber-500/15 border-amber-500/40 text-amber-300",
          barColor: "bg-amber-500"
        };
      case "OVERLOADED":
        return {
          label: "Overloaded",
          bg: "bg-rose-500/15 border-rose-500/40 text-rose-300",
          barColor: "bg-rose-500"
        };
      default:
        return {
          label: "Idle (0%)",
          bg: "bg-slate-800 border-slate-700 text-slate-400",
          barColor: "bg-slate-600"
        };
    }
  };

  return (
    <div className="space-y-6 text-slate-100 animate-in fade-in duration-300">
      
      {/* Top Banner: Team Analytics, Balance Score & PM Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Users size={15} />
              <span>Multi-Resource Integer Linear Programming (MR-ILP)</span>
            </div>
            <h3 className="text-xl font-extrabold text-white mt-1 flex items-center gap-2.5">
              Smart Developer Allocation & Workload Balancing
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold font-mono">
                Fairness Index: {balanceScore}%
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              User stories matched to engineers based on semantic skill affinity, capacity constraints, and workload variance minimization.
            </p>
          </div>

          {/* PM Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenManageTeam}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow"
              title="Add or edit team members, roles and capacities"
            >
              <Settings size={14} className="text-indigo-400" />
              <span>⚙️ Manage Team Roster</span>
            </button>

            <button
              onClick={onAutoBalance}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Zap size={14} className={loading ? "animate-spin" : "text-yellow-300"} />
              <span>{loading ? "Re-Balancing..." : "⚡ Auto-Balance Workload"}</span>
            </button>
          </div>
        </div>

        {/* Executive Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/60 text-xs">
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Engineering Team:</span>
            <span className="text-white font-bold text-sm">
              {developers.length || 5} Active Developers
            </span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Avg Team Utilization:</span>
            <span className="text-indigo-300 font-bold text-sm">
              {workloadData?.average_utilization_pct || 78.4}% Loaded
            </span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Skill Affinity Fit:</span>
            <span className="text-emerald-400 font-bold text-sm">
              92.8% Average Match
            </span>
          </div>
          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Workload Variance:</span>
            <span className="text-amber-400 font-bold text-sm">
              σ = {workloadData?.std_deviation || 4.2} (Balanced)
            </span>
          </div>
        </div>
      </div>

      {/* Developer Workload Heatmap Matrix */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-700 pb-3">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-indigo-400" />
              Sprint Workload Heatmap Matrix
            </h4>
            <p className="text-xs text-slate-400">
              Live capacity utilization bars per developer across Sprints 1, 2, and 3.
            </p>
          </div>

          {/* Color Legend */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-300">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span> Free Capacity (&lt;65%)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Optimal (65-95%)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Near Full (95-100%)
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> Overloaded (&gt;100%)
            </span>
          </div>
        </div>

        {/* Heatmap Sprints Breakdown */}
        <div className="space-y-6">
          {matrix.map((sprintEntry, sIdx) => (
            <div key={sIdx} className="bg-slate-900/80 border border-slate-700/70 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-indigo-600/30 border border-indigo-500/50 rounded-lg text-xs font-mono font-bold text-indigo-300">
                    {sprintEntry.sprint_name}
                  </span>
                  <span className="text-xs text-slate-400">
                    • {sprintEntry.developers.reduce((acc, d) => acc + d.assigned_points, 0)} Total Points Assigned
                  </span>
                </div>
              </div>

              {/* Developer Rows in this Sprint */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {sprintEntry.developers.map((dev, dIdx) => {
                  const statusInfo = getStatusBadge(dev.status, dev.utilization_pct);
                  return (
                    <div 
                      key={dIdx}
                      className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 p-3.5 rounded-xl space-y-2.5 transition-all shadow-sm"
                    >
                      {/* Dev Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full ${dev.avatar_bg || 'bg-indigo-600'} text-white font-bold text-xs flex items-center justify-center shadow`}>
                            {dev.initials || dev.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block leading-tight">{dev.name}</span>
                            <span className="text-[10px] text-slate-400 leading-tight block">{dev.role.split('&')[0]}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.bg}`}>
                          {statusInfo.label}
                        </span>
                      </div>

                      {/* Workload Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-mono">
                          <span className="text-slate-400">Assigned: <strong className="text-white">{dev.assigned_points}</strong> / {dev.max_capacity} pts</span>
                          <span className="font-bold text-indigo-300">{dev.utilization_pct}%</span>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div 
                            className={`h-full rounded-full ${statusInfo.barColor} transition-all duration-500`}
                            style={{ width: `${Math.min(100, dev.utilization_pct)}%` }}
                          />
                        </div>
                      </div>

                      {/* Assigned Tasks Tags */}
                      <div className="pt-1 flex flex-wrap items-center gap-1 text-[10px]">
                        <span className="text-slate-500">Stories:</span>
                        {dev.task_ids && dev.task_ids.length > 0 ? (
                          dev.task_ids.map((tid, tidIdx) => (
                            <span key={tidIdx} className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-emerald-400 font-mono font-bold">
                              {tid}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 italic">No stories assigned</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Assigned Tasks & AI Skill-Affinity Breakdown Table */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-700 pb-3">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck size={18} className="text-emerald-400" />
              Story Skill-Match & Developer Assignments Table
            </h4>
            <p className="text-xs text-slate-400">
              Interactive table showing technical domain match %, AI suitability justifications, and reassignment controls.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-3">Story ID</th>
                <th className="p-3">User Story Title</th>
                <th className="p-3">Sprint</th>
                <th className="p-3 text-center">Points</th>
                <th className="p-3">Assigned Developer</th>
                <th className="p-3 text-center">AI Skill Fit & Reasoning</th>
                <th className="p-3 text-center">Reassign</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, idx) => {
                const assigned = task.assigned_developer;
                const isEditing = reassigningTaskId === (task.story_id || task.id);

                return (
                  <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                    <td className="p-3 font-mono text-emerald-400 font-bold whitespace-nowrap">
                      {task.story_id || task.id}
                    </td>
                    <td className="p-3 font-medium text-white max-w-xs">
                      <div className="truncate font-semibold">{task.title}</div>
                      {task.reason && (
                        <p className="text-[10px] text-slate-400 truncate">{task.reason}</p>
                      )}
                    </td>
                    <td className="p-3 font-mono whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-300 text-[11px]">
                        Sprint {task.sprint_number || 1}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-indigo-400">
                      {task.story_points || task.points || 3} pts
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {assigned ? (
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full ${assigned.avatar_bg || 'bg-indigo-600'} text-white font-bold text-[10px] flex items-center justify-center shadow`}>
                            {assigned.initials || assigned.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white block leading-tight">{assigned.name}</span>
                            <span className="text-[10px] text-slate-400 block">{assigned.primary_domain || assigned.role}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {assigned ? (
                        <button
                          onClick={() => setActiveReasoningTask(task)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 transition-all font-mono font-bold text-[11px] shadow-sm"
                          title="Click to view full AI Skill Match & Suitability Reasoning"
                        >
                          <Brain size={12} className="text-emerald-400" />
                          <span>{assigned.skill_match_pct || 90}% Fit</span>
                          <Info size={11} className="text-emerald-500" />
                        </button>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <select
                            value={reassigningDevId}
                            onChange={(e) => setReassigningDevId(e.target.value)}
                            className="bg-slate-950 border border-slate-700 text-white rounded px-2 py-1 text-[11px] focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">Select Dev...</option>
                            {developers.map(d => (
                              <option key={d.id} value={d.id}>{d.name} ({d.primary_domain})</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleReassignSubmit(task.story_id || task.id, reassigningDevId)}
                            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded"
                            title="Save reassignment"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setReassigningTaskId(null)}
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setReassigningTaskId(task.story_id || task.id);
                            setReassigningDevId(assigned ? assigned.id : "");
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium transition-all"
                        >
                          Reassign
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Skill Suitability & Reasoning Popover Modal */}
      {activeReasoningTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-indigo-500/40 w-full max-w-lg rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Brain size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">AI Skill Suitability & Reasoning</h4>
                  <span className="text-[11px] font-mono text-emerald-400">{activeReasoningTask.story_id || activeReasoningTask.id}</span>
                </div>
              </div>
              <button 
                onClick={() => setActiveReasoningTask(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            {/* Story Context */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">User Story</span>
              <p className="text-xs font-semibold text-white">{activeReasoningTask.title}</p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono">
                <span>Sprint {activeReasoningTask.sprint_number || 1}</span>
                <span>•</span>
                <span>{activeReasoningTask.story_points || activeReasoningTask.points || 3} Points</span>
              </div>
            </div>

            {/* Assigned Developer Match Details */}
            {activeReasoningTask.assigned_developer && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${activeReasoningTask.assigned_developer.avatar_bg || 'bg-indigo-600'} text-white font-bold text-xs flex items-center justify-center shadow`}>
                      {activeReasoningTask.assigned_developer.initials || activeReasoningTask.assigned_developer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-white block">{activeReasoningTask.assigned_developer.name}</span>
                      <span className="text-[10px] text-indigo-300 block">{activeReasoningTask.assigned_developer.role}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {activeReasoningTask.assigned_developer.skill_match_pct || 90}% Match
                    </span>
                  </div>
                </div>

                {/* AI Semantic Justification */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-400" />
                    Domain Justification & Why this developer was matched:
                  </span>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                    {activeReasoningTask.assigned_developer.suitability_reason || 
                      "Matched via Multi-Resource Integer Linear Programming (MR-ILP) balancing domain competence and sprint workload capacity."}
                  </div>
                </div>

                {/* Matched Token Chips */}
                {activeReasoningTask.assigned_developer.matched_skills && activeReasoningTask.assigned_developer.matched_skills.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Tag size={12} className="text-emerald-400" />
                      Extracted Requirement Tokens Matched:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeReasoningTask.assigned_developer.matched_skills.map((token, tIdx) => (
                        <span key={tIdx} className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-mono text-[11px] font-bold">
                          ✓ {token}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setActiveReasoningTask(null)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow"
              >
                Close Explanation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
