/**
 * @module validate
 * @description Request validation middleware factory using Joi schemas.
 *
 * Principle: "Validate at the boundary" — The Pragmatic Programmer (Hunt & Thomas).
 * Input validation runs *before* controllers, so business logic never receives
 * malformed data. This is the "Fail Fast" principle — reject bad input immediately
 * rather than letting it propagate through the system and cause confusing errors.
 *
 * Why Joi?
 *   Joi provides declarative, composable schemas with rich error messages.
 *   Schemas are defined alongside routes (co-location) making it easy to see
 *   exactly what each endpoint expects.
 *
 * Usage:
 *   import { validate, schemas } from '../middleware/validate.js';
 *   router.post('/goals', authenticate, validate(schemas.createGoal), controller);
 */

import Joi from 'joi';
import { AppError } from '../errors/AppError.js';

const goalTargetSchema = Joi.alternatives().conditional('uom', {
  switch: [
    {
      is: 'timeline',
      then: Joi.string().isoDate().required().messages({
        'string.isoDate': 'Target for Timeline UoM must be a valid ISO date (YYYY-MM-DD)',
      }),
    },
    {
      is: 'zero',
      then: Joi.number().valid(0).required().messages({
        'any.only': 'Target for Zero-based UoM must be 0',
      }),
    },
    {
      is: Joi.valid('percent-min', 'percent-max'),
      then: Joi.number().min(0).max(100).required().messages({
        'number.max': 'Percentage target must be between 0 and 100',
      }),
    },
  ],
  otherwise: Joi.number().positive().required(),
});

/**
 * Validation targets within an Express request
 * @typedef {'body'|'params'|'query'} ValidationTarget
 */

/**
 * Creates a validation middleware for a given Joi schema.
 * Validates `req.body` by default; pass a target to validate params or query.
 *
 * @param {Joi.Schema} schema - The Joi schema to validate against
 * @param {ValidationTarget} [target='body'] - Which part of the request to validate
 * @returns {import('express').RequestHandler}
 */
export const validate = (schema, target = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[target], {
    abortEarly: false, // Collect ALL errors, not just the first one
    stripUnknown: true, // Remove fields not in schema (prevents parameter pollution)
    convert: true, // Coerce types where safe (e.g., "100" -> 100 for numbers)
  });

  if (error) {
    const message = error.details.map((d) => d.message.replace(/['"]/g, '')).join('; ');
    return next(AppError.unprocessable(message, 'VALIDATION_ERROR'));
  }

  // Replace req[target] with the validated + sanitised value
  req[target] = value;
  return next();
};

/**
 * Joi schemas for all API endpoints.
 * Co-located here so validation rules are easy to find and review.
 *
 * Naming convention: <verb><Resource> — e.g., createGoal, updateCheckIn
 */
export const schemas = {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  login: Joi.object({
    email: Joi.string().email().lowercase().trim().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(6).required().messages({
      'any.required': 'Password is required',
    }),
  }),

  // ─── Goals ────────────────────────────────────────────────────────────────
  createGoal: Joi.object({
    thrustArea: Joi.string().trim().min(2).max(100).required(),
    title: Joi.string().trim().min(5).max(200).required(),
    description: Joi.string().trim().min(10).max(1000).required(),
    uom: Joi.string().valid('numeric-min', 'numeric-max', 'percent-min', 'percent-max', 'timeline', 'zero').required(),
    target: goalTargetSchema,
    weightage: Joi.number().min(10).max(100).required().messages({
      'number.min': 'Minimum weightage per goal is 10%',
    }),
    isShared: Joi.boolean().default(false),
  }),

  updateGoal: Joi.object({
    thrustArea: Joi.string().trim().min(2).max(100),
    title: Joi.string().trim().min(5).max(200),
    description: Joi.string().trim().min(10).max(1000),
    uom: Joi.string().valid('numeric-min', 'numeric-max', 'percent-min', 'percent-max', 'timeline', 'zero'),
    target: Joi.alternatives().try(Joi.number().min(0), Joi.string().isoDate()),
    weightage: Joi.number().min(10).max(100),
  }).min(1), // At least one field required

  updateSharedGoalWeightage: Joi.object({
    weightage: Joi.number().min(10).max(100).required(),
  }),

  pushSharedGoal: Joi.object({
    title: Joi.string().trim().min(5).max(200).required(),
    description: Joi.string().trim().min(10).max(1000).required(),
    thrustArea: Joi.string().trim().min(2).max(100).required(),
    uom: Joi.string().valid('numeric-min', 'numeric-max', 'percent-min', 'percent-max', 'timeline', 'zero').required(),
    target: goalTargetSchema,
    targetUnit: Joi.string().trim().max(50).optional(),
    weightage: Joi.number().min(10).max(100).required(),
    recipientIds: Joi.array().items(Joi.string()).min(1).required(),
  }),

  submitGoalSheet: Joi.object({
    // No body needed — submission is a state transition triggered by goalSheetId in params
  }),

  approvalAction: Joi.object({
    // Manager may edit goals inline before approving
    edits: Joi.array().items(
      Joi.object({
        goalId: Joi.string().required(),
        target: Joi.alternatives().try(Joi.number().min(0), Joi.string().isoDate()),
        weightage: Joi.number().min(10).max(100),
      }).or('target', 'weightage')
    ).default([]),
  }),

  returnGoalSheet: Joi.object({
    comment: Joi.string().trim().min(10).max(500).required().messages({
      'any.required': 'A comment is required when returning goals for rework',
    }),
  }),

  // ─── Check-ins ────────────────────────────────────────────────────────────
  submitCheckIn: Joi.object({
    quarter: Joi.string().valid('Q1', 'Q2', 'Q3', 'Q4').required(),
    entries: Joi.array().items(
      Joi.object({
        goalId: Joi.string().required(),
        actualAchievement: Joi.alternatives()
          .try(Joi.number().min(0), Joi.string().isoDate())
          .required(),
        status: Joi.string().valid('not-started', 'on-track', 'completed').required(),
      })
    ).min(1).required(),
  }),

  addCheckInComment: Joi.object({
    comment: Joi.string().trim().min(10).max(1000).required().messages({
      'string.min': 'Check-in comment must be at least 10 characters',
    }),
  }),

  // ─── Admin ────────────────────────────────────────────────────────────────
  updateCyclePhase: Joi.object({
    phase: Joi.string().valid('goal-setting', 'Q1', 'Q2', 'Q3', 'Q4', 'closed').required(),
  }),

  unlockGoal: Joi.object({
    reason: Joi.string().trim().min(20).max(500).required().messages({
      'string.min': 'Unlock reason must be at least 20 characters for audit purposes',
    }),
  }),

  escalationRule: Joi.object({
    triggerType: Joi.string()
      .valid('submission-overdue', 'approval-overdue', 'checkin-overdue')
      .required(),
    thresholdDays: Joi.number().integer().min(1).max(90).required(),
    isActive: Joi.boolean().default(true),
  }),

  // ─── Self-Assessment (before manager check-in) ────────────────────────────
  selfAssessment: Joi.object({
    quarter: Joi.string().valid('Q1', 'Q2', 'Q3', 'Q4').required(),
    entries: Joi.array().items(
      Joi.object({
        goalId: Joi.string().uuid().required(),
        selfScore: Joi.number().min(0).max(100).required(),
        reflection: Joi.string().trim().min(10).max(500).required(),
        blockers: Joi.string().trim().max(500).allow('').optional(),
      })
    ).min(1).required(),
  }),
};
