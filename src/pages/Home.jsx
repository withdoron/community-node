import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import SearchBar from '@/components/search/SearchBar';
import BusinessCard from '@/components/business/BusinessCard';
import FeaturedNearbySection from '@/components/featured/FeaturedNearbySection';
import { getFeaturedAndOrganicLocations } from '@/components/featured/featuredLocationsUtils';
import { rankBusinesses, isBoostActive } from '@/components/business/rankingUtils';
import { useActiveRegion, filterBusinessesByRegion, filterLocationsByRegion } from '@/components/region/useActiveRegion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Shield, Users, Ban, Coins, Calendar, Store } from "lucide-react";
import { mainCategories, defaultPopularCategoryIds } from '@/components/categories/categoryData';
import TextTransition, { presets } from 'react-text-transition';
import { motion } from 'framer-motion';

const TEXTS = [
  "Businesses",
  "Community Groups",
  "Family Activities",
  "Local Trades",
  "Outings",
  "Service Projects"
];

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Get active region for this instance
  const { region, isLoading: regionLoading } = useActiveRegion();

  // User location state - defaults to region center
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);

  // Text transition for hero
  const [textIndex, setTextIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTextIndex((index) => (index + 1) % TEXTS.length);
    }, 3000);
    return () => clearInterval(intervalId);
  }, []);

  // Default to region center - fixed 30 mile radius for now
  useEffect(() => {
    if (!region) return;
    
    // Use region center for all users
    setUserLat(region.center_lat);
    setUserLng(region.center_lng);
  }, [region]);

  const { data: categoryClicks = [] } = useQuery({
    queryKey: ['categoryClicks'],
    queryFn: () => base44.entities.CategoryClick.list('-click_count', 100)
  });

  const trackClick = useMutation({
    mutationFn: async (categoryId) => {
      const existing = categoryClicks.find(c => c.category === categoryId);
      if (existing) {
        await base44.entities.CategoryClick.update(existing.id, { 
          click_count: (existing.click_count || 0) + 1 
        });
      } else {
        await base44.entities.CategoryClick.create({ category: categoryId, click_count: 1 });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categoryClicks'] })
  });

  // Fetch all businesses and locations for Featured nearby logic
  // Filter by region to keep content local
  const { data: allBusinesses = [] } = useQuery({
    queryKey: ['all-businesses', region?.id],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter({ is_active: true }, '-average_rating', 200);
      return filterBusinessesByRegion(businesses, region);
    },
    enabled: !!region
  });

  const { data: allLocations = [] } = useQuery({
    queryKey: ['all-locations', region?.id],
    queryFn: async () => {
      const locations = await base44.entities.Location.list('-created_date', 500);
      return filterLocationsByRegion(locations, region);
    },
    enabled: !!region
  });

  // Compute featured and organic lists - memoized to prevent recalculations
  // Fixed 30 mile radius around Eugene region center
  const featuredData = React.useMemo(() => {
    if (!userLat || !userLng || allBusinesses.length === 0) {
      return { featured: [], organic: [] };
    }
    return getFeaturedAndOrganicLocations(allBusinesses, allLocations, userLat, userLng, 30);
  }, [userLat, userLng, allBusinesses, allLocations]);

  // Top Rated Businesses - filtered by region
  const { data: featuredBusinesses = [], isLoading } = useQuery({
    queryKey: ['featured-businesses', region?.id],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter(
        { is_active: true },
        '-average_rating',
        50
      );
      // Filter by region, then rank and take top 6
      const regionalBusinesses = filterBusinessesByRegion(businesses, region);
      return rankBusinesses(regionalBusinesses).slice(0, 6);
    },
    enabled: !!region
  });

  const handleSearch = ({ query, location }) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (location) params.set('location', location);
    navigate(createPageUrl(`Search?${params.toString()}`));
  };

  const handleCategoryClick = (categoryId) => {
    trackClick.mutate(categoryId);
    navigate(createPageUrl(`CategoryPage?id=${categoryId}`));
  };

  const popularCategories = [...mainCategories]
    .filter(c => defaultPopularCategoryIds.includes(c.id))
    .sort((a, b) => {
      const aClicks = categoryClicks.find(c => c.category === a.id)?.click_count || 0;
      const bClicks = categoryClicks.find(c => c.category === b.id)?.click_count || 0;
      if (aClicks !== bClicks) return bClicks - aClicks;
      return defaultPopularCategoryIds.indexOf(a.id) - defaultPopularCategoryIds.indexOf(b.id);
    }).slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-amber-400 rounded-full blur-[120px]" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500 rounded-full blur-[150px]" />
        </div>
        
        <div className="relative max-w-6xl mx-auto px-4 py-20 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="mb-6 bg-white/10 text-white border-white/20 hover:bg-white/20">
              <Shield className="h-3 w-3 mr-1" />
              Ad‑Free • Trusted • Local
            </Badge>
            <h1 className="text-white tracking-tight leading-tight text-center px-4">
              <span className="block text-3xl sm:text-4xl font-semibold mb-3">Find trusted</span>
              <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold my-4 break-words">
                <TextTransition springConfig={presets.wobbly} inline className="text-amber-400">
                  {TEXTS[textIndex]}
                </TextTransition>
              </span>
              <span className="block text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold mt-3">
                in the Greater Eugene/Springfield Area
              </span>
            </h1>
            <p className="mt-12 text-lg text-slate-300 max-w-2xl mx-auto">
              No ads, no spam—just real local community, with the option to support sound money with silver.
            </p>
          </div>

          <div className="mt-12 max-w-3xl mx-auto px-4">
            <div className="flex flex-row items-center justify-center gap-3 sm:gap-4">
              <Button 
                size="lg"
                className="bg-amber-400 hover:bg-amber-500 hover:brightness-110 text-slate-900 font-semibold px-6 sm:px-10 py-4 text-base sm:text-lg h-auto flex-1 sm:flex-none sm:w-64 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl"
                onClick={() => navigate(createPageUrl('Directory'))}
              >
                Browse Directory
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="bg-transparent hover:bg-white/10 text-white border-2 border-white/30 hover:border-white font-semibold px-6 sm:px-10 py-4 text-base sm:text-lg h-auto flex-1 sm:flex-none sm:w-64 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl"
                onClick={() => navigate(createPageUrl('Events'))}
              >
                View Events
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">100+</p>
              <p className="text-sm text-slate-400 mt-1">Local Businesses Listed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">4.8</p>
              <p className="text-sm text-slate-400 mt-1">Average Rating</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">1000+</p>
              <p className="text-sm text-slate-400 mt-1">Local Customers Served</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Nearby Section */}
      {userLat && userLng && (
        <FeaturedNearbySection
          featured={featuredData.featured}
          organic={featuredData.organic}
          isLoading={regionLoading}
        />
      )}

      {/* Categories */}
      <section id="categories" className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-100">Browse by Category</h2>
            <p className="text-slate-400 mt-1">Find exactly what you need</p>
          </div>
          <Button 
            variant="ghost" 
            className="text-slate-400 hover:text-amber-500"
            onClick={() => navigate(createPageUrl('Categories'))}
          >
            View all categories
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {popularCategories.map((category) => {
            const Icon = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={`p-5 rounded-xl border border-slate-800 ${category.color} transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-amber-500/50 text-left bg-slate-900`}
              >
                <Icon className="h-8 w-8 mb-3 text-slate-200" />
                <p className="font-semibold text-slate-100">{category.label}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Top Rated Businesses (organic, no Featured badge) */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">Top Rated Businesses</h2>
              <p className="text-slate-400 mt-1">Highly recommended by your neighbors</p>
            </div>
            <Button 
              variant="ghost" 
              className="text-slate-400 hover:text-amber-500"
              onClick={() => navigate(createPageUrl('Search'))}
            >
              View all
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {featuredBusinesses.map((business) => (
                <BusinessCard 
                  key={business.id} 
                  business={business} 
                  featured={false}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why LocalLane */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-100 text-center mb-10">Why use Local Lane?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <motion.div 
            className="text-center p-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0 }}
          >
            <div className="h-12 w-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Store className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-lg text-slate-100">Trusted Local Pros</h3>
            <p className="text-slate-400 mt-2 text-sm">
              Every listing is a real local business, vetted by the community. No ads, just quality connections.
            </p>
          </motion.div>
          <motion.div 
            className="text-center p-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="h-12 w-12 bg-amber-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-6 w-6 text-amber-400" />
            </div>
            <h3 className="font-semibold text-lg text-slate-100">Events & Activities</h3>
            <p className="text-slate-400 mt-2 text-sm">
              From family outings to community meetups—find out what's happening in Eugene/Springfield this weekend.
            </p>
          </motion.div>
          <motion.div 
            className="text-center p-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="h-12 w-12 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Coins className="h-6 w-6 text-yellow-400" />
            </div>
            <h3 className="font-semibold text-lg text-slate-100">Sound Money Friendly</h3>
            <p className="text-slate-400 mt-2 text-sm">
              Support the local economy with the option to support sound money with silver. Always optional, always sound.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA for Business Owners & Event Organizers */}
      <section className="bg-slate-900/50 py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white">Be Part of the Community</h2>
          <p className="text-slate-300 mt-4 max-w-xl mx-auto">
            Whether you run a business or host local events, Local Lane is your place to be seen without paying for ads.
          </p>
          <div className="flex flex-row items-center justify-center gap-3 sm:gap-4 mt-8">
            <Button 
              size="lg"
              className="bg-amber-400 hover:bg-amber-500 hover:brightness-110 text-slate-900 font-semibold px-6 sm:px-8 py-4 flex-1 sm:flex-none sm:w-64 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl"
              onClick={() => navigate(createPageUrl('BusinessOnboarding'))}
            >
              List Your Business
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="bg-transparent hover:bg-white/10 text-white border-2 border-white/30 hover:border-white font-semibold px-6 sm:px-8 py-4 flex-1 sm:flex-none sm:w-64 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl"
              onClick={() => navigate(createPageUrl('Events'))}
            >
              Post an Event
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}