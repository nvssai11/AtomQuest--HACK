/**
 * @module AppError
 * @description Domain-specific error class for structured, predictable error handling.
 *
 * Pattern: "Use domain-specific exceptions" — Clean Code (Robert C. Martin), Ch. 7
 *
 * Instead of throwing generic `new Error('something went wrong')`, every intentional
 * error in this application is an `AppError` with:
 *   - A human-readable `message`
 *   - An HTTP `statusCode` for the response
 *   - A machine-readable `code` for clients to branch on
 *   - An `isOperational` flag to distinguish expected errors (validation, auth)
 *     from unexpected programmer errors (null dereference, etc.)
 *
 * Why `isOperational`?
 *   Inspired by "Node.js Best Practices" — operational errors are recoverable
 *   (wrong password, goal not found). Programmer errors should crash the process
 *   to surface bugs rather than silently continue in a bad state.
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error description
   * @param {number} statusCode - HTTP status code (400, 401, 403, 404, 422, 500)
   * @param {string} code - Machine-readable error code (e.g., 'INVALID_CREDENTIALS')
   * @param {boolean} [isOperational=true] - True = expected domain error; False = bug
   */
  constructor(message, statusCode, code, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Capture stack trace excluding this constructor from the stack
    Error.captureStackTrace(this, this.constructor);
  }

  /** Convenience factory methods — encourage consistency across the codebase */

  static badRequest(message, code = 'BAD_REQUEST') {
    return new AppError(message, 400, code);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'Insufficient permissions', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }

  static notFound(resource = 'Resource', code = 'NOT_FOUND') {
    return new AppError(`${resource} not found`, 404, code);
  }

  static conflict(message, code = 'CONFLICT') {
    return new AppError(message, 409, code);
  }

  static unprocessable(message, code = 'VALIDATION_ERROR') {
    return new AppError(message, 422, code);
  }

  static windowClosed(quarter) {
    return new AppError(
      `The ${quarter} check-in window is not currently open`,
      403,
      'WINDOW_CLOSED'
    );
  }

  static goalLocked(goalId) {
    return new AppError(
      `Goal ${goalId} is locked. Contact Admin to request an unlock.`,
      403,
      'GOAL_LOCKED'
    );
  }
}
