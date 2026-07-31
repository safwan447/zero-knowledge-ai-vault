# Zero-Knowledge Prompt & Context Vault

A MERN + AI project for teams that need to store LLM prompts (with proprietary
context, secrets, or internal codebase references) without leaving them
unencrypted at rest.

## Security model (read this before assuming "true" zero-knowledge)

Prompts are encrypted client-side (AES-GCM, key derived via PBKDF2 from a
master secret) before they ever leave the browser. The server stores only
ciphertext, IV, and salt - never plaintext at rest.

For AI features (RAG retrieval, LLM calls), the prompt is decrypted
transiently in server memory, sent to the AI API over TLS, and never
persisted unencrypted. This is **"zero-knowledge at rest,"** not
cryptographically pure zero-knowledge (which would require client-side
embeddings). Worth knowing the distinction if you're asked about it in an
interview.

## Stack

- **Frontend:** React (Vite)
- **Backend:** Node.js + Express
- **Database:** MongoDB (Atlas)
- **Auth:** JWT in httpOnly/Secure/SameSite=Strict cookies, Argon2 password hashing, RBAC
- **Encryption:** Web Crypto API (PBKDF2 + AES-GCM), client-side
- **AI:** RAG pipeline (vector embeddings + retrieval) over the AI API

## Structure

```
zero-knowledge-ai-vault/
├── client/          # React (Vite)
├── server/
│   ├── config/       # DB connection
│   ├── controllers/  # Auth, Vault, AI controllers
│   ├── middleware/   # JWT auth verification, rate limiting
│   ├── models/        # Mongoose schemas (User, Team, PromptVault, AuditLog)
│   ├── routes/
│   ├── utils/
│   └── server.js      # Entry point
└── README.md
```

## Setup

```bash
cd server
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, ANTHROPIC_API_KEY
npm run dev
```

Client setup will be added in Phase 3 (client-side crypto + workspace UI).

## Build phases

1. ✅ Repo scaffold + Mongoose schemas
2. ✅ Auth (register/login, JWT cookies, Argon2, RBAC middleware)
3. ✅ Client-side crypto (PBKDF2 + AES-GCM)
4. ✅ Vault endpoints (encrypted prompt CRUD)
5. RAG pipeline (embeddings + vector search + AI API)
6. Frontend workspace UI
7. Hardening + deploy (input validation, tests, CI, live deployment)

## Auth

Multi-tenancy is invite-code based:

- **First user on a team** registers without an `inviteCode` → becomes that team's `admin`, a new `Team` is created, and the response includes a `teamInviteCode` to share with teammates.
- **Everyone else** registers *with* that `inviteCode` → joins the same team as a `member`.

### Endpoints

| Method | Route | Auth required | Body | Notes |
|---|---|---|---|---|
| POST | `/api/auth/register` | No | `{ email, password, teamName }` or `{ email, password, inviteCode }` | Creates a team (admin) or joins one (member) |
| POST | `/api/auth/login` | No | `{ email, password }` | Issues JWT in an httpOnly cookie |
| POST | `/api/auth/logout` | No | - | Clears the auth cookie |
| GET | `/api/auth/me` | Yes | - | Returns the logged-in user, used by the frontend to check session state |

Passwords are hashed with **Argon2**. Sessions are JWTs stored in `httpOnly`, `SameSite` cookies (never `localStorage`), so they can't be read or stolen via XSS. Auth routes are rate-limited separately (20 req/15min) to slow down brute-force attempts. Route-level access control is enforced with `requireAuth` (verifies the session) and `requireRole('admin')` (gates by role), both in `server/middleware/`.

## Client-side crypto

`client/src/utils/crypto.js` is the zero-knowledge engine. A master secret (chosen by the user, never sent to the server) plus a random salt are run through **PBKDF2** (250,000 iterations, SHA-256) to derive a 256-bit **AES-GCM** key. That key encrypts the prompt text entirely in the browser - the server only ever receives `encryptedPromptText`, `iv`, and `salt`. Wrong master secret on decrypt throws an error rather than returning garbled text, since AES-GCM verifies integrity as part of decryption.

`client/src/components/CryptoDemo.jsx` is a temporary test harness to verify the encrypt/decrypt roundtrip visually - it'll be replaced by the real vault UI in Phase 6.

## Vault endpoints

All routes below require a logged-in session (`requireAuth`) and are scoped to the requester's `teamId` - a valid prompt ID from another team returns `404`, not the data.

| Method | Route | Notes |
|---|---|---|
| POST | `/api/vault/prompts` | Store an already-encrypted prompt (`encryptedPromptText`, `iv`, `salt`, `title`, `tags`) |
| GET | `/api/vault/prompts` | List all prompts for the team |
| GET | `/api/vault/prompts/:id` | Get one prompt |
| PUT | `/api/vault/prompts/:id` | Creates a **new version** (doesn't overwrite - `parentVersion` links back to the original, so history is preserved) |
| DELETE | `/api/vault/prompts/:id` | Prompt owner or team admin only |

Every action (create/read/update/delete) writes an entry to `AuditLog` via `utils/logAction.js`.