import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Phone, ChevronRight, Sparkles, CheckCircle } from "lucide-react";

import { mainCategories, getMainCategory, getSubcategoryLabel } from '@/components/categories/categoryData';

const legacyCategoryLabels = {
  carpenter: 'Carpenter',
  mechanic: 'Mechanic',
  landscaper: 'Landscaper',
  farm: 'Farm',
  bullion_dealer: 'Bullion Dealer',
  electrician: 'Electrician',
  plumber: 'Plumber',
  handyman: 'Handyman',
  cleaning: 'Cleaning',
  other: 'Other'
};

export default function BusinessCard({ business, featured = false }) {
  const minPrice = business.services?.length > 0 
    ? Math.min(...business.services.map(s => s.starting_price || 0))
    : null;

  // Get category label (supports both new and legacy categories)
  const getCategoryLabel = () => {
    if (business.main_category) {
      const mainCat = getMainCategory(business.main_category);
      return mainCat?.label || business.main_category;
    }
    return legacyCategoryLabels[business.category] || business.category;
  };

  return (
    <Card className={`group overflow-hidden transition-all duration-300 hover:shadow-lg ${featured ? 'ring-2 ring-amber-400 shadow-md' : 'border-slate-200'}`}>
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative sm:w-48 h-40 sm:h-auto flex-shrink-0">
          <img
            src={business.photos?.[0] || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop'}
            alt={business.name}
            className="w-full h-full object-cover"
          />
          {featured && (
            <div className="absolute top-2 left-2">
              <Badge className="bg-amber-400 text-amber-900 font-medium">
                <Sparkles className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            </div>
          )}
          {business.subscription_tier === 'partner' && (
            <div className="absolute top-2 right-2">
              <Badge className="bg-emerald-500 text-white font-medium">
                <CheckCircle className="h-3 w-3 mr-1" />
                Partner
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                      {getCategoryLabel()}
                    </Badge>
                {business.accepts_silver && (
                  <Badge variant="outline" className="text-xs border-slate-300 text-slate-600">
                    Accepts Silver
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-lg text-slate-900 truncate group-hover:text-slate-700 transition-colors">
                {business.name}
              </h3>
            </div>
            
            {/* Rating */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-slate-900">
                {business.average_rating?.toFixed(1) || '0.0'}
              </span>
              <span className="text-sm text-slate-500">
                ({business.review_count || 0})
              </span>
            </div>
          </div>

          <p className="text-sm text-slate-600 mt-2 line-clamp-2">
            {business.description || 'No description available'}
          </p>

          <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
            {business.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {business.city}
              </span>
            )}
            {minPrice !== null && minPrice > 0 && (
              <span className="font-medium text-slate-700">
                From ${minPrice}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            {business.phone && (
              <Button 
                variant="outline" 
                size="sm"
                className="h-9 border-slate-200 hover:bg-slate-50"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = `tel:${business.phone}`;
                }}
              >
                <Phone className="h-3.5 w-3.5 mr-1.5" />
                Call
              </Button>
            )}
            <Link to={createPageUrl(`BusinessProfile?id=${business.id}`)} className="flex-1">
              <Button 
                variant="default" 
                size="sm"
                className="w-full h-9 bg-slate-900 hover:bg-slate-800"
              >
                View Profile
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}