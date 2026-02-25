import express from 'express';
import { getAuditLogs, getProjectAuditLogs } from '../controllers/auditLogController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import authorizeRoles from '../middleware/authorizeRoles.js';

const router = express.Router();

router.use(authMiddleware);
router.get('/', authorizeRoles('admin'), getAuditLogs);
router.get('/project/:projectId', authorizeRoles('admin', 'project_manager'), getProjectAuditLogs);

export default router;
