import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { Zap, GitBranch, ShieldAlert, CheckCircle2, TrendingUp, Layers } from "lucide-react";

const PRIORITY_MODELS = [
  { model:"Enhanced Hybrid (Proposed)", accuracy:87.40, f1:0.874, rank:"🏆 Proposed" },
  { model:"Random Forest Baseline",     accuracy:67.58, f1:0.673, rank:"🥇 1st Base" },
  { model:"Logistic Regression",        accuracy:66.77, f1:0.666, rank:"🥈 2nd Base" },
  { model:"Linear SVM",                 accuracy:66.51, f1:0.664, rank:"🥉 3rd Base" },
  { model:"Naive Bayes",                accuracy:65.35, f1:0.650, rank:"4th Base"    },
];

const EFFORT_MODELS = [
  { model:"Random Forest",    mae:1.78, r2:0.992, cv:0.794, rank:"🥇 Best" },
  { model:"Linear Regression",mae:1.96, r2:0.994, cv:"N/A",  rank:"🥈 2nd" },
];

const FEATURE_IMP = [
  { feature:"Initial Estimate Sum", importance:93.1 },
  { feature:"Completed Issues",     importance:5.1  },
  { feature:"Points per Dev/Day",   importance:0.4  },
  { feature:"Total Issues",         importance:0.3  },
  { feature:"Sprint Length",        importance:0.2  },
  { feature:"No. of Developers",    importance:0.2  },
];

const CONFUSION = [
  { actual:"Actual LOW",  predLow:7862, predHigh:1085 },
  { actual:"Actual HIGH", predLow:999,  predHigh:6598 },
];

const DALPIAZ_ROLES = [
  { role:"Applicant",               high:14, low:8   },
  { role:"Plan Review Staff",       high:8,  low:0   },
  { role:"Staff member",            high:18, low:24  },
  { role:"Publisher",               high:16, low:48  },
  { role:"Researcher",              high:40, low:152 },
  { role:"Admin",                   high:12, low:28  },
  { role:"Developer",               high:8,  low:64  },
  { role:"User",                    high:28, low:270 },
].map(r => ({ ...r, total: r.high + r.low, highPct: Math.round(r.high/(r.high+r.low)*100) }));

const KNAPSACK_BENCHMARK = [
  { metric: "Sprint 1 Value (Score)", greedy: 659.7, knapsack: 671.1, unit: "pts", winner: "🏆 Knapsack (+1.7%)" },
  { metric: "Capacity Utilization", greedy: 96.6, knapsack: 100.0, unit: "%", winner: "🏆 Knapsack (100%)" },
  { metric: "High-Priority Fulfillment", greedy: 80.0, knapsack: 100.0, unit: "%", winner: "🏆 Knapsack (100%)" },
  { metric: "Prerequisite DAG Violations", greedy: 1, knapsack: 0, unit: "violations", winner: "🏆 Knapsack (0)" },
  { metric: "Re-planning Latency", greedy: 8.5, knapsack: 12.2, unit: "ms", winner: "⚡ Real-Time" },
];

const ALLOCATION_RADAR = [
  { subject: 'Priority Fit', A: 98, B: 75, fullMark: 100 },
  { subject: 'Capacity Utilization', A: 100, B: 88, fullMark: 100 },
  { subject: 'Dependency Safety', A: 100, B: 60, fullMark: 100 },
  { subject: 'Unblocking Speed', A: 92, B: 70, fullMark: 100 },
  { subject: 'Blast Radius Containment', A: 95, B: 65, fullMark: 100 },
];

const tabs = [
  "🎯 Priority Prediction", 
  "✅ Cross-Dataset Validation", 
  "⏱ Effort Estimation", 
  "🧠 0/1 Knapsack & Allocation",
  "📋 Datasets"
];

export default function Performance() {
  const [tab, setTab] = useState(0);

  return (
    <div className="space-y-6 text-slate-100 p-2 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Model & Optimizer Performance</h2>
        <p className="text-xs text-slate-400 mt-1">
          Evaluation results for Priority Prediction, Effort Estimation, and 0/1 Multi-Knapsack Sprint Allocation
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-2">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 font-bold text-sm rounded-lg transition-all ${
              tab === i ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/30" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:"Proposed Accuracy", value:"87.40%", color:"text-emerald-400" },
              { label:"Baseline Accuracy", value:"67.58%", color:"text-slate-400" },
              { label:"Proposed F1 Score", value:"0.874", color:"text-indigo-400" },
              { label:"Improvement Boost", value:"+19.82%", color:"text-amber-400" },
            ].map((s, i) => (
              <div key={i} className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase">Model Comparison — Accuracy (%)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={PRIORITY_MODELS} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="model" tick={{ fill: "#94a3b8", fontSize:10 }} />
                  <YAxis domain={[60, 95]} tick={{ fill: "#94a3b8", fontSize:11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }} />
                  <Bar dataKey="accuracy" fill="#6366f1" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase">Confusion Matrix (Test Set)</h3>
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                  <tr><th className="p-3"></th><th className="p-3">Predicted LOW</th><th className="p-3">Predicted HIGH</th></tr>
                </thead>
                <tbody>
                  {CONFUSION.map((r, i) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      <td className="p-3 font-bold text-white">{r.actual}</td>
                      <td className={`p-3 font-bold ${i===0 ? 'text-emerald-400':'text-rose-400'}`}>{r.predLow.toLocaleString()}</td>
                      <td className={`p-3 font-bold ${i===1 ? 'text-emerald-400':'text-rose-400'}`}>{r.predHigh.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase">Dalpiaz Agile User Stories Cross-Validation</h3>
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                <tr><th className="p-3">User Role</th><th className="p-3">High</th><th className="p-3">Low</th><th className="p-3">Total</th><th className="p-3">% High</th></tr>
              </thead>
              <tbody>
                {DALPIAZ_ROLES.map((r, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    <td className="p-3 font-semibold text-white">{r.role}</td>
                    <td className="p-3 text-rose-400 font-bold">{r.high}</td>
                    <td className="p-3 text-emerald-400 font-bold">{r.low}</td>
                    <td className="p-3">{r.total}</td>
                    <td className="p-3 font-mono text-indigo-400 font-bold">{r.highPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase">Feature Importance (%)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={FEATURE_IMP} layout="vertical" margin={{ top:0, right:20, left:60, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize:11 }} />
                  <YAxis type="category" dataKey="feature" tick={{ fill: "#94a3b8", fontSize:10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }} />
                  <Bar dataKey="importance" fill="#38bdf8" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase">Effort Model Comparison</h3>
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                  <tr><th className="p-3">Model</th><th className="p-3">MAE</th><th className="p-3">R²</th><th className="p-3">Rank</th></tr>
                </thead>
                <tbody>
                  {EFFORT_MODELS.map((m, i) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      <td className={`p-3 ${i===0 ? 'font-bold text-white':'text-slate-300'}`}>{m.model}</td>
                      <td className="p-3 font-bold">{m.mae}</td>
                      <td className="p-3 font-bold">{m.r2}</td>
                      <td className="p-3">{m.rank}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* NEW TAB 3: 0/1 Knapsack & Allocation Benchmark */}
      {tab === 3 && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Benchmark Table */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase flex items-center gap-2">
                <Zap size={16} />
                0/1 Knapsack vs Greedy Bin-Packing Benchmark
              </h3>
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="p-3">Optimization Metric</th>
                    <th className="p-3">Greedy Baseline</th>
                    <th className="p-3">Proposed 0/1 Knapsack</th>
                    <th className="p-3">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {KNAPSACK_BENCHMARK.map((b, i) => (
                    <tr key={i} className="border-b border-slate-700/50">
                      <td className="p-3 font-semibold text-white">{b.metric}</td>
                      <td className="p-3 text-slate-400 font-mono">{b.greedy} {b.unit}</td>
                      <td className="p-3 text-emerald-400 font-bold font-mono">{b.knapsack} {b.unit}</td>
                      <td className="p-3 font-bold text-indigo-300">{b.winner}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Radar / Multi-criteria Fit Chart */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase flex items-center gap-2">
                <GitBranch size={16} />
                Multi-Objective Efficiency Profile
              </h3>
              <ResponsiveContainer width="100%" height={230}>
                <RadarChart data={ALLOCATION_RADAR} margin={{ top:0, right:20, left:20, bottom:0 }}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: "#94a3b8", fontSize:10 }} />
                  <PolarRadiusAxis domain={[0, 100]} stroke="#475569" />
                  <Radar name="Proposed 0/1 Knapsack" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
                  <Radar name="Greedy Baseline" dataKey="B" stroke="#64748b" fill="#64748b" fillOpacity={0.2} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 text-[11px] font-bold mt-2">
                <span className="text-indigo-400">■ Proposed 0/1 Knapsack Optimizer</span>
                <span className="text-slate-400">■ Standard Greedy Heuristic</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-6 shadow-lg space-y-2">
            <h3 className="text-sm font-bold text-indigo-300 uppercase flex items-center gap-2">
              <Layers size={16} />
              Key Phase 2 Research Innovation: Constraint-Satisfaction Allocation & Replanning
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Unlike classical sprint planning tools that apply simple first-fit greedy sorting, our framework formulates sprint allocation as a <b>Multi-Constraint 0/1 Knapsack Problem with DAG Dependency Satisfaction</b>. It maximizes total delivered business value per sprint capacity while guaranteeing zero prerequisite sequencing violations, unblocking downstream development flows, and providing instant blast radius containment during mid-sprint scope changes.
            </p>
          </div>
        </div>
      )}

      {tab === 4 && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase">Datasets Used in This Research</h3>
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                <tr><th className="p-3">Dataset</th><th className="p-3">Source</th><th className="p-3">Size</th><th className="p-3">Used For</th></tr>
              </thead>
              <tbody>
                {[
                  { name:"GitHub Issues", source:"Izadi et al. 2021", size:"82,719 issues", use:"Priority Prediction" },
                  { name:"Dalpiaz User Stories", source:"Dalpiaz 2018", size:"3,334 stories", use:"Validation" },
                  { name:"Aurora Sprints", source:"Agile Scrum Dataset", size:"40 sprints", use:"Effort Estimation" },
                  { name:"MESO Sprints", source:"Agile Scrum Dataset", size:"96 sprints", use:"Effort Estimation" },
                  { name:"Spring XD Sprints", source:"Agile Scrum Dataset", size:"66 sprints", use:"Effort Estimation" },
                ].map((d, i) => (
                  <tr key={i} className="border-b border-slate-700/50">
                    <td className="p-3 font-semibold text-white">{d.name}</td>
                    <td className="p-3 text-xs text-slate-400">{d.source}</td>
                    <td className="p-3"><span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-[10px] font-bold">{d.size}</span></td>
                    <td className="p-3"><span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded text-[10px] font-bold">{d.use}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-emerald-400 mb-2 uppercase">Research Contribution</h3>
            <p className="text-xs text-slate-300 leading-relaxed italic">
              "No existing study proposes a single integrated pipeline that combines priority prediction, effort estimation, and sprint allocation within one unified workflow that also supports dynamic re-planning in response to real-time scope change events. This research additionally validates the priority model on authentic Agile user stories, demonstrating cross-format generalisation capability not present in prior work."
            </p>
          </div>
        </div>
      )}
    </div>
  );
}