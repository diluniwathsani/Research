import React, { useState, useMemo } from 'react';
import { 
  Cpu, Layers, Users, Calendar, Clock, ChevronDown, ChevronRight, 
  ListChecks, Sparkles, Filter, Search, CheckCircle2, AlertCircle, Code, Tag
} from 'lucide-react';

export default function TaskPreview({ 
  tasks = [], 
  workItems = [],
  sprintDetails = null,
  onRunAllocation, 
  hasAssignments = false,
  onViewAssignments,
  onOpenManageTeam,
  loading = false, 
  apiSource, 
  apiStatus 
}) {
  // Default to 'work_items' so sprint work items generated from Project Management module are displayed directly
  const [viewMode, setViewMode] = useState('work_items'); // 'work_items' | 'stories'
  const [expandedSubtasks, setExpandedSubtasks] = useState({});
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const safeTasks = Array.isArray(tasks) ? tasks : (tasks?.data || []);

  // Safe work items derived either directly from prop or decomposed from safeTasks
  const safeWorkItems = useMemo(() => {
    if (Array.isArray(workItems) && workItems.length > 0) {
      return workItems;
    }
    return safeTasks.flatMap((t, tIdx) => {
      const parentId = t.story_id || t.id || `US00${tIdx + 1}`;
      const parentTitle = t.title || 'User Story';
      const parentEpic = t.epic || '';
      const subs = Array.isArray(t.sub_tasks) ? t.sub_tasks : [];
      if (subs.length > 0) {
        return subs.map((sub, sIdx) => {
          const subPts = Number(sub.story_points) || Number(sub.points) || 2;
          const subHrs = Number(sub.estimated_hours) || Number(sub.hours) || (subPts * 8);
          const subId = sub.id || sub.story_id || sub.work_item_id || `${parentId}.${sIdx + 1}`;
          return {
            ...sub,
            id: subId,
            work_item_id: subId,
            story_id: subId,
            parent_story_id: parentId,
            parent_story_title: parentTitle,
            parent_epic: parentEpic,
            sprint_number: t.sprint_number,
            title: sub.title || `Deliverable for ${parentId}`,
            description: sub.description || '',
            story_points: subPts,
            points: subPts,
            estimated_hours: subHrs,
            hours: subHrs,
            domain: sub.domain || sub.required_domain || t.domain || 'Backend',
            required_skills: Array.isArray(sub.required_skills) && sub.required_skills.length > 0
              ? sub.required_skills
              : (sub.skills || t.skills || ['JavaScript']),
            priority_tier: (sub.priority_tier || sub.priority || t.priority || 'MEDIUM').toUpperCase(),
            status: sub.status || 'To Do'
          };
        });
      }
      return [{
        ...t,
        id: parentId,
        work_item_id: parentId,
        story_id: parentId,
        parent_story_id: parentId,
        parent_story_title: parentTitle,
        parent_epic: parentEpic,
        sprint_number: t.sprint_number,
        title: parentTitle,
        description: t.description || '',
        story_points: Number(t.story_points) || Number(t.points) || 5,
        points: Number(t.story_points) || Number(t.points) || 5,
        estimated_hours: Number(t.estimated_hours) || Number(t.hours) || 40,
        hours: Number(t.estimated_hours) || Number(t.hours) || 40,
        domain: t.domain || 'Backend',
        required_skills: t.skills || ['JavaScript'],
        priority_tier: (t.priority_tier || t.priority || 'MEDIUM').toUpperCase(),
        status: t.status || 'To Do'
      }];
    });
  }, [workItems, safeTasks]);

  // Sprint Metrics calculated on the atomic work items
  const totalWorkItems = safeWorkItems.length;
  const totalStories = safeTasks.length;
  const totalPoints = safeWorkItems.reduce((sum, item) => sum + (Number(item.story_points) || Number(item.points) || 0), 0);
  const totalHours = safeWorkItems.reduce((sum, item) => sum + (Number(item.estimated_hours) || Number(item.hours) || 0), 0);

  // Filtered work items according to search and domain
  const filteredWorkItems = useMemo(() => {
    return safeWorkItems.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (item.work_item_id || item.id || '').toLowerCase().includes(q) ||
        (item.parent_story_id || '').toLowerCase().includes(q) ||
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (Array.isArray(item.required_skills) && item.required_skills.some(sk => sk.toLowerCase().includes(q)));

      const itemDom = (item.domain || item.required_domain || 'Backend').toUpperCase();
      const matchesDomain = domainFilter === 'ALL' || 
        (domainFilter === 'BACKEND' && itemDom.includes('BACKEND')) ||
        (domainFilter === 'FRONTEND' && itemDom.includes('FRONTEND')) ||
        (domainFilter === 'DATABASE' && (itemDom.includes('DATABASE') || itemDom.includes('SQL') || itemDom.includes('DATA'))) ||
        (domainFilter === 'AI/ML' && (itemDom.includes('AI') || itemDom.includes('ML')));

      return matchesSearch && matchesDomain;
    });
  }, [safeWorkItems, searchQuery, domainFilter]);

  const toggleSubtasks = (storyId) => {
    setExpandedSubtasks(prev => ({
      ...prev,
      [storyId]: !prev[storyId]
    }));
  };

  const handleToggleAll = (expand) => {
    const next = {};
    safeTasks.forEach(t => {
      const sid = t.story_id || t.id;
      if (t.sub_tasks && t.sub_tasks.length > 0) {
        next[sid] = expand;
      }
    });
    setExpandedSubtasks(next);
  };

  const anySubtasksAvailable = safeTasks.some(t => Array.isArray(t.sub_tasks) && t.sub_tasks.length > 0);
  const allExpanded = anySubtasksAvailable && safeTasks.filter(t => t.sub_tasks?.length > 0).every(t => expandedSubtasks[t.story_id || t.id]);

  return (
    <div className="space-y-6">
      {/* Top Workflow Banner */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                Module 2: Skill-Based Resource Allocation Workflow
              </span>
              {sprintDetails && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Calendar size={12} />
                  <span>
                    {sprintDetails.start_date && sprintDetails.end_date 
                      ? `${sprintDetails.start_date} → ${sprintDetails.end_date}` 
                      : (sprintDetails.sprint_name || `Sprint ${sprintDetails.sprint_number || 1}`)}
                  </span>
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers size={18} className="text-indigo-600 dark:text-indigo-400" />
              <span>Sprint Work Items & Engineering Deliverables</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Work items decomposed from the Project Management Module for {sprintDetails?.sprint_name || `Sprint ${sprintDetails?.sprint_number || 1}`}, ready for skill & capacity resource allocation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {onOpenManageTeam && (
              <button
                onClick={onOpenManageTeam}
                className="px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users size={15} />
                <span>Manage Resources & Skills</span>
              </button>
            )}

            {hasAssignments && (
              <button
                onClick={onViewAssignments}
                className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users size={15} />
                <span>View Allocation Board</span>
              </button>
            )}

            <button
              onClick={onRunAllocation}
              disabled={loading || totalWorkItems === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Cpu size={15} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Allocating Resources...' : 'Allocate Resources'}</span>
            </button>
          </div>
        </div>

        {/* Sprint Summary Metrics Bar */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">Sprint Work Items:</span>
              <strong className="text-sky-600 dark:text-sky-400 font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/30">
                {totalWorkItems} Units
              </strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400">Parent Stories:</span>
              <strong className="text-slate-800 dark:text-white">{totalStories} Stories</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400">Total Points:</span>
              <strong className="text-purple-600 dark:text-purple-400 font-mono">{totalPoints} pts</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400">Total Effort:</span>
              <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{totalHours}h</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {sprintDetails?.working_days && (
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                <Clock size={13} className="text-emerald-500" />
                <span>{sprintDetails.working_days} Working Days ({sprintDetails.working_days * 8}h Sprint Window)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Switcher & Search Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Toggle between Work Items (Default) and Grouped Stories */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('work_items')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'work_items'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-400/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
            }`}
          >
            <ListChecks size={15} />
            <span>Sprint Work Items</span>
            <span className="px-2 py-0.5 rounded-full bg-black/20 text-[10px] font-mono font-bold">{totalWorkItems}</span>
          </button>

          <button
            onClick={() => setViewMode('stories')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'stories'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 ring-2 ring-indigo-400/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Layers size={15} />
            <span>Grouped by Story</span>
            <span className="px-2 py-0.5 rounded-full bg-black/20 text-[10px] font-mono font-bold">{totalStories}</span>
          </button>
        </div>

        {/* Search & Domain Filter Controls for Work Items */}
        {viewMode === 'work_items' && (
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-60">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search work item, ID, skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>

            {/* Domain Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-semibold">
              {['ALL', 'BACKEND', 'FRONTEND', 'DATABASE'].map(dom => (
                <button
                  key={dom}
                  onClick={() => setDomainFilter(dom)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    domainFilter === dom
                      ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {dom === 'ALL' ? 'All' : dom.charAt(0) + dom.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {viewMode === 'stories' && anySubtasksAvailable && (
          <button
            type="button"
            onClick={() => handleToggleAll(!allExpanded)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
          >
            <Layers size={13} className="text-indigo-500" />
            <span>{allExpanded ? 'Collapse All Sub-Tasks' : 'Expand All Sub-Tasks'}</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: SPRINT WORK ITEMS TABLE (PRIMARY DEFAULT VIEW)                    */}
      {/* ========================================================================= */}
      {viewMode === 'work_items' && (
        filteredWorkItems.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Work Item ID</th>
                  <th className="p-3.5 whitespace-nowrap">Parent Story</th>
                  <th className="p-3.5">Deliverable Title & Technical Scope</th>
                  <th className="p-3.5">Domain</th>
                  <th className="p-3.5">Required Skills</th>
                  <th className="p-3.5 text-center">Points</th>
                  <th className="p-3.5 text-center">Hours</th>
                  <th className="p-3.5 text-center">Priority</th>
                  <th className="p-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 bg-white dark:bg-slate-800/90">
                {filteredWorkItems.map((item, idx) => {
                  const itemId = item.work_item_id || item.id || item.story_id;
                  const parentId = item.parent_story_id || item.story_id || 'Story';
                  const dom = (item.domain || item.required_domain || 'Backend').toUpperCase();
                  const isBackend = dom.includes('BACKEND');
                  const isFrontend = dom.includes('FRONTEND');
                  const isDatabase = dom.includes('DATABASE') || dom.includes('SQL') || dom.includes('DATA');
                  const isAI = dom.includes('AI') || dom.includes('ML');

                  const skillsList = Array.isArray(item.required_skills) && item.required_skills.length > 0
                    ? item.required_skills
                    : (Array.isArray(item.skills) && item.skills.length > 0 ? item.skills : ['JavaScript', 'SQL']);

                  return (
                    <tr 
                      key={itemId || idx}
                      className="hover:bg-indigo-50/30 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      {/* Work Item ID */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 dark:bg-sky-950/60 border border-sky-400/30 dark:border-sky-800/50 text-sky-700 dark:text-sky-300 font-mono font-bold text-xs inline-flex items-center gap-1">
                          <span>↳</span>
                          <span>{itemId}</span>
                        </span>
                      </td>

                      {/* Parent Story */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                          {parentId}
                        </div>
                        {item.parent_epic && (
                          <div className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]" title={item.parent_epic}>
                            {item.parent_epic}
                          </div>
                        )}
                      </td>

                      {/* Deliverable Title & Technical Scope */}
                      <td className="p-3.5 max-w-md">
                        <div className="font-semibold text-slate-900 dark:text-white leading-snug">
                          {item.title}
                        </div>
                        {item.description && (
                          <div className="text-[11px] text-slate-400 font-normal mt-0.5 line-clamp-2">
                            {item.description}
                          </div>
                        )}
                        {item.parent_story_title && item.parent_story_title !== item.title && (
                          <div className="text-[10px] text-slate-400/80 italic mt-1 truncate" title={item.parent_story_title}>
                            Story: {item.parent_story_title}
                          </div>
                        )}
                      </td>

                      {/* Domain */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isBackend ? 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30' :
                          isFrontend ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30' :
                          isDatabase ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30' :
                          isAI ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30' :
                          'bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-500/30'
                        }`}>
                          {item.domain || item.required_domain || 'Backend'}
                        </span>
                      </td>

                      {/* Required Skills */}
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {skillsList.map((skill, sIdx) => (
                            <span 
                              key={sIdx} 
                              className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Story Points */}
                      <td className="p-3.5 text-center whitespace-nowrap font-mono font-bold text-purple-600 dark:text-purple-400">
                        {item.story_points || item.points || 2} pts
                      </td>

                      {/* Hours */}
                      <td className="p-3.5 text-center whitespace-nowrap font-mono font-bold text-slate-800 dark:text-slate-200">
                        {item.estimated_hours || item.hours || 16}h
                      </td>

                      {/* Priority */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          (item.priority_tier === 'CRITICAL' || item.priority === 'HIGH')
                            ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30' :
                          (item.priority === 'MEDIUM' || item.priority_tier === 'HIGH')
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30' :
                          'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                        }`}>
                          {item.priority_tier || item.priority || 'MEDIUM'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {item.status || 'To Do'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            No work items match the selected filters for this sprint.
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: GROUPED BY PARENT USER STORY WITH EXPANDABLE SUB-TASKS            */}
      {/* ========================================================================= */}
      {viewMode === 'stories' && (
        safeTasks.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-100 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3.5">Story ID</th>
                  <th className="p-3.5">User Story Title & Acceptance Scope</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5 text-center">Story Points</th>
                  <th className="p-3.5 text-center">Hours</th>
                  <th className="p-3.5">Domain</th>
                  <th className="p-3.5">Required Skills</th>
                  <th className="p-3.5 text-center">Work Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                {safeTasks.map((task, idx) => {
                  const storyId = task.story_id || task.id;
                  const hasSubtasks = Array.isArray(task.sub_tasks) && task.sub_tasks.length > 0;
                  const isExpanded = Boolean(expandedSubtasks[storyId]);

                  return (
                    <React.Fragment key={storyId || idx}>
                      <tr 
                        className={`transition-colors ${
                          isExpanded 
                            ? 'bg-indigo-50/40 dark:bg-indigo-950/20' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/30'
                        }`}
                      >
                        <td className="p-3.5 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          {storyId}
                        </td>

                        <td className="p-3.5 font-semibold text-slate-900 dark:text-white max-w-md">
                          <div className="leading-snug">{task.title}</div>
                          {task.epic && (
                            <div className="mt-1 text-[10px] text-slate-400 font-normal">
                              Epic: <span className="font-semibold text-slate-500 dark:text-slate-300">{task.epic}</span>
                            </div>
                          )}
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            (task.priority_tier === 'CRITICAL' || task.priority === 'HIGH') 
                              ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30' :
                            (task.priority === 'MEDIUM' || task.priority_tier === 'HIGH') 
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30' :
                            'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                          }`}>
                            {task.priority_tier || task.priority || 'MEDIUM'}
                          </span>
                        </td>

                        <td className="p-3.5 font-bold text-purple-600 dark:text-purple-400 text-center whitespace-nowrap">
                          {task.story_points || task.points || 5} pts
                        </td>

                        <td className="p-3.5 font-bold text-slate-800 dark:text-slate-200 text-center whitespace-nowrap">
                          {task.estimated_hours || task.hours || 30}h
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          {(() => {
                            const dom = (task.domain || task.required_domain || 'Backend').toUpperCase();
                            const isBackend = dom.includes('BACKEND');
                            const isFrontend = dom.includes('FRONTEND');
                            const isAI = dom.includes('AI') || dom.includes('ML');
                            return (
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isBackend ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                isFrontend ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                                isAI ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
                                'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                              }`}>
                                {task.domain || task.required_domain || 'Backend'}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {(() => {
                              const skillsList = Array.isArray(task.skills) && task.skills.length > 0
                                ? task.skills
                                : (Array.isArray(task.required_skills) && task.required_skills.length > 0 
                                    ? task.required_skills 
                                    : ['JavaScript', 'SQL']);
                              return skillsList.map((skill, sIdx) => (
                                <span key={sIdx} className="px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-slate-300 text-[10px] font-semibold">
                                  {skill}
                                </span>
                              ));
                            })()}
                          </div>
                        </td>

                        {/* Work Items Expandable Trigger */}
                        <td className="p-3.5 text-center whitespace-nowrap">
                          {hasSubtasks ? (
                            <button
                              type="button"
                              onClick={() => toggleSubtasks(storyId)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                                isExpanded
                                  ? 'bg-indigo-600 text-white shadow-indigo-600/30 ring-2 ring-indigo-400/40'
                                  : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30'
                              }`}
                              title={isExpanded ? "Collapse sub-tasks" : "View sub-tasks breakdown"}
                            >
                              <Layers size={13} className={isExpanded ? 'text-white' : 'text-indigo-400'} />
                              <span>{task.sub_tasks.length} Work Items</span>
                              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              1 Unit (Atomic)
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Nested Sub-Tasks Row */}
                      {hasSubtasks && isExpanded && (
                        <tr className="bg-slate-950/70 border-b border-slate-800">
                          <td colSpan="8" className="p-3 pl-6 sm:pl-10">
                            <div className="bg-slate-900/95 rounded-2xl border border-indigo-500/40 p-4 space-y-3 shadow-lg shadow-black/40">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                    <Layers size={14} />
                                  </span>
                                  <span className="text-xs font-black text-white uppercase tracking-wider">
                                    ↳ Decomposed Work Items for {storyId}
                                  </span>
                                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold border border-indigo-500/30">
                                    {task.sub_tasks.length} Atomic Work Items
                                  </span>
                                </div>

                                <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3">
                                  <span>
                                    Sub-tasks Effort: <strong className="text-purple-400">{task.sub_tasks.reduce((sum, s) => sum + (Number(s.story_points) || Number(s.points) || 0), 0)} pts</strong>
                                  </span>
                                  <span>•</span>
                                  <span>
                                    Total Hours: <strong className="text-indigo-400">{task.sub_tasks.reduce((sum, s) => sum + (Number(s.estimated_hours) || Number(s.hours) || 0), 0)}h</strong>
                                  </span>
                                </div>
                              </div>

                              {/* Sub-tasks Table */}
                              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                                <table className="w-full text-left text-xs text-slate-300">
                                  <thead className="bg-slate-900 text-slate-400 font-bold uppercase tracking-wider text-[9px] border-b border-slate-800">
                                    <tr>
                                      <th className="p-2.5 pl-3">Work Item ID</th>
                                      <th className="p-2.5">Technical Scope & Deliverable</th>
                                      <th className="p-2.5 text-center">Priority</th>
                                      <th className="p-2.5 text-center">Points</th>
                                      <th className="p-2.5 text-center">Hours</th>
                                      <th className="p-2.5">Domain</th>
                                      <th className="p-2.5">Required Skills</th>
                                      <th className="p-2.5 text-center">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/60">
                                    {task.sub_tasks.map((sub, sIdx) => {
                                      const subDom = (sub.domain || sub.required_domain || 'Backend').toUpperCase();
                                      const isSubBackend = subDom.includes('BACKEND');
                                      const isSubFrontend = subDom.includes('FRONTEND');
                                      const isSubAI = subDom.includes('AI') || subDom.includes('ML');
                                      const subSkills = Array.isArray(sub.required_skills) && sub.required_skills.length > 0
                                        ? sub.required_skills
                                        : (Array.isArray(sub.skills) && sub.skills.length > 0 ? sub.skills : ['JavaScript', 'SQL']);

                                      return (
                                        <tr key={sub.id || sIdx} className="hover:bg-slate-900/60 transition-colors">
                                          <td className="p-2.5 pl-3 font-mono font-bold text-sky-400 whitespace-nowrap">
                                            <span className="px-2 py-0.5 rounded bg-sky-950/60 border border-sky-800/50">
                                              ↳ {sub.id || sub.story_id}
                                            </span>
                                          </td>
                                          <td className="p-2.5 font-semibold text-slate-200">
                                            <div className="leading-snug">{sub.title}</div>
                                            {sub.description && (
                                              <div className="text-[10px] text-slate-400 font-normal mt-0.5">{sub.description}</div>
                                            )}
                                          </td>
                                          <td className="p-2.5 text-center whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                              (sub.priority_tier === 'CRITICAL' || sub.priority === 'HIGH')
                                                ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                                                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                            }`}>
                                              {sub.priority_tier || sub.priority || 'MEDIUM'}
                                            </span>
                                          </td>
                                          <td className="p-2.5 text-center font-bold font-mono text-purple-400 whitespace-nowrap">
                                            {sub.story_points || sub.points} pts
                                          </td>
                                          <td className="p-2.5 text-center font-bold font-mono text-slate-300 whitespace-nowrap">
                                            {sub.estimated_hours || sub.hours}h
                                          </td>
                                          <td className="p-2.5 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                              isSubBackend ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                              isSubFrontend ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                                              isSubAI ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                                              'bg-slate-700 text-slate-300'
                                            }`}>
                                              {sub.domain || sub.required_domain || 'Backend'}
                                            </span>
                                          </td>
                                          <td className="p-2.5">
                                            <div className="flex flex-wrap gap-1 max-w-xs">
                                              {subSkills.map((sk, kIdx) => (
                                                <span key={kIdx} className="px-1.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[9px] font-semibold">
                                                  {sk}
                                                </span>
                                              ))}
                                            </div>
                                          </td>
                                          <td className="p-2.5 text-center whitespace-nowrap">
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                                              {sub.status || 'To Do'}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
            No user stories found in this sprint.
          </div>
        )
      )}
    </div>
  );
}