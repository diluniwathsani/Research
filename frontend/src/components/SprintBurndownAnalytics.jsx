import React, { useState, useEffect, useMemo } from "react";
import { 
  TrendingDown, TrendingUp, Sparkles, AlertCircle, CheckCircle2, 
  Calendar, RefreshCw, BarChart3, Sliders, ArrowUpRight, Zap, 
  ShieldCheck, HelpCircle, Activity, ChevronRight, Layers, Target
} from "lucide-react";

export default function SprintBurndownAnalytics({
  tasks = [],
  capacities = [30, 28, 30],
  sprints = [],
  totalSprints
}) {
  const [selectedSprint, setSelectedSprint] = useState(1);
  const [chartMode, setChartMode] = useState("burndown"); // "burndown" | "burnup" | "combined"
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Dynamically determine all available sprint numbers
  const detectedSprintNumbers = useMemo(() => {
    const numsSet = new Set();
    if (Array.isArray(sprints) && sprints.length > 0) {
      sprints.forEach(s => {
        const sNum = parseInt(s.sprint_number || s.id || s.number || 0);
        if (sNum > 0) numsSet.add(sNum);
      });
    }
    if (Array.isArray(tasks) && tasks.length > 0) {
      tasks.forEach(t => {
        const sNum = parseInt(t.sprint_number || t.sprint || 0);
        if (sNum > 0) numsSet.add(sNum);
      });
    }
    if (Array.isArray(capacities) && capacities.length > 0) {
      capacities.forEach((_, idx) => numsSet.add(idx + 1));
    }
    if (totalSprints && Number(totalSprints) > 0) {
      for (let i = 1; i <= Number(totalSprints); i++) numsSet.add(i);
    }
    try {
      const email = localStorage.getItem('user_email') || 'default';
      const savedCount = parseInt(
        localStorage.getItem(`planned_sprints_${email}`) || 
        localStorage.getItem('total_sprints_count') || 
        localStorage.getItem('target_sprint_count') || 
        '0'
      );
      if (savedCount > 0) {
        for (let i = 1; i <= savedCount; i++) numsSet.add(i);
      }
    } catch (_) {}
    if (numsSet.size === 0) return [1, 2, 3];
    return Array.from(numsSet).sort((a, b) => a - b);
  }, [sprints, tasks, capacities, totalSprints]);

  useEffect(() => {
    if (detectedSprintNumbers.length > 0 && !detectedSprintNumbers.includes(selectedSprint)) {
      setSelectedSprint(detectedSprintNumbers[0]);
    }
  }, [detectedSprintNumbers]);

  useEffect(() => {
    fetchBurndownData(selectedSprint);
  }, [selectedSprint, tasks, detectedSprintNumbers]);

  useEffect(() => {
    const handleSprintsUpdated = () => {
      fetchBurndownData(selectedSprint);
    };
    window.addEventListener('sprints-updated', handleSprintsUpdated);
    return () => window.removeEventListener('sprints-updated', handleSprintsUpdated);
  }, [selectedSprint, detectedSprintNumbers]);

  const fetchBurndownData = async (sprintNum) => {
    setLoading(true);
    try {
      const email = localStorage.getItem('user_email') || 'default';
      const storedCount = parseInt(
        localStorage.getItem(`planned_sprints_${email}`) || 
        localStorage.getItem('total_sprints_count') || 
        localStorage.getItem('target_sprint_count') || 
        '0', 
        10
      );
      const effectiveTotalSprints = Math.max(
        Number(totalSprints) || 0,
        storedCount,
        detectedSprintNumbers[detectedSprintNumbers.length - 1] || 0,
        detectedSprintNumbers.length || 0,
        3
      );
      const res = await fetch(`http://localhost:8082/api/analytics/burndown?sprint=${sprintNum}&total_sprints=${effectiveTotalSprints}`);
      const data = await res.json();
      if (data.status === "success") {
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error("Burndown Analytics Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const daysData = analyticsData?.days_data || [];
  const totalScope = analyticsData?.total_points || capacities[selectedSprint - 1] || 30;
  const completedPts = analyticsData?.completed_points || 0;
  const remainingPts = analyticsData?.remaining_points || totalScope;
  const inProgressPts = analyticsData?.in_progress_points || 0;
  const health = analyticsData?.health || {};
  const velocityForecast = analyticsData?.velocity_forecasting || {};

  // Dynamically compute historical sprints to guarantee ALL detected sprints from questions/backlog are listed
  const displayHistoricalSprints = useMemo(() => {
    const backendSprints = velocityForecast.historical_sprints || [];
    const backendSprintMap = new Map();
    backendSprints.forEach(sp => {
      const num = parseInt(sp.sprint_number || (String(sp.sprint_name).replace(/[^0-9]/g, '')) || 0);
      if (num > 0) backendSprintMap.set(num, sp);
    });

    return detectedSprintNumbers.map((sNum) => {
      if (backendSprintMap.has(sNum)) {
        return backendSprintMap.get(sNum);
      }
      const spTasks = (tasks || []).filter(t => parseInt(t.sprint_number || t.sprint || 1) === sNum);
      const spTotal = spTasks.reduce((sum, t) => sum + (t.story_points || t.points || 3), 0);
      const spDone = spTasks.filter(t => t.status === 'Done').reduce((sum, t) => sum + (t.story_points || t.points || 3), 0);
      const capFallback = capacities[sNum - 1] || capacities[0] || 30;
      const committed = spTotal > 0 ? spTotal : capFallback;
      return {
        sprint_number: sNum,
        sprint_name: `Sprint ${sNum}`,
        committed_points: committed,
        completed_points: spDone,
        completion_pct: committed > 0 ? Math.round((spDone / committed) * 100) : 0
      };
    });
  }, [velocityForecast.historical_sprints, detectedSprintNumbers, tasks, capacities]);


  // SVG Chart Dimensions & Scale
  const svgWidth = 840;
  const svgHeight = 360;
  const padLeft = 55;
  const padRight = 35;
  const padTop = 30;
  const padBottom = 45;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const maxVal = Math.max(totalScope * 1.15, 32);
  const totalDays = Math.max(1, daysData.length - 1 || 10);

  const getX = (dayIdx) => padLeft + (dayIdx / totalDays) * chartW;
  const getY = (val) => padTop + chartH - (Math.max(0, val) / maxVal) * chartH;

  // Path generators
  const generateLinePath = (key) => {
    if (!daysData.length) return "";
    return daysData
      .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d[key])}`)
      .join(" ");
  };

  const generateAreaPath = (key) => {
    if (!daysData.length) return "";
    const linePath = daysData
      .map((d, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(d[key])}`)
      .join(" ");
    const bottomY = getY(0);
    return `${linePath} L ${getX(daysData.length - 1)} ${bottomY} L ${getX(0)} ${bottomY} Z`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-800/90 border border-slate-700/80 p-5 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <TrendingDown size={20} />
            </span>
            <h3 className="text-lg font-black text-white tracking-tight">
              Dynamic Sprint Burndown & Velocity Forecaster
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time day-by-day Story Point burn tracking against ideal linear trajectory with AI velocity forecasting
          </p>
        </div>

        {/* Controls: Sprint Selector & Refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sprint Buttons */}
          <div className="flex flex-wrap items-center bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl">
            {detectedSprintNumbers.map((sNum) => (
              <button
                key={sNum}
                onClick={() => setSelectedSprint(sNum)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedSprint === sNum
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sprint {sNum}
              </button>
            ))}
          </div>

          {/* Chart Mode Toggle */}
          <div className="flex items-center bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl">
            <button
              onClick={() => setChartMode("burndown")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                chartMode === "burndown"
                  ? "bg-rose-600/90 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingDown size={13} />
              <span>Burndown</span>
            </button>
            <button
              onClick={() => setChartMode("burnup")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                chartMode === "burnup"
                  ? "bg-emerald-600/90 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <TrendingUp size={13} />
              <span>Burnup</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchBurndownData(selectedSprint)}
            disabled={loading}
            className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-xl transition-all shadow"
            title="Refresh Burndown Data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Scope */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Committed Scope</span>
            <Target size={15} className="text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-white">{totalScope}</span>
            <span className="text-xs text-slate-400 font-bold">Story Points</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Sprint {selectedSprint} Target Capacity
          </div>
        </div>

        {/* Delivered / Burned */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold">
            <span>Points Burned (Done)</span>
            <CheckCircle2 size={15} className="text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-emerald-400">{completedPts}</span>
            <span className="text-xs text-emerald-400/80 font-bold">
              ({totalScope > 0 ? Math.round((completedPts / totalScope) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Verified completed in Kanban
          </div>
        </div>

        {/* Remaining Points */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold">
            <span>Points Remaining</span>
            <Activity size={15} className="text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-400">{remainingPts}</span>
            <span className="text-xs text-slate-400 font-bold">pts left</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {inProgressPts} pts in active progress
          </div>
        </div>

        {/* Sprint Health Status */}
        <div className={`rounded-2xl p-4 shadow-lg border flex flex-col justify-between ${
          health.status === "AHEAD_OF_SCHEDULE"
            ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
            : health.status === "ON_TRACK"
            ? "bg-sky-950/40 border-sky-500/40 text-sky-300"
            : "bg-amber-950/40 border-amber-500/40 text-amber-300"
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold">
            <span>Sprint Pace Health</span>
            <Sparkles size={15} />
          </div>
          <div className="mt-2">
            <span className="text-lg font-black tracking-tight">{health.label || "On Track"}</span>
          </div>
          <div className="mt-2 text-[11px] font-medium leading-tight opacity-90 truncate">
            {health.message || "Tracking steadily with ideal pace"}
          </div>
        </div>
      </div>

      {/* Main Burndown / Burnup Interactive SVG Chart Card */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-700 pb-3">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 size={17} className="text-indigo-400" />
              <span>
                {chartMode === "burndown"
                  ? "Ideal Guideline vs Actual Burndown Trajectory"
                  : "Scope vs Completed Burnup Progression"}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                Sprint {selectedSprint} (10 Working Days)
              </span>
            </h4>
          </div>

          {/* Chart Legends */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {chartMode === "burndown" ? (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 border-t-2 border-dashed border-slate-400"></div>
                  <span className="text-slate-400 font-semibold">Ideal Guideline</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-1 bg-rose-500 rounded"></div>
                  <span className="text-rose-400 font-bold">Actual Burndown</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-1 bg-indigo-500 rounded"></div>
                  <span className="text-indigo-400 font-semibold">Total Scope</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-1 bg-emerald-500 rounded"></div>
                  <span className="text-emerald-400 font-bold">Completed Points</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SVG Canvas Container */}
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto min-w-[700px] select-none font-sans"
          >
            <defs>
              {/* Gradients */}
              <linearGradient id="burndownGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#F43F5E" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="burnupGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines (Horizontal) */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
              const yVal = padTop + chartH * (1 - ratio);
              const ptsLabel = Math.round(maxVal * ratio);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={yVal}
                    x2={svgWidth - padRight}
                    y2={yVal}
                    stroke="#334155"
                    strokeDasharray={ratio === 0 ? "none" : "3,3"}
                    strokeWidth={ratio === 0 ? "1.5" : "1"}
                  />
                  <text
                    x={padLeft - 10}
                    y={yVal + 4}
                    fill="#64748B"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {ptsLabel}p
                  </text>
                </g>
              );
            })}

            {/* Vertical Grid Lines (Days 0 to 10) */}
            {daysData.map((d, idx) => {
              const xPos = getX(idx);
              return (
                <g key={idx}>
                  <line
                    x1={xPos}
                    y1={padTop}
                    x2={xPos}
                    y2={svgHeight - padBottom}
                    stroke="#1E293B"
                    strokeWidth="1"
                  />
                  <text
                    x={xPos}
                    y={svgHeight - padBottom + 18}
                    fill="#94A3B8"
                    fontSize="11"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {d.day}
                  </text>
                  <text
                    x={xPos}
                    y={svgHeight - padBottom + 30}
                    fill="#475569"
                    fontSize="9"
                    textAnchor="middle"
                  >
                    Day {idx}
                  </text>
                </g>
              );
            })}

            {/* Burndown Mode Content */}
            {chartMode === "burndown" && (
              <>
                {/* Area Fill */}
                <path
                  d={generateAreaPath("actual_remaining_points")}
                  fill="url(#burndownGradient)"
                />

                {/* Ideal Guideline Line (Dashed) */}
                <path
                  d={generateLinePath("ideal_remaining_points")}
                  fill="none"
                  stroke="#94A3B8"
                  strokeWidth="2.5"
                  strokeDasharray="6,6"
                />

                {/* Actual Burndown Line (Solid Rose) */}
                <path
                  d={generateLinePath("actual_remaining_points")}
                  fill="none"
                  stroke="#F43F5E"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {daysData.map((d, idx) => {
                  const xPos = getX(idx);
                  const yIdeal = getY(d.ideal_remaining_points);
                  const yActual = getY(d.actual_remaining_points);
                  const isHovered = hoveredPoint === idx;

                  return (
                    <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(idx)} onMouseLeave={() => setHoveredPoint(null)}>
                      {/* Ideal Circle */}
                      <circle
                        cx={xPos}
                        cy={yIdeal}
                        r="3.5"
                        fill="#475569"
                        stroke="#94A3B8"
                        strokeWidth="1.5"
                      />

                      {/* Actual Circle */}
                      <circle
                        cx={xPos}
                        cy={yActual}
                        r={isHovered ? "6" : "4.5"}
                        fill="#F43F5E"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        className="transition-all"
                      />

                      {/* Hover Tooltip in SVG */}
                      {isHovered && (
                        <g>
                          <rect
                            x={Math.min(svgWidth - 140, Math.max(10, xPos - 65))}
                            y={Math.max(10, yActual - 62)}
                            width="130"
                            height="52"
                            rx="8"
                            fill="#0F172A"
                            stroke="#F43F5E"
                            strokeWidth="1.5"
                            className="shadow-2xl"
                          />
                          <text
                            x={Math.min(svgWidth - 140, Math.max(10, xPos - 65)) + 65}
                            y={Math.max(10, yActual - 62) + 16}
                            fill="#F8FAFC"
                            fontSize="10"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            Day {idx} Status
                          </text>
                          <text
                            x={Math.min(svgWidth - 140, Math.max(10, xPos - 65)) + 65}
                            y={Math.max(10, yActual - 62) + 31}
                            fill="#F43F5E"
                            fontSize="11"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            Actual: {d.actual_remaining_points} pts
                          </text>
                          <text
                            x={Math.min(svgWidth - 140, Math.max(10, xPos - 65)) + 65}
                            y={Math.max(10, yActual - 62) + 44}
                            fill="#94A3B8"
                            fontSize="9"
                            textAnchor="middle"
                          >
                            Ideal: {d.ideal_remaining_points} pts
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </>
            )}

            {/* Burnup Mode Content */}
            {chartMode === "burnup" && (
              <>
                {/* Area Fill */}
                <path
                  d={generateAreaPath("completed_points")}
                  fill="url(#burnupGradient)"
                />

                {/* Total Scope Constant Line */}
                <path
                  d={generateLinePath("total_scope_points")}
                  fill="none"
                  stroke="#6366F1"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                />

                {/* Completed Points Line (Solid Emerald) */}
                <path
                  d={generateLinePath("completed_points")}
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data Points */}
                {daysData.map((d, idx) => {
                  const xPos = getX(idx);
                  const yScope = getY(d.total_scope_points);
                  const yDone = getY(d.completed_points);
                  const isHovered = hoveredPoint === idx;

                  return (
                    <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(idx)} onMouseLeave={() => setHoveredPoint(null)}>
                      <circle
                        cx={xPos}
                        cy={yScope}
                        r="3.5"
                        fill="#312E81"
                        stroke="#6366F1"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={xPos}
                        cy={yDone}
                        r={isHovered ? "6" : "4.5"}
                        fill="#10B981"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                        className="transition-all"
                      />

                      {/* Tooltip */}
                      {isHovered && (
                        <g>
                          <rect
                            x={Math.min(svgWidth - 140, Math.max(10, xPos - 65))}
                            y={Math.max(10, yDone - 62)}
                            width="130"
                            height="52"
                            rx="8"
                            fill="#0F172A"
                            stroke="#10B981"
                            strokeWidth="1.5"
                          />
                          <text
                            x={Math.min(svgWidth - 140, Math.max(10, xPos - 65)) + 65}
                            y={Math.max(10, yDone - 62) + 16}
                            fill="#F8FAFC"
                            fontSize="10"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            Day {idx} Progress
                          </text>
                          <text
                            x={Math.min(svgWidth - 140, Math.max(10, xPos - 65)) + 65}
                            y={Math.max(10, yDone - 62) + 31}
                            fill="#10B981"
                            fontSize="11"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            Delivered: {d.completed_points} pts
                          </text>
                          <text
                            x={Math.min(svgWidth - 140, Math.max(10, xPos - 65)) + 65}
                            y={Math.max(10, yDone - 62) + 44}
                            fill="#94A3B8"
                            fontSize="9"
                            textAnchor="middle"
                          >
                            Scope: {d.total_scope_points} pts
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </>
            )}
          </svg>
        </div>
      </div>

      {/* Two Column Layout: AI Velocity Forecaster & Day-by-Day Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: AI Velocity Forecasting & Capacity Auto-Recommendation */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="text-amber-400" size={18} />
                <span>AI Velocity Forecasting Engine</span>
              </h4>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold">
                {velocityForecast.confidence_pct || 92.5}% Confidence
              </span>
            </div>

            {/* Velocity Numbers Grid */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-900/90 border border-slate-700/80 p-4 rounded-xl">
                <span className="text-xs text-slate-400 font-semibold block">Rolling Avg Velocity</span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-white">
                    {displayHistoricalSprints.length > 0
                      ? Math.round((displayHistoricalSprints.reduce((sum, s) => sum + (Number(s.committed_points) || 30), 0) / displayHistoricalSprints.length) * 10) / 10
                      : (velocityForecast.rolling_avg_velocity || 29.3)}
                  </span>
                  <span className="text-xs text-slate-400">pts / sprint</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {displayHistoricalSprints.length > 1
                    ? `Based on historical Sprint 1-${displayHistoricalSprints.length} trends`
                    : "Based on current sprint trends"}
                </span>
              </div>

              <div className="bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/50 p-4 rounded-xl shadow-lg shadow-indigo-950/30">
                <span className="text-xs text-indigo-300 font-bold block flex items-center gap-1">
                  <Zap size={13} className="text-indigo-400" /> Recommended Target
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black font-mono text-indigo-400">
                    {velocityForecast.recommended_next_velocity || 28}
                  </span>
                  <span className="text-xs text-indigo-300/80">Story Points</span>
                </div>
                <span className="text-[10px] text-indigo-300/70 mt-1 block">
                  Auto-recommended for Next Sprint
                </span>
              </div>
            </div>

            {/* Historical Sprint Velocity Table */}
            <div className="mt-4">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Sprint Velocity Realization
              </h5>
              <div className="space-y-2">
                {displayHistoricalSprints.map((sp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs">
                    <span className="font-bold text-slate-200">{sp.sprint_name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 font-mono">Committed: {sp.committed_points}p</span>
                      <span className="text-emerald-400 font-mono font-bold">Done: {sp.completed_points}p</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 font-bold">
                        {sp.completion_pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Insight Narrative Box */}
          <div className="mt-4 p-3.5 bg-slate-900/90 border border-indigo-500/30 rounded-xl text-xs text-slate-300 flex items-start gap-2.5">
            <Sparkles size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-white">AI Real Velocity Insight: </strong>
              {velocityForecast.ai_recommendation ||
                "Based on completion cadence and task dependencies, the model suggests capping Sprint 2 at 28 points to avoid bottleneck accumulation."}
            </p>
          </div>
        </div>

        {/* Right Card: Day-by-Day Tracking & Variance Matrix */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700 pb-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar size={17} className="text-indigo-400" />
              <span>Day-by-Day Variance Matrix</span>
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              Working Days D0 - D10
            </span>
          </div>

          <div className="overflow-x-auto max-h-[330px] overflow-y-auto pr-1">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700 sticky top-0">
                <tr>
                  <th className="p-2.5">Day</th>
                  <th className="p-2.5 text-right">Ideal Rem.</th>
                  <th className="p-2.5 text-right">Actual Rem.</th>
                  <th className="p-2.5 text-right">Variance</th>
                  <th className="p-2.5 text-right">Burned</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {daysData.map((d, idx) => {
                  const variance = Math.round((d.actual_remaining_points - d.ideal_remaining_points) * 10) / 10;
                  const isGood = variance <= 0;
                  const isModerate = variance > 0 && variance <= 3.0;

                  return (
                    <tr
                      key={idx}
                      className={`border-b border-slate-700/40 hover:bg-slate-700/30 transition-all ${
                        hoveredPoint === idx ? "bg-slate-700/50" : ""
                      }`}
                      onMouseEnter={() => setHoveredPoint(idx)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    >
                      <td className="p-2.5 font-mono font-bold text-white">
                        {d.day_label}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-400">
                        {d.ideal_remaining_points}p
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-rose-400">
                        {d.actual_remaining_points}p
                      </td>
                      <td className={`p-2.5 text-right font-mono font-bold ${
                        isGood ? "text-emerald-400" : isModerate ? "text-sky-400" : "text-amber-400"
                      }`}>
                        {variance > 0 ? `+${variance}` : variance}p
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-400">
                        {d.completed_points}p
                      </td>
                      <td className="p-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          isGood
                            ? "bg-emerald-500/20 text-emerald-300"
                            : isModerate
                            ? "bg-sky-500/20 text-sky-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}>
                          {isGood ? "Fast" : isModerate ? "On Track" : "Behind"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
