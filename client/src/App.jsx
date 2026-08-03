import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { VaultSecretProvider } from './context/VaultSecretContext';
import AppLayout from './components/AppLayout';
import AuthPage from './pages/AuthPage';
import LibraryPage from './pages/LibraryPage';
import PromptEditorPage from './pages/PromptEditorPage';
import AIQueryPage from './pages/AIQueryPage';
import SettingsPage from './pages/SettingsPage';

function AuthRoute() {
  // If already logged in, skip the auth screen and go straight to the library
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/library" replace />;
  return <AuthPage />;
}

function App() {
  return (
    <AuthProvider>
      <VaultSecretProvider>
        <Routes>
          <Route path="/auth" element={<AuthRoute />} />
          <Route element={<AppLayout />}>
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/prompts/new" element={<PromptEditorPage />} />
            <Route path="/prompts/:id" element={<PromptEditorPage />} />
            <Route path="/ai-query" element={<AIQueryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/library" replace />} />
        </Routes>
      </VaultSecretProvider>
    </AuthProvider>
  );
}

export default App;
