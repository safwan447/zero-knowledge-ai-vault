import { createContext, useContext, useState, useCallback } from 'react';

/**
 * The master secret is what makes this "zero-knowledge" - it's the key to
 * every encrypted prompt, and it must NEVER touch localStorage, cookies,
 * or any persistent storage. It lives only in React state (i.e. browser
 * memory) for the current tab session, and vanishes on refresh or "Lock Vault".
 */
const VaultSecretContext = createContext(null);

export function VaultSecretProvider({ children }) {
  const [masterSecret, setMasterSecretState] = useState(null);

  const setMasterSecret = useCallback((secret) => {
    setMasterSecretState(secret);
  }, []);

  const lockVault = useCallback(() => {
    setMasterSecretState(null);
  }, []);

  const isUnlocked = masterSecret !== null;

  return (
    <VaultSecretContext.Provider value={{ masterSecret, setMasterSecret, lockVault, isUnlocked }}>
      {children}
    </VaultSecretContext.Provider>
  );
}

export function useVaultSecret() {
  const ctx = useContext(VaultSecretContext);
  if (!ctx) throw new Error('useVaultSecret must be used within VaultSecretProvider');
  return ctx;
}
