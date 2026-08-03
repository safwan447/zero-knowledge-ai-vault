import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { useVaultSecret } from '../context/VaultSecretContext';

export default function UnlockVaultModal() {
  const { isUnlocked, setMasterSecret } = useVaultSecret();
  const [input, setInput] = useState('');
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  if (isUnlocked) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input) return;
    setMasterSecret(input);
    navigate('/library');
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-vault-panel border border-vault-border rounded-xl p-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={16} className="text-vault-accent" />
          <h2 className="text-sm font-semibold text-vault-text">Unlock Vault</h2>
        </div>
        <p className="text-xs text-vault-muted mb-4 leading-relaxed">
          Enter your master secret to decrypt prompts in this session. It's kept only in this
          tab's memory - never sent anywhere except the one request that needs it, and never saved.
        </p>

        <div className="relative mb-4">
          <input
            type={show ? 'text' : 'password'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
            placeholder="Enter your master secret"
            className="w-full bg-vault-bg border border-vault-border rounded-md px-3 py-2 text-sm text-vault-text font-mono focus:outline-none focus:border-vault-accent"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-vault-muted hover:text-vault-text"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        <button
          type="submit"
          className="w-full py-2 rounded-md text-sm font-medium bg-vault-accent text-vault-bg hover:bg-vault-accentDark transition-colors"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}
