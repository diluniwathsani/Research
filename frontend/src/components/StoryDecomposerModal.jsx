import React, { useState, useEffect } from "react";
import { 
  Sparkles, Layers, Scissors, CheckCircle2, AlertCircle, 
  X, Copy, Check, ArrowRight, ShieldCheck, FileText, 
  Clock, Hash, Sliders, ChevronDown, ChevronUp, Code
} from "lucide-react";
import { cleanStoryTitle } from "../utils/storyUtils";

export default function StoryDecomposerModal({
  isOpen,
  story,
  onClose,
  onApplySuccess
}) {
  const [loading, setLoading] = useState(false);
  const [decomposing, setDecomposing] = useState(false);
  const [decompositionPlan, setDecompositionPlan] = useState(null);
  const [subStories, setSubStories] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedGherkin, setExpandedGherkin] = useState({});
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (isOpen && story) {
      fetchDecomposition(story);
    } else {
      setDecompositionPlan(null);
      setSubStories([]);
      setErrorMsg(null);
    }
  }, [isOpen, story]);

  const fetchDecomposition = async (targetStory) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // If already a decomposed sub-story with BDD criteria, display directly
      if (targetStory.gherkin_criteria && (targetStory.is_auto_decomposed || (targetStory.story_id && targetStory.story_id.includes('.')))) {
        const cleanedTarget = { ...targetStory, title: cleanStoryTitle(targetStory.title) };
        setSubStories([cleanedTarget]);
        setDecompositionPlan({
          status: "success",
          parent_story: cleanedTarget,
          sub_stories: [cleanedTarget]
        });
        setExpandedGherkin({ 0: true });
        setLoading(false);
        return;
      }

      const res = await fetch("http://localhost:8082/api/stories/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story: targetStory })
      });
      const data = await res.json();
      if (data.status === "success") {
        const cleanedSubs = (data.sub_stories || []).map(s => ({
          ...s,
          title: cleanStoryTitle(s.title)
        }));
        setDecompositionPlan(data);
        setSubStories(cleanedSubs);
        // Expand first gherkin by default
        setExpandedGherkin({ 0: true });
      } else {
        setErrorMsg(data.message || "Failed to decompose story.");
      }
    } catch (err) {
      console.error("Decomposition Fetch Error:", err);
      setErrorMsg("Network error contacting AI Decomposer Engine.");
    } finally {
      setLoading(false);
    }
  };

  const handlePointChange = (index, newPts) => {
    const updated = [...subStories];
    updated[index].story_points = Number(newPts);
    setSubStories(updated);
  };

  const handleTitleChange = (index, newTitle) => {
    const updated = [...subStories];
    updated[index].title = newTitle;
    setSubStories(updated);
  };

  const handleCopyGherkin = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const toggleGherkin = (idx) => {
    setExpandedGherkin(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleApplyDecomposition = async () => {
    if (!story || !subStories.length) return;
    setDecomposing(true);
    try {
      const res = await fetch("http://localhost:8082/api/stories/apply-decomposition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_story_id: story.story_id,
          sub_stories: subStories
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        if (onApplySuccess) onApplySuccess(data);
        onClose();
      } else {
        setErrorMsg(data.message || "Failed to apply decomposition.");
      }
    } catch (err) {
      console.error("Apply Decomposition Error:", err);
      setErrorMsg("Error applying decomposition to sprints.");
    } finally {
      setDecomposing(false);
    }
  };

  if (!isOpen || !story) return null;

  const totalDecomposedPoints = subStories.reduce((sum, s) => sum + (Number(s.story_points) || 0), 0);
  const originalPoints = Number(story.story_points || 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 shadow-inner">
              <Scissors size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white tracking-tight">
                  AI Story Breakdown & Acceptance Criteria
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  INVEST Compliant
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Break down oversized user stories into manageable tasks with test scenarios (Given-When-Then)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Target Parent Story Summary Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30">
                  {story.story_id}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {story.epic || "General Epic"}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  story.priority_tier === "CRITICAL"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : story.priority_tier === "HIGH"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                }`}>
                  {story.priority_tier || "MEDIUM"}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white leading-snug">
                {cleanStoryTitle(story.title)}
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2">
                {story.description || story.reason || "No additional description provided."}
              </p>
            </div>

            {/* Points & Breakdown Stats */}
            <div className="flex items-center gap-4 shrink-0 bg-slate-900/90 p-3 rounded-xl border border-slate-700/70 text-xs">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Original</span>
                <span className="text-xl font-mono font-black text-rose-400">{originalPoints} pts</span>
              </div>
              <ArrowRight size={16} className="text-slate-500" />
              <div className="text-center">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Decomposed</span>
                <span className="text-xl font-mono font-black text-emerald-400">{totalDecomposedPoints} pts</span>
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Sparkles size={28} className="animate-spin text-indigo-400" />
              <span className="text-xs font-bold animate-pulse">
                AI Engine is analyzing technical boundaries, generating sub-stories and Gherkin BDD test scenarios...
              </span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Decomposed Sub-Stories List */}
          {!loading && subStories.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-400" />
                  <span>Proposed Atomic Sub-Stories ({subStories.length} Units)</span>
                </h4>
                <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <ShieldCheck size={13} />
                  <span>Verified Fits Cleanly in Sprints</span>
                </div>
              </div>

              <div className="space-y-3">
                {subStories.map((sub, idx) => (
                  <div 
                    key={idx}
                    className="bg-slate-800/90 border border-slate-700/90 hover:border-indigo-500/50 rounded-2xl p-4 shadow-md space-y-3 transition-all"
                  >
                    {/* Sub-Story Top Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-mono font-black text-xs text-emerald-400 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                          {sub.story_id}
                        </span>
                        <input
                          type="text"
                          value={sub.title}
                          onChange={(e) => handleTitleChange(idx, e.target.value)}
                          className="flex-1 bg-slate-900/90 border border-slate-700/80 text-white text-xs font-bold px-3 py-1.5 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>

                      {/* Points Selector */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-bold text-slate-400">Points:</span>
                        <select
                          value={sub.story_points}
                          onChange={(e) => handlePointChange(idx, e.target.value)}
                          className="bg-slate-900 border border-slate-700 text-indigo-400 font-mono font-bold text-xs px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {[1, 2, 3, 5, 8].map(p => (
                            <option key={p} value={p}>{p} pts</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 pl-1">
                      {sub.description}
                    </p>

                    {/* Gherkin BDD Scenario Drawer */}
                    {sub.gherkin_criteria && (
                      <div className="border border-slate-700/70 rounded-xl overflow-hidden bg-slate-950/70">
                        <div 
                          onClick={() => toggleGherkin(idx)}
                          className="p-2.5 bg-slate-900/90 hover:bg-slate-850 cursor-pointer flex items-center justify-between text-xs text-slate-300 font-bold select-none"
                        >
                          <div className="flex items-center gap-2">
                            <Code size={14} className="text-amber-400" />
                            <span>Gherkin BDD Acceptance Scenarios</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              (Given-When-Then)
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyGherkin(sub.gherkin_criteria, idx);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition-all flex items-center gap-1 border border-slate-700"
                            >
                              {copiedIndex === idx ? (
                                <>
                                  <Check size={12} className="text-emerald-400" />
                                  <span className="text-emerald-300">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy BDD</span>
                                </>
                              )}
                            </button>
                            {expandedGherkin[idx] ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </div>
                        </div>

                        {expandedGherkin[idx] && (
                          <div className="p-3 font-mono text-[11px] leading-relaxed text-slate-300 bg-slate-950/90 overflow-x-auto whitespace-pre border-t border-slate-800">
                            {sub.gherkin_criteria}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INVEST Compliance Matrix Strip */}
          <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Agile Quality Standards (INVEST Principles)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 size={13} />
                <span>Independent</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 size={13} />
                <span>Negotiable</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 size={13} />
                <span>Valuable</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 size={13} />
                <span>Estimable</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 size={13} />
                <span>Small (&lt;=5p)</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 size={13} />
                <span>Testable</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-5 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Sparkles size={14} className="text-amber-400" />
            <span>ILP Global Optimizer will automatically re-balance sprints on confirm.</span>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              onClick={onClose}
              disabled={decomposing}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyDecomposition}
              disabled={decomposing || loading || !subStories.length}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/30"
            >
              <Scissors size={14} className={decomposing ? "animate-spin" : ""} />
              <span>{decomposing ? "Optimizing Sprints..." : "Apply Decomposition to Backlog"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
