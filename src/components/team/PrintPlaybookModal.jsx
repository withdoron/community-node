import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, LayoutGrid, Maximize2, BookMarked, GripVertical } from 'lucide-react';

const LAYOUTS = [
  {
    id: 'player_card',
    label: 'Player Card',
    description: 'One page per player with their assignments',
    icon: User,
  },
  {
    id: 'quick_reference',
    label: 'Quick Reference',
    description: '4 plays per page — sideline ready',
    icon: LayoutGrid,
  },
  {
    id: 'full_page',
    label: 'Full Page',
    description: 'One play per page with all details',
    icon: Maximize2,
  },
  {
    id: 'route_reference',
    label: 'Route Reference',
    description: 'Route vocabulary sheet — laminate it',
    icon: BookMarked,
  },
];

// Helper: group plays by formation
function groupByFormation(plays) {
  const map = {};
  plays.forEach((p) => {
    const key = p.formation || 'Other';
    if (!map[key]) map[key] = [];
    map[key].push(p);
  });
  return map;
}

export default function PrintPlaybookModal({
  open,
  onOpenChange,
  plays = [],
  members = [],
  isCoach,
  currentUserId,
  onPrint,
}) {
  const [layout, setLayout] = useState('quick_reference');
  const [selectedPlayIds, setSelectedPlayIds] = useState(new Set());
  const [groupByFormationOn, setGroupByFormationOn] = useState(true);
  const [orderedPlayIds, setOrderedPlayIds] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [initialized, setInitialized] = useState(false);
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  // Active (non-experimental, non-archived) plays only
  const printablePlays = useMemo(
    () => plays.filter((p) => (p.status || 'active') === 'active'),
    [plays]
  );

  // Initialize selection: default to game day plays if any, else all
  const gameDayPlays = useMemo(() => printablePlays.filter((p) => p.game_day), [printablePlays]);

  // Reset state when modal opens
  React.useEffect(() => {
    if (open && !initialized) {
      const defaultIds = gameDayPlays.length > 0
        ? new Set(gameDayPlays.map((p) => p.id))
        : new Set(printablePlays.map((p) => p.id));
      setSelectedPlayIds(defaultIds);
      setOrderedPlayIds(printablePlays.map((p) => p.id));
      setInitialized(true);

      // Default player for Player Card: current user's linked player (parent) or self
      const currentMember = members.find((m) => m.user_id === currentUserId);
      if (currentMember?.role === 'parent' && currentMember.linked_player_id) {
        setSelectedPlayerId(currentMember.linked_player_id);
      } else if (currentMember?.role === 'player') {
        setSelectedPlayerId(currentMember.id);
      } else {
        // Coach — default to first player
        const firstPlayer = members.find((m) => m.role === 'player');
        setSelectedPlayerId(firstPlayer?.id || '');
      }
    }
    if (!open) {
      setInitialized(false);
    }
  }, [open, initialized, gameDayPlays, printablePlays, members, currentUserId]);

  // Players for player card picker
  const playerMembers = useMemo(() => members.filter((m) => m.role === 'player'), [members]);

  // Parent can only print player card for their own child
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isParent = currentMember?.role === 'parent';
  const parentLinkedPlayerIds = useMemo(() => {
    if (!isParent) return null;
    return new Set(
      members
        .filter((m) => m.user_id === currentUserId && m.role === 'parent' && m.linked_player_id)
        .map((m) => m.linked_player_id)
    );
  }, [members, currentUserId, isParent]);

  const availablePlayers = useMemo(() => {
    if (isCoach) return playerMembers;
    if (parentLinkedPlayerIds) return playerMembers.filter((m) => parentLinkedPlayerIds.has(m.id));
    return [];
  }, [isCoach, playerMembers, parentLinkedPlayerIds]);

  // Quick select handlers
  const selectGameDay = () => setSelectedPlayIds(new Set(gameDayPlays.map((p) => p.id)));
  const selectAll = () => setSelectedPlayIds(new Set(printablePlays.map((p) => p.id)));
  const togglePlay = (id) => {
    setSelectedPlayIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Build ordered list of selected plays
  const selectedPlaysOrdered = useMemo(() => {
    const playMap = Object.fromEntries(printablePlays.map((p) => [p.id, p]));
    if (groupByFormationOn) {
      // Group by formation, maintain order within groups
      const selected = orderedPlayIds.filter((id) => selectedPlayIds.has(id)).map((id) => playMap[id]).filter(Boolean);
      return selected;
    }
    return orderedPlayIds.filter((id) => selectedPlayIds.has(id)).map((id) => playMap[id]).filter(Boolean);
  }, [orderedPlayIds, selectedPlayIds, printablePlays, groupByFormationOn]);

  // Drag-and-drop reorder
  const handleDragStart = useCallback((idx) => {
    dragItem.current = idx;
  }, []);
  const handleDragEnter = useCallback((idx) => {
    dragOverItem.current = idx;
  }, []);
  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const items = [...orderedPlayIds];
    const draggedItem = items[dragItem.current];
    items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, draggedItem);
    setOrderedPlayIds(items);
    dragItem.current = null;
    dragOverItem.current = null;
  }, [orderedPlayIds]);

  const handlePrint = () => {
    onPrint({
      layout,
      plays: selectedPlaysOrdered,
      groupByFormation: groupByFormationOn,
      playerId: layout === 'player_card' ? selectedPlayerId : null,
    });
  };

  // Build display list for play selection
  const playsByFormation = useMemo(() => groupByFormation(printablePlays), [printablePlays]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">Print Playbook</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section A: Layout Selection */}
          <div>
            <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider mb-3">Layout</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LAYOUTS.map((l) => {
                // Parent can't use player_card for non-linked players, but can pick the layout
                const Icon = l.icon;
                const isActive = layout === l.id;
                return (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLayout(l.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-colors min-h-[44px] ${
                      isActive
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-secondary hover:border-border'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-foreground-soft'}`}>
                      {l.label}
                    </span>
                    <span className="text-xs text-muted-foreground/70 leading-tight">{l.description}</span>
                  </button>
                );
              })}
            </div>

            {/* Player picker for Player Card layout */}
            {layout === 'player_card' && (
              <div className="mt-3">
                <label className="text-muted-foreground text-xs block mb-1">Print for player</label>
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-ring min-h-[44px]"
                >
                  <option value="">Select a player</option>
                  {availablePlayers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.jersey_name || 'Player'} {m.jersey_number ? `#${m.jersey_number}` : ''} — {m.position || 'No position'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Section B: Play Selection (hidden for route reference) */}
          {layout !== 'route_reference' && <div>
            <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider mb-3">
              Plays
              <span className="text-muted-foreground/70 font-normal ml-2">{selectedPlayIds.size} selected</span>
            </h3>
            <div className="flex gap-2 mb-3">
              {gameDayPlays.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectGameDay}
                  className="border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent min-h-[36px] text-xs"
                >
                  Game Day
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
                className="border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent min-h-[36px] text-xs"
              >
                Full Playbook
              </Button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {Object.entries(playsByFormation).map(([formation, formPlays]) => (
                <div key={formation}>
                  <p className="text-xs text-muted-foreground/70 uppercase tracking-wider py-1">{formation}</p>
                  {formPlays.map((p) => {
                    const checked = selectedPlayIds.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlay(p.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-secondary transition-colors text-left"
                      >
                        <div
                          className={`flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${
                            checked ? 'bg-primary border-primary' : 'bg-transparent border-border'
                          }`}
                        >
                          {checked && <span className="text-primary-foreground font-bold text-xs leading-none">✓</span>}
                        </div>
                        <span className={`text-sm flex-1 ${checked ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {p.name}
                        </span>
                        {p.game_day && (
                          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">GD</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>}

          {/* Section C: Grouping & Order */}
          {layout !== 'route_reference' && <div>
            <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider mb-3">Order</h3>
            <button
              type="button"
              onClick={() => setGroupByFormationOn((v) => !v)}
              className="flex items-center gap-3 mb-3"
            >
              <div className={`relative w-10 h-5 rounded-full transition-colors ${groupByFormationOn ? 'bg-primary' : 'bg-surface'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-slate-100 transition-transform ${groupByFormationOn ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-sm text-foreground-soft">Group by formation</span>
            </button>
            <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1">
              {orderedPlayIds
                .filter((id) => selectedPlayIds.has(id))
                .map((id, idx) => {
                  const play = printablePlays.find((p) => p.id === id);
                  if (!play) return null;
                  const globalIdx = orderedPlayIds.indexOf(id);
                  return (
                    <div
                      key={id}
                      draggable
                      onDragStart={() => handleDragStart(globalIdx)}
                      onDragEnter={() => handleDragEnter(globalIdx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className="flex items-center gap-2 px-2 py-1.5 rounded bg-secondary border border-border cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/70 flex-shrink-0" />
                      <span className="text-sm text-foreground flex-1 truncate">{play.name}</span>
                      <span className="text-xs text-muted-foreground/70">{play.formation || '—'}</span>
                    </div>
                  );
                })}
            </div>
          </div>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            type="button"
            variant="outline"
            className="border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium min-h-[44px]"
            onClick={handlePrint}
            disabled={layout !== 'route_reference' && (selectedPlayIds.size === 0 || (layout === 'player_card' && !selectedPlayerId))}
          >
            Preview & Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
