import React from "react";
import { LayoutDashboard, Zap, Target, Cpu, GitBranch, RefreshCw, Layers } from "lucide-react";

export default function SprintDashboard() {
  return (
    <div className="space-y-6 text-slate-100 p-2 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
          <LayoutDashboard className="text-indigo-400" size={24} />
          Agile AI Sprint Planning & Optimization Dashboard
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Integrated NLP Priority Classification, Machine Learning Effort Forecasting, Global Integer Linear Programming (ILP) & Mid-Sprint Re-Planning
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Priority Engine</p>
            <p className="text-lg font-black text-white">Enhanced Hybrid</p>
            <span className="text-[10px] text-emerald-400 font-bold">Accuracy: 87.40% (4-Tier)</span>
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
            <Target size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Effort Predictor</p>
            <p className="text-lg font-black text-white">Text-to-Fibonacci</p>
            <span className="text-[10px] text-indigo-400 font-bold">R²: 0.992 | MAE: 1.78</span>
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
            <Cpu size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Sprint Allocator</p>
            <p className="text-lg font-black text-white">ILP Optimizer (HiGHS)</p>
            <span className="text-[10px] text-purple-300 font-bold">DAG Constraints + Dynamic Cap</span>
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <RefreshCw size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400">Re-Planning Engine</p>
            <p className="text-lg font-black text-white">Blast Radius Analyzer</p>
            <span className="text-[10px] text-amber-300 font-bold">Change Management Sync</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg space-y-3">
          <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
            <Layers size={16} />
            🔬 System Research Architecture
          </h3>
          <ul className="text-xs text-slate-300 space-y-2.5">
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <div>
                <b>Phase 1: Domain-Enriched NLP & 4-Tier Agile Priority</b> — Combines TF-IDF lexical frequency with Software Engineering security/stability cues for calibrated severity rating.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <div>
                <b>Phase 2: 0/1 Knapsack & Dynamic Scope Re-Planning</b> — Handles mid-sprint scope changes with automated blast radius ripple effect analysis and cross-module artifact synchronization.
              </div>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-400 font-bold">•</span>
              <div>
                <b>Phase 3: Global Integer Linear Programming (ILP) & DAG Prerequisite Satisfaction</b> — Formulates multi-sprint capacity optimization to eliminate prerequisite sequencing violations with dynamic velocity limits.
              </div>
            </li>
          </ul>
        </div>

        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg space-y-3">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <GitBranch size={16} />
            ⚡ Quick Module Navigation
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80">
              <p className="font-bold text-white mb-1">➕ Add Stories</p>
              <p className="text-slate-400 text-[11px]">Instant text-to-effort Fibonacci prediction and priority rating.</p>
            </div>
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80">
              <p className="font-bold text-white mb-1">📅 Sprint Plan</p>
              <p className="text-slate-400 text-[11px]">Run SciPy HiGHS ILP solver and visualize DAG dependency flows.</p>
            </div>
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80">
              <p className="font-bold text-white mb-1">⚡ Replanning</p>
              <p className="text-slate-400 text-[11px]">Simulate scope changes and evaluate displacement risks.</p>
            </div>
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700/80">
              <p className="font-bold text-white mb-1">🏆 Performance</p>
              <p className="text-slate-400 text-[11px]">View 3-way scientific benchmark tables and model accuracy metrics.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}