import express from 'express';
import {
  createProject,
  deleteProject,
  getProjectById,
  getProjectTeam,
  getProjects,
  updateProject,
} from '../controllers/projectController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

router.use(authMiddleware);
router.get('/', getProjects);
router.post('/', authorizeRoles('admin', 'project_manager'), createProject);
router.get('/:id', getProjectById);
router.get('/:id/team', getProjectTeam);
router.put('/:id', authorizeRoles('admin', 'project_manager'), updateProject);
router.patch('/:id', authorizeRoles('admin', 'project_manager'), updateProject);
router.delete('/:id', authorizeRoles('admin'), deleteProject);

export default router;
