import React, { useMemo } from 'react';
import { X, Printer } from 'lucide-react';
import PlayRenderer from '@/components/field/PlayRenderer';
import { FLAG_FOOTBALL, ROUTE_GLOSSARY } from '@/config/flagFootball';

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

// Chunk array into groups of N
function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * PrintPlaybook — full-screen overlay that renders plays for printing.
 *
 * Three layouts:
 *   player_card    — one page per play showing the player's assignment highlighted
 *   quick_reference — 4 plays per page in 2x2 grid, visual only
 *   full_page      — one play per page with diagram + all assignments table + coach notes
 */
export default function PrintPlaybook({
  layout,
  plays = [],
  groupByFormation: shouldGroup,
  playerId,
  members = [],
  assignmentsByPlayId = {},
  onClose,
}) {
  const player = useMemo(() => members.find((m) => m.id === playerId), [members, playerId]);

  // Find the player's position for highlighting
  const playerPosition = player?.position || null;

  // Group plays if requested
  const groupedPlays = useMemo(() => {
    if (shouldGroup) return groupByFormation(plays);
    return { 'All Plays': plays };
  }, [plays, shouldGroup]);

  const handlePrint = () => {
    window.print();
  };

  if (layout !== 'route_reference' && plays.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-auto print:bg-white print:static print:overflow-visible">
      {/* Screen-only toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-card border-b border-border print:hidden">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground-soft hover:text-foreground transition-colors min-h-[44px]"
        >
          <X className="h-5 w-5" />
          Back
        </button>
        <span className="text-muted-foreground text-sm">
          {plays.length} play{plays.length !== 1 ? 's' : ''} — {layout === 'player_card' ? 'Player Card' : layout === 'quick_reference' ? 'Quick Reference' : 'Full Page'}
        </span>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-medium transition-colors min-h-[44px]"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      {/* Printable content */}
      <div className="print-content">
        {layout === 'player_card' && (
          <PlayerCardLayout
            plays={plays}
            groupedPlays={groupedPlays}
            player={player}
            playerPosition={playerPosition}
            assignmentsByPlayId={assignmentsByPlayId}
          />
        )}
        {layout === 'quick_reference' && (
          <QuickReferenceLayout
            plays={plays}
            groupedPlays={groupedPlays}
            assignmentsByPlayId={assignmentsByPlayId}
          />
        )}
        {layout === 'full_page' && (
          <FullPageLayout
            plays={plays}
            groupedPlays={groupedPlays}
            assignmentsByPlayId={assignmentsByPlayId}
          />
        )}
        {layout === 'route_reference' && (
          <RouteReferenceLayout />
        )}
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white !important; }
          .print-content { background: white; }
          .print-page {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
          @page {
            margin: 0.5in;
            size: letter;
          }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Layout 1: Player Card
   One page per play — player header, diagram with
   their position highlighted, assignment text
   ═══════════════════════════════════════════════════ */
function PlayerCardLayout({ plays, groupedPlays, player, playerPosition, assignmentsByPlayId }) {
  return (
    <div>
      {Object.entries(groupedPlays).map(([formation, formPlays]) =>
        formPlays.map((play) => {
          const assignments = assignmentsByPlayId[play.id] || [];
          const playerAssignment = assignments.find((a) => a.position === playerPosition);

          return (
            <div key={play.id} className="print-page px-4 py-6 print:px-0 print:py-0">
              <div className="max-w-2xl mx-auto bg-white rounded-xl p-6 print:rounded-none print:shadow-none print:max-w-none" style={{ color: '#000' }}>
                {/* Player header */}
                <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
                  <div>
                    <p className="text-xl font-bold">{player?.jersey_name || 'Player'}</p>
                    <p className="text-sm text-gray-600">
                      {player?.position || 'No position'}{player?.jersey_number ? ` — #${player.jersey_number}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{play.name}</p>
                    <p className="text-sm text-gray-500">{play.formation || '—'}</p>
                  </div>
                </div>

                {/* Play diagram — highlight player position */}
                <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
                  <PlayRenderer
                    play={play}
                    assignments={assignments}
                    highlightPosition={playerPosition}
                    mode="view"
                    showLabels
                    className="w-full"
                  />
                  {/* Fallback for non-renderer plays */}
                  {!play.use_renderer && play.diagram_image && (
                    <img src={play.diagram_image} alt={play.name} className="w-full" />
                  )}
                </div>

                {/* Player's assignment */}
                {playerAssignment && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="font-semibold text-sm uppercase text-gray-500 mb-1">Your Assignment</p>
                    <p className="text-base">{playerAssignment.assignment_text || 'Run your route'}</p>
                    {playerAssignment.movement_type && (
                      <p className="text-sm text-gray-500 mt-1">Movement: {playerAssignment.movement_type}</p>
                    )}
                  </div>
                )}

                {/* Coach notes */}
                {play.coach_notes && (
                  <div className="mt-3 text-sm text-gray-600 italic">
                    <span className="font-medium not-italic">Notes:</span> {play.coach_notes}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Layout 2: Quick Reference
   4 plays per page in 2x2 grid — sideline ready
   ═══════════════════════════════════════════════════ */
function QuickReferenceLayout({ plays, assignmentsByPlayId }) {
  const pages = chunk(plays, 4);

  return (
    <div>
      {pages.map((pagePlays, pageIdx) => (
        <div key={pageIdx} className="print-page px-4 py-6 print:px-0 print:py-0">
          <div className="max-w-4xl mx-auto bg-white rounded-xl p-4 print:rounded-none print:shadow-none print:max-w-none" style={{ color: '#000' }}>
            <div className="grid grid-cols-2 gap-4 print:gap-3" style={{ minHeight: '9in' }}>
              {pagePlays.map((play) => {
                const assignments = assignmentsByPlayId[play.id] || [];
                return (
                  <div key={play.id} className="border border-gray-300 rounded-lg p-3 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm truncate">{play.name}</p>
                      <p className="text-xs text-gray-500 flex-shrink-0 ml-2">{play.formation || '—'}</p>
                    </div>
                    <div className="flex-1 border border-gray-200 rounded overflow-hidden">
                      <PlayRenderer
                        play={play}
                        assignments={assignments}
                        mode="view"
                        showLabels
                        className="w-full h-full"
                      />
                      {!play.use_renderer && play.diagram_image && (
                        <img src={play.diagram_image} alt={play.name} className="w-full h-full object-contain" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Layout 3: Full Page
   One play per page — diagram + all assignments + notes
   ═══════════════════════════════════════════════════ */
function FullPageLayout({ plays, groupedPlays, assignmentsByPlayId }) {
  return (
    <div>
      {Object.entries(groupedPlays).map(([formation, formPlays]) =>
        formPlays.map((play) => {
          const assignments = assignmentsByPlayId[play.id] || [];
          return (
            <div key={play.id} className="print-page px-4 py-6 print:px-0 print:py-0">
              <div className="max-w-3xl mx-auto bg-white rounded-xl p-6 print:rounded-none print:shadow-none print:max-w-none" style={{ color: '#000' }}>
                {/* Play header */}
                <div className="border-b-2 border-black pb-3 mb-4">
                  <h2 className="text-2xl font-bold">{play.name}</h2>
                  <p className="text-sm text-gray-500">
                    {play.formation || '—'} &middot; {play.side === 'defense' ? 'Defense' : 'Offense'}
                    {play.game_day && <span className="ml-2 font-semibold text-amber-600">Game Day</span>}
                  </p>
                </div>

                {/* Play diagram */}
                <div className="mb-5 border border-gray-200 rounded-lg overflow-hidden">
                  <PlayRenderer
                    play={play}
                    assignments={assignments}
                    mode="view"
                    showLabels
                    className="w-full"
                  />
                  {!play.use_renderer && play.diagram_image && (
                    <img src={play.diagram_image} alt={play.name} className="w-full" />
                  )}
                </div>

                {/* All assignments table */}
                {assignments.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Assignments</h3>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-1.5 pr-4 font-semibold">Position</th>
                          <th className="text-left py-1.5 pr-4 font-semibold">Movement</th>
                          <th className="text-left py-1.5 font-semibold">Assignment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignments.map((a) => (
                          <tr key={a.id || a.position} className="border-b border-gray-100">
                            <td className="py-1.5 pr-4 font-medium">{a.position}</td>
                            <td className="py-1.5 pr-4 text-gray-600">{a.movement_type || '—'}</td>
                            <td className="py-1.5 text-gray-700">{a.assignment_text || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Coach notes */}
                {play.coach_notes && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <span className="font-semibold">Coach Notes:</span> {play.coach_notes}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Layout 4: Route Reference
   Vocabulary sheet — all routes with mini diagrams
   and kid-friendly descriptions. Laminate & hand out.
   ═══════════════════════════════════════════════════ */

const ROUTE_CATEGORIES = [
  {
    title: 'Receiver Routes',
    routes: ['slant', 'out', 'post', 'fly', 'curl', 'drag', 'flat', 'corner', 'hitch', 'block'],
  },
  {
    title: 'QB Routes',
    routes: ['drop_back', 'rollout_left', 'rollout_right', 'pitch_left', 'pitch_right', 'keeper', 'scramble', 'handoff'],
  },
  {
    title: 'Center Routes',
    routes: ['snap_block', 'pull_left', 'pull_right'],
  },
  {
    title: 'Running Back Routes',
    routes: ['sweep_left', 'sweep_right', 'dive', 'screen', 'delay'],
  },
];

/** Render a tiny route diagram as inline SVG */
function MiniRouteSvg({ routeId }) {
  const templateFn = FLAG_FOOTBALL.routeTemplates[routeId];
  if (!templateFn) return <div className="w-full h-full bg-gray-100 rounded" />;

  // Generate route points from template
  const points = templateFn({ startX: 50, startY: 80, fieldSide: 'left' });
  if (!points || points.length < 1) return <div className="w-full h-full bg-gray-100 rounded" />;

  // Scale percentage coords (0-100) into SVG viewBox (0-120 x 0-100)
  const scale = (pt) => ({ x: pt.x * 1.2, y: pt.y });
  const scaled = points.map(scale);
  const pointsStr = scaled.map((p) => `${p.x},${p.y}`).join(' ');

  // Arrow at end
  let arrowPoints = '';
  if (scaled.length >= 2) {
    const last = scaled[scaled.length - 1];
    const prev = scaled[scaled.length - 2];
    const dx = last.x - prev.x;
    const dy = last.y - prev.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const ux = dx / len;
      const uy = dy / len;
      const px = -uy;
      const py = ux;
      const sz = 5;
      arrowPoints = `${last.x},${last.y} ${last.x - ux * sz + px * sz * 0.5},${last.y - uy * sz + py * sz * 0.5} ${last.x - ux * sz - px * sz * 0.5},${last.y - uy * sz - py * sz * 0.5}`;
    }
  }

  // Start marker
  const start = scaled[0];

  return (
    <svg viewBox="0 0 120 100" className="w-full h-full" style={{ background: '#16a34a' }}>
      {/* Simplified field lines */}
      <line x1="0" y1="50" x2="120" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      <line x1="0" y1="25" x2="120" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      <line x1="0" y1="75" x2="120" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
      {/* Scrimmage */}
      <line x1="0" y1="82" x2="120" y2="82" stroke="rgba(245,158,11,0.5)" strokeWidth="1" strokeDasharray="3 2" />
      {/* Route path */}
      {scaled.length >= 2 && (
        <polyline
          points={pointsStr}
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {arrowPoints && <polygon points={arrowPoints} fill="white" />}
      {/* Start dot */}
      <circle cx={start.x} cy={start.y} r="4" fill="#f59e0b" stroke="white" strokeWidth="1" />
    </svg>
  );
}

function RouteReferenceLayout() {
  return (
    <div>
      {ROUTE_CATEGORIES.map((cat, catIdx) => (
        <div
          key={cat.title}
          className={`print-page px-4 py-6 print:px-0 print:py-0 ${catIdx > 0 && catIdx % 2 === 0 ? '' : ''}`}
        >
          <div className="max-w-4xl mx-auto bg-white rounded-xl p-6 print:rounded-none print:shadow-none print:max-w-none" style={{ color: '#000' }}>
            <h2 className="text-xl font-bold border-b-2 border-black pb-2 mb-4">{cat.title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 print:grid-cols-3 gap-4">
              {cat.routes.map((routeId) => {
                const glossary = ROUTE_GLOSSARY[routeId];
                if (!glossary) return null;
                return (
                  <div key={routeId} className="border border-gray-300 rounded-lg overflow-hidden">
                    <div className="h-20 print:h-16">
                      <MiniRouteSvg routeId={routeId} />
                    </div>
                    <div className="p-2">
                      <p className="font-bold text-sm">{glossary.name}</p>
                      <p className="text-xs text-gray-600 leading-snug">{glossary.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
