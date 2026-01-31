import React, { useState, useEffect } from 'react';
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
        const allSettings = await base44.entities.AdminSettings.list();
        const inviteSettings = (allSettings || []).filter((s) => s.key?.startsWith('staff_invites:'));

        for (const setting of inviteSettings) {
          const businessId = setting.key.replace('staff_invites:', '');
          let invites = [];
          try {
            invites = JSON.parse(setting.value) || [];
          } catch {
            continue;
          }

          const myInvite = invites.find(
            (inv) => (inv.email || '').toLowerCase() === (currentUser.email || '').toLowerCase()
          );

          if (myInvite) {
            console.log('[Dashboard] Found pending invite for', currentUser.email, 'at business', businessId);

            const business = await base44.entities.Business.get(businessId);
            const currentInstructors = business.instructors || [];
            if (!currentInstructors.includes(currentUser.id)) {
              await base44.entities.Business.update(businessId, {
                instructors: [...currentInstructors, currentUser.id],
              });
            }

            const rolesKey = `staff_roles:${businessId}`;
            const rolesSettings = await base44.entities.AdminSettings.filter({ key: rolesKey });
            let currentRoles = [];
            if (rolesSettings.length > 0) {
              try {
                currentRoles = JSON.parse(rolesSettings[0].value) || [];
              } catch {}
            }

            if (!currentRoles.some((r) => r.user_id === currentUser.id)) {
              const newRole = {
                user_id: currentUser.id,
                role: myInvite.role || 'instructor',
                added_at: new Date().toISOString(),
              };
              const updatedRoles = [...currentRoles, newRole];

              if (rolesSettings.length > 0) {
                await base44.entities.AdminSettings.update(rolesSettings[0].id, {
                  value: JSON.stringify(updatedRoles),
                });
              } else {
                await base44.entities.AdminSettings.create({
                  key: rolesKey,
                  value: JSON.stringify(updatedRoles),
                });
              }
            }

            const updatedInvites = invites.filter(
              (inv) => (inv.email || '').toLowerCase() !== (currentUser.email || '').toLowerCase()
            );
            await base44.entities.AdminSettings.update(setting.id, {
              value: JSON.stringify(updatedInvites),
            });

            console.log('[Dashboard] Auto-linked user to business', businessId);
          }
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

  // Hard delete: Business.delete(id) removes record permanently. Fallback to soft delete if delete not available.
  const deleteMutation = useMutation({
    mutationFn: async (businessId) => {
      console.log('[Dashboard Delete] Starting delete for business id:', businessId);
      try {
        if (typeof base44.entities.Business.delete === 'function') {
          await base44.entities.Business.delete(businessId);
          console.log('[Dashboard Delete] Business.delete(id) succeeded');
        } else {
          try {
            await base44.entities.Business.update(businessId, { is_deleted: true });
            console.log('[Dashboard Delete] Business.update(is_deleted: true) succeeded');
          } catch (e) {
            await base44.entities.Business.update(businessId, { status: 'deleted' });
            console.log('[Dashboard Delete] Business.update(status: deleted) succeeded');
          }
        }
        console.log('[Dashboard Delete] Delete succeeded for id:', businessId);
      } catch (err) {
        console.error('[Dashboard Delete] Error in deleteMutation:', err);
        throw err;
      }
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
  const isOwner = userRole === 'owner';
  const isStaff = userRole === 'staff';

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
              {userRole === 'owner' ? (
                <Badge className="ml-2 bg-amber-500 text-black">OWNER</Badge>
              ) : (
                <Badge variant="outline" className="ml-2 border-amber-500 text-amber-500">TEAM</Badge>
              )}
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

        {/* Staff - Owners and Staff (Venue/Location) */}
        {config.widgets.includes('Staff') && (isOwner || isStaff) && (
          <StaffWidget business={selectedBusiness} currentUserId={currentUser?.id} />
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