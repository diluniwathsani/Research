import React, { useState, useEffect } from "react";
import { Sparkles, ShieldAlert, Clock, ArrowRight, CheckCircle2, AlertCircle, GitBranch } from "lucide-react";

export default function AddStories({ onStoryAdded }) {
  const [storyId, setStoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [storyPoints, setStoryPoints] = useState(3);
  const [targetSprint, setTargetSprint] = useState("auto");
  const [dependencies, setDependencies] = useState("");
  const [existingStories, setExistingStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [alert, setAlert] = useState(null);

  const plannedSprintCount = (() => {
    try {
      const email = localStorage.getItem('user_email') || 'default';
      const c = parseInt(
        localStorage.getItem(`planned_sprints_${email}`) || 
        localStorage.getItem('total_sprints_count') || 
        localStorage.getItem('target_sprint_count') || 
        '0', 
        10
      );
      if (c > 0) return c;
    } catch (_) {}
    return 3;
  })();

  useEffect(() => {
    fetchExistingStories();
  }, []);

  const fetchExistingStories = async () => {
    try {
      const res = await fetch("http://localhost:8082/api/stories");
      const data = await res.json();
      if (data.status === "success" && data.stories) {
        setExistingStories(data.stories);
      }
    } catch (err) {
      console.error("Error loading stories:", err);
    }
  };

  const showAlert = (msg, type = "success") => {
    setAlert({ msg, type });
    setTimeout(() => setAlert(null), 5000);
  };

  // Instant AI Preview of Priority and Effort without submitting
  const handleLiveAnalyze = async () => {
    if (!title.trim()) {
      showAlert("Please enter a story title first.", "error");
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await fetch("http://localhost:8082/api/predict-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const data = await res.json();
      if (data.status === "success" && data.prediction) {
        setPrediction(data.prediction);
        setStoryPoints(data.prediction.recommended_story_points);
        showAlert("✨ AI analyzed the story and auto-estimated effort!", "success");
      }
    } catch (err) {
      console.error("Preview Error:", err);
      showAlert("Failed to connect to AI Engine. Make sure api.py is running.", "error");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePredictAndSubmit = async (e) => {
    e.preventDefault();
    if (!title) return;
    setLoading(true);
    setAlert(null);

    try {
      const response = await fetch("http://localhost:8082/api/stories/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          story_id: storyId.trim() || `US${Math.floor(Math.random() * 899 + 100)}`,
          title: title,
          description: description,
          story_points: Number(storyPoints),
          target_sprint: targetSprint === "auto" ? null : Number(targetSprint),
          dependencies: dependencies ? dependencies.split(",").map(d => d.trim()) : []
        }),
      });

      const data = await response.json();
      
      if (!response.ok || data.status === "error") {
        throw new Error(data.message || "Failed to add story.");
      }
      
      if (data.status === "success") {
        const ourStory = data.story || (data.tasks ? data.tasks.find(t => t.title === title) : null);
        if (ourStory) {
          setPrediction(ourStory);
          const noticeMsg = `✨ Story ${ourStory.story_id} ("${ourStory.title}") was successfully added to Sprint ${ourStory.sprint_number} without changing previously generated plan!`;
          showAlert(noticeMsg, "success");
          
          try {
            sessionStorage.setItem('sprint_plan_notice', noticeMsg);
          } catch (_) {}

          window.dispatchEvent(new Event('sprints-updated'));
          
          setStoryId("");
          setTitle("");
          setDescription("");
          setDependencies("");
          fetchExistingStories();

          // Seamlessly transition to Sprint Plan session so user lands right in the updated plan
          setTimeout(() => {
            if (onStoryAdded) {
              onStoryAdded(ourStory);
            }
          }, 800);
        }
      }
    } catch (err) {
      console.error("Prediction Error:", err);
      showAlert(err.message, "error"); 
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier) => {
    switch (tier) {
      case "CRITICAL":
        return "bg-rose-500/20 text-rose-400 border-rose-500/40";
      case "HIGH":
        return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "MEDIUM":
        return "bg-sky-500/20 text-sky-400 border-sky-500/40";
      default:
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    }
  };

  return (
    <div className="space-y-6 text-slate-100 p-2 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <Sparkles className="text-indigo-400" size={24} />
          Add User Stories & Advanced AI Predict
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Automated 4-tier Priority Classification (Critical/High/Medium/Low), Calibrated Confidence, Fibonacci Effort, and DAG Dependencies
        </p>
      </div>

      {alert && (
        <div className={`p-4 rounded-xl font-bold text-sm border shadow-lg flex items-center gap-3 ${
          alert.type === 'error' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        }`}>
          {alert.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {alert.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <form onSubmit={handlePredictAndSubmit} className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">➕ Story Parameters</h3>
            <button
              type="button"
              onClick={handleLiveAnalyze}
              disabled={previewLoading || !title}
              className="text-xs bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-40"
            >
              <Sparkles size={14} />
              {previewLoading ? "Analyzing..." : "Auto-Estimate"}
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Story ID</label>
            <input 
              type="text" 
              value={storyId} 
              onChange={(e) => setStoryId(e.target.value)} 
              placeholder="e.g. US015 (Optional - auto-generated if blank)" 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500" 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Story Title *</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g. Prevent SQL injection in login authentication"
              required 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500" 
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-300">Story Points</label>
                <span className="text-[10px] text-indigo-400 font-mono">1, 2, 3, 5, 8, 13</span>
              </div>
              <input 
                type="number" 
                value={storyPoints} 
                onChange={(e) => setStoryPoints(e.target.value)} 
                min="1" 
                max="21" 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Target Sprint</label>
              <select 
                value={targetSprint} 
                onChange={(e) => setTargetSprint(e.target.value)} 
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer"
              >
                <option value="auto">✨ Auto-Assign (Smart)</option>
                {Array.from({ length: Math.max(3, plannedSprintCount) }, (_, i) => i + 1).map((sNum) => (
                  <option key={sNum} value={sNum}>Sprint {sNum}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Dependencies (Prerequisites)</label>
            <input 
              type="text" 
              value={dependencies} 
              onChange={(e) => setDependencies(e.target.value)} 
              placeholder="e.g. US001, US008" 
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500" 
            />
          </div>

          {existingStories.length > 0 && (
            <div className="text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Available Prerequisite Stories:</span>{" "}
              {existingStories.slice(0, 5).map(s => s.story_id).join(", ")}...
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Acceptance Context</label>
            <textarea 
              rows="3" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Provide background, technical scope, or business importance..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:ring-2 focus:ring-indigo-500"
            ></textarea>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? "Adding to Sprint Plan..." : (
              <>
                <span>⚡ Add Story & Seamlessly Update Sprint Plan</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Prediction Results Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldAlert size={16} />
              🎯 AI Analysis & Decision Output
            </h3>

            {prediction ? (
              <div className="space-y-4 bg-slate-900/90 p-5 rounded-xl border border-slate-700 animate-in fade-in zoom-in duration-300">
                {/* Priority Tier & Confidence */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Classified Tier</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-black border shadow-sm ${getTierColor(prediction.priority_tier || prediction.priority)}`}>
                        {prediction.priority_tier || prediction.priority} PRIORITY
                      </span>
                      {prediction.confidence && (
                        <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {prediction.confidence}% Confident
                        </span>
                      )}
                    </div>
                  </div>

                  {prediction.priority_score && (
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">Severity Score</p>
                      <p className="text-xl font-black text-indigo-400">{prediction.priority_score}<span className="text-xs text-slate-500">/100</span></p>
                    </div>
                  )}
                </div>

                {/* Score Progress Bar */}
                {prediction.priority_score && (
                  <div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          prediction.priority_score >= 80 ? 'bg-rose-500' :
                          prediction.priority_score >= 55 ? 'bg-amber-500' :
                          prediction.priority_score >= 35 ? 'bg-sky-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${prediction.priority_score}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Effort & Hours */}
                <div className="grid grid-cols-2 gap-4 bg-slate-800/50 p-3 rounded-lg border border-slate-800">
                  <div>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock size={13} className="text-indigo-400" />
                      Estimated Effort
                    </p>
                    <p className="text-2xl font-black text-white mt-0.5">
                      {prediction.estimated_hours} <span className="text-xs text-slate-400 font-normal">hrs</span>
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">Story Points</p>
                    <p className="text-2xl font-black text-indigo-400 mt-0.5">
                      {prediction.story_points || prediction.recommended_story_points || 3} <span className="text-xs text-slate-400 font-normal">pts</span>
                    </p>
                  </div>
                </div>

                {/* AI Rationale / Urgency Reason */}
                {prediction.reason && (
                  <div className="text-xs bg-slate-800/70 p-3 rounded-lg border border-slate-700/60 text-slate-300">
                    <span className="font-bold text-indigo-300 block mb-1">🤖 AI Classification Reason:</span>
                    {prediction.reason}
                  </div>
                )}

                {/* Effort Rationale */}
                {prediction.effort_rationale && (
                  <div className="text-[11px] text-slate-400 italic">
                    ℹ️ Scope: {prediction.effort_rationale}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900/60 p-10 rounded-xl border border-slate-700/60 text-center text-slate-400 text-xs space-y-2">
                <Sparkles className="mx-auto text-indigo-400/50" size={32} />
                <p className="font-semibold text-slate-300">No Story Evaluated Yet</p>
                <p>Type a story title and click <b>Auto-Estimate</b> or submit to view priority rating, effort forecast, and Knapsack sprint placement.</p>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 mt-4 border-t border-slate-800 pt-3">
            Engine: Hybrid TF-IDF + Domain Lexicons + 0/1 Multi-Knapsack & DAG Optimizer
          </div>
        </div>
      </div>
    </div>
  );
}