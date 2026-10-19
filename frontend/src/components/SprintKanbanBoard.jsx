import React, { useState, useMemo, useEffect } from "react";
import { 
  Kanban, AlertTriangle, ShieldAlert, CheckCircle2, 
  ArrowRight, ArrowLeft, MoveRight, Sparkles, Clock, 
  Layers, Users, Check, X, AlertCircle, RefreshCw,
  GitBranch, Sliders, ChevronRight, Eye, Play, CheckSquare,
  Zap, BarChart2, FileCheck, ArrowUpRight, Info, Scissors, Flame,
  ChevronDown
} from "lucide-react";
import { cleanStoryTitle } from "../utils/storyUtils";

export default function SprintKanbanBoard({ 
  tasks = [], 
  capacities = [],
  sprints = [],
  totalSprints,
  onCardMoved,
  onRefresh,
  onDecomposeClick
}) {
  const [selectedSprint, setSelectedSprint] = useState("all"); // Default to "all" or "1"
  const [draggedStoryId, setDraggedStoryId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [activeValidationWarning, setActiveValidationWarning] = useState(null);
  const [showAutoSyncInfo, setShowAutoSyncInfo] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedSubtaskCards, setExpandedSubtaskCards] = useState({});

  // Dynamically & automatically determine exact available sprint numbers
  const detectedSprintNumbers = useMemo(() => {
    // 1. Find all sprint numbers that actually contain stories in tasks array
    const taskSprintNums = new Set(
      (tasks || [])
        .map(t => parseInt(t.sprint_number || t.sprint || 0))
        .filter(n => n > 0)
    );

    // 2. Find sprint numbers with stories or points in sprints prop
    const sprintsWithStories = new Set();
    if (Array.isArray(sprints)) {
      sprints.forEach(s => {
        const sNum = parseInt(s.sprint_number || s.id || s.number || 0);
        if (sNum > 0 && ((s.stories && s.stories.length > 0) || s.total_points > 0)) {
          sprintsWithStories.add(sNum);
        }
      });
    }

    // 3. Check if user configured a specific target sprint count (e.g. 2 sprints in Wizard / customizer)
    let userSelectedCount = 0;
    try {
      const email = localStorage.getItem('user_email') || 'default';
      const stored = parseInt(
        localStorage.getItem('target_sprint_count') || 
        localStorage.getItem('total_sprints_count') || 
        localStorage.getItem(`planned_sprints_${email}`) || 
        '0',
        10
      );
      if (stored > 0) userSelectedCount = stored;
    } catch (_) {}

    const maxTaskSprint = taskSprintNums.size > 0 ? Math.max(...Array.from(taskSprintNums)) : 0;
    const maxStorySprint = sprintsWithStories.size > 0 ? Math.max(...Array.from(sprintsWithStories)) : 0;
    const effectiveStoriesMax = Math.max(maxTaskSprint, maxStorySprint);

    let finalCount = 0;
    if (userSelectedCount > 0) {
      // Honor user's explicit selection, but extend if tasks actually spill past it
      finalCount = Math.max(userSelectedCount, effectiveStoriesMax);
    } else if (effectiveStoriesMax > 0) {
      finalCount = effectiveStoriesMax;
    } else if (totalSprints && Number(totalSprints) > 0) {
      finalCount = Number(totalSprints);
    } else if (Array.isArray(capacities) && capacities.length > 0) {
      finalCount = capacities.length;
    } else if (Array.isArray(sprints) && sprints.length > 0) {
      finalCount = sprints.length;
    } else {
      finalCount = 2; // Default to 2
    }

    const result = [];
    for (let i = 1; i <= Math.max(1, finalCount); i++) {
      result.push(i);
    }
    return result;
  }, [sprints, tasks, capacities, totalSprints]);

  // If currently selected sprint is no longer in detected sprints, adjust safely
  useEffect(() => {
    if (selectedSprint !== "all" && detectedSprintNumbers.length > 0) {
      const currentNum = parseInt(selectedSprint);
      if (!detectedSprintNumbers.includes(currentNum)) {
        setSelectedSprint(String(detectedSprintNumbers[0]));
      }
    }
  }, [detectedSprintNumbers, selectedSprint]);

  const toggleCardSubtasks = (storyId) => {
    setExpandedSubtaskCards(prev => ({
      ...prev,
      [storyId]: prev[storyId] === false ? true : false
    }));
  };

  const handleToggleSubtask = async (storyId, subtaskId, newStatus) => {
    setIsUpdating(true);
    // Optimistic UI update
    const story = tasks.find(t => (t.story_id === storyId || t.id === storyId));
    if (story && story.sub_tasks && onCardMoved) {
      const updatedSubs = story.sub_tasks.map(s => (s.id === subtaskId ? { ...s, status: newStatus } : s));
      const allDone = updatedSubs.length > 0 && updatedSubs.every(s => s.status === 'Done');
      const anyInProg = updatedSubs.some(s => s.status === 'In Progress' || s.status === 'Done');
      let nextParentStatus = story.status;
      if (allDone) {
        nextParentStatus = 'Done';
      } else if (anyInProg && story.status === 'To Do') {
        nextParentStatus = 'In Progress';
      } else if (!anyInProg && story.status === 'Done') {
        nextParentStatus = 'In Progress';
      }
      const updatedStory = { ...story, sub_tasks: updatedSubs, status: nextParentStatus };
      const updatedTasks = tasks.map(t => (t.story_id === storyId || t.id === storyId) ? updatedStory : t);
      onCardMoved({ tasks: updatedTasks, story: updatedStory });
    }

    try {
      const res = await fetch("http://localhost:8082/api/stories/update-subtask-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_id: storyId,
          subtask_id: subtaskId,
          status: newStatus
        })
      });
      const data = await res.json();
      if (data.status === "success" && onCardMoved) {
        onCardMoved(data);
      }
    } catch (err) {
      console.error("Failed to update subtask status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const COLUMNS = [
    { 
      id: "To Do", 
      title: "To Do", 
      icon: "📝", 
      color: "border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60", 
      badge: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700" 
    },
    { 
      id: "In Progress", 
      title: "In Progress", 
      icon: "⚡", 
      color: "border-sky-300 dark:border-sky-500/40 bg-sky-50/70 dark:bg-sky-950/20", 
      badge: "bg-sky-100 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-500/40" 
    },
    { 
      id: "QA Review", 
      title: "QA Review", 
      icon: "🔍", 
      color: "border-amber-300 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/20", 
      badge: "bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-500/40" 
    },
    { 
      id: "Done", 
      title: "Done", 
      icon: "✅", 
      color: "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/20", 
      badge: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40" 
    }
  ];

  // Filter tasks by selected sprint
  const filteredTasks = tasks.filter(task => {
    if (selectedSprint === "all") return true;
    return String(task.sprint_number || 1) === String(selectedSprint);
  });

  // Calculate sprint completion stats
  const sprintTasks = selectedSprint === "all"
    ? tasks
    : tasks.filter(t => String(t.sprint_number || 1) === String(selectedSprint));
  const totalPoints = sprintTasks.reduce((acc, t) => acc + (t.story_points || t.points || 0), 0);
  const donePoints = sprintTasks.filter(t => t.status === "Done").reduce((acc, t) => acc + (t.story_points || t.points || 0), 0);
  const inProgressPoints = sprintTasks.filter(t => t.status === "In Progress" || t.status === "QA Review").reduce((acc, t) => acc + (t.story_points || t.points || 0), 0);
  const progressPct = totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0;
  const currentSprintCap = selectedSprint === "all"
    ? (Array.isArray(capacities) && capacities.length > 0 ? capacities.reduce((a, b) => a + b, 0) : (totalPoints || 90))
    : (capacities[(parseInt(selectedSprint) || 1) - 1] || 30);

  // Helper to check if a specific prerequisite dependency task is completed
  const isPrereqDone = (depId) => {
    const dTask = tasks.find(t => (t.story_id === depId || t.id === depId));
    if (!dTask) return false;
    if (dTask.status !== "Done") return false;
    if (dTask.sub_tasks && dTask.sub_tasks.length > 0) {
      return dTask.sub_tasks.every(s => s.status === "Done");
    }
    return true;
  };

  // Helper to get unmet dependencies for any task
  const getUnmetDeps = (task) => {
    const deps = task.dependencies || [];
    return deps.filter(depId => !isPrereqDone(depId));
  };

  // Helper to get all dependent stories that require this story as a prerequisite
  const getDependentStories = (storyId) => {
    return (tasks || []).filter(t => (t.dependencies || []).includes(storyId));
  };

  // Helper to get active (unfinished) dependent stories waiting on this story
  const getActiveDependentStories = (storyId) => {
    return (tasks || []).filter(t => t.status !== "Done" && (t.dependencies || []).includes(storyId));
  };

  // Unblocked & Blocked Stories calculation
  const unblockedStories = filteredTasks.filter(t => {
    if (t.status === "Done") return false;
    const deps = t.dependencies || [];
    return deps.length > 0 && deps.every(dId => isPrereqDone(dId));
  });

  const blockedStories = filteredTasks.filter(t => {
    if (t.status === "Done") return false;
    const deps = t.dependencies || [];
    return deps.length > 0 && deps.some(dId => !isPrereqDone(dId));
  });

  // Active Blocker Stories (must be finished first to unblock others)
  const activeBlockerStories = filteredTasks.filter(t => {
    if (t.status === "Done") return false;
    const sid = t.story_id || t.id;
    return getActiveDependentStories(sid).length > 0;
  });

  // Drag & Drop Handlers
  const handleDragStart = (e, storyId) => {
    setDraggedStoryId(storyId);
    e.dataTransfer.setData("text/plain", storyId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const storyId = e.dataTransfer.getData("text/plain") || draggedStoryId;
    if (!storyId) return;

    const story = tasks.find(t => (t.story_id === storyId || t.id === storyId));
    if (!story) return;

    if (story.status === targetStatus) return;

    executeMoveCard(storyId, targetStatus, story.sprint_number);
  };

  // Move Card API caller with Live DAG Validation & Instant Optimistic UI
  const executeMoveCard = async (storyId, newStatus, sprintNum) => {
    setIsUpdating(true);
    // Optimistic UI update immediately for zero-latency card movement
    const story = tasks.find(t => (t.story_id === storyId || t.id === storyId));
    if (story) {
      const unmet = getUnmetDeps(story);
      if (unmet.length > 0 && (newStatus === "In Progress" || newStatus === "Done")) {
        setActiveValidationWarning({
          type: "DAG_DEPENDENCY_BLOCKER",
          severity: newStatus === "Done" ? "CRITICAL" : "WARNING",
          title: "Dependency Blocking Story Must Be Finished First",
          message: `Story ${storyId} is blocked by prerequisite story (${unmet.join(", ")}). In Scrum, dependency blocking stories must be finished first (Done) before dependent work can proceed.`
        });
      }
      if (onCardMoved) {
        const updatedStory = { ...story, status: newStatus, sprint_number: sprintNum || story.sprint_number };
        const updatedTasks = tasks.map(t => (t.story_id === storyId || t.id === storyId) ? updatedStory : t);
        onCardMoved({ tasks: updatedTasks, story: updatedStory });
      }
    }

    try {
      const res = await fetch("http://localhost:8082/api/kanban/move-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_id: storyId,
          new_status: newStatus,
          sprint_number: sprintNum
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        if (data.has_warnings && data.warnings.length > 0) {
          setActiveValidationWarning(data.warnings[0]);
        }
        if (onCardMoved) {
          onCardMoved(data);
        }
      }
    } catch (err) {
      console.error("Failed to move card:", err);
    } finally {
      setIsUpdating(false);
      setDraggedStoryId(null);
    }
  };

  const handleQuickMove = (storyId, direction) => {
    const story = tasks.find(t => (t.story_id === storyId || t.id === storyId));
    if (!story) return;
    const currentStatus = story.status || "To Do";
    const statusIdx = COLUMNS.findIndex(c => c.id === currentStatus);
    const newIdx = direction === "next" ? statusIdx + 1 : statusIdx - 1;
    if (newIdx >= 0 && newIdx < COLUMNS.length) {
      executeMoveCard(storyId, COLUMNS[newIdx].id, story.sprint_number);
    }
  };

  const handleSprintChange = (storyId, newSprint) => {
    const story = tasks.find(t => (t.story_id === storyId || t.id === storyId));
    if (!story) return;
    executeMoveCard(storyId, story.status || "To Do", parseInt(newSprint));
  };

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 animate-in fade-in duration-300 transition-colors">
      
      {/* Top Banner: Board Overview & Sprint Controls */}
      <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <Kanban size={15} />
              <span>Auto-Generated Sprint Kanban & Real-Time Sync</span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
              Interactive Sprint Kanban Board
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-300 font-mono font-bold">
                ⚡ Auto-Created from Requirements
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automatically populated by AI ILP Optimizer. Moving stories to <strong>Done</strong> unlocks dependent DAG stories, updates Gantt timeline progress, and credits team velocity.
            </p>
          </div>

          {/* Action & Sprint Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAutoSyncInfo(!showAutoSyncInfo)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
            >
              <Info size={13} />
              <span>What happens on "Done"?</span>
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600 border border-indigo-500/40 text-indigo-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Sync Kanban Board with latest requirements"
              >
                <RefreshCw size={13} />
                <span>Auto-Sync</span>
              </button>
            )}

            {/* Sprint Filter Selector (Dynamic: Sprint 1, 2, 3, 4, 5, etc.) */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-700/80 shadow-inner">
              <button
                onClick={() => setSelectedSprint("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedSprint === "all" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                }`}
              >
                All
              </button>
              {detectedSprintNumbers.map((sNum) => (
                <button
                  key={sNum}
                  onClick={() => setSelectedSprint(String(sNum))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedSprint === String(sNum) ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sprint {sNum}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Automatic Synchronizations Guide (Visible when toggled) */}
        {showAutoSyncInfo && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/90 border border-indigo-500/40 text-xs space-y-2.5 animate-in fade-in duration-200">
            <h4 className="font-bold text-white flex items-center gap-2 text-xs">
              <Zap size={14} className="text-yellow-400" />
              Automatic System Changes When a Story Reaches "Done":
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-emerald-400 block flex items-center gap-1.5">
                  <GitBranch size={13} /> 1. Live DAG Dependency Unblocking
                </span>
                <p className="text-[11px] text-slate-300">
                  Any child stories that were blocked (e.g. 2FA Auth blocked by Login Security) are automatically <strong>Unblocked</strong> and safe to start.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-sky-400 block flex items-center gap-1.5">
                  <Clock size={13} /> 2. Gantt Roadmap & Timeline Sync
                </span>
                <p className="text-[11px] text-slate-300">
                  The Gantt Timeline bar for that task flips to <strong>100% Completed</strong> and advances overall project milestone completion.
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="font-bold text-amber-400 block flex items-center gap-1.5">
                  <FileCheck size={13} /> 3. Jira & Azure DevOps CSV Update
                </span>
                <p className="text-[11px] text-slate-300">
                  The official Jira and Azure DevOps export backlogs automatically mark the work item status as <strong>"Done / Closed"</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Sprint Progress Bar & Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60 text-xs">
          <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Sprint Stories:</span>
            <span className="text-slate-900 dark:text-white font-bold text-sm">
              {filteredTasks.length} Active Stories
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Sprint Velocity Done:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm font-mono">
              {donePoints} / {totalPoints} pts ({progressPct}% Done)
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Target Capacity:</span>
            <span className="text-indigo-600 dark:text-indigo-300 font-bold text-sm font-mono">
              {totalPoints}/{currentSprintCap} pts
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Blockers (Finish 1st):</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm flex items-center gap-1 font-mono">
              <Zap size={13} className="text-yellow-500 shrink-0" />
              {activeBlockerStories.length} Blockers
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">DAG Blocked:</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold text-sm flex items-center gap-1 font-mono">
              <AlertTriangle size={13} className="text-amber-500" />
              {blockedStories.length} Blocked
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">DAG Ready:</span>
            <span className="text-emerald-600 dark:text-emerald-300 font-bold text-sm flex items-center gap-1">
              <Sparkles size={13} className="text-emerald-500" />
              {unblockedStories.length} Ready
            </span>
          </div>
        </div>

        {/* Progress Fill Bar */}
        <div className="mt-3 w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Live Warning Toast (if blocker or capacity alert triggered) */}
      {activeValidationWarning && (
        <div className={`p-4 rounded-2xl border shadow-xl flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-300 ${
          activeValidationWarning.severity === "CRITICAL"
            ? "bg-rose-950/90 border-rose-500/60 text-rose-200"
            : "bg-amber-950/90 border-amber-500/60 text-amber-200"
        }`}>
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl mt-0.5 ${
              activeValidationWarning.severity === "CRITICAL" ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
            }`}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="text-sm font-extrabold flex items-center gap-2">
                {activeValidationWarning.title}
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-900 border font-mono">
                  {activeValidationWarning.type}
                </span>
              </h4>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {activeValidationWarning.message}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveValidationWarning(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* 4 Kanban Columns Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          // Sort cards in each column so that dependency blocking stories are displayed FIRST!
          const sortColumnTasks = (a, b) => {
            const aId = a.story_id || a.id;
            const bId = b.story_id || b.id;
            const unmetA = getUnmetDeps(a);
            const unmetB = getUnmetDeps(b);
            const isBlockedA = unmetA.length > 0;
            const isBlockedB = unmetB.length > 0;

            const activeUnblocksA = getActiveDependentStories(aId).length;
            const activeUnblocksB = getActiveDependentStories(bId).length;

            const totalUnblocksA = getDependentStories(aId).length;
            const totalUnblocksB = getDependentStories(bId).length;

            // 1. Dependency blockers that unblock other stories MUST be finished first -> DISPLAY FIRST!
            if (col.id !== "Done") {
              if (activeUnblocksA > 0 && activeUnblocksB === 0) return -1;
              if (activeUnblocksB > 0 && activeUnblocksA === 0) return 1;
              if (activeUnblocksA !== activeUnblocksB) return activeUnblocksB - activeUnblocksA;
            } else {
              // In Done column: prerequisite blockers that were completed appear first
              if (totalUnblocksA > 0 && totalUnblocksB === 0) return -1;
              if (totalUnblocksB > 0 && totalUnblocksA === 0) return 1;
              if (totalUnblocksA !== totalUnblocksB) return totalUnblocksB - totalUnblocksA;
            }

            // 2. Unblocked ready-to-work stories come before Blocked stories
            if (!isBlockedA && isBlockedB) return -1;
            if (isBlockedA && !isBlockedB) return 1;

            // 3. Priority tier: CRITICAL > HIGH > MEDIUM > LOW
            const pWeight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
            const pA = pWeight[(a.priority_tier || a.priority || 'MEDIUM').toUpperCase()] || 2;
            const pB = pWeight[(b.priority_tier || b.priority || 'MEDIUM').toUpperCase()] || 2;
            if (pA !== pB) return pB - pA;

            // 4. Story points (descending)
            const ptsA = a.story_points || a.points || 0;
            const ptsB = b.story_points || b.points || 0;
            if (ptsA !== ptsB) return ptsB - ptsA;

            return String(aId).localeCompare(String(bId));
          };

          const colTasks = filteredTasks.filter(t => (t.status || "To Do") === col.id).sort(sortColumnTasks);
          const colPoints = colTasks.reduce((acc, t) => acc + (t.story_points || t.points || 0), 0);
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-2xl border transition-all duration-200 flex flex-col min-h-[550px] p-3.5 space-y-3 ${
                col.color
              } ${isOver ? "ring-2 ring-indigo-400 bg-indigo-950/40 border-indigo-400 shadow-xl" : ""}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{col.icon}</span>
                  <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">{col.title}</h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${col.badge}`}>
                    {colTasks.length} ({colPoints} pts)
                  </span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.length === 0 ? (
                  <div className="h-40 rounded-xl border border-dashed border-slate-700/60 flex items-center justify-center text-slate-500 text-xs italic">
                    Drop stories here
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const assigned = task.assigned_developer;
                    const tier = task.priority_tier || (task.priority === 'HIGH' ? 'HIGH' : 'LOW');
                    
                    // Check if dependencies are completed
                    const unmetDeps = getUnmetDeps(task);
                    const isBlocked = unmetDeps.length > 0;
                    const isNewlyUnblocked = (task.dependencies || []).length > 0 && unmetDeps.length === 0 && col.id === "To Do";

                    const activeUnblocksList = getActiveDependentStories(task.story_id || task.id);
                    const totalUnblocksList = getDependentStories(task.story_id || task.id);
                    const activeUnblocksCount = activeUnblocksList.length;
                    const totalUnblocksCount = totalUnblocksList.length;

                    return (
                      <div
                        key={task.story_id || task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.story_id || task.id)}
                        className={`bg-white dark:bg-slate-950/90 hover:bg-slate-50 dark:hover:bg-slate-900 border rounded-2xl p-3.5 space-y-2.5 transition-all shadow-sm dark:shadow-md cursor-grab active:cursor-grabbing hover:shadow-indigo-500/10 ${
                          col.id === "Done"
                            ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/10"
                            : isBlocked && col.id !== "Done"
                            ? "border-amber-400 dark:border-amber-500/70 ring-1 ring-amber-400/40 dark:ring-amber-500/40 bg-amber-50/50 dark:bg-amber-950/10"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        {/* Card Header: Story ID, Priority Tier, DAG Tag & Sprint */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                              {task.story_id || task.id}
                            </span>
                            <span className={`px-2 py-0.2 rounded-full text-[9px] font-extrabold border ${
                              tier === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                              tier === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                              tier === 'MEDIUM' ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' :
                              'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            }`}>
                              {tier}
                            </span>
                            {tier === 'CRITICAL' && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-500/25 border border-rose-500/50 text-rose-300 flex items-center gap-0.5">
                                <Flame size={9} className="text-amber-400" />
                                <span>Critical Path</span>
                              </span>
                            )}

                            {/* Dependency Blocker Tag in Header (Must be Finished First) */}
                            {activeUnblocksCount > 0 && col.id !== "Done" && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/25 border border-indigo-500/60 text-indigo-300 flex items-center gap-1 shadow-sm">
                                <Zap size={10} className="text-yellow-400" />
                                <span>BLOCKER • FINISH 1ST</span>
                              </span>
                            )}

                            {/* Prominent DAG BLOCKED Tag in Header */}
                            {isBlocked && col.id !== "Done" && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/25 border border-amber-500/60 text-amber-300 flex items-center gap-1 shadow-sm">
                                <AlertTriangle size={10} className="text-amber-400" />
                                <span>DAG BLOCKED</span>
                              </span>
                            )}

                            {/* DAG READY Tag */}
                            {isNewlyUnblocked && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 flex items-center gap-1">
                                <CheckCircle2 size={10} className="text-emerald-400" />
                                <span>DAG READY</span>
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                            Sprint {task.sprint_number || 1}
                          </span>
                        </div>

                        {/* Title */}
                        <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                          {cleanStoryTitle(task.title)}
                        </p>

                        {/* Dependency Blocker Callout: Finished First requirement */}
                        {activeUnblocksCount > 0 && col.id !== "Done" && (
                          <div 
                            className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/50 text-indigo-200 text-xs flex items-center gap-2 font-semibold shadow-sm"
                            title="In Scrum, dependency blocking stories must be finished first to unblock downstream work."
                          >
                            <Zap size={14} className="text-yellow-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="font-bold text-indigo-300">Prerequisite Blocker (Finish First):</span>
                              <span className="opacity-95 ml-1">
                                Unblocks {activeUnblocksCount} {activeUnblocksCount === 1 ? 'story' : 'stories'} ({activeUnblocksList.map(d => d.story_id || d.id).join(", ")}).
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Delivered Blocker Callout in Done column */}
                        {totalUnblocksCount > 0 && col.id === "Done" && (
                          <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] flex items-center gap-1.5 font-bold">
                            <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                            <span>✓ Finished First • Unblocked {totalUnblocksCount} downstream {totalUnblocksCount === 1 ? 'story' : 'stories'} ({totalUnblocksList.map(d => d.story_id || d.id).join(", ")})</span>
                          </div>
                        )}

                        {/* Dynamic DAG Status Badges */}
                        {isBlocked && col.id !== "Done" && (
                          <div 
                            className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2 cursor-help font-semibold shadow-sm"
                            title={`In Scrum/Agile, this story cannot start until prerequisite story (${unmetDeps.join(", ")}) is completed and marked 'Done'. You can still drag or move this card anytime.`}
                          >
                            <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                            <span className="truncate">
                              <strong className="text-amber-300">DAG Blocked by:</strong> {unmetDeps.join(", ")}
                            </span>
                          </div>
                        )}

                        {isNewlyUnblocked && (
                          <div className="p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[10px] flex items-center gap-1 font-bold">
                            <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                            <span>✓ All prerequisites Done • Ready to start!</span>
                          </div>
                        )}

                        {col.id === "Done" && totalUnblocksCount === 0 && (
                          <div className="p-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] flex items-center gap-1 font-bold">
                            <Check size={11} />
                            <span>Delivered • Done</span>
                          </div>
                        )}

                        {/* Child Sub-Tasks Checklist Section */}
                        {task.sub_tasks && task.sub_tasks.length > 0 && (() => {
                          const doneCount = task.sub_tasks.filter(s => s.status === 'Done').length;
                          const totalCount = task.sub_tasks.length;
                          const isExpanded = expandedSubtaskCards[task.story_id || task.id] !== false;
                          const subPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                          return (
                            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-2 mt-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCardSubtasks(task.story_id || task.id);
                                  }}
                                  className="font-bold text-indigo-300 flex items-center gap-1.5 hover:text-white transition-colors"
                                >
                                  <span>🧩 Sub-Tasks</span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    ({doneCount}/{totalCount})
                                  </span>
                                  <ChevronDown 
                                    size={12} 
                                    className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                  />
                                </button>
                                <span className={`text-[10px] font-mono font-bold ${subPct === 100 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                  {subPct}%
                                </span>
                              </div>

                              {/* Subtask mini progress bar */}
                              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                                <div 
                                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300"
                                  style={{ width: `${subPct}%` }}
                                />
                              </div>

                              {/* Expandable sub-tasks checklist */}
                              {isExpanded && (
                                <div className="space-y-1.5 pt-1">
                                  {task.sub_tasks.map((sub, sIdx) => {
                                    const isDone = sub.status === 'Done';
                                    return (
                                      <div 
                                        key={sub.id || sIdx}
                                        className={`flex items-start justify-between gap-1.5 p-1.5 rounded transition-all text-[11px] ${
                                          isDone 
                                            ? 'bg-emerald-950/25 border border-emerald-500/20 text-slate-400' 
                                            : 'bg-slate-950/80 border border-slate-800 text-slate-200'
                                        }`}
                                      >
                                        <label className="flex items-start gap-1.5 cursor-pointer flex-1 min-w-0">
                                          <input 
                                            type="checkbox"
                                            checked={isDone}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              handleToggleSubtask(task.story_id || task.id, sub.id, isDone ? 'To Do' : 'Done');
                                            }}
                                            className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-0 bg-slate-900 cursor-pointer shrink-0"
                                          />
                                          <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1 flex-wrap">
                                              <span className="font-mono text-[10px] text-teal-400 font-bold shrink-0">{sub.id}</span>
                                              <span 
                                                title={cleanStoryTitle(sub.title)}
                                                className={`text-[11px] leading-tight ${isDone ? 'line-through text-slate-500' : 'text-slate-200'}`}
                                              >
                                                {cleanStoryTitle(sub.title)}
                                              </span>
                                            </div>
                                          </div>
                                        </label>
                                        <span className="text-[10px] font-mono font-bold text-teal-400 shrink-0">
                                          {sub.points || 1}pt
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Optional Manual Decompose Trigger for Low/Medium Stories */}
                        {onDecomposeClick && col.id !== "Done" && (!task.sub_tasks || task.sub_tasks.length === 0) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDecomposeClick(task);
                            }}
                            className="w-full mt-1.5 py-1 px-2.5 rounded-lg bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                            title="Decompose story into atomic INVEST sub-tasks"
                          >
                            <Scissors size={11} className="text-indigo-400" />
                            <span>Decompose into Sub-Tasks</span>
                          </button>
                        )}

                        {/* Effort & Story Points */}
                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-mono text-[11px]">
                            {task.estimated_hours || (task.story_points || 3) * 8} hrs effort
                          </span>

                          <span className="font-mono font-bold text-indigo-400 text-xs">
                            {task.story_points || task.points || 3} pts
                          </span>
                        </div>

                        {/* Quick Navigation & Sprint Transfer Buttons */}
                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-1.5">
                            {/* Sprint Switcher Dropdown */}
                            <select
                              value={task.sprint_number || 1}
                              onChange={(e) => handleSprintChange(task.story_id || task.id, e.target.value)}
                              className="bg-slate-900 border border-slate-800 text-slate-300 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:border-indigo-500"
                              title="Move story to another sprint"
                            >
                              {detectedSprintNumbers.map((sNum) => (
                                <option key={sNum} value={String(sNum)}>Sprint {sNum}</option>
                              ))}
                            </select>

                            {onDecomposeClick && col.id !== "Done" && (
                              <button
                                onClick={() => onDecomposeClick(task)}
                                className="p-1 bg-slate-900 hover:bg-indigo-950 border border-slate-800 hover:border-indigo-500/50 text-indigo-400 rounded transition-all"
                                title="Split with AI & Generate BDD criteria"
                              >
                                <Scissors size={10} />
                              </button>
                            )}
                          </div>

                          {/* Step Buttons */}
                          <div className="flex items-center gap-1">
                            {col.id !== "To Do" && (
                              <button
                                onClick={() => handleQuickMove(task.story_id || task.id, "prev")}
                                className="p-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded"
                                title="Move to previous status"
                              >
                                <ArrowLeft size={11} />
                              </button>
                            )}
                            {col.id !== "Done" && (
                              <button
                                onClick={() => handleQuickMove(task.story_id || task.id, "next")}
                                className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold"
                                title="Move to next status"
                              >
                                <ArrowRight size={11} />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
