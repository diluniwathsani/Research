// Research/frontend/src/components/change-requests/ChangeRequestList.jsx
import React, { useState, useEffect } from 'react';
import { getAllChangeRequests, approveChangeRequest } from '../../services/changeRequestApi';
import { 
  GitPullRequest, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Eye, 
  Sparkles,
  Layers,
  Calendar,
  User,
  Clock
} from 'lucide-react';
import './changeRequests.css';

export default function ChangeRequestList({ onNavigateToNew }) {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [approvalComment, setApprovalComment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [impactFilter, setImpactFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [processingApproval, setProcessingApproval] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await getAllChangeRequests();
      if (response && response.success && response.data) {
        setRequests(response.data);
        setFilteredRequests(response.data);
      } else {
        throw new Error('Fallback needed');
      }
    } catch (error) {
      console.warn('Using default change requests list:', error);
      const mockList = [
        {
          id: 1,
          request_id: 'CR-1001',
          title: 'Implement OAuth2 / Biometric 2FA at Login',
          project_id: 'P00001',
          project_name: 'Core Banking Modernization',
          user_story_id: 'US-P00001-01',
          user_story_title: 'User Multi-factor Authentication Flow',
          sprint_id: 'SPR-04',
          sprint_name: 'Sprint 04 - Core Transactions',
          impact_level: 'HIGH',
          confidence: 94.5,
          status: 'PENDING',
          change_type: 'REQUIREMENT_CHANGE',
          story_points: 8,
          urgency: 'HIGH',
          description: 'Client mandates multi-factor authentication compliance with Central Bank PSD2 directives before Q4 rollout.',
          reason: 'Regulatory compliance requirement for financial applications.',
          recommendation: 'Requires CCB governance sign-off. High impact on sprint velocity; 2 additional QA engineers recommended.',
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          resource_allocation_info: [
            { resource_name: 'Nuwan Perera', role: 'Full Stack Engineer', allocated_hours: 32, allocation_percentage: 80 },
            { resource_name: 'Anuki Silva', role: 'Security Architect', allocated_hours: 16, allocation_percentage: 40 }
          ]
        },
        {
          id: 2,
          request_id: 'CR-1002',
          title: 'Modify PDF Statement Template Export',
          project_id: 'P00001',
          project_name: 'Core Banking Modernization',
          user_story_id: 'US-P00001-02',
          user_story_title: 'Export Statements to Encrypted PDF',
          sprint_id: 'SPR-04',
          sprint_name: 'Sprint 04 - Core Transactions',
          impact_level: 'LOW',
          confidence: 98.1,
          status: 'APPROVED',
          change_type: 'REQUIREMENT_CHANGE',
          story_points: 3,
          urgency: 'LOW',
          description: 'Update header logo branding and add timestamp watermark to customer monthly statements.',
          reason: 'Corporate brand identity refresh.',
          recommendation: 'Approved for inclusion in upcoming sprint buffer.',
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          resource_allocation_info: [
            { resource_name: 'Kavindu Bandara', role: 'Frontend Developer', allocated_hours: 12, allocation_percentage: 30 }
          ]
        },
        {
          id: 3,
          request_id: 'CR-1003',
          title: 'Dynamic Real-Time Currency Conversion API',
          project_id: 'P00002',
          project_name: 'Customer Portal Redesign',
          user_story_id: 'US-P00002-04',
          user_story_title: 'Live Exchange Rate Widget',
          sprint_id: 'SPR-05',
          sprint_name: 'Sprint 05 - Compliance & Reporting',
          impact_level: 'MEDIUM',
          confidence: 91.2,
          status: 'PENDING',
          change_type: 'NEW_FEATURE',
          story_points: 5,
          urgency: 'MEDIUM',
          description: 'Integrate Bloomberg / Central Bank real-time exchange rates for multi-currency transactions.',
          reason: 'Enable foreign currency payments directly inside web portal.',
          recommendation: 'Medium impact on API throughput. Caching layer is strongly recommended.',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          resource_allocation_info: [
            { resource_name: 'Dilshan Wickrama', role: 'Backend Lead', allocated_hours: 24, allocation_percentage: 60 }
          ]
        }
      ];
      setRequests(mockList);
      setFilteredRequests(mockList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    let filtered = [...requests];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(req =>
        req.request_id?.toLowerCase().includes(term) ||
        req.title?.toLowerCase().includes(term) ||
        req.project_name?.toLowerCase().includes(term) ||
        req.user_story_id?.toLowerCase().includes(term)
      );
    }

    if (impactFilter !== 'ALL') {
      filtered = filtered.filter(req => req.impact_level === impactFilter);
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    setFilteredRequests(filtered);
  }, [searchTerm, impactFilter, statusFilter, requests]);

  const handleApproval = async (requestId, decision) => {
    setProcessingApproval(true);
    try {
      const response = await approveChangeRequest(requestId, {
        decision: decision,
        comments: approvalComment,
        justification: approvalComment,
        approver_name: 'Requirements Lead (Diluni W.)',
        approver_role: 'LEAD_BA'
      });

      if (response && response.success) {
        setSelectedRequest(null);
        setApprovalComment('');
        fetchRequests();
      } else {
        // Optimistic UI update
        setRequests(prev => prev.map(r => r.request_id === requestId ? { ...r, status: decision } : r));
        setSelectedRequest(null);
        setApprovalComment('');
      }
    } catch (error) {
      // Optimistic UI update
      setRequests(prev => prev.map(r => r.request_id === requestId ? { ...r, status: decision } : r));
      setSelectedRequest(null);
      setApprovalComment('');
    } finally {
      setProcessingApproval(false);
    }
  };

  const getImpactClass = (level) => {
    switch (level) {
      case 'LOW': return 'badge impact-low';
      case 'MEDIUM': return 'badge impact-medium';
      case 'HIGH': return 'badge impact-high';
      default: return 'badge';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'PENDING': return 'badge status-pending';
      case 'APPROVED': return 'badge status-approved';
      case 'REJECTED': return 'badge status-rejected';
      case 'NEEDS_CLARIFICATION': return 'badge status-needs_clarification';
      default: return 'badge';
    }
  };

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length
  };

  return (
    <div className="cr-list-container space-y-6">
      {/* Header Banner */}
      <div className="cr-welcome-section">
        <div className="cr-welcome-text">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
              <GitPullRequest size={12} /> Governance Registry
            </span>
          </div>
          <h1>Change Requests Registry & Governance</h1>
          <p>Integrated governance registry linking active projects, user stories, pending sprints, and AI impact assessments.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchRequests}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 text-xs font-semibold flex items-center gap-1.5"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Metric summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-t-4 border-t-indigo-500 shadow-sm">
          <span className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{stats.total}</span>
          <p className="text-xs text-slate-500 font-semibold mt-1">Total Registered</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-t-4 border-t-amber-500 shadow-sm">
          <span className="text-2xl font-extrabold text-amber-500">{stats.pending}</span>
          <p className="text-xs text-slate-500 font-semibold mt-1">Pending Review</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-t-4 border-t-emerald-500 shadow-sm">
          <span className="text-2xl font-extrabold text-emerald-500">{stats.approved}</span>
          <p className="text-xs text-slate-500 font-semibold mt-1">Approved & Merged</p>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-t-4 border-t-rose-500 shadow-sm">
          <span className="text-2xl font-extrabold text-rose-500">{stats.rejected}</span>
          <p className="text-xs text-slate-500 font-semibold mt-1">Rejected</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="cr-filter-bar flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <input
            type="text"
            placeholder="Search by Request ID, Title, Project, or Story ID..."
            className="cr-search-box w-full pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
        </div>

        <select
          className="cr-filter-select"
          value={impactFilter}
          onChange={(e) => setImpactFilter(e.target.value)}
        >
          <option value="ALL">All Impact Ratings</option>
          <option value="LOW">LOW Impact</option>
          <option value="MEDIUM">MEDIUM Impact</option>
          <option value="HIGH">HIGH Impact</option>
        </select>

        <select
          className="cr-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Governance Statuses</option>
          <option value="PENDING">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="NEEDS_CLARIFICATION">Needs Clarification</option>
        </select>
      </div>

      {/* Table */}
      <div className="cr-table-container bg-white dark:bg-slate-800">
        <table className="cr-requests-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Change Title</th>
              <th>Project</th>
              <th>Affected Story</th>
              <th>Sprint</th>
              <th>AI Impact</th>
              <th>Confidence</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.map((request) => (
              <tr key={request.id || request.request_id}>
                <td className="cr-request-id">{request.request_id}</td>
                <td className="cr-request-title font-semibold max-w-xs truncate" title={request.title}>
                  {request.title}
                </td>
                <td>
                  <span className="project-pill">{request.project_name || request.project_id}</span>
                </td>
                <td>
                  <span className="story-pill">{request.user_story_id || 'N/A'}</span>
                </td>
                <td>
                  <span className="sprint-pill">{request.sprint_name || request.sprint_id}</span>
                </td>
                <td>
                  <span className={getImpactClass(request.impact_level)}>
                    {request.impact_level}
                  </span>
                </td>
                <td className="font-bold text-xs text-indigo-600 dark:text-indigo-400">
                  {request.confidence}%
                </td>
                <td>
                  <span className={getStatusClass(request.status)}>
                    {request.status}
                  </span>
                </td>
                <td>
                  <button
                    className="cr-view-btn flex items-center gap-1"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <Eye size={13} /> Inspect
                  </button>
                </td>
              </tr>
            ))}
            {filteredRequests.length === 0 && (
              <tr>
                <td colSpan="9" className="cr-empty-state">
                  No change requests matching filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detailed Modal */}
      {selectedRequest && (
        <div className="cr-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="cr-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cr-modal-header">
              <div>
                <span className="cr-modal-cr-id">{selectedRequest.request_id}</span>
                <h3>{selectedRequest.title}</h3>
              </div>
              <button className="cr-close-modal" onClick={() => setSelectedRequest(null)}>✕</button>
            </div>

            <div className="cr-modal-body">
              {/* Linked entity cards */}
              <div className="cr-modal-entity-grid">
                <div className="cr-modal-entity-box">
                  <span className="cr-entity-tag">Project</span>
                  <strong>{selectedRequest.project_name}</strong>
                  <small className="text-slate-400">ID: {selectedRequest.project_id}</small>
                </div>
                <div className="cr-modal-entity-box">
                  <span className="cr-entity-tag">Affected User Story</span>
                  <strong>{selectedRequest.user_story_id}</strong>
                  <small className="text-slate-400">{selectedRequest.user_story_title || 'Linked Story'}</small>
                </div>
                <div className="cr-modal-entity-box">
                  <span className="cr-entity-tag">Target Sprint</span>
                  <strong>{selectedRequest.sprint_name}</strong>
                  <small className="text-slate-400">ID: {selectedRequest.sprint_id}</small>
                </div>
              </div>

              {/* Specs */}
              <div className="cr-modal-spec-grid">
                <div><strong>Category:</strong> {selectedRequest.change_type}</div>
                <div><strong>Urgency:</strong> {selectedRequest.urgency}</div>
                <div><strong>Story Points:</strong> {selectedRequest.story_points} SP</div>
                <div><strong>Governance Status:</strong> <span className={getStatusClass(selectedRequest.status)}>{selectedRequest.status}</span></div>
              </div>

              <div className="cr-modal-section-block">
                <h4>Requirement Description:</h4>
                <p className="cr-modal-desc-text">{selectedRequest.description}</p>
              </div>

              {selectedRequest.reason && (
                <div className="cr-modal-section-block">
                  <h4>Business Justification:</h4>
                  <p className="cr-modal-desc-text">{selectedRequest.reason}</p>
                </div>
              )}

              {/* ML Impact Report */}
              <div className="cr-modal-impact-report">
                <div className="cr-modal-impact-header">
                  <span>AI Impact Level: <strong className={`font-bold ${selectedRequest.impact_level === 'HIGH' ? 'text-rose-600' : 'text-emerald-600'}`}>{selectedRequest.impact_level}</strong></span>
                  <span>Model Confidence: <strong>{selectedRequest.confidence}%</strong></span>
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  <strong>Recommendation:</strong> {selectedRequest.recommendation}
                </p>
              </div>

              {/* Resource Allocations */}
              {Array.isArray(selectedRequest.resource_allocation_info) && selectedRequest.resource_allocation_info.length > 0 && (
                <div className="cr-modal-section-block">
                  <h4>Team Resources Allocated:</h4>
                  <div className="space-y-1.5">
                    {selectedRequest.resource_allocation_info.map((r, idx) => (
                      <div key={idx} className="flex justify-between p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                        <span>👤 {r.resource_name} ({r.role})</span>
                        <span className="font-semibold">{r.allocated_hours} hrs ({r.allocation_percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Governance Decision textarea */}
              {selectedRequest.status === 'PENDING' && (
                <div className="cr-modal-approval-box">
                  <h4>Governance Review Notes & Rationale:</h4>
                  <textarea
                    placeholder="Add approval condition, risk notes, or feedback for the team..."
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    rows="3"
                    className="cr-modal-comment-textarea"
                  />
                </div>
              )}
            </div>

            <div className="cr-modal-footer">
              {selectedRequest.status === 'PENDING' ? (
                <>
                  <button
                    className="btn-approve flex items-center gap-1"
                    disabled={processingApproval}
                    onClick={() => handleApproval(selectedRequest.request_id, 'APPROVED')}
                  >
                    <CheckCircle size={15} /> Approve Change
                  </button>
                  <button
                    className="btn-reject flex items-center gap-1"
                    disabled={processingApproval}
                    onClick={() => handleApproval(selectedRequest.request_id, 'REJECTED')}
                  >
                    <XCircle size={15} /> Reject Change
                  </button>
                  <button
                    className="btn-clarify flex items-center gap-1"
                    disabled={processingApproval}
                    onClick={() => handleApproval(selectedRequest.request_id, 'NEEDS_CLARIFICATION')}
                  >
                    <HelpCircle size={15} /> Need Clarification
                  </button>
                </>
              ) : (
                <button className="btn-close" onClick={() => setSelectedRequest(null)}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
