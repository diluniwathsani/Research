import React from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

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

  return (
    <div
      ref={drag}
      className={`px-3.5 py-3 mb-2.5 rounded-xl border cursor-move transition-all hover:translate-x-1 hover:shadow-md ${complexityStyles(task.predicted_complexity)}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex justify-between items-center gap-2 mb-1.5">
        <strong className="text-sm font-bold text-slate-800 dark:text-slate-100">{task.story_id}</strong>
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

  const used = tasks.reduce((sum, t) => sum + t.allocated_hours, 0);
  const capacity = developer.capacity_hours;
  const remaining = capacity - used;
  const utilization = capacity > 0 ? (used / capacity) * 100 : 0;

  const getUtilizationBar = () => {
    if (utilization > 100) return 'bg-red-500';
    if (utilization > 85) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div
      ref={drop}
      className={`rounded-2xl bg-white dark:bg-slate-800/60 border transition-colors overflow-hidden ${
        isOver ? 'border-indigo-400 ring-2 ring-indigo-100 dark:ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700'
      }`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-4">
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

        <div className="flex justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Used</div>
            <div className="text-xl font-bold text-slate-800 dark:text-slate-100">{used}h</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Capacity</div>
            <div className="text-xl font-bold text-slate-500 dark:text-slate-400">{capacity}h</div>
          </div>
        </div>
      </div>

      {/* Utilization bar */}
      <div className="px-4 pb-3">
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all ${getUtilizationBar()}`} style={{ width: `${Math.min(utilization, 100)}%` }} />
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {utilization.toFixed(0)}% utilized · {remaining}h remaining
        </div>
      </div>

      {/* Tasks */}
      <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-700 min-h-[150px] max-h-[380px] overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-slate-300 dark:text-slate-600">
            <span className="text-2xl block mb-2">📭</span>
            <p className="text-sm">No tasks assigned</p>
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

const AllocationResults = ({ assignments, developers, tasks, selectedSprint, onRebalance, onSave, onTaskMove, onBack, loading, apiSource }) => {
  const grouped = {};
  assignments.forEach(a => {
    if (!grouped[a.developer_id]) grouped[a.developer_id] = [];
    grouped[a.developer_id].push(a);
  });

  const totalHours = assignments.reduce((sum, a) => sum + a.allocated_hours, 0);
  const totalCapacity = developers.reduce((sum, d) => sum + d.capacity_hours, 0);
  const isBalanced = totalHours <= totalCapacity;
  const utilization = totalCapacity > 0 ? (totalHours / totalCapacity) * 100 : 0;

  const handleDrop = (task, fromDevId, toDevId) => {
    onTaskMove(task, fromDevId, toDevId);
  };

  if (loading) {
    return (
      <div className="text-center py-16">
        <span className="w-10 h-10 mx-auto rounded-full border-4 border-indigo-100 dark:border-indigo-500/20 border-t-indigo-500 animate-spin block mb-4" />
        <p className="text-sm text-slate-500 dark:text-slate-400">AI is analyzing and allocating tasks...</p>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div>
        {/* Results header */}
        <div className="flex justify-between items-center flex-wrap gap-4 mb-6 px-5 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Allocation Results</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Sprint: {selectedSprint?.name} · {tasks.length} tasks allocated to {developers.length} developers
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

          <div className="grid gap-5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))' }}>
            {developers.map((dev, i) => (
              <DeveloperColumn
                key={dev.id}
                developer={dev}
                tasks={grouped[dev.id] || []}
                onDrop={handleDrop}
                theme={AVATAR_THEMES[i % AVATAR_THEMES.length]}
              />
            ))}
          </div>

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
    </DndProvider>
  );
};

export default AllocationResults;