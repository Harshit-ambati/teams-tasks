import express from 'express';
import {
  approveResourceRequest,
  createResourceRequest,
  getDepartmentRequests,
  getProjectRequests,
  rejectResourceRequest,
} from '../controllers/resourceRequestController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

router.use(authMiddleware);

router.post(
  '/',
  authorizeRoles('admin', 'project_manager'),
  createResourceRequest
);

router.get(
  '/project/:projectId',
  authorizeRoles('admin', 'project_manager'),
  getProjectRequests
);

router.get(
  '/department',
  authorizeRoles('admin', 'department_leader'),
  getDepartmentRequests
);

router.patch(
  '/:id/approve',
  authorizeRoles('admin', 'department_leader'),
  approveResourceRequest
);

router.patch(
  '/:id/reject',
  authorizeRoles('admin', 'department_leader'),
  rejectResourceRequest
);

export default router;
