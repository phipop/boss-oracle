'use strict';

const MIN_PASSWORD_LENGTH = 8;

// Pragmatic email check: non-empty local part, single @, a dot in the domain,
// and no whitespace. Full RFC 5322 is overkill for registration.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate a registration payload.
 * @param {any} body
 * @returns {{ valid: boolean, errors: string[], value?: { email: string, password: string, name: string|null } }}
 */
function validateRegistration(body) {
  const errors = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  const { email, password, name } = body;

  // email
  if (email === undefined || email === null || email === '') {
    errors.push('email is required');
  } else if (typeof email !== 'string') {
    errors.push('email must be a string');
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.push('email must be a valid email address');
  }

  // password
  if (password === undefined || password === null || password === '') {
    errors.push('password is required');
  } else if (typeof password !== 'string') {
    errors.push('password must be a string');
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  // name (optional)
  if (name !== undefined && name !== null && typeof name !== 'string') {
    errors.push('name must be a string');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    value: {
      email: email.trim(),
      password,
      name: name === undefined || name === null ? null : String(name).trim(),
    },
  };
}

module.exports = { validateRegistration, MIN_PASSWORD_LENGTH };
