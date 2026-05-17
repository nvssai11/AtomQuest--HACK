/**
 * @module config
 * @description Centralised application configuration following the 12-Factor App
 * methodology (https://12factor.net/config). All configuration is derived from
 * environment variables with safe, development-friendly defaults. No secrets
 * are ever hardcoded here.
 *
 * Principle: "Store config in the environment" — 12-Factor App, Factor III
 *
 * Usage:
 *   import config from './config.js';
 *   const port = config.server.port;
 */

const config = {
  server: {
    /** Port the Express server listens on */
    port: parseInt(process.env.PORT ?? '4000', 10),
    /** Allowed CORS origins (comma-separated in env) */
    corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
    /** Node environment */
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },

  auth: {
    /** JWT signing secret — MUST be overridden in production via env var */
    jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production-min-32-chars!!',
    /** Access token lifetime (short-lived for security) */
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    /** Refresh token lifetime */
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES ?? '7d',
    /** bcrypt salt rounds — higher = more secure, slower. 12 is OWASP recommended */
    bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
  },

  rateLimit: {
    /** Rate limit window in milliseconds (15 minutes) */
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? `${15 * 60 * 1000}`, 10),
    /** Max requests per window per IP on auth endpoints */
    authMaxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX ?? '10', 10),
    /** Max requests per window per IP on general endpoints */
    apiMaxRequests: parseInt(process.env.RATE_LIMIT_API_MAX ?? '200', 10),
  },

  email: {
    /** SMTP host for Nodemailer */
    smtpHost: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    smtpPort: parseInt(process.env.SMTP_PORT ?? '587', 10),
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPass: process.env.SMTP_PASS ?? '',
    fromAddress: process.env.EMAIL_FROM ?? 'noreply@atomquest.com',
    /** If true, emails are logged to console instead of sent — safe for dev/demo */
    simulateOnly: process.env.EMAIL_SIMULATE === 'true' || !process.env.SMTP_USER,
  },

  /** Derived helpers */
  get isDevelopment() {
    return this.server.nodeEnv === 'development';
  },
  get isProduction() {
    return this.server.nodeEnv === 'production';
  },
  get isTest() {
    return this.server.nodeEnv === 'test';
  },
};

export default config;
