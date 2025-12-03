import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Wrench, Leaf, Tractor, Coins, Zap, Droplets, Hammer, SprayCan, 
  HelpCircle, ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";

const allCategories = [
  { value: 'carpenter', label: 'Carpenters', icon: Hammer, color: 'bg-amber-50 text-amber-600 hover:bg-amber-100' },
  { value: 'mechanic', label: 'Mechanics', icon: Wrench, color: 'bg-slate-50 text-slate-600 hover:bg-slate-100' },
  { value: 'landscaper', label: 'Landscapers', icon: Leaf, color: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
  { value: 'farm', label: 'Farms', icon: Tractor, color: 'bg-green-50 text-green-600 hover:bg-green-100' },
  { value: 'bullion_dealer', label: 'Bullion Dealers', icon: Coins, color: 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' },
  { value: 'electrician', label: 'Electricians', icon: Zap, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
  { value: 'plumber', label: 'Plumbers', icon: Droplets, color: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100' },
  { value: 'cleaning', label: 'Cleaning', icon: SprayCan, color: 'bg-purple-50 text-purple-600 hover:bg-purple-100' },
  { value: 'handyman', label: 'Handyman', icon: Wrench, color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
  { value: 'other', label: 'Other', icon: HelpCircle, color: 'bg-gray-50 text-gray-600 hover:bg-gray-100' },
];

export default function Categories() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: categoryClicks = [] } = useQuery({
    queryKey: ['categoryClicks'],
    queryFn: () => base44.entities.CategoryClick.list('-click_count', 100)
  });

  const trackClick = useMutation({
    mutationFn: async (category) => {
      const existing = categoryClicks.find(c => c.category === category);
      if (existing) {
        await base44.entities.CategoryClick.update(existing.id, { 
          click_count: (existing.click_count || 0) + 1 
        });
      } else {
        await base44.entities.CategoryClick.create({ category, click_count: 1 });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categoryClicks'] })
  });

  const handleCategoryClick = (category) => {
    trackClick.mutate(category);
    navigate(createPageUrl(`Search?category=${category}`));
  };

  // Get popular categories (top 6 by clicks)
  const popularCategories = [...allCategories].sort((a, b) => {
    const aClicks = categoryClicks.find(c => c.category === a.value)?.click_count || 0;
    const bClicks = categoryClicks.find(c => c.category === b.value)?.click_count || 0;
    return bClicks - aClicks;
  }).slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate(createPageUrl('Home'))}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Button>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">All Categories</h1>
        <p className="text-slate-600 mb-8">Browse all available business categories</p>

        {/* Popular Categories */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Popular Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {popularCategories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.value}
                  onClick={() => handleCategoryClick(category.value)}
                  className={`p-4 rounded-xl border border-slate-100 ${category.color} transition-all duration-200 hover:scale-[1.02] hover:shadow-sm`}
                >
                  <Icon className="h-6 w-6 mb-2" />
                  <p className="font-medium text-slate-900 text-sm">{category.label}</p>
                </button>
              );
            })}
          </div>
        </section>

        {/* All Categories */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">All Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {allCategories.map((category) => {
              const Icon = category.icon;
              const clicks = categoryClicks.find(c => c.category === category.value)?.click_count || 0;
              return (
                <button
                  key={category.value}
                  onClick={() => handleCategoryClick(category.value)}
                  className={`p-5 rounded-xl border border-slate-100 ${category.color} transition-all duration-200 hover:scale-[1.02] hover:shadow-sm text-left`}
                >
                  <Icon className="h-8 w-8 mb-3" />
                  <p className="font-semibold text-slate-900">{category.label}</p>
                  {clicks > 0 && (
                    <p className="text-xs text-slate-500 mt-1">{clicks} searches</p>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}