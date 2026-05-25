'use strict';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { UserStore } = require('../src/store');

describe('POST /register', () => {
  let app;
  let store;

  beforeEach(() => {
    store = new UserStore();
    app = createApp({ store });
  });

  test('201: creates a user and returns it without password/hash', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'alice@example.com', password: 'supersecret', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(Number),
      email: 'alice@example.com',
      name: 'Alice',
      createdAt: expect.any(String),
    });
    // No sensitive fields leaked
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('passwordHash');

    // Stored password is hashed, not plaintext, and verifies with bcrypt
    const stored = await store.findByEmail('alice@example.com');
    expect(stored.passwordHash).toBeDefined();
    expect(stored.passwordHash).not.toBe('supersecret');
    expect(await bcrypt.compare('supersecret', stored.passwordHash)).toBe(true);
  });

  test('201: name is optional (defaults to null)', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'noname@example.com', password: 'longenough' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBeNull();
  });

  test('400: missing email', async () => {
    const res = await request(app).post('/register').send({ password: 'longenough' });
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('email is required');
  });

  test('400: missing password', async () => {
    const res = await request(app).post('/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('password is required');
  });

  test('400: missing both fields', async () => {
    const res = await request(app).post('/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(
      expect.arrayContaining(['email is required', 'password is required'])
    );
  });

  test('400: invalid email format', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'not-an-email', password: 'longenough' });
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('email must be a valid email address');
  });

  test('400: weak (too short) password', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'weak@example.com', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.details).toContain('password must be at least 8 characters');
  });

  test('400: malformed JSON body', async () => {
    const res = await request(app)
      .post('/register')
      .set('Content-Type', 'application/json')
      .send('{ this is not json');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid JSON body');
  });

  test('409: duplicate email (case-insensitive)', async () => {
    await request(app)
      .post('/register')
      .send({ email: 'dup@example.com', password: 'longenough' });

    const res = await request(app)
      .post('/register')
      .send({ email: 'DUP@example.com', password: 'anotherlongpw' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already registered');
  });
});

describe('GET /health', () => {
  test('returns ok', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
