/**
 * @module adminController
 * @description Controllers for Admin/HR governance.
 */

import adminService from '../services/adminService.js';
import escalationService from '../services/escalation.js';
import reportsService from '../services/reportsService.js';
import cycleRepository from '../repository/cycleRepository.js';

const adminController = {
  /**
   * Unlock an approved goal
   */
  unlockGoal(req, res, next) {
    try {
      const { goalId } = req.params;
      const { reason } = req.body;
      const data = adminService.unlockGoal(goalId, reason, req.user);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Progress the cycle phase
   */
  updateCyclePhase(req, res, next) {
    try {
      const { phase } = req.body;
      const data = adminService.updateCyclePhase(phase);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Run the escalation engine manually (for hackathon demo)
   */
  triggerEscalation(req, res, next) {
    try {
      const count = escalationService.runEscalationEngine();
      res.status(200).json({ success: true, message: `Created ${count} new escalations.` });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get escalation logs
   */
  getEscalations(req, res, next) {
    try {
      const data = escalationService.getEscalationLogs();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Download the quarterly achievement report as CSV
   */
  downloadReport(req, res, next) {
    try {
      const { quarter } = req.query;
      if (!quarter) throw new Error('Quarter is required (e.g. ?quarter=Q1)');
      
      const reportData = reportsService.generateAchievementReport(quarter);
      const csv = reportsService.exportToCSV(reportData);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="achievement-report-${quarter}.csv"`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get the organizational hierarchy tree
   */
  getOrgHierarchy(req, res, next) {
    try {
      const data = adminService.getOrgHierarchy();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },

  getCompletionDashboard(req, res, next) {
    try {
      const { quarter } = req.query;
      if (!quarter) throw new Error('Quarter is required (e.g. ?quarter=Q1)');
      const cycle = cycleRepository.findActiveCycle();
      if (!cycle) throw new Error('No active cycle');
      const data = reportsService.getCompletionDashboard(cycle.id, quarter);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  },
};

export default adminController;
