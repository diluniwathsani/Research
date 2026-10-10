import React, { useState, useEffect } from "react";
import { 
  Zap, AlertTriangle, ShieldCheck, Flame, ArrowRight, 
  Clock, Activity, Sliders, RefreshCw, BarChart2, Layers, 
  HelpCircle, Sparkles, AlertCircle, CheckCircle2, ChevronRight,
  TrendingDown, TrendingUp, Info
} from "lucide-react";
import { cleanStoryTitle } from "../utils/storyUtils";

export default function SprintCPMAnalyzer({
  tasks = [],
  onStoryClick
}) {
  const [cpmData, setCpmData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState("all"); // "all" | "critical" | "slack"
  const [simulatedStory, setSimulatedStory] = useState("");
  const [simulatedDelayDays, setSimulatedDelayDays] = useState(2);

  useEffect(() => {
    fetchCPMData();
  }, [tasks]);

  const fetchCPMData = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8082/api/analytics/cpm");
      const data = await res.json();
      if (data.status === "success") {
        setCpmData(data);
        if (data.critical_path_sequence && data.critical_path_sequence.length > 0) {
          setSimulatedStory(data.critical_path_sequence[0]);
        }
      }
    } catch (err) {
      console.error("CPM Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const criticalStories = cpmData?.critical_stories || [];
  const allTasksCPM = cpmData?.all_tasks_cpm || [];
  const earlyWarnings = cpmData?.early_warnings || [];
  const cascadingImpacts = cpmData?.cascading_impacts || [];
  const totalDuration = cpmData?.project_duration_working_days || 10;
  const criticalCount = cpmData?.critical_path_stories_count || 0;
  const totalStories = cpmData?.total_stories_count || tasks.length || 0;

  // Filtered matrix rows
  const filteredMatrix = allTasksCPM.filter(item => {
    if (filterMode === "critical") return item.is_critical;
    if (filterMode === "slack") return !item.is_critical;
    return true;
  });

  // Selected story for simulation
  const targetSimStory = allTasksCPM.find(t => t.story_id === simulatedStory) || criticalStories[0] || {};
  const isSimStoryCritical = targetSimStory.is_critical;
  const simTotalFloat = targetSimStory.total_float || 0;
  const delayImpactOnRelease = Math.max(0, simulatedDelayDays - simTotalFloat);
  const simCascadingInfo = cascadingImpacts.find(c => c.story_id === simulatedStory);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-rose-950/30 to-slate-900 border border-rose-500/40 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/40 shadow-inner">
              <Flame size={20} />
            </span>
            <h3 className="text-lg font-black text-white tracking-tight">
              Automated Critical Path Method (CPM) & Float/Slack Analyzer
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Calculates Early/Late Schedule timings, Total Float & Free Slack, and isolates the sequence of Zero-Float bottleneck stories
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCPMData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Recalculate CPM</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Project Min Duration */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Critical Path Duration</span>
            <Clock size={15} className="text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-rose-400">{totalDuration}</span>
            <span className="text-xs text-slate-400 font-bold">Working Days</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Uncompressible Minimum Timeline
          </div>
        </div>

        {/* Critical Stories Count */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-400 text-xs font-semibold">
            <span>Critical Bottleneck Stories</span>
            <Flame size={15} className="text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">{criticalCount}</span>
            <span className="text-xs text-rose-400 font-bold">
              ({totalStories > 0 ? Math.round((criticalCount / totalStories) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Zero Float (0d Slack) Constraint
          </div>
        </div>

        {/* Critical Story Points */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>Critical Story Points</span>
            <Zap size={15} className="text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-400">{cpmData?.critical_path_points || 0}</span>
            <span className="text-xs text-slate-400 font-bold">pts locked</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Highest priority engineering focus
          </div>
        </div>

        {/* Slack Health Index */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Non-Critical Slack Buffer</span>
            <ShieldCheck size={15} className="text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-400">
              {totalStories - criticalCount}
            </span>
            <span className="text-xs text-slate-400 font-bold">flexible stories</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Possess Positive Float (TF &gt; 0)
          </div>
        </div>
      </div>

      {/* Visual Critical Path Sequence (Stepper Chain) */}
      <div className="bg-slate-800/90 border border-rose-500/40 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Flame size={17} className="text-rose-400" />
            <h4 className="text-sm font-bold text-white">
              Primary Critical Path Sequence (Zero-Float Chain)
            </h4>
          </div>
          <span className="text-xs font-mono text-rose-300 font-bold bg-rose-500/10 border border-rose-500/30 px-3 py-1 rounded-full">
            🔥 {criticalStories.length} Sequential Dependent Stories (No Delay Margin)
          </span>
        </div>

        {/* Chain Render */}
        <div className="overflow-x-auto py-2">
          <div className="flex items-center gap-3 min-w-[700px]">
            {criticalStories.map((story, idx) => (
              <React.Fragment key={story.story_id}>
                {idx > 0 && (
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <ArrowRight size={18} className="text-rose-400 animate-pulse" />
                    <span className="text-[9px] font-mono text-rose-400/80 font-bold">0d Slack</span>
                  </div>
                )}
                
                <div 
                  onClick={() => {
                    setSimulatedStory(story.story_id);
                    if (onStoryClick) onStoryClick(story);
                  }}
                  className={`bg-slate-900 border rounded-2xl p-4 shadow-lg flex-1 min-w-[200px] cursor-pointer transition-all hover:scale-[1.02] ${
                    simulatedStory === story.story_id
                      ? "border-rose-500 ring-2 ring-rose-500/50 bg-rose-950/20"
                      : "border-rose-500/40 hover:border-rose-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs text-rose-400">
                      {story.story_id}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">
                      Sprint {story.sprint_number}
                    </span>
                  </div>
                  
                  <p className="text-xs font-bold text-white mt-1.5 line-clamp-2">
                    {cleanStoryTitle(story.title)}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{story.story_points} pts ({story.duration_days}d)</span>
                    <span className="text-amber-400 font-bold">
                      Day {story.early_start} ➔ {story.early_finish}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[10px]">
                    <span className="text-rose-400 font-black">
                      Total Float: 0 Days
                    </span>
                    {story.unblock_count > 0 && (
                      <span className="text-slate-400">
                        ⚡ Unblocks {story.unblock_count}
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Layout: Interactive What-If Delay Simulator & Early Warnings Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Interactive "What-If" Cascading Delay Simulator */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="text-indigo-400" size={18} />
                <span>Interactive Cascading Delay Simulator</span>
              </h4>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 font-bold">
                Real-Time Impact
              </span>
            </div>

            <p className="text-xs text-slate-400 mt-2">
              Test what happens to downstream Sprints and final Project Delivery if a story experiences unexpected delays.
            </p>

            {/* Select Target Story & Delay Slider */}
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Target Story to Simulate Delay:
                </label>
                <select
                  value={simulatedStory}
                  onChange={(e) => setSimulatedStory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs font-bold p-2.5 rounded-xl focus:outline-none focus:border-indigo-500"
                >
                  {allTasksCPM.map(t => (
                    <option key={t.story_id} value={t.story_id}>
                      {t.is_critical ? "🔥 [CRITICAL] " : "🛡️ [SLACK] "} {t.story_id}: {cleanStoryTitle(t.title)} ({t.story_points} pts / Float: {t.total_float}d)
                    </option>
                  ))}
                </select>
              </div>

              {/* Delay Slider */}
              <div className="p-3.5 bg-slate-900/90 border border-slate-700/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300">Simulate Task Delay:</span>
                  <span className="font-mono font-black text-rose-400 text-sm">
                    +{simulatedDelayDays} Working Days
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={simulatedDelayDays}
                  onChange={(e) => setSimulatedDelayDays(Number(e.target.value))}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>1 Day Delay</span>
                  <span>4 Days</span>
                  <span>8 Days (Severe)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Simulation Output Card */}
          <div className={`p-4 rounded-xl border space-y-2.5 transition-all mt-4 ${
            delayImpactOnRelease > 0
              ? "bg-rose-950/40 border-rose-500/50 text-rose-200"
              : "bg-emerald-950/40 border-emerald-500/50 text-emerald-200"
          }`}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                {delayImpactOnRelease > 0 ? (
                  <AlertTriangle size={15} className="text-rose-400" />
                ) : (
                  <ShieldCheck size={15} className="text-emerald-400" />
                )}
                <span>Simulation Result for {simulatedStory}</span>
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-black/40 font-black">
                {isSimStoryCritical ? "🔥 Zero Float Story" : `🛡️ Has ${simTotalFloat}d Slack`}
              </span>
            </div>

            {delayImpactOnRelease > 0 ? (
              <div className="text-xs space-y-1">
                <p className="font-semibold text-rose-300 leading-relaxed">
                  ⚠️ <strong>Direct Cascading Breach:</strong> Delaying <strong>{simulatedStory}</strong> by {simulatedDelayDays} days pushes the <strong>Final Release Target back by +{delayImpactOnRelease} Working Days</strong>.
                </p>
                {simCascadingInfo && (
                  <p className="text-[11px] text-rose-300/80">
                    • Downstream Impact: Blocks <strong>{simCascadingInfo.total_downstream_blocked} stories</strong> across {simCascadingInfo.affected_sprints.map(s => `Sprint ${s}`).join(", ")}.
                  </p>
                )}
              </div>
            ) : (
              <div className="text-xs space-y-1">
                <p className="font-semibold text-emerald-300 leading-relaxed">
                  ✓ <strong>Absorbed by Total Float:</strong> The {simulatedDelayDays}-day delay is safely absorbed by the available {simTotalFloat} days of Slack without pushing the Project Release Date.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Early Warnings Radar */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="text-amber-400" size={18} />
              <span>AI Critical Bottleneck Early Warnings</span>
            </h4>
            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold">
              {earlyWarnings.length} Active Risks
            </span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {earlyWarnings.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-900/60 rounded-xl border border-slate-800">
                ✓ No critical prerequisite bottleneck risks detected. All stories possess healthy slack or independent paths.
              </div>
            ) : (
              earlyWarnings.map((warn, idx) => (
                <div 
                  key={idx}
                  className="p-4 rounded-xl bg-slate-900/90 border border-rose-500/40 space-y-2 shadow-md hover:border-rose-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-xs text-rose-400 flex items-center gap-1.5">
                      <Flame size={13} /> {warn.story_id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      0 Days Float
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                    {warn.message}
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-1.5">
                    <Sparkles size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <span><strong className="text-white">Action:</strong> {warn.action_recommendation}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Float & Slack Mathematical CPM Matrix Table */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-700 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart2 size={17} className="text-indigo-400" />
              <span>Full CPM Float & Slack Schedule Matrix</span>
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive Forward & Backward Pass schedule timing for all backlog items
            </p>
          </div>

          {/* Table Filters */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filterMode === "all" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              All ({allTasksCPM.length})
            </button>
            <button
              onClick={() => setFilterMode("critical")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                filterMode === "critical" ? "bg-rose-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <Flame size={12} />
              <span>Critical ({criticalCount})</span>
            </button>
            <button
              onClick={() => setFilterMode("slack")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1 ${
                filterMode === "slack" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck size={12} />
              <span>With Slack ({allTasksCPM.length - criticalCount})</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
              <tr>
                <th className="p-3">Story ID</th>
                <th className="p-3">Title & Epic</th>
                <th className="p-3 text-center">Sprint</th>
                <th className="p-3 text-center">Duration</th>
                <th className="p-3 text-center">Early Start (ES)</th>
                <th className="p-3 text-center">Early Finish (EF)</th>
                <th className="p-3 text-center">Late Start (LS)</th>
                <th className="p-3 text-center">Late Finish (LF)</th>
                <th className="p-3 text-center">Total Float (TF)</th>
                <th className="p-3 text-center">Free Slack (FF)</th>
                <th className="p-3 text-center">Critical Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatrix.map((item, idx) => {
                const isCrit = item.is_critical;
                return (
                  <tr 
                    key={idx}
                    className={`border-b border-slate-700/40 hover:bg-slate-700/30 transition-all ${
                      isCrit ? "bg-rose-950/15" : ""
                    }`}
                  >
                    <td className="p-3 font-mono font-bold whitespace-nowrap">
                      <span className={isCrit ? "text-rose-400" : "text-emerald-400"}>
                        {item.story_id}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-white max-w-xs truncate">
                      <div>{cleanStoryTitle(item.title)}</div>
                      <span className="text-[10px] text-slate-400">{item.epic}</span>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-300">
                      Sprint {item.sprint_number}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-300">
                      {item.duration_days}d ({item.story_points}p)
                    </td>
                    <td className="p-3 text-center font-mono text-sky-400">
                      Day {item.early_start}
                    </td>
                    <td className="p-3 text-center font-mono text-sky-400">
                      Day {item.early_finish}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-400">
                      Day {item.late_start}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-400">
                      Day {item.late_finish}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      <span className={isCrit ? "text-rose-400" : "text-emerald-400"}>
                        {item.total_float} Days
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono text-slate-400">
                      {item.free_float} Days
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {isCrit ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <Flame size={11} /> Critical Path
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <ShieldCheck size={11} /> +{item.total_float}d Slack
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
