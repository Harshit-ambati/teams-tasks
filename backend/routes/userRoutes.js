import express from 'express';
import { getUsers } from '../controllers/userController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

router.use(authMiddleware);
router.get('/', authorizeRoles('admin'), getUsers);

export default router;
