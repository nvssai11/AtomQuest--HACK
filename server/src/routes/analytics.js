import { Router } from 'express';
import analyticsController from '../controllers/analyticsController.js';
import authenticate from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';

const router = Router();

// Analytics routes require authentication.
// In a real app, these might be strictly for Admin/HR, or visible to Managers for their own teams.
router.use(authenticate, rbac('admin', 'manager'));

router.get('/distribution', analyticsController.getScoreDistribution);
router.get('/manager-effectiveness', analyticsController.getManagerEffectiveness);

export default router;
