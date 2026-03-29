/**
 * MyLaneSurface — the organism's living surface.
 * Composes card views from all user workspaces into one grid.
 * Drill-through renders workspace views INSIDE Mylane — user never leaves.
 * Conversation render instructions trigger the same drill mechanism.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronUp, ChevronDown, MessageCircle } from 'lucide-react';
import MY_LANE_REGISTRY from '@/config/myLaneRegistry';
import AgentChat from '@/components/fieldservice/AgentChat';
import WhatsChangedBar from './WhatsChangedBar';
import MyLaneBreadcrumb from './MyLaneBreadcrumb';
import MyLaneDrillView from './MyLaneDrillView';
import useMyLaneState from './useMyLaneState';
import { parseRenderInstruction } from './parseRenderInstruction';
import { renderEntityView } from './renderEntityView';

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
}) {
  const profiles = { financeProfiles, fieldServiceProfiles, allTeams, propertyMgmtProfiles };
  const [chatExpanded, setChatExpanded] = useState(false);
  const [urgencyBoosts, setUrgencyBoosts] = useState({});
  const [drilledView, setDrilledView] = useState(null);
  const [renderedData, setRenderedData] = useState(null); // { entity, workspace, data, displayHint }
  const drillCardRef = useRef(null);
  const drillStartRef = useRef(null);

  const {
    trackCardTap,
    trackDrillTime,
    getCardOrder,
    getLastVisited,
    setLastVisited,
  } = useMyLaneState();

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

  // Drill into a workspace view (internal — user stays in Mylane)
  const drillInto = useCallback((drillSpec) => {
    setDrilledView(drillSpec);
    setRenderedData(null);
    setChatExpanded(false);
    drillStartRef.current = Date.now();
  }, []);

  // Show raw entity data via universal renderer
  const showRenderedData = useCallback((dataSpec) => {
    setRenderedData(dataSpec);
    setDrilledView(null);
    setChatExpanded(false);
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

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="pb-20">
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
          <p className="text-sm text-slate-400 mt-1">{today}</p>
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

          {/* Card Grid */}
          {sortedCards.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedCards.map((card) => {
                const { CardComponent } = card;
                return (
                  <CardComponent
                    key={card.id}
                    profile={card.profile}
                    onClick={() => handleCardTap(card)}
                    onUrgency={handleUrgency}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-400">Your spaces will appear here as cards.</p>
            </div>
          )}
        </>
      )}

      {/* Conversation Panel — always present, docked at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        {chatExpanded ? (
          <div className="max-w-7xl mx-auto px-4">
            <div className="relative">
              <button
                type="button"
                onClick={() => setChatExpanded(false)}
                className="absolute -top-8 right-4 p-1.5 rounded-t-lg bg-slate-900 border border-b-0 border-slate-800 text-slate-400 hover:text-amber-500 transition-colors"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <AgentChat
                agentName="MyLane"
                userId={currentUser?.id}
                isOpen={true}
                onClose={() => setChatExpanded(false)}
                docked={true}
                onMessage={handleAgentMessage}
              />
            </div>
          </div>
        ) : (
          <div className="bg-slate-900 border-t border-slate-800 px-4 py-3">
            <div className="max-w-7xl mx-auto">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setChatExpanded(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setChatExpanded(true); }}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-500 group-hover:border-amber-500/30 transition-colors">
                  Talk to MyLane...
                </div>
                <ChevronUp className="h-4 w-4 text-slate-500 group-hover:text-amber-500 transition-colors" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
