import React, { useState } from 'react';
import {
  Layers,
  Kanban,
  CalendarRange,
  BarChart3,
  Flame,
  Search,
  Command,
  Plus,
  Bell,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Zap,
  MoreVertical,
  Activity,
  GitBranch,
  ShieldAlert,
  ChevronRight,
  Target,
  Clock,
  ArrowRight
} from 'lucide-react';

export default function BentoSprintDashboard({
  projectName = "Fleet Logistics MVP",
  sprintName = "Sprint 1 (Foundational Architecture)",
  totalCapacity = 40,
  committedPoints = 35,
  onNavigateToTab = () => {}
}) {
  const [isChartHovered, setIsChartHovered] = useState(false);
  const [activeNav, setActiveNav] = useState('bento');
  const [selectedBar, setSelectedBar] = useState(null);

  // Velocity telemetry data across sprint working days
  const telemetryData = [
    { day: "D1", planned: 42, actual: 40, label: "Day 1 (Kickoff)" },
    { day: "D2", planned: 38, actual: 36, label: "Day 2 (Schema & Roles)" },
    { day: "D3", planned: 34, actual: 30, label: "Day 3 (Auth Gates)" },
    { day: "D4", planned: 29, actual: 23, label: "Day 4 (Work Order Core)" },
    { day: "D5", planned: 24, actual: 19, label: "Day 5 (Midpoint)" },
    { day: "D6", planned: 19, actual: 16, label: "Day 6 (Labor Rules)" },
    { day: "D7", planned: 14, actual: 11, label: "Day 7 (Overtime Engine)" },
    { day: "D8", planned: 9, actual: 7, label: "Day 8 (Job Cards)" },
    { day: "D9", planned: 5, actual: 3, label: "Day 9 (E2E Integration)" },
    { day: "D10", planned: 0, actual: 0, label: "Day 10 (Release Cut)" }
  ];

  // Active items currently on the floor
  const activeSprintItems = [
    {
      id: "US001",
      title: "Restrict unauthorized role actions",
      tier: "Tier 0",
      pts: 13,
      domain: "Backend",
      domainColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
      status: "In Progress",
      assignee: "KP",
      critical: true
    },
    {
      id: "US008",
      title: "Create and index defect records",
      tier: "Tier 1",
      pts: 8,
      domain: "Frontend",
      domainColor: "bg-sky-500/10 text-sky-400 border-sky-500/30",
      status: "In Progress",
      assignee: "NF",
      critical: false
    },
    {
      id: "US013",
      title: "Link defects with core Work Orders",
      tier: "Tier 2",
      pts: 13,
      domain: "Backend",
      domainColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
      status: "To Do",
      assignee: "DW",
      critical: true
    }
  ];

  const capacityPct = Math.round((committedPoints / Math.max(1, totalCapacity)) * 100);

  return (
    <div className="w-full bg-slate-50 text-slate-900 font-sans antialiased p-3 sm:p-6 space-y-6">

      {/* 1. GLASSMORPHIC TOP BAR */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-5 py-3.5 backdrop-blur-xl shadow-xs transition-all">
        {/* Breadcrumb & Project Identity */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-md shadow-slate-900/20">
            <Cpu className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                {projectName}
              </span>
              <ChevronRight className="h-3 w-3 text-slate-500" strokeWidth={2} />
              <span className="text-xs font-bold text-slate-900">Sprint Backlog</span>
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900">
              {sprintName}
            </h1>
          </div>
        </div>

        {/* Global Search Input (Cmd + K) */}
        <div className="hidden md:flex min-h-[44px] w-72 items-center justify-between rounded-xl border border-slate-200 bg-white/90 px-3.5 py-1.5 text-xs text-slate-600 shadow-2xs hover:border-slate-300 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900">
          <div className="flex items-center gap-2.5">
            <Search className="h-4 w-4 text-slate-600" strokeWidth={1.75} />
            <input
              type="text"
              placeholder="Search stories, dependencies, epics..."
              className="bg-transparent text-xs text-slate-900 placeholder-slate-600 focus:outline-none w-44"
            />
          </div>
          <kbd className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700 shadow-2xs">
            ⌘K
          </kbd>
        </div>

        {/* Live Status Pill & Quick Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Heartbeat Status Pill */}
          <div className="inline-flex min-h-[44px] items-center gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-3.5 py-2 text-xs font-bold text-emerald-800 shadow-2xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span>ILP Solver Active</span>
          </div>

          {/* Quick Create Action */}
          <button
            type="button"
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-md shadow-slate-900/20 transition-all hover:bg-slate-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">Add Action Item</span>
          </button>
        </div>
      </header>

      {/* 2. DYNAMIC BENTO BOX GRID CONTAINER (12 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">

        {/* ── CARD A: 8-COLUMN MAIN TELEMETRY BENTO CARD ── */}
        <section
          aria-label="Sprint Velocity & Burn Telemetry"
          onMouseEnter={() => setIsChartHovered(true)}
          onMouseLeave={() => setIsChartHovered(false)}
          className="md:col-span-8 group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 p-6 backdrop-blur-md shadow-xl transition-all duration-300 hover:shadow-2xl"
        >
          {/* Ambient Lighting Gradient Accent */}
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent blur-3xl transition-opacity group-hover:opacity-100 opacity-70" />

          {/* Header Row */}
          <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700">
                  Telemetry Engine
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                  <Zap className="h-3 w-3 text-indigo-600" />
                  Live Velocity
                </span>
              </div>
              <h2 className="mt-1 text-lg font-black text-slate-900 tracking-tight">
                Sprint Burn-Trajectory & Velocity Curve
              </h2>
            </div>

            {/* Quick KPI Stats in Header */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="text-right">
                <span className="text-slate-600 block text-[10px] uppercase font-sans font-bold">Planned</span>
                <span className="font-bold text-slate-700">{committedPoints} pts</span>
              </div>
              <div className="h-7 w-[1px] bg-slate-200" />
              <div className="text-right">
                <span className="text-slate-600 block text-[10px] uppercase font-sans font-bold">Remaining</span>
                <span className="font-bold text-indigo-600">{telemetryData[telemetryData.length - 1].actual} pts</span>
              </div>
            </div>
          </div>

          {/* SVG Trendline & Dynamic Bar Chart */}
          <div className="relative mt-6 pt-2">
            {/* SVG Interactive Trendline Drawing Overlay */}
            <div className="absolute inset-0 pointer-events-none h-48 w-full z-10 px-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="trendGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Ideal Guide Trajectory (Dashed) */}
                <line
                  x1="10"
                  y1="10"
                  x2="490"
                  y2="110"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Animated Actual Curve that physically draws on card hover */}
                <path
                  d="M 10,12 Q 130,22 250,56 T 490,112"
                  fill="none"
                  stroke="url(#trendGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  filter="url(#glow)"
                  style={{
                    strokeDasharray: 550,
                    strokeDashoffset: isChartHovered ? 0 : 250,
                    transition: "stroke-dashoffset 900ms cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                />
              </svg>
            </div>

            {/* Bar Grid Visuals */}
            <div className="grid grid-cols-10 gap-2 sm:gap-3 h-48 items-end px-2 pt-4 relative">
              {telemetryData.map((d, idx) => {
                const maxVal = 42;
                const heightPct = Math.max(10, Math.round((d.actual / maxVal) * 100));
                const isSelected = selectedBar === idx;

                return (
                  <div
                    key={d.day}
                    onClick={() => setSelectedBar(idx)}
                    className="flex flex-col items-center gap-2 group/bar cursor-pointer h-full justify-end"
                  >
                    {/* Hover Tooltip Value */}
                    <div
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-all duration-150 ${
                        isSelected || isChartHovered
                          ? 'bg-slate-900 text-white opacity-100 scale-100 shadow-sm'
                          : 'opacity-0 scale-90'
                      }`}
                    >
                      {d.actual}p
                    </div>

                    {/* Fluid Bar with Pulsing Data Processing Accent */}
                    <div className="w-full relative rounded-xl overflow-hidden bg-slate-100 transition-all duration-300 group-hover/bar:bg-indigo-50">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-xl transition-all duration-500 ease-out relative overflow-hidden ${
                          idx === telemetryData.length - 1
                            ? 'bg-gradient-to-t from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-t from-indigo-600 to-violet-500 group-hover/bar:from-indigo-500 group-hover/bar:to-purple-500'
                        }`}
                      >
                        {/* Real-time Data Heartbeat Overlay */}
                        <div className="absolute inset-0 bg-white/20 animate-pulse pointer-events-none" />
                      </div>
                    </div>

                    {/* Day Axis Label */}
                    <span className="text-[10px] font-mono font-bold text-slate-500 group-hover/bar:text-slate-900">
                      {d.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Telemetry Footer Info */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Hover across the card to draw live burndown curves and inspect atomic daily shifts.
            </span>
            <span className="font-mono text-indigo-600 font-bold">SciPy HiGHS Synced</span>
          </div>
        </section>

        {/* ── CARD B & C: 4-COLUMN BENTO STACK ── */}
        <div className="md:col-span-4 space-y-5">

          {/* CARD B1: CAPACITY UTILIZATION CARD (Light Glass) */}
          <section
            aria-label="Sprint Capacity Utilization"
            className="group rounded-3xl border border-slate-200/80 bg-white/95 p-5 backdrop-blur-md shadow-xl transition-all duration-200 hover:shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                  Sprint Allocation
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  Capacity Bandwidth
                </h3>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs">
                <Target className="h-4 w-4" strokeWidth={2} />
              </div>
            </div>

            {/* Large Metric Display */}
            <div className="mt-4 flex items-baseline justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 tracking-tight">
                  {committedPoints}
                </span>
                <span className="text-sm font-semibold text-slate-600">
                  / {totalCapacity} pts
                </span>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                {capacityPct}% Committed
              </span>
            </div>

            {/* Fluid Active Processing Bar */}
            <div className="relative mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                style={{ width: `${capacityPct}%` }}
                className="relative h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-500 ease-out"
              >
                {/* Micro-processing active heartbeat bar */}
                <div className="absolute inset-0 bg-white/30 animate-pulse pointer-events-none" />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              5 pts headroom remaining before exceeding velocity buffer. No overflow detected.
            </p>
          </section>

          {/* CARD B2: HIGH-IMPACT DARK THEMED ACTIVE WORK ITEMS (Glowing Ambient) */}
          <section
            aria-label="Active High-Priority Items"
            className="group relative overflow-hidden rounded-3xl border border-slate-800/90 bg-slate-900 p-5 text-white shadow-xl transition-all duration-200 hover:shadow-2xl"
          >
            {/* Glowing Ambient Radial LED Backdrop */}
            <div className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-indigo-500/20 blur-2xl transition-all group-hover:scale-125" />
            <div className="pointer-events-none absolute -top-10 -left-10 h-44 w-44 rounded-full bg-purple-500/15 blur-2xl" />

            <div className="relative flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                </span>
                <h3 className="text-sm font-extrabold tracking-wide text-white">
                  Active Sprint Floor
                </h3>
              </div>
              <span className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-300">
                3 Running
              </span>
            </div>

            {/* Interactive Task Rows */}
            <div className="relative mt-3 space-y-2.5">
              {activeSprintItems.map((item) => (
                <div
                  key={item.id}
                  className="group/row flex min-h-[44px] items-center justify-between gap-3 rounded-2xl border border-slate-800/90 bg-slate-950/70 p-3 transition-all duration-150 hover:border-indigo-500/50 hover:bg-slate-950 active:scale-95 cursor-pointer shadow-xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {item.id}
                      </span>
                      <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded border ${item.domainColor}`}>
                        {item.domain}
                      </span>
                      {item.critical && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center gap-0.5">
                          <Flame className="h-2.5 w-2.5 text-amber-400" />
                          <span>CP</span>
                        </span>
                      )}
                    </div>
                    <h4 className="mt-1 truncate text-xs font-semibold text-slate-200 group-hover/row:text-white">
                      {item.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex h-6 min-w-[22px] items-center justify-center rounded-full bg-slate-800 px-1.5 font-mono text-xs font-bold text-slate-200">
                      {item.pts}p
                    </span>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-2xs">
                      {item.assignee}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Link Button */}
            <button
              type="button"
              onClick={() => onNavigateToTab('kanban')}
              className="relative mt-3.5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 px-3 text-xs font-bold text-indigo-300 transition-all hover:bg-indigo-600/30 hover:text-white active:scale-95"
            >
              <span>Inspect Complete Kanban Floor</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </section>

        </div>
      </div>

    </div>
  );
}
