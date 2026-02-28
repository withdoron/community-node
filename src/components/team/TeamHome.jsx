import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Calendar, UserPlus, Share2, MessageSquare, Clock, MapPin } from 'lucide-react';

const PLAYER_COUNT_ROLES = ['player'];

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

export default function TeamHome({ team, members = [], onNavigateTab, onCopyInviteLink, viewingAsMember, effectiveRole }) {
  const playerCount = members.filter((m) => PLAYER_COUNT_ROLES.includes(m.role)).length;
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
  const { data: teamEvents = [] } = useQuery({
    queryKey: ['team-events', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const list = await base44.entities.TeamEvent.filter({ team_id: team.id }).list();
      return Array.isArray(list) ? list : [];
    },
    enabled: !!team?.id,
  });
  const { data: teamMessages = [] } = useQuery({
    queryKey: ['team-messages', team?.id],
    queryFn: async () => {
      if (!team?.id) return [];
      const list = await base44.entities.TeamMessage.filter({ team_id: team.id }).list();
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
        {sharedTopSection}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-400 uppercase tracking-wider">Viewing as</p>
          <p className="text-lg font-bold text-amber-500">{name} — {position}</p>
        </div>
        <p className="text-slate-300">
          This is what {name} sees: playbook stats and quick actions.
        </p>
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
        <Button
          type="button"
          className="bg-amber-500 hover:bg-amber-400 text-black font-medium px-4 py-2 rounded-lg min-h-[44px] transition-colors"
          onClick={() => onNavigateTab?.('playbook')}
        >
          <BookOpen className="h-4 w-4 mr-2" />
          Study plays
        </Button>
      </div>
    );
  }

  const isCoach = effectiveRole === 'coach' || effectiveRole === 'assistant_coach';

  return (
    <div className="space-y-6">
      {sharedTopSection}
      <div>
        <h2 className="text-xl font-bold text-slate-100">{team?.name}</h2>
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
    </div>
  );
}
