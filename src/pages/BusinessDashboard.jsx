import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BusinessCard from '@/components/dashboard/BusinessCard';
import EventsWidget from '@/components/dashboard/widgets/EventsWidget';
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
import { ArrowLeft, Store, Wallet, Ticket, Plus, Users, TrendingUp, Trash2, Settings, Loader2, LayoutDashboard, Coins, Calendar } from "lucide-react";
import { useBusinessRevenue } from '@/hooks/useBusinessRevenue';
import { useRole } from '@/hooks/useRole';
import { CheckInMode } from '@/components/dashboard/CheckInMode';
import AccessWindowManager from '@/components/dashboard/AccessWindowManager';
import RevenueOverview from '@/components/dashboard/RevenueOverview';
import BusinessSettings from '@/components/dashboard/BusinessSettings';
import { toast } from "sonner";

const ARCHETYPE_TITLES = {
  location: 'Storefront Management',
  venue: 'Storefront Management',
  service: 'Artist Command Center',
  talent: 'Artist Command Center',
  community: 'Group Hub',
  organizer: 'Event Command Center'
};

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checkInEvent, setCheckInEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('home');

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });
  const { isAppAdmin } = useRole();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Fetch businesses where user is owner
  const { data: ownedBusinesses = [], isLoading: ownedLoading } = useQuery({
    queryKey: ['ownedBusinesses', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      return base44.entities.Business.filter(
        { owner_user_id: currentUser.id },
        '-created_date',
        100
      );
    },
    enabled: !!currentUser?.id,
  });

  // Fetch businesses where user is staff (in instructors array)
  const { data: staffBusinesses = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staffBusinesses', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      if (currentUser.associated_businesses?.length) {
        const businesses = await Promise.all(
          currentUser.associated_businesses.map((id) =>
            base44.entities.Business.filter({ id }, '', 1).then((r) => r?.[0] ?? null)
          )
        );
        const found = businesses.filter(Boolean);
        const result = found.filter(
          (b) =>
            b.instructors?.includes(currentUser.id) &&
            b.owner_user_id !== currentUser.id
        );
        console.log('[Dashboard] staffBusinesses (associated_businesses path):', result);
        result.forEach((b) => console.log('[Dashboard] business', b.id, 'instructors:', b.instructors));
        return result;
      }
      const allBusinesses = await base44.entities.Business.list('-created_date', 500);
      const result = (allBusinesses || []).filter(
        (b) =>
          b.instructors?.includes(currentUser.id) &&
          b.owner_user_id !== currentUser.id
      );
      console.log('[Dashboard] staffBusinesses (list path):', result);
      result.forEach((b) => console.log('[Dashboard] business', b.id, 'instructors:', b.instructors));
      return result;
    },
    enabled: !!currentUser?.id,
  });

  // Auto-link pending staff invites for current user (runs once when dashboard loads)
  useEffect(() => {
    const checkAndLinkInvites = async () => {
      if (!currentUser?.email || !currentUser?.id) return;

      try {
        const inviteResults = await base44.functions.invoke('updateAdminSettings', {
          action: 'check_my_invites',
          email: currentUser.email,
        });
        const inviteList = Array.isArray(inviteResults) ? inviteResults : (inviteResults?.data ?? []);

        for (const { key, invites } of inviteList) {
          const businessId = (key || '').replace('staff_invites:', '');
          if (!businessId) continue;

          const myInvite = invites?.find(
            (inv) => (inv?.email || '').toLowerCase() === (currentUser.email || '').toLowerCase()
          );
          if (!myInvite) continue;

          console.log('[Dashboard] Found pending invite for', currentUser.email, 'at business', businessId);

          await base44.functions.invoke('updateBusiness', {
            action: 'add_staff_from_invite',
            business_id: businessId,
          });

          await base44.functions.invoke('updateAdminSettings', {
            action: 'accept_invite',
            business_id: businessId,
          });

          queryClient.invalidateQueries({ queryKey: ['staffInvites', businessId] });
          queryClient.invalidateQueries({ queryKey: ['staffRoles', businessId] });
          console.log('[Dashboard] Auto-linked user to business', businessId);
        }

        queryClient.invalidateQueries({ queryKey: ['ownedBusinesses'] });
        queryClient.invalidateQueries({ queryKey: ['staffBusinesses'] });
      } catch (error) {
        console.error('[Dashboard] Error checking invites:', error);
      }
    };

    checkAndLinkInvites();
  }, [currentUser?.email, currentUser?.id, queryClient]);

  // Merge and dedupe (owner list first, then staff)
  const associatedBusinesses = [...(ownedBusinesses || []), ...(staffBusinesses || [])].filter(
    (b, i, arr) => b?.id && !b?.is_deleted && b?.status !== 'deleted' && arr.findIndex((x) => x.id === b.id) === i
  );

  const businessesLoading = ownedLoading || staffLoading;

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

  // Events for selected business (used by Home tab and Events tab)
  const { data: businessEvents = [] } = useQuery({
    queryKey: ['business-events', selectedBusinessId],
    queryFn: async () => {
      if (!selectedBusinessId) return [];
      return base44.entities.Event.filter(
        { business_id: selectedBusinessId, is_active: true },
        '-date',
        100
      );
    },
    enabled: !!selectedBusinessId
  });

  const revenue = useBusinessRevenue(selectedBusinessId);

  // Hard delete: Business.delete(id) removes record permanently. Fallback to soft delete if delete not available.
  const deleteMutation = useMutation({
    mutationFn: async (businessId) => {
      console.log('[Dashboard Delete] Starting cascade delete for business id:', businessId);
      const { deleteBusinessCascade } = await import('@/utils/deleteBusinessCascade');
      await deleteBusinessCascade(businessId);
      console.log('[Dashboard Delete] Cascade delete complete for id:', businessId);
    },
    onSuccess: () => {
      console.log('[Dashboard Delete] onSuccess');
      queryClient.invalidateQueries({ queryKey: ['ownedBusinesses', currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['staffBusinesses', currentUser?.id] });
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
    if (business?.owner_user_id === currentUser?.id) return 'owner';
    if (business?.instructors?.includes(currentUser?.id)) return 'staff';
    return 'none';
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
                  {greeting}, {(currentUser?.data?.display_name || currentUser?.data?.full_name || currentUser?.full_name || 'there').split(' ')[0]}
                </h1>
                <p className="text-slate-400 text-sm mt-1">Welcome back to your dashboard</p>
              </div>
              {isAppAdmin && (
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
              )}
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
  const archetypeTitle = ARCHETYPE_TITLES[archetype] || 'Business Dashboard';
  const isOwner = userRole === 'owner';

  if (checkInEvent) {
    return (
      <CheckInMode
        event={checkInEvent}
        onExit={() => setCheckInEvent(null)}
      />
    );
  }

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
                <p className="text-xs text-slate-400">{archetypeTitle}</p>
              </div>
              {userRole === 'owner' ? (
                <Badge className="ml-2 bg-amber-500 text-black">OWNER</Badge>
              ) : (
                <Badge variant="outline" className="ml-2 border-amber-500 text-amber-500">TEAM</Badge>
              )}
            </div>
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex gap-1 px-6 overflow-x-auto flex-nowrap pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${activeTab === 'home' ? 'text-amber-500 border-b-2 border-amber-500 font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Home
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('joy-coins')}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${activeTab === 'joy-coins' ? 'text-amber-500 border-b-2 border-amber-500 font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <Coins className="h-4 w-4" />
            Joy Coins
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('revenue')}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${activeTab === 'revenue' ? 'text-amber-500 border-b-2 border-amber-500 font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <TrendingUp className="h-4 w-4" />
            Revenue
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${activeTab === 'events' ? 'text-amber-500 border-b-2 border-amber-500 font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <Calendar className="h-4 w-4" />
            Events
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${activeTab === 'settings' ? 'text-amber-500 border-b-2 border-amber-500 font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'home' && (
          <>
            <p className="text-lg text-slate-300 mb-6">
              {revenue.totalRedemptions > 0 ? (
                <>
                  This month, {revenue.uniqueFamilies} families visited through LocalLane. Your estimated pool share:{' '}
                  <span className="text-amber-500 font-bold">${Number(revenue.estimatedPayout).toFixed(2)}</span>
                </>
              ) : (
                'Welcome to your LocalLane dashboard! Set your Joy Coin access hours and create events to start receiving families.'
              )}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <Users className="h-5 w-5 text-amber-500 mb-2" />
                <div className="text-2xl font-bold text-slate-100">{revenue.uniqueFamilies}</div>
                <div className="text-sm text-slate-400">Families Served</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <Coins className="h-5 w-5 text-amber-500 mb-2" />
                <div className="text-2xl font-bold text-slate-100">{revenue.totalCoinsRedeemed}</div>
                <div className="text-sm text-slate-400">Joy Coins Redeemed</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <Wallet className="h-5 w-5 text-amber-500 mb-2" />
                <div className="text-2xl font-bold text-slate-100">
                  ${Number(revenue.estimatedPayout).toFixed(2)}
                </div>
                <div className="text-sm text-slate-400">Pool Share</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <Calendar className="h-5 w-5 text-amber-500 mb-2" />
                <div className="text-2xl font-bold text-slate-100">
                  {(() => {
                    const now = new Date();
                    const thisMonth = businessEvents.filter((e) => {
                      const d = new Date(e.date || e.start_date);
                      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    }).length;
                    return thisMonth;
                  })()}
                </div>
                <div className="text-sm text-slate-400">Events This Month</div>
              </div>
            </div>
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-100">Upcoming Events</h2>
                <button
                  type="button"
                  onClick={() => setActiveTab('events')}
                  className="text-sm text-amber-500 hover:text-amber-400"
                >
                  See All →
                </button>
              </div>
              {(() => {
                const now = new Date();
                const upcoming = businessEvents
                  .filter((e) => new Date(e.date || e.start_date) >= now)
                  .sort((a, b) => new Date(a.date || a.start_date) - new Date(b.date || b.start_date))
                  .slice(0, 3);
                if (upcoming.length === 0) {
                  return (
                    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-center">
                      <p className="text-slate-400 mb-4">No upcoming events. Create one to start attracting families.</p>
                      <Button
                        variant="outline"
                        className="bg-transparent border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent"
                        onClick={() => setActiveTab('events')}
                      >
                        Create Event
                      </Button>
                    </div>
                  );
                }
                return (
                  <div className="space-y-3">
                    {upcoming.map((event) => (
                      <div
                        key={event.id}
                        className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex justify-between items-center"
                      >
                        <div>
                          <div className="font-medium text-slate-100">{event.title}</div>
                          <div className="text-sm text-slate-400">
                            {event.date || event.start_date ? new Date(event.date || event.start_date).toLocaleString() : '—'}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                          {event.joy_coin_enabled && event.joy_coin_cost > 0 && (
                            <span className="text-amber-500">{event.joy_coin_cost} coin(s)</span>
                          )}
                          <span>—</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                className="bg-transparent border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent"
                onClick={() => setActiveTab('events')}
              >
                Create Event
              </Button>
              <Button
                variant="outline"
                className="bg-transparent border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent"
                onClick={() => setActiveTab('joy-coins')}
              >
                Joy Coin Hours
              </Button>
              <Button
                variant="outline"
                className="bg-transparent border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent"
                onClick={() => setActiveTab('revenue')}
              >
                View Revenue
              </Button>
            </div>
          </>
        )}

        {activeTab === 'joy-coins' && (
          <AccessWindowManager business={selectedBusiness} currentUserId={currentUser?.id} />
        )}

        {activeTab === 'revenue' && (
          <RevenueOverview business={selectedBusiness} />
        )}

        {activeTab === 'events' && (
          <EventsWidget
            business={selectedBusiness}
            allowEdit={true}
            userRole={userRole}
            onEnterCheckIn={setCheckInEvent}
          />
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <BusinessSettings business={selectedBusiness} currentUserId={currentUser?.id} />
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