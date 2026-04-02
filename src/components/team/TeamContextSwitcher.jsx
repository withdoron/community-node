import React from 'react';

/**
 * Thin bar below team tab row. Visible only when current user is a parent.
 * Lets parents switch between their own view and a linked child's view.
 */
export default function TeamContextSwitcher({
  parentRecords = [],
  teamMembers = [],
  viewingAsPlayerId,
  onSwitch,
}) {
  const childIds = parentRecords.map((r) => r.linked_player_id).filter(Boolean);
  const children = childIds
    .map((id) => teamMembers.find((m) => m.id === id))
    .filter(Boolean);

  if (children.length === 0) return null;

  return (
    <div className="bg-secondary/50 border-b border-border px-4 py-2 flex items-center gap-3 flex-shrink-0">
      <span className="text-muted-foreground text-xs whitespace-nowrap">Viewing as:</span>
      <div className="flex gap-2 overflow-x-auto min-h-[44px] items-center">
        <button
          type="button"
          onClick={() => onSwitch(null)}
          className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            viewingAsPlayerId === null
              ? 'bg-primary text-primary-foreground'
              : 'bg-surface text-foreground-soft hover:bg-surface'
          }`}
        >
          Parent
        </button>
        {children.map((child) => (
          <button
            key={child.id}
            type="button"
            onClick={() => onSwitch(child.id)}
            className={`px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              viewingAsPlayerId === child.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface text-foreground-soft hover:bg-surface'
            }`}
          >
            {child.jersey_name || child.display_name || 'Player'} ({child.position || '—'})
          </button>
        ))}
      </div>
    </div>
  );
}
