/**
 * @module analyticsController
 * @description Controllers for Dashboard Analytics (Bonus Feature).
 */

import store from '../store/inMemoryStore.js';

const analyticsController = {
  /**
   * Get organization-wide score distribution (e.g. how many employees scored 90-100%, 80-89%, etc.)
   */
  getScoreDistribution(req, res, next) {
    try {
      const { quarter } = req.query; // 'Q1', 'Q2', etc.
      
      const distribution = {
        '90-100%': 0,
        '80-89%': 0,
        '70-79%': 0,
        'Below 70%': 0
      };

      for (const checkIn of store.checkIns.values()) {
        if (quarter && checkIn.quarter !== quarter) continue;

        // Calculate average score for this check-in
        if (checkIn.entries.length === 0) continue;
        
        const totalScore = checkIn.entries.reduce((sum, entry) => sum + entry.computedScore, 0);
        const avgScore = totalScore / checkIn.entries.length;

        if (avgScore >= 90) distribution['90-100%']++;
        else if (avgScore >= 80) distribution['80-89%']++;
        else if (avgScore >= 70) distribution['70-79%']++;
        else distribution['Below 70%']++;
      }

      res.status(200).json({ success: true, data: distribution });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get Manager Effectiveness (average score of a manager's direct reports)
   */
  getManagerEffectiveness(req, res, next) {
    try {
      const { quarter } = req.query;

      // Group by manager
      const managerStats = {};

      for (const user of store.users.values()) {
        if (user.role !== 'employee' || !user.managerId) continue;
        const { managerId } = user;
        const userId = user.id;

        if (!managerStats[managerId]) {
          const managerUser = store.users.get(managerId);
          managerStats[managerId] = {
            managerName: managerUser ? managerUser.name : 'Unknown',
            totalScore: 0,
            reportCount: 0,
          };
        }

        const checkIn = Array.from(store.checkIns.values()).find(
          (c) => c.employeeId === userId && (!quarter || c.quarter === quarter)
        );

        if (checkIn && checkIn.entries.length > 0) {
          const totalScore = checkIn.entries.reduce((sum, entry) => sum + (entry.computedScore || 0), 0);
          const avgScore = totalScore / checkIn.entries.length;

          managerStats[managerId].totalScore += avgScore;
          managerStats[managerId].reportCount++;
        }
      }

      // Calculate averages
      const effectiveness = Object.values(managerStats)
        .filter(stat => stat.reportCount > 0)
        .map(stat => ({
          managerName: stat.managerName,
          averageTeamScore: Math.round(stat.totalScore / stat.reportCount)
        }))
        .sort((a, b) => b.averageTeamScore - a.averageTeamScore); // Highest first

      res.status(200).json({ success: true, data: effectiveness });
    } catch (error) {
      next(error);
    }
  }
};

export default analyticsController;
