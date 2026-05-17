/**
 * @module auth
 * @description JWT authentication middleware.
 *
 * Responsibility: Extract, verify, and decode the JWT from the Authorization
 * header, then attach the decoded user payload to `req.user`.
 *
 * This middleware only verifies identity ("who are you?").
 * Authorisation ("are you allowed?") is handled separately by `rbac.js`.
 * This separation follows the Single Responsibility Principle (Clean Code, Ch. 3).
 *
 * Expected header format: `Authorization: Bearer <token>`
 */

import jwt from 'jsonwebtoken';
import config from '../config.js';
import { AppError } from '../errors/AppError.js';

/**
 * Middleware that verifies the JWT and attaches `req.user`.
 * Throws 401 if no token is provided or the token is invalid/expired.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('No authentication token provided'));
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  // jwt.verify throws on invalid/expired tokens — errorHandler normalises these
  const decoded = jwt.verify(token, config.auth.jwtSecret);

  /**
   * Attach only the minimal user context to the request.
   * We do NOT attach the full user object here — services fetch fresh data
   * from the repository when they need it. This avoids stale data issues.
   *
   * Pattern: "Don't trust the token blindly for business data" —
   * only use it for identity and role. Fetch authoritative data from the store.
   */
  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    name: decoded.name,
  };

  return next();
};

export default authenticate;
