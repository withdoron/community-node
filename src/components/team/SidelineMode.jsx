import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import PlayRenderer from '@/components/field/PlayRenderer';
import { getPositionsForFormat, DEFAULT_FORMAT } from '@/config/flagFootball';

export default function SidelineMode({
  plays = [],
  onClose,
  teamFormat,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameDayOnly, setGameDayOnly] = useState(true);
  const [positionOverlay, setPositionOverlay] = useState(null);
  const [touchStart, setTouchStart] = useState(null);

  const sideFromPlays = plays[0]?.side || 'offense';
  const positions = getPositionsForFormat(teamFormat || DEFAULT_FORMAT, sideFromPlays).map((p) => p.id);

  const filteredPlays = React.useMemo(() => {
    let list = plays;
    if (gameDayOnly) list = list.filter((p) => p.game_day);
    return list;
  }, [plays, gameDayOnly]);

  const play = filteredPlays[currentIndex];

  const { data: currentAssignments = [] } = useQuery({
    queryKey: ['play-assignments', play?.id],
    queryFn: async () => {
      if (!play?.id) return [];
      const list = await base44.entities.PlayAssignment.filter({ play_id: play.id });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!play?.id,
  });

  const assignmentByPos = Object.fromEntries(currentAssignments.map((a) => [a.position, a]));

  const goNext = useCallback(() => {
    if (currentIndex < filteredPlays.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPositionOverlay(null);
    }
  }, [currentIndex, filteredPlays.length]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setPositionOverlay(null);
    }
  }, [currentIndex]);

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
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8">
        <p className="text-muted-foreground text-lg mb-6">No plays in this view. Try turning off Game Day filter.</p>
        <button type="button" onClick={onClose} className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium text-lg">
          Close
        </button>
      </div>
    );
  }

  const overlayAssignment = positionOverlay ? assignmentByPos[positionOverlay] : null;
  const overlayRouteDisplay = overlayAssignment
    ? (overlayAssignment.movement_type || overlayAssignment.route || '—')
    : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-border flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px] md:min-w-[56px] md:min-h-[56px] flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-6 w-6 md:h-7 md:w-7" />
        </button>
        <h1 className="text-lg md:text-xl font-bold text-foreground">Sideline</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setGameDayOnly(false)}
            className={`px-2 md:px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] ${!gameDayOnly ? 'bg-surface text-foreground' : 'text-muted-foreground'}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setGameDayOnly(true)}
            className={`px-2 md:px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] ${gameDayOnly ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
          >
            Game Day
          </button>
        </div>
      </div>

      {/* Main: large play card */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {play?.use_renderer ? (
          <div className="flex-1 flex items-center justify-center p-2 min-h-0">
            <PlayRenderer
              play={play}
              assignments={currentAssignments}
              highlightPosition={positionOverlay}
              mode="sideline"
              onPositionTap={(posId) => setPositionOverlay(posId)}
              className="w-full max-h-full"
            />
          </div>
        ) : play?.diagram_image ? (
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <img
              src={play.diagram_image}
              alt={play.name}
              className="max-h-full w-auto max-w-full object-contain"
            />
          </div>
        ) : null}
        <div className="px-4 py-1 flex-shrink-0 flex items-center gap-3">
          <h2 className="text-lg md:text-xl font-bold text-foreground">{play?.name}</h2>
          <span className="bg-secondary text-foreground-soft text-sm px-3 py-0.5 rounded">
            {play?.formation || '—'}
          </span>
        </div>
      </div>

      {/* Position buttons */}
      <div className="flex justify-center gap-2 md:gap-3 px-3 py-3 md:p-4 bg-black border-t border-border flex-shrink-0 flex-wrap">
        {positions.map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => setPositionOverlay(pos)}
            className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl bg-secondary border-2 border-border text-primary font-bold text-sm md:text-lg hover:border-primary hover:bg-surface transition-colors flex items-center justify-center"
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Swipe / arrows */}
      <div className="flex items-center justify-between px-2 py-3 bg-black flex-shrink-0">
        <button
          type="button"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="p-3 rounded-xl bg-white/10 text-foreground disabled:opacity-30 min-w-[48px] min-h-[48px] md:min-w-[56px] md:min-h-[56px] flex items-center justify-center"
          aria-label="Previous play"
        >
          <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
        </button>
        <span className="text-muted-foreground text-sm">
          {currentIndex + 1} / {filteredPlays.length}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={currentIndex === filteredPlays.length - 1}
          className="p-3 rounded-xl bg-white/10 text-foreground disabled:opacity-30 min-w-[48px] min-h-[48px] md:min-w-[56px] md:min-h-[56px] flex items-center justify-center"
          aria-label="Next play"
        >
          <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
        </button>
      </div>

      {/* Position detail overlay — bottom sheet on mobile, centered on desktop */}
      {positionOverlay && (
        <div
          className="fixed inset-0 bg-black/95 z-[60] flex flex-col md:items-center md:justify-center"
          role="dialog"
          aria-label={`${positionOverlay} assignment`}
        >
          {/* Mobile: tap top area to dismiss */}
          <div className="flex-1 md:hidden" onClick={() => setPositionOverlay(null)} />
          <div className="p-6 md:p-8 flex flex-col items-center md:max-w-lg">
            <span className="text-primary text-5xl md:text-6xl font-bold mb-4">{positionOverlay}</span>
            {overlayAssignment ? (
              <>
                <span className="bg-secondary text-foreground-soft text-lg md:text-xl px-4 py-2 rounded-lg mb-4 md:mb-6">
                  {overlayRouteDisplay}
                </span>
                <p className="text-foreground text-xl md:text-2xl text-center max-w-lg leading-relaxed">
                  {overlayAssignment.assignment_text || 'No assignment'}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground text-lg md:text-xl">No assignment for this position.</p>
            )}
            <button
              type="button"
              onClick={() => setPositionOverlay(null)}
              className="mt-8 md:mt-10 bg-primary hover:bg-primary-hover text-primary-foreground px-8 py-4 rounded-xl text-lg font-medium min-h-[56px] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
