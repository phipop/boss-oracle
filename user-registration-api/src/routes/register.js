'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { validateRegistration } = require('../validation');

const BCRYPT_ROUNDS = 10;

/**
 * Strip sensitive fields before returning a user to the client.
 * @param {object} user
 */
function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt,
  };
}

/**
 * Build the /register router against a given store.
 * @param {{ findByEmail: Function, create: Function }} store
 */
function createRegisterRouter(store) {
  const router = express.Router();

  router.post('/register', async (req, res, next) => {
    try {
      const result = validateRegistration(req.body);
      if (!result.valid) {
        return res.status(400).json({ error: 'Validation failed', details: result.errors });
      }

      const { email, password, name } = result.value;

      const existing = await store.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      let user;
      try {
        user = await store.create({ email, passwordHash, name });
      } catch (err) {
        // Defensive: race between findByEmail and create.
        if (err && err.code === 'EMAIL_TAKEN') {
          return res.status(409).json({ error: 'Email already registered' });
        }
        throw err;
      }

      return res.status(201).json(toPublicUser(user));
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { createRegisterRouter, toPublicUser };
