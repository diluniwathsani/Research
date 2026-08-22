// Research/frontend/src/components/change-requests/ChangeRequestDashboard.jsx
import React, { useState, useEffect } from 'react';
import { getDashboardStats, getAllChangeRequests, getScopeCreepAlert } from '../../services/changeRequestApi';
import { BarChart3, AlertTriangle, CheckCircle, ArrowUpRight, TrendingUp, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
import './changeRequests.css';

export default function ChangeRequestDashboard({ onNavigate }) {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    impact_distribution: { LOW: 0, MEDIUM: 0, HIGH: 0 }
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [scopeAlert, setScopeAlert] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Stats
      try {
        const statsRes = await getDashboardStats();
        if (statsRes && statsRes.success && statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (e) {
        console.warn('Dashboard stats endpoint error:', e);
      }

      // 2. Recent requests
      try {
        const requestsRes = await getAllChangeRequests();
        if (requestsRes && requestsRes.success && requestsRes.data) {
          setRecentRequests(requestsRes.data.slice(0, 5));
        }
      } catch (e) {
        console.warn('Change requests endpoint error:', e);
      }

      // 3. Scope creep alert
      try {
        const alertRes = await getScopeCreepAlert('P00001');
        if (alertRes && alertRes.success && alertRes.data) {
          setScopeAlert(alertRes.data);
        }
      } catch (e) {
        console.warn('Scope creep alert endpoint error:', e);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statsCards = [
    { title: 'Total Requests', value: stats.total || 0, color: '#6366f1', change: '+12% this month' },
    { title: 'Pending Governance', value: stats.pending || 0, color: '#f59e0b', change: 'Awaiting Review' },
    { title: 'Approved Changes', value: stats.approved || 0, color: '#10b981', change: 'Accepted' },
    { title: 'Rejected Changes', value: stats.rejected || 0, color: '#ef4444', change: 'Declined' }
  ];

  const getImpactBadgeStyle = (level) => {
    switch (level) {
      case 'LOW': return { bg: '#d1fae5', text: '#065f46' };
      case 'MEDIUM': return { bg: '#fed7aa', text: '#92400e' };
      case 'HIGH': return { bg: '#fee2e2', text: '#991b1b' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'PENDING': return { bg: '#fed7aa', text: '#92400e' };
      case 'APPROVED': return { bg: '#d1fae5', text: '#065f46' };
      case 'REJECTED': return { bg: '#fee2e2', text: '#991b1b' };
      case 'NEEDS_CLARIFICATION': return { bg: '#e0e7ff', text: '#3730a3' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  if (loading) {
    return (
      <div className="cr-dashboard-loading">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-indigo-500" size={32} />
          <span className="text-sm font-medium">Loading Change Request Details & Analytics...</span>
        </div>
      </div>
    );
  }

  const totalImpact = (stats.impact_distribution?.LOW || 0) + (stats.impact_distribution?.MEDIUM || 0) + (stats.impact_distribution?.HIGH || 0) || 1;
  const lowPct = Math.round(((stats.impact_distribution?.LOW || 0) / totalImpact) * 100);
  const medPct = Math.round(((stats.impact_distribution?.MEDIUM || 0) / totalImpact) * 100);
  const highPct = Math.round(((stats.impact_distribution?.HIGH || 0) / totalImpact) * 100);

  return (
    <div className="cr-dashboard space-y-6">
      {/* Welcome Banner */}
      <div className="cr-welcome-section">
        <div className="cr-welcome-text">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
              <Sparkles size={12} /> ReqChange AI System
            </span>
          </div>
          <h1>Change Request Overview & Details</h1>
          <p>Live metrics, ML impact distribution, and real-time scope creep risk analytics.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/20 text-xs font-semibold flex items-center gap-1.5"
            title="Refresh"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <div className="cr-date-badge hidden sm:block">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="cr-stats-grid">
        {statsCards.map((stat, idx) => (
          <div key={idx} className="cr-stat-card" style={{ borderTopColor: stat.color }}>
            <div className="cr-stat-header">
              <span className="cr-stat-title-header">{stat.title}</span>
              <span className="cr-stat-change">{stat.change}</span>
            </div>
            <div className="cr-stat-value">{stat.value}</div>
            <div className="cr-stat-title">{stat.title}</div>
          </div>
        ))}
      </div>

      {/* Two Column Grid */}
      <div className="cr-two-columns">
        {/* ML Impact Distribution */}
        <div className="cr-card">
          <div className="cr-card-header">
            <div>
              <h3>AI Impact Rating Distribution</h3>
              <span className="cr-card-subtitle">Aggregated across all logged change requests</span>
            </div>
            <BarChart3 size={18} className="text-indigo-500" />
          </div>

          <div className="cr-impact-chart">
            <div className="cr-impact-bar LOW" style={{ width: `${Math.max(lowPct, 8)}%` }}>
              <span>LOW ({stats.impact_distribution?.LOW || 0})</span>
            </div>
            <div className="cr-impact-bar MEDIUM" style={{ width: `${Math.max(medPct, 8)}%` }}>
              <span>MED ({stats.impact_distribution?.MEDIUM || 0})</span>
            </div>
            <div className="cr-impact-bar HIGH" style={{ width: `${Math.max(highPct, 8)}%` }}>
              <span>HIGH ({stats.impact_distribution?.HIGH || 0})</span>
            </div>
          </div>

          <div className="cr-impact-legend">
            <span><span className="cr-legend-dot low"></span> LOW Impact ({lowPct}%)</span>
            <span><span className="cr-legend-dot medium"></span> MEDIUM Impact ({medPct}%)</span>
            <span><span className="cr-legend-dot high"></span> HIGH Impact ({highPct}%)</span>
          </div>
        </div>

        {/* Scope Creep Risk Analysis */}
        {scopeAlert && scopeAlert.alert ? (
          <div className={`cr-alert-card ${scopeAlert.risk_level === 'HIGH' ? 'cr-alert-critical' : 'cr-alert-warning'}`}>
            <div className="flex-1 cr-alert-content">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert size={20} className={scopeAlert.risk_level === 'HIGH' ? 'text-rose-600' : 'text-amber-600'} />
                <h4>Scope Creep Detected: {scopeAlert.project_id || 'Active Project'}</h4>
              </div>
              <p>{scopeAlert.alert}</p>
              <div className="cr-alert-stats">
                <span>⚡ {scopeAlert.total_changes_14d || 0} changes in past 14 days</span>
                <span>🔥 {scopeAlert.high_impact_changes || 0} high-impact changes</span>
              </div>
              <button 
                className="cr-alert-action flex items-center gap-1 mt-2" 
                onClick={() => onNavigate && onNavigate('requests')}
              >
                Review Requests in Registry <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="cr-card flex flex-col justify-center items-center text-center">
            <CheckCircle size={44} className="text-emerald-500 mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Scope Velocity Stable</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              No scope creep threshold exceeded for baseline projects. Requirement changes are within predicted sprint capacity.
            </p>
          </div>
        )}
      </div>

      {/* Recent Requests Table */}
      <div className="cr-card cr-full-width">
        <div className="cr-card-header">
          <div>
            <h3>Recent Change Requests</h3>
            <span className="cr-card-subtitle">Latest incoming changes submitted through the pipeline</span>
          </div>
          <button className="cr-view-all-btn" onClick={() => onNavigate && onNavigate('requests')}>
            View All Registry →
          </button>
        </div>

        <div className="cr-table-container">
          <table className="cr-requests-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Title</th>
                <th>Impact</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentRequests.map((req) => {
                const impactStyle = getImpactBadgeStyle(req.impact_level);
                const statusStyle = getStatusBadgeStyle(req.status);
                return (
                  <tr key={req.id || req.request_id}>
                    <td className="cr-request-id">{req.request_id}</td>
                    <td className="cr-request-title">{req.title}</td>
                    <td>
                      <span 
                        className="px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: impactStyle.bg, color: impactStyle.text }}
                      >
                        {req.impact_level}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td>{req.created_at ? new Date(req.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      <button 
                        className="cr-view-btn"
                        onClick={() => onNavigate && onNavigate('requests')}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
              {recentRequests.length === 0 && (
                <tr>
                  <td colSpan="6" className="cr-empty-state">
                    No change requests registered yet. Click below to submit your first change request.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Action Buttons */}
        <div className="cr-action-buttons">
          <button 
            className="cr-action-btn primary flex items-center gap-1.5"
            onClick={() => onNavigate && onNavigate('submit')}
          >
            <TrendingUp size={16} /> New Change Request
          </button>
          <button 
            className="cr-action-btn secondary"
            onClick={() => onNavigate && onNavigate('requests')}
          >
            Open Change Request Registry
          </button>
        </div>
      </div>
    </div>
  );
}
