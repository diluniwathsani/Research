import React, { useState } from "react";

export default function AddStories() {
  const [storyId, setStoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [storyPoints, setStoryPoints] = useState(3);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [alert, setAlert] = useState(null);

  const [isExistingStory, setIsExistingStory] = useState(false);

  const showAlert = (msg, type = "success") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 5000);
  };

  // Auto-fetch User Story details when Story ID is entered/changed
  const handleStoryIdChange = async (val) => {
    setStoryId(val);
    if (!val.trim()) {
      setIsExistingStory(false);
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/api/user-stories/${encodeURIComponent(val.trim())}`);
      const data = await res.json();
      if (data && data.success && data.data) {
        setTitle(data.data.title || "");
        setDescription(data.data.description || "");
        setStoryPoints(data.data.story_points || 5);
        setIsExistingStory(true);
      } else {
        setIsExistingStory(false);
      }
    } catch (e) {
      setIsExistingStory(false);
    }
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    if (!title) return;
    setLoading(true);
    setAlert(null);

    const targetId = storyId.trim() || `US00${Math.floor(Math.random() * 1000)}`;

    try {
      let data = null;
      try {
        const response = await fetch("http://localhost:3000/api/replan-full", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            change_type: "NEW_STORY_ADDED",
            story_id: targetId,
            title: title,
            description: description,
            story_points: Number(storyPoints),
          }),
        });
        data = await response.json();
      } catch (fErr) {
        const fallbackRes = await fetch("http://localhost:8080/api/replan-full", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            change_type: "NEW_STORY_ADDED",
            story_id: targetId,
            title: title,
            description: description,
            story_points: Number(storyPoints),
          }),
        });
        data = await fallbackRes.json();
      }
      
      if (data && data.status === "success") {
        const plannedStory = (data.tasks || []).find(t => t.story_id === targetId || t.title === title) || (data.tasks ? data.tasks[0] : null);
        
        setPrediction({
          priority: (plannedStory && plannedStory.priority) || (Number(storyPoints) > 8 ? "HIGH" : "MEDIUM"),
          estimated_hours: (Number(storyPoints) || 5) * 6,
          sprint_number: (plannedStory && plannedStory.sprint_number) || 1
        });

        const actionText = isExistingStory ? "updated and re-planned into Sprint" : "added and planned into 2-week Sprint";
        showAlert(`✅ Story ${targetId} successfully ${actionText}!`, "success");
        
        setIsExistingStory(false);
      } else {
        throw new Error(data?.message || "Failed to process story planning.");
      }
    } catch (err) {
      console.error("Prediction Error:", err);
      showAlert(err.message, "error"); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100 p-2">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Add User Stories & Predict</h2>
        <p className="text-xs text-slate-400 mt-1">
          Input user story parameters to get AI priority, save to DB, and auto-plan sprints
        </p>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl font-bold text-sm border shadow-lg ${
          alert.type === 'error' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        }`}>
          {alert.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handlePredict} className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg space-y-4">
          <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">➕ Story Information</h3>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">Story ID</label>
              {isExistingStory && (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ⚡ Existing Story Auto-Loaded (Will Update)
                </span>
              )}
            </div>
            <input 
              type="text" 
              value={storyId} 
              onChange={(e) => handleStoryIdChange(e.target.value)} 
              placeholder="e.g. US-176 or US015 (Enter ID to auto-fetch & edit)" 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Story Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Implement PostgreSQL SSL Authentication" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Story Points</label>
            <input type="number" value={storyPoints} onChange={(e) => setStoryPoints(e.target.value)} min="1" max="21" className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
            <textarea rows="3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter details or acceptance criteria..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-md disabled:opacity-50">
            {loading ? "Analyzing & Planning..." : "⚡ Add, Predict & Plan"}
          </button>
        </form>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4">🎯 Prediction Result</h3>
            {prediction ? (
              <div className="space-y-4 bg-slate-900/90 p-5 rounded-xl border border-slate-700 animate-in fade-in zoom-in duration-300">
                <div>
                  <p className="text-xs text-slate-400">Predicted Priority</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${prediction.priority === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}`}>{prediction.priority || 'HIGH'}</span>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Estimated Effort Hours</p>
                  <p className="text-3xl font-black text-indigo-400 mt-1">{prediction.estimated_hours} <span className="text-lg text-indigo-400/70">hrs</span></p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 p-8 rounded-xl border border-slate-700/60 text-center text-slate-400 text-xs">
                Fill in the story details and submit to see AI priority classification.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}