# Zero-Knowledge Prompt & Context Vault

A secure, AI-powered prompt management platform for engineering teams — built on the MERN stack with true client-side encryption. Prompts, internal context, and proprietary instructions are encrypted in the browser before they ever touch a server, so even the database owner can't read them at rest.

**🔗 Live app:** [zero-knowledge-ai-vault.vercel.app](https://zero-knowledge-ai-vault.vercel.app)
**🔗 API:** [zero-knowledge-ai-vault1.onrender.com](https://zero-knowledge-ai-vault1.onrender.com)
**🔗 Source:** [github.com/safwan447/zero-knowledge-ai-vault](https://github.com/safwan447/zero-knowledge-ai-vault)

> **Note on cold starts:** the backend is hosted on Render's free tier, which spins down after inactivity. The first request after idle time can take 30-50 seconds to wake up — this is expected free-tier behavior, not a bug. Subsequent requests are fast.

---

## The problem

Engineering teams increasingly store and reuse LLM prompts that reference proprietary context — internal architecture, business logic, even fragments of production code. Saving those prompts in a plaintext database is a real, quiet security gap most "prompt library" tools ignore entirely.

## The approach

Every prompt is encrypted **in the user's browser** using a master secret only they know, before any network request is made. The server, the database, and even a compromised backend never see plaintext prompt content at rest. AI features (retrieval-augmented generation) still work by decrypting transiently in server memory for the duration of a single request — never persisted, never logged. This tradeoff is documented honestly below rather than oversold.

---

## Screenshots

| Login / Register | Prompt Library |
|---|---|
| Email + access phrase auth, with a team-creation or invite-code join flow | Encrypted prompt cards with tags, search, and last-updated timestamps |

| Prompt Editor | AI Query (RAG) |
|---|---|
| Code-editor-style body, live tag input, master-secret encryption notice | Chat interface with source citations and relevance scores from your own vault |

*(Full walkthrough available live at the demo link above.)*

---

## Security model — read this before assuming "true" zero-knowledge

Prompts are encrypted client-side (AES-GCM, key derived via PBKDF2 from a master secret) before they ever leave the browser. The server stores only ciphertext, IV, and salt — never plaintext at rest.

For AI features (RAG retrieval, LLM calls), the prompt is decrypted transiently in server memory, sent to the AI API over TLS, and never persisted unencrypted. This is **"zero-knowledge at rest,"** not cryptographically pure zero-knowledge (which would require client-side embeddings, a meaningfully harder and heavier problem). Worth knowing the distinction if you're asked about it in an interview — I'd rather state the real tradeoff than oversell the term.

A **canary-based verification system** (`VaultCanary` model) catches a wrong master secret immediately at unlock time, rather than failing confusingly later on a random prompt.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite), React Router, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB Atlas |
| Auth | JWT (httpOnly/Secure/SameSite cookies), Argon2 password hashing, invite-code-based RBAC |
| Encryption | Web Crypto API — PBKDF2 (250,000 iterations) + AES-GCM 256, entirely client-side |
| AI / RAG | Google Gemini (embeddings + generation), cosine-similarity retrieval, server-side transient decryption |
| Validation | Zod schema validation on every endpoint |
| Testing | Jest + Supertest + mongodb-memory-server (19 tests, real HTTP requests against a real in-memory DB) |
| CI | GitHub Actions — test suite + client build check on every push |
| Deployment | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

---

## Architecture

```
[ React Client ] --(Web Crypto API / AES-GCM)--> Encrypted Payload
       |
       +--(HTTP-only JWT Cookie)-------------> [ Node/Express Server ]
                                                     |
                                                     +---> [ MongoDB Atlas ] (Encrypted Prompts)
                                                     |
                                                     +---> [ Gemini API ] (In-Memory RAG Processing)
```

## Project structure

```
zero-knowledge-ai-vault/
├── client/                    # React (Vite) frontend
│   └── src/
│       ├── api/                # Fetch wrapper (credentialed requests)
│       ├── context/             # Auth + master-secret (memory-only) state
│       ├── components/          # Sidebar, unlock modal, version history panel
│       ├── pages/                # Auth, Library, Editor, AI Query, Settings
│       └── utils/crypto.js       # Client-side PBKDF2 + AES-GCM engine
├── server/                    # Node/Express backend
│   ├── config/                  # DB connection
│   ├── controllers/             # Auth, Vault, AI logic
│   ├── middleware/               # JWT auth, RBAC, zod validation
│   ├── models/                   # User, Team, PromptVault, AuditLog, VaultCanary
│   ├── routes/
│   ├── utils/                    # Server-side crypto, Gemini client, cosine similarity
│   ├── validators/                # Zod schemas per endpoint
│   ├── tests/                    # Unit + integration tests
│   ├── app.js                    # Express app (testable, no listen())
│   └── server.js                 # Entry point
├── .github/workflows/ci.yml   # GitHub Actions CI
└── README.md
```

---

## Features by phase

1. **Repo scaffold + Mongoose schemas** — multi-tenant data model from day one
2. **Auth** — register/login, JWT in httpOnly cookies, Argon2 hashing, invite-code team system, RBAC middleware
3. **Client-side crypto** — PBKDF2 + AES-GCM encryption engine, fully in-browser
4. **Vault endpoints** — encrypted CRUD, real version history (not overwrites), audit logging on every action
5. **RAG pipeline** — in-memory decryption, Gemini embeddings, cosine-similarity retrieval, conversation memory, vault-grounded answers (no generic chatbot fallback)
6. **Frontend workspace UI** — 5 fully wired screens: auth, library, editor, version history, AI query
7. **Hardening + deploy** — Zod validation on every endpoint, 19 Jest/Supertest tests, GitHub Actions CI, live deployment on Vercel + Render + Atlas

---

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

Passwords are hashed with **Argon2**. Sessions are JWTs stored in `httpOnly`, `SameSite` cookies (never `localStorage`), so they can't be read or stolen via XSS. Auth routes are rate-limited separately (20 req/15min) to slow down brute-force attempts. Route-level access control is enforced with `requireAuth` (verifies the session) and `requireRole('admin')` (gates by role).

## Client-side crypto

`client/src/utils/crypto.js` is the zero-knowledge engine. A master secret (chosen by the user, never sent to the server) plus a random salt are run through **PBKDF2** (250,000 iterations, SHA-256) to derive a 256-bit **AES-GCM** key. That key encrypts the prompt text entirely in the browser — the server only ever receives `encryptedPromptText`, `iv`, and `salt`. Wrong master secret on decrypt throws an error rather than returning garbled text, since AES-GCM verifies integrity as part of decryption.

## Vault endpoints

All routes require a logged-in session and are scoped to the requester's `teamId` — a valid prompt ID from another team returns `404`, not the data.

| Method | Route | Notes |
|---|---|---|
| POST | `/api/vault/prompts` | Store an already-encrypted prompt (`encryptedPromptText`, `iv`, `salt`, `title`, `tags`) |
| GET | `/api/vault/prompts` | List all prompts for the team |
| GET | `/api/vault/prompts/:id` | Get one prompt |
| PUT | `/api/vault/prompts/:id` | Creates a **new version** (doesn't overwrite — `parentVersion` links back to the original) |
| DELETE | `/api/vault/prompts/:id` | Prompt owner or team admin only |
| GET/POST | `/api/vault/canary` | Wrong-master-secret detection at unlock time |

Every action (create/read/update/delete) writes an entry to `AuditLog`.

## RAG pipeline

`POST /api/ai/query` (body: `{ query, masterSecret, history? }`) is the AI-powered part of the vault. Since prompts are encrypted at rest, meaningful retrieval requires a moment of plaintext access — here's exactly how that's scoped:

1. The team's encrypted prompts are fetched from MongoDB (ciphertext only)
2. Each is decrypted **in server memory only**, using the `masterSecret` sent for this one request (never logged, never stored, never cached)
3. The query and every decrypted prompt are embedded (Gemini `gemini-embedding-001`)
4. Prompts are ranked by cosine similarity; the top 3 matches become retrieved context, alongside vault-wide metadata (total count, titles) so meta-questions like "how many prompts do I have" work correctly
5. An augmented prompt (conversation history + vault metadata + retrieved context) is sent to Gemini for the final answer — strictly grounded, it explicitly refuses to fall back on general knowledge when the vault doesn't have relevant information
6. Decrypted text, embeddings, and the master secret all go out of scope when the request returns — nothing persists

A single prompt that fails to decrypt (e.g. encrypted under a different secret) is skipped individually rather than failing the whole request.

## Testing

```bash
cd server
npm test
```

19 tests across three layers:
- **Unit** — cosine similarity math, AES-GCM decryption (encrypting independently via Node's raw `crypto` module to simulate the browser, then verifying `decryptPrompt` handles correct secrets, wrong secrets, and tampered ciphertext correctly)
- **Integration** — real HTTP requests (via Supertest) against the real Express app, backed by an in-memory MongoDB (`mongodb-memory-server`): registration flows, login, session cookies, team scoping (confirming Team B genuinely cannot see Team A's data), version-chain creation, and the owner/admin delete-permission check

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and PR to `main`:
- **Server** — installs dependencies, runs the full Jest suite
- **Client** — installs dependencies, runs a production build to catch broken imports/syntax before deploy

No secrets required — the test suite spins up its own throwaway database and sets its own JWT secret.

## Local setup

**Backend:**
```bash
cd server
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, GEMINI_API_KEY
npm run dev
```

**Frontend:**
```bash
cd client
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:5000
npm run dev
```

Open `http://localhost:5173`.

## Deployment

| Service | Host | Notes |
|---|---|---|
| Frontend | Vercel | Root directory `client`, auto-detected Vite build |
| Backend | Render | Root directory `server`, free tier (spins down on idle) |
| Database | MongoDB Atlas | Free M0 cluster |
| AI | Google Gemini API | Free tier — `gemini-embedding-001` + `gemini-flash-lite-latest` for higher daily quota |

Cross-origin auth cookies work correctly in production via `sameSite: 'none'` + `secure: true`, automatically applied when `NODE_ENV=production`.