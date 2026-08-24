import React, { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from "recharts";

const PRIORITY_MODELS = [
  { model:"Random Forest",      accuracy:67.58, f1:0.673, rank:"🥇 Best" },
  { model:"Logistic Regression",accuracy:66.77, f1:0.666, rank:"🥈 2nd"  },
  { model:"Linear SVM",         accuracy:66.51, f1:0.664, rank:"🥉 3rd"  },
  { model:"Naive Bayes",        accuracy:65.35, f1:0.650, rank:"4th"      },
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
  { actual:"Actual LOW",  predLow:6697, predHigh:2250 },
  { actual:"Actual HIGH", predLow:3114, predHigh:4483 },
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

const tabs = ["🎯 Priority Prediction", "✅ Cross-Dataset Validation", "⏱ Effort Estimation", "📋 Datasets"];

export default function Performance() {
  const [tab, setTab] = useState(0);

  return (
    <div className="space-y-6 text-slate-100 p-2">
      <div>
        <h2 className="text-2xl font-extrabold text-white">Model Performance</h2>
        <p className="text-xs text-slate-400 mt-1">Evaluation results for Priority Prediction and Effort Estimation models</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-2">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 font-bold text-sm rounded-lg transition-all ${
              tab === i ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:"Accuracy", value:"67.58%", color:"text-indigo-400" },
              { label:"F1 Score", value:"0.673", color:"text-white" },
              { label:"Training Samples", value:"66,175", color:"text-white" },
              { label:"Test Samples", value:"16,544", color:"text-amber-400" },
            ].map((s, i) => (
              <div key={i} className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase">Model Comparison — Accuracy</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={PRIORITY_MODELS} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="model" tick={{ fill: "#94a3b8", fontSize:11 }} />
                  <YAxis domain={[64, 68.5]} tick={{ fill: "#94a3b8", fontSize:11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }} />
                  <Bar dataKey="accuracy" fill="#4f46e5" radius={[4,4,0,0]} />
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
              <p className="text-xs text-slate-400 mt-3">✅ Correctly classified: 11,180 out of 16,544</p>
            </div>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 rounded-2xl p-6 shadow-lg border border-indigo-500/30 flex items-center gap-4">
            <div className="text-4xl">✅</div>
            <div>
              <h3 className="text-lg font-black text-white">Cross-Dataset Validation Passed</h3>
              <p className="text-indigo-200 text-xs mt-1">Model trained on GitHub Issues successfully generalised to 3,334 real Agile user stories</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/90 border-2 border-indigo-500/50 rounded-2xl p-6 shadow-lg">
               <div className="flex items-center gap-3 mb-4">
                 <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded">PRIMARY</span>
                 <span className="font-bold text-white text-sm">GitHub Issues Test Set</span>
               </div>
               <div className="space-y-2 border-b border-slate-700 pb-3">
                 <div className="flex justify-between"><span className="text-xs text-slate-400">Accuracy</span><span className="text-sm font-bold text-indigo-400">67.58%</span></div>
                 <div className="flex justify-between"><span className="text-xs text-slate-400">F1 Score</span><span className="text-sm font-bold text-white">0.673</span></div>
                 <div className="flex justify-between"><span className="text-xs text-slate-400">Samples</span><span className="text-sm font-bold text-white">16,544</span></div>
               </div>
               <p className="text-[10px] text-slate-500 italic mt-3">Dataset: Izadi et al. (2021) — Zenodo</p>
            </div>

            <div className="bg-slate-800/90 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-lg">
               <div className="flex items-center gap-3 mb-4">
                 <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded">VALIDATION</span>
                 <span className="font-bold text-white text-sm">Dalpiaz User Stories</span>
               </div>
               <div className="space-y-2 border-b border-slate-700 pb-3">
                 <div className="flex justify-between"><span className="text-xs text-slate-400">Stories Processed</span><span className="text-sm font-bold text-white">3,334</span></div>
                 <div className="flex justify-between"><span className="text-xs text-slate-400">HIGH Priority</span><span className="text-sm font-bold text-emerald-400">438 (13.1%)</span></div>
                 <div className="flex justify-between"><span className="text-xs text-slate-400">LOW Priority</span><span className="text-sm font-bold text-amber-400">2,896 (86.9%)</span></div>
                 <div className="flex justify-between"><span className="text-xs text-slate-400">Avg Confidence</span><span className="text-sm font-bold text-white">63.8%</span></div>
               </div>
               <p className="text-[10px] text-slate-500 italic mt-3">Dataset: Dalpiaz (2018) — Mendeley Data</p>
            </div>
          </div>

          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
            <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase">HIGH Priority Distribution by User Role</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={DALPIAZ_ROLES} margin={{ top:0, right:10, left:-10, bottom:60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="role" tick={{ fill: "#94a3b8", fontSize:10, angle:-35, textAnchor:"end" }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize:10 }} />
                <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }} />
                <Bar dataKey="high" name="HIGH Priority" fill="#4f46e5" radius={[4,4,0,0]} />
                <Bar dataKey="low"  name="LOW Priority" fill="#475569" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:"R² Score", value:"0.992", color:"text-emerald-400" },
              { label:"MAE (story pts)", value:"1.78", color:"text-indigo-400" },
              { label:"CV R² Average", value:"0.794", color:"text-white" },
              { label:"Training Samples", value:"190", color:"text-amber-400" },
            ].map((s, i) => (
              <div key={i} className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 shadow-lg">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs font-semibold text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm font-bold text-indigo-400 mb-4 uppercase">Feature Importance</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={FEATURE_IMP} layout="vertical" margin={{ top:0, right:10, left:10, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" tick={{ fill: "#94a3b8", fontSize:10 }} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="feature" width={140} tick={{ fill: "#94a3b8", fontSize:10 }} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#f8fafc" }} formatter={v => `${v}%`} />
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

      {tab === 3 && (
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