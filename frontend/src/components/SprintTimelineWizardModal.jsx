import React, { useState } from 'react';
import { 
  Building2, Globe, Landmark, Building, Rocket as RocketIcon,
  Calendar, Clock, Users, Shield, Palmtree, Target, 
  Sparkles, CheckCircle2, ChevronRight, ChevronLeft, 
  ArrowRight, X, Zap, Cpu, Layers, AlertCircle, Info,
  Edit3, CheckSquare, Square, Plus, Trash2, Sliders, ToggleLeft, ToggleRight
} from 'lucide-react';

export default function SprintTimelineWizardModal({ 
  isOpen, 
  onClose, 
  batchTitle, 
  requirementsCount, 
  onGeneratePlan 
}) {
  if (!isOpen) return null;

  // Local device date formatting helpers (avoids UTC offset day-shift bugs)
  const formatLocalDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayDate = () => {
    return formatLocalDate(new Date());
  };

  // Helper to compute next Monday as default
  const getDefaultStartDate = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? 1 : (day === 1 ? 7 : 8 - day));
    const nextMon = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
    return formatLocalDate(nextMon);
  };

  const getFirstOfNextMonth = () => {
    const d = new Date();
    const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return formatLocalDate(nextMonth);
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!year || !month || !day) return dateStr;
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // State for all 7 questions with Suggested Presets, Type Custom, and Multi-Select
  // Q1: Organization Type
  const [q1OrgType, setQ1OrgType] = useState('private_tech'); // 'private_tech', 'international_offshore', 'banking', 'government', 'startup', 'custom'
  const [q1CustomOrgName, setQ1CustomOrgName] = useState('');
  const [q1Mode, setQ1Mode] = useState('preset');

  // Q2: Start Date
  const [q2StartDate, setQ2StartDate] = useState(getDefaultStartDate());
  const [q2CustomMode, setQ2CustomMode] = useState(false);

  // Q3: Cadence / Duration
  const [q3SelectedPreset, setQ3SelectedPreset] = useState(2); // 1, 2, 3, 4, 'custom'
  const [q3CustomWeeks, setQ3CustomWeeks] = useState(2);
  const [q3Mode, setQ3Mode] = useState('preset');

  // Q4: Buffer % (QA & Contingency)
  const [q5SelectedPreset, setQ5SelectedPreset] = useState(10); // 0, 10, 20, 30, 'custom'
  const [q5BufferPct, setQ5BufferPct] = useState(10);
  const [q5Mode, setQ5Mode] = useState('preset');

  // Q5: Calendar Policy & Multi-Selection Holiday Categories (Poya, Mercantile, Public, Bank, International)
  const [q6SelectedCalendars, setQ6SelectedCalendars] = useState([
    'sri_lanka_poya',
    'sri_lanka_mercantile'
  ]);
  const [q6WorkingDays, setQ6WorkingDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [q6CustomHolidays, setQ6CustomHolidays] = useState([]);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [q6Mode, setQ6Mode] = useState('preset'); // 'preset' or 'custom'

  // Q6: Partition Strategy & Multi-Selection Flags
  const [q7SelectedPreset, setQ7SelectedPreset] = useState('ilp_optimal'); // 'ilp_optimal', 'critical_first', 'fixed_sprints'
  const [q7FixedSprintCount, setQ7FixedSprintCount] = useState(3);
  const [q7AutoDecompose, setQ7AutoDecompose] = useState(true);
  const [q7EnforceDependencies, setQ7EnforceDependencies] = useState(true);
  const [q7BalanceDevs, setQ7BalanceDevs] = useState(true);
  const [q7Mode, setQ7Mode] = useState('preset');

  // Active step in the wizard: 1 to 6
  const [activeStep, setActiveStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState("");

  // Handler when Organization Type changes -> smart auto-configure holiday calendars
  const handleOrgTypeSelect = (orgKey) => {
    setQ1OrgType(orgKey);
    if (orgKey === 'private_tech') {
      setQ6SelectedCalendars(['sri_lanka_poya', 'sri_lanka_mercantile']);
    } else if (orgKey === 'international_offshore') {
      // Both Sri Lankan Mercantile/Poya AND International Global tech calendar!
      setQ6SelectedCalendars(['sri_lanka_poya', 'sri_lanka_mercantile', 'international_global']);
    } else if (orgKey === 'banking') {
      setQ6SelectedCalendars(['sri_lanka_poya', 'sri_lanka_mercantile', 'sri_lanka_public', 'sri_lanka_bank']);
    } else if (orgKey === 'government') {
      setQ6SelectedCalendars(['sri_lanka_poya', 'sri_lanka_mercantile', 'sri_lanka_public', 'sri_lanka_bank']);
    } else if (orgKey === 'startup') {
      setQ6SelectedCalendars(['sri_lanka_poya']);
    }
  };

  // Toggle multi-select holiday calendar category
  const toggleHolidayCalendar = (calKey) => {
    if (q6SelectedCalendars.includes(calKey)) {
      if (q6SelectedCalendars.length > 1) {
        setQ6SelectedCalendars(q6SelectedCalendars.filter(k => k !== calKey));
      }
    } else {
      setQ6SelectedCalendars([...q6SelectedCalendars, calKey]);
    }
  };

  // Toggle multi-select working day
  const toggleWorkingDay = (day) => {
    if (q6WorkingDays.includes(day)) {
      if (q6WorkingDays.length > 1) {
        setQ6WorkingDays(q6WorkingDays.filter(d => d !== day));
      }
    } else {
      setQ6WorkingDays([...q6WorkingDays, day]);
    }
  };

  // Add custom holiday
  const handleAddHoliday = () => {
    if (newHolidayDate && newHolidayName) {
      setQ6CustomHolidays([...q6CustomHolidays, { date: newHolidayDate, name: newHolidayName }]);
      setNewHolidayDate('');
      setNewHolidayName('');
    }
  };

  // Remove custom holiday
  const handleRemoveHoliday = (index) => {
    setQ6CustomHolidays(q6CustomHolidays.filter((_, i) => i !== index));
  };

  // Calculated values
  const effectiveCadenceWeeks = q3Mode === 'custom' ? Math.max(1, Number(q3CustomWeeks)) : q3SelectedPreset;
  const effectiveBuffer = q5Mode === 'custom' ? Math.max(0, Number(q5BufferPct)) : q5SelectedPreset;
  const effectiveStrategy = q7Mode === 'custom' ? 'ilp_optimal' : q7SelectedPreset;

  // Estimate duration and sprints based on inputs
  const estimatedPoints = requirementsCount * 4;
  const estimatedSprints = effectiveStrategy === 'fixed_sprints' 
    ? q7FixedSprintCount 
    : Math.max(2, Math.ceil(estimatedPoints / 45));
  const estimatedTotalWeeks = estimatedSprints * effectiveCadenceWeeks;

  const handleStartPlanning = async () => {
    setIsProcessing(true);
    
    setLoadingStepText("1/4: Analyzing NLP sentences & predicting story points...");
    await new Promise(r => setTimeout(r, 600));
    setLoadingStepText("2/4: Auto-decomposing Critical & High stories into atomic units...");
    await new Promise(r => setTimeout(r, 700));
    setLoadingStepText("3/4: Solving Integer Linear Programming (ILP) Knapsack Optimization...");
    await new Promise(r => setTimeout(r, 800));
    setLoadingStepText("4/4: Constructing CPM Critical Path & Multi-Calendar Gantt schedule...");
    await new Promise(r => setTimeout(r, 600));

    const targetSprintCount = effectiveStrategy === 'fixed_sprints' ? q7FixedSprintCount : estimatedSprints;
    try {
      localStorage.setItem('target_sprint_count', String(targetSprintCount));
      localStorage.setItem('total_sprints_count', String(targetSprintCount));
    } catch (_) {}

    const payload = {
      organization_type: q1Mode === 'custom' ? q1CustomOrgName : q1OrgType,
      start_date: q2StartDate,
      sprint_duration_weeks: effectiveCadenceWeeks,
      buffer_percentage: effectiveBuffer,
      working_days_per_week: q6WorkingDays.length,
      selected_holiday_calendars: q6SelectedCalendars,
      custom_holidays: q6CustomHolidays,
      planning_strategy: effectiveStrategy,
      target_sprint_count: effectiveStrategy === 'fixed_sprints' ? q7FixedSprintCount : null,
      auto_decompose: q7AutoDecompose,
      enforce_dependencies: q7EnforceDependencies,
      balance_developers: q7BalanceDevs
    };

    try {
      await onGeneratePlan(payload);
    } finally {
      setIsProcessing(false);
    }
  };

  const stepsMeta = [
    { num: 1, label: "Organization Type", icon: Building2 },
    { num: 2, label: "Kick-off Date", icon: Calendar },
    { num: 3, label: "Sprint Cadence", icon: Clock },
    { num: 4, label: "Risk Buffer", icon: Shield },
    { num: 5, label: "Calendar & Holidays", icon: Palmtree },
    { num: 6, label: "Partition Strategy", icon: Target },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 p-6 border-b border-slate-700/80 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
                <RocketIcon size={24} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider">
                    Timeline & Cadence Setup Wizard
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    Batch: <span className="text-white font-black">{batchTitle || "Selected Requirements"}</span> ({requirementsCount} Requirements)
                  </span>
                </div>
                <h2 className="text-xl font-black text-white tracking-tight mt-0.5">
                  Automated Sprint Timeline & Cadence Questionnaire
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={onClose}
                disabled={isProcessing}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* STEPPER TABS (7 QUESTIONS) */}
          <div className="grid grid-cols-7 gap-1.5 mt-6 pt-4 border-t border-slate-800/80">
            {stepsMeta.map((s) => {
              const Icon = s.icon;
              const isActive = activeStep === s.num;
              const isPast = activeStep > s.num;
              return (
                <button
                  key={s.num}
                  onClick={() => !isProcessing && setActiveStep(s.num)}
                  disabled={isProcessing}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all text-center ${
                    isActive 
                      ? 'bg-indigo-600/30 border border-indigo-500 text-indigo-300 shadow-md ring-2 ring-indigo-500/20' 
                      : isPast 
                      ? 'bg-slate-800/60 border border-slate-700/60 text-slate-300 hover:border-slate-600'
                      : 'bg-slate-800/20 border border-slate-800 text-slate-500 hover:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Icon size={13} className={isActive ? 'text-indigo-400' : isPast ? 'text-green-400' : 'text-slate-500'} />
                    <span className="text-[10px] font-black">{`Q${s.num}`}</span>
                  </div>
                  <span className="text-[9px] font-bold truncate max-w-full hidden lg:inline">
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* MODAL BODY (QUESTION VIEWS) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* ========================================================================= */}
          {/* QUESTION 1: ORGANIZATION TYPE & INDUSTRY DOMAIN */}
          {/* ========================================================================= */}
          {activeStep === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <Building2 size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Question 1 of 6</span>
                    <h3 className="text-lg font-black text-white">What type of Organization is executing this Project?</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Determines which specific holiday categories (Mercantile, Bank, Public, Poya, or International) apply to your team.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setQ1Mode('preset')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${q1Mode === 'preset' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    ✨ Suggested
                  </button>
                  <button
                    onClick={() => setQ1Mode('custom')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${q1Mode === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Edit3 size={12} />
                    <span>Type Custom</span>
                  </button>
                </div>
              </div>

              {q1Mode === 'preset' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { 
                      key: 'private_tech', 
                      icon: Building,
                      label: "🏢 Private Tech / Software Company (IT / Mercantile)", 
                      desc: "Sri Lanka IT Sector (Mercantile Holidays + Full Moon Poya Days auto-skipped). Bank/Public days are active workdays.",
                      recommended: true
                    },
                    { 
                      key: 'international_offshore', 
                      icon: Globe,
                      label: "🌐 Multinational / International Offshore Center", 
                      desc: "Global delivery teams observing both Sri Lanka Mercantile/Poya AND International/US/UK Client Tech Holidays.",
                      highlight: true
                    },
                    { 
                      key: 'banking', 
                      icon: Landmark,
                      label: "🏦 Banking & Financial Services (BFSI / Fintech)", 
                      desc: "Strict compliance with all Bank Holidays, Public Holidays, Poya Days, and Mercantile closures."
                    },
                    { 
                      key: 'government', 
                      icon: Building2,
                      label: "🏛️ Public Sector & Government Agency", 
                      desc: "Full statutory calendar observing all Public, Bank, Mercantile and Poya holidays."
                    },
                    { 
                      key: 'startup', 
                      icon: RocketIcon,
                      label: "🚀 Agile Startup / High-Velocity R&D", 
                      desc: "Minimal holiday footprint (Full Moon Poya Days only) for rapid product development."
                    }
                  ].map((item) => {
                    const ItemIcon = item.icon;
                    const isSelected = q1OrgType === item.key;
                    return (
                      <div 
                        key={item.key}
                        onClick={() => handleOrgTypeSelect(item.key)}
                        className={`p-4 rounded-2xl cursor-pointer border-2 transition-all relative ${
                          isSelected
                            ? 'bg-indigo-600/15 border-indigo-500 shadow-xl ring-4 ring-indigo-500/10'
                            : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/70'
                        }`}
                      >
                        {item.recommended && (
                          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase flex items-center gap-1">
                            <Sparkles size={10} /> Suggested
                          </span>
                        )}
                        {item.highlight && (
                          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-black uppercase flex items-center gap-1">
                            <Globe size={10} /> Dual Calendar
                          </span>
                        )}
                        <div className="flex items-center gap-2.5 font-black text-white text-sm">
                          <ItemIcon size={18} className={isSelected ? 'text-indigo-400' : 'text-slate-400'} />
                          <span>{item.label}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* TYPE CUSTOM ORGANIZATION */
                <div className="bg-slate-800/50 border border-slate-700/70 p-5 rounded-2xl space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ✏️ Type Custom Organization Name & Industry Category:
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Acme Global Healthtech Corp (Offshore European Team)"
                      value={q1CustomOrgName}
                      onChange={(e) => setQ1CustomOrgName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <p className="text-xs text-slate-400">
                    You can customize and multi-select exact holiday layers (Poya, Mercantile, Public, Bank, and International) in Question 6.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* QUESTION 2: KICKOFF DATE */}
          {/* ========================================================================= */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Question 2 of 6</span>
                    <h3 className="text-lg font-black text-white">When is the official Project Kick-off / Sprint 1 Start Date?</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select from suggested presets or type your own custom launch date.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setQ2CustomMode(false)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${!q2CustomMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    ✨ Suggested
                  </button>
                  <button
                    onClick={() => setQ2CustomMode(true)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${q2CustomMode ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Edit3 size={12} />
                    <span>Type Custom</span>
                  </button>
                </div>
              </div>

              {!q2CustomMode ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { date: getDefaultStartDate(), label: "⚡ Next Monday", desc: "Standard sprint kick-off day for engineering teams", recommended: true },
                    { date: getTodayDate(), label: "📍 Today", desc: "Start counting working days immediately from today" },
                    { date: getFirstOfNextMonth(), label: "🌟 1st of Next Month", desc: "Align sprint cycles with monthly accounting milestones" }
                  ].map((preset) => (
                    <div
                      key={preset.label}
                      onClick={() => setQ2StartDate(preset.date)}
                      className={`p-4 rounded-2xl cursor-pointer border-2 transition-all relative ${
                        q2StartDate === preset.date
                          ? 'bg-indigo-600/15 border-indigo-500 shadow-xl ring-4 ring-indigo-500/10'
                          : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/70'
                      }`}
                    >
                      {preset.recommended && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase flex items-center gap-1">
                          <Sparkles size={10} /> Suggested
                        </span>
                      )}
                      <h4 className="text-sm font-black text-white">{preset.label}</h4>
                      <p className="text-xs text-indigo-300 font-bold mt-1">{preset.date}</p>
                      <p className="text-xs text-slate-400 mt-1">{preset.desc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/50 border border-slate-700/70 p-5 rounded-2xl space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ✏️ Type or Pick Custom Start Date (YYYY-MM-DD):
                    </label>
                    <input 
                      type="date"
                      value={q2StartDate}
                      onChange={(e) => setQ2StartDate(e.target.value)}
                      className="w-full sm:w-80 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div className="text-xs text-indigo-300/90 font-bold bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/40">
                    📅 Selected Start Date: <span className="text-white font-extrabold">{formatDisplayDate(q2StartDate)}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* QUESTION 3: SPRINT CADENCE / DURATION */}
          {/* ========================================================================= */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <Clock size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Question 3 of 6</span>
                    <h3 className="text-lg font-black text-white">What is your team's standard Sprint Cadence (Duration)?</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Choose a suggested Agile cadence or type custom weeks/days.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setQ3Mode('preset')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${q3Mode === 'preset' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    ✨ Suggested
                  </button>
                  <button
                    onClick={() => setQ3Mode('custom')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${q3Mode === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Edit3 size={12} />
                    <span>Type Custom</span>
                  </button>
                </div>
              </div>

              {q3Mode === 'preset' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { weeks: 1, days: 5, label: "1 Week Cadence", desc: "Fast-paced startups, rapid iterations & continuous delivery cycles." },
                    { weeks: 2, days: 10, label: "2 Weeks Cadence (Recommended)", desc: "Standard Agile Scrum default. Optimal balance of velocity and review time.", recommended: true },
                    { weeks: 3, days: 15, label: "3 Weeks Cadence", desc: "Mid-scale enterprise teams with complex QA testing & staging gates." },
                    { weeks: 4, days: 20, label: "4 Weeks (Monthly Cadence)", desc: "Large legacy platforms, milestone releases & heavy compliance overhead." }
                  ].map((item) => (
                    <div 
                      key={item.weeks}
                      onClick={() => setQ3SelectedPreset(item.weeks)}
                      className={`p-4 rounded-2xl cursor-pointer border-2 transition-all relative ${
                        q3SelectedPreset === item.weeks
                          ? 'bg-indigo-600/15 border-indigo-500 shadow-xl ring-4 ring-indigo-500/10'
                          : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/70'
                      }`}
                    >
                      {item.recommended && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                          <Sparkles size={10} /> Suggested
                        </span>
                      )}
                      <div className="flex items-center gap-2 font-black text-white text-sm">
                        <Clock size={16} className={q3SelectedPreset === item.weeks ? 'text-indigo-400' : 'text-slate-400'} />
                        <span>{item.label}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{item.desc}</p>
                      <div className="mt-3 text-[11px] font-bold text-indigo-300/80 bg-indigo-950/40 px-2.5 py-1 rounded-lg inline-block border border-indigo-800/30">
                        ⏱️ {item.days} Working Days ({item.weeks * 40} Dev Hours)
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/50 border border-slate-700/70 p-5 rounded-2xl space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        ✏️ Type Custom Sprint Duration (in Weeks):
                      </label>
                      <input 
                        type="number" 
                        min={1} 
                        max={12} 
                        step={1}
                        value={q3CustomWeeks}
                        onChange={(e) => setQ3CustomWeeks(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Equivalent Working Days per Sprint:
                      </label>
                      <div className="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-3 text-sm font-black text-indigo-300">
                        {q3CustomWeeks * 5} Working Days ({q3CustomWeeks * 40} Developer Hours)
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* QUESTION 4: RISK BUFFER */}
          {/* ========================================================================= */}
          {activeStep === 4 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <Shield size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Question 4 of 6</span>
                    <h3 className="text-lg font-black text-white">How much Risk & Contingency Buffer (%) should be reserved?</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Protects against unexpected bug fixes, code reviews, and API dependencies.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setQ5Mode('preset')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${q5Mode === 'preset' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    ✨ Suggested
                  </button>
                  <button
                    onClick={() => setQ5Mode('custom')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${q5Mode === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Edit3 size={12} />
                    <span>Type Custom</span>
                  </button>
                </div>
              </div>

              {q5Mode === 'preset' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { pct: 0, label: "0% (Zero Buffer)", desc: "Strict 100% capacity utilization. No room for scope creep or blockers." },
                    { pct: 10, label: "10% (Agile Standard)", desc: "Recommended industry safety margin for QA testing and peer review.", recommended: true },
                    { pct: 20, label: "20% (High-Risk Domain)", desc: "Ideal for complex external integrations, third-party APIs, or new tech stacks." },
                    { pct: 30, label: "30% (Mission-Critical Buffer)", desc: "Maximum buffer for regulatory compliance, security audits & high volatility." }
                  ].map((item) => (
                    <div 
                      key={item.pct}
                      onClick={() => {
                        setQ5SelectedPreset(item.pct);
                        setQ5BufferPct(item.pct);
                      }}
                      className={`p-4 rounded-2xl cursor-pointer border-2 transition-all relative ${
                        q5SelectedPreset === item.pct
                          ? 'bg-indigo-600/15 border-indigo-500 shadow-xl ring-4 ring-indigo-500/10'
                          : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/70'
                      }`}
                    >
                      {item.recommended && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase">
                          Suggested
                        </span>
                      )}
                      <h4 className="text-sm font-black text-white">{item.label}</h4>
                      <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-800/50 border border-slate-700/70 p-5 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        ✏️ Type Custom Contingency Buffer Percentage (%):
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="number"
                          min={0}
                          max={50}
                          step={1}
                          value={q5BufferPct}
                          onChange={(e) => setQ5BufferPct(Number(e.target.value))}
                          className="w-36 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-lg font-black text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <span className="text-lg font-black text-slate-400">%</span>
                      </div>
                    </div>
                    <div className="flex-1 sm:max-w-xs space-y-2">
                      <div className="flex justify-between text-xs text-slate-400 font-bold">
                        <span>Slider Adjustment:</span>
                        <span className="text-indigo-400 font-black">{q5BufferPct}%</span>
                      </div>
                      <input 
                        type="range" 
                        min={0} 
                        max={50} 
                        step={1}
                        value={q5BufferPct}
                        onChange={(e) => setQ5BufferPct(Number(e.target.value))}
                        className="w-full accent-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* QUESTION 5: HOLIDAY CALENDARS & LEAVE POLICY (MULTI-SELECT) */}
          {/* ========================================================================= */}
          {activeStep === 5 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <Palmtree size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Question 5 of 6</span>
                    <h3 className="text-lg font-black text-white">Which Holiday Calendars & Working Days should be active?</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Multi-select applicable Sri Lankan categories (Poya, Mercantile, Public, Bank) and International Tech calendars.
                    </p>
                  </div>
                </div>
              </div>

              {/* MULTI-SELECT HOLIDAY CATEGORIES */}
              <div className="bg-slate-800/50 border border-slate-700/70 p-5 rounded-2xl space-y-3">
                <label className="block text-xs font-black text-slate-200 uppercase tracking-wider flex items-center justify-between">
                  <span>☑️ Multi-Select Active Holiday Calendars (Auto-skipped in Gantt Timeline):</span>
                  <span className="text-indigo-400 font-bold">{q6SelectedCalendars.length} Calendars Active</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {[
                    {
                      key: 'sri_lanka_poya',
                      title: "🌕 Sri Lanka: Full Moon Poya Days",
                      desc: "Auto-skips all monthly Poya holidays (Vap, Il, Unduvap, Duruthu, Vesak, etc.)",
                      badge: "Standard SL"
                    },
                    {
                      key: 'sri_lanka_mercantile',
                      title: "🛍️ Sri Lanka: Mercantile Holidays",
                      desc: "Private/IT Sector holidays (Sinhala/Tamil New Year, Christmas, May Day, Thai Pongal)",
                      badge: "IT Sector"
                    },
                    {
                      key: 'international_global',
                      title: "🌐 International / Global Tech Calendar",
                      desc: "International tech client holidays (Thanksgiving, Christmas, New Year, Black Friday, Boxing Day)",
                      badge: "International"
                    },
                    {
                      key: 'sri_lanka_public',
                      title: "🏛️ Sri Lanka: Public Holidays",
                      desc: "Cultural & national festivals (Deepavali, Good Friday, Ramazan, Hadji, Mahasivarathri)",
                      badge: "Public Sector"
                    },
                    {
                      key: 'sri_lanka_bank',
                      title: "🏦 Sri Lanka: Bank Holidays",
                      desc: "Special financial and banking clearance closure days (Mid-year & Year-end closure)",
                      badge: "Banking"
                    }
                  ].map((cal) => {
                    const isChecked = q6SelectedCalendars.includes(cal.key);
                    return (
                      <div
                        key={cal.key}
                        onClick={() => toggleHolidayCalendar(cal.key)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                          isChecked 
                            ? 'bg-indigo-600/15 border-indigo-500 shadow-md ring-2 ring-indigo-500/10' 
                            : 'bg-slate-900/50 border-slate-700/60 hover:border-slate-600'
                        }`}
                      >
                        <div className="mt-0.5 text-indigo-400">
                          {isChecked ? <CheckSquare size={18} className="text-indigo-400" /> : <Square size={18} className="text-slate-500" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-white">{cal.title}</h4>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-[9px] font-extrabold text-slate-400 uppercase">
                              {cal.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{cal.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MULTI-SELECT WORKING DAYS & CUSTOM HOLIDAYS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Working Days */}
                <div className="bg-slate-800/50 border border-slate-700/70 p-4 rounded-2xl space-y-2.5">
                  <label className="block text-xs font-black text-slate-200 uppercase tracking-wider">
                    ☑️ Active Working Days:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                      const isChecked = q6WorkingDays.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleWorkingDay(day)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                            isChecked
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                              : 'bg-slate-900/60 text-slate-400 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          {isChecked ? <CheckSquare size={13} /> : <Square size={13} />}
                          <span>{day}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-indigo-300 font-semibold">
                    {q6WorkingDays.length} Work Days / week ({q6WorkingDays.join(', ')})
                  </p>
                </div>

                {/* Add Custom Holidays */}
                <div className="bg-slate-800/50 border border-slate-700/70 p-4 rounded-2xl space-y-2.5">
                  <label className="block text-xs font-black text-slate-200 uppercase tracking-wider">
                    ✏️ Add Custom Company Off-Day:
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date"
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white outline-none w-36"
                    />
                    <input 
                      type="text"
                      placeholder="Holiday Name (e.g. Hackathon)"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white outline-none flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddHoliday}
                      disabled={!newHolidayDate || !newHolidayName}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-black flex items-center gap-1"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {q6CustomHolidays.length > 0 && (
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {q6CustomHolidays.map((h, i) => (
                        <div key={i} className="flex items-center justify-between px-2.5 py-1 bg-slate-900/80 rounded-lg text-xs border border-slate-700/70">
                          <span className="font-bold text-slate-300">{h.date} — {h.name}</span>
                          <button onClick={() => handleRemoveHoliday(i)} className="text-rose-400 hover:text-rose-300 p-0.5">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* QUESTION 6: SPRINT PARTITIONING STRATEGY & RULES */}
          {/* ========================================================================= */}
          {activeStep === 6 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                    <Target size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Question 6 of 6</span>
                    <h3 className="text-lg font-black text-white">How should AI ILP partition User Stories across Sprints?</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select optimization strategy or toggle multi-criteria constraint rules.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setQ7Mode('preset')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${q7Mode === 'preset' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    ✨ Suggested
                  </button>
                  <button
                    onClick={() => setQ7Mode('custom')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${q7Mode === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Edit3 size={12} />
                    <span>Multi-Criteria & Flags</span>
                  </button>
                </div>
              </div>

              {q7Mode === 'preset' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { 
                      key: 'ilp_optimal', 
                      label: "🧠 AI ILP Optimal Fit", 
                      desc: "Auto-calculate minimum sprints to minimize delivery time and maximize overall project value flow.",
                      recommended: true 
                    },
                    { 
                      key: 'critical_first', 
                      label: "🚀 Critical-First (MVP)", 
                      desc: "Frontload all CRITICAL & HIGH stories in Sprint 1 & 2 for rapid Minimum Viable Product launch." 
                    },
                    { 
                      key: 'fixed_sprints', 
                      label: "🎯 Fixed Sprint Target", 
                      desc: "Fit all requirements strictly into a specified number of fixed sprint deadlines." 
                    }
                  ].map((item) => (
                    <div 
                      key={item.key}
                      onClick={() => setQ7SelectedPreset(item.key)}
                      className={`p-4 rounded-2xl cursor-pointer border-2 transition-all relative ${
                        q7SelectedPreset === item.key
                          ? 'bg-indigo-600/15 border-indigo-500 shadow-xl ring-4 ring-indigo-500/10'
                          : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/70'
                      }`}
                    >
                      {item.recommended && (
                        <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[9px] font-black uppercase">
                          Suggested
                        </span>
                      )}
                      <h4 className="text-sm font-black text-white">{item.label}</h4>
                      <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-slate-800/50 border border-slate-700/70 p-4 rounded-2xl space-y-3">
                    <label className="block text-xs font-black text-slate-200 uppercase tracking-wider">
                      ☑️ Multi-Select AI Optimization Rules & Constraints:
                    </label>
                    <div className="space-y-2">
                      {[
                        { 
                          val: q7AutoDecompose, 
                          set: setQ7AutoDecompose, 
                          title: "Auto-decompose Critical & High Stories", 
                          desc: "Automatically decompose high-complexity stories into atomic tasks with Gherkin BDD criteria." 
                        },
                        { 
                          val: q7EnforceDependencies, 
                          set: setQ7EnforceDependencies, 
                          title: "Strict DAG Dependency Ordering Constraint", 
                          desc: "Guarantees prerequisite stories are completed before dependent downstream stories begin." 
                        },
                        { 
                          val: q7BalanceDevs, 
                          set: setQ7BalanceDevs, 
                          title: "Cross-Functional Developer Load Balancing", 
                          desc: "Evenly distributes stories to Frontend, Backend, and Fullstack developers without burnout." 
                        }
                      ].map((item, i) => (
                        <div 
                          key={i}
                          onClick={() => item.set(!item.val)}
                          className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                            item.val ? 'bg-indigo-950/40 border-indigo-500/50 text-white' : 'bg-slate-900/40 border-slate-700/60 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {item.val ? <CheckSquare size={16} className="text-indigo-400" /> : <Square size={16} className="text-slate-500" />}
                            <div>
                              <h5 className="text-xs font-bold text-white">{item.title}</h5>
                              <p className="text-[11px] text-slate-400">{item.desc}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {q7SelectedPreset === 'fixed_sprints' && (
                <div className="bg-slate-800/50 border border-slate-700/70 p-4 rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Specify Fixed Target Sprints:</h4>
                    <p className="text-[11px] text-slate-400">All stories will be mathematically packed across this exact number of sprints</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {[2, 3, 4, 5, 6].map(num => (
                      <button
                        key={num}
                        onClick={() => setQ7FixedSprintCount(num)}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${
                          q7FixedSprintCount === num 
                            ? 'bg-indigo-600 text-white shadow-lg' 
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {num} Sprints
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}



          {/* LOADING STEP STATUS */}
          {isProcessing && (
            <div className="p-4 bg-indigo-950/60 border border-indigo-500/40 rounded-2xl flex items-center gap-3 text-indigo-200 text-xs font-bold animate-pulse">
              <div className="w-5 h-5 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></div>
              <span>{loadingStepText}</span>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="bg-slate-900 border-t border-slate-700/80 p-5 flex items-center justify-between gap-4">
          <button
            onClick={() => setActiveStep(prev => Math.max(1, prev - 1))}
            disabled={activeStep === 1 || isProcessing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={16} />
            <span>Previous Question</span>
          </button>

          <div className="flex items-center gap-3">
            {activeStep < 6 ? (
              <button
                onClick={() => setActiveStep(prev => Math.min(6, prev + 1))}
                disabled={isProcessing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30"
              >
                <span>Next Question</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleStartPlanning}
                disabled={isProcessing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-xs transition-all shadow-xl shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Generating Sprint Plan & Gantt Chart...</span>
                  </>
                ) : (
                  <>
                    <Zap size={16} className="text-amber-300" />
                    <span>🚀 Generate Sprint Plan & Gantt Chart</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
