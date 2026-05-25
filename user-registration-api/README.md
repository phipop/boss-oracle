# User Registration API

A small Node.js + Express REST API for user registration. Storage is in-memory
(behind a swappable `UserStore` interface), passwords are hashed with bcrypt,
and inputs are validated.

## Requirements

- Node.js 18+ (developed/tested on Node 24)

## Setup

```bash
cd user-registration-api
npm install
```

## Run

```bash
npm start
# -> user-registration-api listening on http://localhost:3000
# Override the port with: PORT=8080 npm start
```

> Note: the in-memory store is reset every time the process restarts.

## Test

```bash
npm test
```

Tests use **jest + supertest** and cover the success path plus every error path
(missing fields, bad email, weak password, malformed JSON, duplicate email).

## API

### `POST /register`

Request body (JSON):

| field      | type   | required | rules                          |
| ---------- | ------ | -------- | ------------------------------ |
| `email`    | string | yes      | valid email format, unique     |
| `password` | string | yes      | minimum 8 characters           |
| `name`     | string | no       | optional                       |

Responses:

- `201 Created` — returns the created user (no password / hash):
  ```json
  { "id": 1, "email": "alice@example.com", "name": "Alice", "createdAt": "2026-05-25T00:00:00.000Z" }
  ```
- `400 Bad Request` — validation failed:
  ```json
  { "error": "Validation failed", "details": ["password must be at least 8 characters"] }
  ```
- `409 Conflict` — email already registered:
  ```json
  { "error": "Email already registered" }
  ```

### `GET /health`

Returns `{ "status": "ok" }`.

## Example curl commands

```bash
# Success
curl -i -X POST http://localhost:3000/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"supersecret","name":"Alice"}'

# 400 - weak password
curl -i -X POST http://localhost:3000/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@example.com","password":"short"}'

# 400 - invalid email
curl -i -X POST http://localhost:3000/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"nope","password":"longenough"}'

# 409 - duplicate (run the success command twice)
curl -i -X POST http://localhost:3000/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"supersecret"}'
```

## Structure

```
user-registration-api/
├── package.json
├── README.md
├── .gitignore
├── src/
│   ├── app.js              # builds the Express app (no listen) — importable by tests
│   ├── server.js           # process entrypoint: createApp() + app.listen()
│   ├── store.js            # in-memory UserStore (swappable for a real DB)
│   ├── validation.js       # request validation
│   └── routes/
│       └── register.js     # POST /register handler + bcrypt hashing
└── tests/
    └── register.test.js
```

## Swapping the store for a real database

`src/store.js` exposes an async interface (`findByEmail`, `create`). To use a
real DB, implement the same methods against your driver and inject it:
`createApp({ store: new PostgresUserStore() })`. No route or app code changes.
