/**
 * MyLaneSurface — the organism's living surface.
 * DEC-131: Spinner-based navigation. Every header icon is a toggle.
 * Tap = overlay renders below. Tap again = rolls up. One surface, two axes.
 * Nothing navigates away from MyLane. Everything renders in place.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import {
  Home, UtensilsCrossed, HardHat, DollarSign, Users,
  Store, Search, Music, Settings, LogOut, FileText,
  Lock, Mail, Volume2, VolumeX, Building2, X, PanelRightOpen, FlaskConical, BookOpen, HelpCircle,
  Compass,
} from 'lucide-react';
import ConfirmationCard from './ConfirmationCard';
import DevLab from './DevLab';
import MyLaneDrillView from './MyLaneDrillView';
import WorkspaceErrorBoundary from '@/components/WorkspaceErrorBoundary';
import useMyLaneState from './useMyLaneState';
import SpaceSpinner from './SpaceSpinner';
import HomeFeed from './HomeFeed';
import DiscoverPosition from './DiscoverPosition';
import { parseRenderInstruction } from './parseRenderInstruction';
import { renderEntityView } from './renderEntityView';
import { useFrequency } from '@/contexts/FrequencyContext';
import { useActiveBusiness } from '@/hooks/useActiveBusiness';
import CommandBar from './CommandBar';
import useBottomInset, { HEADER_HEIGHT, MINI_PLAYER_HEIGHT, COMMAND_BAR_HEIGHT } from '@/hooks/useBottomInset';

// R&D allowlist for Mylane AI agent. Manual Mylane is the default experience.
// Add testers here as agent matures. Gate by email, not role or tier.
const MYLANE_AGENT_ALLOWLIST = ['doron.bsg@gmail.com'];

// Lazy-load overlay content — these are full page components rendered inline
const DirectoryPage = lazy(() => import('@/pages/Directory'));
const EventsPage = lazy(() => import('@/pages/Events'));
const FrequencyStationPage = lazy(() => import('@/pages/FrequencyStation'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const BusinessProfilePage = lazy(() => import('@/pages/BusinessProfile'));
const PhilosophyPage = lazy(() => import('@/pages/Philosophy'));
const SupportPage = lazy(() => import('@/pages/Support'));
const RecommendPage = lazy(() => import('@/pages/Recommend'));
const NetworkPageComponent = lazy(() => import('@/pages/NetworkPage'));

// Map workspace type IDs to spinner item config
const SPACE_CONFIG = {
  home:              { id: 'home',           label: 'Home',      icon: Home },
  'meal-prep':       { id: 'meal-prep',      label: 'Kitchen',   icon: UtensilsCrossed },
  'field-service':   { id: 'field-service',  label: 'Jobsite',   icon: HardHat },
  finance:           { id: 'finance',        label: 'Finances',  icon: DollarSign },
  team:              { id: 'team',           label: 'Team',      icon: Users },
  business:          { id: 'business',       label: 'Business',  icon: Store, dim: true },
  discover:          { id: 'discover',       label: 'Discover',  icon: Search, dim: true },
  'dev-lab':         { id: 'dev-lab',        label: 'Dev Lab',   icon: FlaskConical, dim: true },
};

function buildSpinnerItems(profiles, ownedBusinesses = [], userRole = null) {
  const items = [SPACE_CONFIG.home];
  if (profiles.mealPrepProfiles?.length > 0) items.push(SPACE_CONFIG['meal-prep']);
  if (profiles.fieldServiceProfiles?.length > 0) items.push(SPACE_CONFIG['field-service']);
  if (profiles.financeProfiles?.length > 0) items.push(SPACE_CONFIG.finance);
  if (profiles.allTeams?.length > 0) items.push(SPACE_CONFIG.team);
  if (ownedBusinesses.length > 0) items.push({ ...SPACE_CONFIG.business, dim: false });
  if (profiles.propertyMgmtProfiles?.length > 0) items.push({ id: 'property-pulse', label: 'Property', icon: Building2 });
  items.push(SPACE_CONFIG.discover);
  // Admin-only: Dev Lab
  if (userRole === 'admin') items.push(SPACE_CONFIG['dev-lab']);
  return items;
}

// Space the business-switcher tiles use while in switcher mode. Reuses the
// Store glyph so the cockpit vocabulary stays consistent; businesses ride
// the same SpaceSpinner that spaces do.
function buildBusinessSwitcherItems(ownedBusinesses) {
  return ownedBusinesses.map((b) => ({
    id: b.id,
    label: b.name || b.business_name || 'Business',
    icon: Store,
  }));
}

// ─── Overlay system ────────────────────────────────────────────────
// Every header icon is a toggle. Only one overlay open at a time.
// Add new overlays here — the rest of the system picks them up automatically.
const OV = {
  FREQ: 'freq',
  DIR: 'dir',
  EVT: 'evt',
  ACCT: 'acct',
  PHILOSOPHY: 'philosophy',
  SUPPORT: 'support',
  NETWORK: 'network',
};

function OverlayContainer({ isOpen, keepMounted = false, onClose, bottomInset = 0, children }) {
  if (!isOpen && !keepMounted) return null;
  // On desktop (container >= 1024px), overlays render as centered floating panels
  // On mobile, they fill the full area below the header and above the bottom UI stack
  return (
    <>
      {/* Backdrop dim — click to close */}
      <div
        className="absolute inset-0 z-30"
        onClick={isOpen && onClose ? (e) => { if (e.target === e.currentTarget) onClose(); } : undefined}
        style={{
          background: isOpen ? 'rgba(0,0,0,0.4)' : 'transparent',
          pointerEvents: isOpen ? 'auto' : 'none',
          opacity: isOpen ? 1 : 0,
          transition: 'opacity 0.25s ease',
        }}
      />
      {/* Overlay panel — contained within the shell frame (below header, above bottom UI) */}
      <div
        className="overlay-panel absolute z-40 flex flex-col overflow-y-auto"
        style={{
          top: HEADER_HEIGHT,
          left: 0,
          right: 0,
          bottom: bottomInset,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'var(--ll-bg-overlay)',
          backdropFilter: 'blur(12px)',
          animation: isOpen ? 'overlaySlideDown 0.35s ease' : undefined,
          display: isOpen ? 'flex' : 'none',
          transition: 'bottom 0.2s ease-out',
        }}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close overlay"
            className="flex items-center justify-center"
            style={{
              position: 'absolute', top: 8, right: 8, zIndex: 1,
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--ll-bg-elevated, rgba(255,255,255,0.04))',
              border: '1px solid var(--ll-border)',
              color: 'var(--ll-text-dim)',
              cursor: 'pointer', padding: 0,
            }}
          >
            <X style={{ width: 16, height: 16 }} strokeWidth={1.75} />
          </button>
        )}
        {children}
      </div>
    </>
  );
}

// Account overlay — replaces gear icon. Same toggle pattern as everything else.
// Settings renders inline. About + Legal open as overlays. Nothing navigates away.
function AccountOverlay({ currentUser, onClose, onOpenOverlay }) {
  const [showSettings, setShowSettings] = useState(false);
  const [showNewsletter, setShowNewsletter] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => {
    try { return localStorage.getItem('ll_theme') || 'dark'; } catch { return 'dark'; }
  });
  const THEME_LABELS = { dark: 'Gold Standard', light: 'Cloud', fallout: 'Fallout' };
  const [currentCockpit, setCurrentCockpit] = useState(() => {
    try { return localStorage.getItem('ll_cockpit') || 'spinner'; } catch { return 'spinner'; }
  });
  const COCKPIT_LABELS = { spinner: 'Spinner', compass: 'Compass' };
  const [soundOn, setSoundOn] = useState(() => {
    try { return localStorage.getItem('mylane_sound') !== '0'; } catch { return true; }
  });
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    try { localStorage.setItem('mylane_sound', next ? '1' : '0'); } catch {}
  };

  const handleLogout = async () => {
    try {
      await base44.auth.signOut();
      window.location.href = '/';
    } catch {
      window.location.href = '/';
    }
  };

  // Settings rendered inline — full page component inside the overlay
  if (showSettings) {
    return (
      <div style={{ padding: '0' }}>
        <div className="flex items-center gap-2" style={{ padding: '16px 24px', borderBottom: '1px solid var(--ll-border)' }}>
          <button
            type="button"
            onClick={() => setShowSettings(false)}
            style={{ fontSize: 12, color: 'var(--ll-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
          >
            ← Account
          </button>
        </div>
        <div className="overlay-page-content">
          <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--ll-text-ghost)', fontSize: 12 }}>Loading...</div>}>
            <SettingsPage />
          </Suspense>
        </div>
      </div>
    );
  }

  // Helper: open URL in new tab (for legal pages)
  const openNewTab = (pageName) => {
    window.open(createPageUrl(pageName), '_blank');
  };

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--ll-text-primary)', marginBottom: 20 }}>
        Account
      </div>

      {/* Preferences */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--ll-text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 500 }}>
          Preferences
        </div>
        <div
          className="flex items-center gap-2.5 cursor-pointer rounded-lg"
          style={{ padding: '10px 12px', transition: 'background 0.15s' }}
          onClick={() => setShowSettings(true)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ll-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Settings style={{ width: 16, height: 16, color: 'var(--ll-text-dim)', flexShrink: 0 }} strokeWidth={1.5} />
          <div>
            <div style={{ fontSize: 13, color: 'var(--ll-text-secondary)' }}>Settings</div>
            <div style={{ fontSize: 10, color: 'var(--ll-text-ghost)' }}>Profile, notifications, billing</div>
          </div>
        </div>
        <div
          className="flex items-center gap-2.5 cursor-pointer rounded-lg"
          style={{ padding: '10px 12px', transition: 'background 0.15s' }}
          onClick={() => setShowNewsletter((v) => !v)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ll-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Mail style={{ width: 16, height: 16, color: 'var(--ll-text-dim)', flexShrink: 0 }} strokeWidth={1.5} />
          <div>
            <div style={{ fontSize: 13, color: 'var(--ll-text-secondary)' }}>Newsletter</div>
            <div style={{ fontSize: 10, color: 'var(--ll-text-ghost)' }}>The Good News</div>
          </div>
        </div>
        {showNewsletter && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const value = newsletterEmail.trim().toLowerCase();
              if (!value || !value.includes('@') || !value.includes('.') || value.length < 6) {
                toast.error('Please enter a valid email address.');
                return;
              }
              setNewsletterSubmitting(true);
              try {
                const allSubs = await base44.entities.NewsletterSubscriber.list();
                const exists = (Array.isArray(allSubs) ? allSubs : []).some(
                  (s) => (s.email || '').toLowerCase() === value
                );
                if (exists) {
                  toast.success("You're already subscribed!");
                  setNewsletterEmail('');
                  setShowNewsletter(false);
                  return;
                }
                await base44.entities.NewsletterSubscriber.create({
                  email: value,
                  subscribed_at: new Date().toISOString(),
                  source: 'account-overlay',
                  user_id: currentUser?.id || null,
                  first_name: currentUser?.full_name?.split(' ')[0] || null,
                  is_active: true,
                });
                toast.success("You're in! Welcome to The Good News.");
                setNewsletterEmail('');
                setShowNewsletter(false);
              } catch {
                toast.error('Something went wrong. Try again?');
              } finally {
                setNewsletterSubmitting(false);
              }
            }}
            style={{ padding: '4px 12px 10px 36px', display: 'flex', gap: 6 }}
          >
            <input
              type="email"
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={newsletterSubmitting}
              style={{
                flex: 1, fontSize: 16, padding: '6px 10px', borderRadius: 8,
                background: 'var(--ll-bg-surface)', border: '1px solid var(--ll-border)',
                color: 'var(--ll-text-primary)', outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={newsletterSubmitting}
              style={{
                fontSize: 12, padding: '6px 12px', borderRadius: 8,
                background: 'var(--ll-accent)', border: 'none',
                color: 'var(--ll-bg-base)', cursor: 'pointer', fontWeight: 500,
              }}
            >
              {newsletterSubmitting ? '…' : 'Subscribe'}
            </button>
          </form>
        )}
        <div
          className="flex items-center gap-2.5 cursor-pointer rounded-lg"
          style={{ padding: '10px 12px', transition: 'background 0.15s' }}
          onClick={toggleSound}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ll-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {soundOn
            ? <Volume2 style={{ width: 16, height: 16, color: 'var(--ll-text-dim)', flexShrink: 0 }} strokeWidth={1.5} />
            : <VolumeX style={{ width: 16, height: 16, color: 'var(--ll-text-dim)', flexShrink: 0 }} strokeWidth={1.5} />
          }
          <div>
            <div style={{ fontSize: 13, color: 'var(--ll-text-secondary)' }}>Sound &amp; haptics</div>
            <div style={{ fontSize: 10, color: 'var(--ll-text-ghost)' }}>{soundOn ? 'On' : 'Off'}</div>
          </div>
        </div>
        <div
          className="flex items-center gap-2.5 cursor-pointer rounded-lg"
          style={{ padding: '10px 12px', transition: 'background 0.15s' }}
          onClick={() => {
            const THEMES = ['dark', 'light', 'fallout'];
            const nextIdx = (THEMES.indexOf(currentTheme) + 1) % THEMES.length;
            const next = THEMES[nextIdx];
            document.documentElement.setAttribute('data-theme', next);
            try { localStorage.setItem('ll_theme', next); } catch {}
            setCurrentTheme(next);
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ll-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg style={{ width: 16, height: 16, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="var(--ll-text-dim)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
          </svg>
          <div>
            <div style={{ fontSize: 13, color: 'var(--ll-text-secondary)' }}>Theme</div>
            <div style={{ fontSize: 10, color: 'var(--ll-text-ghost)' }}>{THEME_LABELS[currentTheme] || 'Gold Standard'}</div>
          </div>
        </div>
        {/* Cockpit — the instrument you operate Mylane from. Theme paints the panel; cockpit picks the instruments. */}
        <div
          className="flex items-center gap-2.5 cursor-pointer rounded-lg"
          style={{ padding: '10px 12px', transition: 'background 0.15s' }}
          onClick={() => {
            const COCKPITS = ['spinner', 'compass'];
            const nextIdx = (COCKPITS.indexOf(currentCockpit) + 1) % COCKPITS.length;
            const next = COCKPITS[nextIdx];
            document.documentElement.setAttribute('data-cockpit', next);
            try { localStorage.setItem('ll_cockpit', next); } catch {}
            setCurrentCockpit(next);
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ll-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Compass style={{ width: 16, height: 16, color: 'var(--ll-text-dim)', flexShrink: 0 }} strokeWidth={1.5} />
          <div>
            <div style={{ fontSize: 13, color: 'var(--ll-text-secondary)' }}>Cockpit</div>
            <div style={{ fontSize: 10, color: 'var(--ll-text-ghost)' }}>{COCKPIT_LABELS[currentCockpit] || 'Spinner'}</div>
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--ll-border)', margin: '8px 0' }} />

      {/* About — identity pages rendered as overlays inside the shell */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--ll-text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 500 }}>
          About
        </div>
        <div
          className="flex items-center gap-2.5 cursor-pointer rounded-lg"
          style={{ padding: '10px 12px', transition: 'background 0.15s' }}
          onClick={() => onOpenOverlay?.(OV.PHILOSOPHY)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ll-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <BookOpen style={{ width: 16, height: 16, color: 'var(--ll-text-dim)', flexShrink: 0 }} strokeWidth={1.5} />
          <div style={{ fontSize: 13, color: 'var(--ll-text-secondary)' }}>Philosophy</div>
        </div>
        <div
          className="flex items-center gap-2.5 cursor-pointer rounded-lg"
          style={{ padding: '10px 12px', transition: 'background 0.15s' }}
          onClick={() => onOpenOverlay?.(OV.SUPPORT)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ll-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <HelpCircle style={{ width: 16, height: 16, color: 'var(--ll-text-dim)', flexShrink: 0 }} strokeWidth={1.5} />
          <div style={{ fontSize: 13, color: 'var(--ll-text-secondary)' }}>Support</div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--ll-border)', margin: '8px 0' }} />

      {/* Legal — opens in new tab (acceptable for legal pages) */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--ll-text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8, fontWeight: 500 }}>
          Legal
        </div>
        <div
          className="flex items-center gap-2.5 cursor-pointer rounded-lg"
          style={{ padding: '10px 12px', transition: 'background 0.15s' }}
          onClick={() => openNewTab('Terms')}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ll-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <FileText style={{ width: 16, height: 16, color: 'var(--ll-text-dim)', flexShrink: 0 }} strokeWidth={1.5} />
          <div style={{ fontSize: 13, color: 'var(--ll-text-secondary)' }}>Terms of service</div>
        </div>
        <div
          className="flex items-center gap-2.5 cursor-pointer rounded-lg"
          style={{ padding: '10px 12px', transition: 'background 0.15s' }}
          onClick={() => openNewTab('Privacy')}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ll-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Lock style={{ width: 16, height: 16, color: 'var(--ll-text-dim)', flexShrink: 0 }} strokeWidth={1.5} />
          <div style={{ fontSize: 13, color: 'var(--ll-text-secondary)' }}>Privacy</div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--ll-border)', margin: '8px 0' }} />

      {/* Logout */}
      <div
        className="flex items-center gap-2.5 cursor-pointer rounded-lg"
        style={{ padding: '10px 12px', transition: 'background 0.15s' }}
        onClick={handleLogout}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ll-bg-elevated)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <LogOut style={{ width: 16, height: 16, color: 'var(--ll-danger)', flexShrink: 0 }} strokeWidth={1.5} />
        <div style={{ fontSize: 13, color: 'var(--ll-danger)' }}>Log out</div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────
export default function MyLaneSurface({
  currentUser,
  financeProfiles = [],
  fieldServiceProfiles = [],
  allTeams = [],
  propertyMgmtProfiles = [],
  mealPrepProfiles = [],
  agentMessageRef,
  onDoorOpen = null,
  warmEntryWizardPage = null,
}) {
  const navigate = useNavigate();
  const profiles = { financeProfiles, fieldServiceProfiles, allTeams, propertyMgmtProfiles, mealPrepProfiles };
  // Business scope — one source of truth. DEC-168 (cockpit-native switcher)
  // and Living Feet (DEC-146) both depend on no consumer re-deriving this.
  const { ownedBusinesses, activeBusiness, setActiveBusiness, isMultiBusiness } = useActiveBusiness(currentUser);
  const freq = useFrequency();
  const frequencyPlaying = freq?.isEnabled || false;
  const frequencyIsPlaying = freq?.isPlaying || false; // actual audio playing

  // AI agent gated to R&D allowlist — manual Mylane is the default for everyone else
  const agentEnabled = MYLANE_AGENT_ALLOWLIST.includes(currentUser?.email);

  // Bottom UI stack height — one computation, many consumers (Living Feet)
  const bottomInset = useBottomInset(agentEnabled);

  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [drilledTab, setDrilledTab] = useState('home'); // tab/view from TYPE 1 RENDER or spinner nav
  const [renderedData, setRenderedData] = useState(null);
  const [commandResult, setCommandResult] = useState(null); // { type: 'text'|'data'|'confirm', text?, entity?, data?, ... }
  const [panelOpen, setPanelOpen] = useState(() => {
    try { return localStorage.getItem('mylane_panel') !== '0'; } catch { return true; }
  });
  const [showPhysicsTuner, setShowPhysicsTuner] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState(null); // OV.* key or null
  const [overlayBusinessId, setOverlayBusinessId] = useState(null); // stacked BusinessProfile drill-in
  const [overlayRecommend, setOverlayRecommend] = useState(null); // stacked Recommend {businessId, mode} or null
  const [overlayNetworkSlug, setOverlayNetworkSlug] = useState(null); // stacked NetworkPage drill-in
  const [welcomeData, setWelcomeData] = useState(() => {
    try {
      const raw = localStorage.getItem('mylane_welcome');
      if (raw) { localStorage.removeItem('mylane_welcome'); return JSON.parse(raw); }
    } catch {}
    return null;
  });
  // Business-switcher mode (DEC-168). Declared up here with the other state
  // so the Escape useEffect below can read switcherMode in its deps without
  // tripping the TDZ — order of useState matters during the first render.
  const [switcherMode, setSwitcherMode] = useState(false);
  const [switcherFocusIdx, setSwitcherFocusIdx] = useState(0);
  const drillStartRef = useRef(null);

  const {
    trackCardTap,
    trackDrillTime,
    trackMessage,
    getLastVisited,
    setLastVisited,
  } = useMyLaneState();

  // Record visit on mount
  useEffect(() => {
    const t = setTimeout(() => setLastVisited(), 500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Dispatch agent-active
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('agent-active', { detail: true }));
    return () => { window.dispatchEvent(new CustomEvent('agent-active', { detail: false })); };
  }, []);

  // Message frequency tracking
  useEffect(() => {
    const handler = () => trackMessage();
    window.addEventListener('mylane-user-message', handler);
    return () => window.removeEventListener('mylane-user-message', handler);
  }, [trackMessage]);

  // Close overlay on Escape — unwind stack: Network/Recommend → BusinessProfile → base overlay → switcher
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (overlayNetworkSlug) { setOverlayNetworkSlug(null); return; }
        if (overlayRecommend) { setOverlayRecommend(null); return; }
        if (overlayBusinessId) { setOverlayBusinessId(null); return; }
        if (activeOverlay) { setActiveOverlay(null); return; }
        if (switcherMode) { setSwitcherMode(false); }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeOverlay, overlayBusinessId, overlayRecommend, overlayNetworkSlug, switcherMode]);

  // FrequencyMiniPlayer tap → open frequency overlay inside the shell
  useEffect(() => {
    const handler = () => setActiveOverlay(OV.FREQ);
    window.addEventListener('frequency-open-fullview', handler);
    return () => window.removeEventListener('frequency-open-fullview', handler);
  }, []);

  // Build spinner items
  const spaceItems = useMemo(
    () => buildSpinnerItems(profiles, ownedBusinesses, currentUser?.role),
    [profiles, ownedBusinesses, currentUser?.role]
  );

  // ─── Business-switcher mode (DEC-168) ──────────────────────────────
  // Cockpit-native: Spinner dissolves its space tiles and reforms with
  // ownedBusinesses. Only wakes when isMultiBusiness is true — single-
  // business users never see the affordance (Dark Until Explored, DEC-117).
  // State declarations live with the other useState calls near the top of
  // the component so earlier hooks can depend on them without TDZ.

  const businessItems = useMemo(
    () => buildBusinessSwitcherItems(ownedBusinesses),
    [ownedBusinesses]
  );

  // When entering switcher mode, focus the currently active business so the
  // three visible tiles are prev/current/next around the user's real context.
  const enterSwitcher = useCallback(() => {
    if (!isMultiBusiness) return;
    const idx = activeBusiness
      ? ownedBusinesses.findIndex((b) => b.id === activeBusiness.id)
      : 0;
    setSwitcherFocusIdx(Math.max(0, idx));
    setSwitcherMode(true);
  }, [isMultiBusiness, activeBusiness, ownedBusinesses]);

  const exitSwitcher = useCallback(() => setSwitcherMode(false), []);

  // SpaceSpinner's onSelect fires on tile taps. For the business switcher:
  //   - tapping the centered tile commits the business (via onCenterTap,
  //     which SpaceSpinner routes through handlePointerUp; a direct onSelect
  //     call with the centered index also commits for keyboard/programmatic
  //     callers)
  //   - tapping a neighbor rotates the focus (does not commit)
  const handleSwitcherSelect = useCallback((idx) => {
    if (idx === switcherFocusIdx) {
      // Commit: write active business, exit switcher, snap to Home. Spinner
      // reforms with the new business's spaces; space-mode content re-renders
      // because every consumer reads through useActiveBusiness (Living Feet).
      const target = ownedBusinesses[idx];
      if (target) setActiveBusiness(target.id);
      setSwitcherMode(false);
      setSpinnerIndex(0); // Home = index 0 of spaceItems
      setDrilledTab('home');
      setRenderedData(null);
    } else {
      setSwitcherFocusIdx(idx);
    }
  }, [switcherFocusIdx, ownedBusinesses, setActiveBusiness]);

  const currentSpace = spaceItems[spinnerIndex] || spaceItems[0];

  // Toggle overlay — only one at a time. Clear stacked overlays on any switch.
  const toggleOverlay = useCallback((name) => {
    setOverlayNetworkSlug(null);
    setOverlayRecommend(null);
    setOverlayBusinessId(null);
    setActiveOverlay((prev) => prev === name ? null : name);
  }, []);

  const closeOverlay = useCallback(() => { setOverlayNetworkSlug(null); setOverlayRecommend(null); setOverlayBusinessId(null); setActiveOverlay(null); }, []);

  // Handle spinner navigation
  const handleSpinnerSelect = useCallback((idx, tab) => {
    setSpinnerIndex(idx);
    setDrilledTab(tab || 'home');
    setRenderedData(null);
    setOverlayNetworkSlug(null);
    setOverlayRecommend(null);
    setOverlayBusinessId(null);
    setActiveOverlay(null); // close any overlay when navigating
    drillStartRef.current = Date.now();
  }, []);

  const handleOpenSpace = useCallback((idx) => {
    if (idx >= 0 && idx < spaceItems.length) handleSpinnerSelect(idx);
  }, [spaceItems.length, handleSpinnerSelect]);

  const handleLogoClick = useCallback(() => {
    setActiveOverlay(null);
    handleSpinnerSelect(0);
  }, [handleSpinnerSelect]);

  // Agent messages
  const showRenderedData = useCallback((dataSpec) => { setRenderedData(dataSpec); }, []);
  const lastProcessedRef = useRef(null);
  const handleAgentMessage = useCallback((msg) => {
    if (!msg?.content || msg.id === lastProcessedRef.current) return;
    const result = parseRenderInstruction(msg.content);
    if (!result.hasRender) return;
    lastProcessedRef.current = msg.id;
    if (result.type === 'data') {
      showRenderedData({ entity: result.entity, workspace: result.workspace, data: result.data, displayHint: result.displayHint });
    } else {
      const targetIdx = spaceItems.findIndex((s) => s.id === result.workspace);
      if (targetIdx >= 0) handleSpinnerSelect(targetIdx);
    }
  }, [spaceItems, handleSpinnerSelect, showRenderedData]);

  useEffect(() => {
    if (agentMessageRef) agentMessageRef.current = handleAgentMessage;
  }, [agentMessageRef, handleAgentMessage]);

  const activeSpaceIds = useMemo(() => spaceItems.map((s) => s.id), [spaceItems]);
  const neighborCount = 22;

  // User initial for avatar
  const userInitial = currentUser?.display_name?.[0] || currentUser?.full_name?.[0] || currentUser?.email?.[0] || '?';

  // Space label map for welcome card
  const WELCOME_LABELS = {
    'team': 'team', 'field-service': 'jobsite', 'property-pulse': 'property',
    'finance': 'finances', 'meal-prep': 'kitchen', 'business': 'business',
  };

  // Navigate spinner to a space by ID (for welcome card)
  const goToSpace = useCallback((spaceId) => {
    const idx = spaceItems.findIndex((s) => s.id === spaceId);
    if (idx >= 0) handleSpinnerSelect(idx);
    setWelcomeData(null);
  }, [spaceItems, handleSpinnerSelect]);

  // Render workspace content
  const renderContent = () => {
    if (renderedData) {
      return renderEntityView({
        data: renderedData.data, entity: renderedData.entity,
        workspace: renderedData.workspace, displayHint: renderedData.displayHint,
      });
    }
    const space = currentSpace;
    if (space.id === 'home') {
      return (
        <>
          {/* Post-join welcome card — shows once after invite accept */}
          {welcomeData && (
            <div
              style={{
                margin: '0 20px 12px', padding: '14px 16px',
                background: 'var(--ll-bg-surface)', border: '1px solid var(--ll-border-hover)',
                borderRadius: 10,
              }}
            >
              <div className="flex items-start justify-between">
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ll-text-primary)' }}>
                    Welcome to {welcomeData.name}!
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ll-text-dim)', marginTop: 2 }}>
                    Swipe the spinner to find your {WELCOME_LABELS[welcomeData.space] || 'space'}.
                  </div>
                  <button
                    type="button"
                    onClick={() => goToSpace(welcomeData.space)}
                    style={{
                      marginTop: 8, fontSize: 12, fontWeight: 500, color: 'var(--ll-accent)',
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    }}
                  >
                    Go to {WELCOME_LABELS[welcomeData.space] || 'space'} →
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setWelcomeData(null)}
                  style={{
                    background: 'none', border: 'none', padding: '2px 4px',
                    cursor: 'pointer', color: 'var(--ll-text-ghost)', fontSize: 14,
                  }}
                >
                  <X style={{ width: 14, height: 14 }} strokeWidth={2} />
                </button>
              </div>
            </div>
          )}
          <HomeFeed
            profiles={profiles} spaceItems={spaceItems}
            onOpenSpace={handleOpenSpace} neighborCount={neighborCount}
            userId={currentUser?.id}
          />
        </>
      );
    }
    if (space.id === 'discover') {
      return <DiscoverPosition activeSpaceIds={activeSpaceIds} />;
    }
    if (space.id === 'dev-lab') {
      return (
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <FlaskConical style={{ width: 20, height: 20, color: 'hsl(var(--primary))' }} strokeWidth={1.5} />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>Dev Lab</h2>
              <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                Physics tuner is above — use the flask button below the spinner
              </p>
            </div>
          </div>
        </div>
      );
    }
    return (
      <WorkspaceErrorBoundary workspace={space.label || space.id}>
        <MyLaneDrillView
          drilledView={{ workspace: space.id, view: drilledTab, tab: drilledTab }}
          currentUser={currentUser}
          fieldServiceProfiles={fieldServiceProfiles}
          financeProfiles={financeProfiles}
          allTeams={allTeams}
          propertyMgmtProfiles={propertyMgmtProfiles}
          mealPrepProfiles={mealPrepProfiles}
        />
      </WorkspaceErrorBoundary>
    );
  };

  return (
    <div className="mylane-surface flex flex-col relative" style={{ background: 'var(--ll-bg-base, #020617)', height: '100vh', overflow: 'hidden', containerType: 'inline-size' }}>
      {/* Keyframes + container queries + theme variables */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes overlaySlideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fpulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes pulse { 0%, 100% { opacity: 0.2; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
        /* Suppress page headers when rendered inside overlays */
        .overlay-page-content > div > .mb-6:first-child { display: none; }
        .overlay-page-content > div > .flex.items-center.gap-3.mb-6:first-child { display: none; }
        .overlay-page-content > div > .sticky:first-child { display: none; }
        /* Suppress auth gates and min-h-screen in overlay context + horizontal containment */
        .overlay-page-content > div { min-height: auto !important; background: transparent !important; padding-left: 16px; padding-right: 16px; }

        /* ─── Container queries ─── */
        .mylane-surface { container-type: inline-size; }

        /* Default: phone-size — overlays fullscreen */
        .mylane-surface { --ll-content-max: 100%; --ll-content-pad: 16px; }

        /* Tablet+ (container >= 640px) */
        @container (min-width: 640px) {
          .mylane-surface { --ll-content-max: 640px; --ll-content-pad: 24px; }
        }

        /* Desktop (container >= 1024px) — overlays become centered panels */
        @container (min-width: 1024px) {
          .mylane-surface { --ll-content-max: 768px; --ll-content-pad: 32px; }
          .overlay-panel {
            top: 60px !important; bottom: 24px !important;
            left: 50% !important; right: auto !important;
            transform: translateX(-50%);
            width: 640px; max-width: calc(100% - 48px);
            border-radius: 16px;
            border: 1px solid var(--ll-border);
            box-shadow: 0 24px 64px rgba(0,0,0,0.3);
          }
        }

        /* Wide (container >= 1280px) */
        @container (min-width: 1280px) {
          .mylane-surface { --ll-content-max: 960px; }
          .overlay-panel { width: 720px; }
        }

        /* ─── Command bar / panel responsive switch ─── */
        /* Mobile default: show bar, hide panel */
        .mylane-bar-mobile { display: block; margin-top: auto; }
        .mylane-panel-fixed { display: none; }
        .mylane-reopen-tab { display: none; }

        /* Desktop (container >= 1024px): hide bar, show fixed panel */
        @container (min-width: 1024px) {
          .mylane-bar-mobile { display: none !important; }
          .mylane-panel-fixed { display: flex; }
          .mylane-panel-fixed.panel-closed { display: none; }
          .mylane-content-area.panel-open { margin-right: 300px; }
          .mylane-reopen-tab { display: flex; }
          .mylane-reopen-tab.panel-open { display: none; }
        }
      ` }} />

      {/* ─── Header ─── */}
      <div
        className="flex justify-between items-center relative z-50"
        style={{ padding: '10px 24px', borderBottom: '1px solid var(--ll-border)', background: 'var(--ll-bg-base)' }}
      >
        {switcherMode ? (
          <button
            type="button"
            onClick={exitSwitcher}
            className="cursor-pointer select-none active:opacity-60"
            style={{
              background: 'none', border: 'none', padding: 0,
              fontSize: 13, color: 'var(--ll-text-dim)', fontWeight: 400,
            }}
          >
            ‹ back
          </button>
        ) : (
          <div
            className="cursor-pointer select-none active:opacity-60"
            onClick={handleLogoClick}
            style={{ fontSize: 15, fontWeight: 500, color: 'var(--ll-text-primary)' }}
          >
            <span style={{ color: 'var(--ll-accent)', fontWeight: 700 }}>Local</span> Lane
          </div>
        )}
        {switcherMode && (
          <div
            className="absolute left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap"
            style={{
              fontSize: 11, fontStyle: 'italic', color: 'var(--ll-text-ghost)',
              letterSpacing: '0.3px',
            }}
          >
            {activeBusiness?.name
              ? <>operating as <span style={{ color: 'var(--ll-text-dim)' }}>{activeBusiness.name}</span></>
              : 'select a business'}
          </div>
        )}
        <div className="flex items-center" style={{ gap: 4 }}>
          {/* Music / Directory / Events collapse while switching business —
              header shows back + "operating as" + avatar only (DEC-168). */}
          {!switcherMode && (
            <>
              {/* Music icon — 44px tap zone */}
              <div
                className="cursor-pointer relative flex items-center justify-center"
                style={{ minWidth: 44, minHeight: 44 }}
                onClick={() => toggleOverlay(OV.FREQ)}
              >
                <Music
                  style={{ width: 14, height: 14, transition: 'color 0.2s' }}
                  strokeWidth={1.5}
                  color={activeOverlay === OV.FREQ ? 'var(--ll-accent)' : 'var(--ll-text-dim)'}
                />
                {frequencyPlaying && (
                  <div style={{
                    position: 'absolute', width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--ll-accent)', top: 6, right: 6,
                    animation: 'fpulse 2s infinite',
                  }} />
                )}
              </div>

              {/* Directory — 44px tap zone */}
              <div
                className="cursor-pointer flex items-center justify-center"
                style={{ minWidth: 44, minHeight: 44 }}
                onClick={() => toggleOverlay(OV.DIR)}
              >
                <span style={{
                  fontSize: 12, transition: 'color 0.2s',
                  color: activeOverlay === OV.DIR ? 'var(--ll-accent)' : 'var(--ll-text-dim)',
                }}>
                  Directory
                </span>
              </div>

              {/* Events — 44px tap zone */}
              <div
                className="cursor-pointer flex items-center justify-center"
                style={{ minWidth: 44, minHeight: 44 }}
                onClick={() => toggleOverlay(OV.EVT)}
              >
                <span style={{
                  fontSize: 12, transition: 'color 0.2s',
                  color: activeOverlay === OV.EVT ? 'var(--ll-accent)' : 'var(--ll-text-dim)',
                }}>
                  Events
                </span>
              </div>
            </>
          )}

          {/* Avatar — 44px tap zone, 36px visual circle */}
          <div
            className="cursor-pointer flex items-center justify-center"
            style={{ minWidth: 44, minHeight: 44 }}
            onClick={() => toggleOverlay(OV.ACCT)}
          >
            <div
              className="flex items-center justify-center select-none"
              style={{
                width: 36, height: 36, borderRadius: '50%',
                border: `1.5px solid ${activeOverlay === OV.ACCT ? 'var(--ll-accent)' : 'var(--ll-border-active)'}`,
                fontSize: 12, transition: 'border-color 0.2s, color 0.2s',
                color: activeOverlay === OV.ACCT ? 'var(--ll-accent)' : 'var(--ll-text-muted)',
              }}
            >
              {userInitial.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Overlay system ─── */}
      {/* Page headers are suppressed inside overlays via [data-overlay] > div > .mb-6:first-child CSS */}

      {/* Frequency Station overlay — keepMounted so audio state persists */}
      <OverlayContainer isOpen={activeOverlay === OV.FREQ} keepMounted onClose={closeOverlay} bottomInset={bottomInset}>
        <div style={{ padding: 24, maxWidth: 640 }}>
          {/* Title row with on/off toggle */}
          <div className="flex justify-between items-center" style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--ll-text-primary)' }}>Frequency station</div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 11, color: 'var(--ll-text-dim)' }}>{frequencyPlaying ? 'On' : 'Off'}</span>
              <div
                className="cursor-pointer relative"
                style={{
                  width: 40, height: 22, borderRadius: 11,
                  background: frequencyPlaying ? 'var(--ll-accent-bg)' : 'var(--ll-border-hover)',
                  transition: 'background 0.2s',
                }}
                onClick={() => freq?.toggle()}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', position: 'absolute', top: 2,
                  left: frequencyPlaying ? 20 : 2,
                  background: frequencyPlaying ? 'var(--ll-accent)' : 'var(--ll-text-ghost)',
                  transition: 'all 0.2s',
                }} />
              </div>
            </div>
          </div>

          {/* Phase 2 page inline — suppress its own header + auth gate via overlay-page-content class */}
          <Suspense fallback={
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ll-text-ghost)', fontSize: 12 }}>Loading...</div>
          }>
            <div className="overlay-page-content">
              <FrequencyStationPage />
            </div>
          </Suspense>
        </div>
      </OverlayContainer>

      {/* Directory overlay */}
      <OverlayContainer isOpen={activeOverlay === OV.DIR} onClose={closeOverlay} bottomInset={bottomInset}>
        <Suspense fallback={
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ll-text-ghost)', fontSize: 12 }}>Loading...</div>
        }>
          <div className="overlay-page-content">
            <DirectoryPage onBusinessClick={(id) => setOverlayBusinessId(id)} onNetworkClick={(s) => setOverlayNetworkSlug(s)} />
          </div>
        </Suspense>
      </OverlayContainer>

      {/* BusinessProfile overlay — stacks on top of Directory or any other overlay */}
      {overlayBusinessId && (
        <div className="absolute z-50 flex flex-col" style={{
          top: HEADER_HEIGHT, left: 0, right: 0, bottom: bottomInset,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'var(--ll-bg-overlay)', backdropFilter: 'blur(12px)',
          animation: 'overlaySlideDown 0.35s ease',
          transition: 'bottom 0.2s ease-out',
        }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--ll-border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setOverlayBusinessId(null)}
              style={{ fontSize: 12, color: 'var(--ll-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
            >
              ← Back
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Suspense fallback={
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ll-text-ghost)', fontSize: 12 }}>Loading...</div>
            }>
              <div className="overlay-page-content">
                <BusinessProfilePage businessId={overlayBusinessId} onRecommendClick={(bizId, mode) => setOverlayRecommend({ businessId: bizId, mode: mode || null })} onNetworkClick={(s) => setOverlayNetworkSlug(s)} />
              </div>
            </Suspense>
          </div>
        </div>
      )}

      {/* Recommend overlay — stacks on top of BusinessProfile (z-[60]) */}
      {overlayRecommend && (
        <div className="absolute flex flex-col" style={{
          top: HEADER_HEIGHT, left: 0, right: 0, bottom: bottomInset, zIndex: 60,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'var(--ll-bg-overlay)', backdropFilter: 'blur(12px)',
          animation: 'overlaySlideDown 0.35s ease',
          transition: 'bottom 0.2s ease-out',
        }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--ll-border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setOverlayRecommend(null)}
              style={{ fontSize: 12, color: 'var(--ll-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
            >
              ← Back
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Suspense fallback={
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ll-text-ghost)', fontSize: 12 }}>Loading...</div>
            }>
              <div className="overlay-page-content">
                <RecommendPage businessId={overlayRecommend.businessId} initialMode={overlayRecommend.mode} />
              </div>
            </Suspense>
          </div>
        </div>
      )}

      {/* Network overlay — stacks on top of BusinessProfile (z-55) */}
      {overlayNetworkSlug && (
        <div className="absolute flex flex-col" style={{
          top: HEADER_HEIGHT, left: 0, right: 0, bottom: bottomInset, zIndex: 55,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          background: 'var(--ll-bg-overlay)', backdropFilter: 'blur(12px)',
          animation: 'overlaySlideDown 0.35s ease',
          transition: 'bottom 0.2s ease-out',
        }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--ll-border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setOverlayNetworkSlug(null)}
              style={{ fontSize: 12, color: 'var(--ll-text-dim)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
            >
              ← Back
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <Suspense fallback={
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ll-text-ghost)', fontSize: 12 }}>Loading...</div>
            }>
              <div className="overlay-page-content">
                <NetworkPageComponent
                  slug={overlayNetworkSlug}
                  onBusinessClick={(id) => setOverlayBusinessId(id)}
                  onNetworkClick={(s) => setOverlayNetworkSlug(s)}
                />
              </div>
            </Suspense>
          </div>
        </div>
      )}

      {/* Events overlay */}
      <OverlayContainer isOpen={activeOverlay === OV.EVT} onClose={closeOverlay} bottomInset={bottomInset}>
        <Suspense fallback={
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ll-text-ghost)', fontSize: 12 }}>Loading...</div>
        }>
          <div className="overlay-page-content">
            <EventsPage />
          </div>
        </Suspense>
      </OverlayContainer>

      {/* Account overlay */}
      <OverlayContainer isOpen={activeOverlay === OV.ACCT} onClose={closeOverlay} bottomInset={bottomInset}>
        <AccountOverlay currentUser={currentUser} onClose={closeOverlay} onOpenOverlay={(ov) => setActiveOverlay(ov)} />
      </OverlayContainer>

      {/* Philosophy overlay */}
      <OverlayContainer isOpen={activeOverlay === OV.PHILOSOPHY} onClose={closeOverlay} bottomInset={bottomInset}>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, color: 'var(--ll-text-ghost)', fontSize: 12 }}>Loading...</div>}>
          <div className="overlay-page-content">
            <PhilosophyPage />
          </div>
        </Suspense>
      </OverlayContainer>

      {/* Support overlay */}
      <OverlayContainer isOpen={activeOverlay === OV.SUPPORT} onClose={closeOverlay} bottomInset={bottomInset}>
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, color: 'var(--ll-text-ghost)', fontSize: 12 }}>Loading...</div>}>
          <div className="overlay-page-content">
            <SupportPage />
          </div>
        </Suspense>
      </OverlayContainer>

      {/* ─── Body (content area + fixed panel) ─── */}
      <div className="flex-1 overflow-hidden" style={{ position: 'relative' }}>
        {/* Content area — scrolls independently, shrinks when panel open */}
        <div
          className={`mylane-content-area${agentEnabled && panelOpen ? ' panel-open' : ''}`}
          style={{ position: 'absolute', inset: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          {/* Horizontal Space Spinner — ALWAYS VISIBLE, centers on content width.
              In switcher mode (DEC-168), the same spinner re-skins with the
              user's owned businesses; the cockpit's visual language carries
              forward — only the tile contents change. */}
          {switcherMode ? (
            <SpaceSpinner
              items={businessItems}
              currentIndex={switcherFocusIdx}
              onSelect={handleSwitcherSelect}
              onCenterTap={() => handleSwitcherSelect(switcherFocusIdx)}
            />
          ) : (
            <SpaceSpinner
              items={spaceItems}
              currentIndex={spinnerIndex}
              onSelect={handleSpinnerSelect}
            />
          )}

          {/* Space-name pill — sits below the spinner. In space mode, it names
              the active space and (when the user owns 2+ businesses) carries
              a swap glyph that enters business-switcher mode. Single-business
              users see the same pill without interactivity — the affordance
              is dark until there's something to switch between (DEC-117). */}
          {!switcherMode && (
            <div className="flex justify-center" style={{ marginTop: 4, marginBottom: 4 }}>
              <button
                type="button"
                onClick={isMultiBusiness ? enterSwitcher : undefined}
                disabled={!isMultiBusiness}
                aria-label={isMultiBusiness ? `Switch business (currently ${activeBusiness?.name || 'active business'})` : currentSpace.label}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '3px 10px', borderRadius: 999,
                  background: isMultiBusiness ? 'var(--ll-bg-elevated, rgba(255,255,255,0.03))' : 'transparent',
                  border: `1px solid ${isMultiBusiness ? 'var(--ll-border)' : 'transparent'}`,
                  fontSize: 10, letterSpacing: '0.3px',
                  color: 'var(--ll-text-ghost)',
                  cursor: isMultiBusiness ? 'pointer' : 'default',
                  transition: 'background 0.15s, border-color 0.15s',
                }}
              >
                <span>{currentSpace.label.toLowerCase()}</span>
                {isMultiBusiness && (
                  <span aria-hidden="true" style={{ fontSize: 11, color: 'var(--ll-text-dim)' }}>⇄</span>
                )}
              </button>
            </div>
          )}

          {/* Admin: physics tuner toggle + panel — sits between spinner and content */}
          {currentUser?.role === 'admin' && (
            <div style={{ padding: '0 var(--ll-content-pad, 24px)' }}>
              <div style={{ maxWidth: 'var(--ll-content-max, 768px)' }}>
                <button
                  type="button"
                  onClick={() => setShowPhysicsTuner((v) => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 8, fontSize: 10,
                    background: showPhysicsTuner ? 'hsl(var(--primary) / 0.15)' : 'transparent',
                    border: `1px solid ${showPhysicsTuner ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--border))'}`,
                    color: showPhysicsTuner ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                    cursor: 'pointer', marginBottom: showPhysicsTuner ? 8 : 0,
                  }}
                >
                  <FlaskConical style={{ width: 10, height: 10 }} strokeWidth={1.5} />
                  Physics
                </button>
                {showPhysicsTuner && (
                  <DevLab
                    onTestSpin={() => {
                      const idx = spinnerIndex;
                      const next = idx < spaceItems.length - 1 ? idx + 1 : idx - 1;
                      handleSpinnerSelect(next);
                      setTimeout(() => handleSpinnerSelect(idx), 600);
                    }}
                  />
                )}
              </div>
            </div>
          )}

          {/* Workspace content — paddingBottom clears fixed bottom UI (input bar + mini-player) */}
          <div className="flex-1" style={{ padding: '8px var(--ll-content-pad, 24px)', paddingBottom: bottomInset + 20 }}>
            <div style={{ maxWidth: 'var(--ll-content-max, 768px)' }}>

              {/* Command result card — agent-only */}
              {agentEnabled && commandResult && (
                <div style={{
                  marginBottom: 12, padding: '14px 16px',
                  background: 'var(--ll-bg-elevated)',
                  border: '1px solid var(--ll-border)',
                  borderRadius: 10, position: 'relative',
                }}>
                  {commandResult.type !== 'loading' && (
                    <button
                      type="button"
                      onClick={() => setCommandResult(null)}
                      style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ll-text-dim)', padding: 4, zIndex: 1 }}
                    >
                      <X style={{ width: 14, height: 14 }} strokeWidth={2} />
                    </button>
                  )}
                  {/* Loading state — three pulsing dots */}
                  {commandResult.type === 'loading' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[0, 1, 2].map((i) => (
                          <div key={i} style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: 'var(--ll-accent)',
                            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                          }} />
                        ))}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--ll-text-ghost)' }}>
                        {commandResult.text}
                      </span>
                    </div>
                  )}
                  {commandResult.type !== 'loading' && commandResult.text && (
                    <div style={{ fontSize: 13, color: 'var(--ll-text-secondary)', lineHeight: 1.5, paddingRight: 24, marginBottom: (commandResult.type !== 'text') ? 12 : 0 }}>
                      {commandResult.text}
                    </div>
                  )}
                  {commandResult.type === 'data' && renderEntityView({
                    data: commandResult.data, entity: commandResult.entity,
                    workspace: commandResult.workspace, displayHint: commandResult.displayHint,
                  })}
                  {commandResult.type === 'confirm' && (
                    <ConfirmationCard
                      entity={commandResult.entity}
                      action={commandResult.action}
                      data={commandResult.data}
                      onConfirm={() => setCommandResult(null)}
                      onEdit={() => setCommandResult(null)}
                      onCancel={() => setCommandResult(null)}
                    />
                  )}
                </div>
              )}

              {switcherMode ? (
                <div
                  className="flex items-center justify-center"
                  style={{ padding: '48px 16px', textAlign: 'center' }}
                >
                  <div
                    style={{
                      fontSize: 11, color: 'var(--ll-text-ghost)',
                      letterSpacing: '0.3px', lineHeight: 1.6, maxWidth: 320,
                    }}
                  >
                    Tap the center business to switch into it. Neighbors rotate the dial without committing.
                  </div>
                </div>
              ) : renderContent()}
            </div>
          </div>

        </div>

        {/* Desktop: fixed panel + re-open tab — agent-only */}
        {agentEnabled && (
        <>
        <div
          className={`mylane-panel-fixed${panelOpen ? '' : ' panel-closed'}`}
          style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 300,
            borderLeft: '1px solid var(--ll-border)', background: 'var(--ll-bg-elevated)',
            zIndex: 10,
          }}
        >
          <CommandBar
            mode="panel"
            agentName="MyLane"
            userId={currentUser?.id}
            onRenderResult={setCommandResult}
            onNavigate={(nav) => {
              const idx = spaceItems.findIndex((s) => s.id === nav.workspace);
              if (idx >= 0) handleSpinnerSelect(idx, nav.tab);
            }}
            onClose={() => { setPanelOpen(false); try { localStorage.setItem('mylane_panel', '0'); } catch {} }}
            lastResponse={commandResult?.text || null}
          />
        </div>

        <button
          type="button"
          className={`mylane-reopen-tab${panelOpen ? ' panel-open' : ''}`}
          onClick={() => { setPanelOpen(true); try { localStorage.setItem('mylane_panel', '1'); } catch {} }}
          style={{
            position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
            width: 28, height: 48, borderRadius: '8px 0 0 8px',
            background: 'var(--ll-bg-elevated)', border: '1px solid var(--ll-border)',
            borderRight: 'none', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10,
          }}
          title="Open Mylane panel"
        >
          <PanelRightOpen style={{ width: 14, height: 14, color: 'var(--ll-accent)' }} strokeWidth={1.5} />
        </button>
        </>
        )}
      </div>

      {/* Mobile: command bar pinned to viewport bottom — agent-only */}
      {/* Always visible regardless of scroll. Sits above FrequencyMiniPlayer when music is active. */}
      {agentEnabled && (
        <div className="mylane-bar-mobile" style={{
          position: 'fixed',
          bottom: (freq?.currentSong && freq?.isEnabled) ? MINI_PLAYER_HEIGHT : 0,
          left: 0,
          right: 0,
          zIndex: 9997,
          // Safe-area padding only when at viewport bottom (no mini-player below)
          paddingBottom: (freq?.currentSong && freq?.isEnabled) ? 0 : 'env(safe-area-inset-bottom, 0px)',
          transition: 'bottom 0.2s ease-out',
        }}>
          <CommandBar
            mode="bar"
            agentName="MyLane"
            userId={currentUser?.id}
            onRenderResult={setCommandResult}
            onNavigate={(nav) => {
              const idx = spaceItems.findIndex((s) => s.id === nav.workspace);
              if (idx >= 0) handleSpinnerSelect(idx, nav.tab);
            }}
            lastResponse={commandResult?.text || null}
          />
        </div>
      )}
    </div>
  );
}
