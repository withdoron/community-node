import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import EventCard from '@/components/events/EventCard';
import EventDetailModal from '@/components/events/EventDetailModal';
import FilterModal from '@/components/events/FilterModal';
import { Search, SlidersHorizontal, Map, List, Loader2 } from "lucide-react";
import { isToday, isThisWeek, startOfDay, endOfDay, startOfWeek, endOfWeek, format } from 'date-fns';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';

const DUMMY_EVENTS = [
  {
    id: '1',
    title: 'Eugene Saturday Market',
    date: '2026-01-10T10:00:00Z',
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
    is_active: true,
    featured: true
  },
  {
    id: '2',
    title: 'Silver Stacking Workshop',
    date: '2026-01-12T18:00:00Z',
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
    is_active: true,
    featured: false
  },
  {
    id: '3',
    title: 'River Road Community Garden',
    date: '2026-01-15T09:00:00Z',
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
    is_active: true,
    featured: true
  },
  {
    id: '4',
    title: 'Local Music Night',
    date: '2026-01-18T19:00:00Z',
    location: 'Whirled Pies',
    category: 'social',
    lat: 44.0487,
    lng: -123.0956,
    thumbnail_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80',
    is_trusted: true,
    accepts_silver: true,
    setting: 'indoor',
    audience: ['adults'],
    price: 5,
    is_volunteer: false,
    is_active: true,
    featured: false
  }
];

// Custom gold dot marker icon
const goldDotIcon = L.divIcon({
  className: 'custom-marker',
  html: '<div class="bg-amber-500 rounded-full border-2 border-white shadow-lg w-4 h-4"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -8]
});

export default function Events() {
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [showMap, setShowMap] = useState(false);
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
      return allEvents;
    }
  });

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

    // Filter out past events
    result = result.filter(e => new Date(e.date) >= now);

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
                className="lg:hidden bg-slate-800 hover:bg-slate-800 border-slate-700 text-white hover:border-amber-500 hover:text-amber-500 transition-colors"
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
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter('all')}
                className={quickFilter === 'all' 
                  ? 'bg-slate-800 hover:bg-slate-800 border-amber-500 text-amber-500 font-semibold' 
                  : 'bg-slate-800 hover:bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-colors'
                }
              >
                All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter('weekend')}
                className={quickFilter === 'weekend'
                  ? 'bg-slate-800 hover:bg-slate-800 border-amber-500 text-amber-500 font-semibold'
                  : 'bg-slate-800 hover:bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-colors'
                }
              >
                This Weekend
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuickFilter('today')}
                className={quickFilter === 'today'
                  ? 'bg-slate-800 hover:bg-slate-800 border-amber-500 text-amber-500 font-semibold'
                  : 'bg-slate-800 hover:bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-colors'
                }
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterModalOpen(true)}
                className="ml-auto bg-slate-800 hover:bg-slate-800 border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-colors relative"
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
                {filteredEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <EventCard 
                      event={event} 
                      onClick={() => setExpandedEventId(event.id)} 
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <EventDetailModal
            event={filteredEvents.find(e => e.id === expandedEventId)}
            isOpen={!!expandedEventId}
            onClose={() => setExpandedEventId(null)}
          />
        </div>

        {/* Map Section */}
        <div className={`${showMap ? 'flex' : 'hidden'} lg:flex lg:col-span-3 bg-slate-800 sticky top-0 h-screen`}>
          <div className="h-full min-h-[500px] w-full relative">
            <MapContainer
              key={showMap ? 'mobile' : 'desktop'}
              center={[44.0521, -123.0868]}
              zoom={13}
              className="h-full w-full z-0"
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
              {filteredEvents.map((event) => (
                event.lat && event.lng && (
                  <Marker
                    key={event.id}
                    position={[event.lat, event.lng]}
                    icon={goldDotIcon}
                  >
                    <Popup className="rounded-lg shadow-xl">
                      <div className="min-w-[200px] p-1">
                        {event.thumbnail_url && (
                          <div className="h-24 w-full relative mb-2 rounded-md overflow-hidden">
                            <img 
                              src={event.thumbnail_url} 
                              alt={event.title} 
                              className="object-cover w-full h-full"
                            />
                            {(!event.price || event.price === 0) && (
                              <span className="absolute top-1 right-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                FREE
                              </span>
                            )}
                          </div>
                        )}
                        <h3 className="font-bold text-sm text-slate-900 leading-tight mb-1">{event.title}</h3>
                        <p className="text-xs text-slate-600 flex items-center gap-1">
                          📅 {format(new Date(event.date), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>

            {/* Mobile Toggle Button - Only shows when Map is active on mobile */}
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-[1000] lg:hidden">
              <Button
                onClick={() => setShowMap(false)}
                className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-lg font-semibold flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <List className="w-5 h-5" />
                Show List
              </Button>
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