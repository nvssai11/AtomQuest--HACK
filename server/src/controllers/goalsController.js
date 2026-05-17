/**
 * @module goalsController
 * @description Controllers for Goals and Goal Sheets.
 */

import goalsService from '../services/goalsService.js';

const goalsController = {
  /**
   * Get goals for the authenticated employee
   */
  getMyGoals(req, res, next) {
    try {
      const data = goalsService.getGoalsForEmployee(req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  getShareRecipients(req, res, next) {
    try {
      const data = goalsService.getShareRecipients(req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Create a new goal for the authenticated employee
   */
  createGoal(req, res, next) {
    try {
      const data = goalsService.createGoal(req.user, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Update an existing goal
   */
  updateGoal(req, res, next) {
    try {
      const { id } = req.params;
      const data = goalsService.updateGoal(id, req.body, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Delete a goal
   */
  deleteGoal(req, res, next) {
    try {
      const { id } = req.params;
      goalsService.deleteGoal(id, req.user);
      res.status(204).send(); // No content
    } catch (error) {
      next(error);
    }
  },

  /**
   * Submit goal sheet for manager approval
   */
  submitGoalSheet(req, res, next) {
    try {
      const { sheetId } = req.params;
      const data = goalsService.submitGoalSheet(sheetId, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  pushSharedGoal(req, res, next) {
    try {
      const data = goalsService.pushSharedGoal(req.user, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};

export default goalsController;
