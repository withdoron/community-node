import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mainCategories, defaultPopularCategoryIds } from '@/components/categories/categoryData';

export default function Categories() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const handleCategoryClick = (categoryId) => {
    trackClick.mutate(categoryId);
    navigate(createPageUrl(`CategoryPage?id=${categoryId}`));
  };

  // Get popular categories (top 6 by clicks)
  const popularCategories = [...mainCategories]
    .filter(c => defaultPopularCategoryIds.includes(c.id))
    .sort((a, b) => {
      const aClicks = categoryClicks.find(c => c.category === a.id)?.click_count || 0;
      const bClicks = categoryClicks.find(c => c.category === b.id)?.click_count || 0;
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
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className={`p-4 rounded-xl border border-slate-100 ${category.color} transition-all duration-200 hover:scale-[1.02] hover:shadow-sm text-left`}
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
            {mainCategories.map((category) => {
              const Icon = category.icon;
              const clicks = categoryClicks.find(c => c.category === category.id)?.click_count || 0;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
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