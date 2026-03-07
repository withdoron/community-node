import React from 'react';

/**
 * Convert percentage coordinates (0-100) to SVG viewBox pixel coordinates.
 * viewBox default: "0 0 400 200"
 */
export function percentToSvg(xPct, yPct, viewBox = '0 0 400 200') {
  const parts = viewBox.split(' ').map(Number);
  const [, , vbWidth, vbHeight] = parts;
  return {
    x: (xPct / 100) * vbWidth,
    y: (yPct / 100) * vbHeight,
  };
}

/**
 * Convert SVG pixel coordinates back to percentage coordinates.
 */
export function svgToPercent(svgX, svgY, viewBox = '0 0 400 200') {
  const parts = viewBox.split(' ').map(Number);
  const [, , vbWidth, vbHeight] = parts;
  return {
    x: (svgX / vbWidth) * 100,
    y: (svgY / vbHeight) * 100,
  };
}

const FIELD_GREEN = '#2d5a27';
const END_ZONE_GREEN = '#1e4620';
const LINE_WHITE = 'rgba(255,255,255,0.35)';
const LINE_WHITE_BOLD = 'rgba(255,255,255,0.5)';
const SCRIMMAGE_AMBER = '#d4a046';

/**
 * SVG flag football field.
 * Coordinates: viewBox "0 0 400 200" — 400 wide, 200 tall.
 * End zones: top 15% and bottom 15% of height.
 * Playing field: middle 70% (y: 30 to 170).
 * 6 yard lines across 60 yards of playing field.
 */
export default function FlagFootballField({
  viewBox = '0 0 400 200',
  cropViewBox,       // optional — e.g. "50 0 300 180" to zoom/crop the visible area
  scrimmageY = 55,
  showScrimmage = false,
  subtleLines = false, // reduce line opacity for game context
  className = '',
  children,
}) {
  const parts = viewBox.split(' ').map(Number);
  const [, , vbW, vbH] = parts;

  // Line opacities — subtle mode dims lines so routes pop
  const lineWhite = subtleLines ? 'rgba(255,255,255,0.15)' : LINE_WHITE;
  const lineBold = subtleLines ? 'rgba(255,255,255,0.22)' : LINE_WHITE_BOLD;
  // Use cropViewBox for the <svg> element if provided; all internal
  // drawing still uses the full viewBox dimensions so the field,
  // end zones, and yard lines render at correct absolute positions.
  const svgViewBox = cropViewBox || viewBox;

  // End zone boundaries
  const ezTop = vbH * 0.15;       // top end zone bottom edge
  const ezBottom = vbH * 0.85;    // bottom end zone top edge

  // Yard line positions (6 lines across playing field)
  const playingFieldTop = ezTop;
  const playingFieldHeight = ezBottom - ezTop;
  const yardLineCount = 6;
  const yardLines = [];
  for (let i = 1; i <= yardLineCount; i++) {
    const y = playingFieldTop + (playingFieldHeight / (yardLineCount + 1)) * i;
    yardLines.push(y);
  }

  // Scrimmage line position in SVG coords
  const scrimmagePoint = percentToSvg(0, scrimmageY, viewBox);

  return (
    <svg
      viewBox={svgViewBox}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Field background */}
      <rect x="0" y="0" width={vbW} height={vbH} fill={FIELD_GREEN} rx="4" />

      {/* Top end zone */}
      <rect x="0" y="0" width={vbW} height={ezTop} fill={END_ZONE_GREEN} rx="4" />
      {/* Bottom end zone */}
      <rect x="0" y={ezBottom} width={vbW} height={vbH - ezBottom} fill={END_ZONE_GREEN} rx="4" />

      {/* End zone boundary lines */}
      <line x1="0" y1={ezTop} x2={vbW} y2={ezTop} stroke={lineBold} strokeWidth="1" />
      <line x1="0" y1={ezBottom} x2={vbW} y2={ezBottom} stroke={lineBold} strokeWidth="1" />

      {/* Yard lines */}
      {yardLines.map((y, i) => (
        <g key={i}>
          <line
            x1="0" y1={y} x2={vbW} y2={y}
            stroke={lineWhite}
            strokeWidth="0.5"
          />
          {/* Hash marks */}
          <line x1={vbW * 0.33} y1={y - 2} x2={vbW * 0.33} y2={y + 2} stroke={lineWhite} strokeWidth="0.5" />
          <line x1={vbW * 0.67} y1={y - 2} x2={vbW * 0.67} y2={y + 2} stroke={lineWhite} strokeWidth="0.5" />
        </g>
      ))}

      {/* Sidelines */}
      <line x1="1" y1={ezTop} x2="1" y2={ezBottom} stroke={lineWhite} strokeWidth="0.5" />
      <line x1={vbW - 1} y1={ezTop} x2={vbW - 1} y2={ezBottom} stroke={lineWhite} strokeWidth="0.5" />

      {/* Scrimmage line */}
      {showScrimmage && (
        <line
          x1="0"
          y1={scrimmagePoint.y}
          x2={vbW}
          y2={scrimmagePoint.y}
          stroke={SCRIMMAGE_AMBER}
          strokeWidth="1.5"
          strokeDasharray="6 4"
          opacity="0.7"
        />
      )}

      {/* Children (markers, routes, overlays) rendered in SVG coordinate space */}
      {children}
    </svg>
  );
}
