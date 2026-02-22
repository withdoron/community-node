import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import SearchBar from '@/components/search/SearchBar';
import FilterBar from '@/components/search/FilterBar';
import SearchResultsSection from '@/components/search/SearchResultsSection';
import { rankBusinesses } from '@/components/business/rankingUtils';
import { useActiveRegion, filterBusinessesByRegion } from '@/components/region/useActiveRegion';
import { Button } from "@/components/ui/button";
import { Loader2, SearchX, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Search() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get('q') || '';
  const initialLocation = urlParams.get('location') || '';
  const initialCategory = urlParams.get('category') || 'all';

  // Get active region for this instance
  const { region, isLoading: regionLoading } = useActiveRegion();

  const [searchParams, setSearchParams] = useState({
    query: initialQuery,
    location: initialLocation
  });
  const [filters, setFilters] = useState({
    category: initialCategory,
    acceptsSilver: false
  });
  const [sortBy, setSortBy] = useState('recommended');

  // Fetch businesses and locations, filtered by region
  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses-with-locations', region?.id],
    queryFn: async () => {
      const businessList = await base44.entities.Business.filter({ is_active: true }, '-created_date', 200);
      return filterBusinessesByRegion(businessList, region);
    },
    enabled: !!region
  });

  // Filter and sort businesses
  const filteredBusinesses = useMemo(() => {
    let result = [...businesses];

    // Text search
    if (searchParams.query) {
      const query = searchParams.query.toLowerCase();
      result = result.filter(b => 
        b.name?.toLowerCase().includes(query) ||
        b.description?.toLowerCase().includes(query) ||
        b.category?.toLowerCase().includes(query) ||
        b.services?.some(s => s.name?.toLowerCase().includes(query))
      );
    }

    // Location search
    if (searchParams.location) {
      const loc = searchParams.location.toLowerCase();
      result = result.filter(b => 
        b.city?.toLowerCase().includes(loc) ||
        b.address?.toLowerCase().includes(loc)
      );
    }

    // Category filter
    if (filters.category && filters.category !== 'all') {
      result = result.filter(b => b.category === filters.category);
    }

    // Accepts silver filter
    if (filters.acceptsSilver) {
      result = result.filter(b => b.accepts_silver);
    }

    // Trust-based default ranking; then apply user's sort preference if set
    result = rankBusinesses(result);

    if (sortBy !== 'recommended') {
      result.sort((a, b) => {
        switch (sortBy) {
          case 'price_low': {
            const aMin = a.services?.length ? Math.min(...a.services.map(s => s.starting_price || Infinity)) : Infinity;
            const bMin = b.services?.length ? Math.min(...b.services.map(s => s.starting_price || Infinity)) : Infinity;
            return aMin - bMin;
          }
          case 'price_high': {
            const aMax = a.services?.length ? Math.max(...a.services.map(s => s.starting_price || 0)) : 0;
            const bMax = b.services?.length ? Math.max(...b.services.map(s => s.starting_price || 0)) : 0;
            return bMax - aMax;
          }
          case 'newest':
            return new Date(b.created_date) - new Date(a.created_date);
          default:
            return 0;
        }
      });
    }

    return result;
  }, [businesses, searchParams, filters, sortBy]);

  const handleSearch = ({ query, location }) => {
    setSearchParams({ query, location });
    // Update URL
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (location) params.set('location', location);
    if (filters.category !== 'all') params.set('category', filters.category);
    window.history.replaceState({}, '', `?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Search Header */}
      <div className="bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <SearchBar 
            onSearch={handleSearch}
            initialQuery={searchParams.query}
            initialLocation={searchParams.location}
          />
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Region indicator */}
        {region && (
          <div className="flex items-center gap-2 mb-4 text-sm text-slate-500">
            <MapPin className="h-4 w-4" />
            <span>Searching in <span className="font-medium text-slate-300">{region.display_name}</span></span>
            <Badge variant="outline" className="text-xs">{region.default_radius_miles} mi radius</Badge>
          </div>
        )}
        
        <FilterBar
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          onSortChange={setSortBy}
          resultCount={filteredBusinesses.length}
        />

        {isLoading || regionLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="text-center py-20">
            <SearchX className="h-12 w-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-200">No businesses found</h3>
            <p className="text-slate-400 mt-2">
              Try adjusting your search or filters, or check back soon — we&apos;re growing.
            </p>
            <Button 
              variant="outline" 
              className="mt-4 border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500"
              onClick={() => {
                setSearchParams({ query: '', location: '' });
                setFilters({ category: 'all', acceptsSilver: false });
              }}
            >
              Clear all filters
            </Button>
          </div>
        ) : (
          <div className="mt-6">
            <SearchResultsSection results={filteredBusinesses} />
          </div>
        )}
      </div>
    </div>
  );
}