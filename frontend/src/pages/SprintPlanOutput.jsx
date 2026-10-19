import React, { useState, useEffect, useMemo } from "react";
import { 
  Zap, Layers, TrendingUp, CheckCircle2, AlertCircle, 
  GitBranch, ShieldAlert, Clock, Sliders, RefreshCw, 
  Cpu, ArrowRight, Network, Sparkles, Download, Calendar, 
  CheckSquare, BarChart3, ChevronRight, ChevronDown, Image, FileImage, 
  Edit3, PenTool, Share2, Palmtree, Sun, X, Scissors, FileCode, Flame, Users
} from "lucide-react";
import SprintCustomizerModal from "../components/SprintCustomizerModal";
import SprintKanbanBoard from "../components/SprintKanbanBoard";
import SprintBurndownAnalytics from "../components/SprintBurndownAnalytics";
import StoryDecomposerModal from "../components/StoryDecomposerModal";
import SprintCPMAnalyzer from "../components/SprintCPMAnalyzer";
import SprintCapacityBar from "../components/design-system/SprintCapacityBar";
import WorkItemCard from "../components/design-system/WorkItemCard";
import { cleanStoryTitle } from "../utils/storyUtils";

export default function SprintPlanOutput({ 
  requirements = [], 
  onNavigateToAddStories, 
  onNavigateToArtifacts, 
  onNavigateToResources,
  activeTab: externalActiveTab,
  setActiveTab: externalSetActiveTab,
  onStoriesCountChange,
  projects = [],
  selectedProjectId = '',
  onSelectProject
}) {
  const [hasLoadedDemo, setHasLoadedDemo] = useState(true);
  const [sprints, setSprints] = useState([]);
  const [stats, setStats] = useState(null);
  const [benchmark, setBenchmark] = useState(null);
  const [capacities, setCapacities] = useState([]);
  const [optimizing, setOptimizing] = useState(false);
  const [dagData, setDagData] = useState(null);
  const [ganttData, setGanttData] = useState(null);
  const [projectName, setProjectName] = useState("");
  const [internalActiveTab, setInternalActiveTab] = useState("gantt");
  const activeTab = externalActiveTab !== undefined ? externalActiveTab : internalActiveTab;
  const setActiveTab = externalSetActiveTab !== undefined ? externalSetActiveTab : setInternalActiveTab;
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [customizerNotice, setCustomizerNotice] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [isDecomposerOpen, setIsDecomposerOpen] = useState(false);
  const [selectedStoryToDecompose, setSelectedStoryToDecompose] = useState(null);
  const [expandedSubtasks, setExpandedSubtasks] = useState({});
  const [expandedSubtaskDetails, setExpandedSubtaskDetails] = useState({});

  // Dynamic Project Dropdown Selection State
  const [dbProjects, setDbProjects] = useState([]);
  const [isSwitchingProject, setIsSwitchingProject] = useState(false);
  const [currentSelectedProjectId, setCurrentSelectedProjectId] = useState(selectedProjectId || '');

  useEffect(() => {
    if (selectedProjectId) {
      setCurrentSelectedProjectId(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Fetch projects from Express if not provided
  useEffect(() => {
    if (!projects || projects.length === 0) {
      fetch('http://localhost:3000/api/projects')
        .then(res => res.json())
        .then(data => {
          const list = Array.isArray(data) ? data : (data?.data || data?.projects || []);
          if (Array.isArray(list) && list.length > 0) {
            setDbProjects(list);
          }
        })
        .catch(err => console.error("Error fetching projects:", err));
    }
  }, [projects]);

  useEffect(() => {
    if (onStoriesCountChange && allTasks.length > 0) {
      onStoriesCountChange(allTasks.length);
    }
  }, [allTasks.length, onStoriesCountChange]);

  // Active roadmap holidays strictly clamped to project start and end dates
  const activeRoadmapHolidays = ganttData ? (
    (ganttData.all_skipped_holidays && ganttData.all_skipped_holidays.length > 0)
      ? ganttData.all_skipped_holidays
      : (ganttData.active_calendar_holidays || ganttData.config?.holidays || [])
  ).filter(h => {
    const d = typeof h === 'object' ? h.date : h;
    if (!d) return false;
    return (!ganttData.project_start || d >= ganttData.project_start) &&
           (!ganttData.project_end || d <= ganttData.project_end);
  }) : [];

  const effectiveTotalSprints = useMemo(() => {
    let stored = 0;
    try {
      const email = localStorage.getItem('user_email') || 'default';
      stored = parseInt(
        localStorage.getItem('target_sprint_count') || 
        localStorage.getItem('total_sprints_count') || 
        localStorage.getItem(`planned_sprints_${email}`) || 
        '0', 
        10
      );
    } catch (_) {}

    const taskSprints = (allTasks || []).map(t => parseInt(t.sprint_number || 1)).filter(n => n > 0);
    const maxTaskSprint = taskSprints.length > 0 ? Math.max(...taskSprints) : 0;

    if (stored > 0) {
      return Math.max(stored, maxTaskSprint);
    }

    return Math.max(
      maxTaskSprint,
      ganttData?.sprints?.length || 0,
      sprints?.filter(s => (s.stories && s.stories.length > 0) || s.total_points > 0)?.length || 0,
      capacities?.length || 0,
      1
    );
  }, [ganttData, sprints, capacities, allTasks]);

  const activeProjectTitle = useMemo(() => {
    if (projectName && projectName.trim()) return projectName.trim();
    if (ganttData?.project_name && ganttData.project_name !== 'Agile Sprint Project' && ganttData.project_name !== 'Requirements Specification') {
      return ganttData.project_name;
    }
    if (ganttData?.config?.project_name && ganttData.config.project_name !== 'Agile Sprint Project' && ganttData.config.project_name !== 'Requirements Specification') {
      return ganttData.config.project_name;
    }
    try {
      const email = localStorage.getItem('user_email') || 'default';
      const saved = localStorage.getItem(`active_requirements_batch_${email}`) || 
                    localStorage.getItem('active_requirements_batch') || 
                    localStorage.getItem('active_project_name');
      if (saved && saved.trim()) return saved.trim();
    } catch (_) {}
    if (requirements && requirements.length > 0) {
      const bName = requirements[0]?.batch_title || requirements[0]?.file_name || requirements[0]?.batch_name;
      if (bName) return bName;
    }
    return "POS_SYSTEM_REQUIREMENTS";
  }, [projectName, ganttData, requirements]);

  // Available project list for dropdown selection
  const projectOptions = useMemo(() => {
    const list = [];
    const seen = new Set();

    const addProj = (id, name, extra = {}) => {
      if (!name) return;
      const cleanName = String(name).trim();
      const cleanId = String(id || cleanName);
      if (!seen.has(cleanName.toLowerCase())) {
        seen.add(cleanName.toLowerCase());
        list.push({ 
          id: cleanId, 
          project_id: cleanId, 
          name: cleanName, 
          project_name: cleanName, 
          requirement_count: extra.requirement_count || extra.requirementCount,
          ...extra 
        });
      }
    };

    const sourceProjects = (projects && projects.length > 0) ? projects : dbProjects;
    sourceProjects.forEach((p, idx) => {
      addProj(p.project_id || p.id || `proj-${idx}`, p.project_name || p.name, p);
    });

    if (requirements && requirements.length > 0) {
      requirements.forEach((r, idx) => {
        const rName = r.project_name || r.batch_title || r.batch_name || r.project;
        if (rName) {
          addProj(r.project_id || `req-proj-${idx}`, rName, { requirement_count: 1 });
        }
      });
    }

    if (activeProjectTitle) {
      addProj('current-proj', activeProjectTitle);
    }

    return list;
  }, [projects, dbProjects, requirements, activeProjectTitle]);

  // Handler to switch project from the top dropdown
  const handleProjectChange = async (targetProjectIdOrName) => {
    if (!targetProjectIdOrName || isSwitchingProject) return;
    setIsSwitchingProject(true);

    const selectedProj = projectOptions.find(p => 
      String(p.project_id || p.id) === String(targetProjectIdOrName) ||
      String(p.project_name || p.name).toLowerCase() === String(targetProjectIdOrName).toLowerCase()
    );

    const projName = selectedProj?.project_name || selectedProj?.name || targetProjectIdOrName;
    const projId = selectedProj?.project_id || selectedProj?.id || targetProjectIdOrName;

    setProjectName(projName);
    setCurrentSelectedProjectId(projId);

    try {
      const email = localStorage.getItem('user_email') || 'default';
      localStorage.setItem(`active_requirements_batch_${email}`, projName);
      localStorage.setItem('active_requirements_batch', projName);
      localStorage.setItem('active_project_name', projName);
      localStorage.setItem('active_project_id', projId);
    } catch (_) {}

    if (onSelectProject) {
      onSelectProject(projId);
    }

    try {
      const reqRes = await fetch('http://localhost:3000/api/requirements');
      const allReqs = await reqRes.json();
      const projReqs = Array.isArray(allReqs)
        ? allReqs.filter(r => 
            String(r.project_id) === String(projId) ||
            String(r.project_name || '').toLowerCase() === String(projName).toLowerCase() ||
            String(r.batch_name || '').toLowerCase().includes(String(projName).toLowerCase())
          )
        : [];

      if (projReqs.length > 0) {
        await fetch('http://localhost:8082/api/import-requirements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requirements: projReqs,
            project_name: projName,
            project_id: projId,
            timeline_settings: {
              start_date: '2026-10-19',
              sprint_duration_weeks: 2,
              working_days_per_week: 5,
              target_sprint_count: Math.max(2, Math.min(6, Math.ceil(projReqs.length / 12)))
            }
          })
        });
      }

      await Promise.all([
        fetchSprintPlan(),
        fetchDagData(),
        fetchGanttData()
      ]);

      setCustomizerNotice(`Active project switched to "${projName}".`);
      setTimeout(() => setCustomizerNotice(null), 5000);
      window.dispatchEvent(new Event('sprints-updated'));
    } catch (err) {
      console.error("Failed to switch project:", err);
    } finally {
      setIsSwitchingProject(false);
    }
  };

  const handleOpenDecomposer = (story) => {
    setSelectedStoryToDecompose(story);
    setIsDecomposerOpen(true);
  };

  const toggleSubtasks = (storyId) => {
    setExpandedSubtasks(prev => ({ ...prev, [storyId]: prev[storyId] === false ? true : false }));
  };

  const toggleSubtaskDetail = (subId) => {
    setExpandedSubtaskDetails(prev => ({
      ...prev,
      [subId]: !prev[subId]
    }));
  };

  const handleDecompositionApplied = (res) => {
    if (res && res.tasks) {
      processSprintData(res);
    }
    fetchSprintPlan();
    fetchDagData();
    fetchGanttData();
    setCustomizerNotice(res.message || "✨ Story successfully decomposed into atomic units with Gherkin BDD test criteria!");
    setTimeout(() => setCustomizerNotice(null), 6000);
  };

  const handleRevertDecomposition = async (storyId) => {
    try {
      const res = await fetch("http://localhost:8082/api/stories/revert-decomposition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parent_story_id: storyId })
      });
      const data = await res.json();
      if (data.status === "success") {
        fetchSprintPlan();
        fetchGanttData();
        fetchDagData();
        setCustomizerNotice(`Reverted ${storyId} to a single story.`);
        setTimeout(() => setCustomizerNotice(null), 5000);
      }
    } catch (err) {
      console.error("Revert decomposition error:", err);
    }
  };

  const handleUpdateSubtaskStatus = async (storyId, subtaskId, newStatus) => {
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
      if (data.status === "success") {
        fetchSprintPlan();
        fetchGanttData();
      }
    } catch (err) {
      console.error("Update subtask status error:", err);
    }
  };

  useEffect(() => {
    fetchSprintPlan();
    fetchDagData();
    fetchGanttData();

    const handleSprintsUpdated = () => {
      try {
        const email = localStorage.getItem('user_email') || 'default';
        const saved = localStorage.getItem(`active_requirements_batch_${email}`) || 
                      localStorage.getItem('active_requirements_batch') || 
                      localStorage.getItem('active_project_name');
        if (saved) setProjectName(saved);
      } catch (_) {}
      fetchSprintPlan();
      fetchDagData();
      fetchGanttData();
      try {
        const notice = sessionStorage.getItem('sprint_plan_notice');
        if (notice) {
          setCustomizerNotice(notice);
          sessionStorage.removeItem('sprint_plan_notice');
          setTimeout(() => setCustomizerNotice(null), 7000);
        }
      } catch (_) {}
    };

    window.addEventListener('sprints-updated', handleSprintsUpdated);
    return () => window.removeEventListener('sprints-updated', handleSprintsUpdated);
  }, []);

  useEffect(() => {
    try {
      const email = localStorage.getItem('user_email') || 'default';
      const saved = localStorage.getItem(`active_requirements_batch_${email}`) || 
                    localStorage.getItem('active_requirements_batch') || 
                    localStorage.getItem('active_project_name');
      if (saved) setProjectName(saved);

      const notice = sessionStorage.getItem('sprint_plan_notice');
      if (notice) {
        setCustomizerNotice(notice);
        sessionStorage.removeItem('sprint_plan_notice');
        setTimeout(() => setCustomizerNotice(null), 7000);
      }
    } catch (_) {}
  }, []);

  const fetchSprintPlan = async () => {
    try {
      const res = await fetch("http://localhost:8082/api/sprint-plan");
      const text = await res.text();
      const safeText = text.replace(/NaN/g, '0');
      const data = JSON.parse(safeText);

      if (data.status === "success" && data.tasks) {
        processSprintData(data);
        if (data.project_name) {
          setProjectName(data.project_name);
        }
        if (data.capacities && Array.isArray(data.capacities) && data.capacities.length > 0) {
          setCapacities(data.capacities);
        }
      }
    } catch (err) {
      console.error("Sprint Fetch Error:", err);
    }
  };

  const fetchDagData = async () => {
    try {
      const res = await fetch("http://localhost:8082/api/dependencies/dag");
      const data = await res.json();
      if (data.status === "success") {
        setDagData(data);
      }
    } catch (err) {
      console.error("DAG Fetch Error:", err);
    }
  };

  const fetchGanttData = async () => {
    try {
      const res = await fetch("http://localhost:8082/api/timeline/gantt");
      const data = await res.json();
      if (data.status === "success") {
        setGanttData(data);
      }
    } catch (err) {
      console.error("Gantt Fetch Error:", err);
    }
  };

  const handleRunILPOptimizer = async () => {
    setOptimizing(true);
    try {
      const res = await fetch("http://localhost:8082/api/sprint-plan/optimize-ilp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capacities: capacities })
      });
      const data = await res.json();
      if (data.status === "success") {
        processSprintData(data);
        if (data.capacities && Array.isArray(data.capacities) && data.capacities.length > 0) {
          setCapacities(data.capacities);
        }
        fetchDagData();
        fetchGanttData();
      }
    } catch (err) {
      console.error("ILP Optimization Error:", err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleCapacityChange = (index, value) => {
    const updated = [...capacities];
    updated[index] = Math.max(10, Math.min(150, Number(value) || 10));
    setCapacities(updated);
  };

  const handleCustomizerApplied = (customResult) => {
    if (customResult && customResult.timeline) {
      setGanttData(customResult.timeline);
    }
    if (customResult && customResult.config && customResult.config.capacities) {
      setCapacities(customResult.config.capacities);
    }
    fetchSprintPlan();
    fetchDagData();
    fetchGanttData();
    setCustomizerNotice("✨ Sprint Schedule & Gantt Timeline successfully customized with holidays, dates & buffer!");
    setTimeout(() => setCustomizerNotice(null), 6000);
  };

  const processSprintData = (data) => {
    const groupedSprints = {};
    const taskList = data.tasks || [];
    taskList.forEach(task => {
      const sNum = task.sprint_number || 1;
      if (!groupedSprints[sNum]) {
        groupedSprints[sNum] = {
          sprint_number: sNum,
          total_points: 0,
          total_hours: 0,
          done_points: 0,
          in_progress_points: 0,
          to_do_points: 0,
          critical_count: 0,
          high_count: 0,
          medium_count: 0,
          low_count: 0,
          stories: []
        };
      }
      groupedSprints[sNum].stories.push(task);
      const pts = task.story_points || task.points || 0;
      groupedSprints[sNum].total_points += pts;
      groupedSprints[sNum].total_hours += (task.estimated_hours || (pts * 8));

      const st = task.status || "To Do";
      if (st === "Done") groupedSprints[sNum].done_points += pts;
      else if (st === "In Progress" || st === "QA Review") groupedSprints[sNum].in_progress_points += pts;
      else groupedSprints[sNum].to_do_points += pts;

      const tier = task.priority_tier || (task.priority === 'HIGH' ? 'HIGH' : 'LOW');
      if (tier === 'CRITICAL') groupedSprints[sNum].critical_count++;
      else if (tier === 'HIGH') groupedSprints[sNum].high_count++;
      else if (tier === 'MEDIUM') groupedSprints[sNum].medium_count++;
      else groupedSprints[sNum].low_count++;
    });

    // Ensure all planned sprints from questionnaire / config / capacities are represented
    try {
      const email = localStorage.getItem('user_email') || 'default';
      const storedCount = parseInt(
        localStorage.getItem('target_sprint_count') || 
        localStorage.getItem('total_sprints_count') || 
        localStorage.getItem(`planned_sprints_${email}`) || 
        '0', 
        10
      );
      const taskSprints = taskList.map(t => parseInt(t.sprint_number || 1)).filter(n => n > 0);
      const maxTaskSprint = taskSprints.length > 0 ? Math.max(...taskSprints) : 0;
      const capCount = (data.capacities && Array.isArray(data.capacities)) ? data.capacities.length : 0;
      const sprintDictKeys = data.sprints ? Object.keys(data.sprints).map(k => parseInt(k)).filter(n => n > 0) : [];
      const maxDictSprint = sprintDictKeys.length > 0 ? Math.max(...sprintDictKeys) : 0;
      
      const totalPlanned = storedCount > 0 
        ? Math.max(storedCount, maxTaskSprint)
        : Math.max(maxTaskSprint, capCount, maxDictSprint, 1);

      for (let s = 1; s <= totalPlanned; s++) {
        if (!groupedSprints[s]) {
          groupedSprints[s] = {
            sprint_number: s,
            total_points: 0,
            total_hours: 0,
            done_points: 0,
            in_progress_points: 0,
            to_do_points: 0,
            critical_count: 0,
            high_count: 0,
            medium_count: 0,
            low_count: 0,
            stories: []
          };
        }
      }
    } catch (_) {}

    setSprints(Object.values(groupedSprints).sort((a, b) => a.sprint_number - b.sprint_number));
    setStats(data.stats || null);
    setBenchmark(data.benchmark || null);
    if (data.tasks) setAllTasks(data.tasks);
    if (data.capacities && Array.isArray(data.capacities)) {
      setCapacities(data.capacities);
    }
  };

  const handleDownloadJira = async () => {
    try {
      const res = await fetch("http://localhost:8082/api/export/jira");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jira_agile_sprint_backlog.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.location.href = "http://localhost:8082/api/export/jira";
    }
  };

  const handleDownloadAzure = async () => {
    try {
      const res = await fetch("http://localhost:8082/api/export/azure");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "azure_devops_work_items.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.location.href = "http://localhost:8082/api/export/azure";
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const res = await fetch("http://localhost:8082/api/export/excel");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Agile_Sprint_Gantt_Chart.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.location.href = "http://localhost:8082/api/export/excel";
    }
  };

  const handleHandoffToResources = async () => {
    try {
      // 1. Prepare and persist output dataset on backend (output_for_member3.csv)
      await fetch("http://localhost:8082/api/export/resource-handoff", {
        method: "POST"
      });
    } catch (err) {
      console.warn("Resource handoff export warning:", err);
    }

    try {
      // 2. Prepare handoff data in localStorage for Resource Management Module
      const handoffPayload = {
        project_name: activeProjectTitle,
        sprints_count: sprints.length,
        total_stories: allTasks.length,
        total_points: allTasks.reduce((s, t) => s + (t.story_points || t.points || 0), 0),
        total_hours: allTasks.reduce((s, t) => s + (t.estimated_hours || ((t.story_points || t.points || 0) * 8)), 0),
        sprints: sprints.map(s => ({
          sprint_number: s.sprint_number,
          total_points: s.total_points,
          total_hours: s.total_hours,
          stories_count: s.stories?.length || 0,
          start_date: s.start_date,
          end_date: s.end_date
        })),
        tasks: allTasks.map(t => ({
          story_id: t.story_id,
          title: cleanStoryTitle(t.title),
          sprint_number: t.sprint_number,
          points: t.story_points || t.points || 0,
          hours: t.estimated_hours || ((t.story_points || t.points || 0) * 8),
          priority_tier: t.priority_tier || 'MEDIUM',
          assigned_developer: t.assigned_to || 'Senior Developer',
          developer_id: t.developer_id || 'DEV01',
          skills: t.skills || ['Fullstack']
        })),
        generated_at: new Date().toISOString()
      };
      localStorage.setItem('resource_management_handoff', JSON.stringify(handoffPayload));
    } catch (_) {}

    // 3. Navigate to Resource Management Module
    if (onNavigateToResources) {
      onNavigateToResources();
    }
  };

  const parseStoryId = (idStr) => {
    if (!idStr) return [9999, -1, ""];
    const str = String(idStr).trim();
    const match = str.match(/(?:US|STORY|TASK)?[-_\s]*(\d+)(?:\.(\d+))?/i);
    if (match) {
      const mainNum = parseInt(match[1], 10);
      const subNum = match[2] !== undefined ? parseInt(match[2], 10) : -1;
      return [mainNum, subNum, str];
    }
    return [9999, -1, str];
  };

  const sortTasksNaturally = (taskList) => {
    if (!taskList || !Array.isArray(taskList)) return [];
    return [...taskList].sort((a, b) => {
      const idA = a.id || a.story_id || a.key || "";
      const idB = b.id || b.story_id || b.key || "";
      const [mainA, subA, rawA] = parseStoryId(idA);
      const [mainB, subB, rawB] = parseStoryId(idB);
      if (mainA !== mainB) return mainA - mainB;
      if (subA !== subB) return subA - subB;
      return rawA.localeCompare(rawB, undefined, { numeric: true });
    });
  };

  // 1. Official Microsoft Excel Standard High-Res Gantt Image (PNG) Exporter
  const downloadGanttImage = (format = "png") => {
    if (!ganttData || !ganttData.tasks) return;

    const tasks = sortTasksNaturally(ganttData.tasks);
    const projStart = new Date(ganttData.project_start || "2026-10-12");
    const projEnd = new Date(ganttData.project_end || "2026-11-20");
    const totalCalendarDays = Math.max(28, Math.round((projEnd - projStart) / (1000 * 60 * 60 * 24)) + 1);

    // Active roadmap holidays strictly within project duration
    const roadmapHolidays = (
      ganttData.all_skipped_holidays && ganttData.all_skipped_holidays.length > 0
        ? ganttData.all_skipped_holidays
        : (ganttData.config?.holidays || [])
    ).filter(h => {
      const d = typeof h === 'object' ? h.date : h;
      return d >= ganttData.project_start && d <= ganttData.project_end;
    });
    const holidayDateMap = {};
    roadmapHolidays.forEach(h => {
      const d = typeof h === 'object' ? h.date : h;
      const n = typeof h === 'object' ? h.name : 'Holiday';
      holidayDateMap[d] = n;
    });

    const scale = 2; // High-DPI Retina resolution
    const rowHeight = 40;
    const headerHeight = 175;
    const tableHeaderHeight = 44;
    const footerHeight = 65;
    const height = headerHeight + tableHeaderHeight + (tasks.length * rowHeight) + footerHeight;

    // Excel Table Columns on Left (Without Assigned Lead and Done)
    const colW = {
      id: 85,
      title: 460,
      sprint: 85,
      priority: 95,
      start: 95,
      end: 95,
      days: 65
    };

    const leftTableWidth = colW.id + colW.title + colW.sprint + colW.priority + colW.start + colW.end + colW.days;
    const dayWidth = Math.max(24, Math.min(42, Math.floor(1050 / totalCalendarDays)));
    const gridWidth = dayWidth * totalCalendarDays;
    const width = leftTableWidth + gridWidth + 40;

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);

    // 1. Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // 2. Microsoft Excel Header Bar (Official Excel Green #107C41)
    ctx.fillStyle = "#107C41";
    ctx.fillRect(0, 0, width, 58);

    // Excel Logo icon badge [X]
    ctx.fillStyle = "#0A5325";
    ctx.beginPath();
    ctx.roundRect(24, 12, 34, 34, 6);
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 20px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("X", 33, 37);

    // Title & Subtitle
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("MICROSOFT EXCEL PROJECT PLANNER & SPRINT GANTT CHART", 72, 32);

    ctx.fillStyle = "#D1E7DD";
    ctx.font = "500 11px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Official Agile Scrum Delivery Schedule • Multi-Calendar Resource & Holiday Engine", 72, 48);

    // Excel Badge on Right
    ctx.fillStyle = "#0A5325";
    ctx.beginPath();
    ctx.roundRect(width - 230, 14, 205, 30, 6);
    ctx.fill();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Microsoft Excel Standard Template", width - 218, 33);

    // 3. Project KPI Ribbon Summary Block
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, 58, width, 117);
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 175);
    ctx.lineTo(width, 175);
    ctx.stroke();

    const totalPts = tasks.reduce((sum, t) => sum + (t.points || 0), 0);
    const totalHrs = tasks.reduce((sum, t) => sum + (t.hours || 0), 0);
    const workingDaysCount = ganttData.total_working_days || (ganttData.sprints?.length * 10) || 30;

    const cards = [
      { label: "DELIVERY ROADMAP", val: `${ganttData.project_start}  ➔  ${ganttData.project_end}`, sub: `${totalCalendarDays} Calendar Days` },
      { label: "TOTAL DELIVERABLES", val: `${tasks.length} User Stories`, sub: `${totalPts} Story Points • ${totalHrs}h Effort` },
      { label: "SPRINT CADENCE", val: `${ganttData.sprints?.length || 3} Sprints (${ganttData.config?.sprint_duration_weeks || 2} Wks/Sprint)`, sub: `Story Point Allocation` },
      { label: "CALENDAR POLICY", val: `${workingDaysCount} Business Days Active`, sub: `${roadmapHolidays.length} Excluded Holiday${roadmapHolidays.length === 1 ? '' : 's'}` }
    ];

    const cardWidth = Math.floor((width - 48 - (cards.length - 1) * 12) / cards.length);
    cards.forEach((card, idx) => {
      const cX = 24 + idx * (cardWidth + 12);
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(cX, 68, cardWidth, 95, 8);
      ctx.fill();
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#64748B";
      ctx.font = "bold 10px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(card.label, cX + 12, 88);

      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(card.val, cX + 12, 112);

      ctx.fillStyle = "#107C41";
      ctx.font = "600 11px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(card.sub, cX + 12, 134);
    });

    // 4. Excel Table Header Row (Left Side) & Timeline Header (Right Side)
    const tableTop = headerHeight;
    ctx.fillStyle = "#107C41"; // Official Excel Green Header
    ctx.fillRect(0, tableTop, leftTableWidth, tableHeaderHeight);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
    let curX = 18;
    ctx.fillText("WBS ID", curX, tableTop + 27); curX += colW.id;
    ctx.fillText("USER STORY / REQUIREMENT", curX, tableTop + 27); curX += colW.title;
    ctx.fillText("SPRINT", curX, tableTop + 27); curX += colW.sprint;
    ctx.fillText("PRIORITY", curX, tableTop + 27); curX += colW.priority;
    ctx.fillText("START", curX, tableTop + 27); curX += colW.start;
    ctx.fillText("END", curX, tableTop + 27); curX += colW.end;
    ctx.fillText("DAYS", curX, tableTop + 27);

    // 5. Timeline Header Row (Right Side)
    const gridLeft = leftTableWidth;
    const tier1Height = 20;
    const tier2Height = 24;
    ctx.fillStyle = "#0A5325";
    ctx.fillRect(gridLeft, tableTop, gridWidth, tier1Height);
    
    ctx.fillStyle = "#0F7937";
    ctx.fillRect(gridLeft, tableTop + tier1Height, gridWidth, tier2Height);

    // Draw Timeline Calendar Days
    for (let d = 0; d < totalCalendarDays; d++) {
      const currDate = new Date(projStart.getTime() + d * 86400000);
      const dX = gridLeft + d * dayWidth;
      const dayNum = currDate.getDate();
      const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const dayOfWeek = currDate.getDay();
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      const dateStr = currDate.toISOString().slice(0, 10);
      const isHoliday = Boolean(holidayDateMap[dateStr]);

      if (d % 7 === 0) {
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 10px 'Segoe UI', Arial, sans-serif";
        const weekNum = Math.floor(d / 7) + 1;
        ctx.fillText(`WK ${weekNum}: ${monthNames[currDate.getMonth()]} ${dayNum}`, dX + 4, tableTop + 14);
      }

      if (isHoliday) {
        ctx.fillStyle = "#F59E0B";
        ctx.fillRect(dX, tableTop + tier1Height, dayWidth, tier2Height);
        ctx.fillStyle = "#78350F";
      } else if (isWeekend) {
        ctx.fillStyle = "#08421E";
        ctx.fillRect(dX, tableTop + tier1Height, dayWidth, tier2Height);
        ctx.fillStyle = "#A7F3D0";
      } else {
        ctx.fillStyle = "#FFFFFF";
      }
      ctx.font = "bold 9px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(`${dayNum}`, dX + 3, tableTop + tier1Height + 16);
    }

    // 6. Data Rows & Gantt Bars
    tasks.forEach((task, idx) => {
      const rowY = tableTop + tableHeaderHeight + (idx * rowHeight);

      ctx.fillStyle = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
      ctx.fillRect(0, rowY, leftTableWidth, rowHeight);

      for (let d = 0; d < totalCalendarDays; d++) {
        const currDate = new Date(projStart.getTime() + d * 86400000);
        const dX = gridLeft + d * dayWidth;
        const dayOfWeek = currDate.getDay();
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
        const dateStr = currDate.toISOString().slice(0, 10);
        const isHoliday = Boolean(holidayDateMap[dateStr]);

        if (isHoliday) {
          ctx.fillStyle = "#FEF3C7"; // Light Amber Holiday Shading
        } else if (isWeekend) {
          ctx.fillStyle = "#F1F5F9"; // Light Slate Weekend Shading
        } else {
          ctx.fillStyle = idx % 2 === 0 ? "#FFFFFF" : "#F8FAFC";
        }
        ctx.fillRect(dX, rowY, dayWidth, rowHeight);

        ctx.strokeStyle = "#E2E8F0";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dX, rowY);
        ctx.lineTo(dX, rowY + rowHeight);
        ctx.stroke();
      }

      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rowY + rowHeight);
      ctx.lineTo(width, rowY + rowHeight);
      ctx.stroke();

      ctx.strokeStyle = "#107C41";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gridLeft, rowY);
      ctx.lineTo(gridLeft, rowY + rowHeight);
      ctx.stroke();

      let rX = 18;
      const isSub = Boolean(task.is_subtask);

      // WBS ID
      ctx.fillStyle = isSub ? "#0D9488" : "#0F7937";
      ctx.font = isSub ? "bold 10px 'Segoe UI', Consolas, monospace" : "bold 11px 'Segoe UI', Consolas, monospace";
      ctx.fillText(isSub ? `  ↳ ${task.id}` : task.id, rX, rowY + 25);
      rX += colW.id;

      // Title
      ctx.fillStyle = isSub ? "#475569" : "#1E293B";
      ctx.font = isSub ? "normal 11px 'Segoe UI', Arial, sans-serif" : "bold 11px 'Segoe UI', Arial, sans-serif";
      const formattedTitle = cleanStoryTitle(task.title);
      const displayTitle = isSub ? `   ${formattedTitle}` : formattedTitle;
      const titleTrunc = displayTitle.length > 56 ? displayTitle.slice(0, 54) + "..." : displayTitle;
      ctx.fillText(titleTrunc, rX, rowY + 25);
      rX += colW.title;

      // Sprint
      ctx.fillStyle = "#475569";
      ctx.fillText(`Sprint ${task.sprint_number}`, rX, rowY + 25);
      rX += colW.sprint;

      // Priority Tier Badge
      const tier = task.priority_tier || 'MEDIUM';
      const tierBadgeColor = 
        tier === 'CRITICAL' ? { bg: "#FEE2E2", text: "#991B1B" } :
        tier === 'HIGH' ? { bg: "#FEF3C7", text: "#92400E" } :
        tier === 'MEDIUM' ? { bg: "#E0F2FE", text: "#0369A1" } :
        { bg: "#D1FAE5", text: "#065F46" };

      ctx.fillStyle = isSub ? "#CCFBF1" : tierBadgeColor.bg;
      ctx.beginPath();
      ctx.roundRect(rX, rowY + 11, 70, 18, 4);
      ctx.fill();
      ctx.fillStyle = isSub ? "#0F766E" : tierBadgeColor.text;
      ctx.font = "bold 9px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(isSub ? "SUB-TASK" : tier, rX + 8, rowY + 24);
      rX += colW.priority;

      // Start Date
      ctx.fillStyle = "#475569";
      ctx.font = "11px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(task.start_date, rX, rowY + 25);
      rX += colW.start;

      // End Date
      ctx.fillText(task.end_date, rX, rowY + 25);
      rX += colW.end;

      // Days (Duration)
      const tStart = new Date(task.start_date);
      const tEnd = new Date(task.end_date);
      const durDays = Math.max(1, Math.round((tEnd - tStart) / 86400000) + 1);
      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(`${durDays}d`, rX + 8, rowY + 25);
      rX += colW.days;

      // --- Draw Accurate Segmented Excel Gantt Task Bar (skipping weekends & holidays) ---
      const taskSegments = [];
      let currentSegStart = null;
      let currentSegDays = 0;

      for (let dI = 0; dI < durDays; dI++) {
        const cDate = new Date(tStart.getTime() + (dI * 86400000));
        const cStr = cDate.toISOString().split("T")[0];
        const dayOfWeek = cDate.getDay();
        const isWknd = dayOfWeek === 0 || dayOfWeek === 6;
        const isHday = !!holidayDateMap[cStr];

        if (!isWknd && !isHday) {
          if (currentSegStart === null) {
            currentSegStart = cDate;
            currentSegDays = 1;
          } else {
            currentSegDays += 1;
          }
        } else {
          if (currentSegStart !== null) {
            taskSegments.push({ start: currentSegStart, days: currentSegDays });
            currentSegStart = null;
            currentSegDays = 0;
          }
        }
      }
      if (currentSegStart !== null) {
        taskSegments.push({ start: currentSegStart, days: currentSegDays });
      }

      taskSegments.forEach((seg, sIdx) => {
        const segOffsetDays = Math.max(0, Math.round((seg.start - projStart) / 86400000));
        const sBarX = gridLeft + (segOffsetDays * dayWidth) + 2;
        const sBarY = rowY + 9;
        const sBarW = (seg.days * dayWidth) - 4;
        const sBarH = rowHeight - 18;

        ctx.fillStyle = isSub ? "#0D9488" : "#107C41";
        ctx.beginPath();
        ctx.roundRect(sBarX, sBarY, sBarW, sBarH, 4);
        ctx.fill();

        ctx.strokeStyle = isSub ? "#0F766E" : "#0B532C";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 9px 'Segoe UI', Arial, sans-serif";
        if (sIdx === 0 && sBarW > 30) {
          ctx.fillText(`${task.id} (${task.points}p)`, sBarX + 5, sBarY + sBarH - 6);
        } else if (sIdx > 0 && sBarW > 25) {
          ctx.fillStyle = isSub ? "#CCFBF1" : "#D1FAE5";
          ctx.fillText(`${task.id}`, sBarX + 5, sBarY + sBarH - 6);
        }
      });
    });

    // 7. Footer & Official Microsoft Excel Legend
    const footerY = tableTop + tableHeaderHeight + (tasks.length * rowHeight) + 12;
    ctx.fillStyle = "#F8FAFC";
    ctx.fillRect(0, footerY, width, footerHeight);
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, footerY);
    ctx.lineTo(width, footerY);
    ctx.stroke();

    ctx.fillStyle = "#334155";
    ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("EXCEL GANTT LEGEND:", 24, footerY + 28);

    const legendItems = [
      { label: "Planned Sprint Deliverable", fill: "#107C41", stroke: "#0B532C" },
      { label: "Non-Working Weekend", fill: "#F1F5F9", stroke: "#CBD5E1" },
      { label: `Roadmap Holiday Exclusion (${roadmapHolidays.length} active)`, fill: "#FEF3C7", stroke: "#F59E0B" }
    ];

    let legX = 180;
    legendItems.forEach(item => {
      ctx.fillStyle = item.fill;
      ctx.strokeStyle = item.stroke;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(legX, footerY + 17, 16, 14, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#475569";
      ctx.font = "11px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(item.label, legX + 22, footerY + 29);
      legX += 240;
    });

    ctx.fillStyle = "#64748B";
    ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Microsoft Excel Standard Gantt Template • Generated with AI Requirements Engine", width - 520, footerY + 29);

    // Download Image File
    const dataURL = canvas.toDataURL("image/png", 0.95);
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = `Microsoft_Excel_Gantt_Chart_${ganttData.project_start}_to_${ganttData.project_end}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Official Draw.io (diagrams.net) Editable Diagram XML Exporter
  const downloadDrawioXML = () => {
    if (!ganttData || !ganttData.tasks) return;

    const tasks = sortTasksNaturally(ganttData.tasks);
    const projStart = new Date(ganttData.project_start || "2026-10-08");
    const dayWidth = 36;
    const currentY = 120;

    const tierStyles = {
      CRITICAL: "fillColor=#E11D48;strokeColor=#BE123C;fontColor=#ffffff;",
      HIGH: "fillColor=#D97706;strokeColor=#B45309;fontColor=#ffffff;",
      MEDIUM: "fillColor=#0284C7;strokeColor=#0369A1;fontColor=#ffffff;",
      LOW: "fillColor=#059669;strokeColor=#047857;fontColor=#ffffff;"
    };

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Agile-Sprint-Optimizer" version="21.0.0" type="device">
  <diagram id="agile-gantt-chart" name="Agile Sprint Gantt Chart">
    <mxGraphModel dx="1422" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1800" pageHeight="1200" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="hdr_banner" value="&lt;b&gt;MICROSOFT EXCEL AGILE GANTT CHART &amp;amp; SPRINT ROADMAP&lt;/b&gt;&lt;br&gt;&lt;font style=&quot;font-size: 11px;&quot;&gt;Project: Requirements Engineering | Schedule: ${ganttData.project_start} to ${ganttData.project_end} (${ganttData.total_duration_days} Days)&lt;/font&gt;" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#107C41;strokeColor=#0A5325;fontColor=#ffffff;align=center;fontSize=15;" vertex="1" parent="1">
          <mxGeometry x="40" y="30" width="1320" height="60" as="geometry" />
        </mxCell>
`;

    tasks.forEach((task, idx) => {
      const taskY = currentY + (idx * 55);
      const tStart = new Date(task.start_date);
      const diffDays = Math.max(0, Math.round((tStart - projStart) / (1000 * 60 * 60 * 24)));
      const dur = task.duration_working_days || task.duration_days || 3;
      const isSub = Boolean(task.is_subtask);

      const barX = 480 + (diffDays * dayWidth);
      const barW = Math.max(80, dur * dayWidth);
      const subStyle = "fillColor=#0D9488;strokeColor=#0F766E;fontColor=#ffffff;";
      const style = isSub ? subStyle : (tierStyles[task.priority_tier] || tierStyles.MEDIUM);
      const cleanTitle = (cleanStoryTitle(task.title) || "").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const labelText = isSub 
        ? `&amp;nbsp;&amp;nbsp;↳ &lt;b&gt;${task.id}&lt;/b&gt;: ${cleanTitle} &lt;br&gt;&lt;i&gt;Sprint ${task.sprint_number} (Sub-task) | ${task.points} pts (${task.hours}h)&lt;/i&gt;`
        : `&lt;b&gt;${task.id}&lt;/b&gt;: ${cleanTitle} &lt;br&gt;&lt;i&gt;Sprint ${task.sprint_number} | ${task.points} pts (${task.hours}h)&lt;/i&gt;`;

      xml += `
        <mxCell id="lbl_${task.id}" value="${labelText}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=${isSub ? '#0F172A' : '#1E293B'};strokeColor=${isSub ? '#0D9488' : '#334155'};fontColor=#F8FAFC;align=left;spacingLeft=10;fontSize=11;" vertex="1" parent="1">
          <mxGeometry x="${isSub ? 60 : 40}" y="${taskY}" width="${isSub ? 400 : 420}" height="42" as="geometry" />
        </mxCell>
        <mxCell id="${task.id}" value="&lt;b&gt;${task.id}&lt;/b&gt; (${task.points} pts)" style="rounded=1;whiteSpace=wrap;html=1;${style}fontSize=11;align=center;" vertex="1" parent="1">
          <mxGeometry x="${barX}" y="${taskY + 4}" width="${barW}" height="34" as="geometry" />
        </mxCell>
`;

      (task.dependencies || []).forEach((depId, depIdx) => {
        xml += `
        <mxCell id="edge_${depId}_${task.id}_${depIdx}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#F59E0B;strokeWidth=2;endArrow=classic;dashed=1;" edge="1" parent="1" source="${depId}" target="${task.id}">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
`;
      });
    });

    xml += `
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Agile_Sprint_Gantt_Chart_${new Date().toISOString().slice(0, 10)}.drawio`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (requirements.length === 0 && allTasks.length === 0 && !hasLoadedDemo) {
    return (
      <div className="space-y-6 text-slate-100 p-4 sm:p-8 animate-in fade-in duration-300">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-10 text-center max-w-2xl mx-auto shadow-2xl space-y-6">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Calendar size={32} />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white tracking-tight">
              Fresh Workspace: No Requirements or User Stories Found
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-lg mx-auto">
              You are signed in with a clean user workspace. Upload your Software Requirement Specification (SRS) in the Development Artifact Module or create user stories to automatically generate Agile Sprints, ILP Knapsack Optimization, CPM Critical Path, and Gantt charts.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onNavigateToArtifacts && (
              <button
                onClick={onNavigateToArtifacts}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
              >
                <Sparkles size={14} />
                <span>Go to Development Artifacts (Upload SRS)</span>
              </button>
            )}

            {onNavigateToAddStories && (
              <button
                onClick={onNavigateToAddStories}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <span>➕ Add Custom User Story</span>
              </button>
            )}

            <button
              onClick={() => setHasLoadedDemo(true)}
              className="px-4 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <span>💡 Load Demo Starter Stories</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm dark:shadow-xl backdrop-blur-md">
        <div className="space-y-1.5">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex flex-wrap items-center gap-3">
            <span className="text-slate-900 dark:text-slate-100 shrink-0">Sprint Plan for:</span>
            
            {/* Project Selection Dropdown */}
            <div className="relative inline-flex items-center">
              <select
                value={
                  projectOptions.some(p => String(p.project_id || p.id) === String(currentSelectedProjectId))
                    ? currentSelectedProjectId
                    : (projectOptions.find(p => p.name.toLowerCase() === activeProjectTitle.toLowerCase())?.id || activeProjectTitle)
                }
                onChange={(e) => handleProjectChange(e.target.value)}
                disabled={isSwitchingProject}
                className="appearance-none font-mono font-bold tracking-wide text-sm sm:text-base md:text-lg pl-4 pr-10 py-1.5 rounded-2xl bg-indigo-50/90 hover:bg-indigo-100/90 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 border-2 border-indigo-300 dark:border-indigo-500/60 hover:border-indigo-500 dark:hover:border-indigo-400 text-indigo-950 dark:text-indigo-200 shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-60"
                title="Select project to switch Sprint Plan, Roadmap, and Kanban view"
              >
                {projectOptions.map((proj) => {
                  const pVal = String(proj.project_id || proj.id || proj.name);
                  const pLabel = proj.project_name || proj.name || 'Agile Project';
                  const count = proj.requirement_count ? ` (${proj.requirement_count} reqs)` : '';
                  return (
                    <option key={pVal} value={pVal} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans py-1.5 text-sm">
                      {pLabel}{count}
                    </option>
                  );
                })}
              </select>
              <div className="pointer-events-none absolute right-3 flex items-center text-indigo-600 dark:text-indigo-400">
                {isSwitchingProject ? (
                  <RefreshCw size={15} className="animate-spin text-indigo-500" />
                ) : (
                  <ChevronDown size={18} />
                )}
              </div>
            </div>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Automated Sprint Allocation, Gantt Roadmap, and Kanban Deliverables generated specifically for{" "}
            <strong className="text-indigo-600 dark:text-indigo-300 font-mono">{activeProjectTitle}</strong> requirements.
          </p>
        </div>

        {/* Stories and Story Points Summary Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-black px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-600/20 dark:text-indigo-200 dark:border-indigo-500/40 shadow-sm">
            {allTasks.length} User Stories • {allTasks.reduce((sum, t) => sum + (t.story_points || t.points || 0), 0)} Story Points
          </span>
        </div>
      </div>

      {/* Customizer Success Toast */}
      {customizerNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400" />
            <span>{customizerNotice}</span>
          </div>
          <button onClick={() => setCustomizerNotice(null)} className="text-emerald-500 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}


      {/* Tab 1: Sprints Breakdown View */}
      {activeTab === "plan" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {sprints.map((sprint, idx) => {
            const currentCap = capacities[sprint.sprint_number - 1] || sprint.total_points || 40;
            const utilization = Math.min(100, Math.round((sprint.total_points / currentCap) * 100));

            return (
              <div key={idx} className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl space-y-4 transition-colors">
                {/* Production Design System Sprint Capacity Meter */}
                <SprintCapacityBar
                  committedPoints={sprint.total_points || 0}
                  capacityPoints={currentCap}
                  sprintName={`Sprint ${sprint.sprint_number} (${sprint.sprint_number === 1 ? 'MVP Core Architecture' : 'Incremental Release'})`}
                  developerCount={5}
                  tasksCount={sprint.stories.length}
                />

                {/* Sprint Header & Progress Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3 pt-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-600/30 border border-indigo-200 dark:border-indigo-500/50 rounded-xl font-mono font-black text-sm text-indigo-700 dark:text-indigo-300">
                      SPRINT {sprint.sprint_number}
                    </span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      {sprint.stories.length} User Stories
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      • {sprint.total_hours} hrs effort
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                      {sprint.done_points || 0}/{sprint.total_points} pts Delivered ({sprint.total_points > 0 ? Math.round(((sprint.done_points || 0) / sprint.total_points) * 100) : 0}%)
                    </span>
                  </div>

                  {/* Dynamic Capacity Bar */}
                  <div className="flex items-center gap-3">
                    <div className="w-36 bg-slate-100 dark:bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-700">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          utilization > 100 ? 'bg-rose-500' : utilization >= 90 ? 'bg-emerald-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(100, utilization)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
                      {sprint.total_points}/{currentCap} pts ({utilization}%)
                    </span>
                  </div>
                </div>

                {/* Stories Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-3">Story ID</th>
                        <th className="p-3">Title & Context</th>
                        <th className="p-3">Priority Tier</th>
                        <th className="p-3 text-center">Live Status</th>
                        <th className="p-3">DAG Dependencies</th>
                        <th className="p-3 text-center">Points</th>
                        <th className="p-3 text-center">Effort (Hrs)</th>
                        <th className="p-3 text-center">AI Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const rawStories = sprint.stories || [];
                        const sortedStories = [...rawStories].sort((a, b) => {
                          const aId = a.story_id || a.id;
                          const bId = b.story_id || b.id;
                          
                          const isPrereqDone = (depId) => {
                            const dTask = (allTasks || []).find(t => (t.story_id === depId || t.id === depId));
                            return dTask ? dTask.status === 'Done' : false;
                          };
                          const isBlockedA = (a.dependencies || []).some(d => !isPrereqDone(d));
                          const isBlockedB = (b.dependencies || []).some(d => !isPrereqDone(d));

                          const activeUnblocksA = (allTasks || []).filter(t => t.status !== 'Done' && (t.dependencies || []).includes(aId)).length;
                          const activeUnblocksB = (allTasks || []).filter(t => t.status !== 'Done' && (t.dependencies || []).includes(bId)).length;

                          // 1. Blocker stories first!
                          if (activeUnblocksA > 0 && activeUnblocksB === 0) return -1;
                          if (activeUnblocksB > 0 && activeUnblocksA === 0) return 1;
                          if (activeUnblocksA !== activeUnblocksB) return activeUnblocksB - activeUnblocksA;

                          // 2. Unblocked before blocked
                          if (!isBlockedA && isBlockedB) return -1;
                          if (isBlockedA && !isBlockedB) return 1;

                          // 3. Priority tier
                          const pWeight = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
                          const pA = pWeight[(a.priority_tier || a.priority || 'MEDIUM').toUpperCase()] || 2;
                          const pB = pWeight[(b.priority_tier || b.priority || 'MEDIUM').toUpperCase()] || 2;
                          if (pA !== pB) return pB - pA;

                          return String(aId).localeCompare(String(bId));
                        });

                        return sortedStories.map((story, i) => {
                          const tier = story.priority_tier || (story.priority === 'HIGH' ? 'HIGH' : 'LOW');
                          const status = story.status || "To Do";
                          const hasSubtasks = story.sub_tasks && story.sub_tasks.length > 0;
                          const isExpanded = expandedSubtasks[story.story_id] !== false; // expanded by default
                          const isHighOrCritical = tier === 'CRITICAL' || tier === 'HIGH' || story.priority === 'HIGH';

                          const activeUnblocks = (allTasks || []).filter(t => t.status !== 'Done' && (t.dependencies || []).includes(story.story_id)).map(t => t.story_id);
                          const totalUnblocks = (allTasks || []).filter(t => (t.dependencies || []).includes(story.story_id)).map(t => t.story_id);

                          return (
                            <React.Fragment key={story.story_id || i}>
                              <tr className={`border-b border-slate-200 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${hasSubtasks ? 'bg-slate-50/70 dark:bg-slate-800/40' : ''}`}>
                                <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-bold whitespace-nowrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {hasSubtasks && (
                                      <button
                                        onClick={() => toggleSubtasks(story.story_id)}
                                        className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                                        title={isExpanded ? "Collapse sub-tasks" : "Expand sub-tasks"}
                                      >
                                        {isExpanded ? <ChevronDown size={14} className="text-indigo-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                                      </button>
                                    )}
                                    <span>{story.story_id}</span>
                                    {activeUnblocks.length > 0 && status !== 'Done' && (
                                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/25 border border-indigo-500/50 text-indigo-300 flex items-center gap-0.5 shadow-sm shrink-0">
                                        <Zap size={9} className="text-yellow-400" />
                                        <span>Blocker • Finish 1st</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 font-semibold text-white">
                                  <div>{cleanStoryTitle(story.title)}</div>
                                  {story.reason && (
                                    <p className="text-[10px] text-slate-400 mt-0.5">{story.reason}</p>
                                  )}
                                  {hasSubtasks && (
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold font-mono flex items-center gap-1">
                                        <Layers size={10} className="text-indigo-400" />
                                        <span>🧩 Decomposed ({story.sub_tasks.length} Sub-tasks)</span>
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        {story.sub_tasks.filter(s => s.status === 'Done').length}/{story.sub_tasks.length} Done
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border shadow-sm ${
                                    tier === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                                    tier === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                                    tier === 'MEDIUM' ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' :
                                    'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                  }`}>
                                    {tier}
                                  </span>
                                </td>
                                <td className="p-3 text-center whitespace-nowrap">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border font-mono ${
                                    status === 'Done' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' :
                                    status === 'In Progress' ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 animate-pulse' :
                                    status === 'QA Review' ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' :
                                    'bg-slate-800 border-slate-700 text-slate-400'
                                  }`}>
                                    {status === 'Done' ? '✓ Done' : status === 'In Progress' ? '⚡ In Progress' : status === 'QA Review' ? '🔍 QA Review' : '📝 To Do'}
                                  </span>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  <div className="space-y-1">
                                    {story.dependencies && story.dependencies.length > 0 ? (
                                      <div className="flex flex-wrap gap-1 items-center">
                                        <span className="text-[10px] text-slate-400 font-mono">Depends on:</span>
                                        {story.dependencies.map((dep, dIdx) => (
                                          <span key={dIdx} className="px-1.5 py-0.2 bg-indigo-500/10 border border-indigo-500/30 rounded text-[10px] font-mono text-indigo-300">
                                            🔗 {dep}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 italic block">No prerequisites</span>
                                    )}

                                    {totalUnblocks.length > 0 && (
                                      <div className="flex flex-wrap gap-1 items-center pt-0.5">
                                        <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-0.5">
                                          <Zap size={9} className="text-yellow-400" />
                                          <span>Unblocks:</span>
                                        </span>
                                        {totalUnblocks.map((uId, uIdx) => (
                                          <span key={uIdx} className="px-1.5 py-0.2 bg-amber-500/15 border border-amber-500/30 rounded text-[10px] font-mono text-amber-300 font-bold">
                                            ⚡ {uId}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3 font-bold text-center font-mono text-indigo-400">
                                  {story.story_points}
                                </td>
                              <td className="p-3 text-center text-slate-400 font-mono">
                                {story.estimated_hours} hrs
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                {hasSubtasks ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-sm ${
                                      isHighOrCritical 
                                        ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300' 
                                        : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-300'
                                    }`}>
                                      <span>{isHighOrCritical ? '🤖 Auto-Split' : '✂️ User-Split'}</span>
                                    </span>
                                    {!isHighOrCritical && (
                                      <button
                                        onClick={() => handleRevertDecomposition(story.story_id)}
                                        className="px-2 py-0.5 rounded-md bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-700/40 text-[10px] font-bold transition-all"
                                        title="Revert back to a single user story"
                                      >
                                        Revert
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleOpenDecomposer(story)}
                                      className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold transition-all flex items-center gap-1"
                                      title="View Gherkin BDD Acceptance Test Criteria"
                                    >
                                      <FileCode size={11} className="text-amber-400" />
                                      <span>BDD</span>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleOpenDecomposer(story)}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold transition-all flex items-center gap-1.5 shadow-sm mx-auto group"
                                    title="Manually decompose this Low/Medium story into sub-tasks and add to sprint plan"
                                  >
                                    <Scissors size={12} className="text-indigo-400 group-hover:rotate-45 transition-transform" />
                                    <span>Decompose</span>
                                  </button>
                                )}
                              </td>
                            </tr>

                            {/* Nested Sub-Tasks Row */}
                            {hasSubtasks && isExpanded && (
                              <tr className="bg-slate-950/70 border-b border-slate-800/80">
                                <td colSpan="8" className="p-3 pl-8 sm:pl-10">
                                  <div className="bg-slate-900/90 rounded-2xl border border-indigo-500/30 p-3.5 space-y-3 shadow-inner">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-2">
                                      <div className="flex items-center gap-2">
                                        <Layers size={14} className="text-indigo-400" />
                                        <span className="text-xs font-black text-white uppercase tracking-wider">
                                          ↳ Decomposed Sub-Tasks & Atomic Deliverables for {story.story_id}
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold">
                                          {story.sub_tasks.filter(s => s.status === 'Done').length} of {story.sub_tasks.length} Completed
                                        </span>
                                      </div>

                                      <div className="text-[11px] font-mono text-slate-400">
                                        Total Effort: <b className="text-slate-200">{story.sub_tasks.reduce((sum, s) => sum + (s.points || s.story_points || 0), 0)} pts</b> ({story.sub_tasks.reduce((sum, s) => sum + (s.hours || s.estimated_hours || 0), 0)} hrs)
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      {story.sub_tasks.map((sub, sIdx) => {
                                        const subStatus = sub.status || "To Do";
                                        const subPoints = sub.points || sub.story_points || 1;
                                        const subHours = sub.hours || sub.estimated_hours || (subPoints * 8);
                                        const isDetailExpanded = Boolean(expandedSubtaskDetails[sub.id]);

                                        return (
                                          <div 
                                            key={sIdx} 
                                            onClick={() => toggleSubtaskDetail(sub.id)}
                                            className={`p-3 rounded-xl bg-slate-950/90 border transition-all text-xs cursor-pointer select-text ${
                                              isDetailExpanded 
                                                ? 'border-indigo-500/70 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/30' 
                                                : 'border-slate-800 hover:border-indigo-500/40 hover:bg-slate-900/60'
                                            }`}
                                            title={isDetailExpanded ? "Click to collapse sub-task details" : "Click to read full sub-task details and technical scope"}
                                          >
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                              <div className="flex items-start md:items-center gap-2.5 min-w-0 flex-1">
                                                <span className="font-mono font-bold text-sky-400 text-xs px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/40 shrink-0 flex items-center gap-1 mt-0.5 md:mt-0">
                                                  <span>↳</span>
                                                  <span>{sub.id}</span>
                                                </span>
                                                <span className={`font-semibold transition-all ${
                                                  isDetailExpanded 
                                                    ? 'text-white whitespace-normal break-words leading-relaxed' 
                                                    : 'truncate text-slate-200'
                                                } ${subStatus === 'Done' ? 'line-through text-slate-500' : ''}`}>
                                                  {cleanStoryTitle(sub.title)}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSubtaskDetail(sub.id);
                                                  }}
                                                  className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-500/30 text-indigo-300 font-mono font-bold shrink-0 ml-1.5 transition-all flex items-center gap-1"
                                                >
                                                  {isDetailExpanded ? (
                                                    <>
                                                      <ChevronDown size={11} className="rotate-180 transition-transform" />
                                                      <span>Collapse</span>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <ChevronDown size={11} className="transition-transform" />
                                                      <span>Read Full</span>
                                                    </>
                                                  )}
                                                </button>
                                              </div>

                                              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto" onClick={(e) => e.stopPropagation()}>
                                                <span className="font-mono text-indigo-300 font-bold text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                                  {subPoints} pts ({subHours}h)
                                                </span>

                                                {/* Interactive Sub-task Status Dropdown */}
                                                <select
                                                  value={subStatus}
                                                  onChange={(e) => handleUpdateSubtaskStatus(story.story_id, sub.id, e.target.value)}
                                                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border focus:outline-none font-mono cursor-pointer transition-all ${
                                                    subStatus === 'Done' 
                                                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300' 
                                                      : subStatus === 'In Progress' 
                                                      ? 'bg-sky-950/80 border-sky-500/50 text-sky-300' 
                                                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-850'
                                                  }`}
                                                >
                                                  <option value="To Do">📝 To Do</option>
                                                  <option value="In Progress">⚡ In Progress</option>
                                                  <option value="Done">✓ Done</option>
                                                </select>

                                                {/* View Gherkin BDD scenario modal button */}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenDecomposer({ ...sub, story_id: sub.id });
                                                  }}
                                                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold flex items-center gap-1 transition-all"
                                                  title="View Gherkin BDD Acceptance Test Criteria"
                                                >
                                                  <FileCode size={12} className="text-amber-400" />
                                                  <span>BDD</span>
                                                </button>
                                              </div>
                                            </div>

                                            {/* Expanded Full Sub-Task Details Section */}
                                            {isDetailExpanded && (
                                              <div className="mt-3 pt-3 border-t border-slate-800/90 space-y-2.5 cursor-default" onClick={(e) => e.stopPropagation()}>
                                                <div className="p-3 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-1">
                                                  <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider block">
                                                    📋 Full Deliverable Title:
                                                  </span>
                                                  <p className="text-xs font-bold text-white leading-relaxed">
                                                    {cleanStoryTitle(sub.title)}
                                                  </p>
                                                </div>

                                                {sub.description && (
                                                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                                                    <span className="text-[10px] uppercase font-bold text-sky-400 tracking-wider block">
                                                      🛠️ Technical Implementation Scope & Architecture:
                                                    </span>
                                                    <p className="text-xs text-slate-300 leading-relaxed">
                                                      {sub.description}
                                                    </p>
                                                  </div>
                                                )}

                                                {sub.gherkin_criteria && (
                                                  <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 space-y-1.5 font-mono text-[11px] text-amber-200/95 leading-relaxed">
                                                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
                                                      <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1.5 font-sans">
                                                        <FileCode size={12} />
                                                        <span>Gherkin BDD Acceptance Test Scenarios</span>
                                                      </span>
                                                      <span className="text-[10px] text-slate-500 font-sans">Automated Test Assertions</span>
                                                    </div>
                                                    <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-amber-200/90 overflow-x-auto">
                                                      {sub.gherkin_criteria}
                                                    </pre>
                                                  </div>
                                                )}

                                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                                                  <span className="font-mono">
                                                    Parent User Story: <strong className="text-indigo-300">{story.story_id}</strong> • Effort: <strong className="text-white">{subPoints} Story Points ({subHours} Working Hours)</strong>
                                                  </span>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleOpenDecomposer({ ...sub, story_id: sub.id })}
                                                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm"
                                                  >
                                                    <FileCode size={12} className="text-amber-400" />
                                                    <span>Open Full Modal View</span>
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      });
                    })()}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Interactive Kanban Board View */}
      {activeTab === "kanban" && (
        <SprintKanbanBoard 
          tasks={allTasks}
          capacities={capacities}
          sprints={sprints}
          totalSprints={effectiveTotalSprints}
          onCardMoved={(data) => {
            if (data) processSprintData(data);
            fetchSprintPlan();
            fetchGanttData();
          }}
          onRefresh={fetchSprintPlan}
          onDecomposeClick={handleOpenDecomposer}
        />
      )}

      {/* Tab: Dynamic Burndown & Velocity Analytics */}
      {activeTab === "burndown" && (
        <SprintBurndownAnalytics 
          tasks={allTasks}
          capacities={capacities}
          sprints={sprints}
          totalSprints={effectiveTotalSprints}
        />
      )}

      {/* Tab 2: Interactive Gantt / Sprint Timeline View */}
      {activeTab === "gantt" && ganttData && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Custom Project Timeline Parameters Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles size={15} />
                  <span>Customized Agile Schedule & Working Calendar ({activeProjectTitle})</span>
                </div>
                <h3 className="text-lg font-extrabold text-white mt-1">
                  Delivery Roadmap for {activeProjectTitle}: {ganttData.project_start} ➔ {ganttData.project_end}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calculated using business working days (weekends skipped) and official holiday exclusions.
                </p>
              </div>
            </div>


            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/60 text-xs">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Sprint Duration:</span>
                  <span className="text-white font-bold text-sm block">
                    {ganttData.config?.sprint_duration_weeks || 2} Weeks ({ganttData.sprints?.[0]?.working_days || 10} working days)
                  </span>
                </div>
                {(ganttData.project_start && ganttData.project_end) && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold">
                    <Calendar size={12} className="text-emerald-400 shrink-0" />
                    <span>{ganttData.project_start} ➔ {ganttData.project_end}</span>
                  </div>
                )}
              </div>
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Total Working Days:</span>
                <span className="text-indigo-300 font-bold text-sm">
                  {ganttData.total_working_days || (ganttData.sprints?.length * 10)} Days Active
                </span>
              </div>
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">Active Holiday Exclusions:</span>
                <span className="text-amber-400 font-bold text-sm">
                  {activeRoadmapHolidays.length} Day{activeRoadmapHolidays.length === 1 ? '' : 's'} Off Excluded
                </span>
              </div>
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
                <span className="text-slate-400 block text-[11px]">QA & Risk Buffer:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  +{ganttData.config?.buffer_percentage || 10}% Duration Padding
                </span>
              </div>
            </div>

            {/* Comprehensive Skipped & Active Holidays Panel */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Palmtree size={14} className="text-amber-400 animate-pulse" />
                  <span>Excluded Public, Mercantile & Poya Holidays in Delivery Roadmap:</span>
                </span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-bold">
                  {activeRoadmapHolidays.length > 0 ? "Auto-shifted past deadlines" : "No holiday collisions"}
                </span>
              </div>
              
              {activeRoadmapHolidays.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {activeRoadmapHolidays.map((h, hIdx) => {
                    const hName = typeof h === 'string' ? h : h.name;
                    const hDate = typeof h === 'object' ? h.date : '';
                    const hSprint = typeof h === 'object' ? h.sprint : null;
                    const hCat = typeof h === 'object' ? h.category : null;

                    return (
                      <div key={hIdx} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 font-medium shadow-sm hover:bg-amber-500/25 transition-all">
                        <span className="font-black text-white font-mono">{hDate}</span>
                        <span className="text-amber-300 font-bold">• {hName}</span>
                        {hSprint && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-900/60 border border-amber-700/50 text-amber-200 font-black">
                            Sprint {hSprint}
                          </span>
                        )}
                        {hCat && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-950/60 border border-indigo-800/50 text-indigo-300 font-bold">
                            {hCat}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-2 px-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓ Zero Holiday Collisions:</span>
                  <span>No public or mercantile holidays fall within the project window ({ganttData.project_start} ➔ {ganttData.project_end}). All planned sprint days are standard working days.</span>
                </div>
              )}
            </div>
          </div>


          <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-sm dark:shadow-xl space-y-6 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="text-indigo-600 dark:text-indigo-400" size={20} />
                  Agile Sprint Delivery Timeline & Gantt Schedule
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Project Range: {ganttData.project_start} ➔ {ganttData.project_end} ({ganttData.total_calendar_days || ganttData.total_duration_days} Calendar Days)
                </p>
              </div>

              {/* Quick Image, Draw.io, Excel, Jira & Azure DevOps Download in Gantt Tab */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadExcel}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-900/30"
                  title="Download editable Microsoft Excel spreadsheet (.xlsx)"
                >
                  <Download size={13} />
                  <span>Download Excel (.xlsx)</span>
                </button>
                <button
                  onClick={handleDownloadJira}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 border border-blue-400/50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-blue-900/30"
                  title="Download official Jira import-compatible CSV"
                >
                  <Download size={13} />
                  <span>Jira CSV</span>
                </button>
                <button
                  onClick={handleDownloadAzure}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  title="Download Azure DevOps work items CSV"
                >
                  <Download size={13} />
                  <span>Azure DevOps</span>
                </button>
                <button
                  onClick={() => downloadGanttImage("png")}
                  className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/50 text-emerald-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  title="Download High-Res PNG Gantt Image"
                >
                  <FileImage size={13} />
                  <span>Download Image (PNG)</span>
                </button>
                <button
                  onClick={downloadDrawioXML}
                  className="px-3 py-1.5 bg-amber-600/30 hover:bg-amber-600 border border-amber-500/50 text-amber-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                  title="Open and edit in diagrams.net / draw.io"
                >
                  <PenTool size={13} />
                  <span>Edit in Draw.io</span>
                </button>
              </div>
            </div>

            {/* Sprints Summary Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {ganttData.sprints?.map((s, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-slate-700/70 p-4 rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-indigo-300">{s.name}</span>
                    <span className="text-xs font-mono font-bold text-amber-400">{s.total_points} pts</span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-mono font-bold">{s.start_date} ➔ {s.end_date}</p>
                  <p className="text-[11px] text-slate-400">
                    {s.stories_count} Stories • {s.total_hours} hrs • {s.working_days} working days
                  </p>
                  {s.holidays && s.holidays.length > 0 ? (
                    <div className="pt-1 flex flex-wrap gap-1">
                      {s.holidays.map((sh, shIdx) => (
                        <span key={shIdx} className="text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                          🌴 Skipped: {sh.name} ({sh.date})
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="pt-0.5">
                      <span className="text-[10px] text-slate-500 italic">
                        No public holidays inside this sprint window
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Gantt Timeline Story Rows */}
            <div className="space-y-3">
              {sortTasksNaturally(ganttData.tasks || []).map((task, i) => {
                const isSubtask = Boolean(task.is_subtask);
                const tierColor = 
                  task.priority_tier === 'CRITICAL' ? 'bg-rose-600' :
                  task.priority_tier === 'HIGH' ? 'bg-amber-600' :
                  task.priority_tier === 'MEDIUM' ? 'bg-sky-600' : 'bg-emerald-600';

                return (
                  <div 
                    key={task.id || i} 
                    className={`border transition-all space-y-2 rounded-xl ${
                      isSubtask 
                        ? 'ml-6 sm:ml-8 pl-4 py-2.5 pr-3.5 bg-slate-950/70 border-l-4 border-l-teal-500 border-slate-800/80 hover:border-teal-500/50' 
                        : 'p-3.5 bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {isSubtask ? (
                          <span className="font-mono font-bold text-xs text-teal-400 flex items-center gap-1">
                            <span>↳</span>
                            <span>{task.id}</span>
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-xs text-emerald-400">{task.id}</span>
                        )}
                        <span 
                          onClick={() => {
                            if (isSubtask) {
                              handleOpenDecomposer({ ...task, story_id: task.id });
                            }
                          }}
                          className={`text-xs ${isSubtask ? 'cursor-pointer hover:text-indigo-300 hover:underline' : ''} truncate max-w-md ${isSubtask ? 'text-slate-300 font-medium' : 'font-bold text-white'}`}
                          title={isSubtask ? `Click to view full details for ${task.id}: ${cleanStoryTitle(task.title)}` : cleanStoryTitle(task.title)}
                        >
                          {cleanStoryTitle(task.title)}
                        </span>
                        
                        {isSubtask ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] px-2 py-0.2 rounded bg-teal-500/15 text-teal-300 font-mono font-bold border border-teal-500/30">
                              Sub-Task
                            </span>
                            <button
                              onClick={() => handleOpenDecomposer({ ...task, story_id: task.id })}
                              className="text-[10px] px-2 py-0.2 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono font-bold border border-amber-500/30 flex items-center gap-1 transition-all"
                              title="Click to view full sub-task details, scope, and BDD criteria"
                            >
                              <FileCode size={10} className="text-amber-400" />
                              <span>Details</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                              Sprint {task.sprint_number}
                            </span>
                            {task.has_subtasks ? (
                              <span className="text-[10px] px-2 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold border border-indigo-500/40 flex items-center gap-1">
                                <span>🧩</span>
                                <span>Decomposed ({task.sub_tasks?.length || 3} units)</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenDecomposer(task)}
                                className="text-[10px] px-2 py-0.5 rounded bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 font-mono font-bold border border-indigo-500/40 flex items-center gap-1 transition-all"
                                title="Manually decompose this story into sub-tasks"
                              >
                                <Scissors size={10} className="text-indigo-400" />
                                <span>Decompose</span>
                              </button>
                            )}
                          </>
                        )}

                        {task.status && (
                          <span className={`text-[10px] px-2 py-0.2 rounded-full font-mono font-bold ${
                            task.status === 'Done' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                            task.status === 'In Progress' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' :
                            'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {task.status}
                          </span>
                        )}

                        {task.holiday_affected && task.holidays && task.holidays.length > 0 && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1">
                            <Palmtree size={11} className="text-amber-400" />
                            <span>Skipped: {task.holidays.map(h => `${h.name} (${h.date})`).join(', ')}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono text-slate-300">{task.start_date} ➔ {task.end_date}</span>
                        <span className="text-slate-400 text-[11px]">({task.duration_working_days || task.duration_days} w-days)</span>
                        <span className={`font-bold font-mono ${isSubtask ? 'text-teal-400' : 'text-indigo-400'}`}>
                          {task.points} pts ({task.hours}h)
                        </span>
                      </div>
                    </div>

                    {/* Gantt Bar Visualization */}
                    <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isSubtask ? 'bg-gradient-to-r from-teal-500 to-cyan-400' : tierColor
                        }`}
                        style={{ width: `${Math.max(20, (task.duration_working_days || task.duration_days) * 16)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Automated Critical Path Method (CPM) & Float/Slack Analyzer */}
      {activeTab === "cpm" && (
        <SprintCPMAnalyzer 
          tasks={allTasks}
          onStoryClick={handleOpenDecomposer}
        />
      )}

      {/* Tab 3: Developer Workload Heatmap & Skill-Based Allocation View */}
      {activeTab === "team" && (
        <DeveloperWorkloadHeatmap 
          workloadData={workloadData}
          developers={developers}
          tasks={allTasks}
          balanceScore={balanceScore}
          onAutoBalance={handleAutoBalanceTeam}
          onReassignDeveloper={handleReassignDeveloper}
          onOpenManageTeam={() => setIsManageTeamOpen(true)}
          loading={teamLoading}
        />
      )}

      {/* Tab 4: Dependency Network View */}
      {activeTab === "dag" && dagData && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Network className="text-indigo-400" size={22} />
                <h3 className="text-base font-bold text-white">Dependency Network & Prerequisite Flow</h3>
              </div>
              <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full">
                ✓ Validated: 0 Circular Cycles
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dagData.nodes?.map((node, i) => (
                <div key={i} className="bg-slate-900/90 border border-slate-700/80 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-emerald-400">{node.id}</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      Sprint {node.sprint}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-white truncate">{node.label}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                    <span>{node.points} pts</span>
                    {node.unblock_power > 0 ? (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        ⚡ Unblocks {node.unblock_power} stories
                      </span>
                    ) : (
                      <span className="text-slate-500">Terminal Node</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Prerequisite Edges Table */}
            <div className="mt-4 pt-4 border-t border-slate-700">
              <h4 className="text-xs font-bold text-slate-300 uppercase mb-3">Enforced Dependency Constraints (ILP Inequalities)</h4>
              <div className="space-y-2">
                {dagData.links?.map((link, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-indigo-400 font-bold">{link.source} (Sprint {link.source_sprint})</span>
                      <ArrowRight size={14} className="text-slate-500" />
                      <span className="font-mono text-emerald-400 font-bold">{link.target} (Sprint {link.target_sprint})</span>
                    </div>
                    <span className="text-emerald-400 font-bold text-[11px]">
                      ✓ Sprint({link.source}) ≤ Sprint({link.target}) Satisfied
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: 3-Way Benchmark Comparison View */}
      {activeTab === "benchmark" && benchmark && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="text-amber-400" size={20} />
              Scientific 3-Way Optimizer Benchmark
            </h3>
            <p className="text-xs text-slate-400">
              Evaluation of the Proposed ILP Global Optimizer against classical 0/1 Knapsack DP and Greedy Heuristics
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="p-3">Model</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Global Value</th>
                    <th className="p-3">Sprint 1 Util.</th>
                    <th className="p-3">High-Priority Fit</th>
                    <th className="p-3">DAG Violations</th>
                    <th className="p-3">Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {benchmark.models?.map((m, idx) => (
                    <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="p-3 font-bold text-white">{m.name}</td>
                      <td className="p-3 text-slate-400">{m.type}</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{m.global_value} pts</td>
                      <td className="p-3 font-mono">{m.sprint1_utilization}%</td>
                      <td className="p-3 font-mono">{m.critical_fulfillment}%</td>
                      <td className={`p-3 font-bold ${m.dep_violations === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.dep_violations}
                      </td>
                      <td className="p-3 font-bold">{m.rank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Handshake to Resource Management Module (Manage Resources) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-2 border-indigo-500/40 p-6 sm:p-8 rounded-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 mt-8 animate-in fade-in duration-300">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center gap-1.5 shadow-sm">
              <Users size={14} className="text-emerald-400" />
              <span>Staff Allocation Handoff Ready ({allTasks.length} Stories • {sprints.length} Sprints)</span>
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Sprint Plan Ready for Resource Management
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Sprint workloads, developer skill tags, story points, and timeline schedule ranges from this sprint plan have been prepared for the Resource Management module. Click below to proceed to staff & team allocation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
          <button
            onClick={handleHandoffToResources}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-2xl text-sm font-black shadow-xl shadow-emerald-900/40 transition-all flex items-center justify-center gap-2.5 border border-emerald-400/40 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Users size={18} className="text-emerald-200" />
            <span>Manage Resources</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* 5-Question AI Timeline Customizer Modal */}
      <SprintCustomizerModal
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        onApplySuccess={handleCustomizerApplied}
        currentCapacities={capacities}
      />

      {/* 1-Click AI Story Decomposer & Gherkin BDD Modal */}
      <StoryDecomposerModal
        isOpen={isDecomposerOpen}
        story={selectedStoryToDecompose}
        onClose={() => setIsDecomposerOpen(false)}
        onApplySuccess={handleDecompositionApplied}
      />
    </div>
  );
}