import express from 'express';
import {
  createTeam,
  deleteTeam,
  getTeamById,
  getTeams,
  updateTeam,
} from '../controllers/teamController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

router.use(authMiddleware);
router.get('/', getTeams);
router.post('/', authorizeRoles('admin', 'department_leader'), createTeam);
router.get('/:id', getTeamById);
router.put(
  '/:id',
  authorizeRoles('admin', 'department_leader', 'team_leader'),
  updateTeam
);
router.delete('/:id', authorizeRoles('admin', 'department_leader'), deleteTeam);

export default router;
