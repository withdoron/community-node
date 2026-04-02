import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useCategories } from '@/hooks/useCategories';
import BusinessCard from '@/components/business/BusinessCard';
import { rankBusinesses } from '@/components/business/rankingUtils';
import { useActiveRegion, filterBusinessesByRegion } from '@/components/region/useActiveRegion';
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, SearchX, Sprout, Activity, Palette, Wrench, Heart, Store } from "lucide-react";

const CATEGORY_ICONS = { Sprout, Activity, Palette, Wrench, Heart };

export default function CategoryPage() {
  const navigate = useNavigate();
  const { getMainCategory, legacyCategoryMapping } = useCategories();
  const urlParams = new URLSearchParams(window.location.search);
  const categoryId = urlParams.get('id');
  const initialSubcategory = urlParams.get('sub') || 'all';

  const [selectedSubcategory, setSelectedSubcategory] = useState(initialSubcategory);

  const category = getMainCategory(categoryId);

  // Get active region for filtering
  const { region, isLoading: regionLoading } = useActiveRegion();

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses', categoryId, region?.id],
    queryFn: async () => {
      const result = await base44.entities.Business.filter({ is_active: true }, '-created_date', 200);
      // Filter by region
      return filterBusinessesByRegion(result, region);
    },
    enabled: !!region
  });

  // Filter businesses by category
  const filteredBusinesses = useMemo(() => {
    if (!category) return [];

    // Filter to businesses in this main category
    let result = businesses.filter(b => {
      // Check main_category field
      if (b.main_category === categoryId) return true;
      // Fallback: check primary_category
      if (b.primary_category === categoryId) return true;
      // Fallback: check legacy category mapping
      if (b.category && legacyCategoryMapping[b.category]) {
        return legacyCategoryMapping[b.category].main === categoryId;
      }
      return false;
    });

    // Filter by subcategory if not "all"
    if (selectedSubcategory !== 'all' && !selectedSubcategory.startsWith('all_')) {
      result = result.filter(b => {
        // Check subcategories array (multi-category)
        if (b.subcategories?.includes(selectedSubcategory)) return true;
        // Fallback: check sub_category_id (single category / admin-created)
        if (b.sub_category_id === selectedSubcategory) return true;
        // Fallback: check legacy category mapping
        if (b.category && legacyCategoryMapping[b.category]) {
          return legacyCategoryMapping[b.category].sub === selectedSubcategory;
        }
        return false;
      });
    }

    // Apply trust-based ranking: Rating > Reviews > Date
    return rankBusinesses(result);
  }, [businesses, categoryId, selectedSubcategory, category]);

  const handleSubcategoryClick = (subId) => {
    setSelectedSubcategory(subId);
    // Update URL
    const params = new URLSearchParams();
    params.set('id', categoryId);
    if (subId !== 'all' && !subId.startsWith('all_')) {
      params.set('sub', subId);
    }
    window.history.replaceState({}, '', `?${params.toString()}`);
  };

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">Category not found</h2>
          <Button 
            variant="outline" 
            className="mt-4 border-border text-foreground-soft hover:border-primary hover:text-primary"
            onClick={() => navigate(createPageUrl('Directory'))}
          >
            Back to Directory
          </Button>
        </div>
      </div>
    );
  }

  const CategoryIcon = (category?.icon && CATEGORY_ICONS[category.icon]) ? CATEGORY_ICONS[category.icon] : Store;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-4 text-foreground-soft hover:text-primary hover:bg-secondary"
            onClick={() => navigate(createPageUrl('Directory'))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-secondary text-primary">
              <CategoryIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{category.label}</h1>
              <p className="text-muted-foreground">{filteredBusinesses.length} businesses found</p>
            </div>
          </div>

          {/* Subcategory filters */}
          <div className="flex flex-wrap gap-2">
            {category.subcategories.map((sub) => {
              const isSelected = selectedSubcategory === sub.id ||
                (typeof sub.id === 'string' && sub.id.startsWith('all_') && (selectedSubcategory === 'all' || selectedSubcategory === sub.id));
              return (
                <button
                  key={sub.id}
                  onClick={() => handleSubcategoryClick(sub.id)}
                  className={isSelected
                    ? 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground cursor-default'
                    : 'px-3 py-1.5 rounded-lg text-sm bg-secondary text-foreground-soft border border-border hover:border-primary hover:text-primary transition-colors cursor-pointer'
                  }
                >
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {isLoading || regionLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="text-center py-20">
            <SearchX className="h-12 w-12 text-muted-foreground/70 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground">No businesses found</h3>
            <p className="text-muted-foreground mt-2">
              No businesses are listed in this category yet.
            </p>
            <button
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-secondary text-foreground-soft border border-border hover:border-primary hover:text-primary transition-colors"
              onClick={() => handleSubcategoryClick('all')}
            >
              View all {category.label.toLowerCase()}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBusinesses.map((business) => (
              <BusinessCard 
                key={business.id} 
                business={business}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}