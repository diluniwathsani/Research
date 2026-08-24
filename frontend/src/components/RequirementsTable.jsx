import React, { useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle, Edit2, Save, X, ChevronDown, ChevronRight, Layout, Database, Shield, Zap, Calendar, Clock, Layers, Folder, FolderOpen, MoreVertical, Trash2, Download } from 'lucide-react';

export default function RequirementsTable({ requirements, onUpdate }) {
  // --- UI STATE ---
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [expandedSections, setExpandedSections] = useState({});
  const [expandedOutcomes, setExpandedOutcomes] = useState({});
  // batchPrefix: allows the user to change the default "Requirement Set" label
  const [batchPrefix, setBatchPrefix] = useState("Requirement Set");
  // State for renaming specific folders (batches)
  const [editingBatchTimestamp, setEditingBatchTimestamp] = useState(null);
  const [batchNameValue, setBatchNameValue] = useState("");

  // handleExportBatch: Triggers Excel download for a specific set of requirements
  const handleExportBatch = (timestamp, setTitle) => {
    window.location.href = `http://localhost:3000/api/export/batch?timestamp=${encodeURIComponent(timestamp)}`;
  };

  // --- DATA PROCESSING: GROUPING ---
  // 1. Group requirements by Batch (using created_at timestamp)
  const processedGroups = (requirements || []).reduce((acc, req) => {
    const uploadTime = req.created_at || 'Historical';
    const batchName = req.batch_name && req.batch_name !== 'Untitled Batch' ? req.batch_name : "";
    const batchKey = `${uploadTime}`; 
    const domain = req.epic || "Pending Classification";
    
    if (!acc[batchKey]) {
      acc[batchKey] = {
        requirements: {},
        originalBatchName: batchName,
        timestamp: uploadTime
      };
    }
    
    // Nested group by Epic/Domain
    if (!acc[batchKey].requirements[domain]) acc[batchKey].requirements[domain] = [];
    acc[batchKey].requirements[domain].push(req);
    return acc;
  }, {});

  // --- DATA PROCESSING: SORTING ---
  // 2. Determine Chronological Numbers (Oldest First for numbering)
  const chronologicalKeys = Object.keys(processedGroups).sort((a, b) => {
    if (a === 'Historical') return -1;
    if (b === 'Historical') return 1;
    return new Date(a) - new Date(b);
  });

  // Create a mapping for display titles (e.g. "Requirement Set 1")
  const batchNumberMap = {};
  chronologicalKeys.forEach((key, index) => {
    batchNumberMap[key] = `${batchPrefix} ${index + 1}`;
  });

  // 3. Prepare for Display (Newest First for the UI list)
  const displayKeys = [...chronologicalKeys].reverse();

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleOutcome = (id) => {
    setExpandedOutcomes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const startEdit = (req) => {
    setEditingId(req.id);
    setEditValue(req.requirement_sentence);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async (id) => {
    try {
      await axios.put(`http://localhost:3000/api/requirements/${id}`, {
        requirement_sentence: editValue
      });
      setEditingId(null);
      onUpdate();
    } catch (err) {
      console.error(err);
      alert("Failed to update requirement");
    }
  };

  // --- BATCH RENAMING LOGIC ---
  const startBatchEdit = (timestamp, currentName) => {
    setEditingBatchTimestamp(timestamp);
    setBatchNameValue(currentName);
  };

  const saveBatchRename = async (timestamp) => {
    try {
      await axios.put(`http://localhost:3000/api/batches/${encodeURIComponent(timestamp)}`, {
        batch_name: batchNameValue
      });
      setEditingBatchTimestamp(null);
      onUpdate();
    } catch (err) {
      console.error(err);
      alert("Failed to rename folder");
    }
  };

  if (!requirements || requirements.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 dark:text-slate-400">
        <Folder className="w-12 h-12 mx-auto mb-4 opacity-10" />
        <p>No requirements loaded. Upload an Excel template to get started.</p>
      </div>
    );
  }

  const getDomainIcon = (domain) => {
    const lower = domain.toLowerCase();
    if (lower.includes('security')) return <Shield size={20} />;
    if (lower.includes('data') || lower.includes('database')) return <Database size={20} />;
    if (lower.includes('performance')) return <Zap size={20} />;
    return <Layout size={20} />;
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date)) return "Historical";
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return "Historical"; }
  };

  const formatTime = (dateStr) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date)) return "";
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return ""; }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Configuration Header: Allow changing the Batch Prefix */}
      <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
          Display Label:
        </label>
        <input 
          type="text" 
          value={batchPrefix}
          onChange={(e) => setBatchPrefix(e.target.value)}
          placeholder="e.g. Module, Sprint, Set"
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all w-48"
        />
        <span className="text-[10px] text-slate-400 italic font-medium">
          (Changes all "Requirement Set" labels below)
        </span>
      </div>

      {displayKeys.map((batchKey) => {
        const batchData = processedGroups[batchKey];
        const domains = batchData.requirements;
        const batchTotal = Object.values(domains).flat().length;
        const isBatchExpanded = expandedSections[batchKey] || false;
        const setTitle = batchNumberMap[batchKey];

        return (
          <div key={batchKey} className="group">
            {/* NUMBERED FOLDER CARD */}
            <div 
              onClick={() => toggleSection(batchKey)}
              className={`flex items-center justify-between p-6 rounded-3xl cursor-pointer transition-all duration-500 border-2 ${
                isBatchExpanded 
                  ? 'bg-white dark:bg-slate-800 border-primary shadow-2xl ring-8 ring-primary/5 -translate-y-1' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary/50 shadow-lg hover:shadow-xl'
              }`}
            >
              <div className="flex items-center gap-7">
                <div className={`p-4 rounded-[1.25rem] transition-all duration-500 ${isBatchExpanded ? 'bg-primary text-white rotate-6 shadow-lg shadow-primary/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:text-primary group-hover:bg-primary/5'}`}>
                  {isBatchExpanded ? <FolderOpen size={36} /> : <Folder size={36} />}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    {editingBatchTimestamp === batchKey ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <input 
                          autoFocus
                          className="bg-slate-50 dark:bg-slate-900 border-2 border-primary/30 rounded-lg px-3 py-1.5 text-lg font-black text-slate-800 dark:text-white outline-none focus:border-primary transition-all w-64"
                          value={batchNameValue}
                          onChange={(e) => setBatchNameValue(e.target.value)}
                        />
                        <button 
                          onClick={() => saveBatchRename(batchKey)}
                          className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors"
                        >
                          <CheckCircle size={20} />
                        </button>
                        <button 
                          onClick={() => setEditingBatchTimestamp(null)}
                          className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-lg hover:bg-slate-300 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none uppercase">
                          {batchData.originalBatchName || setTitle}
                        </h2>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            startBatchEdit(batchKey, batchData.originalBatchName || setTitle);
                          }}
                          className="p-1.5 text-slate-300 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                          title="Rename Folder"
                        >
                          <Edit2 size={16} />
                        </button>
                      </div>
                    )}
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[9px] font-black text-slate-400 uppercase tracking-tighter border border-slate-200 dark:border-slate-600">
                      UPLOAD BATCH
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-slate-400 font-bold">
                    <span className="flex items-center gap-1.5 text-xs">
                      <Calendar size={14} className="text-primary/60" /> {formatDate(batchKey)}
                    </span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="flex items-center gap-1.5 text-xs">
                      <Layers size={14} className="text-green-500/60" /> {batchTotal} Requirements
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-3 pr-4 border-r border-slate-200 dark:border-slate-700">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportBatch(batchKey, setTitle);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-green-600 hover:text-white rounded-xl transition-all duration-300 text-slate-600 dark:text-slate-300 font-black text-[10px] uppercase tracking-widest shadow-sm hover:shadow-lg group/btn"
                    >
                      <Download size={14} className="group-hover/btn:animate-bounce" />
                      <span>Export Excel</span>
                    </button>
                 </div>

                 <div className="text-right hidden sm:block">
                   <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
                     {isBatchExpanded ? 'Close Folder' : 'Open Folder'}
                   </p>
                   <p className="text-[10px] text-slate-300 dark:text-slate-600 font-bold mt-0.5 uppercase tracking-tighter">Click to view content</p>
                 </div>
                 <div className={`p-3 rounded-full transition-all duration-500 ${isBatchExpanded ? 'bg-primary text-white shadow-inner' : 'bg-slate-50 dark:bg-slate-700 text-slate-300'}`}>
                    <ChevronDown size={20} className={`transition-transform duration-500 ${isBatchExpanded ? 'rotate-180' : ''}`} />
                 </div>
              </div>
            </div>

            {/* FOLDER CONTENT */}
            {isBatchExpanded && (
              <div className="mt-6 space-y-6 pl-8 border-l-4 border-slate-100 dark:border-slate-800 ml-10 animate-in slide-in-from-top-4 duration-500">
                {Object.entries(domains).map(([domain, reqs]) => {
                  const sectionId = `${batchKey}-${domain}`;
                  const isExpanded = expandedSections[sectionId] !== false; 
                  const completeCount = reqs.filter(r => r.completeness_status?.includes('Complete')).length;
                  
                  return (
                    <div 
                      key={sectionId} 
                      className={`border rounded-[1.5rem] transition-all duration-500 overflow-hidden ${
                        isExpanded 
                          ? 'bg-white dark:bg-slate-800 border-primary shadow-lg' 
                          : 'bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-primary/40'
                      }`}
                    >
                      {/* Domain Header */}
                      <div 
                        onClick={() => toggleSection(sectionId)}
                        className="p-5 flex items-center justify-between cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-5">
                          <div className={`p-3 rounded-xl transition-all duration-300 ${isExpanded ? 'bg-primary/10 text-primary scale-110 shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                            {React.cloneElement(getDomainIcon(domain), { className: isExpanded ? 'text-primary' : undefined })}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-800 dark:text-white flex items-center gap-3 text-base tracking-tight uppercase">
                              {domain}
                              <span className="text-[10px] font-black px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full tracking-normal">
                                {reqs.length}
                              </span>
                            </h3>
                            <div className="flex items-center gap-4 mt-1.5">
                              <div className="w-40 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-1000 ease-out" 
                                  style={{ width: `${(completeCount / reqs.length) * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {Math.round((completeCount / reqs.length) * 100)}% COMPLETE
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className={`p-2 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : 'text-slate-400'}`}>
                          <ChevronDown size={20} />
                        </div>
                      </div>

                      {/* Domain Content */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 dark:border-slate-700/50 overflow-hidden animate-in fade-in duration-300">
                          <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300">
                            <thead className="text-[10px] uppercase bg-slate-50/50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-700 font-black tracking-widest">
                              <tr>
                                <th scope="col" className="px-6 py-4 w-16">#</th>
                                <th scope="col" className="px-6 py-4">Requirement Details</th>
                                <th scope="col" className="px-6 py-4 text-center w-32">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                              {reqs.map((req, idx) => {
                                const isIncomplete = req.completeness_status?.includes("Incomplete");
                                const showOutcomes = expandedOutcomes[req.id] || false;
                                return (
                                  <React.Fragment key={req.id}>
                                    <tr className={`transition-colors ${showOutcomes ? 'bg-primary/[0.01]' : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/10'}`}>
                                      <td className="px-6 py-6 font-mono text-slate-300 dark:text-slate-600 text-xs align-top pt-8">{String(idx + 1).padStart(2, '0')}</td>
                                      <td className="px-6 py-6 align-top">
                                        {editingId === req.id ? (
                                          <div className="flex flex-col gap-3">
                                            <textarea 
                                              className="w-full bg-white dark:bg-slate-900 border-2 border-primary/20 rounded-xl p-4 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 h-32 shadow-xl transition-all"
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                            />
                                            <div className="flex gap-2 justify-end">
                                              <button onClick={cancelEdit} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300 transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-2"><X size={14}/> CANCEL</button>
                                              <button onClick={() => saveEdit(req.id)} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white shadow-lg shadow-green-500/20 transition-all font-bold text-xs uppercase tracking-wider flex items-center gap-2"><Save size={14}/> SAVE</button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="space-y-4">
                                            <p className={`text-base leading-relaxed font-medium tracking-tight ${isIncomplete ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                              {req.requirement_sentence}
                                            </p>
                                            <div className="flex items-center gap-4">
                                              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black border uppercase tracking-widest shadow-sm
                                                ${isIncomplete ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20' : 
                                                  req.completeness_status?.includes('Complete') ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-100 dark:border-green-500/20' : 
                                                  'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'}`}>
                                                {isIncomplete ? <AlertCircle size={12} className="animate-pulse" /> : (req.completeness_status?.includes('Complete') ? <CheckCircle size={12} /> : null)}
                                                {req.completeness_status || "Awaiting Analysis"}
                                              </span>
                                              
                                              {req.epic && (
                                                <button 
                                                  onClick={() => toggleOutcome(req.id)}
                                                  className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300 border
                                                    ${showOutcomes 
                                                      ? 'bg-secondary text-white border-secondary shadow-lg shadow-secondary/10' 
                                                      : 'bg-white dark:bg-slate-800 text-secondary border-secondary/30 hover:bg-secondary hover:text-white hover:shadow-md'}`}
                                                >
                                                  <Layers size={12} />
                                                  {showOutcomes ? 'HIDE ARTIFACTS' : 'VIEW ARTIFACTS'}
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-6 py-6 text-center align-top pt-8">
                                        {!editingId && (
                                           <button 
                                             onClick={() => startEdit(req)}
                                             className="p-3 bg-slate-100/50 dark:bg-slate-800/50 hover:bg-primary dark:hover:bg-primary hover:text-white dark:hover:text-white rounded-xl transition-all text-slate-300 dark:text-slate-600 hover:shadow-md hover:-translate-y-0.5"
                                             title="Edit Requirement"
                                           >
                                             <Edit2 size={16} />
                                           </button>
                                        )}
                                      </td>
                                    </tr>
                                    
                                    {/* Outcomes Row */}
                                    {showOutcomes && req.epic && (
                                      <tr className="bg-slate-50/30 dark:bg-slate-900/20">
                                        <td colSpan={3} className="px-8 py-0">
                                          <div className="py-8 px-10 animate-in slide-in-from-left-4 duration-500">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                              <div className="space-y-2 group">
                                                <div className="flex items-center gap-2 mb-3">
                                                  <div className="w-8 h-1 bg-secondary rounded-full transition-all group-hover:w-12"></div>
                                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Feature</h4>
                                                </div>
                                                <p className="text-secondary font-bold text-lg leading-tight tracking-tight">{req.feature}</p>
                                              </div>

                                              <div className="space-y-2 group">
                                                <div className="flex items-center gap-2 mb-3">
                                                  <div className="w-8 h-1 bg-primary rounded-full transition-all group-hover:w-12"></div>
                                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">User Story</h4>
                                                </div>
                                                <p className="text-slate-600 dark:text-slate-300 italic font-medium leading-relaxed">"{req.user_story}"</p>
                                              </div>

                                              <div className="space-y-2 group lg:col-span-1 md:col-span-2">
                                                <div className="flex items-center gap-2 mb-3">
                                                  <div className="w-8 h-1 bg-green-500 rounded-full transition-all group-hover:w-12"></div>
                                                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acceptance Criteria</h4>
                                                </div>
                                                <p className="text-slate-500 dark:text-slate-400 text-xs leading-loose font-medium bg-white/50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner">{req.acceptance_criteria}</p>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
