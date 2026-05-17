/**
 * @module cycleController
 * @description Active performance cycle info for all authenticated roles.
 */

import cycleRepository from '../repository/cycleRepository.js';
import checkinWindowService from '../services/checkinWindow.js';

const cycleController = {
  getCurrent(req, res, next) {
    try {
      const cycle = cycleRepository.findActiveCycle();
      const activeQuarter = checkinWindowService.getActiveQuarter();
      res.status(200).json({
        success: true,
        data: {
          cycle,
          activePhase: cycle?.activePhase ?? null,
          activeQuarter,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};

export default cycleController;
