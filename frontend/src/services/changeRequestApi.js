// Research/frontend/src/services/changeRequestApi.js
// ============================================
// API SERVICE - Change Management System
// Connects to ReqChange AI backend on port 5000
// ============================================

import axios from 'axios';

const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CHANGE_API_URL) 
  ? import.meta.env.VITE_CHANGE_API_URL 
  : 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================
// 1. PROJECT APIS
// ============================================

// Retrieve all active projects
export const getActiveProjects = async () => {
  try {
    const response = await api.get('/change-requests/projects');
    return response.data;
  } catch (error) {
    console.error('Error fetching active projects:', error);
    throw error;
  }
};

// Retrieve specific project details by ID
export const getProjectDetails = async (projectId) => {
  try {
    const response = await api.get(`/change-requests/projects/${projectId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching project details for ${projectId}:`, error);
    throw error;
  }
};

// ============================================
// 2. USER STORY APIS
// ============================================

// Retrieve all user stories belonging to a project
export const getProjectUserStories = async (projectId) => {
  try {
    const response = await api.get(`/change-requests/projects/${projectId}/user-stories`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching user stories for project ${projectId}:`, error);
    throw error;
  }
};

// ============================================
// 3. SPRINT APIS
// ============================================

// Retrieve only pending/active sprints for a project
export const getProjectPendingSprints = async (projectId) => {
  try {
    const response = await api.get(`/change-requests/projects/${projectId}/sprints`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching pending sprints for project ${projectId}:`, error);
    throw error;
  }
};

// ============================================
// 4. RESOURCE ALLOCATION APIS
// ============================================

// Retrieve resource allocations for a sprint / user story
export const getSprintResourceAllocations = async (sprintId, userStoryId = '') => {
  try {
    const url = userStoryId 
      ? `/change-requests/sprints/${sprintId}/resources?userStoryId=${encodeURIComponent(userStoryId)}`
      : `/change-requests/sprints/${sprintId}/resources`;
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching resource allocations for sprint ${sprintId}:`, error);
    throw error;
  }
};

// ============================================
// 5. CHANGE REQUEST APIS
// ============================================

// Submit a new Change Request with full relationship linkage & ML evaluation
export const submitChangeRequest = async (formData) => {
  try {
    const response = await api.post('/change-requests/submit', formData);
    return response.data;
  } catch (error) {
    console.error('Error submitting change request:', error);
    throw error;
  }
};

// Retrieve all change requests
export const getAllChangeRequests = async () => {
  try {
    const response = await api.get('/change-requests/all');
    return response.data;
  } catch (error) {
    console.error('Error fetching change requests:', error);
    throw error;
  }
};

// Retrieve single change request by ID
export const getChangeRequestById = async (id) => {
  try {
    const response = await api.get(`/change-requests/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching change request ${id}:`, error);
    throw error;
  }
};

// Update approval decision (Approve / Reject / Clarification)
export const approveChangeRequest = async (id, data) => {
  try {
    const response = await api.put(`/change-requests/${id}/approve`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating approval for ${id}:`, error);
    throw error;
  }
};

// ============================================
// 6. DASHBOARD & SCOPE CREEP APIS
// ============================================

// Get real dashboard statistics
export const getDashboardStats = async () => {
  try {
    const response = await api.get('/change-requests/stats');
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

// Get scope creep risk analysis for a project
export const getScopeCreepAlert = async (projectId) => {
  try {
    const response = await api.get(`/change-requests/scope-creep/${projectId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching scope creep alert for ${projectId}:`, error);
    throw error;
  }
};

export default api;
