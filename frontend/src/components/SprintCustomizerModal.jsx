import React, { useState, useEffect } from "react";
import { 
  Sparkles, Calendar, Clock, ShieldAlert, Users, 
  CheckCircle2, ChevronRight, ChevronLeft, RefreshCw, 
  X, Plus, Trash2, Sliders, MessageSquare, Check,
  Layers, AlertTriangle, Palmtree, ArrowRight, CheckSquare,
  Square, Award, Tag
} from "lucide-react";

export default function SprintCustomizerModal({ isOpen, onClose, onApplySuccess, currentCapacities = [30, 28, 30] }) {
  const [activeMode, setActiveMode] = useState("chat"); // "chat" | "form"
  const [currentStep, setCurrentStep] = useState(0); // 0 to 4 for 5 questions
  const [loading, setLoading] = useState(false);
  const [presetHolidays, setPresetHolidays] = useState({});

  // 5 Strategic Customization Parameters
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() + (day === 0 ? 1 : (8 - day));
    const nextMon = new Date(d.setDate(diff));
    return nextMon.toISOString().split('T')[0];
  });

  const [sprintDurationWeeks, setSprintDurationWeeks] = useState(2);
  
  const [holidays, setHolidays] = useState([
    { date: "2026-10-20", name: "Deepavali Festival" },
    { date: "2026-10-25", name: "Vap Full Moon Poya Day" },
    { date: "2026-11-23", name: "Il Full Moon Poya Day" },
    { date: "2026-12-25", name: "Christmas Day" }
  ]);
  
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [newHolidayName, setNewHolidayName] = useState("");

  const [capacities, setCapacities] = useState(currentCapacities);
  const [bufferPercentage, setBufferPercentage] = useState(10);

  // Multi-Selection state for all 5 questions
  const [multiSelections, setMultiSelections] = useState({
    0: ["mon_start", "exclude_weekends"],
    1: ["two_weeks", "planning_ceremony"],
    2: ["preset_sri_lanka"],
    3: ["standard_velocity", "backend_track"],
    4: ["scope_buffer", "qa_buffer"]
  });

  // Chat message history
  const [chatMessages, setChatMessages] = useState([]);

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      initChatFlow();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("http://localhost:8082/api/timeline/config");
      const data = await res.json();
      if (data.status === "success") {
        if (data.config) {
          if (data.config.start_date) setStartDate(data.config.start_date);
          if (data.config.sprint_duration_weeks) setSprintDurationWeeks(data.config.sprint_duration_weeks);
          if (data.config.holidays) setHolidays(data.config.holidays);
          if (data.config.capacities) setCapacities(data.config.capacities);
          if (data.config.buffer_percentage !== undefined) setBufferPercentage(data.config.buffer_percentage);
        }
        if (data.presets) {
          setPresetHolidays(data.presets);
        }
      }
    } catch (err) {
      console.error("Config fetch error:", err);
    }
  };

  const questions = [
    {
      id: 0,
      title: "Project Kickoff & Working Schedule",
      aiPrompt: "Question 1 of 5: Configure your Project Kickoff and Working Schedule. Select all options that apply to your agile team:",
      icon: Calendar,
      options: [
        { id: "mon_start", label: "📅 Kickoff on Next Monday (Standard)", desc: "Starts next business week cleanly", val: getNextMonday(), apply: () => setStartDate(getNextMonday()) },
        { id: "today_start", label: "🚀 Start Immediately (Today)", desc: "Begin execution with zero delay", val: new Date().toISOString().split('T')[0], apply: () => setStartDate(new Date().toISOString().split('T')[0]) },
        { id: "exclude_weekends", label: "🗓️ 5-Day Business Week (Mon–Fri)", desc: "Skip Saturdays & Sundays automatically", defaultChecked: true },
        { id: "milestone_check", label: "🚩 Mid-Project Milestone Review Checkpoint", desc: "Adds sync point between Sprint 1 and 2" },
        { id: "mvp_target", label: "🎯 Target MVP Showcase Milestone", desc: "Flags release target milestone" }
      ]
    },
    {
      id: 1,
      title: "Sprint Cadence, Releases & Ceremonies",
      aiPrompt: "Question 2 of 5: Choose your Sprint Cadence and Agile Ceremonies. Select standard or custom iteration length for your company:",
      icon: Clock,
      options: [
        { id: "two_weeks", label: "🎯 2-Week Sprints (Agile Standard - 10 Working Days)", desc: "Most widely adopted Scrum iteration length across modern tech squads", defaultChecked: true, apply: () => setSprintDurationWeeks(2) },
        { id: "one_week", label: "⚡ 1-Week Rapid Sprints (5 Working Days)", desc: "Fast-paced startup & continuous deployment release cadence", apply: () => setSprintDurationWeeks(1) },
        { id: "three_weeks", label: "📦 3-Week Feature Delivery Sprints (15 Working Days)", desc: "Suited for complex architectural modules and integration", apply: () => setSprintDurationWeeks(3) },
        { id: "four_weeks", label: "🏢 4-Week / 1-Month Iterations (20 Working Days)", desc: "Enterprise SAFe cadence, banking & regulated compliance cycles", apply: () => setSprintDurationWeeks(4) },
        { id: "planning_ceremony", label: "📋 Reserve Sprint Planning & Refinement Ceremony Day", desc: "Dedicates initial sprint kickoff and backlog refinement time", defaultChecked: true },
        { id: "retro_demo", label: "🔄 End-of-Sprint Retrospective & Demo Window", desc: "Reserves end-of-iteration review slot for stakeholders" },
        { id: "hardening_window", label: "🛠️ Dedicated Code Hardening & Release Window", desc: "Adds post-sprint stabilization and QA regression period" }
      ]
    },
    {
      id: 2,
      title: "Public Holidays & Team Blackout Dates",
      aiPrompt: "Question 3 of 5: Select which holiday calendars and blackout dates should be skipped in the Gantt timeline:",
      icon: Palmtree,
      options: [
        { id: "preset_sri_lanka", label: "🇱🇰 Sri Lanka National & Poya Holidays", desc: "Includes Deepavali, Vesak, Poya days, Christmas, etc.", defaultChecked: true, applyPreset: "sri_lanka" },
        { id: "preset_global_tech", label: "🌍 Global Tech & Western Holidays", desc: "Includes Christmas Break, New Year, Thanksgiving", applyPreset: "global_tech" },
        { id: "team_hackathon", label: "🏖️ Team Hackathon / Innovation Day Off", desc: "Includes 1 company-wide innovation day", customDay: { date: "2026-11-06", name: "Team Hackathon Day" } },
        { id: "company_off", label: "🏢 Quarterly Company Off / Rest Day", desc: "Adds 1 wellness day off", customDay: { date: "2026-11-20", name: "Quarterly Wellness Day" } }
      ]
    },
    {
      id: 3,
      title: "Team Velocity & Multi-Sprint Capacity",
      aiPrompt: "Question 4 of 5: Select your team velocity profiles and multi-sprint capacities:",
      icon: Users,
      options: [
        { id: "standard_velocity", label: "⚖️ Standard Team Velocity (30, 28, 30 pts)", desc: "Balanced capacity across all 3 sprints", defaultChecked: true, apply: () => setCapacities([30, 28, 30]) },
        { id: "high_velocity", label: "🚀 High Velocity Surge (40, 38, 40 pts)", desc: "Increased developer velocity capacity", apply: () => setCapacities([40, 38, 40]) },
        { id: "ramp_up_curve", label: "📈 Ramp-Up Velocity Curve (22, 28, 35 pts)", desc: "Gradual acceleration for new teams", apply: () => setCapacities([22, 28, 35]) },
        { id: "backend_track", label: "💻 Backend & API Architecture Track (15 pts reserved)", desc: "Prioritizes critical data & security blockers", defaultChecked: true },
        { id: "frontend_track", label: "🎨 UI/UX & Client Integration Track (12 pts reserved)", desc: "Ensures UI accessibility and user stories" }
      ]
    },
    {
      id: 4,
      title: "Risk, QA & Contingency Buffer Strategies",
      aiPrompt: "Question 5 of 5: Select risk mitigation and buffer contingency mechanisms to protect the timeline:",
      icon: ShieldAlert,
      options: [
        { id: "scope_buffer", label: "🛡️ 10% Scope Uncertainty & Complexity Buffer", desc: "Protects against unforeseen edge cases", defaultChecked: true, bufferAdd: 10 },
        { id: "qa_buffer", label: "🧪 +5% Automated Regression & QA Hardening Buffer", desc: "Additional test execution padding", defaultChecked: true, bufferAdd: 5 },
        { id: "dep_margin", label: "🔗 Topological DAG Dependency Blocker Margin", desc: "Buffers critical unblocker stories", bufferAdd: 5 },
        { id: "strict_target", label: "🚨 Zero Buffer (Strict / Aggressive Delivery Target)", desc: "0% contingency padding", bufferAdd: 0 }
      ]
    }
  ];

  function getNextMonday() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() + (day === 0 ? 1 : (8 - day));
    const nextMon = new Date(d.setDate(diff));
    return nextMon.toISOString().split('T')[0];
  }

  function getFirstOfNextMonth() {
    const d = new Date();
    const nextM = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return nextM.toISOString().split('T')[0];
  }

  const initChatFlow = () => {
    setCurrentStep(0);
    setChatMessages([
      {
        sender: "ai",
        text: "👋 Hi! I'm your AI Agile Sprint & Delivery Architect. Let's customize your project schedule with exact dates, working days, holidays, team velocity, and risk buffers.",
        time: "Just now"
      },
      {
        sender: "ai",
        text: questions[0].aiPrompt,
        step: 0,
        time: "Just now"
      }
    ]);
  };

  const toggleOption = (stepIdx, opt) => {
    const current = multiSelections[stepIdx] || [];
    let updated;
    if (current.includes(opt.id)) {
      updated = current.filter(id => id !== opt.id);
    } else {
      // If exclusive choices (e.g. strict vs buffer, or 1 week vs 2 weeks)
      if (opt.id === "strict_target") {
        updated = ["strict_target"];
      } else if (opt.id === "scope_buffer" || opt.id === "qa_buffer" || opt.id === "dep_margin") {
        updated = current.filter(id => id !== "strict_target").concat(opt.id);
      } else if (opt.id === "one_week" || opt.id === "two_weeks" || opt.id === "three_weeks") {
        updated = current.filter(id => !["one_week", "two_weeks", "three_weeks"].includes(id)).concat(opt.id);
      } else if (opt.id === "standard_velocity" || opt.id === "high_velocity" || opt.id === "ramp_up_curve") {
        updated = current.filter(id => !["standard_velocity", "high_velocity", "ramp_up_curve"].includes(id)).concat(opt.id);
      } else {
        updated = [...current, opt.id];
      }
    }

    setMultiSelections({ ...multiSelections, [stepIdx]: updated });

    // Apply immediate parameter effects
    if (opt.apply && !current.includes(opt.id)) {
      opt.apply();
    }

    // Handle Holidays Multi-Selection
    if (stepIdx === 2) {
      let combinedHolidays = [];
      if (updated.includes("preset_sri_lanka") && presetHolidays.sri_lanka) {
        combinedHolidays = [...combinedHolidays, ...presetHolidays.sri_lanka];
      }
      if (updated.includes("preset_global_tech") && presetHolidays.global_tech) {
        combinedHolidays = [...combinedHolidays, ...presetHolidays.global_tech];
      }
      if (updated.includes("team_hackathon")) {
        combinedHolidays.push({ date: "2026-11-06", name: "Team Hackathon Day" });
      }
      if (updated.includes("company_off")) {
        combinedHolidays.push({ date: "2026-11-20", name: "Quarterly Wellness Day" });
      }

      // Deduplicate by date
      const uniqueMap = {};
      combinedHolidays.forEach(h => {
        const d = typeof h === 'string' ? h : h.date;
        const n = typeof h === 'string' ? 'Public Holiday' : h.name;
        uniqueMap[d] = n;
      });
      setHolidays(Object.keys(uniqueMap).map(d => ({ date: d, name: uniqueMap[d] })));
    }

    // Handle Buffer Multi-Selection
    if (stepIdx === 4) {
      if (updated.includes("strict_target")) {
        setBufferPercentage(0);
      } else {
        let totalBuf = 0;
        if (updated.includes("scope_buffer")) totalBuf += 10;
        if (updated.includes("qa_buffer")) totalBuf += 5;
        if (updated.includes("dep_margin")) totalBuf += 5;
        setBufferPercentage(totalBuf || 10);
      }
    }
  };

  const handleConfirmStep = (stepIdx) => {
    const selectedIds = multiSelections[stepIdx] || [];
    const stepQ = questions[stepIdx];
    const selectedLabels = stepQ.options
      .filter(o => selectedIds.includes(o.id))
      .map(o => o.label);

    const summaryText = selectedLabels.length > 0 
      ? `Selected (${selectedLabels.length}): ${selectedLabels.join(" • ")}`
      : `Default configuration accepted`;

    const nextIdx = stepIdx + 1;
    const newMsgs = [...chatMessages, { sender: "user", text: summaryText, time: "Just now" }];

    if (nextIdx < questions.length) {
      newMsgs.push({
        sender: "ai",
        text: questions[nextIdx].aiPrompt,
        step: nextIdx,
        time: "Just now"
      });
      setCurrentStep(nextIdx);
    } else {
      newMsgs.push({
        sender: "ai",
        text: "🎉 All 5 questions successfully customized! Review your summary below and click 'Apply & Recalculate Timeline' to generate your optimal Gantt chart and Sprints.",
        step: 5,
        isCompleted: true,
        time: "Just now"
      });
      setCurrentStep(5);
    }
    setChatMessages(newMsgs);
  };

  const handleAddCustomHoliday = () => {
    if (!newHolidayDate) return;
    const name = newHolidayName.trim() || "Custom Team Holiday";
    if (holidays.some(h => (typeof h === 'string' ? h : h.date) === newHolidayDate)) return;
    setHolidays([...holidays, { date: newHolidayDate, name }]);
    setNewHolidayDate("");
    setNewHolidayName("");
  };

  const handleRemoveHoliday = (dateToRemove) => {
    setHolidays(holidays.filter(h => (typeof h === 'string' ? h : h.date) !== dateToRemove));
  };

  const handleApplyCustomization = async () => {
    setLoading(true);
    try {
      const payload = {
        start_date: startDate,
        sprint_duration_weeks: sprintDurationWeeks,
        holidays: holidays,
        capacities: capacities,
        buffer_percentage: bufferPercentage,
        multi_selections: multiSelections
      };

      const res = await fetch("http://localhost:8082/api/timeline/customize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.status === "success") {
        if (onApplySuccess) {
          onApplySuccess(data);
        }
        onClose();
      }
    } catch (err) {
      console.error("Timeline customization save error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Agile Sprint & Timeline Customizer
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckSquare className="w-3 h-3" /> Multi-Select Enabled
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Answer 5 questions with single or multiple selections to tailor your delivery roadmap & holidays.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setActiveMode("chat")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeMode === "chat" 
                    ? "bg-emerald-600 text-white font-bold shadow-sm" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                AI Chat Setup
              </button>
              <button
                onClick={() => setActiveMode("form")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  activeMode === "form" 
                    ? "bg-emerald-600 text-white font-bold shadow-sm" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Express Form
              </button>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 5-Step Progress Tracker */}
        <div className="grid grid-cols-5 border-b border-slate-800/80 bg-slate-950/40 text-xs text-center font-medium">
          {questions.map((q, idx) => {
            const Icon = q.icon;
            const isDone = currentStep > idx;
            const isCurrent = currentStep === idx;
            const selectedCount = (multiSelections[idx] || []).length;

            return (
              <button
                key={q.id}
                onClick={() => {
                  setCurrentStep(idx);
                  if (activeMode === "chat") {
                    setChatMessages(prev => [
                      ...prev,
                      { sender: "ai", text: q.aiPrompt, step: idx, time: "Just now" }
                    ]);
                  }
                }}
                className={`py-2.5 px-2 flex items-center justify-center gap-1.5 transition-all border-b-2 ${
                  isCurrent 
                    ? "border-emerald-500 text-emerald-400 bg-emerald-500/5 font-bold" 
                    : isDone 
                    ? "border-emerald-600/40 text-slate-300 hover:bg-slate-800/40" 
                    : "border-transparent text-slate-500 hover:text-slate-400"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isCurrent ? "text-emerald-400" : isDone ? "text-emerald-500" : "text-slate-500"}`} />
                <span className="hidden sm:inline">Q{idx + 1}: {q.title.split(' ')[0]}</span>
                <span className="sm:hidden">Q{idx + 1}</span>
                {selectedCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    {selectedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {activeMode === "chat" ? (
            /* ================= CONVERSATIONAL MULTI-SELECT CHAT MODE ================= */
            <div className="space-y-4">
              {chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}
                >
                  {msg.sender === "ai" && (
                    <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                  <div 
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                      msg.sender === "user" 
                        ? "bg-emerald-600 text-white font-medium rounded-tr-none" 
                        : "bg-slate-800/90 border border-slate-700/80 text-slate-200 rounded-tl-none"
                    }`}
                  >
                    <p className="leading-relaxed font-medium">{msg.text}</p>
                    
                    {/* Interactive Multi-Select Options Card inside Chat */}
                    {msg.sender === "ai" && msg.step !== undefined && msg.step < questions.length && (
                      <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5" />
                            Select all answers that apply:
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {(multiSelections[msg.step] || []).length} Selected
                          </span>
                        </div>

                        {/* Multi-Select Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {questions[msg.step].options.map((opt) => {
                            const isChecked = (multiSelections[msg.step] || []).includes(opt.id);
                            return (
                              <button
                                key={opt.id}
                                onClick={() => toggleOption(msg.step, opt)}
                                className={`text-left p-2.5 rounded-xl border transition-all flex items-start gap-2.5 ${
                                  isChecked 
                                    ? "bg-emerald-950/60 border-emerald-500/80 text-white shadow-md shadow-emerald-950/50" 
                                    : "bg-slate-900/60 border-slate-700/70 text-slate-300 hover:bg-slate-800/80 hover:text-white"
                                }`}
                              >
                                <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                                  isChecked 
                                    ? "bg-emerald-500 border-emerald-400 text-slate-950 font-bold" 
                                    : "border-slate-600 bg-slate-950"
                                }`}>
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                                <div className="space-y-0.5 flex-1">
                                  <div className="text-xs font-bold leading-tight flex items-center justify-between">
                                    <span>{opt.label}</span>
                                  </div>
                                  {opt.desc && (
                                    <p className="text-[10px] text-slate-400 leading-tight">{opt.desc}</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom Input Controls based on Question Step */}
                        {msg.step === 0 && (
                          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 flex items-center gap-3">
                            <span className="text-xs text-slate-400 font-semibold">Custom Start Date:</span>
                            <input 
                              type="date" 
                              value={startDate}
                              onChange={(e) => setStartDate(e.target.value)}
                              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-[11px] text-emerald-400 font-mono">
                              Active: {startDate}
                            </span>
                          </div>
                        )}

                        {msg.step === 1 && (
                          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Company Sprint Cadence & Iteration Length:</span>
                              </span>
                              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                {sprintDurationWeeks} Weeks ({sprintDurationWeeks * 5} Working Days)
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                              {[
                                { weeks: 1, label: "⚡ 1 Week", sub: "5 Working Days (Startup / Rapid)" },
                                { weeks: 2, label: "🎯 2 Weeks", sub: "10 Working Days (Agile Standard)" },
                                { weeks: 3, label: "📦 3 Weeks", sub: "15 Working Days (Milestone Delivery)" },
                                { weeks: 4, label: "🏢 4 Weeks", sub: "20 Working Days (Enterprise / SAFe)" }
                              ].map(cadence => (
                                <button
                                  key={cadence.weeks}
                                  type="button"
                                  onClick={() => setSprintDurationWeeks(cadence.weeks)}
                                  className={`p-2.5 rounded-xl border text-left transition-all ${
                                    sprintDurationWeeks === cadence.weeks
                                      ? "bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-600/30 font-bold"
                                      : "bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                                  }`}
                                >
                                  <span className="text-xs block font-bold">{cadence.label}</span>
                                  <span className={`text-[10px] block leading-tight ${sprintDurationWeeks === cadence.weeks ? "text-emerald-100" : "text-slate-400"}`}>
                                    {cadence.sub}
                                  </span>
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-[11px] text-slate-400 font-medium">Or enter custom duration:</span>
                              <input
                                type="number"
                                min="1"
                                max="8"
                                value={sprintDurationWeeks}
                                onChange={(e) => setSprintDurationWeeks(Math.max(1, Math.min(8, Number(e.target.value) || 2)))}
                                className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-emerald-400 font-mono font-bold text-center focus:outline-none focus:border-emerald-500"
                              />
                              <span className="text-[11px] text-slate-400 font-mono">Weeks ({sprintDurationWeeks * 5} Business Working Days)</span>
                            </div>
                          </div>
                        )}

                        {msg.step === 2 && (
                          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                                <Palmtree className="w-3.5 h-3.5" /> Excluded Non-Working Days ({holidays.length})
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                              {holidays.map((h, hIdx) => {
                                const dateStr = typeof h === 'string' ? h : h.date;
                                const nameStr = typeof h === 'string' ? 'Holiday' : h.name;
                                return (
                                  <span key={hIdx} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300">
                                    <span className="font-semibold">{dateStr}</span>: {nameStr}
                                    <button onClick={() => handleRemoveHoliday(dateStr)} className="hover:text-rose-400 ml-1">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <input 
                                type="date"
                                value={newHolidayDate}
                                onChange={(e) => setNewHolidayDate(e.target.value)}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                              />
                              <input 
                                type="text"
                                placeholder="Add custom holiday / day off..."
                                value={newHolidayName}
                                onChange={(e) => setNewHolidayName(e.target.value)}
                                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500"
                              />
                              <button
                                onClick={handleAddCustomHoliday}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                            </div>
                          </div>
                        )}

                        {msg.step === 3 && (
                          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-700/60">
                            <span className="text-xs text-slate-300 font-semibold block mb-2">Adjust Capacities (Story Points):</span>
                            <div className="grid grid-cols-3 gap-2">
                              {capacities.map((cap, capIdx) => (
                                <div key={capIdx} className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
                                  <span className="text-[10px] text-slate-400 block font-medium">Sprint {capIdx + 1}</span>
                                  <input 
                                    type="number"
                                    min="15"
                                    max="60"
                                    value={cap}
                                    onChange={(e) => {
                                      const updated = [...capacities];
                                      updated[capIdx] = Number(e.target.value);
                                      setCapacities(updated);
                                    }}
                                    className="w-14 text-center bg-slate-900 border border-slate-700 rounded py-0.5 text-xs text-white font-bold"
                                  />
                                  <span className="text-[10px] text-slate-500 ml-1">pts</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Multi-Select Confirm & Next Button */}
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleConfirmStep(msg.step)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
                          >
                            <span>Confirm & Next Question (Q{msg.step + 2})</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ================= EXPRESS MULTI-SELECT FORM VIEW ================= */
            <div className="space-y-6">
              {questions.map((q, qIdx) => {
                const Icon = q.icon;
                const currentSelected = multiSelections[qIdx] || [];

                return (
                  <div key={q.id} className="p-5 rounded-2xl bg-slate-800/60 border border-slate-700/70 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">
                            Question {qIdx + 1}: {q.title}
                          </h3>
                          <p className="text-[11px] text-slate-400">{q.aiPrompt}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        {currentSelected.length} Selected
                      </span>
                    </div>

                    {/* Multi-Select Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {q.options.map(opt => {
                        const isChecked = currentSelected.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => toggleOption(qIdx, opt)}
                            className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                              isChecked 
                                ? "bg-emerald-950/60 border-emerald-500/80 text-white shadow-md shadow-emerald-950/40" 
                                : "bg-slate-900/60 border-slate-700/70 text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border transition-all ${
                              isChecked 
                                ? "bg-emerald-500 border-emerald-400 text-slate-950 font-bold" 
                                : "border-slate-600 bg-slate-950"
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div className="space-y-0.5 flex-1">
                              <span className="text-xs font-bold block leading-tight">{opt.label}</span>
                              {opt.desc && (
                                <p className="text-[10px] text-slate-400 leading-tight">{opt.desc}</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Form View Sub-Controls */}
                    {qIdx === 0 && (
                      <div className="flex items-center gap-3 pt-2">
                        <span className="text-xs text-slate-400 font-medium">Exact Kickoff Date:</span>
                        <input 
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                    )}

                    {qIdx === 1 && (
                      <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/60 space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Select Standard Iteration Length:</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                            {sprintDurationWeeks} Weeks ({sprintDurationWeeks * 5} Business Working Days)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                          {[
                            { weeks: 1, label: "⚡ 1 Week", sub: "5 Working Days (Startup / Rapid)" },
                            { weeks: 2, label: "🎯 2 Weeks", sub: "10 Working Days (Agile Standard)" },
                            { weeks: 3, label: "📦 3 Weeks", sub: "15 Working Days (Milestone Delivery)" },
                            { weeks: 4, label: "🏢 4 Weeks", sub: "20 Working Days (Enterprise / SAFe)" }
                          ].map(cadence => (
                            <button
                              key={cadence.weeks}
                              type="button"
                              onClick={() => setSprintDurationWeeks(cadence.weeks)}
                              className={`p-2.5 rounded-xl border text-left transition-all ${
                                sprintDurationWeeks === cadence.weeks
                                  ? "bg-emerald-600 border-emerald-400 text-white shadow-md shadow-emerald-600/30 font-bold"
                                  : "bg-slate-950 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                              }`}
                            >
                              <span className="text-xs block font-bold">{cadence.label}</span>
                              <span className={`text-[10px] block leading-tight ${sprintDurationWeeks === cadence.weeks ? "text-emerald-100" : "text-slate-400"}`}>
                                {cadence.sub}
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[11px] text-slate-400 font-medium">Custom Iteration Weeks:</span>
                          <input
                            type="number"
                            min="1"
                            max="8"
                            value={sprintDurationWeeks}
                            onChange={(e) => setSprintDurationWeeks(Math.max(1, Math.min(8, Number(e.target.value) || 2)))}
                            className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-emerald-400 font-mono font-bold text-center focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-[11px] text-slate-400 font-mono">Weeks ({sprintDurationWeeks * 5} Business Working Days)</span>
                        </div>
                      </div>
                    )}

                    {qIdx === 2 && (
                      <div className="pt-2 space-y-2">
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-900/70 rounded-xl border border-slate-800">
                          {holidays.map((h, i) => {
                            const dateStr = typeof h === 'string' ? h : h.date;
                            const nameStr = typeof h === 'string' ? 'Public Holiday' : h.name;
                            return (
                              <span key={i} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200">
                                <span className="font-semibold text-amber-400">{dateStr}</span>: {nameStr}
                                <button onClick={() => handleRemoveHoliday(dateStr)} className="hover:text-rose-400 ml-0.5">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="date"
                            value={newHolidayDate}
                            onChange={(e) => setNewHolidayDate(e.target.value)}
                            className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-xs text-white"
                          />
                          <input 
                            type="text"
                            placeholder="Add holiday or day off..."
                            value={newHolidayName}
                            onChange={(e) => setNewHolidayName(e.target.value)}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1 text-xs text-white placeholder-slate-500"
                          />
                          <button
                            onClick={handleAddCustomHoliday}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add
                          </button>
                        </div>
                      </div>
                    )}

                    {qIdx === 3 && (
                      <div className="pt-2 flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-medium">Sprint Capacities:</span>
                        <div className="flex gap-2">
                          {capacities.map((cap, i) => (
                            <div key={i} className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-700">
                              <span className="text-[10px] text-slate-400">S{i+1}:</span>
                              <input 
                                type="number" 
                                min="15" 
                                max="60" 
                                value={cap} 
                                onChange={(e) => {
                                  const updated = [...capacities];
                                  updated[i] = Number(e.target.value);
                                  setCapacities(updated);
                                }}
                                className="w-10 bg-transparent text-xs font-bold text-white text-center" 
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}

          {/* Real-time Delivery Schedule Preview */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-emerald-500/30 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                Live Calculated Delivery Roadmap Preview
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Total Multi-Selections: {Object.values(multiSelections).reduce((acc, arr) => acc + arr.length, 0)} Active
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Kickoff Date:</span>
                <span className="text-white font-bold text-sm">{startDate}</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Sprint Cadence:</span>
                <span className="text-white font-bold text-sm">{sprintDurationWeeks} Weeks ({sprintDurationWeeks * 5} w-days)</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">Skipped Holidays:</span>
                <span className="text-amber-400 font-bold text-sm">{holidays.length} Days Excluded</span>
              </div>
              <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                <span className="text-slate-400 block">QA & Risk Buffer:</span>
                <span className="text-emerald-400 font-bold text-sm">+{bufferPercentage}% Margin</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur sticky bottom-0 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleApplyCustomization}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Recalculating Sprints & Timeline...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  ✨ Apply Multi-Selections & Recalculate
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
