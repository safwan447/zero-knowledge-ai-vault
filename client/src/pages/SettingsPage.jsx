import { useAuth } from '../context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="flex-1 h-screen overflow-y-auto">
      <header className="border-b border-vault-border px-6 py-4">
        <h1 className="text-base font-bold text-vault-text">Settings</h1>
      </header>

      <div className="max-w-lg p-6 space-y-4">
        <div className="bg-vault-panel border border-vault-border rounded-lg p-4">
          <h2 className="text-xs font-mono uppercase tracking-wide text-vault-accent mb-3">Account</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Email" value={user?.email} />
            <Row label="Role" value={user?.role} mono />
            <Row label="Team ID" value={user?.teamId} mono />
          </dl>
        </div>

        <div className="bg-vault-panel border border-vault-border rounded-lg p-4">
          <h2 className="text-xs font-mono uppercase tracking-wide text-vault-accent mb-2">
            Security note
          </h2>
          <p className="text-xs text-vault-muted leading-relaxed">
            Your master secret is never stored, not here, not on our servers. If you forget it,
            existing encrypted prompts cannot be recovered by anyone, including you. Keep it
            somewhere safe.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between">
      <dt className="text-vault-muted">{label}</dt>
      <dd className={`text-vault-text ${mono ? 'font-mono text-xs' : ''}`}>{value || '-'}</dd>
    </div>
  );
}
