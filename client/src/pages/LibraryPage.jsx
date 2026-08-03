import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Lock, Sparkles } from 'lucide-react';
import { api } from '../api/client';
import { decryptPrompt } from '../utils/crypto';
import { useVaultSecret } from '../context/VaultSecretContext';
import UnlockVaultModal from '../components/UnlockVaultModal';

export default function LibraryPage() {
  const [prompts, setPrompts] = useState([]);
  const [previews, setPreviews] = useState({}); // id -> decrypted snippet, only populated when unlocked
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { masterSecret, isUnlocked } = useVaultSecret();
  const navigate = useNavigate();

  useEffect(() => {
    api
      .get('/api/vault/prompts')
      .then((data) => setPrompts(data.prompts))
      .finally(() => setLoading(false));
  }, []);

  // Decrypt short previews client-side, only when the vault is unlocked.
  // Never sent anywhere - purely for display in this session.
  useEffect(() => {
    if (!isUnlocked) {
      setPreviews({});
      return;
    }
    let cancelled = false;
    (async () => {
      const next = {};
      for (const p of prompts) {
        try {
          const text = await decryptPrompt(
            { encryptedPromptText: p.encryptedPromptText, iv: p.iv, salt: p.salt },
            masterSecret
          );
          next[p._id] = text.slice(0, 110);
        } catch {
          next[p._id] = null; // wrong secret or corrupted entry - just skip preview
        }
      }
      if (!cancelled) setPreviews(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [isUnlocked, masterSecret, prompts]);

  const filtered = useMemo(() => {
    if (!search) return prompts;
    const q = search.toLowerCase();
    return prompts.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [prompts, search]);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      {!isUnlocked && <UnlockVaultModal />}

      <header className="border-b border-vault-border px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base font-bold text-vault-text">ZK-Prompt-Vault</h1>
        </div>
        <div className="flex-1 max-w-md relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts, tags..."
            className="w-full bg-vault-panel border border-vault-border rounded-md pl-9 pr-3 py-2 text-sm text-vault-text focus:outline-none focus:border-vault-accent"
          />
        </div>
        <button
          onClick={() => navigate('/prompts/new')}
          className="flex items-center gap-2 bg-vault-accent text-vault-bg text-sm font-medium px-3 py-2 rounded-md hover:bg-vault-accentDark transition-colors"
        >
          <Plus size={14} />
          New Prompt
        </button>
      </header>

      <div className="px-6 py-4">
        <h2 className="text-lg font-bold text-vault-text">Prompt Library</h2>
        <p className="text-xs text-vault-muted font-mono">
          {loading ? 'Loading...' : `${prompts.length} Encrypted Prompts Available`}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {!loading && filtered.length === 0 && (
          <EmptyState onCreate={() => navigate('/prompts/new')} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <button
              key={p._id}
              onClick={() => navigate(`/prompts/${p._id}`)}
              className="text-left bg-vault-panel border border-vault-border rounded-lg p-4 hover:border-vault-accent/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-vault-text group-hover:text-vault-accent transition-colors">
                  {p.title || 'Untitled Prompt'}
                </h3>
                <Lock size={12} className="text-vault-muted mt-0.5 shrink-0" />
              </div>

              <p className="text-xs text-vault-muted leading-relaxed mb-3 min-h-[2.5rem]">
                {isUnlocked
                  ? previews[p._id] === null
                    ? 'Could not decrypt with current master secret.'
                    : previews[p._id] || 'Decrypting...'
                  : 'Unlock the vault to preview this prompt.'}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {p.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono uppercase bg-vault-panelLight border border-vault-border text-vault-muted px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <p className="text-[10px] text-vault-muted font-mono border-t border-vault-border pt-2">
                Last updated: {timeAgo(p.updatedAt)}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Sparkles size={24} className="text-vault-accent mb-3" />
      <p className="text-sm text-vault-text font-medium mb-1">No prompts yet</p>
      <p className="text-xs text-vault-muted mb-4">Create your first encrypted prompt to get started.</p>
      <button
        onClick={onCreate}
        className="text-sm bg-vault-accent text-vault-bg px-4 py-2 rounded-md hover:bg-vault-accentDark transition-colors"
      >
        New Prompt
      </button>
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return 'unknown';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
