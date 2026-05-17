/**
 * @module approvalController
 * @description Controllers for Managers to review and approve Goal Sheets.
 */

import approvalService from '../services/approvalService.js';

const approvalController = {
  getPendingApprovals(req, res, next) {
    try {
      const data = approvalService.getPendingApprovals(req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  getSheetForReview(req, res, next) {
    try {
      const { sheetId } = req.params;
      const data = approvalService.getSheetForReview(sheetId, req.user.id);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  approveSheet(req, res, next) {
    try {
      const { sheetId } = req.params;
      const data = approvalService.approveSheet(sheetId, req.user.id, req.body?.edits || []);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  returnSheet(req, res, next) {
    try {
      const { sheetId } = req.params;
      const { comment } = req.body;
      const data = approvalService.returnSheet(sheetId, req.user.id, comment);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};

export default approvalController;
