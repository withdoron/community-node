/**
 * MyLaneSurface — the organism's living surface.
 * Composes card views from all user workspaces into one grid.
 * Drill-through renders workspace views INSIDE Mylane — user never leaves.
 * Conversation render instructions trigger the same drill mechanism.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import MY_LANE_REGISTRY from '@/config/myLaneRegistry';
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
    getCardOrder,
    getCardVitality,
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

          {/* Card Grid — vitality-driven opacity. The organism breathes. */}
          {sortedCards.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-400">Your spaces will appear here as cards.</p>
            </div>
          )}
        </>
      )}

    </div>
  );
}
