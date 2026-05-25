'use strict';

const request = require('supertest');
const bcrypt = require('bcryptjs');
const { createApp } = require('../src/app');
const { SqliteUserStore } = require('../src/sqlite-store');

// Integration coverage for the real SQLite store. Uses an in-memory SQLite
// database (':memory:') so it stays fast and leaves no files behind, while
// still exercising the actual better-sqlite3 driver + schema + UNIQUE index.
describe('SqliteUserStore (integration)', () => {
  let app;
  let store;

  beforeEach(() => {
    store = new SqliteUserStore(':memory:');
    app = createApp({ store });
  });

  afterEach(() => {
    store.close();
  });

  test('implements the store contract: create + findByEmail', async () => {
    const created = await store.create({
      email: 'Sql@Example.com',
      passwordHash: 'hash',
      name: 'Sql',
    });
    expect(created).toMatchObject({
      id: expect.any(Number),
      email: 'Sql@Example.com',
      name: 'Sql',
      passwordHash: 'hash',
      createdAt: expect.any(String),
    });

    // case-insensitive lookup
    const found = await store.findByEmail('sql@example.com');
    expect(found.id).toBe(created.id);
    expect(found.passwordHash).toBe('hash');

    expect(await store.findByEmail('missing@example.com')).toBeNull();
  });

  test('enforces unique email at the DB level (EMAIL_TAKEN)', async () => {
    await store.create({ email: 'dup@example.com', passwordHash: 'h', name: null });
    await expect(
      store.create({ email: 'DUP@example.com', passwordHash: 'h2', name: null })
    ).rejects.toMatchObject({ code: 'EMAIL_TAKEN' });
  });

  test('register flow persists through the real store', async () => {
    const res = await request(app)
      .post('/register')
      .send({ email: 'persist@example.com', password: 'Sup3rSecret!', name: 'P' });
    expect(res.status).toBe(201);

    const stored = await store.findByEmail('persist@example.com');
    expect(stored).not.toBeNull();
    expect(await bcrypt.compare('Sup3rSecret!', stored.passwordHash)).toBe(true);
  });
});
