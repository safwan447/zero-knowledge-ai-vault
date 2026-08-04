const { z } = require('zod');

// --- Auth ---

const registerSchema = z
  .object({
    email: z.string().trim().toLowerCase().email('Must be a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters').max(200),
    teamName: z.string().trim().min(1).max(100).optional(),
    inviteCode: z.string().trim().min(1).max(100).optional(),
  })
  .refine((data) => data.teamName || data.inviteCode, {
    message: 'Either teamName (to create a team) or inviteCode (to join one) is required',
    path: ['teamName'],
  })
  .refine((data) => !(data.teamName && data.inviteCode), {
    message: 'Provide either teamName or inviteCode, not both',
    path: ['teamName'],
  });

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

// --- Vault ---

// Base64-ish check - not a strict base64 validator, just catches obviously
// wrong input (empty strings, non-string types) before it hits the DB.
const ciphertextField = z.string().min(1, 'Required').max(50_000);

const promptBodySchema = z.object({
  title: z.string().trim().max(200).optional(),
  encryptedPromptText: ciphertextField,
  iv: ciphertextField,
  salt: ciphertextField,
  tags: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
});

const canarySchema = z.object({
  encryptedCanary: ciphertextField,
  iv: ciphertextField,
  salt: ciphertextField,
});

// --- AI ---

const aiQuerySchema = z.object({
  query: z.string().trim().min(1, 'Query cannot be empty').max(2000),
  masterSecret: z.string().min(1, 'Master secret is required').max(500),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        text: z.string().max(5000),
      })
    )
    .max(20)
    .optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  promptBodySchema,
  canarySchema,
  aiQuerySchema,
};
