/**
 * MyLaneSurface — the organism's living surface.
 * Composes card views from all user workspaces into one grid.
 * Drill-through navigates into the full workspace via existing dashboard state.
 * Phase 1: card grid + conversation placeholder. Phase 2: ConductorAgent wired.
 */
import React from 'react';
import { MessageCircle } from 'lucide-react';
import MY_LANE_REGISTRY from '@/config/myLaneRegistry';

export default function MyLaneSurface({
  currentUser,
  financeProfiles = [],
  fieldServiceProfiles = [],
  allTeams = [],
  propertyMgmtProfiles = [],
  onDrillInto,
}) {
  const profiles = { financeProfiles, fieldServiceProfiles, allTeams, propertyMgmtProfiles };

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
    <div className="pb-24">
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

      {/* Conversation Placeholder — Phase 1 (non-functional) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <MessageCircle className="h-4 w-4 text-amber-500" />
            </div>
            <input
              type="text"
              disabled
              placeholder="Talk to MyLane..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-400 placeholder-slate-500 cursor-not-allowed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
