import { Router } from 'express';
import cycleController from '../controllers/cycleController.js';
import authenticate from '../middleware/auth.js';

const router = Router();

router.get('/current', authenticate, cycleController.getCurrent);

export default router;
