import React, { useState } from 'react';
import { 
  GitPullRequest, Code, AlertTriangle, ShieldCheck, CheckCircle2, XCircle, Clock, 
  Plus, Search, Filter, Layers, Zap, Info, ChevronRight, X, FileText 
} from 'lucide-react';

const INITIAL_CRS = [
  {
    id: 'cr-101',
    reqId: 1,
    title: 'Upgrade Database Connector to PostgreSQL SSL Pool',
    category: 'Database Schema',
    priority: 'High',
    impactScore: 'High Risk (3 Epics affected)',
    requestedBy: 'Alex Rivera',
    date: '2026-08-20',
    status: 'Approved',
    description: 'Migrate local SQLite connection to Neon PostgreSQL SSL Connection pool to enable real-time cloud multi-user sync.',
    reworkHours: 16
  },
  {
    id: 'cr-102',
    reqId: 2,
    title: 'Add spaCy RFC 2119 Fallback Pipeline',
    category: 'AI Service',
    priority: 'Medium',
    impactScore: 'Medium Risk (1 Epic affected)',
    requestedBy: 'Priya Sharma',
    date: '2026-08-21',
    status: 'Pending',
    description: 'Implement child-process fallback logic in Node.js server if Python environment is missing or model fails to load.',
    reworkHours: 8
  },
  {
    id: 'cr-103',
    reqId: 3,
    title: 'Enable Batch Excel Export with Custom Timestamps',
    category: 'API Contract',
    priority: 'Low',
    impactScore: 'Low Risk (1 Epic affected)',
    requestedBy: 'Sarah Chen',
    date: '2026-08-22',
    status: 'Approved',
    description: 'Add /api/export/batch endpoint to download specific uploaded Excel sets independently.',
    reworkHours: 4
  }
];

export default function ChangeRequestModule({ requirements = [] }) {
  const [changeRequests, setChangeRequests] = useState(INITIAL_CRS);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedCR, setSelectedCR] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Form State
  const [crTitle, setCrTitle] = useState('');
  const [crReqId, setCrReqId] = useState('');
  const [crCategory, setCrCategory] = useState('Database Schema');
  const [crPriority, setCrPriority] = useState('Medium');
  const [crDescription, setCrDescription] = useState('');

  // Metrics
  const totalCRs = changeRequests.length;
  const pendingCRs = changeRequests.filter(cr => cr.status === 'Pending').length;
  const approvedCRs = changeRequests.filter(cr => cr.status === 'Approved').length;
  const highRiskCRs = changeRequests.filter(cr => cr.priority === 'High').length;

  const handleStatusChange = (id, newStatus) => {
    setChangeRequests(prev => prev.map(cr => cr.id === id ? { ...cr, status: newStatus } : cr));
  };

  const handleCreateCR = (e) => {
    e.preventDefault();
    if (!crTitle.trim() || !crDescription.trim()) return;

    const newCR = {
      id: `cr-${Date.now().toString().slice(-4)}`,
      reqId: crReqId || 'N/A',
      title: crTitle,
      category: crCategory,
      priority: crPriority,
      impactScore: crPriority === 'High' ? 'High Risk (2 Epics affected)' : 'Low Risk (1 Epic affected)',
      requestedBy: 'System User',
      date: new Date().toISOString().split('T')[0],
      status: 'Pending',
      description: crDescription,
      reworkHours: crPriority === 'High' ? 12 : 6
    };

    setChangeRequests([newCR, ...changeRequests]);
    setIsSubmitModalOpen(false);
    setCrTitle('');
    setCrDescription('');
  };

  // Filter list
  const filteredCRs = changeRequests.filter(cr => {
    const matchesSearch = cr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cr.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          cr.requestedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || cr.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <GitPullRequest size={14} className="text-indigo-300" />
              <span>Change Request Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Change Request & Impact Analysis Engine
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
              Assess requirement modification impact, run automated dependency risk scoring, and track approval workflows.
            </p>
          </div>

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 flex items-center gap-2 shrink-0"
          >
            <Plus size={16} />
            <span>Submit Change Request</span>
          </button>
        </div>
      </div>

      {/* Impact KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Change Requests</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <GitPullRequest size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{totalCRs}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Logged change history</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Approvals</span>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">{pendingCRs}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Awaiting architecture review</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Approved Changes</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">{approvedCRs}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Merged to baseline</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">High Risk Items</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400">
              <AlertTriangle size={18} />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">{highRiskCRs}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Requires full re-testing</p>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search change request..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Change Request Log Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <GitPullRequest size={18} className="text-indigo-600 dark:text-indigo-400" />
          Change Request Audit Log & Impact Table
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/60 uppercase font-bold text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-4">CR ID</th>
                <th className="py-3 px-4">Title & Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority / Risk</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {filteredCRs.map((cr) => (
                <tr key={cr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {cr.id}
                  </td>
                  <td className="py-3.5 px-4 max-w-sm">
                    <p className="font-bold text-slate-900 dark:text-white">{cr.title}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{cr.description}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[11px]">
                      {cr.category}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      cr.priority === 'High' 
                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' 
                        : cr.priority === 'Medium'
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                    }`}>
                      {cr.priority} Priority ({cr.reworkHours}h rework)
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                      cr.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-600' :
                      cr.status === 'Rejected' ? 'bg-rose-500/10 text-rose-600' :
                      'bg-amber-500/10 text-amber-600'
                    }`}>
                      {cr.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {cr.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(cr.id, 'Approved')}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-[11px] transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusChange(cr.id, 'Rejected')}
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-[11px] transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setSelectedCR(cr)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-[11px]"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CR Details Modal */}
      {selectedCR && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold text-xs">{selectedCR.id}</span>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">{selectedCR.title}</h3>
              </div>
              <button onClick={() => setSelectedCR(null)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{selectedCR.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Requested By</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedCR.requestedBy}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Impact Assessment</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedCR.impactScore}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
              <button onClick={() => setSelectedCR(null)} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Change Request Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateCR} className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" />
                Submit New Change Request
              </h3>
              <button type="button" onClick={() => setIsSubmitModalOpen(false)} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Change Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Add validation rule for password length"
                  value={crTitle}
                  onChange={(e) => setCrTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Target Requirement (Optional)</label>
                <select
                  value={crReqId}
                  onChange={(e) => setCrReqId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- General Requirement Change --</option>
                  {requirements.map(r => (
                    <option key={r.id} value={r.id}>#{r.id} - {r.requirement_sentence.slice(0, 45)}...</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
                  <select
                    value={crCategory}
                    onChange={(e) => setCrCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Database Schema">Database Schema</option>
                    <option value="API Contract">API Contract</option>
                    <option value="AI Service">AI Service</option>
                    <option value="UI Component">UI Component</option>
                    <option value="Security Policy">Security Policy</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Priority Risk</label>
                  <select
                    value={crPriority}
                    onChange={(e) => setCrPriority(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">Detailed Description & Rationale</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe why this change is needed..."
                  value={crDescription}
                  onChange={(e) => setCrDescription(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button type="button" onClick={() => setIsSubmitModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 shadow-md">
                Submit for Impact Analysis
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

