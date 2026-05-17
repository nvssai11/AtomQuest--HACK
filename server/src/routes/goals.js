import { Router } from 'express';
import goalsController from '../controllers/goalsController.js';
import { validate, schemas } from '../middleware/validate.js';
import authenticate from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';

const router = Router();

// All goal routes require authentication
router.use(authenticate);

// Employee routes
router.get('/me', rbac('employee', 'manager', 'admin'), goalsController.getMyGoals);
router.get('/share-recipients', rbac('manager', 'admin'), goalsController.getShareRecipients);
router.post('/', rbac('employee', 'manager'), validate(schemas.createGoal), goalsController.createGoal);
router.put('/:id', validate(schemas.updateGoal), goalsController.updateGoal);
router.delete('/:id', rbac('employee', 'manager'), goalsController.deleteGoal);
router.post('/sheet/:sheetId/submit', rbac('employee'), validate(schemas.submitGoalSheet), goalsController.submitGoalSheet);
router.post('/shared', rbac('manager', 'admin'), validate(schemas.pushSharedGoal), goalsController.pushSharedGoal);

export default router;
