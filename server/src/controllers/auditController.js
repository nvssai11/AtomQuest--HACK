/**
 * @module auditController
 * @description Read-only audit trail endpoints.
 */

import auditService from '../services/audit.js';

const auditController = {
  getRecentActivity(req, res, next) {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
      const data = auditService.getRecentActivity(limit);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  getFullAuditTrail(req, res, next) {
    try {
      const data = auditService.getFullAuditTrail();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};

export default auditController;
