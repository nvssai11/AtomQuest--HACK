/**
 * @module errorHandler
 * @description Global error handling middleware — the last line of defence.
 *
 * Pattern: Centralised error handling from "Node.js Design Patterns" (Casciaro).
 * All errors funnel here, ensuring a single, consistent error response shape
 * regardless of where in the application the error originated.
 *
 * Response shape (always):
 * {
 *   "success": false,
 *   "error": {
 *     "code": "MACHINE_READABLE_CODE",
 *     "message": "Human-readable description"
 *   }
 * }
 *
 * Why a consistent shape? API consumers (the frontend) can always branch on
 * `error.code` without fragile string parsing on `message`.
 *
 * Operational vs Programmer errors (from "Node.js Best Practices"):
 *   - Operational (AppError): expected, safe to return to client
 *   - Programmer errors: unexpected, we expose a generic message to avoid
 *     leaking implementation details (stack traces, db schemas, etc.)
 */

import { AppError } from '../errors/AppError.js';
import config from '../config.js';

/**
 * Handles Joi validation errors from the `validate` middleware.
 * @param {import('joi').ValidationError} err
 * @returns {{statusCode: number, code: string, message: string}}
 */
function handleJoiValidationError(err) {
  const message = err.details.map((d) => d.message).join('; ');
  return { statusCode: 422, code: 'VALIDATION_ERROR', message };
}

/**
 * Handles JWT errors from jsonwebtoken library.
 * @param {Error} err
 * @returns {{statusCode: number, code: string, message: string}}
 */
function handleJwtError(err) {
  if (err.name === 'JsonWebTokenError') {
    return { statusCode: 401, code: 'INVALID_TOKEN', message: 'Invalid authentication token' };
  }
  if (err.name === 'TokenExpiredError') {
    return { statusCode: 401, code: 'TOKEN_EXPIRED', message: 'Authentication token has expired' };
  }
  return null;
}

/**
 * Express global error handler. Must have exactly 4 parameters for Express
 * to recognise it as an error-handling middleware.
 *
 * @param {Error} err - The error object
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next - Must be declared even if unused
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Attempt to identify the error type and build a structured response
  let statusCode = err.statusCode ?? 500;
  let code = err.code ?? 'INTERNAL_ERROR';
  let message = err.message ?? 'An unexpected error occurred';

  // Joi validation errors (from validate middleware)
  if (err.isJoi) {
    ({ statusCode, code, message } = handleJoiValidationError(err));
  }

  // JWT errors
  const jwtError = handleJwtError(err);
  if (jwtError) {
    ({ statusCode, code, message } = jwtError);
  }

  // For non-operational (programmer) errors, hide internal details in production
  if (err instanceof AppError === false && !err.isJoi && !jwtError) {
    if (config.isProduction) {
      message = 'An unexpected error occurred. Please try again later.';
      code = 'INTERNAL_ERROR';
    }
    // Log the full error for debugging (in production this would go to a log aggregator)
    // eslint-disable-next-line no-console
    console.error('[UNHANDLED ERROR]', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
};

export default errorHandler;
