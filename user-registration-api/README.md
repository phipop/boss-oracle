# User Registration API

A small Node.js + Express REST API for user registration and login. Passwords
are hashed with bcrypt, inputs are validated, login issues a JWT, and the
service is hardened with rate limiting and CORS.

Storage is behind a swappable async `UserStore` interface: an **in-memory**
store (used by unit tests) and a real **SQLite** store (used by the running
server) both implement `findByEmail` / `create`.

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
```

The server uses a SQLite database at `data/users.sqlite` (schema auto-created
on startup; the file is gitignored).

### Configuration (environment variables)

| Variable                  | Default                              | Purpose                                            |
| ------------------------- | ------------------------------------ | -------------------------------------------------- |
| `PORT`                    | `3000`                               | HTTP port                                          |
| `SQLITE_FILE`             | `data/users.sqlite`                  | DB path (use `:memory:` for an ephemeral DB)       |
| `JWT_SECRET`              | _dev-only insecure default_          | **Set this in production.** Signs/verifies JWTs    |
| `JWT_EXPIRES_IN`          | `1h`                                 | Token lifetime (any `jsonwebtoken` duration)       |
| `CORS_ORIGIN`             | `*`                                  | `*` or a comma-separated origin allowlist          |
| `RATE_LIMIT_WINDOW_MS`    | `900000` (15 min)                    | Rate-limit window                                  |
| `RATE_LIMIT_REGISTER_MAX` | `10`                                 | Max `/register` requests per IP per window         |
| `RATE_LIMIT_LOGIN_MAX`    | `20`                                 | Max `/login` requests per IP per window            |

> The server warns (without printing the value) if `JWT_SECRET` is unset.

## Docker

Multi-stage build on `node:22-slim` (Debian, not alpine — `better-sqlite3`
compiles reliably against glibc). The runtime image carries no build toolchain
and no devDependencies. The DB lives on a volume at `/app/data`, so data
survives container removal; `JWT_SECRET` is supplied at run time and never
baked into the image.

### Build & run (plain docker)

```bash
cd user-registration-api
docker build -t user-registration-api:latest .

docker run -d --name ureg \
  -p 3000:3000 \
  -e JWT_SECRET="$(openssl rand -hex 32)" \
  -v ureg-data:/app/data \
  user-registration-api:latest
# -> http://localhost:3000  (frontend at / and /login.html)
```

`-v ureg-data:/app/data` is a named volume; the SQLite file (and its
`-wal`/`-shm` siblings) persist there across `docker rm` / restart.

### docker compose

```bash
# JWT_SECRET is required; compose refuses to start without it.
JWT_SECRET="$(openssl rand -hex 32)" docker compose up --build -d
docker compose down       # stop; named volume `userdata` keeps the data
```

Override any env var from the table above on the `docker run -e` line or the
compose environment. The container always listens on port 3000 internally
(`HEALTHCHECK` hits `GET /health`); map it to any host port with `-p`.

## Test

```bash
npm test
```

Tests use **jest + supertest**: unit tests run against the fast in-memory store;
an integration suite exercises the real SQLite driver (using `:memory:`).
Rate limiting is disabled in `createApp` by default so unit tests are
deterministic; the running server enables it.

## API

### `POST /register`

Request body (JSON):

| field      | type   | required | rules                                                        |
| ---------- | ------ | -------- | ------------------------------------------------------------ |
| `email`    | string | yes      | valid email format, unique                                   |
| `password` | string | yes      | see password rules below                                     |
| `name`     | string | no       | optional                                                     |

**Password rules:** 8–128 chars, and must contain at least one lowercase
letter, one uppercase letter, one digit, and one special (non-alphanumeric)
character.

Responses:

- `201 Created` — the created user (no password / hash):
  ```json
  { "id": 1, "email": "alice@example.com", "name": "Alice", "createdAt": "2026-05-25T00:00:00.000Z" }
  ```
- `400 Bad Request` — validation failed (`details` lists every failed rule).
- `409 Conflict` — email already registered.
- `429 Too Many Requests` — rate limit exceeded.

### `POST /login`

Request body (JSON):

| field      | type   | required |
| ---------- | ------ | -------- |
| `email`    | string | yes      |
| `password` | string | yes      |

Responses:

- `200 OK` — credentials verified:
  ```json
  { "token": "<jwt>" }
  ```
  The JWT payload contains `sub` (user id) and `email`, and expires per
  `JWT_EXPIRES_IN`.
- `400 Bad Request` — validation failed (missing/ill-typed/invalid email).
- `401 Unauthorized` — bad credentials (generic message; no user enumeration).
- `429 Too Many Requests` — rate limit exceeded.

### `GET /health`

Returns `{ "status": "ok" }`.

## Example curl commands

```bash
# Register — success (201)
curl -i -X POST http://localhost:3000/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"Sup3rSecret!","name":"Alice"}'

# Register — 400 (password lacks complexity)
curl -i -X POST http://localhost:3000/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@example.com","password":"alllowercase"}'

# Register — 409 (run the success command twice)
curl -i -X POST http://localhost:3000/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"Sup3rSecret!"}'

# Login — success (200, returns { "token": "..." })
curl -i -X POST http://localhost:3000/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"Sup3rSecret!"}'

# Login — 401 (wrong password)
curl -i -X POST http://localhost:3000/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"WrongPass1!"}'

# Login — 400 (missing password)
curl -i -X POST http://localhost:3000/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com"}'

# Use the token (example of an authenticated header)
TOKEN=$(curl -s -X POST http://localhost:3000/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@example.com","password":"Sup3rSecret!"}' | sed 's/.*"token":"\([^"]*\)".*/\1/')
echo "Authorization: Bearer $TOKEN"
```

## Structure

```
user-registration-api/
├── package.json
├── README.md
├── .gitignore
├── Dockerfile              # multi-stage build (node:22-slim)
├── .dockerignore
├── docker-compose.yml      # service + named volume + healthcheck
├── data/                   # SQLite db files live here (gitignored)
├── src/
│   ├── app.js              # builds the Express app (CORS, rate limit, routes, error handler)
│   ├── server.js           # process entrypoint: SQLite store + createApp() + listen()
│   ├── config.js           # env-driven config (JWT, CORS, rate limits)
│   ├── store.js            # in-memory UserStore (test double)
│   ├── sqlite-store.js     # SqliteUserStore (real DB, same async interface)
│   ├── validation.js       # registration + login validation, password complexity
│   └── routes/
│       ├── register.js     # POST /register — bcrypt hashing
│       └── login.js        # POST /login — bcrypt verify + JWT issue
└── tests/
    ├── register.test.js
    ├── login.test.js
    ├── sqlite-store.test.js
    └── hardening.test.js
```

## Swapping the store

`createApp({ store })` accepts any object implementing the async `findByEmail`
and `create` methods. The server injects `SqliteUserStore`; tests inject the
in-memory `UserStore`. To use Postgres/Mongo, implement the same two methods
and inject your store — no route or app code changes.
