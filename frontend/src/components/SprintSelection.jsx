import React from 'react';

export default function SprintSelection({ sprints = [], selectedSprint, onSelect }) {
  const sprintList = Array.isArray(sprints) ? sprints : (sprints?.data || []);

  return (
    <div className="relative">
      <select
        className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 text-sm font-medium shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none hover:border-slate-400 dark:hover:border-slate-500 disabled:opacity-60 disabled:cursor-not-allowed"
        value={selectedSprint ? (selectedSprint.id || selectedSprint.sprint_id) : ''}
        disabled={!sprintList || sprintList.length === 0}
        onChange={(e) => {
          const val = e.target.value;
          const sprint = sprintList.find(
            s => String(s.id) === String(val) || String(s.sprint_id) === String(val)
          );
          onSelect(sprint);
        }}
      >
        <option value="">Choose a sprint...</option>

        {sprintList.map(s => (
          <option key={s.id || s.sprint_id} value={s.id || s.sprint_id}>
            {s.name || s.sprint_name}
          </option>
        ))}
      </select>

      {/* Custom chevron */}
      <svg
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}