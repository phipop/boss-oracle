'use strict';

const { createApp } = require('./app');
const { SqliteUserStore } = require('./sqlite-store');
const { config } = require('./config');

const PORT = process.env.PORT || 3000;

// Warn (without printing the secret) if running with the insecure default.
if (config.usingDefaultJwtSecret) {
  // eslint-disable-next-line no-console
  console.warn(
    '[WARN] JWT_SECRET is not set — using an insecure dev default. Set JWT_SECRET in production.'
  );
}

// Production/dev process uses the real SQLite store (schema auto-inits on
// construction). Tests inject the fast in-memory store instead.
// Override the DB file with SQLITE_FILE (e.g. ':memory:').
const store = new SqliteUserStore(process.env.SQLITE_FILE || undefined);

const app = createApp({ store, enableRateLimit: true });

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`user-registration-api listening on http://localhost:${PORT}`);
});

// Clean shutdown so the SQLite handle is released.
function shutdown() {
  server.close(() => {
    try {
      store.close();
    } catch (_) {
      /* ignore */
    }
    process.exit(0);
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
