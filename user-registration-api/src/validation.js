'use strict';

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128; // bcrypt only uses the first 72 bytes; cap to avoid DoS via huge inputs

// Pragmatic email check: non-empty local part, single @, a dot in the domain,
// and no whitespace. Full RFC 5322 is overkill for registration.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Collect password-complexity errors for a string password.
 * Rules: 8-128 chars, at least one lowercase, one uppercase, one digit,
 * and one special (non-alphanumeric) character.
 * @param {string} password
 * @returns {string[]}
 */
function passwordComplexityErrors(password) {
  const errs = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    errs.push(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    errs.push(`password must be at most ${MAX_PASSWORD_LENGTH} characters`);
  }
  if (!/[a-z]/.test(password)) {
    errs.push('password must contain at least one lowercase letter');
  }
  if (!/[A-Z]/.test(password)) {
    errs.push('password must contain at least one uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errs.push('password must contain at least one digit');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errs.push('password must contain at least one special character');
  }
  return errs;
}

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
  } else {
    errors.push(...passwordComplexityErrors(password));
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

/**
 * Validate a login payload. Only checks that email/password are present and
 * well-typed — we do NOT apply password-complexity rules here (an account may
 * predate a rule change; complexity is enforced at registration, credentials
 * are verified at login).
 * @param {any} body
 * @returns {{ valid: boolean, errors: string[], value?: { email: string, password: string } }}
 */
function validateLogin(body) {
  const errors = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object'] };
  }

  const { email, password } = body;

  if (email === undefined || email === null || email === '') {
    errors.push('email is required');
  } else if (typeof email !== 'string') {
    errors.push('email must be a string');
  } else if (!EMAIL_RE.test(email.trim())) {
    errors.push('email must be a valid email address');
  }

  if (password === undefined || password === null || password === '') {
    errors.push('password is required');
  } else if (typeof password !== 'string') {
    errors.push('password must be a string');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], value: { email: email.trim(), password } };
}

module.exports = {
  validateRegistration,
  validateLogin,
  passwordComplexityErrors,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
};
