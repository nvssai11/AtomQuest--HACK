/**
 * @module rbac
 * @description Role-Based Access Control (RBAC) middleware factory.
 *
 * This is a middleware *factory* — it returns a middleware function configured
 * for a specific set of allowed roles. This pattern (currying for middleware)
 * is idiomatic Express and keeps route definitions readable:
 *
 *   router.put('/goals/:id/approve', authenticate, rbac('manager', 'admin'), ...)
 *
 * Separation of concerns:
 *   - `authenticate` answers: "Who are you?" (identity)
 *   - `rbac(...)` answers:    "Are you allowed?" (authorisation)
 *
 * This is the Principle of Least Privilege in practice — each route explicitly
 * declares the minimum roles that may access it.
 *
 * Reference: "Designing Data-Intensive Applications" Ch. 12 — access control
 * should be enforced at the boundary, not deep in business logic.
 */

import { AppError } from '../errors/AppError.js';

/**
 * Creates an RBAC middleware that allows only the specified roles.
 *
 * MUST be used after the `authenticate` middleware, since it depends on `req.user`.
 *
 * @param {...('employee'|'manager'|'admin')} allowedRoles - Roles permitted to proceed
 * @returns {import('express').RequestHandler}
 *
 * @example
 * // Only managers and admins can approve goals
 * router.put('/approval/:id/approve', authenticate, rbac('manager', 'admin'), controller);
 */
const rbac = (...allowedRoles) => {
  if (allowedRoles.length === 0) {
    throw new Error('rbac() requires at least one role argument');
  }

  return (req, res, next) => {
    // Guard: authenticate must run before rbac
    if (!req.user) {
      return next(AppError.unauthorized('Authentication required before authorisation check'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        AppError.forbidden(
          `Access denied. Required role: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`
        )
      );
    }

    return next();
  };
};

export default rbac;
