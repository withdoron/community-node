import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { mainCategories, getMainCategory, legacyCategoryMapping } from '@/components/categories/categoryData';
import BusinessCard from '@/components/business/BusinessCard';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Loader2, SearchX } from "lucide-react";

export default function CategoryPage() {
  const navigate = useNavigate();
  const topRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  const categoryId = urlParams.get('id');
  const initialSubcategory = urlParams.get('sub') || 'all';



  const [selectedSubcategory, setSelectedSubcategory] = useState(initialSubcategory);

  const category = getMainCategory(categoryId);

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['businesses', categoryId],
    queryFn: async () => {
      const result = await base44.entities.Business.filter({ is_active: true }, '-created_date', 200);
      return result;
    }
  });

  // Filter businesses by category
  const filteredBusinesses = useMemo(() => {
    if (!category) return [];

    // Filter to businesses in this main category
    let result = businesses.filter(b => {
      // Check new main_category field
      if (b.main_category === categoryId) return true;
      
      // Fallback: check legacy category mapping
      if (b.category && legacyCategoryMapping[b.category]) {
        return legacyCategoryMapping[b.category].main === categoryId;
      }
      return false;
    });

    // Filter by subcategory if not "all"
    if (selectedSubcategory !== 'all' && !selectedSubcategory.startsWith('all_')) {
      result = result.filter(b => {
        // Check new subcategories array
        if (b.subcategories?.includes(selectedSubcategory)) return true;
        
        // Fallback: check legacy category mapping
        if (b.category && legacyCategoryMapping[b.category]) {
          return legacyCategoryMapping[b.category].sub === selectedSubcategory;
        }
        return false;
      });
    }

    // Sort: bumped first, then partners, then by rating
    const now = new Date();
    return result.sort((a, b) => {
      const aIsBumped = a.is_bumped && a.bump_expires_at && new Date(a.bump_expires_at) > now;
      const bIsBumped = b.is_bumped && b.bump_expires_at && new Date(b.bump_expires_at) > now;
      
      if (aIsBumped && !bIsBumped) return -1;
      if (!aIsBumped && bIsBumped) return 1;
      
      if (a.subscription_tier === 'partner' && b.subscription_tier !== 'partner') return -1;
      if (a.subscription_tier !== 'partner' && b.subscription_tier === 'partner') return 1;
      
      return (b.average_rating || 0) - (a.average_rating || 0);
    });
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-slate-900">Category not found</h2>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => navigate(createPageUrl('Home'))}
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const CategoryIcon = category.icon;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mb-4"
            onClick={() => navigate(createPageUrl('Home'))}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${category.color.split(' ').slice(0, 2).join(' ')}`}>
              <CategoryIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{category.label}</h1>
              <p className="text-slate-600">{filteredBusinesses.length} businesses found</p>
            </div>
          </div>

          {/* Subcategory filters */}
          <div className="flex flex-wrap gap-2">
            {category.subcategories.map((sub) => {
              const isSelected = selectedSubcategory === sub.id || 
                (sub.id.startsWith('all_') && (selectedSubcategory === 'all' || selectedSubcategory === sub.id));
              return (
                <Button
                  key={sub.id}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  className={isSelected ? "bg-slate-900 hover:bg-slate-800" : ""}
                  onClick={() => handleSubcategoryClick(sub.id)}
                >
                  {sub.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="text-center py-20">
            <SearchX className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">No businesses found</h3>
            <p className="text-slate-600 mt-2">
              No businesses are listed in this category yet.
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => handleSubcategoryClick('all')}
            >
              View all {category.label.toLowerCase()}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredBusinesses.map((business) => {
              const isBumpActive = business.is_bumped && business.bump_expires_at && new Date(business.bump_expires_at) > new Date();
              return (
                <BusinessCard 
                  key={business.id} 
                  business={business}
                  featured={isBumpActive || business.subscription_tier === 'partner'}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}