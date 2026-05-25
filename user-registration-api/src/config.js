'use strict';

/**
 * Centralized configuration, read from the environment with safe dev defaults.
 *
 * SECURITY: JWT_SECRET has a dev-only default so the app boots locally without
 * setup. It is NEVER logged. In any real deployment you MUST set JWT_SECRET to
 * a long random value; otherwise tokens are forgeable.
 */

const DEV_JWT_SECRET = 'dev-only-insecure-secret-change-me';

const config = {
  // Auth
  jwtSecret: process.env.JWT_SECRET || DEV_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  usingDefaultJwtSecret: !process.env.JWT_SECRET,

  // CORS — comma-separated allowlist. '*' allows any origin (default for dev).
  corsOrigin: process.env.CORS_ORIGIN || '*',

  // Rate limiting (per IP, per window)
  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
    register: Number(process.env.RATE_LIMIT_REGISTER_MAX) || 10,
    login: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 20,
  },
};

module.exports = { config, DEV_JWT_SECRET };
