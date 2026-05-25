'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateLogin } = require('../validation');
const { config } = require('../config');

/**
 * Build the /login router against a given store.
 *
 * On success returns a signed JWT. On bad credentials returns 401 with a
 * GENERIC message ("Invalid email or password") regardless of whether the
 * email exists — this avoids user-enumeration. We also run bcrypt.compare
 * against a dummy hash when the user is missing to keep timing roughly
 * constant.
 *
 * @param {{ findByEmail: Function }} store
 */
function createLoginRouter(store) {
  const router = express.Router();

  // A valid bcrypt hash (of a random string) used purely to spend ~the same
  // CPU time when the user does not exist, mitigating timing-based enumeration.
  const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-password', 10);

  router.post('/login', async (req, res, next) => {
    try {
      const result = validateLogin(req.body);
      if (!result.valid) {
        return res.status(400).json({ error: 'Validation failed', details: result.errors });
      }

      const { email, password } = result.value;

      const user = await store.findByEmail(email);
      const hash = user ? user.passwordHash : DUMMY_HASH;
      const ok = await bcrypt.compare(password, hash);

      if (!user || !ok) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { sub: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      return res.status(200).json({ token });
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { createLoginRouter };
