import { useEffect, useState } from 'react';
import { X, History, RotateCcw } from 'lucide-react';
import { api } from '../api/client';
import { decryptPrompt } from '../utils/crypto';
import { useVaultSecret } from '../context/VaultSecretContext';

/**
 * Given the CURRENT prompt doc, walks backward through parentVersion links
 * to reconstruct the full version chain (v1 -> v2 -> v3...). No dedicated
 * backend endpoint needed - each PUT already creates a new doc pointing
 * back to its parent, so the chain is just a linked list we can traverse.
 */
export default function VersionHistoryPanel({ currentPrompt, onClose, onRestore }) {
  const [chain, setChain] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [previews, setPreviews] = useState({});
  const { masterSecret, isUnlocked } = useVaultSecret();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const versions = [currentPrompt];
      let cursor = currentPrompt.parentVersion;
      while (cursor) {
        try {
          const data = await api.get(`/api/vault/prompts/${cursor}`);
          versions.push(data.prompt);
          cursor = data.prompt.parentVersion;
        } catch {
          break;
        }
      }
      if (!cancelled) {
        setChain(versions); // newest first, since we started at current and walked backward
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPrompt]);

  const toggleExpand = async (v) => {
    setExpanded((e) => ({ ...e, [v._id]: !e[v._id] }));
    if (!previews[v._id] && isUnlocked) {
      try {
        const text = await decryptPrompt(
          { encryptedPromptText: v.encryptedPromptText, iv: v.iv, salt: v.salt },
          masterSecret
        );
        setPreviews((p) => ({ ...p, [v._id]: text }));
      } catch {
        setPreviews((p) => ({ ...p, [v._id]: 'Could not decrypt this version.' }));
      }
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-vault-panel border-l border-vault-border shadow-2xl z-40 flex flex-col">
      <div className="p-4 border-b border-vault-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={15} className="text-vault-accent" />
          <div>
            <h2 className="text-sm font-semibold text-vault-text">Version History</h2>
            <p className="text-[11px] text-vault-muted font-mono">{currentPrompt.title}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-vault-muted hover:text-vault-text">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && <p className="text-xs text-vault-muted">Loading version chain...</p>}

        {chain.map((v, idx) => {
          const isCurrent = idx === 0;
          return (
            <div key={v._id} className="border border-vault-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleExpand(v)}
                className="w-full flex items-center justify-between px-3 py-2 bg-vault-panelLight text-left"
              >
                <span className="text-xs font-mono">
                  <span className={isCurrent ? 'text-vault-accent font-semibold' : 'text-vault-text'}>
                    v{v.version} {isCurrent && '(current)'}
                  </span>
                  <span className="text-vault-muted ml-2">{timeAgo(v.createdAt)}</span>
                </span>
              </button>

              {expanded[v._id] && (
                <div className="px-3 py-2 border-t border-vault-border">
                  <p className="text-xs text-vault-muted font-mono whitespace-pre-wrap leading-relaxed mb-2">
                    {isUnlocked
                      ? previews[v._id] || 'Decrypting...'
                      : 'Unlock the vault to preview this version.'}
                  </p>
                  {!isCurrent && (
                    <button
                      onClick={() => onRestore(v)}
                      className="flex items-center gap-1.5 text-xs text-vault-accent hover:underline"
                    >
                      <RotateCcw size={12} />
                      Restore this version
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
