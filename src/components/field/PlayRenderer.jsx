import React, { useMemo } from 'react';
import FlagFootballField from './FlagFootballField';
import PositionMarker from './PositionMarker';
import RoutePath from './RoutePath';
import { FLAG_FOOTBALL, DEFAULT_FORMAT, getPositionsForFormat } from '@/config/flagFootball';

/**
 * Shared renderer for visual plays. Used in PlayCard, PlayDetail, StudyMode, SidelineMode, Playbook Pro.
 *
 * Returns null if play.use_renderer is falsy (backward compat with photo plays).
 *
 * Modes:
 *   "view"     — all positions/routes visible, highlighted position in amber
 *   "study"    — highlighted position full opacity, others at 20%
 *   "sideline" — all visible, larger, tappable
 *   "mini"     — compact card thumbnail, non-interactive
 */
export default function PlayRenderer({
  play,
  assignments = [],
  highlightPosition = null,
  mirrored = false,
  showLabels = true,
  mode = 'view', // "view" | "study" | "sideline" | "mini"
  onPositionTap,
  className = '',
}) {
  const viewBox = FLAG_FOOTBALL.field.viewBox;

  // Backward compat: don't render for photo-based plays
  if (play?.use_renderer !== true && play?.use_renderer !== 'true') return null;

  // Build position config map (base + custom)
  const formatId = play.format || DEFAULT_FORMAT;
  const configPositions = getPositionsForFormat(formatId);
  const configMap = Object.fromEntries(configPositions.map((p) => [p.id, p]));

  // Merge in custom positions from play
  let customPositions = [];
  if (play.custom_positions) {
    try {
      customPositions = typeof play.custom_positions === 'string'
        ? JSON.parse(play.custom_positions)
        : play.custom_positions;
    } catch { customPositions = []; }
  }
  customPositions.forEach((cp) => {
    if (cp.id && !configMap[cp.id]) {
      configMap[cp.id] = cp;
    }
  });

  // Apply mirror transform if needed
  const mirrorX = (x) => mirrored ? (100 - x) : x;

  // Build renderable data from assignments
  const renderData = useMemo(() => {
    return assignments
      .filter((a) => a.start_x != null && a.start_y != null)
      .map((a) => {
        const posConfig = configMap[a.position] || {
          id: a.position,
          shortLabel: a.position,
          color: '#94a3b8',
        };

        const x = mirrorX(a.start_x);
        const y = a.start_y;

        let routePath = null;
        if (a.route_path) {
          try {
            const parsed = typeof a.route_path === 'string'
              ? JSON.parse(a.route_path)
              : a.route_path;
            if (Array.isArray(parsed) && parsed.length >= 2) {
              routePath = parsed.map((pt) => ({
                x: mirrorX(pt.x),
                y: pt.y,
              }));
            }
          } catch { routePath = null; }
        }

        return {
          positionId: a.position,
          posConfig,
          x,
          y,
          routePath,
          movementType: a.movement_type,
          assignmentText: a.assignment_text,
        };
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignments, mirrored]);

  if (renderData.length === 0) return null;

  const isInteractive = mode === 'sideline' || (mode === 'view' && !!onPositionTap);
  const isMini = mode === 'mini';

  return (
    <div className={`relative ${className}`}>
      <FlagFootballField
        viewBox={viewBox}
        showScrimmage={!isMini}
        scrimmageY={55}
      >
        {/* Route paths (render behind markers) */}
        {renderData.map((rd) => {
          if (!rd.routePath || rd.routePath.length < 2) return null;

          const isHighlighted = highlightPosition === rd.positionId;
          const isDimmed = mode === 'study' && highlightPosition && !isHighlighted;

          return (
            <RoutePath
              key={`route-${rd.positionId}`}
              routePath={rd.routePath}
              color={rd.posConfig.color}
              isHighlighted={isHighlighted}
              dimmed={isDimmed}
              viewBox={viewBox}
            />
          );
        })}

        {/* Position markers */}
        {renderData.map((rd) => {
          const isHighlighted = highlightPosition === rd.positionId;
          const isDimmed = mode === 'study' && highlightPosition && !isHighlighted;

          return (
            <PositionMarker
              key={`pos-${rd.positionId}`}
              position={rd.posConfig}
              x={rd.x}
              y={rd.y}
              isSelected={isHighlighted}
              isHighlighted={isHighlighted}
              dimmed={isDimmed}
              isDraggable={false}
              showLabel={showLabels}
              onClick={isInteractive ? onPositionTap : undefined}
              viewBox={viewBox}
            />
          );
        })}
      </FlagFootballField>
    </div>
  );
}
