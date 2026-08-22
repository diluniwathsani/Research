import React from 'react';

export default function ProjectSelection({ projects, selectedProject, onSelect }) {
  return (
    <div className="relative">
      <select
        className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 text-sm font-medium shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none hover:border-slate-400 dark:hover:border-slate-500"
        value={selectedProject?.id || ''}
        onChange={(e) => {
          const project = projects.find(
            p => p.id === parseInt(e.target.value)
          );
          onSelect(project);
        }}
      >
        <option value="">Choose a project...</option>

        {projects.map(p => (
          <option key={p.id} value={p.id}>
            {p.name}
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