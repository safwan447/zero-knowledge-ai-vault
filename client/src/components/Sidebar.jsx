import { NavLink, useNavigate } from 'react-router-dom';
import { Lock, FolderOpen, MessageSquare, Settings, LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVaultSecret } from '../context/VaultSecretContext';

const navItems = [
  { to: '/library', label: 'Library', icon: FolderOpen },
  { to: '/ai-query', label: 'AI Query', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { lockVault, isUnlocked } = useVaultSecret();
  const navigate = useNavigate();

  const handleLogout = async () => {
    lockVault();
    await logout();
    navigate('/auth');
  };

  return (
    <aside className="w-60 shrink-0 bg-vault-panel border-r border-vault-border flex flex-col h-screen">
      <div className="p-4 border-b border-vault-border flex items-center gap-2">
        <div className="w-8 h-8 rounded-md bg-vault-accent/20 flex items-center justify-center">
          <ShieldCheck size={16} className="text-vault-accent" />
        </div>
        <div>
          <p className="text-sm font-semibold text-vault-text leading-tight">
            {user?.role === 'admin' ? 'Vault Admin' : 'Vault Member'}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-vault-muted font-mono">
            Zero-Knowledge Enclave
          </p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-vault-accent/10 text-vault-accent'
                  : 'text-vault-muted hover:bg-vault-panelLight hover:text-vault-text'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-vault-border space-y-2">
        <button
          onClick={lockVault}
          disabled={!isUnlocked}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium bg-vault-accent text-vault-bg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-vault-accentDark transition-colors"
        >
          <Lock size={14} />
          Lock Vault
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-vault-muted hover:text-vault-text transition-colors"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </aside>
  );
}
