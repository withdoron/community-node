import React, { useState, useCallback, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { fetchTeamData } from '@/hooks/useTeamEntity';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import PlayRenderer from '@/components/field/PlayRenderer';
import { getPositionsForFormat, DEFAULT_FORMAT } from '@/config/flagFootball';

/** Format movement_type or route into readable label: "curl-drag" → "Curl → Drag" */
function formatRoute(raw) {
  if (!raw) return '';
  return raw
    .split('-')
    .map((seg) => {
      const s = seg.replace(/_/g, ' ').trim();
      return s.charAt(0).toUpperCase() + s.slice(1);
    })
    .join(' → ');
}

/** Get the best available route label from an assignment (visual builder or photo-mode) */
function getRouteDisplay(assignment) {
  return formatRoute(assignment?.movement_type || assignment?.route);
}

export default function StudyMode({
  plays = [],
  playerPosition,
  isCoach,
  onClose,
  initialIndex = 0,
  teamFormat,
  teamId,
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

  const [currentAssignments, setCurrentAssignments] = useState([]);

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!play?.id) {
        setCurrentAssignments([]);
        return;
      }
      try {
        const result = await fetchTeamData('PlayAssignment', teamId, { play_id: play.id });
        setCurrentAssignments(result);
      } catch (err) {
        console.error('Failed to fetch assignments:', err);
        setCurrentAssignments([]);
      }
    };
    fetchAssignments();
  }, [play?.id]);

  const playAssignments = currentAssignments;
  const positionOrder = getPositionsForFormat(teamFormat || DEFAULT_FORMAT, play?.side || 'offense').map((p) => p.id);
  const safeAssignments = Array.isArray(playAssignments) ? playAssignments : [];
  const sortedAssignments = [...safeAssignments].sort(
    (a, b) => {
      const ai = positionOrder.indexOf((a.position || '').toUpperCase());
      const bi = positionOrder.indexOf((b.position || '').toUpperCase());
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    }
  );
  // In My Assignment view: coaches use viewAsPosition (or null); players use playerPosition
  const displayPosition = viewMode === 'my' && isCoach ? viewAsPosition : playerPosition;
  const myAssignment = displayPosition
    ? playAssignments.find((a) => a.position?.toLowerCase() === displayPosition?.toLowerCase())
    : null;
  const otherAssignments = sortedAssignments.filter(
    (a) => a.position?.toLowerCase() !== displayPosition?.toLowerCase()
  );

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
      <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground/70 mb-4">No plays to study.</p>
        <button type="button" onClick={onClose} className="text-primary font-medium">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
        <span className="text-foreground font-medium">
          {currentIndex + 1} / {filteredPlays.length}
        </span>
        <div className="flex gap-2 min-w-[44px]">
          <button
            type="button"
            onClick={() => setGameDayOnly(false)}
            className={`px-2 py-1 rounded text-xs font-medium min-h-[36px] ${!gameDayOnly ? 'bg-surface text-foreground' : 'text-muted-foreground'}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setGameDayOnly(true)}
            className={`px-2 py-1 rounded text-xs font-medium min-h-[36px] ${gameDayOnly ? 'bg-primary/20 text-primary' : 'text-muted-foreground'}`}
          >
            Game Day
          </button>
        </div>
      </div>

      {/* My Assignment / Full Play toggle */}
      <div className="flex gap-2 p-1 bg-secondary rounded-xl mx-4 mt-3 flex-shrink-0">
        <button
          type="button"
          onClick={() => setViewMode('my')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${viewMode === 'my' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
        >
          My Assignment
        </button>
        <button
          type="button"
          onClick={() => setViewMode('full')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium min-h-[44px] transition-colors ${viewMode === 'full' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
        >
          Full Play
        </button>
      </div>

      {/* View as position selector — coaches only, My Assignment view */}
      {isCoach && viewMode === 'my' && (
        <div className="mx-4 mt-3 flex-shrink-0">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">View as</p>
          <div className="flex justify-center gap-2">
            {positionOrder.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setViewAsPosition((prev) => (prev === pos ? null : pos))}
                className={`min-w-[44px] min-h-[44px] rounded-lg border text-sm font-bold transition-colors ${
                  viewAsPosition === pos
                    ? 'bg-secondary border-primary text-primary'
                    : 'bg-secondary border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
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
            {/* Diagram — visual renderer or photo */}
            {play.use_renderer ? (
              <div className="rounded-xl overflow-hidden bg-secondary border border-border mb-4 flex-shrink-0" style={{ minHeight: '40vh' }}>
                <PlayRenderer
                  play={play}
                  assignments={currentAssignments}
                  mirrored={mirrored}
                  highlightPosition={viewMode === 'my' ? displayPosition : null}
                  mode="study"
                />
                {play.is_mirrorable && (
                  <div className="p-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setMirrored((m) => !m)}
                      className="w-full py-2 text-sm text-foreground-soft border border-border rounded-lg hover:border-primary/50"
                    >
                      {mirrored ? 'Show normal' : 'Mirror view'}
                    </button>
                  </div>
                )}
              </div>
            ) : play.diagram_image ? (
              <div className="rounded-xl overflow-hidden bg-secondary border border-border mb-4 flex-shrink-0">
                <div
                  className="w-full aspect-video overflow-hidden"
                  style={{ transform: play.is_mirrorable && mirrored ? 'scaleX(-1)' : undefined }}
                >
                  <img src={play.diagram_image} alt="" className="w-full h-full object-contain" />
                </div>
                {play.is_mirrorable && (
                  <div className="p-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setMirrored((m) => !m)}
                      className="w-full py-2 text-sm text-foreground-soft border border-border rounded-lg hover:border-primary/50"
                    >
                      {mirrored ? 'Show normal' : 'Mirror view'}
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            <div className="flex items-center gap-2 flex-wrap mb-3">
              <h2 className="text-lg font-bold text-foreground">{play.name}</h2>
              <span className="bg-secondary text-foreground-soft text-xs px-2 py-0.5 rounded">{play.formation || '—'}</span>
            </div>

            {viewMode === 'my' ? (
              <>
                {isCoach && !viewAsPosition ? (
                  <div className="bg-secondary/50 rounded-xl p-4 mb-4 border border-border">
                    <p className="text-muted-foreground">Select a position to preview</p>
                  </div>
                ) : myAssignment ? (
                  <div className="bg-card border-l-4 border-primary rounded-r-xl p-4 mb-4">
                    {isCoach && viewAsPosition && (
                      <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-2">Your assignment</p>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-primary text-2xl font-bold">{myAssignment.position}</span>
                      {getRouteDisplay(myAssignment) && (
                        <span className="bg-secondary text-primary-hover text-sm font-semibold px-2 py-0.5 rounded">
                          {getRouteDisplay(myAssignment)}
                        </span>
                      )}
                    </div>
                    {myAssignment.assignment_text ? (
                      <p className="text-foreground text-lg min-h-[18px]">{myAssignment.assignment_text}</p>
                    ) : getRouteDisplay(myAssignment) ? null : (
                      <p className="text-muted-foreground text-lg min-h-[18px]">No assignment</p>
                    )}
                  </div>
                ) : displayPosition ? (
                  <div className="bg-secondary/50 rounded-xl p-4 mb-4 border border-border">
                    <p className="text-muted-foreground">No assignment for {displayPosition} on this play.</p>
                  </div>
                ) : null}

                {otherAssignments.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-2">Other positions</p>
                    {otherAssignments.map((a) => {
                      const routeLabel = getRouteDisplay(a);
                      return (
                        <div key={a.id} className="flex items-start gap-2 text-muted-foreground/70 text-sm py-0.5">
                          <span className="font-medium w-8 flex-shrink-0">{a.position}</span>
                          <div className="flex flex-col gap-0.5">
                            {routeLabel && <span className="text-muted-foreground font-medium">{routeLabel}</span>}
                            {a.assignment_text && <span className="text-muted-foreground/70">{a.assignment_text}</span>}
                            {!routeLabel && !a.assignment_text && <span>—</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isCoach && play.coach_notes && (
                  <div className="mt-4 bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Coach notes</p>
                    <p className="text-foreground-soft text-sm whitespace-pre-wrap">{play.coach_notes}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="space-y-2">
                  {sortedAssignments.map((a) => {
                    const isMyPos = playerPosition && a.position?.toLowerCase() === playerPosition?.toLowerCase();
                    return (
                      <div
                        key={a.id}
                        className={`rounded-lg border p-3 ${isMyPos ? 'border-l-4 border-l-primary bg-primary/5' : 'border-border bg-secondary/50'}`}
                      >
                        {isMyPos && <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-1">Your assignment</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-primary font-bold">{a.position}</span>
                          {getRouteDisplay(a) && (
                            <span className="bg-secondary text-primary-hover text-xs font-semibold px-2 py-0.5 rounded">
                              {getRouteDisplay(a)}
                            </span>
                          )}
                        </div>
                        {a.assignment_text && <p className="text-foreground-soft text-sm mt-1">{a.assignment_text}</p>}
                      </div>
                    );
                  })}
                </div>
                {isCoach && play.coach_notes && (
                  <div className="mt-4 bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Coach notes</p>
                    <p className="text-foreground-soft text-sm whitespace-pre-wrap">{play.coach_notes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom: arrows + progress dots */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-3">
        <div className="flex items-center justify-center gap-4 mb-3">
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className="p-2 rounded-lg bg-secondary text-foreground-soft disabled:opacity-40 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                  i === currentIndex ? 'bg-primary' : viewedPlays.has(p.id) ? 'bg-slate-400' : 'bg-surface'
                }`}
                aria-label={`Play ${i + 1}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={currentIndex === filteredPlays.length - 1}
            className="p-2 rounded-lg bg-secondary text-foreground-soft disabled:opacity-40 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
