'use strict';

const request = require('supertest');
const { createApp } = require('../src/app');
const { UserStore } = require('../src/store');

describe('CORS', () => {
  test('reflects allowed origin when a specific allowlist is configured', async () => {
    const app = createApp({ store: new UserStore(), corsOrigin: 'https://app.example.com' });
    const res = await request(app)
      .get('/health')
      .set('Origin', 'https://app.example.com');
    expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com');
  });

  test("sends wildcard header when origin is '*'", async () => {
    const app = createApp({ store: new UserStore(), corsOrigin: '*' });
    const res = await request(app).get('/health').set('Origin', 'https://anything.example');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});

describe('Rate limiting', () => {
  // Build an app with rate limiting on; jest sets the limiter via config
  // defaults (register max = 10). We blow past it on /register.
  test('returns 429 after exceeding the /register limit', async () => {
    const app = createApp({ store: new UserStore(), enableRateLimit: true });
    let last;
    for (let i = 0; i < 12; i++) {
      // Use validation-failing bodies so we never depend on DB state; the
      // limiter runs before the handler regardless of outcome.
      // eslint-disable-next-line no-await-in-loop
      last = await request(app).post('/register').send({});
    }
    expect(last.status).toBe(429);
    expect(last.body.error).toMatch(/too many requests/i);
  });

  test('does NOT rate limit when disabled (default)', async () => {
    const app = createApp({ store: new UserStore() }); // enableRateLimit defaults false
    let last;
    for (let i = 0; i < 25; i++) {
      // eslint-disable-next-line no-await-in-loop
      last = await request(app).post('/login').send({});
    }
    expect(last.status).not.toBe(429);
  });
});
