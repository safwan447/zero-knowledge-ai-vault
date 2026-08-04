import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, Save, History, Tag as TagIcon, ShieldAlert } from 'lucide-react';
import { api } from '../api/client';
import { encryptPrompt, decryptPrompt } from '../utils/crypto';
import { useVaultSecret } from '../context/VaultSecretContext';
import UnlockVaultModal from '../components/UnlockVaultModal';
import VersionHistoryPanel from '../components/VersionHistoryPanel';

export default function PromptEditorPage() {
  const { id } = useParams(); // undefined when creating a new prompt
  const isNew = !id;
  const navigate = useNavigate();
  const { masterSecret, isUnlocked } = useVaultSecret();

  const [current, setCurrent] = useState(null); // the loaded prompt doc, when editing
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Load + decrypt existing prompt when editing
  useEffect(() => {
    if (isNew || !isUnlocked) return;
    api.get(`/api/vault/prompts/${id}`).then(async (data) => {
      setCurrent(data.prompt);
      setTitle(data.prompt.title || '');
      setTags(data.prompt.tags || []);
      try {
        const text = await decryptPrompt(
          {
            encryptedPromptText: data.prompt.encryptedPromptText,
            iv: data.prompt.iv,
            salt: data.prompt.salt,
          },
          masterSecret
        );
        setBody(text);
      } catch {
        setError('Could not decrypt this prompt with the current master secret.');
      }
    });
  }, [id, isNew, isUnlocked, masterSecret]);

  const addTag = (e) => {
    if (e.key !== 'Enter' || !tagInput.trim()) return;
    e.preventDefault();
    setTags((t) => Array.from(new Set([...t, tagInput.trim()])));
    setTagInput('');
    setDirty(true);
  };

  const removeTag = (tag) => {
    setTags((t) => t.filter((x) => x !== tag));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!title || !body) {
      setError('Title and prompt body are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const encrypted = await encryptPrompt(body, masterSecret);
      const payload = { title, tags, ...encrypted };

      if (isNew) {
        await api.post('/api/vault/prompts', payload);
        navigate('/library');
      } else {
        await api.put(`/api/vault/prompts/${id}`, payload);
        navigate('/library');
      }
      setDirty(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = (version) => {
    setTitle(version.title);
    setTags(version.tags || []);
    // Preview text was already decrypted in the history panel; re-decrypt here for consistency
    decryptPrompt(
      { encryptedPromptText: version.encryptedPromptText, iv: version.iv, salt: version.salt },
      masterSecret
    ).then(setBody);
    setDirty(true);
    setShowHistory(false);
  };

  if (!isUnlocked) return <UnlockVaultModal />;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="border-b border-vault-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-vault-text">
            {isNew ? 'New Prompt' : title || 'Edit Prompt'}
          </h1>
          <p className="text-[11px] text-vault-muted font-mono">
            {dirty ? '● Unsaved changes' : 'Saved'}
            {!isNew && current && (
              <button
                onClick={() => setShowHistory(true)}
                className="ml-3 text-vault-accent hover:underline inline-flex items-center gap-1"
              >
                <History size={11} />
                Version History
              </button>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/library')}
            className="px-3 py-2 text-sm rounded-md border border-vault-border text-vault-muted hover:text-vault-text transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-vault-accent text-vault-bg hover:bg-vault-accentDark disabled:opacity-50 transition-colors"
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Prompt'}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl w-full mx-auto space-y-5 animate-fade-in">
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
            {error}
          </p>
        )}

        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setDirty(true);
          }}
          placeholder="Prompt title"
          className="w-full bg-transparent text-2xl font-bold text-vault-text placeholder:text-vault-muted/50 focus:outline-none border-b border-vault-border focus:border-vault-accent pb-3 transition-colors"
        />

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-vault-text mb-2.5">
            <span className="w-5 h-5 rounded bg-vault-accent/15 flex items-center justify-center">
              <TagIcon size={12} className="text-vault-accent" />
            </span>
            Classification Tags
          </label>
          <div className="flex flex-wrap items-center gap-1.5 bg-vault-panel border border-vault-border rounded-lg px-3 py-2.5 focus-within:border-vault-accent focus-within:ring-1 focus-within:ring-vault-accent/30 transition-all">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 text-xs font-mono bg-vault-panelLight border border-vault-border text-vault-muted px-2.5 py-1 rounded-md"
              >
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
                  <X size={10} />
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder="Add tag..."
              className="flex-1 min-w-[100px] bg-transparent text-sm text-vault-text focus:outline-none py-1"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-vault-text mb-2.5">
            <span className="w-5 h-5 rounded bg-vault-accent/15 flex items-center justify-center">
              <Save size={11} className="text-vault-accent" />
            </span>
            Prompt Body
          </label>
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setDirty(true);
            }}
            rows={16}
            placeholder="Write the prompt content here..."
            className="w-full bg-vault-panel border border-vault-border rounded-lg px-4 py-3.5 text-sm font-mono text-vault-text leading-relaxed focus:outline-none focus:border-vault-accent focus:ring-1 focus:ring-vault-accent/30 transition-all resize-y"
          />
        </div>

        <div className="bg-vault-panel border border-vault-accent/30 rounded-lg p-4 flex items-start gap-3">
          <ShieldAlert size={16} className="text-vault-accent shrink-0 mt-0.5" />
          <p className="text-[11px] text-vault-muted leading-relaxed">
            This prompt is encrypted with your unlocked master secret before it leaves your
            browser. <span className="text-vault-text font-medium">Never sent to our servers.</span> If
            you forget your master secret, this data cannot be recovered.
          </p>
        </div>
      </div>

      {showHistory && current && (
        <VersionHistoryPanel
          currentPrompt={current}
          onClose={() => setShowHistory(false)}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
}
