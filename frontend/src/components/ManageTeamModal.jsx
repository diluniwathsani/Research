import React, { useState } from "react";
import axios from "axios";
import { 
  Users, UserPlus, Edit2, Trash2, Shield, Check, X, 
  RotateCcw, Sparkles, Award, Zap, Code, Terminal, 
  Cpu, AlertCircle, CheckCircle2, Plus, Tag, ChevronRight, Info
} from "lucide-react";

const EXPRESS_API = "http://localhost:3000/api";
const FLASK_API = "http://localhost:8082/api";

const DOMAIN_OPTIONS = [
  { value: "frontend", label: "Frontend Development", color: "text-sky-400 bg-sky-950/60 border-sky-800" },
  { value: "backend", label: "Backend & Systems", color: "text-emerald-400 bg-emerald-950/60 border-emerald-800" },
  { value: "ai", label: "AI / Machine Learning", color: "text-purple-400 bg-purple-950/60 border-purple-800" },
  { value: "qa", label: "QA & Test Automation", color: "text-amber-400 bg-amber-950/60 border-amber-800" },
  { value: "devops", label: "DevOps & Infrastructure", color: "text-rose-400 bg-rose-950/60 border-rose-800" },
  { value: "fullstack", label: "Full-Stack Engineering", color: "text-indigo-400 bg-indigo-950/60 border-indigo-800" },
];

const SKILL_CATALOG = {
  frontend: ["React", "JavaScript", "TypeScript", "Tailwind", "Next.js", "HTML/CSS", "jsPDF", "Vue", "Redux", "CSS"],
  backend: ["Node.js", "Python", "PostgreSQL", "SQL", "OAuth", "Express", "Docker", "REST API", "Microservices", "Security"],
  ai: ["Python", "Machine Learning", "NLP", "Spacy", "Scikit-Learn", "PyTorch", "TensorFlow", "SVM", "Deep Learning"],
  qa: ["QA Automation", "Cypress", "Selenium", "Jest", "Unit Testing", "Playwright", "E2E Testing"],
  devops: ["Docker", "Kubernetes", "AWS", "CI/CD", "DevOps", "Linux", "Terraform", "Nginx", "GitHub Actions"]
};

export default function ManageTeamModal({ 
  isOpen, 
  onClose, 
  developers = [], 
  onTeamUpdated 
}) {
  const [editingDev, setEditingDev] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [customSkillInput, setCustomSkillInput] = useState("");

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    role: "Senior Developer",
    primary_domain: "backend",
    skills: ["Node.js", "PostgreSQL", "JavaScript"],
    capacity_hours: 40,
    email: ""
  });

  if (!isOpen) return null;

  // Helper to extract skills array from dev object
  const getDevSkills = (dev) => {
    if (Array.isArray(dev.languages) && dev.languages.length > 0) return dev.languages;
    if (Array.isArray(dev.skills) && dev.skills.length > 0) return dev.skills;
    if (typeof dev.languages === "string" && dev.languages.trim()) {
      return dev.languages.split(",").map(s => s.trim()).filter(Boolean);
    }
    if (typeof dev.skills === "string" && dev.skills.trim()) {
      return dev.skills.split(",").map(s => s.trim()).filter(Boolean);
    }
    return ["General"];
  };

  const handleStartAdd = () => {
    setEditingDev(null);
    setFormData({
      name: "",
      role: "Senior Developer",
      primary_domain: "backend",
      skills: ["Node.js", "PostgreSQL", "JavaScript"],
      capacity_hours: 40,
      email: ""
    });
    setCustomSkillInput("");
    setIsAddingNew(true);
    setErrorMsg(null);
  };

  const handleStartEdit = (dev) => {
    setIsAddingNew(false);
    setEditingDev(dev);
    const domain = (dev.primary_domain || "backend").toLowerCase();
    setFormData({
      name: dev.name || "",
      role: dev.role || "Developer",
      primary_domain: domain,
      skills: getDevSkills(dev),
      capacity_hours: Number(dev.capacity_hours) || 40,
      email: dev.email || ""
    });
    setCustomSkillInput("");
    setErrorMsg(null);
  };

  const handleAddSkill = (skillToAdd) => {
    const trimmed = (skillToAdd || "").trim();
    if (!trimmed) return;
    if (!formData.skills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, trimmed]
      }));
    }
    setCustomSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s.toLowerCase() !== skillToRemove.toLowerCase())
    }));
  };

  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Please provide developer name.");
      return;
    }
    if (formData.skills.length === 0) {
      setErrorMsg("Please add at least one technical skill.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const payload = {
      name: formData.name.trim(),
      role: formData.role.trim() || "Developer",
      primary_domain: formData.primary_domain.toLowerCase(),
      languages: formData.skills,
      skills: formData.skills,
      capacity_hours: Number(formData.capacity_hours) || 40,
      email: formData.email.trim() || `${formData.name.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`
    };

    try {
      if (isAddingNew) {
        // 1. Save to Express / Neon DB
        await axios.post(`${EXPRESS_API}/developers`, payload);

        // 2. Also notify Flask if available
        try {
          await axios.post(`${FLASK_API}/team/members/add`, {
            name: payload.name,
            role: payload.role,
            primary_domain: payload.primary_domain,
            skills: payload.skills.join(", "),
            capacity_pts_per_sprint: Math.round(payload.capacity_hours / 3.3)
          });
        } catch (_) {}

        setSuccessMsg(`Resource "${payload.name}" added successfully with ${payload.skills.length} skills!`);
        setIsAddingNew(false);
      } else if (editingDev) {
        // 1. Update in Express / Neon DB
        await axios.put(`${EXPRESS_API}/developers/${editingDev.id}`, payload);

        // 2. Also notify Flask if available
        try {
          await axios.put(`${FLASK_API}/team/members/${editingDev.id}`, {
            name: payload.name,
            role: payload.role,
            primary_domain: payload.primary_domain,
            skills: payload.skills.join(", "),
            capacity_pts_per_sprint: Math.round(payload.capacity_hours / 3.3)
          });
        } catch (_) {}

        setSuccessMsg(`Resource "${payload.name}" profile and skills updated successfully!`);
        setEditingDev(null);
      }

      if (onTeamUpdated) onTeamUpdated();
    } catch (err) {
      console.error("Save error:", err);
      setErrorMsg(err.response?.data?.error || err.message || "Failed to save developer");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const handleDeleteMember = async (devId, devName) => {
    if (!window.confirm(`Are you sure you want to remove ${devName} from the resource allocation pool?`)) {
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Express / Neon DB
      await axios.delete(`${EXPRESS_API}/developers/${devId}`);

      // 2. Flask fallback
      try {
        await axios.delete(`${FLASK_API}/team/members/${devId}`);
      } catch (_) {}

      setSuccessMsg(`Resource "${devName}" removed from resource pool.`);
      if (editingDev?.id === devId) setEditingDev(null);
      if (onTeamUpdated) onTeamUpdated();
    } catch (err) {
      console.error("Delete error:", err);
      setErrorMsg(err.response?.data?.error || err.message || "Failed to remove developer");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  const activeCatalog = SKILL_CATALOG[formData.primary_domain] || SKILL_CATALOG.backend;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <Users size={22} />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                Resource & Skill Management Matrix
              </h3>
              <p className="text-xs text-slate-400">
                Configure distinct skills, domain specializations, and sprint capacities for each developer.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartAdd}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all"
            >
              <UserPlus size={14} />
              <span>Add Resource</span>
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
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Developers Roster (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Users size={14} className="text-indigo-400" />
                Active Resource Pool ({developers.length} Developers)
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                PostgreSQL Neon DB
              </span>
            </div>

            {/* Developer List */}
            <div className="space-y-3 max-h-[58vh] overflow-y-auto pr-1">
              {developers.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/50 rounded-2xl border border-slate-800 text-slate-400 text-xs">
                  No developers found. Click "Add Resource" to create one.
                </div>
              ) : (
                developers.map((dev) => {
                  const devSkills = getDevSkills(dev);
                  const isSelected = editingDev?.id === dev.id;
                  const domainObj = DOMAIN_OPTIONS.find(d => d.value === (dev.primary_domain || "").toLowerCase()) || DOMAIN_OPTIONS[1];

                  return (
                    <div 
                      key={dev.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSelected 
                          ? "bg-indigo-950/50 border-indigo-500/80 shadow-lg" 
                          : "bg-slate-950/70 border-slate-800/80 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-bold text-sm flex items-center justify-center shadow">
                            {dev.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">{dev.name}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${domainObj.color}`}>
                                {dev.primary_domain || "general"}
                              </span>
                            </div>
                            <span className="text-xs text-slate-300 font-medium block">{dev.role || "Developer"}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleStartEdit(dev)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                            title="Edit resource & skills"
                          >
                            <Edit2 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteMember(dev.id, dev.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors"
                            title="Delete resource"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Individual Distinct Skills Badges */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">
                            Specialized Skills ({devSkills.length}):
                          </span>
                          <span className="text-[11px] text-indigo-300 font-mono">
                            {dev.capacity_hours || 40}h capacity
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {devSkills.map((sk, sIdx) => (
                            <span 
                              key={sIdx} 
                              className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700/80 text-emerald-300 font-mono text-[11px] font-semibold shadow-xs"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Add/Edit Developer Form (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-950/90 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                {editingDev ? <Edit2 size={15} className="text-indigo-400" /> : <UserPlus size={15} className="text-emerald-400" />}
                <span>{editingDev ? `Edit ${editingDev.name}` : "Add New Resource"}</span>
              </h4>

              {(!isAddingNew && !editingDev) ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-3">
                  <Users size={36} className="mx-auto text-slate-600" />
                  <p>
                    Select an engineer on the left to edit their skillset and capacity, or click <strong>Add New Resource</strong> to create a new team member.
                  </p>
                  <button
                    onClick={handleStartAdd}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow"
                  >
                    <UserPlus size={14} />
                    <span>Add New Resource</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveMember} className="space-y-4 text-xs">
                  {/* Name */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Developer Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kasun Perera"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Role / Designation</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Backend Architect"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  {/* Primary Domain */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Primary Domain Specialization</label>
                    <select
                      value={formData.primary_domain}
                      onChange={(e) => setFormData({ ...formData, primary_domain: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-xs capitalize"
                    >
                      {DOMAIN_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Capacity */}
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Sprint Capacity Hours</label>
                    <input
                      type="number"
                      min="10"
                      max="80"
                      value={formData.capacity_hours}
                      onChange={(e) => setFormData({ ...formData, capacity_hours: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-indigo-500 text-xs"
                    />
                  </div>

                  {/* SKILLS CHIPS & CUSTOM SKILL INPUT */}
                  <div className="space-y-2">
                    <label className="block text-slate-300 font-semibold">
                      Developer Technical Skills ({formData.skills.length})
                    </label>

                    {/* Active skill tags */}
                    <div className="min-h-[50px] p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex flex-wrap items-center gap-1.5">
                      {formData.skills.length === 0 ? (
                        <span className="text-slate-500 text-[11px] italic">No skills added yet. Click suggestions below or type a custom skill.</span>
                      ) : (
                        formData.skills.map((sk, idx) => (
                          <span 
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-500/50 text-indigo-200 font-mono text-[11px] font-semibold"
                          >
                            <span>{sk}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(sk)}
                              className="text-slate-400 hover:text-rose-300 p-0.5 rounded transition-colors"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Custom Skill Input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Add custom skill (e.g. Next.js, Redis)..."
                        value={customSkillInput}
                        onChange={(e) => setCustomSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSkill(customSkillInput);
                          }
                        }}
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddSkill(customSkillInput)}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    </div>

                    {/* Domain Skill Suggestions */}
                    <div>
                      <div className="text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">
                        Suggested for {formData.primary_domain}:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {activeCatalog.map((sk, sIdx) => {
                          const hasIt = formData.skills.some(s => s.toLowerCase() === sk.toLowerCase());
                          return (
                            <button
                              key={sIdx}
                              type="button"
                              disabled={hasIt}
                              onClick={() => handleAddSkill(sk)}
                              className={`text-[10px] px-2 py-0.5 rounded-lg border font-mono transition-all ${
                                hasIt 
                                  ? "bg-slate-900/40 border-slate-800 text-slate-600 cursor-default" 
                                  : "bg-slate-900 border-slate-700/80 text-slate-300 hover:border-emerald-500 hover:text-emerald-300 cursor-pointer"
                              }`}
                            >
                              +{sk}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                    >
                      <Check size={14} />
                      <span>{loading ? "Saving..." : (isAddingNew ? "Add Resource" : "Save Changes")}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStartAdd()}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Information Card */}
            <div className="bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <Sparkles size={15} />
                <span>Skill-Based Allocation Logic</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                When you click "Run Skill-Based Allocation", user stories are parsed for required technical keywords and assigned to the developer whose skills and domain best fit the requirement.
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>PostgreSQL Developers Table Synchronization</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all shadow"
          >
            Done Managing Resources
          </button>
        </div>

      </div>
    </div>
  );
}
