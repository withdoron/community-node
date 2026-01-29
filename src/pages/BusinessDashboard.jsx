import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BusinessCard from '@/components/dashboard/BusinessCard';
import OverviewWidget from '@/components/dashboard/widgets/OverviewWidget';
import EventsWidget from '@/components/dashboard/widgets/EventsWidget';
import StaffWidget from '@/components/dashboard/widgets/StaffWidget';
import FinancialWidget from '@/components/dashboard/widgets/FinancialWidget';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Store, Wallet, Ticket, Plus, Palette, Users, TrendingUp } from "lucide-react";

// DASHBOARD CONFIGURATION BY ARCHETYPE
const DASHBOARD_CONFIG = {
  location: {
    title: 'Storefront Management',
    widgets: ['Overview', 'Events', 'Staff', 'Financials', 'CheckIn']
  },
  venue: {
    title: 'Storefront Management',
    widgets: ['Overview', 'Events', 'Staff', 'Financials', 'CheckIn']
  },
  service: {
    title: 'Artist Command Center',
    widgets: ['Overview', 'Schedule', 'Portfolio', 'Reviews']
  },
  talent: {
    title: 'Artist Command Center',
    widgets: ['Overview', 'Schedule', 'Portfolio', 'Reviews']
  },
  community: {
    title: 'Group Hub',
    widgets: ['Overview', 'Events', 'Members', 'Donations']
  },
  organizer: {
    title: 'Event Command Center',
    widgets: ['Overview', 'Ticketing', 'Marketing', 'Team']
  }
};

// Fallback for unspecified archetypes
const DEFAULT_CONFIG = {
  title: 'Business Dashboard',
  widgets: ['Overview', 'Events', 'Staff', 'Financials']
};

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
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // STEP 1: No business associations - Show empty state with CTA to create business
  if (!associatedBusinesses || associatedBusinesses.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950">
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-amber-500" />
              <div>
                <h1 className="text-lg font-bold text-slate-100">Business Dashboard</h1>
                <p className="text-xs text-slate-400">Manage your businesses and events</p>
              </div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="h-20 w-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Store className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">
              No Businesses Yet
            </h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Create your first business or organization to start managing events, accepting bookings, and connecting with your community.
            </p>
            <Button 
              onClick={() => navigate(createPageUrl('BusinessOnboarding'))}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8 py-6 text-lg"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Business
            </Button>
            <p className="text-sm text-slate-500 mt-6">
              Or <Link to={createPageUrl('MyLane')} className="text-amber-500 hover:text-amber-400 underline">go to your personal dashboard</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: Has businesses but none selected - Show Smart Dashboard Hub
  if (!selectedBusinessId) {
    return (
      <div className="min-h-screen bg-slate-950">
        {/* Personal Header - "Wallet Strip" */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-100">
                  Hello, {currentUser?.full_name || 'User'}
                </h1>
                <p className="text-slate-400 text-sm mt-1">Welcome back to your dashboard</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-200 px-4 py-2">
                  <Wallet className="h-4 w-4 mr-2 text-amber-500" />
                  Silver: 0 oz
                </Badge>
                <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-200 px-4 py-2">
                  <Ticket className="h-4 w-4 mr-2 text-amber-500" />
                  0 Passes
                </Badge>
                <Button 
                  className="bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
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
              <h2 className="text-2xl font-bold text-slate-100">My Businesses & Workspaces</h2>
              <p className="text-slate-400 text-sm mt-1">
                Manage your business listings and team workspaces
              </p>
            </div>
            <Button 
              onClick={() => navigate(createPageUrl('BusinessOnboarding'))}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
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
  const archetype = selectedBusiness.archetype || 'location';
  const config = DASHBOARD_CONFIG[archetype] || DEFAULT_CONFIG;
  const isOwner = userRole === 'Owner';
  const isManager = userRole === 'Manager';

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedBusinessId(null)}
              className="text-slate-400 hover:text-slate-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Businesses
            </Button>
            <div className="h-4 w-px bg-slate-700" />
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-amber-500" />
              <div>
                <h1 className="text-lg font-bold text-slate-100">{selectedBusiness.name}</h1>
                <p className="text-xs text-slate-400">{config.title}</p>
              </div>
              <Badge className="ml-2 bg-amber-500/10 text-amber-500 border-amber-500/30">
                {userRole}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Overview - Everyone can see */}
        {config.widgets.includes('Overview') && (
          <OverviewWidget business={selectedBusiness} />
        )}

        {/* Events - Venue, Community, Organizer */}
        {config.widgets.includes('Events') && (
          <EventsWidget 
            business={selectedBusiness} 
            allowEdit={true}
            userRole={userRole}
          />
        )}

        {/* Schedule - Talent/Service */}
        {config.widgets.includes('Schedule') && (
          <Card className="p-6 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-100">Schedule</h2>
            </div>
            <p className="text-sm text-slate-400">Booking calendar coming soon...</p>
          </Card>
        )}

        {/* Portfolio - Talent/Service */}
        {config.widgets.includes('Portfolio') && (
          <Card className="p-6 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <Palette className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-100">Portfolio</h2>
            </div>
            <p className="text-sm text-slate-400">Showcase your work - coming soon...</p>
          </Card>
        )}

        {/* Reviews - Talent/Service */}
        {config.widgets.includes('Reviews') && (
          <Card className="p-6 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <Store className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-100">Reviews</h2>
            </div>
            <p className="text-sm text-slate-400">Client testimonials coming soon...</p>
          </Card>
        )}

        {/* Members - Community */}
        {config.widgets.includes('Members') && (
          <Card className="p-6 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-100">Members</h2>
            </div>
            <p className="text-sm text-slate-400">Membership management coming soon...</p>
          </Card>
        )}

        {/* Donations - Community */}
        {config.widgets.includes('Donations') && (
          <Card className="p-6 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-100">Donations</h2>
            </div>
            <p className="text-sm text-slate-400">Fundraising tools coming soon...</p>
          </Card>
        )}

        {/* Ticketing - Organizer */}
        {config.widgets.includes('Ticketing') && (
          <Card className="p-6 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <Ticket className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-100">Ticketing</h2>
            </div>
            <p className="text-sm text-slate-400">Ticket sales & check-ins coming soon...</p>
          </Card>
        )}

        {/* Marketing - Organizer */}
        {config.widgets.includes('Marketing') && (
          <Card className="p-6 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-100">Marketing</h2>
            </div>
            <p className="text-sm text-slate-400">Promotion tools coming soon...</p>
          </Card>
        )}

        {/* Team - Organizer */}
        {config.widgets.includes('Team') && (
          <Card className="p-6 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <Users className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-100">Team</h2>
            </div>
            <p className="text-sm text-slate-400">Staff coordination coming soon...</p>
          </Card>
        )}

        {/* Staff - Only Managers and Owners (Venue/Location) */}
        {config.widgets.includes('Staff') && (isManager || isOwner) && (
          <StaffWidget business={selectedBusiness} />
        )}

        {/* CheckIn - Venue/Location */}
        {config.widgets.includes('CheckIn') && (
          <Card className="p-6 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <Store className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold text-slate-100">Check-In System</h2>
            </div>
            <div className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center">
                <div className="h-14 w-14 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse" />
                </div>
                <h3 className="text-base font-semibold text-slate-100 mb-1">Scanner Ready</h3>
                <p className="text-sm text-slate-400">Waiting for next event to start...</p>
              </div>
            </div>
          </Card>
        )}

        {/* Financials - Only Owners */}
        {config.widgets.includes('Financials') && isOwner && (
          <FinancialWidget business={selectedBusiness} />
        )}
      </div>
    </div>
  );
}