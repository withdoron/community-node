import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Store, Wallet, Ticket, Plus, Palette, Users, TrendingUp, Trash2, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: associatedBusinesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ['associatedBusinesses', currentUser?.id],
    queryFn: async () => {
      const userId = currentUser?.id;
      const userEmail = currentUser?.email;
      const linkedIds = currentUser?.associated_businesses || [];

      // Debug: current user
      console.log('[BusinessDashboard] currentUser.id:', userId);
      console.log('[BusinessDashboard] currentUser.email:', userEmail);
      console.log('[BusinessDashboard] currentUser.associated_businesses:', linkedIds);

      // 1) Fetch businesses where current user is owner (source of truth for "my businesses")
      const byOwner = userId
        ? await base44.entities.Business.filter(
            { owner_user_id: userId },
            '-created_date',
            100
          )
        : [];

      // Debug: how many returned by owner_user_id filter, and each business's owner fields
      console.log('[BusinessDashboard] owner_user_id filter returned count:', byOwner?.length ?? 0);
      console.log(
        '[BusinessDashboard] businesses by owner_user_id (id, name, owner_user_id, owner_email):',
        (byOwner || []).map((b) => ({
          id: b?.id,
          name: b?.name,
          owner_user_id: b?.owner_user_id,
          owner_email: b?.owner_email,
          matches_current_user: b?.owner_user_id === userId
        }))
      );

      // 2) Fetch by linked IDs (user.associated_businesses) for any extra associations
      const byLinked =
        linkedIds.length > 0
          ? (
              await Promise.all(
                linkedIds.map((businessId) =>
                  base44.entities.Business.filter({ id: businessId }, '', 1)
                )
              )
            ).flat()
          : [];

      // Merge and dedupe by id (owner list takes precedence for order)
      const seen = new Set();
      const merged = [];
      for (const b of byOwner) {
        if (b?.id && !seen.has(b.id)) {
          seen.add(b.id);
          merged.push(b);
        }
      }
      for (const b of byLinked) {
        if (b?.id && !seen.has(b.id)) {
          seen.add(b.id);
          merged.push(b);
        }
      }

      // Don't show soft-deleted businesses (is_deleted or status === 'deleted')
      const filtered = merged.filter(
        (b) => !b?.is_deleted && b?.status !== 'deleted'
      );

      console.log('[BusinessDashboard] businesses by associated_businesses count:', byLinked?.length ?? 0);
      console.log('[BusinessDashboard] merged businesses count:', filtered.length);
      console.log(
        '[BusinessDashboard] merged (id, name) — check for duplicate names e.g. two "Recess":',
        filtered.map((b) => ({ id: b?.id, name: b?.name }))
      );
      // If Admin shows more businesses for this email: Admin filters by owner_email; Dashboard uses owner_user_id.
      // Check each business in the table above: if owner_user_id !== currentUser.id, they won't appear in byOwner.
      if (filtered.length < 3 && userEmail) {
        console.log(
          '[BusinessDashboard] Tip: If Admin shows 3 businesses for',
          userEmail,
          'but Dashboard shows fewer, the others may have owner_email set but owner_user_id different or null. Update them in Admin (e.g. ensure owner_user_id matches current user) or clean up duplicate/test entries.'
        );
      }

      return filtered;
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

  // Soft delete: try is_deleted first; if schema only has status, use status: 'deleted'
  const deleteMutation = useMutation({
    mutationFn: async (businessId) => {
      console.log('[Dashboard Delete] Starting delete for business id:', businessId);
      try {
        try {
          await base44.entities.Business.update(businessId, { is_deleted: true });
          console.log('[Dashboard Delete] Business.update(is_deleted: true) succeeded');
        } catch (e) {
          console.warn('[Dashboard Delete] is_deleted failed, trying status:', e?.message);
          await base44.entities.Business.update(businessId, { status: 'deleted' });
          console.log('[Dashboard Delete] Business.update(status: deleted) succeeded');
        }
        console.log('[Dashboard Delete] Business.update succeeded for id:', businessId);
      } catch (err) {
        console.error('[Dashboard Delete] Error in deleteMutation:', err);
        throw err;
      }
    },
    onSuccess: () => {
      console.log('[Dashboard Delete] onSuccess');
      queryClient.invalidateQueries(['associatedBusinesses']);
      setSelectedBusinessId(null);
      setDeleteDialogOpen(false);
      toast.success('Business deleted');
    },
    onError: (error) => {
      console.error('[Dashboard Delete] onError:', error?.message, error);
      toast.error('Failed to delete business');
      console.error(error);
    },
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

  // Debug: full business object (tier is business.subscription_tier: basic | standard | partner)
  console.log('[BusinessDashboard] selected business (full object):', selectedBusiness);
  console.log('[BusinessDashboard] business.subscription_tier:', selectedBusiness.subscription_tier);

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

        {/* Business settings - Owner only: Delete Business */}
        {isOwner && (
          <Card className="p-6 bg-slate-900 border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-slate-400" />
                <h2 className="text-xl font-bold text-slate-100">Business settings</h2>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Permanently remove this business and its data. This action uses a soft delete (business is marked deleted).
            </p>
            <Button
              variant="outline"
              size="sm"
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Business
            </Button>
          </Card>
        )}
      </div>

      {/* Delete Business confirmation - Owner only */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Delete Business?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure? This will remove all events and data associated with this business.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                console.log('[Dashboard Delete] Confirmation clicked, calling mutate(', selectedBusiness?.id, ')');
                deleteMutation.mutate(selectedBusiness.id);
              }}
              className="bg-red-600 hover:bg-red-500 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}