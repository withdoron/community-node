import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useActiveRegion, filterBusinessesByRegion } from '@/components/region/useActiveRegion';
import EventCard from '@/components/events/EventCard';
import EventDetailModal from '@/components/events/EventDetailModal';
import SectionWrapper from './SectionWrapper';
import { Loader2 } from 'lucide-react';
import { isFriday, isSaturday, isSunday, isToday } from 'date-fns';

export default function HappeningSoonSection() {
  const [eventFilter, setEventFilter] = useState('all');
  const [expandedEvent, setExpandedEvent] = useState(null);
  const { region } = useActiveRegion();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['mylane-events'],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.filter({ is_active: true }, 'date', 200);
      return allEvents.filter(e => !e.is_deleted && e.status !== 'cancelled');
    }
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ['mylane-businesses-for-events', region?.id],
    queryFn: async () => {
      const list = await base44.entities.Business.filter({ is_active: true }, '-created_date', 200);
      return filterBusinessesByRegion(list, region);
    },
    enabled: !!region
  });

  const regionalBusinessIds = useMemo(
    () => new Set(businesses.map(b => b.id)),
    [businesses]
  );

  const filteredEvents = useMemo(() => {
    const now = new Date();
    let result = events
      .filter(e => new Date(e.date) >= now)
      .filter(e => regionalBusinessIds.has(e.business_id))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 8);

    if (eventFilter === 'weekend') {
      result = result.filter(e => {
        const d = new Date(e.date);
        return isFriday(d) || isSaturday(d) || isSunday(d);
      });
    } else if (eventFilter === 'free') {
      result = result.filter(e => e.is_free === true || e.price === 0 || e.price == null);
    } else if (eventFilter === 'today') {
      result = result.filter(e => isToday(new Date(e.date)));
    }

    return result;
  }, [events, regionalBusinessIds, eventFilter, useRegionFilter]);

  const pillClass = (active) =>
    active
      ? 'bg-amber-500 text-black font-semibold rounded-full px-4 py-1.5 text-sm'
      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600 rounded-full px-4 py-1.5 text-sm cursor-pointer transition-colors';

  return (
    <SectionWrapper title="Happening Soon" seeAllPage="Events">
      <div className="space-y-4">
        <div className="flex overflow-x-auto gap-2 pb-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'weekend', label: 'This Weekend' },
            { id: 'today', label: 'Today' },
            { id: 'free', label: 'Free' }
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setEventFilter(id)}
              className={`snap-start flex-shrink-0 ${pillClass(eventFilter === id)}`}
            >
              {label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
          </div>
        ) : filteredEvents.length === 0 ? (
          <p className="text-slate-400 text-center py-8">
            Your community is getting started — check back soon!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => setExpandedEvent(event)}
              />
            ))}
          </div>
        )}
      </div>

      {expandedEvent && (
        <EventDetailModal
          event={expandedEvent}
          isOpen={!!expandedEvent}
          onClose={() => setExpandedEvent(null)}
        />
      )}
    </SectionWrapper>
  );
}
