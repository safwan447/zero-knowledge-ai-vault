const crypto = require('crypto');

/**
 * Server-side counterpart to client/src/utils/crypto.js.
 *
 * IMPORTANT: this function exists ONLY for the RAG/AI query flow, where a
 * user explicitly sends their master secret over TLS for a single request
 * so the server can temporarily read prompt text to build context for the
 * AI. The decrypted result and the master secret must never be logged,
 * stored, or cached - they live only in the memory of the current request.
 *
 * Parameters (PBKDF2 iterations, key length, GCM tag length) MUST match
 * client/src/utils/crypto.js exactly, or decryption will fail.
 */

const PBKDF2_ITERATIONS = 250_000;
const KEY_LENGTH_BYTES = 32; // 256 bits
const AUTH_TAG_LENGTH_BYTES = 16; // Web Crypto appends this to the ciphertext automatically

function deriveKey(masterSecret, saltBase64) {
  const salt = Buffer.from(saltBase64, 'base64');
  return crypto.pbkdf2Sync(masterSecret, salt, PBKDF2_ITERATIONS, KEY_LENGTH_BYTES, 'sha256');
}

/**
 * Decrypts a single prompt. Throws if the master secret is wrong or the
 * data was tampered with (GCM auth tag check fails).
 */
function decryptPrompt({ encryptedPromptText, iv, salt }, masterSecret) {
  const key = deriveKey(masterSecret, salt);
  const ivBuffer = Buffer.from(iv, 'base64');

  // Web Crypto's AES-GCM output is ciphertext + authTag concatenated.
  // Node's crypto module wants them separated.
  const fullCiphertext = Buffer.from(encryptedPromptText, 'base64');
  const authTag = fullCiphertext.subarray(fullCiphertext.length - AUTH_TAG_LENGTH_BYTES);
  const ciphertext = fullCiphertext.subarray(0, fullCiphertext.length - AUTH_TAG_LENGTH_BYTES);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, ivBuffer);
  decipher.setAuthTag(authTag);

  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    throw new Error('Decryption failed - wrong master secret, or data was tampered with.');
  }
}

module.exports = { decryptPrompt };
