import { Router } from 'express';
import checkinsController from '../controllers/checkinsController.js';
import { validate, schemas } from '../middleware/validate.js';
import authenticate from '../middleware/auth.js';
import rbac from '../middleware/rbac.js';

const router = Router();

router.use(authenticate);

router.post('/', rbac('employee'), validate(schemas.submitCheckIn), checkinsController.submitCheckIn);
router.get('/team', rbac('manager'), checkinsController.getTeamCheckIns);
router.post('/:checkinId/comment', rbac('manager'), validate(schemas.addCheckInComment), checkinsController.addManagerComment);
router.get('/sheet/:sheetId', rbac('manager', 'admin'), checkinsController.getCheckInsForSheet);

export default router;
