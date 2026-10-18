import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  CheckSquare, Plus, Eye, Edit2, Trash2, 
  Layers, GitCommit, UserCheck, Sparkles, RefreshCw, X,
  ChevronDown, CheckCircle2, ShieldAlert, Search, Filter, Clock, Award
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

const DOMAIN_OPTIONS = [
  'Reporting/Analytics',
  'Frontend',
  'Backend',
  'Database',
  'API/Integration',
  'Engineering and Asset Management',
  'Labour and Cost Management',
  'QA/Testing',
  'DevOps/Security',
  'AI/ML'
];

const PRIORITIES = ['High', 'Medium', 'Low'];
const COMPLEXITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];
const STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'];

// Helper renderers for badges and tags
const renderDomainBadge = (domain) => {
  const d = String(domain || 'Backend').trim();
  const dLower = d.toLowerCase();
  
  if (dLower.includes('report') || dLower.includes('analytics')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 whitespace-nowrap">
        <span>📊</span> {d}
      </span>
    );
  }
  if (dLower.includes('labour') || dLower.includes('labor') || dLower.includes('cost') || dLower.includes('overtime')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800 whitespace-nowrap">
        <span>💰</span> {d}
      </span>
    );
  }
  if (dLower.includes('asset') || dLower.includes('equipment') || dLower.includes('vessel') || dLower.includes('engineering')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800 whitespace-nowrap">
        <span>⚙️</span> {d}
      </span>
    );
  }
  if (dLower.includes('database') || dLower.includes('sql')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800 whitespace-nowrap">
        <span>🗄️</span> {d}
      </span>
    );
  }
  if (dLower.includes('front') || dLower.includes('ui') || dLower.includes('ux')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800 whitespace-nowrap">
        <span>🎨</span> {d}
      </span>
    );
  }
  if (dLower.includes('api') || dLower.includes('integration')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 whitespace-nowrap">
        <span>🔌</span> {d}
      </span>
    );
  }
  if (dLower.includes('qa') || dLower.includes('test')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300 border border-violet-300 dark:border-violet-800 whitespace-nowrap">
        <span>🧪</span> {d}
      </span>
    );
  }
  if (dLower.includes('ai') || dLower.includes('ml')) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-fuchsia-100 dark:bg-fuchsia-950/60 text-fuchsia-800 dark:text-fuchsia-300 border border-fuchsia-300 dark:border-fuchsia-800 whitespace-nowrap">
        <span>🧠</span> {d}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 whitespace-nowrap">
      <span>⚙️</span> {d}
    </span>
  );
};

const renderComplexityBadge = (complexity) => {
  const c = String(complexity || 'MEDIUM').toUpperCase().trim();
  if (c === 'HIGH') {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
        HIGH
      </span>
    );
  }
  if (c === 'LOW') {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
        LOW
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
      MEDIUM
    </span>
  );
};

const renderPriorityBadge = (priority) => {
  const p = String(priority || 'Medium').toUpperCase().trim();
  if (p === 'HIGH' || p === 'CRITICAL') {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
        {priority}
      </span>
    );
  }
  if (p === 'LOW') {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
        {priority}
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
      {priority}
    </span>
  );
};

const renderSkillTags = (skills) => {
  let list = [];
  if (Array.isArray(skills)) {
    list = skills;
  } else if (typeof skills === 'string') {
    list = skills.replace(/^\{|\}$/g, '').split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
  }
  if (list.length === 0) {
    return <span className="text-[11px] text-slate-400 italic">None specified</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {list.map((skill, sIdx) => (
        <span 
          key={sIdx}
          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 whitespace-nowrap"
        >
          {skill}
        </span>
      ))}
    </div>
  );
};

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
  const [decomposingStoryId, setDecomposingStoryId] = useState(null);
  const [error, setError] = useState(null);

  // Search and Domain Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [domainFilter, setDomainFilter] = useState('ALL');

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
    domain: 'Backend',
    required_domain: 'Backend',
    required_skills: '',
    work_item_type: 'Development',
    priority: 'Medium',
    story_points: 1,
    estimated_hours: 8,
    predicted_complexity: 'MEDIUM',
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

          const orderA = a.requirement_order !== undefined && a.requirement_order !== null
            ? Number(a.requirement_order)
            : (parseInt(String(a.story_id || a.user_story_id || a.id || '').replace(/\D/g, '')) || 0);
          const orderB = b.requirement_order !== undefined && b.requirement_order !== null
            ? Number(b.requirement_order)
            : (parseInt(String(b.story_id || b.user_story_id || b.id || '').replace(/\D/g, '')) || 0);

          return orderA - orderB;
        });

        setUserStories(sortedStories);
      } else {
        console.warn('Failed to load user stories:', storiesResult.reason);
        fetchErrors.push('User Stories');
      }

      // 2. Process Work Items
      if (wiResult.status === 'fulfilled') {
        const wiRes = wiResult.value;
        const wiList = Array.isArray(wiRes.data) ? wiRes.data : (wiRes.data?.data || []);
        setWorkItems(wiList);
      } else {
        console.warn('Failed to load work items:', wiResult.reason);
        fetchErrors.push('Work Items');
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
      alert(`✅ Successfully decomposed all ${userStories.length} User Stories into structured Work Items!`);
    } catch (err) {
      console.error('Error batch decomposing stories:', err);
      setError('Failed to batch decompose project user stories: ' + (err.response?.data?.error || err.message));
    } finally {
      setBatchLoading(false);
    }
  };

  // --- SINGLE USER STORY DECOMPOSITION ---
  const handleDecomposeSingleStory = async (story) => {
    const storyId = story.story_id || story.user_story_id || story.id;
    setDecomposingStoryId(storyId);
    setError(null);
    try {
      await axios.post(`${EXPRESS_API}/user-stories/${encodeURIComponent(storyId)}/decompose`, {
        story,
        project_id: selectedProjectId
      });
      setExpandedStories(prev => ({ ...prev, [storyId]: true }));
      await fetchData();
    } catch (err) {
      console.error('Error decomposing single story:', err);
      alert('Failed to decompose story: ' + (err.response?.data?.error || err.message));
    } finally {
      setDecomposingStoryId(null);
    }
  };

  // --- FORM HANDLERS ---
  const openCreateModal = () => {
    const defaultStory = userStories.length > 0 ? userStories[0] : null;
    const defaultStoryId = defaultStory ? (defaultStory.story_id || defaultStory.user_story_id || defaultStory.id) : '';
    setFormData({
      work_item_id: '',
      story_id: defaultStoryId,
      parent_story_title: defaultStory ? (defaultStory.title || defaultStory.user_story || '') : '',
      requirement_sentence: defaultStory ? (defaultStory.requirement_sentence || defaultStory.description || '') : '',
      epic: defaultStory ? (defaultStory.epic || 'General') : 'General',
      feature: defaultStory ? (defaultStory.feature || 'General Feature') : 'General Feature',
      title: '',
      description: '',
      domain: 'Backend',
      required_domain: 'Backend',
      required_skills: 'JavaScript, SQL',
      work_item_type: 'Development',
      priority: defaultStory?.priority || 'Medium',
      story_points: 1,
      estimated_hours: 8,
      predicted_complexity: 'MEDIUM',
      assigned_to: 'Unassigned',
      status: 'To Do',
      start_date: new Date().toISOString().split('T')[0],
      end_date: ''
    });
    setEditingItem(null);
    setShowCreateModal(true);
  };

  const openEditModal = (item) => {
    const skillStr = Array.isArray(item.required_skills)
      ? item.required_skills.join(', ')
      : (typeof item.required_skills === 'string' ? item.required_skills.replace(/^\{|\}$/g, '') : '');

    setFormData({
      work_item_id: item.work_item_id || '',
      story_id: item.story_id || '',
      parent_story_title: item.parent_story_title || '',
      requirement_sentence: item.requirement_sentence || '',
      epic: item.epic || '',
      feature: item.feature || '',
      title: item.title || '',
      description: item.description || '',
      domain: item.domain || item.required_domain || 'Backend',
      required_domain: item.required_domain || item.domain || 'Backend',
      required_skills: skillStr,
      work_item_type: item.work_item_type || item.domain || 'Development',
      priority: item.priority || 'Medium',
      story_points: Number(item.story_points) || 1,
      estimated_hours: Number(item.estimated_hours || item.estimated_effort) || 8,
      predicted_complexity: (item.predicted_complexity || 'MEDIUM').toUpperCase(),
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
      const parsedSkills = formData.required_skills
        ? String(formData.required_skills).split(',').map(s => s.trim()).filter(Boolean)
        : [];

      const payload = {
        ...formData,
        required_skills: parsedSkills,
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

  // Summary Metrics
  const totalCount = workItems.length;
  const storiesCount = userStories.length;
  const totalPoints = useMemo(() => {
    return workItems.reduce((sum, item) => sum + (Number(item.story_points) || 1), 0);
  }, [workItems]);
  const totalHours = useMemo(() => {
    return workItems.reduce((sum, item) => sum + (Number(item.estimated_hours) || 8), 0);
  }, [workItems]);

  const activeProjectObj = projects.find(p => p.project_id === selectedProjectId || p.id === selectedProjectId);
  const activeProjectName = activeProjectObj ? (activeProjectObj.project_name || activeProjectObj.name) : selectedProjectId;

  // Filter stories and their work items based on search and domain
  const filteredStories = useMemo(() => {
    return userStories.filter(story => {
      const sId = String(story.story_id || story.user_story_id || story.id || '').toLowerCase();
      const sTitle = String(story.title || story.user_story || '').toLowerCase();
      const sDesc = String(story.description || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesSearch = !query || sId.includes(query) || sTitle.includes(query) || sDesc.includes(query);

      if (!matchesSearch) return false;

      if (domainFilter === 'ALL') return true;

      // Check if any work item under this story matches the domain filter
      const cleanStoryId = String(story.story_id || story.user_story_id || story.id || '').toUpperCase().trim();
      const cleanStoryNum = cleanStoryId.replace(/^US-?/i, '');
      const storyItems = workItems.filter(w => {
        const wStoryId = String(w.story_id || '').toUpperCase().trim();
        const wStoryNum = wStoryId.replace(/^US-?/i, '');
        const wItemIdNum = String(w.work_item_id || '').replace(/^WI-US-?/i, '').split('-')[0].trim();
        return (
          wStoryId === cleanStoryId ||
          (cleanStoryNum && wStoryNum === cleanStoryNum) ||
          (cleanStoryNum && wItemIdNum === cleanStoryNum)
        );
      });

      return storyItems.some(item => {
        const d = String(item.domain || item.required_domain || '').toLowerCase();
        return d.includes(domainFilter.toLowerCase());
      });
    });
  }, [userStories, workItems, searchQuery, domainFilter]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold mb-2">
              <CheckSquare size={14} className="text-indigo-300" />
              <span>Module 2: Work Items & Decomposition Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Work Items & Domain Classification
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Keyword-driven user story decomposition mapping engineering deliverables to practical skills, domains, and complexity for resource allocation.
            </p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Decomposed Items</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{totalCount}</span>
          </div>
        </div>

        {/* Stats 3: Total Points & Hours */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Clock size={24} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Effort</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-800 dark:text-white">{totalPoints} pts</span>
              <span className="text-xs font-semibold text-slate-400">({totalHours} hrs)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search stories, work items, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Domain Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
            <Filter size={14} /> Domain:
          </span>
          {['ALL', 'Reporting', 'Engineering', 'Labour', 'Frontend', 'Backend', 'Database', 'QA'].map(dom => (
            <button
              key={dom}
              onClick={() => setDomainFilter(dom)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                domainFilter === dom
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {dom}
            </button>
          ))}
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
        ) : filteredStories.length === 0 ? (
          <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
            <Layers className="mx-auto mb-3 opacity-20" size={48} />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No User Stories Found</h3>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery || domainFilter !== 'ALL' 
                ? 'No stories match your search or domain filter.' 
                : 'Upload a requirement document (Word or PDF) in Module 1 to import requirements & generate User Stories.'}
            </p>
          </div>
        ) : (
          filteredStories.map((story, storyIdx) => {
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

            const storyHours = storyWorkItems.reduce((acc, curr) => acc + (Number(curr.estimated_hours) || 8), 0);
            const storyPts = storyWorkItems.reduce((acc, curr) => acc + (Number(curr.story_points) || 1), 0);

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
                      <div className="flex flex-wrap items-center gap-2">
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
                        {renderPriorityBadge(story.priority || 'Medium')}
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

                  <div className="flex items-center gap-3">
                    {/* Story Stats Pill */}
                    <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <span>{storyWorkItems.length} Work Items</span>
                      <span className="text-slate-300 dark:text-slate-600">•</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{storyHours} hrs</span>
                    </div>

                    {/* Single Story Decompose Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDecomposeSingleStory(story);
                      }}
                      disabled={decomposingStoryId === storyId}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      title="Decompose or re-generate work items for this user story"
                    >
                      <Sparkles size={14} className={decomposingStoryId === storyId ? 'animate-spin' : ''} />
                      <span>{decomposingStoryId === storyId ? 'Decomposing...' : 'Decompose'}</span>
                    </button>

                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Decomposed Work Items Container */}
                {isExpanded && (
                  <div className="p-5">
                    {storyWorkItems.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center gap-3">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          No work items generated for this story yet.
                        </p>
                        <button
                          onClick={() => handleDecomposeSingleStory(story)}
                          disabled={decomposingStoryId === storyId}
                          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2"
                        >
                          <Sparkles size={14} />
                          <span>Generate Structured Work Items</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Decomposed Work Items ({storyWorkItems.length})
                          </h4>
                          <span className="text-[11px] font-semibold text-slate-400">
                            Total Effort: {storyPts} pts • {storyHours} hrs
                          </span>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700">
                          <table className="w-full text-xs text-left text-slate-700 dark:text-slate-300">
                            <thead className="text-[10px] uppercase bg-slate-100 dark:bg-slate-900 text-slate-500 font-extrabold border-b border-slate-200 dark:border-slate-700">
                              <tr>
                                <th scope="col" className="px-3 py-3 w-28">Work Item ID</th>
                                <th scope="col" className="px-3 py-3 min-w-[220px]">Title & Technical Scope</th>
                                <th scope="col" className="px-3 py-3 w-40">Identified Domain</th>
                                <th scope="col" className="px-3 py-3 min-w-[160px]">Required Skills</th>
                                <th scope="col" className="px-3 py-3 w-20 text-center">Priority</th>
                                <th scope="col" className="px-3 py-3 w-16 text-center">Points</th>
                                <th scope="col" className="px-3 py-3 w-16 text-center">Hours</th>
                                <th scope="col" className="px-3 py-3 w-24 text-center">Complexity</th>
                                <th scope="col" className="px-3 py-3 w-28 text-center">Status</th>
                                <th scope="col" className="px-3 py-3 w-24 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                              {storyWorkItems.map((item, wIdx) => (
                                <tr key={item.work_item_id ? `${item.work_item_id}-${wIdx}` : `wi-${wIdx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors">
                                  <td className="px-3 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                    {item.work_item_id}
                                  </td>
                                  <td className="px-3 py-3">
                                    <div className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                      {item.title}
                                    </div>
                                    {item.description && (
                                      <div className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                                        {item.description}
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-3">
                                    {renderDomainBadge(item.domain || item.required_domain)}
                                  </td>
                                  <td className="px-3 py-3">
                                    {renderSkillTags(item.required_skills)}
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    {renderPriorityBadge(item.priority || story.priority || 'Medium')}
                                  </td>
                                  <td className="px-3 py-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 text-xs">
                                    {item.story_points ?? 1}
                                  </td>
                                  <td className="px-3 py-3 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                    {item.estimated_hours ?? 8}h
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    {renderComplexityBadge(item.predicted_complexity)}
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <select
                                      value={item.status || 'To Do'}
                                      onChange={(e) => handleStatusQuickChange(item, e.target.value)}
                                      className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 outline-none"
                                    >
                                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                  </td>
                                  <td className="px-3 py-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                      <button
                                        onClick={() => setTraceabilityItem(item)}
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                        title="Traceability details"
                                      >
                                        <Eye size={14} />
                                      </button>
                                      <button
                                        onClick={() => openEditModal(item)}
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                                        title="Edit work item"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(item.work_item_id)}
                                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                                        title="Delete work item"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
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
                  placeholder="e.g. Develop Aggregation API / Export PDF Generator"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Technical Scope & Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Specific technical implementation task details..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Identified Domain
                  </label>
                  <select
                    value={formData.domain}
                    onChange={(e) => setFormData(prev => ({ ...prev, domain: e.target.value, required_domain: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  >
                    {DOMAIN_OPTIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Required Skills (Comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SQL, Node.js, PostgreSQL"
                    value={formData.required_skills}
                    onChange={(e) => setFormData(prev => ({ ...prev, required_skills: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    Complexity
                  </label>
                  <select
                    value={formData.predicted_complexity}
                    onChange={(e) => setFormData(prev => ({ ...prev, predicted_complexity: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  >
                    {COMPLEXITY_LEVELS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Story Points
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formData.story_points}
                    onChange={(e) => setFormData(prev => ({ ...prev, story_points: Number(e.target.value) }))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 font-semibold outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: Number(e.target.value) }))}
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
                  1. Original Requirement Sentence
                </span>
                <p className="text-xs font-semibold text-purple-950 dark:text-purple-200 mt-1">
                  {traceabilityItem.requirement_sentence || 'Requirement details synced from Requirement Analysis Module'}
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

              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/50 space-y-2">
                <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider block">
                  5. Current Decomposed Work Item ({traceabilityItem.work_item_id})
                </span>
                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  {traceabilityItem.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                  <span>Domain: {renderDomainBadge(traceabilityItem.domain || traceabilityItem.required_domain)}</span>
                  <span>Complexity: {renderComplexityBadge(traceabilityItem.predicted_complexity)}</span>
                  <span>Effort: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{traceabilityItem.estimated_hours || 8} hrs</strong></span>
                  <span>Points: <strong className="font-mono">{traceabilityItem.story_points || 1} pts</strong></span>
                </div>
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Required Skills:</span>
                  {renderSkillTags(traceabilityItem.required_skills)}
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
