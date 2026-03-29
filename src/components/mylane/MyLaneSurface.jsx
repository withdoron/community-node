/**
 * MyLaneSurface — the organism's living surface.
 * Composes card views from all user workspaces into one grid.
 * Phase 3: organic growth — cards reorder by usage, time-aware urgency, what-changed whisper.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronUp, ChevronDown, MessageCircle } from 'lucide-react';
import MY_LANE_REGISTRY from '@/config/myLaneRegistry';
import AgentChat from '@/components/fieldservice/AgentChat';
import WhatsChangedBar from './WhatsChangedBar';
import useMyLaneState from './useMyLaneState';
import { parseRenderInstruction } from './parseRenderInstruction';

export default function MyLaneSurface({
  currentUser,
  financeProfiles = [],
  fieldServiceProfiles = [],
  allTeams = [],
  propertyMgmtProfiles = [],
  onDrillInto,
  onRenderDrill,
}) {
  const profiles = { financeProfiles, fieldServiceProfiles, allTeams, propertyMgmtProfiles };
  const [chatExpanded, setChatExpanded] = useState(false);
  const [urgencyBoosts, setUrgencyBoosts] = useState({});
  const drillCardRef = useRef(null);

  const {
    trackCardTap,
    trackDrillTime,
    getCardOrder,
    getLastVisited,
    setLastVisited,
  } = useMyLaneState();

  const lastVisited = getLastVisited();

  // Record this visit on mount (after reading lastVisited for WhatsChanged)
  useEffect(() => {
    // Small delay so WhatsChanged reads the previous lastVisited before we update it
    const t = setTimeout(() => setLastVisited(), 500);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Dispatch agent-active when MyLane surface mounts (hides global feedback button)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('agent-active', { detail: true }));
    return () => { window.dispatchEvent(new CustomEvent('agent-active', { detail: false })); };
  }, []);

  // Callback for cards to report urgency
  const handleUrgency = useCallback((cardId, isUrgent) => {
    setUrgencyBoosts((prev) => {
      if (prev[cardId] === isUrgent) return prev;
      return { ...prev, [cardId]: isUrgent };
    });
  }, []);

  // Filter registry to cards that have a matching profile
  const activeCards = MY_LANE_REGISTRY.map((card) => ({
    ...card,
    profile: card.getProfile(profiles),
  })).filter((card) => card.profile !== null);

  // Sort cards by interaction + urgency (organic reordering)
  const sortedCards = getCardOrder(activeCards, urgencyBoosts);

  // Handle card tap: track interaction, then drill
  const handleCardTap = useCallback((card) => {
    trackCardTap(card.id);
    drillCardRef.current = card.id;
    onDrillInto?.(card);
  }, [trackCardTap, onDrillInto]);

  // Handle agent messages — check for render instructions
  const lastProcessedRef = useRef(null);
  const handleAgentMessage = useCallback((msg) => {
    if (!msg?.content || msg.id === lastProcessedRef.current) return;
    const { hasRender, workspace, tab } = parseRenderInstruction(msg.content);
    if (hasRender && onRenderDrill) {
      lastProcessedRef.current = msg.id;
      onRenderDrill(workspace, tab);
    }
  }, [onRenderDrill]);

  // Track drill time when user returns (card deselection resets drillCardRef)
  useEffect(() => {
    // When activeCards re-render without a drill, record the time
    return () => {
      if (drillCardRef.current) {
        trackDrillTime(drillCardRef.current);
        drillCardRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-white">MyLane</h2>
        <p className="text-sm text-slate-400 mt-1">{today}</p>
      </div>

      {/* What Changed whisper */}
      <WhatsChangedBar
        lastVisited={lastVisited}
        fieldServiceProfiles={fieldServiceProfiles}
        propertyMgmtProfiles={propertyMgmtProfiles}
      />

      {/* Card Grid — organically sorted */}
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

      {/* Conversation Panel — docked at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        {chatExpanded ? (
          <div className="max-w-7xl mx-auto px-4">
            <div className="relative">
              {/* Collapse button */}
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
