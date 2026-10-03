import React, { useState, useEffect } from "react";

export default function SprintPlanOutput({ selectedProjectId }) {
  const [sprints, setSprints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [sprintStatusMap, setSprintStatusMap] = useState({});

  const handleSprintStatusUpdate = async (sprintId, newStatus) => {
    setSprintStatusMap(prev => ({ ...prev, [sprintId]: newStatus }));
    try {
      await fetch(`http://localhost:3000/api/sprints/${sprintId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.warn('Notice updating sprint status:', err.message);
    }
  };

  const fetchSprintPlan = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      let data = null;
      const pidParam = selectedProjectId ? `?project_id=${encodeURIComponent(selectedProjectId)}` : '';
      const url = `http://localhost:3000/api/sprint-plan${pidParam}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        const text = await res.text();
        data = JSON.parse(text.replace(/NaN/g, '0'));
      } catch (e) {
        clearTimeout(timeoutId);
        // Retry directly on localhost:3000
        try {
          const res = await fetch(url);
          const text = await res.text();
          data = JSON.parse(text.replace(/NaN/g, '0'));
        } catch (retryErr) {
          console.warn("Sprint plan retry fetch error:", retryErr);
        }
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
          {sprints.map((sprint, idx) => {
            const sprintId = `SPR-0${sprint.sprint_number}`;
            const currentStatus = sprintStatusMap[sprintId] || (sprint.sprint_number === 1 ? 'ACTIVE' : 'PENDING');
            return (
              <div key={idx} className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-700/60">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-indigo-400">Sprint {sprint.sprint_number}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                        ⏱️ 2-Week Duration (10 Days)
                      </span>
                      {currentStatus === 'ACTIVE' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                          🟢 ACTIVE SPRINT
                        </span>
                      )}
                      {currentStatus === 'COMPLETED' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          ✅ COMPLETED
                        </span>
                      )}
                      {currentStatus === 'PENDING' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          ⏳ PENDING
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Automated Sprint Allocation based on 2-week capacity logic
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Separate Start & End Sprint Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSprintStatusUpdate(sprintId, 'ACTIVE')}
                        disabled={currentStatus === 'ACTIVE'}
                        className={`px-3 py-1.5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 ${
                          currentStatus === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 opacity-70 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 hover:scale-105'
                        }`}
                      >
                        ▶️ Start Sprint
                      </button>
                      <button
                        onClick={() => handleSprintStatusUpdate(sprintId, 'COMPLETED')}
                        disabled={currentStatus === 'COMPLETED'}
                        className={`px-3 py-1.5 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 ${
                          currentStatus === 'COMPLETED'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 opacity-70 cursor-not-allowed'
                            : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30 hover:scale-105'
                        }`}
                      >
                        ⏹️ End Sprint
                      </button>
                    </div>

                    <div className="text-right pl-3 border-l border-slate-700">
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
                      <th className="p-3">Title & Allocated Resources</th>
                      <th className="p-3">Resource Status</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Points</th>
                      <th className="p-3">Effort (Hrs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sprint.stories
                      ?.slice()
                      .sort((a, b) => {
                        const tierDiff = (a.dependency_tier ?? 1) - (b.dependency_tier ?? 1);
                        if (tierDiff !== 0) return tierDiff;
                        const stepDiff = (a.process_step ?? 1) - (b.process_step ?? 1);
                        if (stepDiff !== 0) return stepDiff;
                        const rank = p => (p === 'CRITICAL' || p === 'HIGH' ? 1 : p === 'MEDIUM' ? 2 : 3);
                        const rDiff = rank(a.priority) - rank(b.priority);
                        if (rDiff !== 0) return rDiff;
                        const idA = parseInt((a.story_id || '').replace(/\D/g, '')) || 0;
                        const idB = parseInt((b.story_id || '').replace(/\D/g, '')) || 0;
                        return idA - idB;
                      })
                      .map((story, i) => {
                        const isChangeRequest = story.status === 'ACCEPTED' || 
                                               String(story.story_id || '').startsWith('CR-') || 
                                               String(story.user_story_id || '').startsWith('CR-') || 
                                               String(story.title || '').includes('[CR]');
                        const tier = story.dependency_tier ?? 1;
                        const tierLabel = tier === 0 
                          ? 'Tier 0: Foundational Security & Auth' 
                          : tier === 1 
                          ? 'Tier 1: Defect & Repair Initiation (Onshore)' 
                          : tier === 2 
                          ? 'Tier 2: Work Order Creation & Approval' 
                          : tier === 3 
                          ? 'Tier 3: Work Order Execution & Resources' 
                          : tier === 4 
                          ? 'Tier 4: Vessel Equipment, Costing & Overtime' 
                          : tier === 5 
                          ? 'Tier 5: Job Cards, Search & Filtering' 
                          : tier === 6 
                          ? 'Tier 6: Email Notifications & Templates' 
                          : 'Tier 7: Audit Trail, Reports & History';
                        const tierColor = tier === 0 
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                          : tier === 1 
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
                          : tier === 2 
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' 
                          : tier === 3 
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' 
                          : tier === 4 
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' 
                          : tier === 5 
                          ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' 
                          : tier === 6 
                          ? 'bg-pink-500/20 text-pink-300 border-pink-500/40' 
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                        const isAllocated = story.is_resource_allocated || (story.assigned_to && story.assigned_to !== 'Unassigned');

                        return (
                          <tr 
                            key={i} 
                            className={`border-b transition-colors ${
                              isChangeRequest 
                                ? 'bg-purple-950/40 border-purple-500/40 hover:bg-purple-900/50 shadow-inner' 
                                : 'border-slate-700/50 hover:bg-slate-700/30'
                            }`}
                          >
                            <td className="p-3 font-mono">
                              <span className={isChangeRequest ? 'text-purple-300 font-extrabold' : 'text-emerald-400'}>
                                {story.story_id || story.user_story_id}
                              </span>
                              {isChangeRequest && (
                                <span className="ml-2 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-600 text-white shadow-md animate-pulse">
                                  ✨ Accepted CR
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-semibold text-white">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span>{story.title}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] border font-bold ${tierColor}`}>
                                  Tier {tier}: {tierLabel}
                                </span>
                                {isChangeRequest && (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                                    Change Request
                                  </span>
                                )}
                              </div>
                              {Array.isArray(story.work_items) && story.work_items.length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {story.work_items.map((wi, wIdx) => (
                                    <span key={wIdx} className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-900/90 border border-slate-700 text-indigo-300">
                                      🔨 {wi.work_item_id || wi.id}: {wi.title} ({wi.estimated_hours}h){wi.assigned_developer_name ? ` • 👤 ${wi.assigned_developer_name}` : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              {isAllocated ? (
                                <div>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 w-fit">
                                    ✅ Allocated
                                  </span>
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    👤 {story.assigned_to || 'Assigned Engineer'}
                                  </span>
                                </div>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 w-fit">
                                  ⚠️ Pending Resource Mgmt
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                                story.priority === 'HIGH' || story.priority === 'CRITICAL'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                                  : story.priority === 'MEDIUM'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              }`}>
                                {story.priority}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-indigo-400">{story.story_points}</td>
                            <td className="p-3 text-slate-400">{story.estimated_hours}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-12 text-center text-slate-400 text-sm shadow-lg">
          🚀 No generated sprints found. Add stories in the <b>Add Stories & Predict</b> tab to trigger the automated allocation engine.
        </div>
      )}
    </div>
  );
}