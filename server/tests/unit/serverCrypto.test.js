const crypto = require('crypto');
const { decryptPrompt } = require('../../utils/serverCrypto');

// Mirrors the constants in serverCrypto.js / client's crypto.js - this test
// independently encrypts data (simulating what the browser would produce)
// so we're testing decryptPrompt against real Web-Crypto-shaped ciphertext,
// not just round-tripping through the same function.
const PBKDF2_ITERATIONS = 250_000;

function encryptLikeBrowser(plaintext, masterSecret) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(masterSecret, salt, PBKDF2_ITERATIONS, 32, 'sha256');

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Web Crypto's AES-GCM output is ciphertext + authTag concatenated
  const combined = Buffer.concat([ciphertext, authTag]);

  return {
    encryptedPromptText: combined.toString('base64'),
    iv: iv.toString('base64'),
    salt: salt.toString('base64'),
  };
}

describe('serverCrypto.decryptPrompt', () => {
  it('decrypts data encrypted with the correct master secret', () => {
    const secret = 'correct-horse-battery-staple';
    const encrypted = encryptLikeBrowser('Always use TypeScript strict mode', secret);

    const result = decryptPrompt(encrypted, secret);
    expect(result).toBe('Always use TypeScript strict mode');
  });

  it('throws when the master secret is wrong', () => {
    const encrypted = encryptLikeBrowser('some secret prompt', 'right-secret');

    expect(() => decryptPrompt(encrypted, 'wrong-secret')).toThrow();
  });

  it('throws when the ciphertext has been tampered with', () => {
    const encrypted = encryptLikeBrowser('tamper test', 'my-secret');
    // Flip a character in the ciphertext to simulate tampering
    const tampered = {
      ...encrypted,
      encryptedPromptText: encrypted.encryptedPromptText.slice(0, -4) + 'AAAA',
    };

    expect(() => decryptPrompt(tampered, 'my-secret')).toThrow();
  });
});
