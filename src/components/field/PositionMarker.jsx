import React, { useRef, useCallback } from 'react';
import { percentToSvg, svgToPercent } from './FlagFootballField';

const MARKER_RADIUS = 12;
const SELECTED_RADIUS = 14;
const FONT_SIZE = 8;

/**
 * Draggable position marker on the SVG field.
 * Coordinates are percentage-based (0-100), converted to SVG internally.
 */
export default function PositionMarker({
  position, // { id, shortLabel, color }
  x, // percentage 0-100
  y, // percentage 0-100
  isSelected = false,
  isHighlighted = false,
  isDraggable = false,
  dimmed = false,
  showLabel = true,
  onClick,
  onDragEnd,
  viewBox = '0 0 400 200',
}) {
  const dragging = useRef(false);
  const dragPos = useRef({ x, y });
  const groupRef = useRef(null);
  const svgRef = useRef(null);

  const svgPt = percentToSvg(x, y, viewBox);
  const r = isSelected ? SELECTED_RADIUS : MARKER_RADIUS;
  const opacity = dimmed ? 0.2 : 1;

  /** Get the owning <svg> element from our <g> ref */
  const getSvgEl = useCallback(() => {
    if (svgRef.current) return svgRef.current;
    let el = groupRef.current;
    while (el && el.tagName !== 'svg') el = el.parentElement;
    svgRef.current = el;
    return el;
  }, []);

  /** Convert a pointer event to percentage coords within the SVG viewBox */
  const pointerToPercent = useCallback(
    (e) => {
      const svg = getSvgEl();
      if (!svg) return { x, y };
      const rect = svg.getBoundingClientRect();
      const parts = viewBox.split(' ').map(Number);
      const [, , vbW, vbH] = parts;
      const svgX = ((e.clientX - rect.left) / rect.width) * vbW;
      const svgY = ((e.clientY - rect.top) / rect.height) * vbH;
      const pct = svgToPercent(svgX, svgY, viewBox);
      // Clamp to field bounds
      return {
        x: Math.max(2, Math.min(98, pct.x)),
        y: Math.max(5, Math.min(95, pct.y)),
      };
    },
    [getSvgEl, viewBox, x, y]
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (!isDraggable) return;
      e.preventDefault();
      e.stopPropagation();
      dragging.current = true;
      dragPos.current = { x, y };
      e.target.setPointerCapture(e.pointerId);
    },
    [isDraggable, x, y]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!dragging.current) return;
      e.preventDefault();
      const pct = pointerToPercent(e);
      dragPos.current = pct;
      // Live update the marker position via transform
      const pt = percentToSvg(pct.x, pct.y, viewBox);
      if (groupRef.current) {
        groupRef.current.setAttribute('transform', `translate(${pt.x}, ${pt.y})`);
      }
    },
    [pointerToPercent, viewBox]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (!dragging.current) return;
      dragging.current = false;
      const pct = pointerToPercent(e);
      if (onDragEnd) {
        onDragEnd(position.id, pct);
      }
    },
    [onDragEnd, pointerToPercent, position.id]
  );

  const handleClick = useCallback(
    (e) => {
      // Only fire click if we didn't just drag
      if (onClick) {
        e.stopPropagation();
        onClick(position.id);
      }
    },
    [onClick, position.id]
  );

  return (
    <g
      ref={groupRef}
      transform={`translate(${svgPt.x}, ${svgPt.y})`}
      style={{
        cursor: isDraggable ? 'grab' : onClick ? 'pointer' : 'default',
        touchAction: 'none',
        opacity,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      {/* Highlight ring */}
      {isHighlighted && (
        <circle
          r={r + 4}
          fill="none"
          stroke="#d4a046"
          strokeWidth="2"
          opacity="0.6"
        />
      )}

      {/* Selected border */}
      {isSelected && (
        <circle
          r={r + 2}
          fill="none"
          stroke="#d4a046"
          strokeWidth="2"
        />
      )}

      {/* Main circle */}
      <circle
        r={r}
        fill={position.color}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth="1"
      />

      {/* Label — only when showLabel is true */}
      {showLabel && (
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontSize={FONT_SIZE}
          fontWeight="bold"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {position.shortLabel}
        </text>
      )}
    </g>
  );
}
