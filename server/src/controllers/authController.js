/**
 * @module authController
 * @description Controllers for authentication routes.
 * 
 * Controllers only handle HTTP concerns (req/res, headers, status codes).
 * Business logic lives in the services layer.
 */

import authService from '../services/authService.js';

const authController = {
  /**
   * Handle user login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      const { token, user } = await authService.login(email, password);
      
      res.status(200).json({
        success: true,
        data: {
          token,
          user
        }
      });
    } catch (error) {
      next(error); // Pass to global error handler
    }
  },

  /**
   * Handle user logout (stateless JWT so we just tell client to drop it)
   */
  async logout(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get current authenticated user profile
   */
  async getMe(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: req.user
      });
    } catch (error) {
      next(error);
    }
  }
};

export default authController;
