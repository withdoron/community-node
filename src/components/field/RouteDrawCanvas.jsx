import React, { useState, useRef, useCallback } from 'react';
import { percentToSvg, svgToPercent } from './FlagFootballField';

const MIN_POINT_DISTANCE = 2; // percentage units between sampled points
const MAX_POINTS = 20;

/**
 * Transparent SVG overlay for freehand route drawing.
 * Captures pointer events and produces a simplified path in percentage coordinates.
 */
export default function RouteDrawCanvas({
  active = false,
  startPoint, // { x, y } percentage
  onRouteDrawn, // (simplifiedPath: Array<{x,y}>) => void
  onCancel,
  viewBox = '0 0 400 200',
}) {
  const [rawPoints, setRawPoints] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const svgRef = useRef(null);

  const pointerToPercent = useCallback(
    (e) => {
      const svg = svgRef.current;
      if (!svg) return { x: 50, y: 50 };
      const rect = svg.getBoundingClientRect();
      const parts = viewBox.split(' ').map(Number);
      const [, , vbW, vbH] = parts;
      const svgX = ((e.clientX - rect.left) / rect.width) * vbW;
      const svgY = ((e.clientY - rect.top) / rect.height) * vbH;
      const pct = svgToPercent(svgX, svgY, viewBox);
      return {
        x: Math.max(0, Math.min(100, pct.x)),
        y: Math.max(0, Math.min(100, pct.y)),
      };
    },
    [viewBox]
  );

  const handlePointerDown = useCallback(
    (e) => {
      if (!active) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDrawing(true);
      // Start from the position's start point
      const initial = startPoint || pointerToPercent(e);
      setRawPoints([initial]);
      e.target.setPointerCapture(e.pointerId);
    },
    [active, startPoint, pointerToPercent]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      const pt = pointerToPercent(e);
      setRawPoints((prev) => [...prev, pt]);
    },
    [isDrawing, pointerToPercent]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (!isDrawing) return;
      e.preventDefault();
      setIsDrawing(false);

      // Simplify path: keep points that are at least MIN_POINT_DISTANCE apart
      const simplified = [rawPoints[0]];
      for (let i = 1; i < rawPoints.length; i++) {
        const last = simplified[simplified.length - 1];
        const dx = rawPoints[i].x - last.x;
        const dy = rawPoints[i].y - last.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= MIN_POINT_DISTANCE) {
          simplified.push(rawPoints[i]);
        }
      }
      // Always include the last point
      if (rawPoints.length > 1) {
        const lastRaw = rawPoints[rawPoints.length - 1];
        const lastSimp = simplified[simplified.length - 1];
        if (lastRaw.x !== lastSimp.x || lastRaw.y !== lastSimp.y) {
          simplified.push(lastRaw);
        }
      }

      // Downsample if still too many points
      let result = simplified;
      if (result.length > MAX_POINTS) {
        const step = (result.length - 1) / (MAX_POINTS - 1);
        const downsampled = [];
        for (let i = 0; i < MAX_POINTS; i++) {
          downsampled.push(result[Math.round(i * step)]);
        }
        result = downsampled;
      }

      // Ensure start point is first
      if (startPoint) {
        result[0] = { ...startPoint };
      }

      // Round all points to 1 decimal place
      result = result.map((p) => ({
        x: Math.round(p.x * 10) / 10,
        y: Math.round(p.y * 10) / 10,
      }));

      if (result.length >= 2) {
        onRouteDrawn?.(result);
      }
      setRawPoints([]);
    },
    [isDrawing, rawPoints, onRouteDrawn, startPoint]
  );

  if (!active) return null;

  // Convert raw points to SVG polyline for preview
  const previewPoints = rawPoints
    .map((pt) => {
      const s = percentToSvg(pt.x, pt.y, viewBox);
      return `${s.x},${s.y}`;
    })
    .join(' ');

  const parts = viewBox.split(' ').map(Number);
  const [, , vbW, vbH] = parts;

  return (
    <>
      {/* Transparent overlay that captures pointer events */}
      <rect
        ref={svgRef}
        x="0" y="0"
        width={vbW} height={vbH}
        fill="transparent"
        style={{ touchAction: 'none', cursor: 'crosshair' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Preview polyline while drawing */}
      {rawPoints.length > 1 && (
        <polyline
          points={previewPoints}
          fill="none"
          stroke="#d4a046"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="4 3"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </>
  );
}
