import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Users, Camera } from 'lucide-react';

const DAY_MS = 86400000;

export default function PlayerReadinessCard({ profile: team, onClick, onUrgency }) {
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
    enabled: !!team.id, staleTime: 5 * 60 * 1000,
  });

  const { data: photoCount = 0 } = useQuery({
    queryKey: ['mylane-team-photo-count', team.id],
    queryFn: async () => {
      if (!team.id) return 0;
      try {
        const list = await base44.entities.TeamPhoto.filter({ team_id: team.id });
        return Array.isArray(list) ? list.length : 0;
      } catch { return 0; }
    },
    enabled: !!team.id, staleTime: 5 * 60 * 1000,
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
    enabled: !!team.id, staleTime: 5 * 60 * 1000,
  });

  const total = members.length;

  // Time awareness: game within 3 days
  const now = Date.now();
  const daysUntilEvent = nextEvent?.start_date
    ? Math.max(0, Math.ceil((new Date(nextEvent.start_date).getTime() - now) / DAY_MS))
    : null;
  const gameImminent = daysUntilEvent !== null && daysUntilEvent <= 3;

  // Report urgency to parent for sort boost
  useEffect(() => {
    onUrgency?.('player-readiness', gameImminent);
  }, [gameImminent, onUrgency]);

  const borderColor = gameImminent ? 'border-primary/40' : 'border-border';
  const eventColor = gameImminent ? 'text-primary-hover' : 'text-muted-foreground';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className={`bg-card border ${borderColor} rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-primary">Roster</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{total} <span className="text-sm font-normal text-muted-foreground">players</span></div>
      <div className={`text-xs mt-1 ${eventColor}`}>
        {nextEvent
          ? `${gameImminent ? 'Game' : 'Next'}: ${nextEvent.title || 'Event'} — ${daysUntilEvent === 0 ? 'Today' : daysUntilEvent === 1 ? 'Tomorrow' : new Date(nextEvent.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : 'No upcoming events'}
      </div>
      {photoCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Camera className="h-3 w-3" />
          <span>{photoCount} photo{photoCount !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
