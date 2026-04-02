import React, { useMemo } from 'react';
import { X, Printer } from 'lucide-react';
import PlayRenderer from '@/components/field/PlayRenderer';

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

  if (plays.length === 0) return null;

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
                  {!play.use_renderer && play.image_url && (
                    <img src={play.image_url} alt={play.name} className="w-full" />
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
                {play.notes && (
                  <div className="mt-3 text-sm text-gray-600 italic">
                    <span className="font-medium not-italic">Notes:</span> {play.notes}
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
                      {!play.use_renderer && play.image_url && (
                        <img src={play.image_url} alt={play.name} className="w-full h-full object-contain" />
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
                  {!play.use_renderer && play.image_url && (
                    <img src={play.image_url} alt={play.name} className="w-full" />
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
                {play.notes && (
                  <div className="bg-gray-50 rounded-lg p-3 text-sm">
                    <span className="font-semibold">Coach Notes:</span> {play.notes}
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
