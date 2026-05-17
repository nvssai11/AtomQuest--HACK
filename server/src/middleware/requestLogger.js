/**
 * @module requestLogger
 * @description Structured HTTP request logger middleware.
 *
 * In development: uses morgan's 'dev' format for coloured, concise output.
 * In production/test: uses 'combined' Apache-style format for log aggregation.
 *
 * Principle: Observability — "Design for Operations" from Site Reliability Engineering.
 * Every request should leave a trace so failures can be diagnosed without a debugger.
 */

import morgan from 'morgan';
import config from '../config.js';

/**
 * Returns the appropriate morgan middleware based on the current environment.
 * @returns {import('express').RequestHandler}
 */
const requestLogger = morgan(config.isDevelopment ? 'dev' : 'combined', {
  // Skip logging in test environment to keep test output clean
  skip: () => config.isTest,
});

export default requestLogger;
