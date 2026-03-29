/**
 * MyLaneSurface — the organism's living surface.
 * Composes card views from all user workspaces into one grid.
 * Drill-through navigates into the full workspace via existing dashboard state.
 * Phase 2: ConductorAgent (MyLane) wired into docked conversation panel.
 */
import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, MessageCircle } from 'lucide-react';
import MY_LANE_REGISTRY from '@/config/myLaneRegistry';
import AgentChat from '@/components/fieldservice/AgentChat';

export default function MyLaneSurface({
  currentUser,
  financeProfiles = [],
  fieldServiceProfiles = [],
  allTeams = [],
  propertyMgmtProfiles = [],
  onDrillInto,
}) {
  const profiles = { financeProfiles, fieldServiceProfiles, allTeams, propertyMgmtProfiles };
  const [chatExpanded, setChatExpanded] = useState(false);

  // Dispatch agent-active when MyLane surface mounts (hides global feedback button)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('agent-active', { detail: true }));
    return () => { window.dispatchEvent(new CustomEvent('agent-active', { detail: false })); };
  }, []);

  // Filter registry to cards that have a matching profile
  const activeCards = MY_LANE_REGISTRY.map((card) => ({
    ...card,
    profile: card.getProfile(profiles),
  })).filter((card) => card.profile !== null);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">MyLane</h2>
        <p className="text-sm text-slate-400 mt-1">{today}</p>
      </div>

      {/* Card Grid */}
      {activeCards.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeCards.map((card) => {
            const { CardComponent } = card;
            return (
              <CardComponent
                key={card.id}
                profile={card.profile}
                onClick={() => onDrillInto?.(card)}
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
