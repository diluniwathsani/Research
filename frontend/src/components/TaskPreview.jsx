import React from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const ItemTypes = { TASK: 'task' };

// Avatar gradients pulled from the system's own brand gradient (indigo -> purple),
// rotated through a few brand-consistent hue stops so each developer stays distinct.
const AVATAR_THEMES = [
  { grad: 'from-indigo-500 to-purple-600', soft: 'bg-indigo-500/15', text: 'text-indigo-300' },
  { grad: 'from-purple-500 to-fuchsia-600', soft: 'bg-purple-500/15', text: 'text-purple-300' },
  { grad: 'from-violet-500 to-indigo-600', soft: 'bg-violet-500/15', text: 'text-violet-300' },
  { grad: 'from-sky-500 to-indigo-600', soft: 'bg-sky-500/15', text: 'text-sky-300' },
  { grad: 'from-fuchsia-500 to-purple-600', soft: 'bg-fuchsia-500/15', text: 'text-fuchsia-300' },
];

const complexityStyles = (complexity) => {
  const c = complexity?.toLowerCase();
  if (c === 'high') return 'bg-red-50 border-red-200 dark:bg-red-500/15 dark:border-red-500/30';
  if (c === 'medium') return 'bg-amber-50 border-amber-200 dark:bg-amber-500/15 dark:border-amber-500/30';
  return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/30';
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
      className={`px-3.5 py-3 mb-2.5 rounded-xl border cursor-move transition-all hover:translate-x-1 hover:shadow-lg ${complexityStyles(task.predicted_complexity)}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div className="flex justify-between items-center gap-2 mb-1.5">
        <strong className="text-sm font-bold text-slate-800 dark:text-white">{task.story_id}</strong>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-slate-700 dark:bg-black/30 dark:text-indigo-200 whitespace-nowrap">
          {task.allocated_hours}h
        </span>
      </div>
      <div className="text-sm text-slate-600 dark:text-slate-200 mb-1.5 font-medium leading-snug">
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
      className={`rounded-2xl overflow-hidden border transition-colors
        bg-white border-slate-200
        dark:bg-slate-800
        ${isOver
          ? 'border-indigo-400 ring-2 ring-indigo-100 dark:ring-2 dark:ring-indigo-500/40 dark:border-indigo-400/70'
          : 'dark:border-slate-700'}`}
    >
      {/* Header — solid, opaque */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-lg shrink-0 bg-gradient-to-br ${theme.grad} shadow-md`}>
            {developer.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-[15px] font-bold text-slate-800 dark:text-white truncate">{developer.name}</strong>
              {developer.role && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${theme.soft} ${theme.text}`}>
                  {developer.role}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-300 capitalize truncate mt-0.5">
              {developer.primary_domain || 'general'} • {developer.skill_level || 'developer'}
            </div>
          </div>
        </div>

        <div className="flex justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Used</div>
            <div className="text-xl font-bold text-slate-800 dark:text-white">{used}h</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">Capacity</div>
            <div className="text-xl font-bold text-slate-500 dark:text-slate-300">{capacity}h</div>
          </div>
        </div>
      </div>

      {/* Utilization bar */}
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all ${getUtilizationBar()}`} style={{ width: `${Math.min(utilization, 100)}%` }} />
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {utilization.toFixed(0)}% utilized · {remaining}h remaining
        </div>
      </div>

      {/* Tasks */}
      <div className="px-3 pb-3 pt-1 min-h-[150px] max-h-[380px] overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
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
        {/* Results header — solid, opaque, no gradient wash */}
        <div className="flex justify-between items-center flex-wrap gap-4 mb-6 px-5 py-4 rounded-2xl border
          bg-slate-50 border-slate-200
          dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0 bg-indigo-100 dark:bg-indigo-500/20">
              ✅
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Allocation Results</h2>
              <p className="text-sm text-slate-500 dark:text-slate-300 mt-0.5">
                Sprint: {selectedSprint?.name} · {tasks.length} tasks allocated to {developers.length} developers
              </p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="px-5 py-2.5 rounded-full text-sm font-semibold transition-colors
              border border-slate-300 text-slate-600 bg-white hover:bg-slate-100
              dark:border-slate-600 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            ← Back to Tasks
          </button>
        </div>

        {/* Board */}
        <div className="rounded-2xl border p-5
          bg-white border-slate-200
          dark:bg-slate-900 dark:border-slate-700">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-5">
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              📊 Allocation Board
              <span className="text-xs font-normal text-slate-400 dark:text-slate-400">(drag & drop to reassign)</span>
            </h3>
            <div className="flex gap-2.5">
              <button
                onClick={onRebalance}
                disabled={loading}
                className="px-5 py-2.5 rounded-full text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                  bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100
                  dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 dark:hover:bg-amber-500/25"
              >
                🔄 Rebalance AI
              </button>
              <button
                onClick={onSave}
                className="px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all
                  bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500
                  shadow-md shadow-emerald-900/30"
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
              <div className="flex items-center gap-3 p-4 rounded-xl
                bg-slate-50 border border-slate-100
                dark:bg-slate-800 dark:border-slate-700">
                <span className="text-2xl">📊</span>
                <div>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Hours Allocated</div>
                  <div className="text-xl font-bold text-slate-800 dark:text-white">{totalHours}h</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl
                bg-slate-50 border border-slate-100
                dark:bg-slate-800 dark:border-slate-700">
                <span className="text-2xl">👥</span>
                <div>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Capacity Used</div>
                  <div className="text-xl font-bold text-slate-800 dark:text-white">{totalCapacity}h</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl
                bg-slate-50 border border-slate-100
                dark:bg-slate-800 dark:border-slate-700">
                <span className="text-2xl">📈</span>
                <div>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Overall Utilization</div>
                  <div className={`text-xl font-bold ${utilization > 100 ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {utilization.toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl
                bg-slate-50 border border-slate-100
                dark:bg-slate-800 dark:border-slate-700">
                <span className="text-2xl">⚖️</span>
                <div>
                  <div className="text-sm font-medium text-slate-500 dark:text-slate-400">Allocation Status</div>
                  <div className={`text-xl font-bold ${isBalanced ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
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