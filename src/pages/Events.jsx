import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EventCard from '@/components/events/EventCard';
import EventDetailModal from '@/components/events/EventDetailModal';
import FilterModal from '@/components/events/FilterModal';
import { useRole } from '@/hooks/useRole';
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { isToday } from 'date-fns';
import { toast } from 'sonner';

function groupRecurringEvents(events) {
  const groups = {};
  events.forEach((event) => {
    const key = (event.title || '').trim().toLowerCase();
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
  });
  return Object.values(groups).map((group) => {
    group.sort((a, b) => new Date(a.date) - new Date(b.date));
    const displayEvent = { ...group[0] };
    displayEvent._groupedDates = group.slice(1).map((e) => e.date);
    displayEvent._groupedEvents = group.slice(1);
    displayEvent._groupSize = group.length;
    return displayEvent;
  });
}

export default function Events() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState(null);
  const [advancedFilters, setAdvancedFilters] = useState({
    priceRange: [0, 100],
    eventType: [],
    networks: [],
    audience: [],
    setting: [],
    acceptsJoyCoins: false,
    wheelchairAccessible: false,
    freeParking: false
  });

  const { isAppAdmin } = useRole();
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    },
  });

  // Fetch real events from database
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.filter({ is_active: true }, '-date', 200);
      const filtered = allEvents.filter(e => !e.is_deleted);
      return filtered;
    }
  });

  const filteredEvents = useMemo(() => {
    let result = [...events];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.title?.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.location?.toLowerCase().includes(query)
      );
    }

    // Quick filter
    if (quickFilter === 'today') {
      result = result.filter(e => isToday(new Date(e.date)));
    } else if (quickFilter === 'weekend') {
      const weekend = [5, 6, 0]; // Fri, Sat, Sun
      result = result.filter(e => weekend.includes(new Date(e.date).getDay()));
    }

    // Advanced filters
    if (advancedFilters.priceRange[1] < 100) {
      result = result.filter(e => (e.price || 0) <= advancedFilters.priceRange[1]);
    }

    if (advancedFilters.eventType?.length > 0) {
      result = result.filter(e =>
        e.event_type && advancedFilters.eventType.includes(e.event_type)
      );
    }

    if (advancedFilters.networks?.length > 0) {
      result = result.filter(e =>
        e.network && advancedFilters.networks.includes(e.network)
      );
    }

    if (advancedFilters.audience?.length > 0) {
      result = result.filter(e =>
        e.audience_tags && e.audience_tags.some(a => advancedFilters.audience.includes(a))
      );
    }

    if (advancedFilters.setting?.length > 0) {
      result = result.filter(e =>
        advancedFilters.setting.includes(e.setting)
      );
    }

    if (advancedFilters.acceptsJoyCoins) {
      result = result.filter(e => e.joy_coin_enabled);
    }

    if (advancedFilters.wheelchairAccessible) {
      result = result.filter(e => e.wheelchair_accessible);
    }

    if (advancedFilters.freeParking) {
      result = result.filter(e => e.free_parking);
    }

    // Filter out past events (compare dates only, ignore time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    result = result.filter(e => {
      const eventDate = new Date(e.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate >= today;
    });

    // Network-only events: only show if user follows the network (or is admin)
    const networkInterests = currentUser?.data?.network_interests ?? [];
    result = result.filter(e => {
      if (!e.network_only) return true;
      if (isAppAdmin) return true;
      if (!currentUser) return false;
      return Array.isArray(networkInterests) && networkInterests.includes(e.network);
    });

    // Sort soonest upcoming first (date ascending)
    result.sort((a, b) => new Date(a.date) - new Date(b.date));
    return result;
  }, [events, searchQuery, quickFilter, advancedFilters, currentUser, isAppAdmin]);

  const groupedEvents = useMemo(() => {
    const grouped = groupRecurringEvents(filteredEvents);
    grouped.sort((a, b) => new Date(a.date) - new Date(b.date));
    return grouped;
  }, [filteredEvents]);

  // URL-driven modal: open event from /Events/:eventId deep link
  useEffect(() => {
    if (!eventId || events.length === 0) return;
    // Search full unfiltered events list (event may not match current filters)
    const target = events.find((e) => e.id === eventId);
    if (target) {
      setExpandedEventId(target.id);
    } else {
      toast.error('Event not found');
      navigate('/Events', { replace: true });
    }
  }, [eventId, events, navigate]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.priceRange[1] < 100) count++;
    if (advancedFilters.eventType?.length > 0) count += advancedFilters.eventType.length;
    if (advancedFilters.networks?.length > 0) count += advancedFilters.networks.length;
    if (advancedFilters.audience?.length > 0) count += advancedFilters.audience.length;
    if (advancedFilters.setting?.length > 0) count += advancedFilters.setting.length;
    if (advancedFilters.acceptsJoyCoins) count++;
    if (advancedFilters.wheelchairAccessible) count++;
    if (advancedFilters.freeParking) count++;
    return count;
  }, [advancedFilters]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground mt-1">Discover what&apos;s happening in your community</p>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:ring-ring w-full"
          />
        </div>

        {/* Quick filter chips + Filters button */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <button
            onClick={() => setQuickFilter('all')}
            className={quickFilter === 'all'
              ? 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground border border-primary cursor-default'
              : 'px-3 py-1.5 rounded-lg text-sm bg-secondary text-foreground-soft border border-border hover:border-primary hover:text-primary transition-colors cursor-pointer'
            }
          >
            All
          </button>
          <button
            onClick={() => setQuickFilter('weekend')}
            className={quickFilter === 'weekend'
              ? 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground border border-primary cursor-default'
              : 'px-3 py-1.5 rounded-lg text-sm bg-secondary text-foreground-soft border border-border hover:border-primary hover:text-primary transition-colors cursor-pointer'
            }
          >
            This Weekend
          </button>
          <button
            onClick={() => setQuickFilter('today')}
            className={quickFilter === 'today'
              ? 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground border border-primary cursor-default'
              : 'px-3 py-1.5 rounded-lg text-sm bg-secondary text-foreground-soft border border-border hover:border-primary hover:text-primary transition-colors cursor-pointer'
            }
          >
            Today
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterModalOpen(true)}
            className="ml-auto bg-secondary border-border text-foreground-soft hover:border-primary hover:text-primary transition-colors relative"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Results count — ungrouped count; note when grouping reduced cards */}
        <div className="text-sm text-muted-foreground mb-4">
          {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
          {groupedEvents.length < filteredEvents.length && (
            <span className="text-muted-foreground/70"> (grouped)</span>
          )}
        </div>

        {/* Event grid */}
        <div className="min-h-[200px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border rounded-xl">
              <p className="text-foreground-soft font-medium">No events found</p>
              <p className="text-sm text-muted-foreground/70 mt-2">Try adjusting your filters, or check back later — new events are added regularly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={(clickedEvent) => {
                    const targetId = (clickedEvent || event).id;
                    setExpandedEventId(targetId);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <EventDetailModal
        event={events.find(e => e.id === expandedEventId) || filteredEvents.find(e => e.id === expandedEventId)}
        isOpen={!!expandedEventId}
        onClose={() => {
          setExpandedEventId(null);
        }}
      />

      <FilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
      />
    </div>
  );
}
