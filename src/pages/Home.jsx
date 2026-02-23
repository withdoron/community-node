import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import BusinessCard from '@/components/business/BusinessCard';
import { rankBusinesses } from '@/components/business/rankingUtils';
import { useActiveRegion, filterBusinessesByRegion } from '@/components/region/useActiveRegion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Shield, ShieldCheck, MapPin, Users, Heart, Store, Sprout, Activity, Palette, Wrench } from "lucide-react";
import { useCategories } from '@/hooks/useCategories';

const CATEGORY_ICONS = { Sprout, Activity, Palette, Wrench, Heart };

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { mainCategories, defaultPopularCategoryIds } = useCategories();

  // Get active region for this instance
  const { region, isLoading: regionLoading } = useActiveRegion();

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

  // Top Rated Businesses - filtered by region
  const { data: featuredBusinesses = [], isLoading } = useQuery({
    queryKey: ['featured-businesses', region?.id],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter(
        { is_active: true },
        '-created_date',
        50
      );
      // Filter by region, then rank and take top 6
      const regionalBusinesses = filterBusinessesByRegion(businesses, region);
      return rankBusinesses(regionalBusinesses).slice(0, 6);
    },
    enabled: !!region
  });

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
              Ad‑Free · Local · Community-Powered
            </Badge>
            <h1 className="text-white tracking-tight leading-tight text-center px-4">
              <span className="block text-3xl sm:text-4xl font-semibold mb-3">Discover local</span>
              <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold my-4 break-words text-amber-400">
                Businesses & Events
              </span>
              <span className="block text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold mt-3">
                in the Greater Eugene/Springfield Area
              </span>
            </h1>
            <p className="mt-12 text-lg text-slate-300 max-w-2xl mx-auto">
              Real businesses, family-friendly events, and community networks — built by your neighbor, not a corporation.
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
                className="bg-transparent hover:bg-transparent text-white border-2 border-white/30 hover:border-amber-500 hover:text-amber-500 font-semibold px-6 sm:px-10 py-4 text-base sm:text-lg h-auto flex-1 sm:flex-none sm:w-64 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl"
                onClick={() => navigate(createPageUrl('Events'))}
              >
                View Events
              </Button>
            </div>
          </div>

        </div>
      </section>

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
            onClick={() => navigate(createPageUrl('Directory'))}
          >
            View all categories
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {popularCategories.map((category) => {
            const Icon = CATEGORY_ICONS[category.icon] ?? Store;
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className="p-5 rounded-xl border border-slate-800 bg-slate-900 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-amber-500/50 text-left"
              >
                <Icon className="h-8 w-8 mb-3 text-amber-500" />
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
              <h2 className="text-2xl font-bold text-slate-100">Local Businesses</h2>
              <p className="text-slate-400 mt-1">The first to join the community</p>
            </div>
            <Button 
              variant="ghost" 
              className="text-slate-400 hover:text-amber-500"
              onClick={() => navigate(createPageUrl('Directory'))}
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
          ) : featuredBusinesses.length === 0 ? (
            <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
              <Store className="h-12 w-12 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 font-medium">No businesses in your area yet</p>
              <p className="text-sm text-slate-500 mt-1">Browse the Directory or check back soon — we&apos;re growing.</p>
              <Button
                variant="outline"
                className="mt-4 border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500"
                onClick={() => navigate(createPageUrl('Directory'))}
              >
                Browse Directory
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {featuredBusinesses.map((business) => (
                <BusinessCard 
                  key={business.id} 
                  business={business}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why LocalLane */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-slate-100 text-center mb-10">Why use Local Lane?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <ShieldCheck className="h-6 w-6 text-amber-500 mb-3" />
            <h3 className="font-semibold text-lg text-white mb-2">Ad-free, always</h3>
            <p className="text-slate-400 text-sm leading-relaxed">No promoted listings, no pay-to-play. Every business earns its place through community trust.</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <MapPin className="h-6 w-6 text-amber-500 mb-3" />
            <h3 className="font-semibold text-lg text-white mb-2">Built for Eugene</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Not a national app with a local filter. Made here, for the people who live here.</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <Users className="h-6 w-6 text-amber-500 mb-3" />
            <h3 className="font-semibold text-lg text-white mb-2">Community-powered</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Your recommendations and participation shape what thrives. The community decides, not an algorithm.</p>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <Heart className="h-6 w-6 text-amber-500 mb-3" />
            <h3 className="font-semibold text-lg text-white mb-2">Real connection</h3>
            <p className="text-slate-400 text-sm leading-relaxed">Events, networks, and neighbors — not engagement metrics and data harvesting.</p>
          </div>
        </div>
      </section>

      {/* CTA for Business Owners & Event Organizers */}
      <section className="bg-slate-900/50 py-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white">Be Part of the Community</h2>
          <p className="text-slate-300 mt-4 max-w-xl mx-auto">
            Whether you run a business, coach a team, or host community gatherings — Local Lane is your place to be seen without paying for ads.
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