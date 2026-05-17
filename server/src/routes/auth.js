import { Router } from 'express';
import authController from '../controllers/authController.js';
import { validate, schemas } from '../middleware/validate.js';
import authenticate from '../middleware/auth.js';

const router = Router();

// Public routes
router.post('/login', validate(schemas.login), authController.login);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getMe);

export default router;
