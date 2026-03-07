import React, { useState } from 'react';
import { ArrowLeft, Pencil, Archive, X, BookOpen, Target, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseTags } from './PlayCard';
import PlayRenderer from '@/components/field/PlayRenderer';

const POSITION_ORDER = ['C', 'QB', 'RB', 'X', 'Z'];

export default function PlayDetail({
  play,
  assignments = [],
  isCoach,
  playerPosition,
  onClose,
  onEdit,
  onArchive,
  onDelete,
  isDeleting = false,
  onStudyThisPlay,
  onQuizThisPlay,
}) {
  const [mirrored, setMirrored] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tags = parseTags(play?.tags);
  const sortedAssignments = [...assignments].sort(
    (a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position)
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
      <div className="max-w-2xl mx-auto pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between gap-2 min-h-[44px]">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-2 text-slate-400 hover:text-amber-500 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded capitalize">
              {play?.side || 'offense'}
            </span>
            {play?.game_day && (
              <span className="bg-amber-500/20 text-amber-500 text-xs font-medium px-2 py-0.5 rounded-full">
                Game Day
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onStudyThisPlay && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-amber-500 p-2 flex items-center gap-1.5"
                onClick={onStudyThisPlay}
              >
                <BookOpen className="h-4 w-4" />
                <span className="text-sm">Study</span>
              </Button>
            )}
            {onQuizThisPlay && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-amber-500 p-2 flex items-center gap-1.5"
                onClick={onQuizThisPlay}
              >
                <Target className="h-4 w-4" />
                <span className="text-sm">Practice</span>
              </Button>
            )}
            {isCoach && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-amber-500 p-2"
                  onClick={() => onEdit?.(play)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-red-400 p-2"
                  onClick={() => onArchive?.(play)}
                >
                  <Archive className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-white">{play?.name}</h1>
            {play?.nickname && <p className="text-slate-400 text-sm mt-0.5">{play.nickname}</p>}
            <span className="inline-block mt-2 bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded">
              {play?.formation || '—'}
            </span>
          </div>

          {/* Diagram — visual renderer or photo */}
          {play?.use_renderer ? (
            <div className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700">
              <PlayRenderer
                play={play}
                assignments={assignments}
                mirrored={mirrored}
                highlightPosition={playerPosition}
                mode="view"
              />
              {play?.is_mirrorable && (
                <div className="p-2 border-t border-slate-700">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent"
                    onClick={() => setMirrored((m) => !m)}
                  >
                    {mirrored ? 'Show normal' : 'Mirror view'}
                  </Button>
                </div>
              )}
            </div>
          ) : play?.diagram_image ? (
            <div className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700">
              <div
                className="aspect-video overflow-hidden"
                style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
              >
                <img
                  src={play.diagram_image}
                  alt={`${play.name} diagram`}
                  className="w-full h-full object-contain"
                />
              </div>
              {play?.is_mirrorable && (
                <div className="p-2 border-t border-slate-700">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent"
                    onClick={() => setMirrored((m) => !m)}
                  >
                    {mirrored ? 'Show normal' : 'Mirror view'}
                  </Button>
                </div>
              )}
            </div>
          ) : null}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded">
                  {tag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}

          {/* Coach notes — coach only */}
          {isCoach && play?.coach_notes && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">Coach notes</h3>
              <p className="text-slate-300 text-sm whitespace-pre-wrap">{play.coach_notes}</p>
            </div>
          )}

          {/* Position assignments */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Position assignments</h3>
            {sortedAssignments.length === 0 ? (
              <p className="text-slate-500 text-sm">No assignments for this play yet.</p>
            ) : (
              <div className="space-y-2">
                {sortedAssignments.map((a) => {
                  const isMyAssignment = playerPosition && a.position === playerPosition;
                  // Route name: movement_type (visual builder) or route (photo mode)
                  const rawRoute = a.movement_type || a.route || '';
                  // Format compound routes: "curl-drag" → "Curl → Drag"
                  const routeDisplay = rawRoute
                    ? rawRoute
                        .split('-')
                        .map((seg) => {
                          const s = seg.replace(/_/g, ' ').trim();
                          return s.charAt(0).toUpperCase() + s.slice(1);
                        })
                        .join(' → ')
                    : '';
                  return (
                    <div
                      key={a.id}
                      className={`rounded-lg border border-slate-700 p-3 ${
                        isMyAssignment ? 'border-l-4 border-l-amber-500 bg-amber-500/5 pl-3' : ''
                      }`}
                    >
                      {isMyAssignment && (
                        <p className="text-amber-500 text-xs font-semibold uppercase tracking-wider mb-1">
                          Your assignment
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-amber-500 font-bold">{a.position}</span>
                        {routeDisplay && (
                          <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded">
                            {routeDisplay}
                          </span>
                        )}
                      </div>
                      {a.assignment_text && (
                        <p className="text-slate-300 text-sm mt-1 whitespace-pre-wrap">{a.assignment_text}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delete play — coach only */}
          {isCoach && onDelete && (
            <div className="pt-6 mt-6 border-t border-slate-800">
              {!confirmDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isDeleting}
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 min-h-[44px]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete play
                </Button>
              ) : (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
                  <p className="text-red-400 text-sm font-medium">
                    Delete this play? This cannot be undone.
                  </p>
                  <p className="text-slate-400 text-xs">
                    The play and all {sortedAssignments.length} position assignment{sortedAssignments.length !== 1 ? 's' : ''} will be permanently removed.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmDelete(false)}
                      disabled={isDeleting}
                      className="flex-1 border-slate-600 text-slate-300 hover:bg-transparent hover:border-slate-500 hover:text-white min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onDelete(play)}
                      disabled={isDeleting}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white font-medium min-h-[44px]"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting…
                        </>
                      ) : (
                        'Delete permanently'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
