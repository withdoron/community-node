import './App.css'
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Home from './pages/Home';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import JoyCoinsHistory from '@/pages/JoyCoinsHistory';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import NetworkPage from '@/pages/NetworkPage';
import Networks from '@/pages/Networks';
import JoinTeam from '@/pages/JoinTeam';
import ClaimBusiness from '@/pages/ClaimBusiness';
import ClientPortal from '@/pages/ClientPortal';
import JoinFieldService from '@/pages/JoinFieldService';
import JoinPM from '@/pages/JoinPM';
import FrequencyStation from '@/pages/FrequencyStation';
import SongDetail from '@/pages/SongDetail';
import ShapingTheGarden from '@/pages/ShapingTheGarden';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

// Pages that don't require authentication
const PUBLIC_PAGES = new Set([
  'Home', 'BusinessProfile', 'CategoryPage', 'Directory', 'Events',
  'Philosophy', 'Privacy', 'Search', 'SpokeDetails', 'Support', 'Terms',
]);

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    } else if (authError.type === 'unknown') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-bold text-foreground mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">{authError.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-medium transition-colors"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        isAuthenticated
          ? <Navigate to={createPageUrl('MyLane')} replace />
          : <LayoutWrapper currentPageName="Home"><Home /></LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => {
        const pageElement = (
          <LayoutWrapper currentPageName={path}>
            <Page />
          </LayoutWrapper>
        );
        return (
          <Route
            key={path}
            path={path === 'Admin' ? '/Admin/*' : `/${path}`}
            element={PUBLIC_PAGES.has(path) ? pageElement : <ProtectedRoute>{pageElement}</ProtectedRoute>}
          />
        );
      })}
      {/* Shareable event deep-link — reuses Events page with URL-driven modal */}
      <Route
        path="/Events/:eventId"
        element={
          <LayoutWrapper currentPageName="Events">
            {Pages.Events ? <Pages.Events /> : <PageNotFound />}
          </LayoutWrapper>
        }
      />
      <Route
        path="/my-lane/transactions"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="MyLane">
              <JoyCoinsHistory />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/networks"
        element={
          <LayoutWrapper currentPageName="Networks">
            <Networks />
          </LayoutWrapper>
        }
      />
      <Route
        path="/networks/:slug"
        element={
          <LayoutWrapper currentPageName="Networks">
            <NetworkPage />
          </LayoutWrapper>
        }
      />
      <Route
        path="/claim-business"
        element={
          <ProtectedRoute>
            <LayoutWrapper currentPageName="ClaimBusiness">
              <ClaimBusiness />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/join/:inviteCode"
        element={
          <LayoutWrapper currentPageName="JoinTeam">
            <JoinTeam />
          </LayoutWrapper>
        }
      />
      {/* Door route — human-readable workspace slug for stickers/flyers/QR codes */}
      <Route
        path="/door/:slug"
        element={
          <LayoutWrapper currentPageName="JoinTeam">
            <JoinTeam />
          </LayoutWrapper>
        }
      />
      {/* Field Service workspace join via invite code */}
      <Route
        path="/join-field-service/:inviteCode"
        element={
          <LayoutWrapper currentPageName="JoinFieldService">
            <JoinFieldService />
          </LayoutWrapper>
        }
      />
      {/* PM workspace join via invite code */}
      <Route
        path="/join-pm/:inviteCode"
        element={
          <LayoutWrapper currentPageName="JoinPM">
            <JoinPM />
          </LayoutWrapper>
        }
      />
      {/* Public client portal — shareable project/estimate/document view */}
      <Route
        path="/client-portal/:profileId/:projectId"
        element={<ClientPortal />}
      />
      <Route
        path="/client-portal"
        element={<ClientPortal />}
      />
      {/* Community spaces */}
      <Route
        path="/shaping"
        element={
          <LayoutWrapper currentPageName="Shaping">
            <ShapingTheGarden />
          </LayoutWrapper>
        }
      />
      <Route
        path="/frequency"
        element={
          <LayoutWrapper currentPageName="Frequency">
            <FrequencyStation />
          </LayoutWrapper>
        }
      />
      <Route
        path="/frequency/:slug"
        element={
          <LayoutWrapper currentPageName="Frequency">
            <SongDetail />
          </LayoutWrapper>
        }
      />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <ErrorBoundary>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <SonnerToaster position="top-center" richColors />
          <VisualEditAgent />
        </ErrorBoundary>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
