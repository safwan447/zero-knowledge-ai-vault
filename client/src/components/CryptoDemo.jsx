import { useState } from 'react';
import { encryptPrompt, decryptPrompt } from '../utils/crypto';

/**
 * Temporary test harness for Phase 3. Proves the crypto engine works before
 * we wire it into the real vault UI in Phase 6. Not the final design.
 */
export default function CryptoDemo() {
  const [masterSecret, setMasterSecret] = useState('');
  const [plaintext, setPlaintext] = useState('');
  const [encrypted, setEncrypted] = useState(null);
  const [decrypted, setDecrypted] = useState('');
  const [error, setError] = useState('');

  const handleEncrypt = async () => {
    setError('');
    setDecrypted('');
    if (!masterSecret || !plaintext) {
      setError('Enter both a master secret and a prompt.');
      return;
    }
    const result = await encryptPrompt(plaintext, masterSecret);
    setEncrypted(result);
  };

  const handleDecrypt = async () => {
    setError('');
    if (!encrypted) return;
    try {
      const result = await decryptPrompt(encrypted, masterSecret);
      setDecrypted(result);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', fontFamily: 'monospace' }}>
      <h2>Zero-Knowledge Crypto Test</h2>

      <label>Master Secret</label>
      <input
        type="password"
        value={masterSecret}
        onChange={(e) => setMasterSecret(e.target.value)}
        placeholder="e.g. a passphrase only you know"
        style={{ width: '100%', marginBottom: 12, padding: 8 }}
      />

      <label>Prompt Text</label>
      <textarea
        value={plaintext}
        onChange={(e) => setPlaintext(e.target.value)}
        rows={4}
        placeholder="The prompt you want to encrypt"
        style={{ width: '100%', marginBottom: 12, padding: 8 }}
      />

      <button onClick={handleEncrypt} style={{ marginRight: 8 }}>
        Encrypt
      </button>
      <button onClick={handleDecrypt} disabled={!encrypted}>
        Decrypt
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {encrypted && (
        <div style={{ marginTop: 20, background: '#eee', padding: 12, wordBreak: 'break-all' }}>
          <p><strong>This is what gets sent to the server:</strong></p>
          <p>encryptedPromptText: {encrypted.encryptedPromptText}</p>
          <p>iv: {encrypted.iv}</p>
          <p>salt: {encrypted.salt}</p>
        </div>
      )}

      {decrypted && (
        <div style={{ marginTop: 20, background: '#dfd', padding: 12 }}>
          <p><strong>Decrypted (only possible with the right master secret):</strong></p>
          <p>{decrypted}</p>
        </div>
      )}
    </div>
  );
}
