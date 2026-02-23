import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useCategories } from '@/hooks/useCategories';
import BusinessCard from '@/components/business/BusinessCard';
import { rankBusinesses } from '@/components/business/rankingUtils';
import { useActiveRegion, filterBusinessesByRegion } from '@/components/region/useActiveRegion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Loader2, SearchX, Coins } from "lucide-react";

export default function Directory() {
  const navigate = useNavigate();
  const { mainCategories, getMainCategory, getSubcategoryLabel, legacyCategoryMapping } = useCategories();
  const { region, isLoading: regionLoading } = useActiveRegion();

  // Read initial state from URL
  const urlParams = new URLSearchParams(window.location.search);
  const [searchInput, setSearchInput] = useState(urlParams.get('q') || '');
  const [searchQuery, setSearchQuery] = useState(urlParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(urlParams.get('cat') || 'all');
  const [acceptsJoyCoins, setAcceptsJoyCoins] = useState(urlParams.get('joycoins') === '1');
  const [sortBy, setSortBy] = useState(urlParams.get('sort') || 'recommended');

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategory !== 'all') params.set('cat', selectedCategory);
    if (acceptsJoyCoins) params.set('joycoins', '1');
    if (sortBy !== 'recommended') params.set('sort', sortBy);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', url);
  }, [searchQuery, selectedCategory, acceptsJoyCoins, sortBy]);

  // Fetch admin settings for badge visibility
  const { data: savedSettings = [] } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => base44.entities.AdminSettings.list()
  });

  const badgeSettings = useMemo(() => {
    if (savedSettings.length === 0) return null;
    const obj = {};
    savedSettings.forEach((s) => {
      try {
        obj[s.key] = JSON.parse(s.value);
      } catch {
        obj[s.key] = s.value;
      }
    });
    return {
      show_accepts_silver_badge: obj.show_accepts_silver_badge !== false,
      show_locally_owned_franchise_badge: obj.show_locally_owned_franchise_badge !== false
    };
  }, [savedSettings]);

  // Fetch businesses filtered by region
  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['directory-businesses', region?.id],
    queryFn: async () => {
      const list = await base44.entities.Business.filter({ is_active: true }, '-created_date', 200);
      return filterBusinessesByRegion(list, region);
    },
    enabled: !!region
  });

  // Filter and sort
  const filteredBusinesses = useMemo(() => {
    let result = [...businesses];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => {
        if (b.name?.toLowerCase().includes(q)) return true;
        if (b.description?.toLowerCase().includes(q)) return true;
        const mainCat = getMainCategory(b.main_category);
        if (mainCat?.label?.toLowerCase().includes(q)) return true;
        if (b.subcategories?.some(subId => {
          const label = getSubcategoryLabel(b.main_category, subId);
          return label?.toLowerCase().includes(q);
        })) return true;
        if (b.services?.some(s => s.name?.toLowerCase().includes(q))) return true;
        return false;
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(b => {
        if (b.main_category === selectedCategory) return true;
        if (b.category && legacyCategoryMapping[b.category]) {
          return legacyCategoryMapping[b.category].main === selectedCategory;
        }
        return false;
      });
    }

    // Joy Coins filter
    if (acceptsJoyCoins) {
      result = result.filter(b => b.accepts_joy_coins);
    }

    // Trust-based default sort
    result = rankBusinesses(result);

    // Re-sort by user preference if not recommended
    if (sortBy !== 'recommended') {
      result.sort((a, b) => {
        switch (sortBy) {
          case 'newest':
            return new Date(b.created_date || 0) - new Date(a.created_date || 0);
          case 'alpha':
            return (a.name || '').localeCompare(b.name || '');
          default:
            return 0;
        }
      });
    }

    return result;
  }, [businesses, searchQuery, selectedCategory, acceptsJoyCoins, sortBy]);

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setSelectedCategory('all');
    setAcceptsJoyCoins(false);
    setSortBy('recommended');
  };

  const handleCategoryTileClick = (categoryId) => {
    navigate(createPageUrl(`CategoryPage?id=${categoryId}`));
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Directory</h1>
          <p className="text-slate-400 mt-1">Find trusted local businesses in your community</p>
          {region && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-1">
              <MapPin className="h-3 w-3" />
              {region.display_name || region.name}
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Search businesses, services, categories..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-12 pl-11 text-base bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:border-amber-500 focus:ring-amber-500 rounded-xl w-full"
          />
        </div>

        {/* Quick filter chips */}
        <div
          className="flex items-center gap-2 overflow-x-auto pb-2 mt-4 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none' }}
        >
          <button
            onClick={() => setSelectedCategory('all')}
            className={selectedCategory === 'all'
              ? 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-500 text-black border border-amber-500 cursor-default whitespace-nowrap flex-shrink-0'
              : 'px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500 hover:text-amber-500 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0'
            }
          >
            All
          </button>
          {mainCategories.map((category) => {
            const isActive = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={isActive
                  ? 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-500 text-black border border-amber-500 cursor-default whitespace-nowrap flex-shrink-0'
                  : 'px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500 hover:text-amber-500 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0'
                }
              >
                {category.label}
              </button>
            );
          })}
          <div className="w-px h-6 bg-slate-700 flex-shrink-0" />
          <button
            onClick={() => setAcceptsJoyCoins(!acceptsJoyCoins)}
            className={acceptsJoyCoins
              ? 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-500/20 text-amber-500 border border-amber-500/50 cursor-default whitespace-nowrap flex-shrink-0 flex items-center gap-1.5'
              : 'px-3 py-1.5 rounded-lg text-sm bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500 hover:text-amber-500 transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 flex items-center gap-1.5'
            }
          >
            <Coins className="h-3.5 w-3.5" />
            Joy Coins
          </button>
        </div>

        {/* Results header */}
        <div className="flex items-center justify-between mt-4 mb-4">
          <span className="text-sm text-slate-400">
            {filteredBusinesses.length} {filteredBusinesses.length === 1 ? 'business' : 'businesses'}
          </span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-9 bg-slate-800 border-slate-700 text-slate-300 text-sm">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 border-slate-700">
              <SelectItem value="recommended" className="text-slate-300 focus:bg-slate-800 focus:text-white">
                Recommended
              </SelectItem>
              <SelectItem value="newest" className="text-slate-300 focus:bg-slate-800 focus:text-white">
                Newest
              </SelectItem>
              <SelectItem value="alpha" className="text-slate-300 focus:bg-slate-800 focus:text-white">
                A-Z
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Business grid */}
        <div className="min-h-[200px]">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-xl">
              <SearchX className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">No businesses found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters, or check back soon — we&apos;re growing.</p>
              <button
                onClick={handleClearFilters}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500 hover:text-amber-500 transition-colors"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredBusinesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  badgeSettings={badgeSettings}
                />
              ))}
            </div>
          )}
        </div>

        {/* Browse by Category */}
        <section className="mt-16 border-t border-slate-800 pt-12">
          <h2 className="text-xl font-bold text-slate-100">Browse by Category</h2>
          <p className="text-slate-400 mt-1 mb-6">Explore all {mainCategories.length} categories</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {mainCategories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryTileClick(category.id)}
                  className="p-3 rounded-lg border border-slate-800 bg-slate-900 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all text-left group flex items-start gap-2.5"
                >
                  <Icon className="h-5 w-5 text-slate-400 group-hover:text-amber-500 transition-colors flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{category.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
