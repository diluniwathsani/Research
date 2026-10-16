import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CheckSquare, Plus, Eye, Edit2, Trash2, 
  Layers, GitCommit, UserCheck, Sparkles, RefreshCw, X,
  ChevronDown, CheckCircle2, ShieldAlert
} from 'lucide-react';
import ProjectSelection from './ProjectSelection.jsx';

const EXPRESS_API = 'http://localhost:3000/api';

const WORK_ITEM_TYPES = [
  'Development',
  'UI/UX',
  'Database',
  'API/Backend',
  'Testing',
  'Documentation',
  'Deployment',
  'Other'
];

const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'];

export default function WorkItemsModule({
  projects = [],
  selectedProjectId = 'P00001',
  onSelectProject
}) {
  // --- STATE ---
  const [workItems, setWorkItems] = useState([]);
  const [userStories, setUserStories] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [error, setError] = useState(null);

  // Accordion Expand/Collapse State for User Story Cards
  const [expandedStories, setExpandedStories] = useState({});

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [traceabilityItem, setTraceabilityItem] = useState(null);

  // Form State for Create / Edit
  const [formData, setFormData] = useState({
    work_item_id: '',
    story_id: '',
    parent_story_title: '',
    requirement_sentence: '',
    epic: '',
    feature: '',
    title: '',
    description: '',
    work_item_type: 'Development',
    priority: 'Medium',
    estimated_hours: 8,
    assigned_to: 'Unassigned',
    status: 'To Do',
    start_date: '',
    end_date: ''
  });

  // --- FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    let fetchErrors = [];

    try {
      const [storiesResult, wiResult, devResult] = await Promise.allSettled([
        axios.get(`${EXPRESS_API}/user-stories?project_id=${selectedProjectId}`),
        axios.get(`${EXPRESS_API}/work-items?project_id=${selectedProjectId}`),
        axios.get(`${EXPRESS_API}/developers?project_id=${selectedProjectId}`)
      ]);

      // 1. Process User Stories
      if (storiesResult.status === 'fulfilled') {
        const storiesRes = storiesResult.value;
        const storiesList = Array.isArray(storiesRes.data) ? storiesRes.data : (storiesRes.data?.data || []);

        // Group stories by Epic in order of Epic creation (first appearance), then sort by requirement_order / ID
        const epicMinOrder = {};
        storiesList.forEach((s, idx) => {
          const epicName = (s.epic || 'General Epic').trim();
          const order = s.requirement_order !== undefined && s.requirement_order !== null 
            ? Number(s.requirement_order) 
            : (parseInt(String(s.story_id || s.user_story_id || s.id || '').replace(/\D/g, '')) || (idx + 1));
          if (epicMinOrder[epicName] === undefined || order < epicMinOrder[epicName]) {
            epicMinOrder[epicName] = order;
          }
        });

        const sortedStories = [...storiesList].sort((a, b) => {
          const epicA = (a.epic || 'General Epic').trim();
          const epicB = (b.epic || 'General Epic').trim();
          const epicOrderA = epicMinOrder[epicA] !== undefined ? epicMinOrder[epicA] : 999999;
          const epicOrderB = epicMinOrder[epicB] !== undefined ? epicMinOrder[epicB] : 999999;

          if (epicOrderA !== epicOrderB) {
            return epicOrderA - epicOrderB;
          }

          const orderA = a.requirement_order !== undefined && a.requirement_order !== null ? Number(a.requirement_order) : 999999;
          const orderB = b.requirement_order !== undefined && b.requirement_order !== null ? Number(b.requirement_order) : 999999;
          if (orderA !== orderB) return orderA - orderB;

          const idA = parseInt(String(a.story_id || a.user_story_id || a.id || '').replace(/\D/g, '')) || 0;
          const idB = parseInt(String(b.story_id || b.user_story_id || b.id || '').replace(/\D/g, '')) || 0;
          return idA - idB;
        });
        // Deduplicate sortedStories by unique story_id
        const seenStoryIds = new Set();
        const uniqueSortedStories = sortedStories.filter((s, idx) => {
          const sid = s.story_id || s.user_story_id || s.id || `story-${idx}`;
          if (seenStoryIds.has(sid)) return false;
          seenStoryIds.add(sid);
          return true;
        });

        setUserStories(uniqueSortedStories);

        // Auto-expand all stories by default
        const expandMap = {};
        uniqueSortedStories.forEach(s => {
          const sid = s.story_id || s.user_story_id || s.id;
          expandMap[sid] = true;
        });
        setExpandedStories(expandMap);
      } else {
        console.error('Failed to load user stories:', storiesResult.reason);
        fetchErrors.push('user stories');
      }

      // 2. Process Work Items
      if (wiResult.status === 'fulfilled') {
        const wiRes = wiResult.value;
        const wiList = Array.isArray(wiRes.data) ? wiRes.data : (wiRes.data?.data || []);
        setWorkItems(wiList);
      } else {
        console.error('Failed to load work items:', wiResult.reason);
        fetchErrors.push('work items');
      }

      // 3. Process Developers
      if (devResult.status === 'fulfilled') {
        const devRes = devResult.value;
        const devList = Array.isArray(devRes.data) ? devRes.data : (devRes.data?.data || []);
        setDevelopers(devList);
      } else {
        console.warn('Failed to load developers:', devResult.reason);
      }

      if (fetchErrors.length > 0) {
        setError(`Failed to load ${fetchErrors.join(' and ')} from server. Make sure the backend server is running.`);
      } else {
        setError(null);
      }
    } catch (err) {
      console.error('WorkItemsModule fetch error:', err);
      setError('Failed to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProjectId]);

  // --- BATCH DECOMPOSITION FOR ALL PROJECT STORIES ---
  const handleDecomposeAllProjectStories = async () => {
    if (userStories.length === 0) {
      alert('No User Stories found in the selected project to decompose.');
      return;
    }
    setBatchLoading(true);
    setError(null);
    try {
      await axios.post(`${EXPRESS_API}/user-stories/decompose-batch`, {
        project_id: selectedProjectId,
        stories: userStories
      });
      await fetchData();
      alert(`✅ Successfully decomposed all ${userStories.length} User Stories into Work Items!`);
    } catch (err) {
      console.error('Error batch decomposing stories:', err);
      setError('Failed to batch decompose project user stories: ' + (err.response?.data?.error || err.message));
    } finally {
      setBatchLoading(false);
    }
  };



  // --- FORM HANDLERS ---
  const openCreateModal = () => {
    const defaultStory = userStories.length > 0 ? userStories[0] : null;
    setFormData({
      work_item_id: '',
      story_id: defaultStory ? (defaultStory.story_id || defaultStory.user_story_id || defaultStory.id) : '',
      parent_story_title: defaultStory ? (defaultStory.title || defaultStory.user_story || '') : '',
      requirement_sentence: defaultStory ? (defaultStory.requirement_sentence || defaultStory.description || '') : '',
      epic: defaultStory ? (defaultStory.epic || 'General') : 'General',
      feature: defaultStory ? (defaultStory.feature || 'General Feature') : 'General Feature',
      title: '',
      description: '',
      work_item_type: 'Development',
      priority: 'Medium',
      estimated_hours: 8,
      assigned_to: 'Unassigned',
      status: 'To Do',
      start_date: new Date().toISOString().split('T')[0],
      end_date: ''
    });
    setEditingItem(null);
    setShowCreateModal(true);
  };

  const openEditModal = (item) => {
    setFormData({
      work_item_id: item.work_item_id || '',
      story_id: item.story_id || '',
      parent_story_title: item.parent_story_title || '',
      requirement_sentence: item.requirement_sentence || '',
      epic: item.epic || '',
      feature: item.feature || '',
      title: item.title || '',
      description: item.description || '',
      work_item_type: item.work_item_type || item.domain || 'Development',
      priority: item.priority || 'Medium',
      estimated_hours: item.estimated_hours || item.estimated_effort || 8,
      assigned_to: item.assigned_to || item.assigned_resource || 'Unassigned',
      status: item.status || 'To Do',
      start_date: item.start_date ? String(item.start_date).split('T')[0] : '',
      end_date: item.end_date ? String(item.end_date).split('T')[0] : ''
    });
    setEditingItem(item);
    setShowCreateModal(true);
  };

  const handleStorySelectInForm = (storyId) => {
    const found = userStories.find(s => String(s.story_id || s.user_story_id || s.id) === String(storyId));
    setFormData(prev => ({
      ...prev,
      story_id: storyId,
      parent_story_title: found ? (found.title || found.user_story || '') : prev.parent_story_title,
      requirement_sentence: found ? (found.requirement_sentence || found.description || '') : prev.requirement_sentence,
      epic: found ? (found.epic || 'General') : prev.epic,
      feature: found ? (found.feature || 'General Feature') : prev.feature
    }));
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert('Title is required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...formData,
        project_id: selectedProjectId
      };
      if (editingItem) {
        await axios.put(`${EXPRESS_API}/work-items/${editingItem.work_item_id}`, payload);
      } else {
        await axios.post(`${EXPRESS_API}/work-items`, payload);
      }
      setShowCreateModal(false);
      setEditingItem(null);
      await fetchData();
    } catch (err) {
      console.error('Error saving work item:', err);
      alert('Failed to save work item: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workItemId) => {
    if (!window.confirm(`Are you sure you want to delete Work Item ${workItemId}?`)) return;
    setLoading(true);
    try {
      await axios.delete(`${EXPRESS_API}/work-items/${workItemId}`);
      await fetchData();
    } catch (err) {
      console.error('Error deleting work item:', err);
      alert('Failed to delete work item: ' + err.message);
    } finally {
      setLoading(false);
    }
  };



  const handleStatusQuickChange = async (item, newStatus) => {
    try {
      await axios.put(`${EXPRESS_API}/work-items/${item.work_item_id}`, { status: newStatus });
      setWorkItems(prev => prev.map(w => w.work_item_id === item.work_item_id ? { ...w, status: newStatus } : w));
    } catch (err) {
      console.error('Status change error:', err);
    }
  };

  const toggleStoryExpand = (storyId) => {
    setExpandedStories(prev => ({ ...prev, [storyId]: !prev[storyId] }));
  };

  // Summary Counts
  const totalCount = workItems.length;
  const storiesCount = userStories.length;

  const activeProjectObj = projects.find(p => p.project_id === selectedProjectId || p.id === selectedProjectId);
  const activeProjectName = activeProjectObj ? (activeProjectObj.project_name || activeProjectObj.name) : selectedProjectId;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
              <CheckSquare size={14} className="text-indigo-300" />
              <span>Module 2: Work Items Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Work Items & Decomposition Module
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDecomposeAllProjectStories}
              disabled={batchLoading || userStories.length === 0}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center gap-2.5"
              title="Decompose all user stories of active project simultaneously"
            >
              {batchLoading ? <RefreshCw className="animate-spin" size={16} /> : <Sparkles size={16} />}
              <span>{batchLoading ? 'Decomposing All Stories...' : '⚡ Decompose All Project Stories'}</span>
            </button>

            <button
              onClick={openCreateModal}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Create Work Item</span>
            </button>
          </div>
        </div>
      </div>

      {/* Project Selector & Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Active Project Picker Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col justify-center">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Active Project
          </label>
          <ProjectSelection
            projects={projects}
            selectedProject={activeProjectObj}
            onSelect={(proj) => onSelectProject && onSelectProject(proj?.project_id || proj?.id || 'P00001')}
          />
        </div>

        {/* Stats 1: Project User Stories */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
            <Layers size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">User Stories</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{storiesCount}</span>
          </div>
        </div>

        {/* Stats 2: Decomposed Work Items */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <CheckSquare size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Work Items</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{totalCount}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchData}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              title="Dismiss error banner"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* USER STORIES & DECOMPOSITION CARDS VIEW */}
      <div className="space-y-6">
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
            <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
            <span>Loading project User Stories & Work Items...</span>
          </div>
        ) : userStories.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
            <Layers className="mx-auto mb-3 opacity-20" size={48} />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No User Stories Found for Active Project</h3>
            <p className="text-xs text-slate-400 mt-1">Upload a requirement document (Word or PDF) in Module 1 to import requirements & generate User Stories.</p>
          </div>
        ) : (
          userStories.map((story, storyIdx) => {
            const storyId = story.story_id || story.user_story_id || story.id;
            const storyTitle = story.title || story.user_story || 'User Story Requirement';
            const reqOrder = story.requirement_order || (storyIdx + 1);

            // Filter work items belonging strictly to this story
            const cleanStoryId = String(storyId || '').toUpperCase().trim();
            const cleanStoryNum = cleanStoryId.replace(/^US-?/i, '');
            const storyWorkItems = workItems.filter(w => {
              const wStoryId = String(w.story_id || '').toUpperCase().trim();
              const wStoryNum = wStoryId.replace(/^US-?/i, '');
              const wItemIdNum = String(w.work_item_id || '').replace(/^WI-US-?/i, '').split('-')[0].trim();
              return (
                wStoryId === cleanStoryId ||
                (cleanStoryNum && wStoryNum === cleanStoryNum) ||
                (cleanStoryNum && wItemIdNum === cleanStoryNum)
              );
            });

            const isExpanded = expandedStories[storyId] !== false;

            return (
              <div 
                key={`${storyId}-${storyIdx}`}
                className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden transition-all"
              >
                {/* Story Card Header */}
                <div 
                  onClick={() => toggleStoryExpand(storyId)}
                  className="p-5 flex items-center justify-between cursor-pointer select-none bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Sequence Badge */}
                    <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white font-mono font-bold text-xs flex items-center justify-center shadow-md">
                      #{String(reqOrder).padStart(2, '0')}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {storyId}
                        </span>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                          {story.epic || 'General Epic'}
                        </span>
                        {story.feature && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {story.feature}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
                        {storyTitle}
                      </h3>

                      {story.description && story.description !== storyTitle && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1 italic">
                          "{story.description}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Decomposed Work Items Container */}
                {isExpanded && (
                  <div className="p-5">
                    {storyWorkItems.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          No work items generated for this story yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Decomposed Work Items ({storyWorkItems.length})
                          </h4>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                          <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
                            <thead className="text-[10px] uppercase bg-slate-100 dark:bg-slate-900 text-slate-500 font-extrabold border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th scope="col" className="px-4 py-3 w-32">Work Item ID</th>
                                <th scope="col" className="px-4 py-3">Title & Details</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                              {storyWorkItems.map((item, wIdx) => (
                                <tr key={item.work_item_id ? `${item.work_item_id}-${wIdx}` : `wi-${wIdx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                                  <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                    {item.work_item_id}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                      {item.title}
                                    </div>
                                    {item.description && (
                                      <div className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                                        {item.description}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Create / Edit Work Item */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-6 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <CheckSquare size={20} className="text-indigo-600 dark:text-indigo-400" />
                {editingItem ? `Edit Work Item: ${editingItem.work_item_id}` : 'Create New Work Item'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Parent User Story <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.story_id}
                  onChange={(e) => handleStorySelectInForm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  required
                >
                  <option value="">-- Select Parent User Story --</option>
                  {userStories.map((s, idx) => {
                    const sid = s.story_id || s.user_story_id || s.id || `story-${idx}`;
                    return (
                      <option key={`${sid}-${idx}`} value={sid}>
                        {sid}: {s.title || s.user_story || 'Story'}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Work Item Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Design Login UI / Develop Authentication API"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Specific technical implementation task details..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Work Item Type
                  </label>
                  <select
                    value={formData.work_item_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, work_item_type: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  >
                    {WORK_ITEM_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Effort (Hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Resource
                  </label>
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {developers.map(d => (
                      <option key={d.id || d.email} value={d.name}>
                        {d.name} ({d.primary_domain || d.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-white shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Work Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Traceability Hierarchical View */}
      {traceabilityItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
                <GitCommit size={18} className="text-indigo-600 dark:text-indigo-400" />
                Traceability Map for Work Item {traceabilityItem.work_item_id}
              </h3>
              <button
                onClick={() => setTraceabilityItem(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/50">
                <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider block">
                  1. Original Excel Requirement
                </span>
                <p className="text-xs font-semibold text-purple-950 dark:text-purple-200 mt-1">
                  {traceabilityItem.requirement_sentence || 'Requirement details synced from Excel Upload'}
                </p>
              </div>

              <div className="text-center text-slate-300 dark:text-slate-600">↓</div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50">
                  <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider block">
                    2. Epic
                  </span>
                  <p className="text-xs font-semibold text-indigo-950 dark:text-indigo-200 mt-1">
                    {traceabilityItem.epic || 'General Domain'}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">
                    3. Feature
                  </span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                    {traceabilityItem.feature || 'Feature Logic'}
                  </p>
                </div>
              </div>

              <div className="text-center text-slate-300 dark:text-slate-600">↓</div>

              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50">
                <span className="text-[9px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider block">
                  4. Parent User Story ({traceabilityItem.story_id})
                </span>
                <p className="text-xs font-semibold text-blue-950 dark:text-blue-200 mt-1">
                  {traceabilityItem.parent_story_title || 'User Story Title'}
                </p>
              </div>

              <div className="text-center text-slate-300 dark:text-slate-600">↓</div>

              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/50">
                <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">
                  5. Current Work Item ({traceabilityItem.work_item_id})
                </span>
                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 mt-1">
                  {traceabilityItem.title}
                </p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span>Type: {traceabilityItem.work_item_type || 'Development'}</span>
                  <span>Effort: {traceabilityItem.estimated_hours || 8} hrs</span>
                  <span>Assigned: {traceabilityItem.assigned_to || 'Unassigned'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTraceabilityItem(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-700 font-bold text-xs"
              >
                Close Traceability Map
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
