import React, { useState, useEffect } from "react";

export default function SprintPlanOutput() {
  const [sprints, setSprints] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/sprint-plan")
      .then((res) => res.text()) 
      .then((text) => {
        const safeText = text.replace(/NaN/g, '0');
        const data = JSON.parse(safeText); 

        if (data.status === "success" && data.tasks) {
          const groupedSprints = {};
          data.tasks.forEach(task => {
            if (!groupedSprints[task.sprint_number]) {
              groupedSprints[task.sprint_number] = {
                sprint_number: task.sprint_number,
                total_points: 0,
                stories: []
              };
            }
            groupedSprints[task.sprint_number].stories.push(task);
            groupedSprints[task.sprint_number].total_points += task.story_points;
          });
          
          setSprints(Object.values(groupedSprints));
        }
      })
      .catch((err) => console.error("Sprint Fetch Error:", err));
  }, []);

  return (
    <div className="space-y-6 text-slate-100 p-2">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Generated Sprint Plan</h2>
        <p className="text-xs text-slate-400 mt-1">
          Automated sprint breakdown and story point allocations
        </p>
      </div>

      {sprints.length > 0 ? (
        <div className="space-y-4">
          {sprints.map((sprint, idx) => (
            <div key={idx} className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg animate-in fade-in zoom-in duration-300">
              <h3 className="text-lg font-bold text-indigo-400 mb-2">Sprint {sprint.sprint_number}</h3>
              <p className="text-xs text-slate-400 mb-4">Total Points: {sprint.total_points || 0}</p>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                    <tr>
                      <th className="p-3">Story ID</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Points</th>
                      <th className="p-3">Effort (Hrs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sprint.stories?.map((story, i) => (
                      <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="p-3 font-mono text-emerald-400">{story.story_id}</td>
                        <td className="p-3 font-semibold text-white">{story.title}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                            story.priority === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {story.priority}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-indigo-400">{story.story_points}</td>
                        <td className="p-3 text-slate-400">{story.estimated_hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-12 text-center text-slate-400 text-sm shadow-lg">
          🚀 No generated sprints found. Add stories in the <b>Add Stories & Predict</b> tab to trigger the automated allocation engine.
        </div>
      )}
    </div>
  );
}