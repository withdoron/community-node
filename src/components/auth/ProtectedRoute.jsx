import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoadingAuth, isLoadingPublicSettings, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-foreground mb-2">Sign in to continue</h1>
          <p className="text-muted-foreground mb-6">You need to be signed in to view this page.</p>
          <button
            onClick={navigateToLogin}
            className="px-6 py-3 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors min-h-[44px]"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return children;
}
