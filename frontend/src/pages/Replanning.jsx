import React, { useState, useEffect } from "react";
import { 
  RefreshCw, AlertTriangle, ShieldCheck, ArrowRight, 
  Layers, Zap, TrendingUp, CheckCircle2, FileText, ChevronRight, Activity
} from "lucide-react";

export default function Replanning() {
  const [changeType, setChangeType] = useState("NEW_STORY_ADDED");
  const [storyId, setStoryId] = useState("");
  const [title, setTitle] = useState("");
  const [points, setPoints] = useState(8);
  const [newPriorityTier, setNewPriorityTier] = useState("CRITICAL");
  const [dependencies, setDependencies] = useState("");
  const [existingStories, setExistingStories] = useState([]);
  const [status, setStatus] = useState(null);
  const [replanData, setReplanData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await fetch("http://localhost:8082/api/stories");
      const data = await res.json();
      if (data.status === "success" && data.stories) {
        setExistingStories(data.stories);
        if (!storyId && data.stories.length > 0) {
          setStoryId(data.stories[0].story_id);
        }
      }
    } catch (err) {
      console.error("Error loading stories:", err);
    }
  };

  const handleReplan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus("processing");
    setReplanData(null);

    try {
      const res = await fetch("http://localhost:8082/api/replan-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          change_type: changeType,
          story_id: storyId || `US_ALERT_${Date.now().toString().slice(-3)}`,
          title: title || (changeType === 'NEW_STORY_ADDED' ? "Critical Production Bug Fix" : ""),
          story_points: Number(points),
          new_priority_tier: newPriorityTier,
          dependencies: dependencies ? dependencies.split(",").map(d => d.trim()) : [],
          reason: `Triggered via Dynamic Re-planning Simulator (${changeType})`
        }),
      });

      const data = await res.json();
      if (data.status === "success") {
        setStatus("success");
        setReplanData(data);
        fetchStories(); // refresh stories
      } else {
        setStatus("error");
      }
    } catch (err) {
      console.error("Replanning execution error:", err);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const samplePresets = [
    {
      name: "🚨 Critical Data Loss Bug (13 pts)",
      type: "NEW_STORY_ADDED",
      id: "US011",
      title: "Critical bug causing data loss in production database",
      points: 13,
      tier: "CRITICAL",
      deps: ""
    },
    {
      name: "⚡ 2FA Security Escalation",
      type: "PRIORITY_CHANGED",
      id: "US010",
      title: "Add two factor authentication for admin users",
      points: 8,
      tier: "CRITICAL",
      deps: "US001"
    },
    {
      name: "🗑️ Deprioritize PDF Export",
      type: "STORY_REMOVED",
      id: "US002",
      title: "Add export to PDF feature for reports",
      points: 5,
      tier: "MEDIUM",
      deps: ""
    }
  ];

  const applyPreset = (p) => {
    setChangeType(p.type);
    setStoryId(p.id);
    setTitle(p.title);
    setPoints(p.points);
    setNewPriorityTier(p.tier);
    setDependencies(p.deps);
  };

  return (
    <div className="space-y-6 text-slate-100 p-2 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <RefreshCw className="text-indigo-400 animate-spin-slow" size={24} />
            Dynamic Mid-Sprint Re-Planning & Blast Radius Engine
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            0/1 Knapsack real-time sprint re-allocation with ripple effect analysis & dynamic scope sync
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs font-bold text-indigo-400 flex items-center gap-1.5">
            <Activity size={14} />
            Change Management & Impact Contract
          </span>
        </div>
      </div>

      {/* Preset Action Buttons */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 shadow-lg">
        <p className="text-xs font-semibold text-slate-400 mb-2.5">⚡ Quick Test Scenarios (Simulate Scope Change Events):</p>
        <div className="flex flex-wrap gap-2.5">
          {samplePresets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => applyPreset(p)}
              className="px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-700 border border-slate-700 hover:border-indigo-500/50 rounded-xl text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 shadow-sm"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Form Column */}
        <div className="lg:col-span-5">
          <form onSubmit={handleReplan} className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <AlertTriangle size={16} />
              Triggers 0/1 Knapsack Re-Allocation & DAG Recalibration
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Scope Change Type</label>
              <select 
                value={changeType} 
                onChange={(e) => setChangeType(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="NEW_STORY_ADDED">➕ New Urgent Story Added</option>
                <option value="STORY_REMOVED">🗑️ Story Deprioritized / Removed</option>
                <option value="STORY_MODIFIED">📝 Story Scope / Points Modified</option>
                <option value="PRIORITY_CHANGED">🚨 Priority Tier Escalation</option>
              </select>
            </div>

            {changeType === "NEW_STORY_ADDED" ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Story ID</label>
                <input 
                  type="text" 
                  value={storyId} 
                  onChange={(e) => setStoryId(e.target.value)} 
                  placeholder="e.g. US011" 
                  required 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Select Target Story</label>
                <select 
                  value={storyId} 
                  onChange={(e) => {
                    setStoryId(e.target.value);
                    const selected = existingStories.find(s => s.story_id === e.target.value);
                    if (selected) {
                      setTitle(selected.title);
                      setPoints(selected.story_points);
                      setNewPriorityTier(selected.priority_tier || "HIGH");
                    }
                  }} 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                >
                  {existingStories.map(s => (
                    <option key={s.story_id} value={s.story_id}>
                      {s.story_id} - {s.title.slice(0, 35)}... ({s.story_points} pts)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {changeType !== "STORY_REMOVED" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Title / Description</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Fix critical security vulnerability..." 
                  required 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            )}

            {changeType !== "STORY_REMOVED" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Story Points</label>
                  <input 
                    type="number" 
                    value={points} 
                    onChange={(e) => setPoints(e.target.value)} 
                    min="1" 
                    max="21" 
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority Tier</label>
                  <select
                    value={newPriorityTier}
                    onChange={(e) => setNewPriorityTier(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CRITICAL">🔴 CRITICAL</option>
                    <option value="HIGH">🟠 HIGH</option>
                    <option value="MEDIUM">🔵 MEDIUM</option>
                    <option value="LOW">🟢 LOW</option>
                  </select>
                </div>
              </div>
            )}

            {changeType === "NEW_STORY_ADDED" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Dependencies (Prerequisite Story IDs, comma-separated)</label>
                <input 
                  type="text" 
                  value={dependencies} 
                  onChange={(e) => setDependencies(e.target.value)} 
                  placeholder="e.g. US001, US008" 
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={18} />
                  Running Knapsack Re-Allocation...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  ⚡ Trigger Dynamic Re-Allocation Sequence
                </>
              )}
            </button>

            {status === "error" && (
              <p className="text-xs font-bold text-rose-400 text-center">
                ❌ Re-planning failed. Ensure Flask API (port 8080) is running.
              </p>
            )}
          </form>
        </div>

        {/* Impact & Blast Radius Output Column */}
        <div className="lg:col-span-7 space-y-4">
          {replanData && replanData.impact_summary ? (
            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
              {/* Blast Radius Card */}
              <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                      <TrendingUp size={20} />
                    </span>
                    <div>
                      <h3 className="text-base font-extrabold text-white">Blast Radius & Ripple Impact Report</h3>
                      <p className="text-[11px] text-slate-400">{replanData.impact_summary.timestamp}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${
                      replanData.impact_summary.risk_level === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                      replanData.impact_summary.risk_level === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                      'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    }`}>
                      Risk: {replanData.impact_summary.risk_level}
                    </span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/70">
                    <p className="text-xs text-slate-400 font-semibold">Displaced Stories</p>
                    <p className="text-xl font-black text-rose-400 mt-1">{replanData.impact_summary?.displaced_count || 0}</p>
                  </div>
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/70">
                    <p className="text-xs text-slate-400 font-semibold">Promoted Stories</p>
                    <p className="text-xl font-black text-emerald-400 mt-1">{replanData.impact_summary?.promoted_count || 0}</p>
                  </div>
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/70">
                    <p className="text-xs text-slate-400 font-semibold">Sprints Count</p>
                    <p className="text-xl font-black text-indigo-400 mt-1">
                      {replanData.impact_summary?.sprints_before || 5} ➔ {replanData.impact_summary?.sprints_after || 5}
                    </p>
                  </div>
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/70">
                    <p className="text-xs text-slate-400 font-semibold">Total Points</p>
                    <p className="text-xl font-black text-amber-400 mt-1">
                      {replanData.impact_summary?.points_before || 0} ➔ {replanData.impact_summary?.points_after || (replanData.impact_summary?.points || 0)}
                    </p>
                  </div>
                </div>

                {/* Displaced Stories List */}
                {Array.isArray(replanData.impact_summary?.displaced_stories) && replanData.impact_summary.displaced_stories.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      ⚠️ Ripple Effect: Displaced Stories (Pushed to Later Sprints):
                    </p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {replanData.impact_summary.displaced_stories.map((ds, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-rose-300">{ds.story_id}</span>
                            <span className="text-slate-200 font-semibold truncate max-w-[200px]">{ds.title}</span>
                          </div>
                          <span className="font-bold text-rose-400">{ds.shift}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    Zero displacement! New scope accommodated within available sprint headroom.
                  </div>
                )}

                {/* Exported Artifacts confirmation */}
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-slate-300 space-y-1">
                  <p className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <FileText size={14} />
                    Artifacts Synced to Disk:
                  </p>
                  <p className="text-[11px] text-slate-400">
                    • <code className="text-indigo-400">sprint_plan_updated.csv</code> (Updated sprint mapping)
                  </p>
                  <p className="text-[11px] text-slate-400">
                    • <code className="text-indigo-400">output_for_resource_management.csv</code> (Handoff dataset for Resource Allocation)
                  </p>
                  <p className="text-[11px] text-slate-400">
                    • <code className="text-indigo-400">replanning_log.json</code> (Audit trail for Change Management)
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-12 text-center text-slate-400 text-sm shadow-lg h-full flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="text-slate-600" size={40} />
              <p className="font-bold text-slate-300">Ready to simulate mid-sprint change requests.</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Select a change event preset or configure custom parameters on the left to evaluate ripple effects and sprint restructuring.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}