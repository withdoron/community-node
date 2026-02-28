import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, BookOpen, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import PlayCard from './PlayCard';
import PlayDetail from './PlayDetail';
import PlayCreateModal from './PlayCreateModal';
import StudyMode from './StudyMode';
import SidelineMode from './SidelineMode';

export default function TeamPlaybook({ team, members = [], isCoach, currentUserId }) {
  const queryClient = useQueryClient();
  const [side, setSide] = useState('offense');
  const [gameDayOnly, setGameDayOnly] = useState(false);
  const [selectedPlay, setSelectedPlay] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editPlay, setEditPlay] = useState(null);
  const [studyModeOpen, setStudyModeOpen] = useState(false);
  const [sidelineModeOpen, setSidelineModeOpen] = useState(false);
  const [studyModeInitialPlayId, setStudyModeInitialPlayId] = useState(null);

  const { data: plays = [] } = useQuery({
    queryKey: ['plays', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const list = await base44.entities.Play.filter(
        { team_id: team.id, status: 'active' }
      );
      return Array.isArray(list) ? list : [];
    },
    enabled: !!team?.id,
  });

  const { data: selectedAssignments = [] } = useQuery({
    queryKey: ['play-assignments', selectedPlay?.id],
    queryFn: async () => {
      if (!selectedPlay?.id) return [];
      const list = await base44.entities.PlayAssignment.filter({ play_id: selectedPlay.id });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!selectedPlay?.id,
  });

  const archiveMutation = useMutation({
    mutationFn: (play) => base44.entities.Play.update(play.id, { status: 'archived' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plays', team?.id] });
      setSelectedPlay(null);
      toast.success('Play archived');
    },
    onError: (err) => toast.error(err?.message || 'Failed to archive'),
  });

  const playsForSide = useMemo(() => plays.filter((p) => p.side === side), [plays, side]);

  const filteredPlays = useMemo(() => {
    let list = playsForSide;
    if (gameDayOnly) list = list.filter((p) => p.game_day);
    return list;
  }, [playsForSide, gameDayOnly]);

  const { data: allAssignments } = useQuery({
    queryKey: ['play-assignments-bulk', team?.id, playsForSide.map((p) => p.id).sort().join(',')],
    queryFn: async () => {
      if (!playsForSide?.length) return [];
      const results = await Promise.all(
        playsForSide.map((p) => base44.entities.PlayAssignment.filter({ play_id: p.id }).list())
      );
      return results.flat();
    },
    enabled: !!team?.id && playsForSide.length > 0,
  });

  const assignmentsByPlayId = useMemo(() => {
    if (!allAssignments) return {};
    const map = {};
    allAssignments.forEach((a) => {
      if (!map[a.play_id]) map[a.play_id] = [];
      map[a.play_id].push(a);
    });
    return map;
  }, [allAssignments]);

  const playsByFormation = useMemo(() => {
    const map = {};
    filteredPlays.forEach((p) => {
      const key = p.formation || 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [filteredPlays]);

  const currentUserMember = members.find((m) => m.user_id === currentUserId);
  const playerPosition = currentUserMember?.position || null;

  const handleEdit = (play) => {
    setEditPlay(play);
    setSelectedPlay(null);
    setCreateModalOpen(true);
  };

  const handleCloseEdit = () => {
    setEditPlay(null);
    setCreateModalOpen(false);
  };

  const handleArchive = (play) => {
    if (window.confirm('Archive this play? It will be removed from the playbook.')) {
      archiveMutation.mutate(play);
    }
  };

  return (
    <div className="space-y-4 pb-24 md:pb-8">
      {/* Offense / Defense toggle */}
      <div className="flex gap-2 p-1 bg-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setSide('offense')}
          className={`flex-1 py-3 text-center font-bold rounded-lg transition-colors min-h-[44px] ${
            side === 'offense' ? 'bg-amber-500 text-black' : 'text-slate-400 bg-transparent hover:bg-slate-700'
          }`}
        >
          Offense
        </button>
        <button
          type="button"
          onClick={() => setSide('defense')}
          className={`flex-1 py-3 text-center font-bold rounded-lg transition-colors min-h-[44px] ${
            side === 'defense' ? 'bg-amber-500 text-black' : 'text-slate-400 bg-transparent hover:bg-slate-700'
          }`}
        >
          Defense
        </button>
      </div>

      {/* Filter row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg">
          <button
            type="button"
            onClick={() => setGameDayOnly(false)}
            className={`px-3 py-1.5 rounded text-sm font-medium min-h-[44px] transition-colors ${
              !gameDayOnly ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            All plays
          </button>
          <button
            type="button"
            onClick={() => setGameDayOnly(true)}
            className={`px-3 py-1.5 rounded text-sm font-medium min-h-[44px] transition-colors ${
              gameDayOnly ? 'bg-amber-500/20 text-amber-500' : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Game day
          </button>
        </div>
        <span className="text-slate-500 text-sm">{filteredPlays.length} play{filteredPlays.length !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-2">
          {playsForSide.length > 0 && (
            <button
              type="button"
              onClick={() => { setStudyModeInitialPlayId(null); setStudyModeOpen(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-500 transition-colors min-h-[44px]"
            >
              <BookOpen className="h-4 w-4" />
              Study
            </button>
          )}
          {isCoach && (
            <button
              type="button"
              onClick={() => setSidelineModeOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-500 transition-colors min-h-[44px]"
            >
              <Monitor className="h-4 w-4" />
              Sideline
            </button>
          )}
        </div>
      </div>

      {/* Play grid by formation */}
      <div className="space-y-6">
        {Object.keys(playsByFormation).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500">No {side} plays yet.</p>
            {isCoach && (
              <button
                type="button"
                onClick={() => { setEditPlay(null); setCreateModalOpen(true); }}
                className="mt-4 text-amber-500 hover:text-amber-400 font-medium"
              >
                Add your first play
              </button>
            )}
          </div>
        ) : (
          Object.entries(playsByFormation).map(([formation, formationPlays]) => (
            <div key={formation}>
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{formation}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {formationPlays.map((play) => (
                  <PlayCard
                    key={play.id}
                    play={play}
                    onClick={() => setSelectedPlay(play)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB — coach only */}
      {isCoach && (
        <button
          type="button"
          onClick={() => { setEditPlay(null); setCreateModalOpen(true); }}
          className="fixed bottom-20 right-4 md:static md:mt-4 bg-amber-500 hover:bg-amber-400 text-black p-3 rounded-full shadow-lg md:rounded-lg md:px-4 md:py-2 font-medium transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Add play"
        >
          <Plus className="h-5 w-5 md:mr-2" />
          <span className="hidden md:inline">Add play</span>
        </button>
      )}

      {/* Play detail overlay */}
      {selectedPlay && (
        <PlayDetail
          play={selectedPlay}
          assignments={selectedAssignments}
          isCoach={isCoach}
          playerPosition={playerPosition}
          onClose={() => setSelectedPlay(null)}
          onEdit={handleEdit}
          onArchive={handleArchive}
          onStudyThisPlay={() => {
            setStudyModeInitialPlayId(selectedPlay.id);
            setSelectedPlay(null);
            setStudyModeOpen(true);
          }}
        />
      )}

      {/* Create/Edit modal */}
      <PlayCreateModal
        open={createModalOpen}
        onOpenChange={(open) => { if (!open) handleCloseEdit(); else setCreateModalOpen(open); }}
        teamId={team?.id}
        createdBy={currentUserId}
        defaultSide={side}
        editPlay={editPlay}
        editAssignments={editPlay ? selectedAssignments : []}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['plays', team?.id] })}
      />

      {/* Study Mode overlay */}
      {studyModeOpen && (
        <>
          {console.log('[Playbook] Passing to StudyMode - assignments:', assignmentsByPlayId)}
          <StudyMode
            plays={playsForSide}
            assignments={assignmentsByPlayId}
          playerPosition={playerPosition}
          isCoach={isCoach}
          onClose={() => { setStudyModeOpen(false); setStudyModeInitialPlayId(null); }}
          initialIndex={
            studyModeInitialPlayId
              ? Math.max(0, playsForSide.findIndex((p) => p.id === studyModeInitialPlayId))
              : 0
          }
        />
      )}

      {/* Sideline Mode overlay (coach, md+) */}
      {sidelineModeOpen && (
        <SidelineMode
          plays={playsForSide}
          assignments={assignmentsByPlayId}
          onClose={() => setSidelineModeOpen(false)}
        />
      )}
    </div>
  );
}
