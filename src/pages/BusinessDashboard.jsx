import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3, Star, Loader2, Crown, Zap, Plus, Building2,
  ExternalLink, ChevronRight
} from "lucide-react";
import { format } from 'date-fns';
import BusinessDashboardDetail from '@/components/dashboard/BusinessDashboardDetail';

export default function BusinessDashboard() {
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // Fetch all businesses owned by this user
  const { data: myBusinesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ['myBusinesses', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      return base44.entities.Business.filter({ owner_email: currentUser.email }, '-created_date', 50);
    },
    enabled: !!currentUser?.email
  });

  const selectedBusiness = selectedBusinessId 
    ? myBusinesses.find(b => b.id === selectedBusinessId) 
    : null;

  const tierInfo = {
    basic: { icon: Star, color: 'text-slate-600', bg: 'bg-slate-100', name: 'Basic' },
    standard: { icon: Zap, color: 'text-blue-600', bg: 'bg-blue-100', name: 'Standard' },
    partner: { icon: Crown, color: 'text-amber-600', bg: 'bg-amber-100', name: 'Partner' }
  };

  if (businessesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // If viewing a specific business
  if (selectedBusiness) {
    return (
      <BusinessDashboardDetail 
        business={selectedBusiness} 
        onBack={() => setSelectedBusinessId(null)}
      />
    );
  }

  // No businesses yet
  if (myBusinesses.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900">No Businesses Yet</h2>
          <p className="text-slate-600 mt-2">
            Create your first business listing to get started.
          </p>
          <Link to={createPageUrl('BusinessOnboarding')}>
            <Button className="mt-4 bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Listing
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Business list view
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">My Businesses</h1>
              <p className="text-slate-600 mt-1">Manage all your business listings</p>
            </div>
            <Link to={createPageUrl('BusinessOnboarding')}>
              <Button className="bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-2" />
                Add New Business
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-4">
          {myBusinesses.map((business) => {
            const tier = tierInfo[business.subscription_tier] || tierInfo.basic;
            const TierIcon = tier.icon;

            return (
              <Card 
                key={business.id}
                className="p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedBusinessId(business.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="h-16 w-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                    {business.photos?.[0] ? (
                      <img 
                        src={business.photos[0]} 
                        alt={business.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg text-slate-900 truncate">
                        {business.name}
                      </h3>
                      <Badge className={`${tier.bg} ${tier.color} border-0 text-xs`}>
                        <TierIcon className="h-3 w-3 mr-1" />
                        {tier.name}
                      </Badge>
                      {!business.is_active && (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {business.city || 'No location set'}
                      {business.main_category && ` • ${business.main_category.replace(/_/g, ' ')}`}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-slate-600">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {(business.average_rating || 0).toFixed(1)}
                        <span className="text-slate-400">({business.review_count || 0})</span>
                      </span>
                      {business.is_bumped && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">Boosted</Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link 
                      to={createPageUrl(`BusinessProfile?id=${business.id}`)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}