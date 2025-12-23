import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Store, Crown, Star } from "lucide-react";

export default function BusinessSelector({ businesses, onSelectBusiness }) {
  const getTierBadge = (tier) => {
    const badges = {
      gold: { label: 'Gold', icon: Crown, color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30' },
      silver: { label: 'Silver', icon: Star, color: 'bg-slate-400/10 text-slate-600 border-slate-400/30' },
      free: { label: 'Free', icon: Store, color: 'bg-slate-200/10 text-slate-500 border-slate-300/30' }
    };
    const badge = badges[tier] || badges.free;
    const Icon = badge.icon;
    return (
      <Badge variant="outline" className={badge.color}>
        <Icon className="h-3 w-3 mr-1" />
        {badge.label}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Select a Business</h1>
        <p className="text-slate-600 mb-8">Choose which business you'd like to manage</p>

        <div className="grid gap-4">
          {businesses.map((business) => (
            <Card 
              key={business.id}
              className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-amber-500"
              onClick={() => onSelectBusiness(business.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-slate-900">{business.name}</h3>
                    {getTierBadge(business.subscription_tier)}
                  </div>
                  <p className="text-sm text-slate-600">
                    {business.city}, {business.state}
                  </p>
                  {business.main_category && (
                    <p className="text-xs text-slate-500 mt-1 capitalize">
                      {business.main_category.replace('_', ' ')}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-6 w-6 text-slate-400" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}