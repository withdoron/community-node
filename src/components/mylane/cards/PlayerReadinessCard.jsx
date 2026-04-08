import React, { useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { fetchTeamData } from '@/hooks/useTeamEntity';
import { useQuery } from '@tanstack/react-query';
import { Users, Camera, Calendar } from 'lucide-react';

const DAY_MS = 86400000;

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${period}`;
}

function parseDuties(event) {
  if (!event?.duties) return [];
  if (typeof event.duties === 'string') {
    try { return JSON.parse(event.duties); } catch { return []; }
  }
  return Array.isArray(event.duties) ? event.duties : [];
}

function parseRsvps(event) {
  if (!event?.rsvps) return {};
  if (typeof event.rsvps === 'string') {
    try { return JSON.parse(event.rsvps); } catch { return {}; }
  }
  return event.rsvps;
}

const DUTY_LABELS = { snack: 'Snack', water: 'Water', setup: 'Setup', cleanup: 'Cleanup' };

export default function PlayerReadinessCard({ profile: team, onClick, onUrgency }) {
  if (!team) return null;

  const { data: members = [] } = useQuery({
    queryKey: ['mylane-team-members', team.id],
    queryFn: async () => {
      if (!team.id) return [];
      return fetchTeamData('TeamMember', team.id, { status: 'active' });
    },
    enabled: !!team.id,
  });

  const { data: photoCount = 0 } = useQuery({
    queryKey: ['mylane-team-photo-count', team.id],
    queryFn: async () => {
      if (!team.id) return 0;
      const photos = await fetchTeamData('TeamPhoto', team.id);
      return photos.length;
    },
    enabled: !!team.id,
  });

  const { data: nextEvent } = useQuery({
    queryKey: ['mylane-team-next-event', team.id],
    queryFn: async () => {
      if (!team.id) return null;
      const events = await fetchTeamData('TeamEvent', team.id);
      const today = new Date().toISOString().split('T')[0];
      const upcoming = events
        .filter((e) => e.start_date >= today)
        .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
      return upcoming[0] || null;
    },
    enabled: !!team.id,
  });

  const total = members.length;

  // Time awareness: game within 3 days
  const now = Date.now();
  const daysUntilEvent = nextEvent?.start_date
    ? Math.max(0, Math.ceil((new Date(nextEvent.start_date + 'T12:00:00').getTime() - now) / DAY_MS))
    : null;
  const gameImminent = daysUntilEvent !== null && daysUntilEvent <= 3;

  // RSVP + Duty awareness
  const rsvps = parseRsvps(nextEvent);
  const duties = parseDuties(nextEvent);
  const yesCount = Object.values(rsvps).filter((v) => v === 'yes').length;

  // Find current user's member record and their duty
  const currentMember = useMemo(() => {
    // We don't have currentUserId here, but we can check duties by member presence
    return null; // Duty display handled by member matching in the team space
  }, []);

  // Report urgency to parent for sort boost
  useEffect(() => {
    onUrgency?.('player-readiness', gameImminent);
  }, [gameImminent, onUrgency]);

  const borderColor = gameImminent ? 'border-primary/40' : 'border-border';
  const eventColor = gameImminent ? 'text-primary-hover' : 'text-muted-foreground';

  // Build event display string
  const eventDisplay = useMemo(() => {
    if (!nextEvent) return 'No upcoming events';
    const dayLabel = daysUntilEvent === 0 ? 'Today' : daysUntilEvent === 1 ? 'Tomorrow' : new Date(nextEvent.start_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const title = nextEvent.title || 'Event';
    const time = nextEvent.start_time ? ` at ${formatTime(nextEvent.start_time)}` : '';
    const opponent = nextEvent.opponent ? ` vs ${nextEvent.opponent}` : '';
    const location = nextEvent.location ? ` -- ${nextEvent.location}` : '';
    return `${title}${opponent}${time}${location} -- ${dayLabel}`;
  }, [nextEvent, daysUntilEvent]);

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
      <div className={`text-xs mt-1 ${eventColor} leading-relaxed`}>
        {eventDisplay}
      </div>
      {nextEvent && yesCount > 0 && (
        <div className="text-xs text-muted-foreground mt-1">
          {yesCount} confirmed{total - yesCount > 0 ? `, ${total - yesCount} pending` : ''}
        </div>
      )}
      {photoCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Camera className="h-3 w-3" />
          <span>{photoCount} photo{photoCount !== 1 ? 's' : ''}</span>
        </div>
      )}
    </div>
  );
}
