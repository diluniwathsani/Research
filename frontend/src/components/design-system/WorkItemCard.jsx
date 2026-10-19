import React from 'react';
import {
  GripVertical,
  AlertOctagon,
  ArrowUpRight,
  Minus,
  ArrowDownRight,
  Shield,
  Layers,
  FileCode,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { cleanStoryTitle } from '../../utils/storyUtils';

export default function WorkItemCard({
  task = {},
  onDecomposeClick = () => {},
  onCardClick = () => {},
  isBlocked = false,
  unmetDeps = []
}) {
  const sid = task.story_id || task.id || 'US001';
  const points = task.story_points || task.points || 1;
  const rawTitle = task.title || '';
  const title = cleanStoryTitle(rawTitle);
  const tier = task.priority_tier || (task.priority === 'HIGH' ? 'HIGH' : 'LOW');
  const domain = task.domain || 'Backend';
  const assigned = task.assigned_developer;
  const status = task.status || 'To Do';
  const deps = task.dependencies || [];

  const priorityConfig = {
    CRITICAL: {
      label: 'Critical',
      icon: AlertOctagon,
      badge: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300'
    },
    HIGH: {
      label: 'High',
      icon: ArrowUpRight,
      badge: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300'
    },
    MEDIUM: {
      label: 'Medium',
      icon: Minus,
      badge: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300'
    },
    LOW: {
      label: 'Low',
      icon: ArrowDownRight,
      badge: 'bg-zinc-100 border-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
    }
  }[tier] || { label: tier, icon: Minus, badge: 'bg-zinc-100 text-zinc-700' };

  const PriorityIcon = priorityConfig.icon;

  return (
    <article
      tabIndex={0}
      role="button"
      onClick={() => onCardClick(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick(task);
        }
      }}
      aria-label={`${sid}: ${title}, ${points} story points, ${tier} priority`}
      className={`group relative flex flex-col rounded-2xl border p-4 backdrop-blur-md shadow-xs transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.99] dark:focus-visible:ring-zinc-100 ${
        status === 'Done'
          ? 'border-emerald-500/40 bg-emerald-950/10 dark:bg-emerald-950/20'
          : isBlocked
          ? 'border-amber-500/60 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/70'
          : 'border-zinc-200/80 bg-white/95 dark:border-zinc-800/80 dark:bg-zinc-900/95 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      {/* Top Header: ID, Priority, Critical Path Flame */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="cursor-grab text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
            <GripVertical className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="rounded-md border border-zinc-200/90 bg-zinc-50 px-2 py-0.5 font-mono text-xs font-bold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {sid}
          </span>
          {task.epic && (
            <span className="max-w-[120px] truncate text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
              {task.epic}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {tier === 'CRITICAL' && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-500/15 border border-rose-500/40 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300">
              <Flame className="h-3 w-3 text-amber-500" strokeWidth={2} />
              <span className="hidden sm:inline">Critical Path</span>
            </span>
          )}
          <div className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-xs font-semibold ${priorityConfig.badge}`}>
            <PriorityIcon className="h-3 w-3" strokeWidth={2} />
            <span>{priorityConfig.label}</span>
          </div>
        </div>
      </div>

      {/* Story Title */}
      <h3 className={`mt-2.5 text-sm font-semibold leading-snug ${status === 'Done' ? 'line-through text-zinc-400 dark:text-zinc-500' : 'text-zinc-900 dark:text-zinc-50'}`}>
        {title}
      </h3>

      {/* Blocked or Ready Notice */}
      {isBlocked && status !== 'Done' && (
        <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50/80 p-2 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
          <Shield className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" strokeWidth={2} />
          <span className="truncate">Blocked by: {unmetDeps.join(', ')}</span>
        </div>
      )}

      {/* Subtasks Progress if decomposed */}
      {task.sub_tasks && task.sub_tasks.length > 0 && (
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-100 pt-2 dark:border-zinc-800">
          <span className="flex items-center gap-1 font-medium">
            <Layers className="h-3.5 w-3.5 text-indigo-500" strokeWidth={1.75} />
            <span>{task.sub_tasks.filter(s => s.status === 'Done').length} of {task.sub_tasks.length} Subtasks Done</span>
          </span>
          <span className="font-mono font-semibold">
            {task.sub_tasks.reduce((sum, s) => sum + (s.hours || s.estimated_hours || 0), 0)} hrs
          </span>
        </div>
      )}

      {/* Footer Row: Points, Domain, Assignee */}
      <div className="mt-3.5 flex items-center justify-between border-t border-zinc-100 pt-2.5 dark:border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span
            title="Story Points"
            className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-zinc-900 px-2 font-mono text-xs font-bold text-white shadow-2xs dark:bg-zinc-100 dark:text-zinc-900"
          >
            {points}
          </span>
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {domain}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {assigned ? (
            <div
              title={`Assigned to ${assigned.name}`}
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-2xs ${assigned.avatar_bg || 'bg-indigo-600'}`}
            >
              {assigned.initials || assigned.name.substring(0, 2).toUpperCase()}
            </div>
          ) : (
            <span className="text-xs text-zinc-400 italic">Unassigned</span>
          )}
        </div>
      </div>
    </article>
  );
}
