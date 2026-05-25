'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

/**
 * SQLite-backed user store.
 *
 * Implements the SAME async interface as the in-memory `UserStore`
 * (`findByEmail`, `create`) so it is a drop-in replacement injectable via
 * `createApp({ store })`. The route/app code does not change.
 *
 * better-sqlite3 is synchronous under the hood; we keep the methods `async`
 * to honor the store contract (a Postgres/Mongo store would be truly async).
 *
 * Uniqueness is enforced at the DB level via a UNIQUE index on lowercased
 * email, so the create-race guard in the route stays meaningful.
 */
class SqliteUserStore {
  /**
   * @param {string} [filename] path to the .sqlite file, or ':memory:'.
   *   Defaults to `data/users.sqlite` under the project root.
   */
  constructor(filename) {
    const file =
      filename || path.join(__dirname, '..', 'data', 'users.sqlite');
    // better-sqlite3 creates the DB file but not its parent directory, so
    // ensure it exists first. Skip for the special in-memory database.
    if (file !== ':memory:') {
      fs.mkdirSync(path.dirname(file), { recursive: true });
    }
    this.db = new Database(file);
    this.db.pragma('journal_mode = WAL');
    this._initSchema();
  }

  _initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        email        TEXT NOT NULL,
        email_lower  TEXT NOT NULL UNIQUE,
        name         TEXT,
        passwordHash TEXT NOT NULL,
        createdAt    TEXT NOT NULL
      );
    `);
  }

  /**
   * Find a user by email (case-insensitive).
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    const key = String(email).toLowerCase();
    const row = this.db
      .prepare('SELECT id, email, name, passwordHash, createdAt FROM users WHERE email_lower = ?')
      .get(key);
    return row || null;
  }

  /**
   * Create a user record. Caller hashes the password. Uniqueness is enforced
   * by the DB; on conflict we throw an error tagged EMAIL_TAKEN to match the
   * in-memory store contract.
   * @param {{ email: string, passwordHash: string, name?: string }} data
   * @returns {Promise<object>}
   */
  async create({ email, passwordHash, name }) {
    const key = String(email).toLowerCase();
    const now = new Date().toISOString();
    try {
      const info = this.db
        .prepare(
          'INSERT INTO users (email, email_lower, name, passwordHash, createdAt) VALUES (?, ?, ?, ?, ?)'
        )
        .run(email, key, name || null, passwordHash, now);
      return {
        id: Number(info.lastInsertRowid),
        email,
        name: name || null,
        passwordHash,
        createdAt: now,
      };
    } catch (err) {
      if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        const e = new Error('Email already registered');
        e.code = 'EMAIL_TAKEN';
        throw e;
      }
      throw err;
    }
  }

  /** Test/utility helper: wipe all data. */
  async _reset() {
    this.db.exec('DELETE FROM users');
  }

  /** Close the underlying DB handle. */
  close() {
    this.db.close();
  }
}

module.exports = { SqliteUserStore };
