import express from 'express';
import {
  createSubtask,
  deleteSubtask,
  getSubtasksByTask,
  updateSubtask,
} from '../controllers/subtaskController.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(authMiddleware);
router.post('/', createSubtask);
router.get('/task/:taskId', getSubtasksByTask);
router.patch('/:id', updateSubtask);
router.delete('/:id', deleteSubtask);

export default router;
