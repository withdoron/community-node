/**
 * MyLaneSurface — the organism's living surface.
 * DEC-131: Spinner-based navigation. Every header icon is a toggle.
 * Tap = overlay renders below. Tap again = rolls up. One surface, two axes.
 * Nothing navigates away from MyLane. Everything renders in place.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  Home, UtensilsCrossed, HardHat, DollarSign, Users,
  Store, Search, Music, Settings, LogOut, FileText,
  Lock, Mail, Volume2, VolumeX, Building2, X,
} from 'lucide-react';
import MY_LANE_REGISTRY from '@/config/myLaneRegistry';
import MyLaneDrillView from './MyLaneDrillView';
import useMyLaneState from './useMyLaneState';
import SpaceSpinner from './SpaceSpinner';
import HomeFeed from './HomeFeed';
import DiscoverPosition from './DiscoverPosition';
import { parseRenderInstruction } from './parseRenderInstruction';
import { renderEntityView } from './renderEntityView';
import { useFrequency } from '@/contexts/FrequencyContext';

// Lazy-load overlay content — these are full page components rendered inline
const DirectoryPage = React.lazy(() => import('@/pages/Directory'));
const EventsPage = React.lazy(() => import('@/pages/Events'));
const FrequencyStationPage = React.lazy(() => import('@/pages/FrequencyStation'));
const SettingsPage = React.lazy(() => import('@/pages/Settings'));

// Map workspace type IDs to spinner item config
const SPACE_CONFIG = {
  home:              { id: 'home',           label: 'Home',      icon: Home },
  'meal-prep':       { id: 'meal-prep',      label: 'Kitchen',   icon: UtensilsCrossed },
  'field-service':   { id: 'field-service',  label: 'Jobsite',   icon: HardHat },
  finance:           { id: 'finance',        label: 'Finances',  icon: DollarSign },
  team:              { id: 'team',           label: 'Team',      icon: Users },
  business:          { id: 'business',       label: 'Business',  icon: Store, dim: true },
  discover:          { id: 'discover',       label: 'Discover',  icon: Search, dim: true },
};

function buildSpinnerItems(profiles, businessProfiles = []) {
  const items = [SPACE_CONFIG.home];
  if (profiles.mealPrepProfiles?.length > 0) items.push(SPACE_CONFIG['meal-prep']);
  if (profiles.fieldServiceProfiles?.length > 0) items.push(SPACE_CONFIG['field-service']);
  if (profiles.financeProfiles?.length > 0) items.push(SPACE_CONFIG.finance);
  if (profiles.allTeams?.length > 0) items.push(SPACE_CONFIG.team);
  if (businessProfiles.length > 0) items.push({ ...SPACE_CONFIG.business, dim: false });
  if (profiles.propertyMgmtProfiles?.length > 0) items.push({ id: 'property-pulse', label: 'Property', icon: Building2 });
  items.push(SPACE_CONFIG.discover);
  return items;
}

// ─── Overlay system ────────────────────────────────────────────────
// Every header icon is a toggle. Only one overlay open at a time.
const OVERLAYS = ['freq', 'dir', 'evt', 'acct'];

function OverlayContainer({ isOpen, keepMounted = false, children }) {
  // keepMounted: render but hide (preserves internal state, e.g. Frequency Station)
  if (!isOpen && !keepMounted) return null;
  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-40 flex flex-col overflow-y-auto"
      style={{
        top: 45,
        background: 'var(--ll-bg-overlay)',
        backdropFilter: 'blur(12px)',
        animation: isOpen ? 'overlaySlideDown 0.35s ease' : undefined,
        display: isOpen ? 'flex' : 'none',
      }}
    >
      {children}
    </div>
  );
}

// Account overlay — replaces gear icon. Same toggle pattern as everything else.
// Settings renders inline. Legal pages open in new tab. Nothing navigates away.
function AccountOverlay({ currentUser, onClose }) {
  const [showSettings, setShowSettings] = React.useState(false);
  const [soundOn, setSoundOn] = React.useState(() => {
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
          <React.Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: 'var(--ll-text-ghost)', fontSize: 12 }}>Loading...</div>}>
            <SettingsPage />
          </React.Suspense>
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
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ll-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Mail style={{ width: 16, height: 16, color: 'var(--ll-text-dim)', flexShrink: 0 }} strokeWidth={1.5} />
          <div>
            <div style={{ fontSize: 13, color: 'var(--ll-text-secondary)' }}>Newsletter</div>
            <div style={{ fontSize: 10, color: 'var(--ll-text-ghost)' }}>The Good News</div>
          </div>
        </div>
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
      </div>

        <div
          className="flex items-center gap-2.5 cursor-pointer rounded-lg"
          style={{ padding: '10px 12px', transition: 'background 0.15s' }}
          onClick={() => {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const themes = ['dark', 'light', 'fallout'];
            const nextIdx = (themes.indexOf(current) + 1) % themes.length;
            const next = themes[nextIdx];
            document.documentElement.setAttribute('data-theme', next);
            try { localStorage.setItem('ll_theme', next); } catch {}
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ll-bg-elevated)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ fontSize: 16, flexShrink: 0, width: 16, textAlign: 'center' }}>🎨</span>
          <div>
            <div style={{ fontSize: 13, color: 'var(--ll-text-secondary)' }}>Theme</div>
            <div style={{ fontSize: 10, color: 'var(--ll-text-ghost)' }}>Tap to cycle</div>
          </div>
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
  businessProfiles = [],
  agentMessageRef,
  onDoorOpen = null,
  warmEntryWizardPage = null,
}) {
  const navigate = useNavigate();
  const profiles = { financeProfiles, fieldServiceProfiles, allTeams, propertyMgmtProfiles, mealPrepProfiles };
  const freq = useFrequency();
  const frequencyPlaying = freq?.isEnabled || false;
  const frequencyIsPlaying = freq?.isPlaying || false; // actual audio playing

  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [renderedData, setRenderedData] = useState(null);
  const [activeOverlay, setActiveOverlay] = useState(null); // 'freq' | 'dir' | 'evt' | 'acct' | null
  const [welcomeData, setWelcomeData] = useState(() => {
    try {
      const raw = localStorage.getItem('mylane_welcome');
      if (raw) { localStorage.removeItem('mylane_welcome'); return JSON.parse(raw); }
    } catch {}
    return null;
  });
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

  // Close overlay on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && activeOverlay) setActiveOverlay(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [activeOverlay]);

  // Build spinner items
  const spaceItems = useMemo(
    () => buildSpinnerItems(profiles, businessProfiles),
    [profiles, businessProfiles]
  );

  const currentSpace = spaceItems[spinnerIndex] || spaceItems[0];

  // Toggle overlay — only one at a time
  const toggleOverlay = useCallback((name) => {
    setActiveOverlay((prev) => prev === name ? null : name);
  }, []);

  const closeOverlay = useCallback(() => setActiveOverlay(null), []);

  // Handle spinner navigation
  const handleSpinnerSelect = useCallback((idx) => {
    setSpinnerIndex(idx);
    setRenderedData(null);
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
          />
        </>
      );
    }
    if (space.id === 'discover') {
      return <DiscoverPosition activeSpaceIds={activeSpaceIds} />;
    }
    return (
      <MyLaneDrillView
        drilledView={{ workspace: space.id, view: 'home', tab: 'home' }}
        currentUser={currentUser}
        fieldServiceProfiles={fieldServiceProfiles}
        financeProfiles={financeProfiles}
        allTeams={allTeams}
        propertyMgmtProfiles={propertyMgmtProfiles}
        mealPrepProfiles={mealPrepProfiles}
        businessProfiles={businessProfiles}
      />
    );
  };

  return (
    <div className="mylane-surface flex flex-col relative" style={{ background: 'var(--ll-bg-base, #020617)', minHeight: '100vh', overflow: 'hidden', containerType: 'inline-size' }}>
      {/* Keyframes + container queries + theme variables */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes overlaySlideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fpulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        /* Suppress page headers when rendered inside overlays */
        .overlay-page-content > div > .mb-6:first-child { display: none; }
        .overlay-page-content > div > .flex.items-center.gap-3.mb-6:first-child { display: none; }
        /* Suppress auth gates and min-h-screen in overlay context */
        .overlay-page-content > div { min-height: auto !important; background: transparent !important; }

        /* ─── Container queries ─── */
        /* Content area adapts to available space, not viewport */
        .mylane-surface { container-type: inline-size; }

        /* Default: phone-size */
        .mylane-surface { --ll-content-max: 100%; --ll-content-pad: 16px; --ll-overlay-mode: fullscreen; }

        /* Tablet+ (container >= 640px) */
        @container (min-width: 640px) {
          .mylane-surface { --ll-content-max: 640px; --ll-content-pad: 24px; }
        }

        /* Desktop (container >= 1024px) */
        @container (min-width: 1024px) {
          .mylane-surface { --ll-content-max: 768px; --ll-content-pad: 32px; --ll-overlay-mode: panel; }
        }

        /* Wide (container >= 1280px) */
        @container (min-width: 1280px) {
          .mylane-surface { --ll-content-max: 960px; }
        }
      ` }} />

      {/* ─── Header ─── */}
      <div
        className="flex justify-between items-center relative z-50"
        style={{ padding: '10px 24px', borderBottom: '1px solid var(--ll-border)', background: 'var(--ll-bg-base)' }}
      >
        <div
          className="cursor-pointer select-none active:opacity-60"
          onClick={handleLogoClick}
          style={{ fontSize: 15, fontWeight: 500, color: 'var(--ll-text-primary)' }}
        >
          <span style={{ color: 'var(--ll-accent)', fontWeight: 700 }}>Local</span> Lane
        </div>
        <div className="flex items-center" style={{ gap: 4 }}>
          {/* Music icon — 44px tap zone */}
          <div
            className="cursor-pointer relative flex items-center justify-center"
            style={{ minWidth: 44, minHeight: 44 }}
            onClick={() => toggleOverlay('freq')}
          >
            <Music
              style={{ width: 14, height: 14, transition: 'color 0.2s' }}
              strokeWidth={1.5}
              color={activeOverlay === 'freq' ? 'var(--ll-accent)' : 'var(--ll-text-dim)'}
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
            onClick={() => toggleOverlay('dir')}
          >
            <span style={{
              fontSize: 12, transition: 'color 0.2s',
              color: activeOverlay === 'dir' ? 'var(--ll-accent)' : 'var(--ll-text-dim)',
            }}>
              Directory
            </span>
          </div>

          {/* Events — 44px tap zone */}
          <div
            className="cursor-pointer flex items-center justify-center"
            style={{ minWidth: 44, minHeight: 44 }}
            onClick={() => toggleOverlay('evt')}
          >
            <span style={{
              fontSize: 12, transition: 'color 0.2s',
              color: activeOverlay === 'evt' ? 'var(--ll-accent)' : 'var(--ll-text-dim)',
            }}>
              Events
            </span>
          </div>

          {/* Avatar — 44px tap zone, 36px visual circle */}
          <div
            className="cursor-pointer flex items-center justify-center"
            style={{ minWidth: 44, minHeight: 44 }}
            onClick={() => toggleOverlay('acct')}
          >
            <div
              className="flex items-center justify-center select-none"
              style={{
                width: 36, height: 36, borderRadius: '50%',
                border: `1.5px solid ${activeOverlay === 'acct' ? 'var(--ll-accent)' : 'var(--ll-border-active)'}`,
                fontSize: 12, transition: 'border-color 0.2s, color 0.2s',
                color: activeOverlay === 'acct' ? 'var(--ll-accent)' : 'var(--ll-text-muted)',
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
      <OverlayContainer isOpen={activeOverlay === 'freq'} keepMounted>
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
          <React.Suspense fallback={
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ll-text-ghost)', fontSize: 12 }}>Loading...</div>
          }>
            <div className="overlay-page-content">
              <FrequencyStationPage />
            </div>
          </React.Suspense>
        </div>
      </OverlayContainer>

      {/* Directory overlay */}
      <OverlayContainer isOpen={activeOverlay === 'dir'}>
        <React.Suspense fallback={
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ll-text-ghost)', fontSize: 12 }}>Loading...</div>
        }>
          <div className="overlay-page-content">
            <DirectoryPage />
          </div>
        </React.Suspense>
      </OverlayContainer>

      {/* Events overlay */}
      <OverlayContainer isOpen={activeOverlay === 'evt'}>
        <React.Suspense fallback={
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ll-text-ghost)', fontSize: 12 }}>Loading...</div>
        }>
          <div className="overlay-page-content">
            <EventsPage />
          </div>
        </React.Suspense>
      </OverlayContainer>

      {/* Account overlay */}
      <OverlayContainer isOpen={activeOverlay === 'acct'}>
        <AccountOverlay currentUser={currentUser} onClose={closeOverlay} />
      </OverlayContainer>

      {/* ─── Body (spinner + content) ─── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Horizontal Space Spinner — ALWAYS VISIBLE */}
        <SpaceSpinner
          items={spaceItems}
          currentIndex={spinnerIndex}
          onSelect={handleSpinnerSelect}
        />

        {/* Content area — width responds to container queries */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '8px var(--ll-content-pad, 24px)' }}>
          <div style={{ maxWidth: 'var(--ll-content-max, 768px)' }}>
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
