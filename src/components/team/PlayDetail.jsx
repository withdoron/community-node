import React, { useState } from 'react';
import { ArrowLeft, Pencil, Archive, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseTags } from './PlayCard';

const POSITION_ORDER = ['C', 'QB', 'RB', 'X', 'Z'];

export default function PlayDetail({
  play,
  assignments = [],
  isCoach,
  playerPosition,
  onClose,
  onEdit,
  onArchive,
}) {
  const [mirrored, setMirrored] = useState(false);
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
          {isCoach && (
            <div className="flex items-center gap-1">
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
            </div>
          )}
        </div>

        <div className="px-4 py-4 space-y-4">
          <div>
            <h1 className="text-xl font-bold text-white">{play?.name}</h1>
            {play?.nickname && <p className="text-slate-400 text-sm mt-0.5">{play.nickname}</p>}
            <span className="inline-block mt-2 bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded">
              {play?.formation || '—'}
            </span>
          </div>

          {/* Diagram */}
          {play?.diagram_image && (
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
                    className="w-full border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500"
                    onClick={() => setMirrored((m) => !m)}
                  >
                    {mirrored ? 'Show normal' : 'Mirror view'}
                  </Button>
                </div>
              )}
            </div>
          )}

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
                        {a.route && (
                          <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded">
                            {a.route.replace(/_/g, ' ')}
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
        </div>
      </div>
    </div>
  );
}
