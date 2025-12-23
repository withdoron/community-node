import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EventCard from '@/components/events/EventCard';
import FilterModal from '@/components/events/FilterModal';
import { Search, SlidersHorizontal, Map, List, Loader2 } from "lucide-react";
import { isToday, isThisWeek, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns';

const DUMMY_EVENTS = [
  {
    id: '1',
    title: 'Eugene Saturday Market',
    date: '2025-06-15T10:00:00',
    location: '8th & Oak, Eugene',
    category: 'community',
    lat: 44.0521,
    lng: -123.0868,
    thumbnail_url: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&q=80',
    is_trusted: true,
    accepts_silver: true,
    setting: 'outdoor',
    audience: ['family', 'all_ages'],
    price: 0,
    is_volunteer: false,
    is_active: true
  },
  {
    id: '2',
    title: 'Silver Stacking Workshop',
    date: '2025-06-16T18:00:00',
    location: 'Springfield Library',
    category: 'education',
    lat: 44.0462,
    lng: -123.0220,
    thumbnail_url: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80',
    is_trusted: true,
    accepts_silver: false,
    setting: 'indoor',
    audience: ['adults'],
    price: 10,
    is_volunteer: false,
    is_active: true
  },
  {
    id: '3',
    title: 'River Road Community Garden',
    date: '2025-06-17T09:00:00',
    location: 'River Road',
    category: 'community',
    lat: 44.0935,
    lng: -123.1465,
    thumbnail_url: 'https://images.unsplash.com/photo-1592419044706-39796d40f98c?auto=format&fit=crop&q=80',
    is_trusted: false,
    accepts_silver: false,
    setting: 'outdoor',
    audience: ['family', 'all_ages'],
    price: 0,
    is_volunteer: true,
    is_active: true
  },
  {
    id: '4',
    title: 'Local Music Night',
    date: '2025-06-18T19:00:00',
    location: 'Whirled Pies',
    category: 'social',
    lat: 44.0487,
    lng: -123.0956,
    thumbnail_url: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?auto=format&fit=crop&q=80',
    is_trusted: true,
    accepts_silver: true,
    setting: 'indoor',
    audience: ['adults'],
    price: 5,
    is_volunteer: false,
    is_active: true
  }
];

export default function Events() {
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [showMap, setShowMap] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    priceRange: [0, 100],
    audience: [],
    setting: [],
    acceptsSilver: false,
    isVolunteer: false
  });

  // Use dummy data for now
  const events = DUMMY_EVENTS;
  const isLoading = false;

  const filteredEvents = useMemo(() => {
    let result = [...events];
    const now = new Date();

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

    if (advancedFilters.audience?.length > 0) {
      result = result.filter(e => 
        e.audience?.some(a => advancedFilters.audience.includes(a))
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

    if (advancedFilters.isVolunteer) {
      result = result.filter(e => e.is_volunteer);
    }

    // Filter out past events
    result = result.filter(e => new Date(e.date) >= now);

    return result;
  }, [events, searchQuery, quickFilter, advancedFilters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (advancedFilters.priceRange[1] < 100) count++;
    if (advancedFilters.audience?.length > 0) count += advancedFilters.audience.length;
    if (advancedFilters.setting?.length > 0) count += advancedFilters.setting.length;
    if (advancedFilters.acceptsSilver) count++;
    if (advancedFilters.isVolunteer) count++;
    return count;
  }, [advancedFilters]);

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="grid grid-cols-1 lg:grid-cols-5 h-screen">
        {/* List Section */}
        <div className={`${showMap ? 'hidden' : 'flex'} lg:flex lg:col-span-2 flex-col border-r border-slate-700 overflow-hidden`}>
          {/* Sticky Header */}
          <div className="flex-shrink-0 bg-slate-900 border-b border-slate-700 p-4 space-y-4">
            {/* Title & View Toggle */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-white">Events</h1>
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
                onClick={() => setShowMap(!showMap)}
              >
                {showMap ? (
                  <>
                    <List className="h-4 w-4 mr-2" />
                    List
                  </>
                ) : (
                  <>
                    <Map className="h-4 w-4 mr-2" />
                    Map
                  </>
                )}
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500"
              />
            </div>

            {/* Quick Filters & Advanced Button */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={quickFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuickFilter('all')}
                className={quickFilter === 'all' 
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold' 
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }
              >
                All
              </Button>
              <Button
                variant={quickFilter === 'weekend' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuickFilter('weekend')}
                className={quickFilter === 'weekend'
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }
              >
                This Weekend
              </Button>
              <Button
                variant={quickFilter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuickFilter('today')}
                className={quickFilter === 'today'
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterModalOpen(true)}
                className="ml-auto bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 relative"
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

            {/* Results Count */}
            <div className="text-sm text-slate-400">
              {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'} found
            </div>
          </div>

          {/* Events List */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-slate-400">No events found</p>
                <p className="text-sm text-slate-500 mt-2">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} event={event} onClick={() => {}} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map Section */}
        <div className={`${showMap ? 'flex' : 'hidden'} lg:flex lg:col-span-3 bg-slate-800 sticky top-0 h-screen`}>
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-slate-400">
              <Map className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">Map View</p>
              <p className="text-sm mt-2">Interactive map coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      <FilterModal
        open={filterModalOpen}
        onOpenChange={setFilterModalOpen}
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
      />
    </div>
  );
}