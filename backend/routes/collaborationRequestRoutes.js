import express from 'express';
import {
  approveCollaborationRequest,
  createCollaborationRequest,
  getCollaborationRequestsByTask,
  rejectCollaborationRequest,
} from '../controllers/collaborationRequestController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

router.use(authMiddleware);
router.post('/', createCollaborationRequest);
router.get('/task/:taskId', getCollaborationRequestsByTask);
router.patch(
  '/:id/approve',
  authorizeRoles('admin', 'project_manager', 'department_leader', 'team_leader'),
  approveCollaborationRequest
);
router.patch(
  '/:id/reject',
  authorizeRoles('admin', 'project_manager', 'department_leader', 'team_leader'),
  rejectCollaborationRequest
);

export default router;
