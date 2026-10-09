import React, { useState } from "react";
import { 
  Users, UserPlus, Edit2, Trash2, Shield, Check, X, 
  RotateCcw, Sparkles, Award, Zap, Code, Terminal, 
  Cpu, AlertCircle, CheckCircle2, ChevronRight, Info
} from "lucide-react";

export default function ManageTeamModal({ 
  isOpen, 
  onClose, 
  developers = [], 
  onTeamUpdated 
}) {
  const [editingDev, setEditingDev] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    primary_domain: "Backend",
    skills: "",
    capacity_pts_per_sprint: 12,
    hourly_rate: 40
  });

  if (!isOpen) return null;

  const domainOptions = [
    "Senior Backend",
    "Senior Frontend",
    "Full-Stack Senior Engineer",
    "QA / Testing",
    "DevOps & Cloud",
    "Security Architect",
    "UI/UX Specialist"
  ];

  const skillSuggestions = [
    "security", "auth", "backend", "database", "sql", "api", "cve", "payment",
    "frontend", "ui", "ux", "react", "styling", "css", "theme", "dashboard",
    "fullstack", "export", "jira", "azure", "csv", "report", "filter", "pdf",
    "qa", "testing", "automation", "verification", "devops", "docker", "pipeline"
  ];

  const handleStartAdd = () => {
    setEditingDev(null);
    setFormData({
      name: "",
      role: "",
      primary_domain: "Senior Backend",
      skills: "",
      capacity_pts_per_sprint: 12,
      hourly_rate: 40
    });
    setIsAddingNew(true);
    setErrorMsg(null);
  };

  const handleStartEdit = (dev) => {
    setIsAddingNew(false);
    setEditingDev(dev);
    setFormData({
      name: dev.name || "",
      role: dev.role || "",
      primary_domain: dev.primary_domain || "Senior Backend",
      skills: Array.isArray(dev.skills) ? dev.skills.join(", ") : (dev.skills || ""),
      capacity_pts_per_sprint: dev.capacity_pts_per_sprint || 12,
      hourly_rate: dev.hourly_rate || 40
    });
    setErrorMsg(null);
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.role.trim()) {
      setErrorMsg("Please provide developer name and role/designation.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      if (isAddingNew) {
        const res = await fetch("http://localhost:8082/api/team/members/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.status === "success") {
          setSuccessMsg(`Team member ${formData.name} added successfully!`);
          if (onTeamUpdated) onTeamUpdated(data);
          setIsAddingNew(false);
        } else {
          setErrorMsg(data.message || "Failed to add team member");
        }
      } else if (editingDev) {
        const res = await fetch(`http://localhost:8082/api/team/members/${editingDev.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });
        const data = await res.json();
        if (data.status === "success") {
          setSuccessMsg(`Team member ${formData.name} updated!`);
          if (onTeamUpdated) onTeamUpdated(data);
          setEditingDev(null);
        } else {
          setErrorMsg(data.message || "Failed to update member");
        }
      }
    } catch (err) {
      setErrorMsg(err.message || "Network error while saving team member");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleDeleteMember = async (devId, devName) => {
    if (!window.confirm(`Are you sure you want to remove ${devName} from this project squad?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8082/api/team/members/${devId}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (data.status === "success") {
        setSuccessMsg(`Removed ${devName} from squad`);
        if (onTeamUpdated) onTeamUpdated(data);
        if (editingDev?.id === devId) setEditingDev(null);
      }
    } catch (err) {
      setErrorMsg("Error removing team member");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleResetToDefault = async () => {
    if (!window.confirm("Reset team roster back to standard 5-member Agile Squad?")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8082/api/team/members/reset", {
        method: "POST"
      });
      const data = await res.json();
      if (data.status === "success") {
        setSuccessMsg("Team roster reset to default Agile squad!");
        if (onTeamUpdated) onTeamUpdated(data);
        setEditingDev(null);
        setIsAddingNew(false);
      }
    } catch (err) {
      setErrorMsg("Error resetting squad roster");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const addSkillChip = (skill) => {
    const current = formData.skills ? formData.skills.split(",").map(s => s.trim()).filter(Boolean) : [];
    if (!current.includes(skill)) {
      current.push(skill);
      setFormData({ ...formData, skills: current.join(", ") });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <Users size={22} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                Project Manager Team Roster & Skill Matrix
              </h3>
              <p className="text-xs text-slate-400">
                Manage squad members, individual sprint point capacities, and domain skillset profiles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetToDefault}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Reset to default 5-member team"
            >
              <RotateCcw size={13} />
              <span>Reset Squad</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body: Two Columns (Roster List vs Add/Edit Form) */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Squad Members Roster (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Users size={14} className="text-indigo-400" />
                Active Squad ({developers.length} Engineers)
              </h4>
              <button
                onClick={handleStartAdd}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
              >
                <UserPlus size={14} />
                <span>Add Member</span>
              </button>
            </div>

            {/* Developer Cards */}
            <div className="space-y-3">
              {developers.map((dev) => (
                <div 
                  key={dev.id}
                  className={`p-4 rounded-xl border transition-all ${
                    editingDev?.id === dev.id 
                      ? "bg-indigo-950/40 border-indigo-500/70 shadow-lg" 
                      : "bg-slate-950/70 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${dev.avatar_bg || 'bg-indigo-600'} text-white font-bold text-sm flex items-center justify-center shadow`}>
                        {dev.initials || dev.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">{dev.name}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-indigo-300">
                            {dev.id}
                          </span>
                        </div>
                        <span className="text-xs text-slate-300 font-medium block">{dev.role}</span>
                        <span className="text-[11px] text-slate-400 block font-mono">Domain: {dev.primary_domain}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(dev)}
                        className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit member"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(dev.id, dev.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                        title="Delete member"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Skills Chips */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-slate-500 font-semibold text-[10px]">Skills:</span>
                    {(dev.skills || []).map((sk, sIdx) => (
                      <span key={sIdx} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700/80 text-emerald-300 font-mono text-[10px]">
                        #{sk}
                      </span>
                    ))}
                  </div>

                  {/* Metrics Footer */}
                  <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Sprint Capacity: <strong className="text-white">{dev.capacity_pts_per_sprint || 12} pts</strong></span>
                    <span>Rate: <strong className="text-indigo-300">${dev.hourly_rate || 40}/hr</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Add/Edit Developer Form & AI Matching Explanation (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Form Container */}
            <div className="bg-slate-950/90 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                {isAddingNew ? <UserPlus size={15} className="text-emerald-400" /> : <Edit2 size={15} className="text-indigo-400" />}
                <span>{isAddingNew ? "Add New Developer" : (editingDev ? `Edit ${editingDev.name}` : "Member Profile")}</span>
              </h4>

              {(!isAddingNew && !editingDev) ? (
                <div className="p-6 text-center text-slate-400 text-xs space-y-2">
                  <Users size={32} className="mx-auto text-slate-600" />
                  <p>Select a squad member on the left to edit their skillset and capacity, or click <strong>Add Member</strong>.</p>
                </div>
              ) : (
                <form onSubmit={handleSaveMember} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Developer Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kasun Perera"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Role / Designation</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Backend & Security Architect"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Primary Domain Specialization</label>
                    <select
                      value={formData.primary_domain}
                      onChange={(e) => setFormData({ ...formData, primary_domain: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    >
                      {domainOptions.map((opt, oIdx) => (
                        <option key={oIdx} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Technical Skills (Comma-separated)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. security, auth, backend, sql, api, cve"
                      value={formData.skills}
                      onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                    {/* Quick suggestion chips */}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {skillSuggestions.slice(0, 10).map((sk, skIdx) => (
                        <button
                          key={skIdx}
                          type="button"
                          onClick={() => addSkillChip(sk)}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-700/60 hover:border-indigo-500/80 text-slate-400 hover:text-white transition-all"
                        >
                          +{sk}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Sprint Capacity (Pts)</label>
                      <input
                        type="number"
                        min="5"
                        max="40"
                        value={formData.capacity_pts_per_sprint}
                        onChange={(e) => setFormData({ ...formData, capacity_pts_per_sprint: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Hourly Rate ($/hr)</label>
                      <input
                        type="number"
                        min="15"
                        max="200"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData({ ...formData, hourly_rate: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                    >
                      <Check size={14} />
                      <span>{loading ? "Saving..." : (isAddingNew ? "Add to Squad" : "Save Changes")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsAddingNew(false); setEditingDev(null); }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* AI Skill Matching Methodology & Research Info Card */}
            <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30 p-4 rounded-2xl space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <Sparkles size={15} />
                <span>How AI Evaluates Skill Suitability</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                The NLP Engine extracts technical keywords (e.g. <span className="text-emerald-300 font-mono">cve, auth, react, styling, export</span>) from user story sentences and calculates the semantic cosine affinity with each developer's skillset matrix.
              </p>
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span>Keyword Match Boost:</span>
                  <span className="text-emerald-400">+5% per token match</span>
                </div>
                <div className="flex justify-between">
                  <span>Domain Synergy Score:</span>
                  <span className="text-indigo-400">84% - 90% Baseline</span>
                </div>
                <div className="flex justify-between">
                  <span>MR-ILP Optimization:</span>
                  <span className="text-amber-400">Minimizes σ(Workload)</span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Multi-Resource Integer Linear Programming (MR-ILP) with Dynamic Team Roster</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow"
          >
            Done Managing Team
          </button>
        </div>

      </div>
    </div>
  );
}
