import { useState, useRef, useEffect } from 'react';
import { Terminal, Send, FileText } from 'lucide-react';
import { api } from '../api/client';
import { useVaultSecret } from '../context/VaultSecretContext';
import UnlockVaultModal from '../components/UnlockVaultModal';

export default function AIQueryPage() {
  const [messages, setMessages] = useState([]); // { role: 'user'|'assistant', text, sources? }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { masterSecret, isUnlocked } = useVaultSecret();
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || loading) return;

    setMessages((m) => [...m, { role: 'user', text: query }]);
    setInput('');
    setLoading(true);

    try {
      const data = await api.post('/api/ai/query', { query, masterSecret });
      setMessages((m) => [...m, { role: 'assistant', text: data.answer, sources: data.usedContext }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'assistant', text: `Error: ${err.message}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isUnlocked) return <UnlockVaultModal />;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <header className="border-b border-vault-border px-6 py-4">
        <h1 className="text-base font-bold text-vault-text">ZK-Prompt-Vault</h1>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
            <div className="w-10 h-10 rounded-lg bg-vault-accent/15 flex items-center justify-center mb-4">
              <Terminal size={18} className="text-vault-accent" />
            </div>
            <h2 className="text-sm font-semibold text-vault-text mb-1">Query Vault Context</h2>
            <p className="text-xs text-vault-muted leading-relaxed">
              Ask questions based on your secured prompt library. The AI will synthesize answers
              using only your decrypted vault context.
            </p>
          </div>
        )}

        <div className="max-w-2xl mx-auto space-y-4">
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="bg-vault-panel border border-vault-border rounded-lg px-4 py-3 ml-auto max-w-lg">
                <p className="text-sm text-vault-text">{m.text}</p>
              </div>
            ) : (
              <div key={i} className="space-y-2">
                <p
                  className={`text-sm leading-relaxed whitespace-pre-wrap ${
                    m.isError ? 'text-red-400' : 'text-vault-text'
                  }`}
                >
                  {m.text}
                </p>
                {m.sources?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {m.sources.map((s) => (
                      <span
                        key={s.id}
                        className="flex items-center gap-1.5 text-[11px] font-mono bg-vault-panel border border-vault-border text-vault-muted px-2 py-1 rounded"
                      >
                        <FileText size={10} className="text-vault-accent" />
                        {s.title}
                        <span className="text-vault-accent">{Math.round(s.score * 100)}%</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          )}
          {loading && <p className="text-xs text-vault-muted font-mono">Synthesizing from vault context...</p>}
        </div>
      </div>

      <form onSubmit={handleSend} className="border-t border-vault-border p-4">
        <div className="max-w-2xl mx-auto flex items-center gap-2 bg-vault-panel border border-vault-border rounded-lg px-3 py-2 focus-within:border-vault-accent transition-colors">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Query your prompt vault context..."
            className="flex-1 bg-transparent text-sm text-vault-text focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-vault-accent text-vault-bg disabled:opacity-40 hover:bg-vault-accentDark transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
        <p className="text-center text-[10px] text-vault-muted font-mono mt-2">
          AI responses are generated based strictly on available vault context.
        </p>
      </form>
    </div>
  );
}
