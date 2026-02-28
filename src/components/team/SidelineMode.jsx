import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const POSITIONS = ['C', 'QB', 'RB', 'X', 'Z'];

export default function SidelineMode({
  plays = [],
  onClose,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameDayOnly, setGameDayOnly] = useState(true);
  const [positionOverlay, setPositionOverlay] = useState(null);

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
      const list = await base44.entities.PlayAssignment.filter({ play_id: play.id }).list();
      return Array.isArray(list) ? list : [];
    },
    enabled: !!play?.id,
  });

  const assignmentByPos = Object.fromEntries(currentAssignments.map((a) => [a.position, a]));

  const goNext = () => {
    if (currentIndex < filteredPlays.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setPositionOverlay(null);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setPositionOverlay(null);
    }
  };

  if (filteredPlays.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-8">
        <p className="text-slate-400 text-lg mb-6">No plays in this view. Try turning off Game Day filter.</p>
        <button type="button" onClick={onClose} className="bg-amber-500 text-black px-6 py-3 rounded-xl font-medium text-lg">
          Close
        </button>
      </div>
    );
  }

  const overlayAssignment = positionOverlay ? assignmentByPos[positionOverlay] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black border-b border-slate-800 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors min-w-[56px] min-h-[56px] flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-7 w-7" />
        </button>
        <h1 className="text-xl font-bold text-white">Sideline Mode</h1>
        <div className="flex gap-2 min-w-[56px]">
          <button
            type="button"
            onClick={() => setGameDayOnly(false)}
            className={`px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] ${!gameDayOnly ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setGameDayOnly(true)}
            className={`px-3 py-2 rounded-lg text-sm font-medium min-h-[44px] ${gameDayOnly ? 'bg-amber-500 text-black' : 'text-slate-400'}`}
          >
            Game Day
          </button>
        </div>
      </div>

      {/* Main: large play card */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {play?.diagram_image && (
          <div className="flex-1 flex items-center justify-center p-4 min-h-0">
            <img
              src={play.diagram_image}
              alt={play.name}
              className="max-h-full w-auto max-w-full object-contain"
            />
          </div>
        )}
        <div className="px-4 pb-2 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white">{play?.name}</h2>
          <span className="inline-block mt-1 bg-slate-800 text-slate-300 text-sm px-3 py-1 rounded">
            {play?.formation || '—'}
          </span>
        </div>
      </div>

      {/* Position buttons */}
      <div className="flex justify-center gap-3 p-4 bg-black border-t border-slate-800 flex-shrink-0">
        {POSITIONS.map((pos) => (
          <button
            key={pos}
            type="button"
            onClick={() => setPositionOverlay(pos)}
            className="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-slate-800 border-2 border-slate-700 text-amber-500 font-bold text-lg hover:border-amber-500 hover:bg-slate-700 transition-colors flex items-center justify-center"
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
          className="p-3 rounded-xl bg-white/10 text-white disabled:opacity-30 min-w-[56px] min-h-[56px] flex items-center justify-center"
          aria-label="Previous play"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
        <span className="text-slate-400 text-sm">
          {currentIndex + 1} / {filteredPlays.length}
        </span>
        <button
          type="button"
          onClick={goNext}
          disabled={currentIndex === filteredPlays.length - 1}
          className="p-3 rounded-xl bg-white/10 text-white disabled:opacity-30 min-w-[56px] min-h-[56px] flex items-center justify-center"
          aria-label="Next play"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      </div>

      {/* Position detail overlay */}
      {positionOverlay && (
        <div
          className="fixed inset-0 bg-black/95 z-[60] flex flex-col items-center justify-center p-8"
          role="dialog"
          aria-label={`${positionOverlay} assignment`}
        >
          <span className="text-amber-500 text-6xl font-bold mb-4">{positionOverlay}</span>
          {overlayAssignment ? (
            <>
              <span className="bg-slate-800 text-slate-300 text-xl px-4 py-2 rounded-lg mb-6">
                {overlayAssignment.route || '—'}
              </span>
              <p className="text-white text-2xl text-center max-w-lg leading-relaxed">
                {overlayAssignment.assignment_text || 'No assignment'}
              </p>
            </>
          ) : (
            <p className="text-slate-400 text-xl">No assignment for this position.</p>
          )}
          <button
            type="button"
            onClick={() => setPositionOverlay(null)}
            className="mt-10 bg-amber-500 hover:bg-amber-400 text-black px-8 py-4 rounded-xl text-lg font-medium min-h-[56px] transition-colors"
          >
            Got it
          </button>
        </div>
      )}
    </div>
  );
}
