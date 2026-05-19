import { Router } from 'express';
import cycleController from '../controllers/cycleController.js';
import authenticate from '../middleware/auth.js';
import apicache from 'apicache';

const router = Router();
const cache = apicache.middleware;

router.get('/current', authenticate, cache('5 minutes'), cycleController.getCurrent);

export default router;
