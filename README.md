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
2. Auth (register/login, JWT cookies, Argon2, RBAC middleware)
3. Client-side crypto (PBKDF2 + AES-GCM)
4. Vault endpoints (encrypted prompt CRUD)
5. RAG pipeline (embeddings + vector search + AI API)
6. Frontend workspace UI
