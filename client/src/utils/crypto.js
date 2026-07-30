/**
 * Zero-knowledge encryption layer.
 *
 * Everything here runs in the browser. The server NEVER receives a master
 * secret, a derived key, or plaintext prompt text at rest - only ciphertext,
 * IV, and salt (see README's "zero-knowledge at rest" note).
 *
 * Flow:
 *   masterSecret + salt --PBKDF2--> AES-GCM key --> encrypt(plaintext) --> ciphertext
 *
 * A fresh salt and IV are generated per-encryption. The salt lets us re-derive
 * the same key later (with the same masterSecret) to decrypt; the IV ensures
 * two encryptions of the same text never produce the same ciphertext.
 */

const PBKDF2_ITERATIONS = 250_000; // deliberately slow, resists brute-force on the master secret
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12; // 96 bits is the recommended IV size for AES-GCM

// --- base64 <-> ArrayBuffer helpers, needed because crypto APIs work in bytes but we store/send strings ---

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derives an AES-GCM key from a human-provided master secret and a salt.
 * Same secret + same salt = same key, every time (deterministic).
 */
async function deriveKey(masterSecret, saltBytes) {
  const encoder = new TextEncoder();

  // Import the raw password as key material PBKDF2 can work with
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(masterSecret),
    { name: 'PBKDF2' },
    false, // not extractable
    ['deriveKey']
  );

  // Stretch it into a proper 256-bit AES key
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable - key itself never leaves this function
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext prompt. Returns everything needed to decrypt it later
 * (ciphertext, iv, salt) as base64 strings - safe to send to the server and
 * store in MongoDB, since none of it is useful without the master secret.
 */
export async function encryptPrompt(plaintext, masterSecret) {
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));

  const key = await deriveKey(masterSecret, salt);

  const encoder = new TextEncoder();
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  return {
    encryptedPromptText: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
  };
}

/**
 * Decrypts a prompt using the same master secret used to encrypt it.
 * Throws if the master secret is wrong (AES-GCM authentication fails)
 * or if the ciphertext/iv/salt has been tampered with.
 */
export async function decryptPrompt({ encryptedPromptText, iv, salt }, masterSecret) {
  const saltBytes = new Uint8Array(base64ToBuffer(salt));
  const ivBytes = new Uint8Array(base64ToBuffer(iv));
  const ciphertextBuffer = base64ToBuffer(encryptedPromptText);

  const key = await deriveKey(masterSecret, saltBytes);

  try {
    const plaintextBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBytes },
      key,
      ciphertextBuffer
    );
    return new TextDecoder().decode(plaintextBuffer);
  } catch (err) {
    // AES-GCM decrypt fails (rather than returning garbage) if the key or
    // ciphertext is wrong - that's the built-in tamper/wrong-password check.
    throw new Error('Decryption failed - wrong master secret, or the data was tampered with.');
  }
}
