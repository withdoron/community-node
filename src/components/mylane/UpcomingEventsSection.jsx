import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import SectionWrapper from './SectionWrapper';
import EventCard from '@/components/events/EventCard';
import EventDetailModal from '@/components/events/EventDetailModal';
import { Calendar } from 'lucide-react';

export default function UpcomingEventsSection({ currentUser }) {
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Query user's active RSVPs
  const { data: rsvps = [], isSuccess: rsvpsLoaded } = useQuery({
    queryKey: ['user-rsvps', currentUser?.id],
    queryFn: () => base44.entities.RSVP.filter({ user_id: currentUser.id, is_active: true }),
    enabled: !!currentUser?.id
  });

  // Query all active events — enabled when RSVPs have loaded AND found results
  const { data: allEvents = [] } = useQuery({
    queryKey: ['all-events-for-rsvp'],
    queryFn: () => base44.entities.Event.filter({ is_active: true }, 'start_date', 200),
    enabled: rsvpsLoaded && rsvps.length > 0
  });

  // Match RSVPs to events and filter to upcoming only
  const upcomingEvents = useMemo(() => {
    if (!rsvps.length || !allEvents.length) return [];
    const rsvpEventIds = new Set(rsvps.map(r => String(r.event_id)));
    const now = new Date();
    return allEvents
      .filter(e => rsvpEventIds.has(String(e.id)))
      .filter(e => new Date(e.start_date || e.date) > now)
      .filter(e => e.status !== 'cancelled')
      .sort((a, b) => new Date(a.start_date || a.date) - new Date(b.start_date || b.date))
      .slice(0, 4);
  }, [rsvps, allEvents]);

  if (upcomingEvents.length === 0) {
    return (
      <SectionWrapper title="Your Upcoming Events" seeAllPage="Events">
        <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-xl">
          <Calendar className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">No upcoming events</p>
          <p className="text-sm text-slate-500 mt-1">Browse events and RSVP to see them here.</p>
          <Link
            to={createPageUrl('Events')}
            className="mt-4 inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
          >
            Browse events
            <span aria-hidden>→</span>
          </Link>
        </div>
        <EventDetailModal event={selectedEvent} isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} />
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper title="Your Upcoming Events" seeAllPage="Events">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {upcomingEvents.map(event => (
          <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
        ))}
      </div>
      <EventDetailModal event={selectedEvent} isOpen={!!selectedEvent} onClose={() => setSelectedEvent(null)} />
    </SectionWrapper>
  );
}
