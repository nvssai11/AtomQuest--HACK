/**
 * @module checkinsController
 * @description Controllers for Quarterly Check-ins.
 */

import checkinsService from '../services/checkinsService.js';

const checkinsController = {
  /**
   * Submit or update a quarterly check-in (Employee)
   */
  submitCheckIn(req, res, next) {
    try {
      const data = checkinsService.submitCheckIn(req.user, req.body);
      res.status(201).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Add a manager's comment to a check-in
   */
  addManagerComment(req, res, next) {
    try {
      const { checkinId } = req.params;
      const { comment } = req.body;
      const data = checkinsService.addManagerComment(checkinId, comment, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get all check-ins for a specific goal sheet
   */
  getCheckInsForSheet(req, res, next) {
    try {
      const { sheetId } = req.params;
      const data = checkinsService.getCheckInsForSheet(sheetId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  getMyCheckIn(req, res, next) {
    try {
      const quarter = req.query.quarter || 'Q1';
      const data = checkinsService.getMyCheckIn(req.user.id, quarter);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  getTeamCheckIns(req, res, next) {
    try {
      const quarter = req.query.quarter || 'Q1';
      const data = checkinsService.getTeamCheckIns(req.user.id, quarter);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};

export default checkinsController;
