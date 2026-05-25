'use strict';

const express = require('express');
const { UserStore } = require('./store');
const { createRegisterRouter } = require('./routes/register');

/**
 * Create an Express app. A store can be injected (useful for tests); if none
 * is provided, a fresh in-memory store is created.
 *
 * The app is returned WITHOUT calling listen() so supertest can drive it
 * without binding a port. See server.js for the actual process entrypoint.
 *
 * @param {{ store?: object }} [opts]
 */
function createApp(opts = {}) {
  const store = opts.store || new UserStore();

  const app = express();
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/', createRegisterRouter(store));

  // Body-parser errors (e.g. malformed JSON) -> 400
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    // Fallback error handler
    // eslint-disable-next-line no-console
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  });

  app.store = store;
  return app;
}

module.exports = { createApp };
