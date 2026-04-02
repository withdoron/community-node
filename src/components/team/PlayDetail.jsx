import React, { useState } from 'react';
import { ArrowLeft, Pencil, Archive, BookOpen, Target, Trash2, Loader2, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseTags } from './PlayCard';
import PlayRenderer from '@/components/field/PlayRenderer';
import { getPositionsForFormat, DEFAULT_FORMAT } from '@/config/flagFootball';

export default function PlayDetail({
  play,
  assignments = [],
  isCoach,
  currentUserId,
  playerPosition,
  onClose,
  onEdit,
  onArchive,
  onDelete,
  onPromote,
  isDeleting = false,
  isPromoting = false,
  onStudyThisPlay,
  onQuizThisPlay,
  teamFormat,
}) {
  const [mirrored, setMirrored] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const tags = parseTags(play?.tags);
  const playSide = play?.side || 'offense';
  const positionOrder = getPositionsForFormat(teamFormat || DEFAULT_FORMAT, playSide).map((p) => p.id);
  const sortedAssignments = [...assignments].sort(
    (a, b) => {
      const ai = positionOrder.indexOf(a.position);
      const bi = positionOrder.indexOf(b.position);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    }
  );

  const isExperimental = play?.status === 'experimental';
  const isOwnExperimental = isExperimental && play?.created_by === currentUserId;
  // Can edit: coach (anything) or player (own experimental plays)
  const canEdit = isCoach || isOwnExperimental;
  // Can archive: coach only (not for players)
  const canArchive = isCoach && !isExperimental;
  // Can delete: coach (anything) or player (own experimental plays)
  const canDelete = isCoach || isOwnExperimental;
  // Study/Quiz only on official plays
  const canStudy = !isExperimental;

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
      <div className="max-w-2xl mx-auto pb-24">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between gap-2 min-h-[44px]">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="bg-secondary text-foreground-soft text-xs px-2 py-0.5 rounded capitalize">
              {play?.side || 'offense'}
            </span>
            {isExperimental && (
              <span className="bg-teal-500/20 text-teal-400 text-xs font-medium px-2 py-0.5 rounded-full">
                Idea
              </span>
            )}
            {play?.game_day && !isExperimental && (
              <span className="bg-primary/20 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                Game Day
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {canStudy && onStudyThisPlay && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary p-2 flex items-center gap-1.5"
                onClick={onStudyThisPlay}
              >
                <BookOpen className="h-4 w-4" />
                <span className="text-sm">Study</span>
              </Button>
            )}
            {canStudy && onQuizThisPlay && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary p-2 flex items-center gap-1.5"
                onClick={onQuizThisPlay}
              >
                <Target className="h-4 w-4" />
                <span className="text-sm">Practice</span>
              </Button>
            )}
            {canEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary p-2"
                onClick={() => onEdit?.(play)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {canArchive && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-red-400 p-2"
                onClick={() => onArchive?.(play)}
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{play?.name}</h1>
            {play?.nickname && <p className="text-muted-foreground text-sm mt-0.5">{play.nickname}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="bg-secondary text-foreground-soft text-xs px-2 py-0.5 rounded">
                {play?.formation || '—'}
              </span>
              {isExperimental && play?.created_by_name && (
                <span className="text-muted-foreground/70 text-xs">by {play.created_by_name}</span>
              )}
            </div>
          </div>

          {/* Promote to Playbook — coach only, experimental plays */}
          {isCoach && isExperimental && onPromote && (
            <Button
              type="button"
              onClick={() => onPromote(play)}
              disabled={isPromoting}
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-medium min-h-[44px]"
            >
              {isPromoting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowUpCircle className="h-4 w-4 mr-2" />
              )}
              Add to Playbook
            </Button>
          )}

          {/* Diagram — visual renderer or photo */}
          {play?.use_renderer ? (
            <div className="rounded-xl overflow-hidden bg-secondary border border-border">
              <PlayRenderer
                play={play}
                assignments={assignments}
                mirrored={mirrored}
                highlightPosition={playerPosition}
                mode="view"
              />
              {play?.is_mirrorable && (
                <div className="p-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent"
                    onClick={() => setMirrored((m) => !m)}
                  >
                    {mirrored ? 'Show normal' : 'Mirror view'}
                  </Button>
                </div>
              )}
            </div>
          ) : play?.diagram_image ? (
            <div className="rounded-xl overflow-hidden bg-secondary border border-border">
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
                <div className="p-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent"
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
                <span key={tag} className="bg-secondary text-muted-foreground text-xs px-2 py-0.5 rounded">
                  {tag.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}

          {/* Coach notes — coach only */}
          {isCoach && play?.coach_notes && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Coach notes</h3>
              <p className="text-foreground-soft text-sm whitespace-pre-wrap">{play.coach_notes}</p>
            </div>
          )}

          {/* Position assignments */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Position assignments</h3>
            {sortedAssignments.length === 0 ? (
              <p className="text-muted-foreground/70 text-sm">No assignments for this play yet.</p>
            ) : (
              <div className="space-y-2">
                {sortedAssignments.map((a) => {
                  const isMyAssignment = playerPosition && a.position === playerPosition;
                  const rawRoute = a.movement_type || a.route || '';
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
                      className={`rounded-lg border border-border p-3 ${
                        isMyAssignment ? 'border-l-4 border-l-primary bg-primary/5 pl-3' : ''
                      }`}
                    >
                      {isMyAssignment && (
                        <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-1">
                          Your assignment
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-primary font-bold">{a.position}</span>
                        {routeDisplay && (
                          <span className="bg-secondary text-foreground-soft text-xs px-2 py-0.5 rounded">
                            {routeDisplay}
                          </span>
                        )}
                      </div>
                      {a.assignment_text && (
                        <p className="text-foreground-soft text-sm mt-1 whitespace-pre-wrap">{a.assignment_text}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delete play — coach or own experimental */}
          {canDelete && onDelete && (
            <div className="pt-6 mt-6 border-t border-border">
              {!confirmDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDelete(true)}
                  disabled={isDeleting}
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 min-h-[44px]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isExperimental ? 'Delete idea' : 'Delete play'}
                </Button>
              ) : (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
                  <p className="text-red-400 text-sm font-medium">
                    Delete this {isExperimental ? 'idea' : 'play'}? This cannot be undone.
                  </p>
                  <p className="text-muted-foreground text-xs">
                    The play and all {sortedAssignments.length} position assignment{sortedAssignments.length !== 1 ? 's' : ''} will be permanently removed.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmDelete(false)}
                      disabled={isDeleting}
                      className="flex-1 border-border text-foreground-soft hover:bg-transparent hover:border-muted-foreground hover:text-foreground min-h-[44px]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => onDelete(play)}
                      disabled={isDeleting}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-foreground font-medium min-h-[44px]"
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
