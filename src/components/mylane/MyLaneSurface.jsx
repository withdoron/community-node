/**
 * MyLaneSurface — the organism's living surface.
 * Composes card views from all user workspaces into one grid.
 * Drill-through renders workspace views INSIDE Mylane — user never leaves.
 * Conversation render instructions trigger the same drill mechanism.
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DollarSign, Building2, Users, Store } from 'lucide-react';
import MY_LANE_REGISTRY from '@/config/myLaneRegistry';
import WhatsChangedBar from './WhatsChangedBar';
import MyLaneBreadcrumb from './MyLaneBreadcrumb';
import MyLaneDrillView from './MyLaneDrillView';
import useMyLaneState from './useMyLaneState';
import { parseRenderInstruction } from './parseRenderInstruction';
import { renderEntityView } from './renderEntityView';

/**
 * Compute discovery whispers — proximate-but-not-joined spaces.
 * Single-hop relationships only. Conservative: only show bridges
 * that feel organic, never algorithmic. Phase 1: everything → finance.
 */
function computeWhispers(profiles) {
  const hasTeam = (profiles.allTeams?.length || 0) > 0;
  const hasFS = (profiles.fieldServiceProfiles?.length || 0) > 0;
  const hasPM = (profiles.propertyMgmtProfiles?.length || 0) > 0;
  const hasFinance = (profiles.financeProfiles?.length || 0) > 0;

  const whispers = [];

  // ── Finance whispers (highest-confidence bridge) ──
  if (!hasFinance) {
    if (hasTeam) {
      whispers.push({
        id: 'whisper-finance-team',
        space: 'finance',
        icon: DollarSign,
        whisper: 'Track team costs',
        via: 'team',
        strength: 0.7,
        onboardingPage: 'FinanceOnboarding',
      });
    } else if (hasFS) {
      whispers.push({
        id: 'whisper-finance-fs',
        space: 'finance',
        icon: DollarSign,
        whisper: 'Track your income',
        via: 'field-service',
        strength: 0.6,
        onboardingPage: 'FinanceOnboarding',
      });
    } else if (hasPM) {
      whispers.push({
        id: 'whisper-finance-pm',
        space: 'finance',
        icon: DollarSign,
        whisper: 'Track property income',
        via: 'property-pulse',
        strength: 0.6,
        onboardingPage: 'FinanceOnboarding',
      });
    }
  }

  // ── Property Pulse whisper (only for field service owners — natural bridge) ──
  if (!hasPM && hasFS) {
    whispers.push({
      id: 'whisper-pm-fs',
      space: 'property-pulse',
      icon: Building2,
      whisper: 'Manage a property',
      via: 'field-service',
      strength: 0.4,
      onboardingPage: 'PropertyManagementOnboarding',
    });
  }

  return whispers;
}

// Map card IDs to drill views
const CARD_DRILL_MAP = {
  'enough-number': { workspace: 'finance', view: 'home', tab: 'home' },
  'pending-estimates': { workspace: 'field-service', view: 'estimates', tab: 'estimates' },
  'active-projects': { workspace: 'field-service', view: 'projects', tab: 'projects' },
  'player-readiness': { workspace: 'team', view: 'home', tab: 'home' },
  'property-overview': { workspace: 'property-pulse', view: 'home', tab: 'home' },
};

// Human-readable workspace names
const WORKSPACE_LABELS = {
  'field-service': 'Field Service',
  'team': 'Team',
  'finance': 'Finance',
  'property-pulse': 'Property Pulse',
};

export default function MyLaneSurface({
  currentUser,
  financeProfiles = [],
  fieldServiceProfiles = [],
  allTeams = [],
  propertyMgmtProfiles = [],
  agentMessageRef,
}) {
  const profiles = { financeProfiles, fieldServiceProfiles, allTeams, propertyMgmtProfiles };
  const [urgencyBoosts, setUrgencyBoosts] = useState({});
  const [drilledView, setDrilledView] = useState(null);
  const [renderedData, setRenderedData] = useState(null); // { entity, workspace, data, displayHint }
  const drillCardRef = useRef(null);
  const drillStartRef = useRef(null);

  const {
    trackCardTap,
    trackDrillTime,
    trackMessage,
    getCardOrder,
    getCardVitality,
    getModeGradient,
    getLastVisited,
    setLastVisited,
  } = useMyLaneState();

  // Auto/Manual gradient — 0.0 = manual (taps), 1.0 = auto (conversation)
  const modeGradient = getModeGradient();

  const lastVisited = getLastVisited();

  // Record this visit on mount
  useEffect(() => {
    const t = setTimeout(() => setLastVisited(), 500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Dispatch agent-active when surface mounts
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('agent-active', { detail: true }));
    return () => { window.dispatchEvent(new CustomEvent('agent-active', { detail: false })); };
  }, []);

  // Listen for Mylane messages (DEC-120 frequency tracking)
  // Any chat component can dispatch: window.dispatchEvent(new CustomEvent('mylane-user-message'))
  useEffect(() => {
    const handler = () => trackMessage();
    window.addEventListener('mylane-user-message', handler);
    return () => window.removeEventListener('mylane-user-message', handler);
  }, [trackMessage]);

  // Urgency callback for cards
  const handleUrgency = useCallback((cardId, isUrgent) => {
    setUrgencyBoosts((prev) => {
      if (prev[cardId] === isUrgent) return prev;
      return { ...prev, [cardId]: isUrgent };
    });
  }, []);

  // Filter and sort cards
  const activeCards = MY_LANE_REGISTRY.map((card) => ({
    ...card,
    profile: card.getProfile(profiles),
  })).filter((card) => card.profile !== null);

  const sortedCards = getCardOrder(activeCards, urgencyBoosts);

  // Discovery whispers — proximate-but-not-joined spaces
  const whispers = useMemo(() => computeWhispers(profiles), [profiles]);

  // Drill into a workspace view (internal — user stays in Mylane)
  const drillInto = useCallback((drillSpec) => {
    setDrilledView(drillSpec);
    setRenderedData(null);
    drillStartRef.current = Date.now();
  }, []);

  // Show raw entity data via universal renderer
  const showRenderedData = useCallback((dataSpec) => {
    setRenderedData(dataSpec);
    setDrilledView(null);
  }, []);

  // Return to card surface
  const drillBack = useCallback(() => {
    if (drillCardRef.current && drillStartRef.current) {
      const seconds = Math.round((Date.now() - drillStartRef.current) / 1000);
      if (seconds > 0) trackDrillTime(drillCardRef.current);
    }
    drillCardRef.current = null;
    drillStartRef.current = null;
    setDrilledView(null);
    setRenderedData(null);
  }, [trackDrillTime]);

  // Handle card tap: track + drill internally
  const handleCardTap = useCallback((card) => {
    trackCardTap(card.id);
    drillCardRef.current = card.id;
    const drillSpec = CARD_DRILL_MAP[card.id] || { workspace: card.space, view: 'home', tab: 'home' };
    drillInto(drillSpec);
  }, [trackCardTap, drillInto]);

  // Handle agent messages — render instructions drill internally or show data
  const lastProcessedRef = useRef(null);
  const handleAgentMessage = useCallback((msg) => {
    if (!msg?.content || msg.id === lastProcessedRef.current) return;
    const result = parseRenderInstruction(msg.content);
    if (!result.hasRender) return;
    lastProcessedRef.current = msg.id;
    if (result.type === 'data') {
      showRenderedData({ entity: result.entity, workspace: result.workspace, data: result.data, displayHint: result.displayHint });
    } else {
      drillInto({ workspace: result.workspace, view: result.view, tab: result.tab });
    }
  }, [drillInto, showRenderedData]);

  // Expose handleAgentMessage to parent via ref
  useEffect(() => {
    if (agentMessageRef) agentMessageRef.current = handleAgentMessage;
  }, [agentMessageRef, handleAgentMessage]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div>
      {/* Header + Breadcrumb */}
      {drilledView || renderedData ? (
        <MyLaneBreadcrumb
          spaceName={
            drilledView
              ? (WORKSPACE_LABELS[drilledView.workspace] || drilledView.workspace)
              : (renderedData?.entity?.replace(/^(FS|PM)/, '').replace(/([A-Z])/g, ' $1').trim() || 'Results')
          }
          onBack={drillBack}
        />
      ) : (
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-white">MyLane</h2>
          <p className="text-sm text-slate-400 mt-1">
            {today}
            {/* At high conversation gradient, Mylane's presence becomes warmer */}
            {modeGradient > 0.6 && (
              <span className="text-slate-500 ml-1.5">· Mylane is here</span>
            )}
          </p>
        </div>
      )}

      {/* Main content: cards OR drilled workspace view OR rendered entity data */}
      {renderedData ? (
        renderEntityView({
          data: renderedData.data,
          entity: renderedData.entity,
          workspace: renderedData.workspace,
          displayHint: renderedData.displayHint,
        })
      ) : drilledView ? (
        <MyLaneDrillView
          drilledView={drilledView}
          currentUser={currentUser}
          fieldServiceProfiles={fieldServiceProfiles}
          financeProfiles={financeProfiles}
          allTeams={allTeams}
          propertyMgmtProfiles={propertyMgmtProfiles}
        />
      ) : (
        <>
          {/* What Changed whisper */}
          <WhatsChangedBar
            lastVisited={lastVisited}
            fieldServiceProfiles={fieldServiceProfiles}
            propertyMgmtProfiles={propertyMgmtProfiles}
          />

          {/* Card Grid — vitality-driven opacity. The organism breathes. */}
          {sortedCards.length > 0 || whispers.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Active cards */}
              {sortedCards.map((card) => {
                const { CardComponent } = card;
                const vitality = getCardVitality(card.id, !!urgencyBoosts[card.id]);
                return (
                  <div
                    key={card.id}
                    className="transition-opacity duration-700"
                    style={{ opacity: vitality }}
                  >
                    <CardComponent
                      profile={card.profile}
                      onClick={() => handleCardTap(card)}
                      onUrgency={handleUrgency}
                    />
                  </div>
                );
              })}

              {/* Discovery whispers — ghost cards for proximate spaces */}
              {/* Conversational users see whispers slightly brighter (more open to discovery) */}
              {whispers.map((w) => {
                const Icon = w.icon;
                const whisperOpacity = w.strength * (0.55 + modeGradient * 0.2);
                return (
                  <Link
                    key={w.id}
                    to={createPageUrl(w.onboardingPage)}
                    className="group bg-transparent border border-dashed border-slate-800 rounded-xl p-4 transition-all duration-500 hover:border-amber-500/30 hover:bg-slate-900/30"
                    style={{ opacity: whisperOpacity }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-4 w-4 text-slate-600 group-hover:text-amber-500/60 transition-colors" />
                      <span className="text-xs font-medium text-slate-600 group-hover:text-slate-500 transition-colors">Nearby</span>
                    </div>
                    <p className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">{w.whisper}</p>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 space-y-6">
              <div className="space-y-2">
                <p className="text-slate-300">Your spaces will appear here</p>
                <p className="text-slate-500 text-sm">Create something or join an invite to get started.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  to={createPageUrl('TeamOnboarding')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-sm hover:border-amber-500/50 hover:text-amber-500 transition-colors min-h-[44px]"
                >
                  <Users className="h-4 w-4" />
                  Start a Team
                </Link>
                <Link
                  to={createPageUrl('BusinessOnboarding')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-sm hover:border-amber-500/50 hover:text-amber-500 transition-colors min-h-[44px]"
                >
                  <Store className="h-4 w-4" />
                  List a Business
                </Link>
                <Link
                  to={createPageUrl('FinanceOnboarding')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-300 text-sm hover:border-amber-500/50 hover:text-amber-500 transition-colors min-h-[44px]"
                >
                  <DollarSign className="h-4 w-4" />
                  Track Finances
                </Link>
              </div>
            </div>
          )}

          {/* Conversational nudge — only for users who talk to Mylane (gradient > 0.5) */}
          {modeGradient > 0.5 && sortedCards.length > 0 && (
            <p
              className="text-center text-xs text-slate-600 mt-6 transition-opacity duration-1000"
              style={{ opacity: Math.min(0.8, (modeGradient - 0.5) * 1.6) }}
            >
              Ask Mylane about your spaces
            </p>
          )}
        </>
      )}

    </div>
  );
}
