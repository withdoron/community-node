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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Shield, Users, Ban, Coins } from "lucide-react";
import { mainCategories, defaultPopularCategoryIds } from '@/components/categories/categoryData';

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // User location state
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [searchRadius, setSearchRadius] = useState(5);
  const [locationError, setLocationError] = useState(false);

  // Get user's geolocation on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLat(position.coords.latitude);
          setUserLng(position.coords.longitude);
        },
        () => {
          // Fallback to Austin, TX if geolocation fails
          setUserLat(30.2672);
          setUserLng(-97.7431);
          setLocationError(true);
        }
      );
    } else {
      // Fallback if geolocation not supported
      setUserLat(30.2672);
      setUserLng(-97.7431);
      setLocationError(true);
    }
  }, []);

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
  const { data: allBusinesses = [] } = useQuery({
    queryKey: ['all-businesses'],
    queryFn: () => base44.entities.Business.filter({ is_active: true }, '-average_rating', 100)
  });

  const { data: allLocations = [] } = useQuery({
    queryKey: ['all-locations'],
    queryFn: () => base44.entities.Location.list('-created_date', 500)
  });

  // Compute featured and organic lists
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ['featured-nearby', userLat, userLng, searchRadius, allBusinesses.length, allLocations.length],
    queryFn: () => {
      if (!userLat || !userLng) return { featured: [], organic: [] };
      return getFeaturedAndOrganicLocations(allBusinesses, allLocations, userLat, userLng, searchRadius);
    },
    enabled: userLat !== null && userLng !== null && allBusinesses.length > 0
  });

  const { data: featuredBusinesses = [], isLoading } = useQuery({
    queryKey: ['featured-businesses'],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter(
        { is_active: true },
        '-average_rating',
        20
      );
      // Apply consistent ranking and take top 6
      return rankBusinesses(businesses).slice(0, 6);
    }
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
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
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
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
              Find trusted local
              <span className="block text-amber-400">businesses near you</span>
            </h1>
            <p className="mt-6 text-lg text-slate-300 max-w-2xl mx-auto">
              Connect with trusted carpenters, mechanics, farms, and more. No ads, no spam—just real local businesses, with the option to support sound money with silver.
            </p>
          </div>

          <div className="mt-10 max-w-3xl mx-auto">
            <SearchBar onSearch={handleSearch} />
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
              <Button 
                size="lg"
                className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold px-8"
                onClick={() => {
                  const searchBar = document.querySelector('form');
                  if (searchBar) searchBar.dispatchEvent(new Event('submit', { bubbles: true }));
                }}
              >
                Search local businesses
              </Button>
              <Button 
                size="lg"
                className="bg-white hover:bg-slate-100 text-slate-900 font-semibold px-8 border border-slate-200"
                onClick={() => navigate(createPageUrl('BusinessOnboarding'))}
              >
                List your business
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
          featured={featuredData?.featured || []}
          organic={featuredData?.organic || []}
          isLoading={featuredLoading}
          searchRadius={searchRadius}
          onRadiusChange={setSearchRadius}
        />
      )}

      {/* Categories */}
      <section id="categories" className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Browse by Category</h2>
            <p className="text-slate-600 mt-1">Find exactly what you need</p>
          </div>
          <Button 
            variant="ghost" 
            className="text-slate-600 hover:text-slate-900"
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
                className={`p-5 rounded-xl border border-slate-100 ${category.color} transition-all duration-200 hover:scale-[1.02] hover:shadow-sm text-left`}
              >
                <Icon className="h-8 w-8 mb-3" />
                <p className="font-semibold text-slate-900">{category.label}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Businesses */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Top Rated Businesses</h2>
              <p className="text-slate-600 mt-1">Highly recommended by your neighbors</p>
            </div>
            <Button 
              variant="ghost" 
              className="text-slate-600 hover:text-slate-900"
              onClick={() => navigate(createPageUrl('Search'))}
            >
              View all
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4">
              {featuredBusinesses.map((business) => (
                <BusinessCard 
                  key={business.id} 
                  business={business} 
                  featured={isBoostActive(business) || business.subscription_tier === 'partner'}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why LocalConnect */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-10">Why use LocalConnect?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">Local & Trusted</h3>
            <p className="text-slate-600 mt-2 text-sm">
              Every listing is a real local business, with reviews from people in your community.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="h-12 w-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Ban className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">Ad‑Free & Simple</h3>
            <p className="text-slate-600 mt-2 text-sm">
              No ads, no bidding for attention—just clear information to help you choose the right local pro.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="h-12 w-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Coins className="h-6 w-6 text-yellow-600" />
            </div>
            <h3 className="font-semibold text-lg text-slate-900">Sound Money Friendly</h3>
            <p className="text-slate-600 mt-2 text-sm">
              See which businesses support sound money by choosing to accept silver. It's always optional for both sides.
            </p>
          </div>
        </div>
      </section>

      {/* CTA for Business Owners */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white">Own a local business?</h2>
          <p className="text-slate-300 mt-4 max-w-xl mx-auto">
            Join our local marketplace and connect with customers who value quality, trust, and community.
          </p>
          <p className="text-slate-400 mt-2 max-w-xl mx-auto">
            No ad spend, no lead fees—just clear, honest visibility.
          </p>
          <Button 
            size="lg"
            className="mt-8 bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold"
            onClick={() => navigate(createPageUrl('BusinessOnboarding'))}
          >
            List Your Business
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}