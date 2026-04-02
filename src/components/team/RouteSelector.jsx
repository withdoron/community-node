import React, { useState, useEffect, useCallback } from 'react';
import { X, Pencil, Trash2, Plus, Minus, ChevronRight } from 'lucide-react';
import {
  getRoutesForPosition,
  ROUTE_SEGMENT_DEFAULTS,
  isChainableRoute,
} from '@/config/flagFootball';

const MIN_YARDS = 3;
const MAX_YARDS = 30;
const MAX_SEGMENTS = 3;

/**
 * Route assignment panel for a single position.
 * Supports route chaining: coaches can stack 1-3 segments with per-segment distance control.
 * Single-segment experience is nearly identical to the old single-route flow.
 */
export default function RouteSelector({
  position, // { id, label, shortLabel, color }
  positionId, // position ID for route menu lookup (e.g. 'QB', 'X', 'custom_123')
  currentRoute, // { movementType, routePath, segments } or null
  onSelectPreset, // (routeId: string) => void — legacy single-route callback
  onSegmentsChange, // (segments: [{routeId, yards}]) => void — chained route callback
  onDrawCustom, // () => void
  onClearRoute, // () => void
  onAssignmentTextChange, // (text: string) => void
  assignmentText = '',
  onClose, // () => void — dismiss the panel
}) {
  // ——— Segment state ———
  const [segments, setSegments] = useState(() => {
    if (currentRoute?.segments && Array.isArray(currentRoute.segments) && currentRoute.segments.length > 0) {
      return currentRoute.segments;
    }
    return [];
  });
  const [pickingNext, setPickingNext] = useState(false); // true when grid is open for adding next segment

  // Sync segments from parent when currentRoute changes (e.g. position switch)
  useEffect(() => {
    if (currentRoute?.segments && Array.isArray(currentRoute.segments) && currentRoute.segments.length > 0) {
      setSegments(currentRoute.segments);
      setPickingNext(false);
    } else if (currentRoute?.movementType && !currentRoute.segments) {
      // Legacy single-route: don't create segments — let the grid show normally
      setSegments([]);
      setPickingNext(false);
    } else if (!currentRoute?.movementType) {
      setSegments([]);
      setPickingNext(false);
    }
  }, [currentRoute?.movementType, currentRoute?.segments, positionId]);

  const routes = getRoutesForPosition(positionId || position?.id);
  const presetRoutes = routes.filter((r) => r.id !== 'custom');

  // ——— Notify parent of segment changes ———
  const emitSegments = useCallback((newSegments) => {
    setSegments(newSegments);
    if (onSegmentsChange) {
      onSegmentsChange(newSegments);
    }
  }, [onSegmentsChange]);

  // ——— Route button tap ———
  const handleRouteTap = useCallback((routeId) => {
    if (segments.length === 0 && !pickingNext) {
      // First segment — create it
      const yards = ROUTE_SEGMENT_DEFAULTS[routeId] || 10;
      const newSegments = [{ routeId, yards }];
      emitSegments(newSegments);
      setPickingNext(false);
    } else if (pickingNext) {
      // Adding next segment
      const yards = ROUTE_SEGMENT_DEFAULTS[routeId] || 10;
      const newSegments = [...segments, { routeId, yards }];
      emitSegments(newSegments);
      setPickingNext(false);
    } else {
      // Replace segment 1 (user tapped a new route while segments exist — start over)
      const yards = ROUTE_SEGMENT_DEFAULTS[routeId] || 10;
      const newSegments = [{ routeId, yards }];
      emitSegments(newSegments);
      setPickingNext(false);
    }
  }, [segments, pickingNext, emitSegments]);

  // ——— Yard steppers ———
  const handleYardsChange = useCallback((index, delta) => {
    setSegments((prev) => {
      const updated = [...prev];
      const newYards = Math.max(MIN_YARDS, Math.min(MAX_YARDS, updated[index].yards + delta));
      updated[index] = { ...updated[index], yards: newYards };
      if (onSegmentsChange) onSegmentsChange(updated);
      return updated;
    });
  }, [onSegmentsChange]);

  // ——— Remove segment ———
  const handleRemoveSegment = useCallback((index) => {
    if (index === 0) {
      // Removing first segment clears all (chain breaks)
      emitSegments([]);
    } else {
      // Remove this segment and everything after it
      const newSegments = segments.slice(0, index);
      emitSegments(newSegments);
    }
    setPickingNext(false);
  }, [segments, emitSegments]);

  // ——— Clear all ———
  const handleClear = useCallback(() => {
    emitSegments([]);
    setPickingNext(false);
    onClearRoute?.();
  }, [emitSegments, onClearRoute]);

  // ——— Can add more segments? ———
  const lastSegment = segments[segments.length - 1];
  const canAddSegment = segments.length > 0
    && segments.length < MAX_SEGMENTS
    && lastSegment
    && isChainableRoute(lastSegment.routeId)
    && !pickingNext;

  // ——— Compound name ———
  const compoundName = segments.length > 0
    ? segments.map((s) => {
        const r = presetRoutes.find((pr) => pr.id === s.routeId);
        return r?.label || s.routeId.replace(/_/g, ' ');
      }).join(' \u2192 ')
    : '';

  // Show route grid when: no segments, or picking next segment
  const showGrid = segments.length === 0 || pickingNext;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full flex-shrink-0"
            style={{ backgroundColor: position.color }}
          />
          <span className="font-semibold text-foreground">{position.label}</span>
          <span className="text-muted-foreground text-sm">{position.shortLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {(segments.length > 0 || currentRoute?.movementType) && (
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-red-400 p-1.5 rounded-lg transition-colors"
              title="Clear route"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Segment list (when segments exist) */}
        {segments.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              Route segments
            </p>
            {segments.map((seg, i) => {
              const routeInfo = presetRoutes.find((r) => r.id === seg.routeId);
              const label = routeInfo?.label || seg.routeId.replace(/_/g, ' ');
              return (
                <div
                  key={`${seg.routeId}-${i}`}
                  className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 border border-border"
                >
                  <span className="text-primary font-bold text-sm w-5 text-center">
                    {i + 1}
                  </span>
                  <span className="text-foreground text-sm font-medium flex-1 min-w-0 truncate">
                    {label}
                  </span>
                  {/* Yard stepper */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleYardsChange(i, -1)}
                      disabled={seg.yards <= MIN_YARDS}
                      className="w-8 h-8 flex items-center justify-center rounded bg-surface text-foreground-soft hover:bg-surface disabled:opacity-30 disabled:hover:bg-surface transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-foreground-soft text-sm font-medium w-10 text-center tabular-nums">
                      {seg.yards} yd
                    </span>
                    <button
                      type="button"
                      onClick={() => handleYardsChange(i, 1)}
                      disabled={seg.yards >= MAX_YARDS}
                      className="w-8 h-8 flex items-center justify-center rounded bg-surface text-foreground-soft hover:bg-surface disabled:opacity-30 disabled:hover:bg-surface transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => handleRemoveSegment(i)}
                    className="text-muted-foreground/70 hover:text-red-400 p-1 transition-colors"
                    title="Remove segment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}

            {/* Compound name */}
            {segments.length > 1 && (
              <p className="text-primary/70 text-xs font-medium px-1">
                {compoundName}
              </p>
            )}

            {/* Add segment button */}
            {canAddSegment && (
              <button
                type="button"
                onClick={() => setPickingNext(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors min-h-[44px] border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-primary"
              >
                <Plus className="h-4 w-4" />
                Add segment
              </button>
            )}
          </div>
        )}

        {/* Picking indicator */}
        {pickingNext && (
          <div className="flex items-center gap-2 px-1">
            <ChevronRight className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary text-xs font-medium">
              Pick segment {segments.length + 1}
            </span>
          </div>
        )}

        {/* Route preset grid */}
        {showGrid && (
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              {pickingNext ? 'Next route' : 'Route'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {presetRoutes.map((route) => {
                const isActive = !pickingNext && segments.length === 1 && segments[0].routeId === route.id;
                return (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => handleRouteTap(route.id)}
                    className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                      isActive
                        ? 'bg-primary/20 text-primary border border-primary/50'
                        : 'bg-secondary text-foreground-soft border border-border hover:border-border'
                    }`}
                  >
                    {route.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Draw Custom button */}
        {!pickingNext && (
          <button
            type="button"
            onClick={onDrawCustom}
            className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center gap-2 ${
              currentRoute?.movementType === 'custom'
                ? 'bg-primary/20 text-primary border border-primary/50'
                : 'bg-transparent text-foreground-soft border border-border hover:border-primary/50 hover:text-primary'
            }`}
          >
            <Pencil className="h-4 w-4" />
            Draw Custom Route
          </button>
        )}

        {/* Assignment text */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Assignment</p>
          <textarea
            value={assignmentText}
            onChange={(e) => onAssignmentTextChange?.(e.target.value)}
            placeholder="What does this player do?"
            rows={2}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground text-sm placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none resize-none min-h-[60px]"
          />
        </div>
      </div>
    </div>
  );
}
