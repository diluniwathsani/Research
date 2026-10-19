import React from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function SprintCapacityBar({
  committedPoints = 0,
  capacityPoints = 40,
  sprintName = 'Sprint 1 (MVP Foundation)',
  developerCount = 5,
  tasksCount = 0
}) {
  const percentage = Math.min(100, Math.round((committedPoints / Math.max(1, capacityPoints)) * 100));
  const isOverAllocated = committedPoints > capacityPoints;
  const isNearCapacity = !isOverAllocated && percentage >= 85;

  const config = isOverAllocated
    ? {
        barColor: 'bg-rose-500 dark:bg-rose-600',
        textColor: 'text-rose-700 dark:text-rose-400',
        badgeBg: 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300',
        icon: ShieldAlert,
        statusLabel: 'Capacity Exceeded',
        caption: `Over-committed by ${committedPoints - capacityPoints} story points. High risk of sprint spillage.`
      }
    : isNearCapacity
    ? {
        barColor: 'bg-amber-500 dark:bg-amber-600',
        textColor: 'text-amber-700 dark:text-amber-400',
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300',
        icon: AlertTriangle,
        statusLabel: 'Optimal / Near Capacity',
        caption: `${capacityPoints - committedPoints} points headroom before threshold.`
      }
    : {
        barColor: 'bg-emerald-500 dark:bg-emerald-600',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300',
        icon: CheckCircle,
        statusLabel: 'Healthy Bandwidth',
        caption: `Healthy velocity margin across ${developerCount} active engineers.`
      };

  const StatusIcon = config.icon;

  return (
    <section
      aria-label="Sprint Capacity Utilization"
      className="rounded-2xl border border-zinc-200/80 bg-white/90 p-5 backdrop-blur-md shadow-xs dark:border-zinc-800/80 dark:bg-zinc-900/90 transition-all"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
            Sprint Bandwidth & Utilization
          </span>
          <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {sprintName}
          </h2>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold shadow-2xs ${config.badgeBg}`}
        >
          <StatusIcon className="h-4 w-4" strokeWidth={1.75} />
          <span>{config.statusLabel}</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs font-semibold">
          <span className="text-zinc-900 dark:text-zinc-100">
            {committedPoints} <span className="font-normal text-zinc-500">Points Allocated ({tasksCount} Stories)</span>
          </span>
          <span className="text-zinc-500 dark:text-zinc-400">
            Target Capacity: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{capacityPoints} pts</span>
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={committedPoints}
          aria-valuemin={0}
          aria-valuemax={capacityPoints}
          aria-label={`${committedPoints} of ${capacityPoints} story points committed`}
          className="relative mt-2 h-3.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        >
          <div
            style={{ width: `${percentage}%` }}
            className={`h-full rounded-full transition-all duration-300 ease-out ${config.barColor}`}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>{config.caption}</span>
        <span className="font-mono font-medium">{percentage}% Allocated</span>
      </div>
    </section>
  );
}
