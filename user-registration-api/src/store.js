'use strict';

/**
 * In-memory user store.
 *
 * This is intentionally behind a small, async interface so that swapping it
 * for a real database (Postgres, Mongo, etc.) later only requires
 * reimplementing these methods — the rest of the app does not change.
 */
class UserStore {
  constructor() {
    /** @type {Map<string, object>} keyed by lowercased email */
    this._byEmail = new Map();
    this._seq = 0;
  }

  /**
   * Find a user by email (case-insensitive).
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async findByEmail(email) {
    const key = String(email).toLowerCase();
    return this._byEmail.get(key) || null;
  }

  /**
   * Create a user record. Caller is responsible for hashing the password
   * and for ensuring uniqueness (we still guard here defensively).
   * @param {{ email: string, passwordHash: string, name?: string }} data
   * @returns {Promise<object>} the stored user record (includes passwordHash)
   */
  async create({ email, passwordHash, name }) {
    const key = String(email).toLowerCase();
    if (this._byEmail.has(key)) {
      const err = new Error('Email already registered');
      err.code = 'EMAIL_TAKEN';
      throw err;
    }
    const now = new Date().toISOString();
    const user = {
      id: ++this._seq,
      email,
      name: name || null,
      passwordHash,
      createdAt: now,
    };
    this._byEmail.set(key, user);
    return user;
  }

  /** Test/utility helper: wipe all data. */
  async _reset() {
    this._byEmail.clear();
    this._seq = 0;
  }
}

module.exports = { UserStore };
