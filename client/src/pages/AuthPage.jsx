import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [teamMode, setTeamMode] = useState('create'); // 'create' | 'join'
  const [form, setForm] = useState({ email: '', password: '', teamName: '', inviteCode: '' });
  const [error, setError] = useState('');
  const [successNote, setSuccessNote] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/library');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        ...(teamMode === 'create' ? { teamName: form.teamName } : { inviteCode: form.inviteCode }),
      };
      const data = await register(payload);
      if (data.teamInviteCode) {
        setSuccessNote(`Team created. Your invite code: ${data.teamInviteCode}`);
        setTimeout(() => navigate('/library'), 2500);
      } else {
        navigate('/library');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-vault-bg dot-grid flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-vault-accent/20 flex items-center justify-center mb-3">
            <ShieldCheck size={20} className="text-vault-accent" />
          </div>
          <h1 className="text-lg font-bold text-vault-text tracking-tight">ZK-Prompt-Vault</h1>
          <p className="text-xs text-vault-muted font-mono">Zero-Knowledge Enclave Access</p>
        </div>

        <div className="bg-vault-panel border border-vault-border rounded-xl overflow-hidden">
          <div className="flex border-b border-vault-border text-xs font-mono uppercase tracking-wide">
            <button
              onClick={() => setTab('login')}
              className={`flex-1 py-3 transition-colors ${
                tab === 'login'
                  ? 'text-vault-accent border-b-2 border-vault-accent bg-vault-panelLight'
                  : 'text-vault-muted hover:text-vault-text'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setTab('register')}
              className={`flex-1 py-3 transition-colors ${
                tab === 'register'
                  ? 'text-vault-accent border-b-2 border-vault-accent bg-vault-panelLight'
                  : 'text-vault-muted hover:text-vault-text'
              }`}
            >
              Register
            </button>
          </div>

          <div className="p-5">
            {error && (
              <p className="mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            {successNote && (
              <p className="mb-3 text-xs text-vault-accent bg-vault-accent/10 border border-vault-accent/30 rounded-md px-3 py-2 font-mono">
                {successNote}
              </p>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <Field label="Email Address">
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={update('email')}
                    placeholder="operative@vault.local"
                    className="vault-input"
                  />
                </Field>
                <Field label="Access Phrase">
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={update('password')}
                    placeholder="••••••••••••"
                    className="vault-input"
                  />
                </Field>
                <button type="submit" disabled={loading} className="vault-btn-primary mt-2">
                  <LogIn size={14} />
                  {loading ? 'Authenticating...' : 'Authenticate'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <Field label="Email Address">
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={update('email')}
                    placeholder="operative@vault.local"
                    className="vault-input"
                  />
                </Field>
                <Field label="Access Phrase">
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={update('password')}
                    placeholder="At least 8 characters"
                    className="vault-input"
                  />
                </Field>

                <div className="flex text-[11px] font-mono uppercase rounded-md overflow-hidden border border-vault-border">
                  <button
                    type="button"
                    onClick={() => setTeamMode('create')}
                    className={`flex-1 py-1.5 ${
                      teamMode === 'create' ? 'bg-vault-accent/15 text-vault-accent' : 'text-vault-muted'
                    }`}
                  >
                    Create Team
                  </button>
                  <button
                    type="button"
                    onClick={() => setTeamMode('join')}
                    className={`flex-1 py-1.5 ${
                      teamMode === 'join' ? 'bg-vault-accent/15 text-vault-accent' : 'text-vault-muted'
                    }`}
                  >
                    Join with Code
                  </button>
                </div>

                {teamMode === 'create' ? (
                  <Field label="Team Name">
                    <input
                      type="text"
                      required
                      value={form.teamName}
                      onChange={update('teamName')}
                      placeholder="e.g. Platform Engineering"
                      className="vault-input"
                    />
                  </Field>
                ) : (
                  <Field label="Invite Code">
                    <input
                      type="text"
                      required
                      value={form.inviteCode}
                      onChange={update('inviteCode')}
                      placeholder="Provided by your team admin"
                      className="vault-input font-mono"
                    />
                  </Field>
                )}

                <button type="submit" disabled={loading} className="vault-btn-primary mt-2">
                  <UserPlus size={14} />
                  {loading ? 'Creating account...' : 'Register'}
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-vault-muted font-mono mt-4 tracking-wide uppercase">
          End-to-end encrypted. Zero knowledge guaranteed.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-mono uppercase tracking-wide text-vault-accent mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
