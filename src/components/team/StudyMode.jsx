import React, { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const POSITION_ORDER = ['C', 'QB', 'RB', 'X', 'Z'];

export default function StudyMode({
  plays = [],
  assignments = {},
  playerPosition,
  isCoach,
  onClose,
  initialIndex = 0,
}) {
  const [currentIndex, setCurrentIndex] = useState(Math.min(initialIndex, Math.max(0, plays.length - 1)));
  const [viewMode, setViewMode] = useState(playerPosition ? 'my' : 'full'); // players default My Assignment, coaches Full Play
  const [gameDayOnly, setGameDayOnly] = useState(false);
  const [viewedPlays, setViewedPlays] = useState(() => new Set());
  const [touchStart, setTouchStart] = useState(null);
  const [mirrored, setMirrored] = useState(false);
  const [viewAsPosition, setViewAsPosition] = useState(null); // coach-only: which position to preview in My Assignment view

  const filteredPlays = React.useMemo(() => {
    let list = plays;
    if (gameDayOnly) list = list.filter((p) => p.game_day);
    return list;
  }, [plays, gameDayOnly]);

  useEffect(() => {
    setCurrentIndex((i) => Math.min(i, Math.max(0, filteredPlays.length - 1)));
  }, [filteredPlays.length]);

  const play = filteredPlays[currentIndex];
  const playAssignments = play ? (assignments[play.id] || []) : [];
  const sortedAssignments = [...playAssignments].sort(
    (a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position)
  );
  // In My Assignment view: coaches use viewAsPosition (or null); players use playerPosition
  const displayPosition = viewMode === 'my' && isCoach ? viewAsPosition : playerPosition;
  const myAssignment = displayPosition ? playAssignments.find((a) => a.position === displayPosition) : null;
  const otherAssignments = sortedAssignments.filter((a) => a.position !== displayPosition);

  const markViewed = useCallback((playId) => {
    setViewedPlays((prev) => new Set(prev).add(playId));
  }, []);

  React.useEffect(() => {
    if (play?.id) markViewed(play.id);
  }, [play?.id, markViewed]);

  const goNext = () => {
    if (currentIndex < filteredPlays.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setMirrored(false);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setMirrored(false);
    }
  };

  const handleTouchStart = (e) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e) => {
    if (touchStart == null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goNext() : goPrev();
    }
    setTouchStart(null);
  };

  if (filteredPlays.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6">
        <p className="text-slate-500 mb-4">No plays to study.</p>
        <button type="button" onClick={onClose} className="text-amber-500 font-medium">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
        <span className="text-white font-medium">
          {currentIndex + 1} / {filteredPlays.length}
        </span>
        <div className="flex gap-2 min-w-[44px]">
          <button
            type="button"
            onClick={() => setGameDayOnly(false)}
            className={`px-2 py-1 rounded text-xs font-medium min-h-[36px] ${!gameDayOnly ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setGameDayOnly(true)}
            className={`px-2 py-1 rounded text-xs font-medium min-h-[36px] ${gameDayOnly ? 'bg-amber-500/20 text-amber-500' : 'text-slate-400'}`}
          >
            Game Day
          </button>
        </div>
      </div>

      {/* My Assignment / Full Play toggle */}
      <div className="flex gap-2 p-1 bg-slate-800 rounded-xl mx-4 mt-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => setViewMode('my')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${viewMode === 'my' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}
        >
          My Assignment
        </button>
        <button
          type="button"
          onClick={() => setViewMode('full')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${viewMode === 'full' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}
        >
          Full Play
        </button>
      </div>

      {/* View as position selector — coaches only, My Assignment view */}
      {isCoach && viewMode === 'my' && (
        <div className="mx-4 mt-3 flex-shrink-0">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">View as</p>
          <div className="flex justify-center gap-2">
            {POSITION_ORDER.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setViewAsPosition((prev) => (prev === pos ? null : pos))}
                className={`min-w-[44px] min-h-[44px] rounded-lg border text-sm font-bold transition-colors ${
                  viewAsPosition === pos
                    ? 'bg-slate-800 border-amber-500 text-amber-500'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-amber-500/50 hover:text-amber-500'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main card area — touch swipe */}
      <div
        className="flex-1 overflow-y-auto flex flex-col min-h-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {play && (
          <div className="p-4 pb-2 flex-1 flex flex-col">
            {/* Diagram */}
            {play.diagram_image && (
              <div className="rounded-xl overflow-hidden bg-slate-800 border border-slate-700 mb-4 flex-shrink-0">
                <div
                  className="w-full aspect-video overflow-hidden"
                  style={{ transform: play.is_mirrorable && mirrored ? 'scaleX(-1)' : undefined }}
                >
                  <img src={play.diagram_image} alt="" className="w-full h-full object-contain" />
                </div>
                {play.is_mirrorable && (
                  <div className="p-2 border-t border-slate-700">
                    <button
                      type="button"
                      onClick={() => setMirrored((m) => !m)}
                      className="w-full py-2 text-sm text-slate-300 border border-slate-600 rounded-lg"
                    >
                      {mirrored ? 'Show normal' : 'Mirror view'}
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <h2 className="text-lg font-bold text-white">{play.name}</h2>
              <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded">{play.formation || '—'}</span>
            </div>

            {viewMode === 'my' ? (
              <>
                {isCoach && !viewAsPosition ? (
                  <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700">
                    <p className="text-slate-400">Select a position to preview</p>
                  </div>
                ) : myAssignment ? (
                  <div className="bg-slate-900 border-l-4 border-amber-500 rounded-r-xl p-4 mb-4">
                    {isCoach && viewAsPosition && (
                      <p className="text-amber-500 text-xs font-semibold uppercase tracking-wider mb-2">Your assignment</p>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-amber-500 text-2xl font-bold">{myAssignment.position}</span>
                      <span className="bg-slate-800 text-slate-300 text-sm px-2 py-0.5 rounded">
                        {myAssignment.route || '—'}
                      </span>
                    </div>
                    <p className="text-white text-lg min-h-[18px]">{myAssignment.assignment_text || 'No assignment'}</p>
                  </div>
                ) : displayPosition ? (
                  <div className="bg-slate-800/50 rounded-xl p-4 mb-4 border border-slate-700">
                    <p className="text-slate-400">No assignment for {displayPosition} on this play.</p>
                  </div>
                ) : null}

                {otherAssignments.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Other positions</p>
                    {otherAssignments.map((a) => (
                      <div key={a.id} className="flex items-center gap-2 text-slate-500 text-sm">
                        <span className="font-medium w-8">{a.position}</span>
                        <span>{a.route || '—'}</span>
                      </div>
                    ))}
                  </div>
                )}

                {isCoach && play.coach_notes && (
                  <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                    <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">Coach notes</p>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{play.coach_notes}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  {sortedAssignments.map((a) => {
                    const isMyPos = playerPosition && a.position === playerPosition;
                    return (
                      <div
                        key={a.id}
                        className={`rounded-lg border p-3 ${isMyPos ? 'border-l-4 border-l-amber-500 bg-amber-500/5' : 'border-slate-700 bg-slate-800/50'}`}
                      >
                        {isMyPos && <p className="text-amber-500 text-xs font-semibold uppercase tracking-wider mb-1">Your assignment</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-amber-500 font-bold">{a.position}</span>
                          <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded">{a.route || '—'}</span>
                        </div>
                        {a.assignment_text && <p className="text-slate-300 text-sm mt-1">{a.assignment_text}</p>}
                      </div>
                    );
                  })}
                </div>
                {isCoach && play.coach_notes && (
                  <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                    <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">Coach notes</p>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap">{play.coach_notes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom: arrows + progress dots */}
      <div className="flex-shrink-0 border-t border-slate-800 bg-slate-900 px-4 py-3">
        <div className="flex items-center justify-center gap-4 mb-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex justify-center gap-1.5 flex-wrap max-w-[70%]">
            {filteredPlays.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setCurrentIndex(i); setMirrored(false); }}
                className={`w-2.5 h-2.5 rounded-full transition-colors flex-shrink-0 ${
                  i === currentIndex ? 'bg-amber-500' : viewedPlays.has(p.id) ? 'bg-slate-400' : 'bg-slate-700'
                }`}
                aria-label={`Play ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={currentIndex === filteredPlays.length - 1}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
