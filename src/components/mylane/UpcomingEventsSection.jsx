import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import SectionWrapper from './SectionWrapper';
import EventCard from '@/components/events/EventCard';
import EventDetailModal from '@/components/events/EventDetailModal';

export default function UpcomingEventsSection({ currentUser }) {
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: rsvps = [] } = useQuery({
    queryKey: ['user-rsvps', currentUser?.id],
    queryFn: () => base44.entities.RSVP.filter({ user_id: currentUser.id, is_active: true }),
    enabled: !!currentUser?.id
  });

  const { data: allEvents = [] } = useQuery({
    queryKey: ['all-events-for-rsvp'],
    queryFn: () => base44.entities.Event.filter({ is_active: true }, 'date', 200),
    enabled: rsvps.length > 0
  });

  const upcomingEvents = useMemo(() => {
    if (!rsvps.length || !allEvents.length) return [];
    const rsvpEventIds = new Set(rsvps.map(r => r.event_id));
    const now = new Date();
    return allEvents
      .filter(e => !e.is_deleted)
      .filter(e => rsvpEventIds.has(e.id))
      .filter(e => new Date(e.date || e.start_date) > now)
      .filter(e => e.status !== 'cancelled')
      .sort((a, b) => new Date(a.date || a.start_date) - new Date(b.date || b.start_date))
      .slice(0, 4);
  }, [rsvps, allEvents]);

  if (upcomingEvents.length === 0) return null;

  return (
    <SectionWrapper title="Your Upcoming Events" seeAllPage="Events">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {upcomingEvents.map(event => (
          <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
        ))}
      </div>
      <EventDetailModal event={selectedEvent} isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} />
    </SectionWrapper>
  );
}
