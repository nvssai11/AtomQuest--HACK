import express from 'express';
import authenticate from '../middleware/auth.js';
import store from '../store/inMemoryStore.js';

const router = express.Router();

// Retrieve notifications for the current authenticated user
router.get('/', authenticate, (req, res, next) => {
  try {
    const userNotifications = store.notifications
      .filter(n => n.userId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
    res.json({ success: true, data: userNotifications });
  } catch (error) {
    next(error);
  }
});

// Clear all notifications for the current authenticated user
router.post('/clear', authenticate, (req, res, next) => {
  try {
    store.notifications = store.notifications.filter(n => n.userId !== req.user.id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
});

export default router;
