import React from 'react';
import { useDrag, useDrop } from 'react-dnd';

const ItemTypes = { TASK: 'task' };

// Rotating accent palette used for developer avatars / role badges
const AVATAR_THEMES = [
  { bg: 'bg-indigo-500', soft: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-300' },
  { bg: 'bg-amber-500', soft: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-300' },
  { bg: 'bg-purple-500', soft: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-300' },
  { bg: 'bg-sky-500', soft: 'bg-sky-50 dark:bg-sky-500/10', text: 'text-sky-600 dark:text-sky-300' },
  { bg: 'bg-emerald-500', soft: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300' },
  { bg: 'bg-rose-500', soft: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-300' },
];

const complexityStyles = (complexity) => {
  const c = complexity?.toLowerCase();
  if (c === 'high') return 'bg-red-50 border-red-200 dark:bg-red-500/10 dark:border-red-500/20';
  if (c === 'medium') return 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20';
  return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20';
};

const DraggableTask = ({ task }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: { task, originalDevId: task.developer_id },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }));

  const isNew = task.is_new || 
                task.status === 'ACCEPTED' || 
                String(task.story_id || '').startsWith('CR-') || 
                String(task.user_story_id || '').startsWith('CR-') || 
                String(task.title || '').includes('[CR]');

  return (
    <div
      ref={drag}
      className={`px-3.5 py-3 mb-2.5 rounded-xl border cursor-move transition-all hover:translate-x-1 hover:shadow-md ${
        isNew 
          ? 'bg-purple-500/15 border-purple-500/40 ring-1 ring-purple-500/30' 
          : complexityStyles(task.predicted_complexity)
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex justify-between items-center gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <strong className="text-sm font-bold text-slate-800 dark:text-slate-100">{task.story_id}</strong>
          {isNew && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-600 text-white shadow-md animate-pulse">
              ✨ Newly Added
            </span>
          )}
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/80 dark:bg-black/25 text-slate-700 dark:text-slate-200 whitespace-nowrap">
          {task.allocated_hours}h
        </span>
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-300 mb-1.5 font-medium leading-snug">
        {task.title || task.story_id}
      </div>
      <div className="text-xs uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-400">
        {task.predicted_complexity || 'MEDIUM'} • {task.matched_domain || 'general'}
      </div>
    </div>
  );
};

const DeveloperColumn = ({ developer, tasks, onDrop, theme }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item) => onDrop(item.task, item.originalDevId, developer.id),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  const capacity = Number(developer.capacity_hours) || 40;
  const currentSprintUsed = tasks.reduce((sum, t) => sum + (t.allocated_hours || 0), 0);
  const otherProjectHours = Number(developer.other_project_hours) || 0;
  const totalUsedAcrossProjects = currentSprintUsed + otherProjectHours;
  
  const remainingAvailable = Math.max(0, capacity - totalUsedAcrossProjects);
  const utilizationPercent = capacity > 0 ? Math.min(100, Math.round((totalUsedAcrossProjects / capacity) * 100)) : 0;
  const isFullyAllocatedElseWhere = developer.is_fully_allocated || otherProjectHours >= capacity;

  const getUtilizationBar = () => {
    if (isFullyAllocatedElseWhere || utilizationPercent >= 100) return 'bg-red-500';
    if (utilizationPercent > 75) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div
      ref={drop}
      className={`rounded-2xl bg-white dark:bg-slate-800/60 border transition-colors overflow-hidden ${
        isOver 
          ? 'border-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-500/20' 
          : isFullyAllocatedElseWhere
          ? 'border-red-300 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10'
          : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-lg shrink-0 ${theme.bg}`}>
            {developer.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-[15px] font-bold text-slate-800 dark:text-slate-100 truncate">{developer.name}</strong>
              {developer.role && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${theme.soft} ${theme.text}`}>
                  {developer.role}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 capitalize truncate mt-0.5">
              {developer.primary_domain || 'general'} • {developer.skill_level || 'developer'}
            </div>
          </div>
        </div>

        {/* Cross-Project Capacity Allocation Status Badge */}
        {isFullyAllocatedElseWhere ? (
          <div className="mb-3 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-[11px] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>🔴 100% Fully Allocated on Other Project</span>
          </div>
        ) : otherProjectHours > 0 ? (
          <div className="mb-3 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-[11px] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>🟡 {Math.round((otherProjectHours/capacity)*100)}% Allocated Elsewhere ({remainingAvailable}h Available)</span>
          </div>
        ) : (
          <div className="mb-3 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>🟢 100% Available ({capacity}h)</span>
          </div>
        )}

        {/* Distinct Technical Skills Badges */}
        {(() => {
          const rawSkills = developer.languages || developer.skills;
          const skillsList = Array.isArray(rawSkills) 
            ? rawSkills 
            : (typeof rawSkills === 'string' && rawSkills.trim() ? rawSkills.split(',').map(s => s.trim()).filter(Boolean) : []);
          if (skillsList.length === 0) return null;
          return (
            <div className="mb-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                Specialized Skills:
              </div>
              <div className="flex flex-wrap gap-1">
                {skillsList.map((sk, sIdx) => (
                  <span 
                    key={sIdx} 
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-emerald-600 dark:text-emerald-300 font-mono text-[10px] font-semibold"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="flex justify-between gap-4 text-xs">
          <div>
            <div className="text-slate-500 dark:text-slate-400 mb-0.5 font-medium">Sprint / Total Used</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {currentSprintUsed}h <span className="text-[10px] text-slate-400">({totalUsedAcrossProjects}h total)</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-500 dark:text-slate-400 mb-0.5 font-medium">Capacity / Avail</div>
            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {remainingAvailable}h <span className="text-[10px] text-slate-400">/ {capacity}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Utilization bar */}
      <div className="px-4 pb-3">
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all ${getUtilizationBar()}`} style={{ width: `${Math.min(utilizationPercent, 100)}%` }} />
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {utilizationPercent}% utilized across projects · {remainingAvailable}h available
        </div>
      </div>

      {/* Tasks */}
      <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700 min-h-[150px] max-h-[380px] overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-slate-300 dark:text-slate-600">
            <span className="text-2xl block mb-2">{isFullyAllocatedElseWhere ? '⛔' : '📭'}</span>
            <p className="text-xs font-semibold">{isFullyAllocatedElseWhere ? 'Fully Allocated on Another Project' : 'No tasks assigned'}</p>
          </div>
        ) : (
          <div className="pt-2.5">
            {tasks.map(task => (
              <DraggableTask key={task.story_id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const UnassignedColumn = ({ tasks, onDrop }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item) => onDrop(item.task, item.originalDevId, 'unassigned'),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  return (
    <div
      ref={drop}
      className={`rounded-2xl bg-amber-500/[0.04] dark:bg-amber-950/20 border-2 border-dashed transition-colors overflow-hidden ${
        isOver
          ? 'border-amber-500 ring-2 ring-amber-500/20'
          : 'border-amber-300 dark:border-amber-700/60'
      }`}
    >
      <div className="p-4 border-b border-amber-200/60 dark:border-amber-700/40 bg-amber-500/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-amber-700 dark:text-amber-300 text-lg shrink-0 bg-amber-500/20 border border-amber-500/30">
            ⚠️
          </div>
          <div className="min-w-0">
            <strong className="text-[15px] font-bold text-amber-900 dark:text-amber-200 block truncate">
              Unassigned Tasks
            </strong>
            <div className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              {tasks.length} task{tasks.length === 1 ? '' : 's'} awaiting eligible capacity
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 pb-3 pt-2.5 min-h-[150px] max-h-[380px] overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-amber-600/60 dark:text-amber-400/50">
            <span className="text-2xl block mb-1">🎉</span>
            <p className="text-xs font-semibold">All tasks allocated!</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.story_id}>
              <DraggableTask task={{ ...task, allocated_hours: task.estimated_hours || task.allocated_hours || 0 }} />
              {task.unassigned_reason && (
                <div className="text-[10px] -mt-1.5 mb-2.5 px-2 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-medium leading-tight">
                  ℹ️ {task.unassigned_reason}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AllocationResults = ({ assignments = [], developers = [], tasks = [], selectedProject, selectedSprint, onRebalance, onSave, onTaskMove, onBack, onOpenManageTeam, loading, apiSource }) => {
  const safeAssignments = Array.isArray(assignments) ? assignments : (assignments?.data || []);
  const safeDevelopers = Array.isArray(developers) ? developers : (developers?.data || []);
  const safeTasks = Array.isArray(tasks) ? tasks : (tasks?.data || []);
  const projName = selectedProject?.project_name || selectedProject?.name || selectedProject?.title || 'Engineering Project';
  const projId = selectedProject?.project_id || selectedProject?.id || 'P00001';

  const grouped = {};
  safeAssignments.forEach(a => {
    const key = String(a.developer_id);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });

  const normDomainStr = (d) => {
    const s = String(d || '').toLowerCase();
    if (s.includes('front')) return 'frontend';
    if (s.includes('qa') || s.includes('test')) return 'qa';
    if (s.includes('devops')) return 'devops';
    if (s.includes('ai') || s.includes('ml')) return 'ai';
    return 'backend';
  };

  const handleDrop = (task, fromDevId, toDevId) => {
    if (String(fromDevId) === String(toDevId)) return;

    // Handle moving task to Unassigned
    if (!toDevId || toDevId === 'unassigned' || toDevId === 'null') {
      onTaskMove(task, fromDevId, 'unassigned');
      return;
    }

    const targetDev = safeDevelopers.find(d => String(d.id) === String(toDevId));
    if (!targetDev) return;

    // RULE 0: STRICT DOMAIN MATCHING
    const taskDomain = normDomainStr(task.matched_domain || task.required_domain || task.domain);
    const targetDomain = normDomainStr(targetDev.primary_domain || targetDev.domain);

    if (taskDomain !== targetDomain) {
      alert(`⛔ Domain Mismatch for ${targetDev.name}!\n\nThis task requires a "${taskDomain.toUpperCase()}" developer, but ${targetDev.name} is a "${targetDomain.toUpperCase()}" developer.\n\nStrict domain matching is enforced: tasks cannot be assigned across domains.`);
      return;
    }

    const capacity = Number(targetDev.capacity_hours) || 40;
    const otherProjectHours = Number(targetDev.other_project_hours) || 0;
    const targetAssignedTasks = grouped[String(toDevId)] || [];
    const currentSprintUsed = targetAssignedTasks.reduce((sum, t) => sum + (t.allocated_hours || 0), 0);
    const taskHours = Number(task.estimated_hours) || Number(task.allocated_hours) || 16;

    // RULE 1: If developer is 100% fully allocated to another project, block assignment completely!
    if (targetDev.is_fully_allocated || otherProjectHours >= capacity) {
      alert(`⛔ Allocation Blocked for ${targetDev.name}!\n\nResource is 100% fully allocated to another project (${otherProjectHours}h / ${capacity}h).\n\nResources fully allocated to one project cannot be assigned tasks in another project.`);
      return;
    }

    // RULE 2: If remaining capacity is less than task hours, block over-allocation!
    const totalAfterDrop = otherProjectHours + currentSprintUsed + taskHours;
    if (totalAfterDrop > capacity) {
      const remainingHours = Math.max(0, capacity - (otherProjectHours + currentSprintUsed));
      alert(`⚠️ Capacity Limit Exceeded for ${targetDev.name}!\n\nDeveloper is allocated ${otherProjectHours}h on another project and ${currentSprintUsed}h in this sprint.\n\nOnly ${remainingHours}h remaining available capacity. Cannot allocate a ${taskHours}h task.`);
      return;
    }

    onTaskMove(task, fromDevId, toDevId);
  };

  const totalHours = safeAssignments.reduce((sum, a) => sum + (Number(a.allocated_hours) || 0), 0);
  const totalCapacity = safeDevelopers.reduce((sum, d) => sum + (Number(d.capacity_hours) || 40), 0);
  const utilization = totalCapacity > 0 ? (totalHours / totalCapacity) * 100 : 0;
  const isBalanced = utilization <= 100;

  if (loading) {
    return (
      <div className="text-center py-16">
        <span className="w-10 h-10 mx-auto rounded-full border-4 border-indigo-100 dark:border-indigo-500/20 border-t-indigo-500 animate-spin block mb-4" />
        <p className="text-sm text-slate-500 dark:text-slate-400">AI is analyzing and allocating tasks...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Results header */}
        <div className="flex justify-between items-center flex-wrap gap-4 mb-6 px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span>Allocation Results</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                📁 {projName} ({projId})
              </span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Project: <span className="font-bold text-slate-700 dark:text-slate-200">{projName}</span> · Sprint: <span className="font-bold text-slate-700 dark:text-slate-200">{selectedSprint?.name || selectedSprint?.sprint_name || 'Selected Sprint'}</span> · {safeTasks.length} tasks allocated to {safeDevelopers.length} developers
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-full text-sm font-semibold border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            ← Back to Tasks
          </button>
        </div>

        {/* Board */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 p-5">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-5">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Allocation Board
              <span className="text-xs font-normal text-slate-400 dark:text-slate-500">(drag & drop to reassign)</span>
            </h3>
            <div className="flex gap-2.5">
              {onOpenManageTeam && (
                <button
                  onClick={onOpenManageTeam}
                  className="px-4 py-2.5 rounded-full text-sm font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20 dark:hover:bg-indigo-500/20 transition-colors flex items-center gap-1.5"
                >
                  👥 Manage Resources & Skills
                </button>
              )}
              <button
                onClick={onRebalance}
                disabled={loading}
                className="px-5 py-2.5 rounded-full text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20 dark:hover:bg-amber-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔄 Rebalance AI
              </button>
              <button
                onClick={onSave}
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/20 transition-colors"
              >
                💾 Save Allocation
              </button>
            </div>
          </div>

          {(() => {
            const unassignedTasks = safeAssignments.filter(a => !a.developer_id || a.developer_id === 'null' || a.developer_name === 'Unassigned');
            return (
              <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>
                {unassignedTasks.length > 0 && (
                  <UnassignedColumn
                    tasks={unassignedTasks}
                    onDrop={handleDrop}
                  />
                )}
                {safeDevelopers.map((dev, i) => (
                  <DeveloperColumn
                    key={dev.id}
                    developer={dev}
                    tasks={grouped[String(dev.id)] || grouped[dev.id] || []}
                    onDrop={handleDrop}
                    theme={AVATAR_THEMES[i % AVATAR_THEMES.length]}
                  />
                ))}
              </div>
            );
          })()}

          {/* Summary */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800">
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <span className="text-2xl">📊</span>
                <div>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Hours Allocated</div>
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{totalHours}h</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <span className="text-2xl">👥</span>
                <div>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Capacity Used</div>
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{totalCapacity}h</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <span className="text-2xl">📈</span>
                <div>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Overall Utilization</div>
                  <div className={`text-xl font-bold ${utilization > 100 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {utilization.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <span className="text-2xl">⚖️</span>
                <div>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Allocation Status</div>
                  <div className={`text-xl font-bold ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {isBalanced ? 'Balanced' : 'Over Capacity'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default AllocationResults;