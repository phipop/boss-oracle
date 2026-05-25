'use strict';

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { UserStore } = require('./store');
const { config } = require('./config');
const { createRegisterRouter } = require('./routes/register');
const { createLoginRouter } = require('./routes/login');

/**
 * Create an Express app. A store can be injected (useful for tests); if none
 * is provided, a fresh in-memory store is created.
 *
 * The app is returned WITHOUT calling listen() so supertest can drive it
 * without binding a port. See server.js for the actual process entrypoint.
 *
 * @param {{
 *   store?: object,
 *   enableRateLimit?: boolean,   // default false so unit tests are deterministic
 *   corsOrigin?: string|string[] // overrides config.corsOrigin
 * }} [opts]
 */
function createApp(opts = {}) {
  const store = opts.store || new UserStore();
  const enableRateLimit = opts.enableRateLimit === true;

  const app = express();

  // Behind a proxy/load balancer, trust X-Forwarded-For so rate limiting keys
  // on the real client IP. Limited to 1 hop to avoid spoofing.
  app.set('trust proxy', 1);

  // CORS — configurable allowlist; '*' allows any origin.
  const origin =
    opts.corsOrigin !== undefined ? opts.corsOrigin : parseCorsOrigin(config.corsOrigin);
  app.use(cors({ origin }));

  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  // Rate limiters (per IP, per window). Off by default for tests; server.js
  // turns them on. Standardized RateLimit-* headers, legacy headers off.
  if (enableRateLimit) {
    const registerLimiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.register,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later' },
    });
    const loginLimiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.login,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later' },
    });
    app.use('/register', registerLimiter);
    app.use('/login', loginLimiter);
  }

  app.use('/', createRegisterRouter(store));
  app.use('/', createLoginRouter(store));

  // Body-parser errors (e.g. malformed JSON) -> 400
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    if (err && err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body too large' });
    }
    // Fallback error handler
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  app.store = store;
  return app;
}

/**
 * Turn the CORS_ORIGIN env string into a value the `cors` package accepts:
 * '*' -> '*', otherwise a comma-separated allowlist -> array of origins.
 * @param {string} raw
 */
function parseCorsOrigin(raw) {
  if (!raw || raw === '*') return '*';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0] : list;
}

module.exports = { createApp, parseCorsOrigin };
