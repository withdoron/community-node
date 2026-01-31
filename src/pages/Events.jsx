import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EventCard from '@/components/events/EventCard';
import EventDetailModal from '@/components/events/EventDetailModal';
import FilterModal from '@/components/events/FilterModal';
import { Search, SlidersHorizontal, Loader2 } from "lucide-react";
import { isToday } from 'date-fns';

export default function Events() {
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
    acceptsSilver: false,
    wheelchairAccessible: false,
    freeParking: false
  });

  // Fetch real events from database
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const allEvents = await base44.entities.Event.filter({ is_active: true }, '-date', 200);
      const filtered = allEvents.filter(e => !e.is_deleted);
      console.log('Fetched events:', filtered);
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

    if (advancedFilters.acceptsSilver) {
      result = result.filter(e => e.accepts_silver);
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

    return result;
  }, [events, searchQuery, quickFilter, advancedFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.priceRange[1] < 100) count++;
    if (advancedFilters.eventType?.length > 0) count += advancedFilters.eventType.length;
    if (advancedFilters.networks?.length > 0) count += advancedFilters.networks.length;
    if (advancedFilters.audience?.length > 0) count += advancedFilters.audience.length;
    if (advancedFilters.setting?.length > 0) count += advancedFilters.setting.length;
    if (advancedFilters.acceptsSilver) count++;
    if (advancedFilters.wheelchairAccessible) count++;
    if (advancedFilters.freeParking) count++;
    return count;
  }, [advancedFilters]);

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Events</h1>
          <p className="text-slate-400 mt-1">Discover what&apos;s happening in your community</p>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500 w-full"
          />
        </div>

        {/* Quick filter chips + Filters button */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <button
            onClick={() => setQuickFilter('all')}
            className={quickFilter === 'all'
              ? 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-500 text-black border border-amber-500 cursor-default'
              : 'px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500 hover:text-amber-500 transition-colors cursor-pointer'
            }
          >
            All
          </button>
          <button
            onClick={() => setQuickFilter('weekend')}
            className={quickFilter === 'weekend'
              ? 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-500 text-black border border-amber-500 cursor-default'
              : 'px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500 hover:text-amber-500 transition-colors cursor-pointer'
            }
          >
            This Weekend
          </button>
          <button
            onClick={() => setQuickFilter('today')}
            className={quickFilter === 'today'
              ? 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-500 text-black border border-amber-500 cursor-default'
              : 'px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500 hover:text-amber-500 transition-colors cursor-pointer'
            }
          >
            Today
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterModalOpen(true)}
            className="ml-auto bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-colors relative"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {activeFilterCount > 0 && (
              <Badge className="ml-2 bg-amber-500 text-slate-900 text-xs px-1.5 py-0">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Results count */}
        <div className="text-sm text-slate-400 mb-4">
          {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
        </div>

        {/* Event grid */}
        <div className="min-h-[200px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-xl">
              <p className="text-slate-400">No events found</p>
              <p className="text-sm text-slate-500 mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => setExpandedEventId(event.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <EventDetailModal
        event={filteredEvents.find(e => e.id === expandedEventId)}
        isOpen={!!expandedEventId}
        onClose={() => setExpandedEventId(null)}
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
