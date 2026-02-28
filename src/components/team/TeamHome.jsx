import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Users, BookOpen, Calendar, UserPlus, Share2 } from 'lucide-react';

const PLAYER_COUNT_ROLES = ['player'];

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
  const sportLabel = team?.sport === 'flag_football' ? 'Flag Football' : (team?.sport || 'Team');
  const season = team?.season || '—';
  const isViewingAsChild = !!viewingAsMember && viewingAsMember.role === 'player';

  if (isViewingAsChild) {
    const name = viewingAsMember.jersey_name || 'Player';
    const position = viewingAsMember.position || '—';
    return (
      <div className="space-y-6">
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
          <div className="text-2xl font-bold text-slate-100">—</div>
          <div className="text-sm text-slate-400">Schedule <span className="text-slate-500">(No events yet)</span></div>
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
