import { Router } from 'express';
import adminController from '../controllers/adminController.js';
import authenticate from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';
import { validate, schemas } from '../middleware/validate.js';

const router = Router();

// All admin routes require authentication and Admin role
router.use(authenticate, rbac('admin'));

// Goal overrides
router.post('/goals/:goalId/unlock', validate(schemas.unlockGoal), adminController.unlockGoal);

router.post('/cycle/phase', validate(schemas.updateCyclePhase), adminController.updateCyclePhase);

// Escalations
router.post('/escalations/trigger', adminController.triggerEscalation);
router.get('/escalations', adminController.getEscalations);

// Reports & Analytics
router.get('/reports/download', adminController.downloadReport);
router.get('/reports/completion', adminController.getCompletionDashboard);
router.get('/hierarchy', adminController.getOrgHierarchy);

export default router;
