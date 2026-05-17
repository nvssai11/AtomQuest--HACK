import { Router } from 'express';
import approvalController from '../controllers/approvalController.js';
import authenticate from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';
import { validate, schemas } from '../middleware/validate.js';

const router = Router();

// All approval routes require authentication and Manager role
router.use(authenticate, rbac('manager'));

// View pending approvals
router.get('/pending', approvalController.getPendingApprovals);

// Review a specific sheet (goals included)
router.get('/:sheetId', approvalController.getSheetForReview);

// Approve a sheet
router.post('/:sheetId/approve', validate(schemas.approvalAction), approvalController.approveSheet);

// Return a sheet for revision
router.post('/:sheetId/return', validate(schemas.returnGoalSheet), approvalController.returnSheet);

export default router;
