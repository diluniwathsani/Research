import React, { useState, useEffect } from "react";

export default function SprintPlanOutput({ selectedProjectId }) {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState(null);

  const fetchSprintPlan = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      let data = null;
      const url = selectedProjectId 
        ? `http://localhost:3000/api/sprint-plan?project_id=${encodeURIComponent(selectedProjectId)}`
        : "http://localhost:3000/api/sprint-plan";
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        const text = await res.text();
        data = JSON.parse(text.replace(/NaN/g, '0'));
      } catch (e) {
        clearTimeout(timeoutId);
        const fallbackUrl = selectedProjectId
          ? `http://localhost:8080/api/sprint-plan?project_id=${encodeURIComponent(selectedProjectId)}`
          : "http://localhost:8080/api/sprint-plan";
        const res = await fetch(fallbackUrl);
        const text = await res.text();
        data = JSON.parse(text.replace(/NaN/g, '0'));
      }

      if (data && data.status === "success" && data.tasks) {
        const safeTasks = Array.isArray(data.tasks) ? data.tasks : (data.tasks?.data || []);
        const groupedSprints = {};
        safeTasks.forEach(task => {
          const sNum = task.sprint_number || 1;
          if (!groupedSprints[sNum]) {
            groupedSprints[sNum] = {
              sprint_number: sNum,
              total_points: 0,
              total_hours: 0,
              duration_weeks: 2,
              stories: []
            };
          }
          groupedSprints[sNum].stories.push(task);
          groupedSprints[sNum].total_points += (Number(task.story_points) || 0);
          groupedSprints[sNum].total_hours += (Number(task.estimated_hours) || (Number(task.story_points) || 0) * 6);
        });
        
        setSprints(Object.values(groupedSprints));
      } else if (data && data.status === "error") {
        setSprints([]);
        setErrorMessage(data.message || "Failed to calculate automated 2-week sprint plan.");
      } else {
        setSprints([]);
      }
    } catch (err) {
      console.error("Sprint Fetch Error:", err);
      setErrorMessage("Failed to calculate sprint plan. Please verify backend service connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSprintPlan();
  }, [selectedProjectId]);

  return (
    <div className="space-y-6 text-slate-100 p-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Generated Sprint Plan</h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated sprint breakdown and story point allocations based on 2-week capacity logic (Max 30 SP per sprint)
          </p>
        </div>
        <button
          onClick={fetchSprintPlan}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 shrink-0"
        >
          <span>⚡ Auto-Create Sprints from User Stories</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl font-bold text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-md">
          ⚠️ {errorMessage}
        </div>
      )}

      {loading ? (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-12 text-center text-slate-400 text-sm shadow-lg space-y-3">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-semibold text-slate-200">Calculating 2-Week Sprint Allocation & Syncing to PostgreSQL Database...</p>
        </div>
      ) : sprints.length > 0 ? (
        <div className="space-y-4">
          {sprints.map((sprint, idx) => (
            <div key={idx} className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg animate-in fade-in zoom-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-700/60">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-indigo-400">Sprint {sprint.sprint_number}</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                      ⏱️ 2-Week Duration (10 Days)
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Automated Sprint Allocation based on 2-week capacity logic
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Total Points</span>
                    <span className="text-sm font-extrabold text-emerald-400">{sprint.total_points} SP / 30 Max</span>
                  </div>
                  <div className="text-right pl-3 border-l border-slate-700">
                    <span className="text-[10px] text-slate-400 uppercase block font-semibold">Est. Effort</span>
                    <span className="text-sm font-extrabold text-indigo-300">{sprint.total_hours} hrs</span>
                  </div>
                </div>
              </div>
              
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