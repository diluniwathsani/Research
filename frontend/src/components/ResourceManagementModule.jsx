import React, { useState } from 'react';
import { 
  Users, Code, UserCheck, Briefcase, Cpu, Layers, Search, Plus, 
  Filter, CheckCircle2, Clock, BarChart3, ChevronRight, X, AlertTriangle, ShieldCheck 
} from 'lucide-react';

const INITIAL_TEAM = [
  {
    id: 'usr-1',
    name: 'Sarah Chen',
    role: 'Lead Full-Stack Engineer',
    avatar: 'SC',
    color: 'bg-indigo-600',
    capacityHours: 40,
    allocatedHours: 34,
    assignedEpics: ['Authentication', 'User Dashboard'],
    skills: ['React', 'Node.js', 'PostgreSQL', 'Tailwind'],
    status: 'Optimal'
  },
  {
    id: 'usr-2',
    name: 'Alex Rivera',
    role: 'Senior Backend Developer',
    avatar: 'AR',
    color: 'bg-emerald-600',
    capacityHours: 40,
    allocatedHours: 38,
    assignedEpics: ['Requirements Processing', 'Database Migration'],
    skills: ['Node.js', 'Python', 'PostgreSQL', 'Neon DB'],
    status: 'Near Capacity'
  },
  {
    id: 'usr-3',
    name: 'Priya Sharma',
    role: 'AI / ML Specialist',
    avatar: 'PS',
    color: 'bg-purple-600',
    capacityHours: 40,
    allocatedHours: 30,
    assignedEpics: ['AI NLP Validation', 'SVM Clustering'],
    skills: ['Python', 'spaCy', 'scikit-learn', 'TF-IDF'],
    status: 'Optimal'
  },
  {
    id: 'usr-4',
    name: 'Marcus Vance',
    role: 'QA & Automation Engineer',
    avatar: 'MV',
    color: 'bg-amber-600',
    capacityHours: 40,
    allocatedHours: 25,
    assignedEpics: ['Data Export', 'System Validation'],
    skills: ['Jest', 'Cypress', 'API Testing', 'RFC Compliance'],
    status: 'Available'
  },
  {
    id: 'usr-5',
    name: 'Elena Rostova',
    role: 'UI/UX Product Designer',
    avatar: 'ER',
    color: 'bg-rose-600',
    capacityHours: 40,
    allocatedHours: 32,
    assignedEpics: ['User Dashboard', 'Artifact Views'],
    skills: ['Figma', 'UI Design', 'Wireframing', 'Design Systems'],
    status: 'Optimal'
  }
];

export default function ResourceManagementModule({ requirements = [] }) {
  const [teamMembers, setTeamMembers] = useState(INITIAL_TEAM);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [selectedMember, setSelectedMember] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignmentEpic, setAssignmentEpic] = useState('');
  const [assignmentMemberId, setAssignmentMemberId] = useState('');

  // Extract unique epics from requirements
  const epics = Array.from(new Set(requirements.map(r => r.epic).filter(Boolean)));
  const displayEpics = epics.length > 0 ? epics : ['Requirements Engine', 'AI Validation', 'Database Sync', 'Export Service'];

  // Metrics computation
  const totalCapacity = teamMembers.reduce((sum, m) => sum + m.capacityHours, 0);
  const totalAllocated = teamMembers.reduce((sum, m) => sum + m.allocatedHours, 0);
  const overallUtilization = Math.round((totalAllocated / totalCapacity) * 100);

  // Filtered members list
  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          member.assignedEpics.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = selectedRoleFilter === 'All' || member.role.includes(selectedRoleFilter);
    return matchesSearch && matchesRole;
  });

  const handleAssignEpic = (e) => {
    e.preventDefault();
    if (!assignmentMemberId || !assignmentEpic) return;

    setTeamMembers(prev => prev.map(m => {
      if (m.id === assignmentMemberId) {
        const epicsSet = new Set([...m.assignedEpics, assignmentEpic]);
        const newAllocated = Math.min(m.capacityHours, m.allocatedHours + 5);
        return {
          ...m,
          assignedEpics: Array.from(epicsSet),
          allocatedHours: newAllocated,
          status: newAllocated >= 38 ? 'Near Capacity' : 'Optimal'
        };
      }
      return m;
    }));

    setIsAssignModalOpen(false);
    setAssignmentEpic('');
    setAssignmentMemberId('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Users size={14} className="text-indigo-300" />
              <span>Resource & Capacity Management</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Engineering Team Capacity & Allocation
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              Track developer workload, assign incoming requirements epics, and optimize team velocity across active research sprints.
            </p>
          </div>

          <button
            onClick={() => setIsAssignModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 flex items-center gap-2 shrink-0"
          >
            <Plus size={16} />
            <span>Assign Epic to Member</span>
          </button>
        </div>
      </div>

      {/* Capacity KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Team Size</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Users size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{teamMembers.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cross-functional engineers</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Capacity Utilization</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <BarChart3 size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{overallUtilization}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{totalAllocated} / {totalCapacity} hrs allocated</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Epics Covered</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
              <Layers size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">{displayEpics.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mapped to live requirements</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Requirements Count</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
              <Code size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">{requirements.length}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ready for engineering tasks</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search member, role, or epic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Roles</option>
            <option value="Full-Stack">Full-Stack</option>
            <option value="Backend">Backend</option>
            <option value="AI / ML">AI / ML</option>
            <option value="QA">QA & Automation</option>
            <option value="Designer">UI/UX Designer</option>
          </select>
        </div>
      </div>

      {/* Team Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map((member) => {
          const utilPct = Math.round((member.allocatedHours / member.capacityHours) * 100);
          return (
            <div 
              key={member.id}
              className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div>
                {/* Member Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl ${member.color} text-white font-black flex items-center justify-center text-sm shadow-md`}>
                      {member.avatar}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                        {member.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {member.role}
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                    utilPct >= 90 
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  }`}>
                    {member.status}
                  </span>
                </div>

                {/* Capacity Progress */}
                <div className="mt-5 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">Weekly Workload</span>
                    <span className="text-slate-800 dark:text-slate-200">{member.allocatedHours} / {member.capacityHours} hrs ({utilPct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-700/60 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        utilPct >= 90 ? 'bg-rose-500' : utilPct >= 75 ? 'bg-amber-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>
                </div>

                {/* Assigned Epics */}
                <div className="mt-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Assigned Epics</span>
                  <div className="flex flex-wrap gap-1.5">
                    {member.assignedEpics.map((epic, idx) => (
                      <span 
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200/50 dark:border-indigo-800/40"
                      >
                        {epic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Skill Badges */}
                <div className="mt-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Skills</span>
                  <div className="flex flex-wrap gap-1">
                    {member.skills.map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-[10px]">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedMember(member)}
                className="w-full mt-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>View Details</span>
                <ChevronRight size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Epic Resource Matrix Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers size={18} className="text-indigo-600 dark:text-indigo-400" />
          Epic Resource Allocation Breakdown
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/60 uppercase font-bold text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">Epic Name</th>
                <th className="py-3 px-4">Associated Requirements</th>
                <th className="py-3 px-4">Assigned Engineers</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {displayEpics.map((epic, idx) => {
                const reqsForEpic = requirements.filter(r => r.epic === epic);
                const assigned = teamMembers.filter(m => m.assignedEpics.includes(epic));
                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                      {epic}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        {reqsForEpic.length} items
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {assigned.length > 0 ? assigned.map(m => (
                          <span key={m.id} className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-[11px]">
                            {m.name}
                          </span>
                        )) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                        <CheckCircle2 size={12} />
                        <span>Staffed</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Details Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${selectedMember.color} text-white font-bold flex items-center justify-center text-sm`}>
                  {selectedMember.avatar}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedMember.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selectedMember.role}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMember(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-500 dark:text-slate-400">Total Workload</span>
                  <span className="text-slate-800 dark:text-slate-200">{selectedMember.allocatedHours} Hours / Week</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-500 dark:text-slate-400">Status</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedMember.status}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Assigned Epics</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMember.assignedEpics.map((epic, i) => (
                    <span key={i} className="px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-semibold">
                      {epic}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setSelectedMember(null)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Epic Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleAssignEpic}
            className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-6"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" />
                Assign Epic to Team Member
              </h3>
              <button 
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Select Team Member</label>
                <select
                  required
                  value={assignmentMemberId}
                  onChange={(e) => setAssignmentMemberId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Member --</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Select Epic</label>
                <select
                  required
                  value={assignmentEpic}
                  onChange={(e) => setAssignmentEpic(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Select Epic --</option>
                  {displayEpics.map((epic, i) => (
                    <option key={i} value={epic}>{epic}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-colors shadow-md"
              >
                Confirm Assignment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

