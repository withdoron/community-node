import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, BookOpen, Monitor, Zap, Lightbulb, Star } from 'lucide-react';
import { toast } from 'sonner';
import PlayCard from './PlayCard';
import PlayDetail from './PlayDetail';
import PlayCreateModal from './PlayCreateModal';
import StudyMode from './StudyMode';
import SidelineMode from './SidelineMode';
import QuizMode from './QuizMode';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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

export default function TeamPlaybook({ team, members = [], isCoach, currentUserId, playerPosition: playerPositionProp }) {
  const queryClient = useQueryClient();
  const [side, setSide] = useState('offense');
  const [selectedPlay, setSelectedPlay] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSection, setCreateSection] = useState('playbook'); // 'playbook' | 'creation_station'
  const [editPlay, setEditPlay] = useState(null);
  const [studyModeOpen, setStudyModeOpen] = useState(false);
  const [sidelineModeOpen, setSidelineModeOpen] = useState(false);
  const [studyModeInitialPlayId, setStudyModeInitialPlayId] = useState(null);
  const [quizModeOpen, setQuizModeOpen] = useState(false);
  const [quizPlayFilter, setQuizPlayFilter] = useState(null);
  const [archiveConfirmPlay, setArchiveConfirmPlay] = useState(null);

  // Fetch ALL plays for the team (split by status client-side)
  const { data: plays = [] } = useQuery({
    queryKey: ['plays', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const list = await base44.entities.Play.filter({ team_id: team.id });
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

  // Batch-fetch assignments for all visual (use_renderer) plays — needed for PlayCard mini renderer + Quiz
  const rendererPlayIds = useMemo(
    () => plays.filter((p) => (p.status || 'active') !== 'archived' && (p.use_renderer === true || p.use_renderer === 'true')).map((p) => p.id),
    [plays]
  );
  const { data: allRendererAssignments = [] } = useQuery({
    queryKey: ['renderer-play-assignments', team?.id, rendererPlayIds.join(',')],
    queryFn: async () => {
      if (!rendererPlayIds.length) return [];
      const results = await Promise.all(
        rendererPlayIds.map(async (pid) => {
          const list = await base44.entities.PlayAssignment.filter({ play_id: pid });
          return Array.isArray(list) ? list : [];
        })
      );
      return results.flat();
    },
    enabled: !!team?.id && rendererPlayIds.length > 0,
  });
  const assignmentsByPlayId = useMemo(() => {
    const map = {};
    allRendererAssignments.forEach((a) => {
      if (!map[a.play_id]) map[a.play_id] = [];
      map[a.play_id].push(a);
    });
    return map;
  }, [allRendererAssignments]);

  const invoke = (args) => base44.functions.invoke('manageTeamPlay', { ...args, team_id: team?.id });

  // ─── Play collections (split by status, backward compat: default to 'active') ───
  const allActivePlays = useMemo(() => plays.filter((p) => (p.status || 'active') !== 'archived'), [plays]);
  const playbookPlays = useMemo(() => allActivePlays.filter((p) => (p.status || 'active') === 'active'), [allActivePlays]);
  const experimentalPlays = useMemo(() => allActivePlays.filter((p) => p.status === 'experimental'), [allActivePlays]);
  const gameDayPlays = useMemo(() => playbookPlays.filter((p) => p.game_day), [playbookPlays]);

  // Filter each collection by offense/defense
  const gameDayForSide = useMemo(() => gameDayPlays.filter((p) => p.side === side), [gameDayPlays, side]);
  const playbookForSide = useMemo(() => playbookPlays.filter((p) => p.side === side), [playbookPlays, side]);
  const experimentalForSide = useMemo(() => experimentalPlays.filter((p) => p.side === side), [experimentalPlays, side]);

  // Official plays only (for Study/Sideline/Quiz — exclude experimental)
  const officialPlaysForSide = useMemo(() => playbookPlays.filter((p) => p.side === side), [playbookPlays, side]);

  // Formation groupings
  const gameDayByFormation = useMemo(() => groupByFormation(gameDayForSide), [gameDayForSide]);
  const playbookByFormation = useMemo(() => groupByFormation(playbookForSide), [playbookForSide]);
  const experimentalByFormation = useMemo(() => groupByFormation(experimentalForSide), [experimentalForSide]);

  const currentUserMember = members.find((m) => m.user_id === currentUserId);
  const playerPosition = playerPositionProp ?? currentUserMember?.position ?? null;
  const currentMemberName = currentUserMember?.jersey_name || currentUserMember?.name || null;

  // ─── Mutations ───
  const archiveMutation = useMutation({
    mutationFn: (play) => invoke({ action: 'update', entity_type: 'play', entity_id: play.id, data: { status: 'archived' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plays', team?.id] });
      setSelectedPlay(null);
      toast.success('Play archived');
    },
    onError: (err) => toast.error(err?.message || 'Failed to archive'),
  });

  const promoteMutation = useMutation({
    mutationFn: (play) => invoke({ action: 'update', entity_type: 'play', entity_id: play.id, data: { status: 'active' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plays', team?.id] });
      setSelectedPlay(null);
      toast.success('Play added to Playbook!');
    },
    onError: (err) => toast.error(err?.message || 'Failed to promote play'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (play) => {
      const assignments = await base44.entities.PlayAssignment.filter({ play_id: play.id });
      const assignmentList = Array.isArray(assignments) ? assignments : [];
      for (const a of assignmentList) {
        await invoke({ action: 'delete', entity_type: 'play_assignment', entity_id: a.id });
      }
      await invoke({ action: 'delete', entity_type: 'play', entity_id: play.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plays', team?.id] });
      queryClient.invalidateQueries({ queryKey: ['renderer-play-assignments'] });
      setSelectedPlay(null);
      toast.success('Play deleted');
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete play'),
  });

  // ─── Handlers ───
  const handleEdit = (play) => {
    setEditPlay(play);
    setSelectedPlay(null);
    // Open in the correct section context
    setCreateSection(play.status === 'experimental' ? 'creation_station' : 'playbook');
    setCreateModalOpen(true);
  };

  const handleCloseEdit = () => {
    setEditPlay(null);
    setCreateModalOpen(false);
  };

  const handleArchive = (play) => {
    setArchiveConfirmPlay(play);
  };

  const handleDelete = (play) => {
    deleteMutation.mutate(play);
  };

  const handlePromote = (play) => {
    promoteMutation.mutate(play);
  };

  const openPlaybookCreate = () => {
    setEditPlay(null);
    setCreateSection('playbook');
    setCreateModalOpen(true);
  };

  const openCreationStationCreate = () => {
    setEditPlay(null);
    setCreateSection('creation_station');
    setCreateModalOpen(true);
  };

  const initialStatus = createSection === 'creation_station' ? 'experimental' : 'active';

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

      {/* Tools row */}
      <div className="flex items-center justify-end gap-2">
        {officialPlaysForSide.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => { setStudyModeInitialPlayId(null); setStudyModeOpen(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-500 transition-colors min-h-[44px]"
            >
              <BookOpen className="h-4 w-4" />
              Study
            </button>
            <button
              type="button"
              title="Playbook Pro"
              onClick={() => { setQuizPlayFilter(null); setQuizModeOpen(true); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-500 transition-colors min-h-[44px]"
            >
              <Zap className="h-4 w-4" />
              <span className="hidden sm:inline">Playbook Pro</span>
              <span className="sm:hidden">Play</span>
            </button>
          </>
        )}
        {isCoach && (
          <button
            type="button"
            onClick={() => setSidelineModeOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:border-amber-500/50 hover:text-amber-500 transition-colors min-h-[44px]"
          >
            <Monitor className="h-4 w-4" />
            <span className="hidden sm:inline">Sideline</span>
          </button>
        )}
      </div>

      {/* ═══ SECTION 1: Game Day ═══ */}
      {gameDayForSide.length > 0 && (
        <section className="border-l-4 border-l-amber-500 pl-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-white">Game Day</h2>
            <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">{gameDayForSide.length}</span>
          </div>
          <div className="space-y-4">
            {Object.entries(gameDayByFormation).map(([formation, formationPlays]) => (
              <div key={formation}>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{formation}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formationPlays.map((play) => (
                    <PlayCard
                      key={play.id}
                      play={play}
                      assignments={assignmentsByPlayId[play.id] || []}
                      onClick={() => setSelectedPlay(play)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ SECTION 2: Playbook ═══ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-white">Playbook</h2>
          <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{playbookForSide.length}</span>
        </div>
        <div className="space-y-6">
          {playbookForSide.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No {side} plays yet.</p>
              {isCoach && (
                <button
                  type="button"
                  onClick={openPlaybookCreate}
                  className="mt-4 text-amber-500 hover:text-amber-400 font-medium"
                >
                  Add your first play
                </button>
              )}
            </div>
          ) : (
            Object.entries(playbookByFormation).map(([formation, formationPlays]) => (
              <div key={formation}>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{formation}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formationPlays.map((play) => (
                    <PlayCard
                      key={play.id}
                      play={play}
                      assignments={assignmentsByPlayId[play.id] || []}
                      onClick={() => setSelectedPlay(play)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        {/* FAB — coach only, adds to Playbook */}
        {isCoach && (
          <button
            type="button"
            onClick={openPlaybookCreate}
            className="fixed bottom-20 right-4 md:static md:mt-4 bg-amber-500 hover:bg-amber-400 text-black p-3 rounded-full shadow-lg md:rounded-lg md:px-4 md:py-2 font-medium transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center z-10"
            aria-label="Add play"
          >
            <Plus className="h-5 w-5 md:mr-2" />
            <span className="hidden md:inline">Add play</span>
          </button>
        )}
      </section>

      {/* ═══ SECTION 3: Creation Station ═══ */}
      <section className="border-l-4 border-l-teal-500 pl-4">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="h-5 w-5 text-teal-400" />
          <h2 className="text-lg font-bold text-white">Creation Station</h2>
          {experimentalForSide.length > 0 && (
            <span className="text-xs bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full">{experimentalForSide.length}</span>
          )}
        </div>
        <p className="text-slate-500 text-sm mb-4">Design your own plays. Coaches promote the best ones to the Playbook.</p>
        <div className="space-y-6">
          {experimentalForSide.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">Got a play idea? Design it here.</p>
            </div>
          ) : (
            Object.entries(experimentalByFormation).map(([formation, formationPlays]) => (
              <div key={formation}>
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">{formation}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formationPlays.map((play) => (
                    <PlayCard
                      key={play.id}
                      play={play}
                      assignments={assignmentsByPlayId[play.id] || []}
                      onClick={() => setSelectedPlay(play)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        {/* All members can create in Creation Station */}
        <button
          type="button"
          onClick={openCreationStationCreate}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30 transition-colors min-h-[44px] font-medium"
        >
          <Plus className="h-4 w-4" />
          Create a play
        </button>
      </section>

      {/* Play detail overlay */}
      {selectedPlay && (
        <PlayDetail
          play={selectedPlay}
          assignments={selectedAssignments}
          isCoach={isCoach}
          currentUserId={currentUserId}
          playerPosition={playerPosition}
          teamFormat={team?.format}
          onClose={() => setSelectedPlay(null)}
          onEdit={handleEdit}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onPromote={handlePromote}
          isDeleting={deleteMutation.isPending}
          isPromoting={promoteMutation.isPending}
          onStudyThisPlay={() => {
            setStudyModeInitialPlayId(selectedPlay.id);
            setSelectedPlay(null);
            setStudyModeOpen(true);
          }}
          onQuizThisPlay={() => {
            setQuizPlayFilter([selectedPlay.id]);
            setSelectedPlay(null);
            setQuizModeOpen(true);
          }}
        />
      )}

      {/* Create/Edit modal */}
      <PlayCreateModal
        open={createModalOpen}
        onOpenChange={(open) => { if (!open) handleCloseEdit(); else setCreateModalOpen(open); }}
        teamId={team?.id}
        createdBy={currentUserId}
        createdByName={currentMemberName}
        defaultSide={side}
        editPlay={editPlay}
        editAssignments={editPlay ? selectedAssignments : []}
        teamFormat={team?.format}
        initialStatus={initialStatus}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['plays', team?.id] })}
      />

      {/* Study Mode overlay — official plays only */}
      {studyModeOpen && (
        <StudyMode
          plays={officialPlaysForSide}
          playerPosition={playerPosition}
          isCoach={isCoach}
          teamFormat={team?.format}
          onClose={() => { setStudyModeOpen(false); setStudyModeInitialPlayId(null); }}
          initialIndex={
            studyModeInitialPlayId
              ? Math.max(0, officialPlaysForSide.findIndex((p) => p.id === studyModeInitialPlayId))
              : 0
          }
        />
      )}

      {/* Sideline Mode overlay — official plays only */}
      {sidelineModeOpen && (
        <SidelineMode
          plays={officialPlaysForSide}
          teamFormat={team?.format}
          onClose={() => setSidelineModeOpen(false)}
        />
      )}

      {/* Quiz Mode overlay — official plays only */}
      {quizModeOpen && (
        <QuizMode
          team={team}
          plays={playbookPlays}
          assignmentsByPlayId={assignmentsByPlayId}
          isCoach={isCoach}
          currentUserId={currentUserId}
          playerPosition={playerPosition}
          onClose={() => { setQuizModeOpen(false); setQuizPlayFilter(null); }}
          initialPlayFilter={quizPlayFilter}
        />
      )}

      {/* Archive confirmation dialog */}
      <ConfirmDialog
        open={!!archiveConfirmPlay}
        onOpenChange={(open) => { if (!open) setArchiveConfirmPlay(null); }}
        title="Archive this play?"
        description="It will be removed from the playbook. You can restore it later."
        confirmLabel="Archive"
        destructive
        onConfirm={() => {
          archiveMutation.mutate(archiveConfirmPlay);
          setArchiveConfirmPlay(null);
        }}
      />
    </div>
  );
}
