// backend/routes/changeRequestRoutes.js
const express = require('express');
const router = express.Router();
const changeRequestController = require('../controllers/changeRequestController');

// Integrated Project Management Flow Endpoints
router.get('/projects', changeRequestController.getAllProjects);
router.get('/projects/:projectId', changeRequestController.getProjectDetails);
router.get('/projects/:projectId/user-stories', changeRequestController.getProjectUserStories);
router.get('/projects/:projectId/sprints', changeRequestController.getProjectSprints);
router.get('/sprints/:sprintId/resources', changeRequestController.getSprintResources);

// Change Request CRUD, Details & Approvals
router.post('/submit', changeRequestController.submitChangeRequest);
router.get('/all', changeRequestController.getAllChangeRequests);
router.get('/stats', changeRequestController.getDashboardStats);
router.get('/scope-creep/:projectId', changeRequestController.getScopeCreepAlert);
router.get('/:id', changeRequestController.getChangeRequestById);
router.put('/:id/approve', changeRequestController.updateApproval);

module.exports = router;