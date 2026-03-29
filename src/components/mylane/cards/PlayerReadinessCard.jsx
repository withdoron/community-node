import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';

export default function PlayerReadinessCard({ profile: team, onClick }) {
  if (!team) return null;

  const { data: members = [] } = useQuery({
    queryKey: ['mylane-team-members', team.id],
    queryFn: async () => {
      if (!team.id) return [];
      try {
        const list = await base44.entities.TeamMember.filter({ team_id: team.id, status: 'active' });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!team.id,
  });

  const { data: nextEvent } = useQuery({
    queryKey: ['mylane-team-next-event', team.id],
    queryFn: async () => {
      if (!team.id) return null;
      try {
        const list = await base44.entities.TeamEvent.filter({ team_id: team.id });
        const events = Array.isArray(list) ? list : list ? [list] : [];
        const today = new Date().toISOString().split('T')[0];
        const upcoming = events
          .filter((e) => e.start_date >= today)
          .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
        return upcoming[0] || null;
      } catch { return null; }
    },
    enabled: !!team.id,
  });

  const total = members.length;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-medium text-amber-500">Roster</span>
      </div>
      <div className="text-2xl font-bold text-white">{total} <span className="text-sm font-normal text-slate-400">players</span></div>
      <div className="text-xs text-slate-400 mt-1">
        {nextEvent
          ? `Next: ${nextEvent.title || 'Event'} — ${new Date(nextEvent.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : 'No upcoming events'}
      </div>
    </div>
  );
}
