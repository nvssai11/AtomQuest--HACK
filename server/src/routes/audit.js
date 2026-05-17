import { Router } from 'express';
import auditController from '../controllers/auditController.js';
import authenticate from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);
router.get('/recent', auditController.getRecentActivity);
router.get('/', rbac('admin'), auditController.getFullAuditTrail);

export default router;
