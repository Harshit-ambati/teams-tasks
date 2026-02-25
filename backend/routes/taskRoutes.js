import express from 'express';
import {
  createTask,
  deleteTask,
  getTaskById,
  getTasksByProject,
  getTasks,
  updateTask,
} from '../controllers/taskController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

router.use(authMiddleware);
router.get('/', getTasks);
router.get('/project/:projectId', getTasksByProject);
router.post('/', authorizeRoles('admin', 'project_manager', 'team_leader'), createTask);
router.get('/:id', getTaskById);
router.put(
  '/:id',
  authorizeRoles('admin', 'project_manager', 'team_leader', 'team_member'),
  updateTask
);
router.patch(
  '/:id',
  authorizeRoles('admin', 'project_manager', 'team_leader', 'team_member'),
  updateTask
);
router.delete('/:id', authorizeRoles('admin'), deleteTask);

export default router;
