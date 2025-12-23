import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PersonalDashboard from '@/components/dashboard/PersonalDashboard';
import BusinessCard from '@/components/dashboard/BusinessCard';
import OverviewWidget from '@/components/dashboard/widgets/OverviewWidget';
import EventsWidget from '@/components/dashboard/widgets/EventsWidget';
import StaffWidget from '@/components/dashboard/widgets/StaffWidget';
import FinancialWidget from '@/components/dashboard/widgets/FinancialWidget';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Store, Wallet, Ticket, Plus } from "lucide-react";

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: associatedBusinesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ['associatedBusinesses', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.associated_businesses?.length) return [];
      
      const businesses = await Promise.all(
        currentUser.associated_businesses.map(businessId => 
          base44.entities.Business.filter({ id: businessId }, '', 1)
        )
      );
      return businesses.flat();
    },
    enabled: !!currentUser
  });

  // Fetch event counts for each business
  const { data: eventCounts = {} } = useQuery({
    queryKey: ['business-event-counts', associatedBusinesses.map(b => b.id)],
    queryFn: async () => {
      const counts = {};
      await Promise.all(
        associatedBusinesses.map(async (business) => {
          const events = await base44.entities.Event.filter(
            { business_id: business.id, is_active: true },
            '-date',
            100
          );
          counts[business.id] = events.length;
        })
      );
      return counts;
    },
    enabled: associatedBusinesses.length > 0
  });

  const isLoading = userLoading || businessesLoading;

  const getUserRole = (business) => {
    if (business.owner_user_id === currentUser?.id) return 'Owner';
    if (business.instructors?.includes(currentUser?.id)) return 'Instructor';
    return 'Editor';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // STEP 1: No business associations - Show Personal Dashboard
  if (!associatedBusinesses || associatedBusinesses.length === 0) {
    return <PersonalDashboard />;
  }

  // STEP 2: Has businesses but none selected - Show Smart Dashboard Hub
  if (!selectedBusinessId) {
    return (
      <div className="min-h-screen bg-slate-900">
        {/* Personal Header - "Wallet Strip" */}
        <div className="bg-gradient-to-r from-slate-800 via-slate-800 to-slate-700 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Hello, {currentUser?.full_name || 'User'}
                </h1>
                <p className="text-slate-400 text-sm mt-1">Welcome back to your dashboard</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-slate-700/50 border-slate-600 text-white px-4 py-2">
                  <Wallet className="h-4 w-4 mr-2" />
                  Silver: 0 oz
                </Badge>
                <Badge variant="outline" className="bg-slate-700/50 border-slate-600 text-white px-4 py-2">
                  <Ticket className="h-4 w-4 mr-2" />
                  0 Passes
                </Badge>
                <Button 
                  variant="outline" 
                  className="bg-slate-700/50 border-slate-600 text-white hover:bg-slate-700"
                  onClick={() => navigate(createPageUrl('Events'))}
                >
                  <Ticket className="h-4 w-4 mr-2" />
                  My Tickets
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Business Grid - "The Pro Section" */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">My Businesses & Workspaces</h2>
              <p className="text-slate-400 text-sm mt-1">
                Manage your business listings and team workspaces
              </p>
            </div>
            <Button 
              onClick={() => navigate(createPageUrl('BusinessOnboarding'))}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Business
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {associatedBusinesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                userRole={getUserRole(business)}
                eventCount={eventCounts[business.id] || 0}
                onClick={() => setSelectedBusinessId(business.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // STEP 3: Business selected - Show role-based dashboard
  const selectedBusiness = associatedBusinesses.find(b => b.id === selectedBusinessId);
  if (!selectedBusiness) {
    setSelectedBusinessId(null);
    return null;
  }

  const userRole = getUserRole(selectedBusiness);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedBusinessId(null)}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Businesses
            </Button>
            <div className="h-4 w-px bg-slate-200" />
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-slate-600" />
              <div>
                <h1 className="text-lg font-bold text-slate-900">{selectedBusiness.name}</h1>
                <p className="text-xs text-slate-500">{userRole} Dashboard</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Overview - Everyone can see */}
        <OverviewWidget business={selectedBusiness} />

        {/* Events - Everyone can see and edit */}
        <EventsWidget 
          business={selectedBusiness} 
          allowEdit={true}
          userRole={userRole}
        />

        {/* Staff - Only Managers and Owners */}
        {(userRole === 'Manager' || userRole === 'Owner') && (
          <StaffWidget business={selectedBusiness} />
        )}

        {/* Financials - Only Owners */}
        {userRole === 'Owner' && (
          <FinancialWidget business={selectedBusiness} />
        )}
      </div>
    </div>
  );
}