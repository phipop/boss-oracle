'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { UserStore } = require('../src/store');
const { config } = require('../src/config');

const GOOD_PASSWORD = 'Sup3rSecret!';

describe('POST /login', () => {
  let app;
  let store;

  beforeEach(async () => {
    store = new UserStore();
    app = createApp({ store });
    // Seed a user via the real registration path so the hash is genuine.
    await request(app)
      .post('/register')
      .send({ email: 'alice@example.com', password: GOOD_PASSWORD, name: 'Alice' });
  });

  test('200: valid credentials return a verifiable JWT', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'alice@example.com', password: GOOD_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');

    const decoded = jwt.verify(res.body.token, config.jwtSecret);
    expect(decoded.email).toBe('alice@example.com');
    expect(decoded.sub).toEqual(expect.any(Number));
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  test('200: email match is case-insensitive', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'ALICE@example.com', password: GOOD_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('401: wrong password', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'alice@example.com', password: 'WrongPass1!' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
    expect(res.body).not.toHaveProperty('token');
  });

  test('401: unknown email (no user enumeration)', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'nobody@example.com', password: GOOD_PASSWORD });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  test('400: missing password', async () => {
    const res = await request(app).post('/login').send({ email: 'alice@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('password is required');
  });

  test('400: missing email', async () => {
    const res = await request(app).post('/login').send({ password: GOOD_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('email is required');
  });

  test('400: invalid email format', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'not-an-email', password: GOOD_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('email must be a valid email address');
  });

  test('400: malformed JSON body', async () => {
    const res = await request(app)
      .post('/login')
      .set('Content-Type', 'application/json')
      .send('{ not json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid JSON body');
  });
});
