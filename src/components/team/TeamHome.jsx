import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Calendar, UserPlus, Share2, MessageSquare, Clock, MapPin, Zap, Trophy, Flame, Heart, Shield } from 'lucide-react';
import usePlayerStats from '@/hooks/usePlayerStats';
import QuizMode from './QuizMode';
import WorkspaceGuide from '@/components/workspaces/WorkspaceGuide';

const PLAYER_COUNT_ROLES = ['player'];
const MEDALS = ['🥇', '🥈', '🥉'];

function Leaderboard({ teamStats, members }) {
  if (!teamStats || teamStats.length === 0) return null;

  // Build member name lookup
  const memberMap = {};
  members.forEach((m) => {
    memberMap[m.user_id] = m.jersey_name || m.name || 'Player';
  });

  // Rank by high_score descending
  const ranked = [...teamStats]
    .filter((s) => (s.high_score || 0) > 0)
    .sort((a, b) => (b.high_score || 0) - (a.high_score || 0))
    .slice(0, 10);

  if (ranked.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-5 w-5 text-amber-500" />
        <span className="font-semibold text-slate-100">Leaderboard</span>
      </div>
      <div className="space-y-2">
        {ranked.map((s, i) => (
          <div
            key={s.user_id || i}
            className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/50"
          >
            <span className="w-6 text-center text-sm">
              {i < 3 ? MEDALS[i] : <span className="text-slate-500">{i + 1}</span>}
            </span>
            <span className="flex-1 text-sm text-slate-200 font-medium truncate">
              {memberMap[s.user_id] || 'Player'}
            </span>
            <span className="text-amber-500 text-sm font-bold tabular-nums">
              {(s.high_score || 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatEventWhen(startDate, startTime) {
  if (!startDate) return null;
  const d = new Date(startDate + (startTime ? `T${startTime}` : ''));
  const now = Date.now();
  const diff = d.getTime() - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days === 0 && hours < 24) {
    if (hours <= 0) return 'Today';
    return `In ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  if (days === 1) return 'Tomorrow at ' + (startTime ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) + (startTime ? ` · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : '');
}

export default function TeamHome({ team, members = [], onNavigateTab, onCopyInviteLink, viewingAsMember, effectiveRole, currentUserId }) {
  const playerCount = members.filter((m) => PLAYER_COUNT_ROLES.includes(m.role)).length;
  const { stats: playerStats, isLoading: statsLoading } = usePlayerStats({ userId: currentUserId, teamId: team?.id });
  const { data: plays = [] } = useQuery({
    queryKey: ['plays-count', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const list = await base44.entities.Play.filter({ team_id: team.id, status: 'active' });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!team?.id,
  });
  const playCount = plays.length;

  // Fetch assignments for renderer plays (needed for QuizMode)
  const rendererPlayIds = useMemo(
    () => plays.filter((p) => p.use_renderer === true || p.use_renderer === 'true').map((p) => p.id),
    [plays]
  );
  const { data: allRendererAssignments = [] } = useQuery({
    queryKey: ['renderer-play-assignments-home', team?.id, rendererPlayIds.join(',')],
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

  const { data: teamEvents = [] } = useQuery({
    queryKey: ['team-events', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const list = await base44.entities.TeamEvent.filter({ team_id: team.id });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!team?.id,
  });
  const { data: teamPlayerStats = [] } = useQuery({
    queryKey: ['team-player-stats', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const list = await base44.entities.PlayerStats.filter({ team_id: team.id });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!team?.id,
  });
  const { data: teamMessages = [] } = useQuery({
    queryKey: ['team-messages', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const list = await base44.entities.TeamMessage.filter({ team_id: team.id });
      return Array.isArray(list) ? list : [];
    },
    enabled: !!team?.id,
  });
  const nextEvent = useMemo(() => {
    const now = Date.now();
    const upcoming = teamEvents
      .filter((e) => e.start_date && new Date(e.start_date + (e.start_time ? `T${e.start_time}` : '')).getTime() >= now)
      .sort((a, b) => new Date(a.start_date + (a.start_time ? `T${a.start_time}` : '')).getTime() - new Date(b.start_date + (b.start_time ? `T${b.start_time}` : '')).getTime());
    return upcoming[0] || null;
  }, [teamEvents]);
  const recentMessages = useMemo(() => {
    const sorted = [...teamMessages].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    return sorted.slice(0, 3);
  }, [teamMessages]);
  const sportLabel = team?.sport === 'flag_football' ? 'Flag Football' : (team?.sport || 'Team');
  const season = team?.season || '—';
  const isViewingAsChild = !!viewingAsMember && viewingAsMember.role === 'player';
  const isCoach = effectiveRole === 'coach';
  const playerPosition = viewingAsMember?.position || members.find((m) => m.user_id === currentUserId)?.position || null;
  const [quizModeOpen, setQuizModeOpen] = useState(false);

  // Head coach: prefer designated head_coach_member_id, fall back to owner's roster record
  const headCoachName = useMemo(() => {
    if (team?.head_coach_member_id) {
      const designated = members.find((m) => m.id === team.head_coach_member_id);
      if (designated) return designated.jersey_name || 'Coach';
    }
    // Fallback: find the owner's roster member
    const ownerMember = members.find((m) => m.user_id === team?.owner_id && m.role === 'coach');
    return ownerMember?.jersey_name || null;
  }, [team?.head_coach_member_id, team?.owner_id, members]);

  // ─── Workspace Guide (Activation Protocol Moment 3) ──────────
  const guideDismissed = team?.guide_dismissed === true;
  const queryClient = useQueryClient();

  const dismissGuide = useMutation({
    mutationFn: async () => {
      await base44.entities.Team.update(team.id, { guide_dismissed: true });
    },
    onSuccess: () => {
      queryClient.setQueryData(['dashboard-teams'], (old) =>
        Array.isArray(old)
          ? old.map((t) => (t.id === team?.id ? { ...t, guide_dismissed: true } : t))
          : old
      );
      queryClient.invalidateQueries(['dashboard-teams']);
    },
  });

  const handleDismissGuide = useCallback(() => {
    dismissGuide.mutate();
  }, [dismissGuide]);

  // Smart completion: detect which guide steps are done
  const completedSteps = useMemo(() => {
    const done = [];
    // 'settings' — complete if team has a custom name
    if (team?.name && team.name.trim().length > 0) {
      done.push('settings');
    }
    // 'roster' — complete if at least 1 player on roster
    if (members.filter((m) => PLAYER_COUNT_ROLES.includes(m.role)).length > 0) {
      done.push('roster');
    }
    // 'playbook' — complete if at least 1 play exists
    if (playCount > 0) {
      done.push('playbook');
    }
    // 'schedule' — complete if at least 1 event exists
    if (teamEvents.length > 0) {
      done.push('schedule');
    }
    return done;
  }, [team?.name, members, playCount, teamEvents.length]);

  const nextEventWhen = nextEvent ? formatEventWhen(nextEvent.start_date, nextEvent.start_time) : null;
  const nextEventTime = nextEvent && (nextEvent.start_date || nextEvent.start_time)
    ? new Date(nextEvent.start_date + (nextEvent.start_time ? `T${nextEvent.start_time}` : '')).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '';

  const sharedTopSection = (
    <>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-5 w-5 text-amber-500" />
          <span className="font-semibold text-slate-100">Next event</span>
        </div>
        {nextEvent ? (
          <>
            <p className="text-slate-200 font-medium">{nextEvent.title || 'Event'}</p>
            <p className="text-slate-400 text-sm flex items-center gap-1 mt-1">
              <Clock className="h-3.5 w-3.5" />
              {nextEventWhen || nextEventTime}
            </p>
            {nextEvent.location && (
              <p className="text-slate-400 text-sm flex items-center gap-1 mt-0.5">
                <MapPin className="h-3.5 w-3.5" />
                {nextEvent.location}
              </p>
            )}
          </>
        ) : (
          <p className="text-slate-500 text-sm">No upcoming events</p>
        )}
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-slate-100 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-amber-500" />
            Recent messages
          </span>
          <button
            type="button"
            onClick={() => onNavigateTab?.('messages')}
            className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
          >
            View all
          </button>
        </div>
        {recentMessages.length === 0 ? (
          <p className="text-slate-500 text-sm">No messages yet</p>
        ) : (
          <ul className="space-y-2">
            {recentMessages.map((msg) => (
              <li key={msg.id} className="text-sm">
                <span className="text-slate-400">{msg.message?.slice(0, 60)}{(msg.message?.length || 0) > 60 ? '…' : ''}</span>
                <span className="text-slate-500 text-xs block mt-0.5">
                  {msg.created_at ? new Date(msg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );

  if (isViewingAsChild) {
    const name = viewingAsMember.jersey_name || 'Player';
    const position = viewingAsMember.position || '—';
    return (
      <div className="space-y-6">
        {/* Playbook Pro card — top of page */}
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5">
          <h3
            className="text-amber-500 font-bold text-lg tracking-wide mb-3"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            PLAYBOOK PRO
          </h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <Heart key={i} className="h-4 w-4 text-amber-500 fill-amber-500" />
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-slate-300 text-sm font-medium">{(playerStats.high_score || 0).toLocaleString()}</span>
            </div>
            {(playerStats.best_streak || 0) > 0 && (
              <div className="flex items-center gap-1">
                <Flame className="h-4 w-4 text-amber-500" />
                <span className="text-slate-300 text-sm font-medium">{playerStats.best_streak}</span>
              </div>
            )}
          </div>
          <Button
            type="button"
            onClick={() => setQuizModeOpen(true)}
            disabled={playCount === 0}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg py-5 min-h-[56px]"
          >
            <Zap className="h-5 w-5 mr-2" />
            LET'S GO!
          </Button>
        </div>

        {/* Leaderboard */}
        <Leaderboard teamStats={teamPlayerStats} members={members} />

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <BookOpen className="h-5 w-5 text-amber-500 mb-2" />
            <div className="text-2xl font-bold text-slate-100">{playCount}</div>
            <div className="text-sm text-slate-400">Plays in playbook</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <Calendar className="h-5 w-5 text-amber-500 mb-2" />
            <div className="text-2xl font-bold text-slate-100">—</div>
            <div className="text-sm text-slate-400">Schedule</div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <Users className="h-5 w-5 text-amber-500 mb-2" />
            <div className="text-2xl font-bold text-slate-100">{playerCount}</div>
            <div className="text-sm text-slate-400">Teammates</div>
          </div>
        </div>

        {/* Next event + Recent messages */}
        {sharedTopSection}

        {/* Viewing-as context (coach preview) */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Viewing as</p>
          <p className="text-lg font-bold text-amber-500">{name} — {position}</p>
        </div>

        <Button
          type="button"
          className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-500 font-medium px-4 py-2 rounded-lg min-h-[44px] transition-colors border border-slate-700"
          onClick={() => onNavigateTab?.('playbook')}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Study plays
        </Button>

        {quizModeOpen && (
          <QuizMode
            team={team}
            plays={plays}
            assignmentsByPlayId={assignmentsByPlayId}
            isCoach={isCoach}
            currentUserId={currentUserId}
            playerPosition={playerPosition}
            onClose={() => setQuizModeOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Workspace Guide — inline walkthrough for coaches */}
      {isCoach && !guideDismissed && (
        <WorkspaceGuide
          workspaceType="team"
          onDismiss={handleDismissGuide}
          onStepClick={(tab) => onNavigateTab?.(tab)}
          completedSteps={completedSteps}
        />
      )}

      {/* Playbook Pro card — top of page */}
      <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-5">
        <h3
          className="text-amber-500 font-bold text-lg tracking-wide mb-3"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          PLAYBOOK PRO
        </h3>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <Heart key={i} className="h-4 w-4 text-amber-500 fill-amber-500" />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span className="text-slate-300 text-sm font-medium">{(playerStats.high_score || 0).toLocaleString()}</span>
          </div>
          {(playerStats.best_streak || 0) > 0 && (
            <div className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-amber-500" />
              <span className="text-slate-300 text-sm font-medium">{playerStats.best_streak}</span>
            </div>
          )}
        </div>
        <Button
          type="button"
          onClick={() => setQuizModeOpen(true)}
          disabled={playCount === 0}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-lg py-5 min-h-[56px]"
        >
          <Zap className="h-5 w-5 mr-2" />
          LET'S GO!
        </Button>
      </div>

      {/* Leaderboard */}
      <Leaderboard teamStats={teamPlayerStats} members={members} />

      {/* Team header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">{team?.name}</h2>
        {headCoachName && (
          <p className="text-sm text-slate-400 flex items-center gap-1.5 mt-1">
            <Shield className="h-3.5 w-3.5 text-amber-500" />
            Head Coach: {headCoachName}
          </p>
        )}
        {season && season !== '—' && <p className="text-sm text-slate-400">{season}</p>}
      </div>

      {isCoach ? (
        <p className="text-slate-400">
          Welcome to your team! Start by adding your players to the roster.
        </p>
      ) : (
        <p className="text-slate-400">
          Your team
        </p>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <Users className="h-5 w-5 text-amber-500 mb-2" />
          <div className="text-2xl font-bold text-slate-100">{playerCount}</div>
          <div className="text-sm text-slate-400">Roster</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <BookOpen className="h-5 w-5 text-amber-500 mb-2" />
          <div className="text-2xl font-bold text-slate-100">{playCount}</div>
          <div className="text-sm text-slate-400">Playbook</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <Calendar className="h-5 w-5 text-amber-500 mb-2" />
          <div className="text-2xl font-bold text-slate-100">
            {teamEvents.filter((e) => e.start_date && new Date(e.start_date + (e.start_time ? `T${e.start_time}` : '')).getTime() >= Date.now()).length}
          </div>
          <div className="text-sm text-slate-400">Schedule</div>
        </div>
      </div>

      {/* Next event + Recent messages */}
      {sharedTopSection}

      {/* Coach actions */}
      {isCoach && (
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            className="bg-amber-500 hover:bg-amber-400 text-black font-medium px-4 py-2 rounded-lg min-h-[44px] transition-colors"
            onClick={() => onNavigateTab?.('roster')}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Player
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 min-h-[44px] transition-colors"
            onClick={() => onCopyInviteLink?.()}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Invite Code
          </Button>
        </div>
      )}

      {quizModeOpen && (
        <QuizMode
          team={team}
          plays={plays}
          assignmentsByPlayId={assignmentsByPlayId}
          isCoach={isCoach}
          currentUserId={currentUserId}
          playerPosition={playerPosition}
          onClose={() => setQuizModeOpen(false)}
        />
      )}
    </div>
  );
}
