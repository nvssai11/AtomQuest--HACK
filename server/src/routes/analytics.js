import { Router } from 'express';
import analyticsController from '../controllers/analyticsController.js';
import authenticate from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';
import apicache from 'apicache';

const router = Router();
const cache = apicache.middleware;

// Analytics routes require authentication.
// In a real app, these might be strictly for Admin/HR, or visible to Managers for their own teams.
router.use(authenticate, rbac('admin', 'manager'));

router.get('/distribution', cache('10 minutes'), analyticsController.getScoreDistribution);
router.get('/manager-effectiveness', cache('10 minutes'), analyticsController.getManagerEffectiveness);

export default router;
