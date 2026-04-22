import React, { useMemo } from 'react';
import { percentToSvg } from './FlagFootballField';

/**
 * SVG polyline for a route path with an arrowhead at the end.
 * Points are in percentage coordinates (0-100), converted via percentToSvg.
 */
export default function RoutePath({
  routePath = [], // array of {x, y} in percentage
  color = '#ffffff',
  isHighlighted = false,
  isPreview = false,
  dimmed = false,
  viewBox = '0 0 400 200',
  strokeWidthOverride,  // optional — force specific strokeWidth (e.g. game mode)
  opacityOverride,      // optional — force specific opacity (e.g. game mode)
}) {
  const svgPoints = useMemo(() => {
    return routePath.map((pt) => percentToSvg(pt.x, pt.y, viewBox));
  }, [routePath, viewBox]);

  const lastPtRaw = svgPoints.length >= 2 ? svgPoints[svgPoints.length - 1] : null;
  const prevPtRaw = svgPoints.length >= 2 ? svgPoints[svgPoints.length - 2] : null;
  const arrowSizeVal = isHighlighted ? 6 : 4;

  // Arrow at the end — small triangle pointing in the direction of the last segment
  const arrow = useMemo(() => {
    if (!lastPtRaw || !prevPtRaw) return null;
    const lastPt = lastPtRaw;
    const prevPt = prevPtRaw;
    const arrowSize = arrowSizeVal;
    const dx = lastPt.x - prevPt.x;
    const dy = lastPt.y - prevPt.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return null;

    // Unit vector in direction of last segment
    const ux = dx / len;
    const uy = dy / len;

    // Perpendicular
    const px = -uy;
    const py = ux;

    // Arrow tip at lastPt, base behind it
    const tipX = lastPt.x;
    const tipY = lastPt.y;
    const baseX = lastPt.x - ux * arrowSize;
    const baseY = lastPt.y - uy * arrowSize;

    const p1 = `${tipX},${tipY}`;
    const p2 = `${baseX + px * arrowSize * 0.5},${baseY + py * arrowSize * 0.5}`;
    const p3 = `${baseX - px * arrowSize * 0.5},${baseY - py * arrowSize * 0.5}`;

    return `${p1} ${p2} ${p3}`;
  }, [lastPtRaw, prevPtRaw, arrowSizeVal]);

  if (svgPoints.length < 2) return null;

  const pointsStr = svgPoints.map((p) => `${p.x},${p.y}`).join(' ');
  const strokeWidth = strokeWidthOverride ?? (isHighlighted ? 3 : 1.5);
  const opacity = opacityOverride ?? (dimmed ? 0.2 : isHighlighted ? 1 : 0.6);
  const dashArray = isPreview ? '4 3' : 'none';

  return (
    <g style={{ opacity }}>
      <polyline
        points={pointsStr}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={dashArray}
      />
      {arrow && (
        <polygon
          points={arrow}
          fill={color}
        />
      )}
    </g>
  );
}