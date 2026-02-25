import express from 'express';
import {
  createDepartment,
  getDepartments,
  updateDepartment,
} from '../controllers/departmentController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

router.use(authMiddleware);
router.get(
  '/',
  authorizeRoles('admin', 'project_manager', 'department_leader'),
  getDepartments
);
router.post('/', authorizeRoles('admin'), createDepartment);
router.patch('/:id', authorizeRoles('admin'), updateDepartment);

export default router;
