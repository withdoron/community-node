/**
 * MyLaneDrillView — renders a workspace tab component inside Mylane.
 * Uses the same WORKSPACE_TYPES config and tab components as BusinessDashboard.
 * Fetches workspace-specific data (team members, FS worker role, business revenue, etc.) on demand.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WORKSPACE_TYPES, getBusinessTabs, ARCHETYPE_TITLES } from '@/config/workspaceTypes';
import { useBusinessRevenue } from '@/hooks/useBusinessRevenue';
import { toast } from 'sonner';

// Map drill workspace names to WORKSPACE_TYPES keys
const WORKSPACE_KEY_MAP = {
  'field-service': 'fieldservice',
  'team': 'team',
  'finance': 'finance',
  'property-pulse': 'property_management',
  'meal-prep': 'meal_prep',
  'business': 'business',
};

export default function MyLaneDrillView({
  drilledView, // { workspace, view, tab }
  currentUser,
  fieldServiceProfiles = [],
  financeProfiles = [],
  allTeams = [],
  propertyMgmtProfiles = [],
  mealPrepProfiles = [],
  businessProfiles = [],
}) {
  const [activeTab, setActiveTab] = useState(drilledView.tab || 'home');
  const [checkInEvent, setCheckInEvent] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const wsKey = WORKSPACE_KEY_MAP[drilledView.workspace];
  const wsConfig = wsKey ? WORKSPACE_TYPES[wsKey] : null;

  // Get the profile for this workspace
  const profile =
    drilledView.workspace === 'field-service' ? fieldServiceProfiles?.[0] :
    drilledView.workspace === 'finance' ? financeProfiles?.[0] :
    drilledView.workspace === 'team' ? allTeams?.[0] :
    drilledView.workspace === 'property-pulse' ? propertyMgmtProfiles?.[0] :
    drilledView.workspace === 'meal-prep' ? mealPrepProfiles?.[0] :
    drilledView.workspace === 'business' ? businessProfiles?.[0] :
    null;

  // Fetch team members when drilling into team workspace
  const teamId = drilledView.workspace === 'team' ? profile?.id : null;
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['mylane-drill-team-members', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const list = await base44.entities.TeamMember.filter({ team_id: teamId, status: 'active' });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!teamId, staleTime: 5 * 60 * 1000,
  });

  // Determine FS worker role when drilling into field service
  const fsProfile = drilledView.workspace === 'field-service' ? profile : null;
  const fsIsOwner = fsProfile ? fsProfile.user_id === currentUser?.id : false;
  const fsWorkerRole = fsProfile && !fsIsOwner ? (fsProfile._workerRole || null) : null;

  // Determine PM roles
  const pmProfile = drilledView.workspace === 'property-pulse' ? profile : null;
  const pmIsOwner = pmProfile ? pmProfile.user_id === currentUser?.id : false;

  // Business workspace: revenue + events + RSVP counts
  // useBusinessRevenue returns analytics as top-level fields, not nested under 'revenue'.
  // DashboardHome expects a 'revenue' object — assemble it here with full null guards.
  const businessId = drilledView.workspace === 'business' ? profile?.id : null;
  const revenueData = useBusinessRevenue(businessId);
  const revenue = {
    totalRedemptions: revenueData?.totalRedemptions ?? 0,
    totalCoinsRedeemed: revenueData?.totalCoinsRedeemed ?? 0,
    uniqueFamilies: revenueData?.uniqueFamilies ?? 0,
    redemptionsByEvent: revenueData?.redemptionsByEvent ?? [],
    redemptionsByDay: revenueData?.redemptionsByDay ?? [],
    estimatedPerCoinValue: revenueData?.estimatedPerCoinValue ?? 0,
    estimatedPayout: revenueData?.estimatedPayout ?? 0,
    isLoading: revenueData?.isLoading ?? false,
    error: revenueData?.error ?? null,
  };

  const { data: businessEvents = [] } = useQuery({
    queryKey: ['mylane-drill-business-events', businessId],
    queryFn: async () => {
      if (!businessId) return [];
      const events = await base44.entities.Event.filter({ business_id: businessId, is_active: true });
      return Array.isArray(events) ? events : events ? [events] : [];
    },
    enabled: !!businessId, staleTime: 5 * 60 * 1000,
  });

  const { data: eventRsvpCounts = {} } = useQuery({
    queryKey: ['mylane-drill-rsvp-counts', businessId],
    queryFn: async () => {
      if (!businessEvents.length) return {};
      const counts = {};
      for (const evt of businessEvents) {
        try {
          const rsvps = await base44.entities.EventRSVP.filter({ event_id: evt.id });
          counts[evt.id] = Array.isArray(rsvps) ? rsvps.length : 0;
        } catch { counts[evt.id] = 0; }
      }
      return counts;
    },
    enabled: businessEvents.length > 0, staleTime: 5 * 60 * 1000,
  });

  const businessIsOwner = profile && drilledView.workspace === 'business'
    ? String(profile.owner_user_id) === String(currentUser?.id) : false;
  const businessUserRole = businessIsOwner ? 'owner' : 'staff';

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Business.update(id, { is_deleted: true, status: 'deleted' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownedBusinesses'] });
      toast.success('Business deleted');
    },
  });

  if (!wsConfig || !profile) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">This workspace is not available.</p>
      </div>
    );
  }

  // Business uses archetype-driven tabs
  const tabs = drilledView.workspace === 'business'
    ? getBusinessTabs(profile.archetype || 'location')
    : wsConfig.tabs;
  const activeTabConfig = tabs.find((t) => t.id === activeTab) || tabs[0];

  // Build scope object matching BusinessDashboard patterns
  let scope = {};
  switch (drilledView.workspace) {
    case 'business':
      scope = {
        business: profile,
        currentUser,
        userRole: businessUserRole,
        revenue,
        businessEvents,
        eventRsvpCounts,
        setActiveTab,
        setCheckInEvent,
        setDeleteDialogOpen,
        deleteMutation,
        isOwner: businessIsOwner,
      };
      break;
    case 'field-service':
      scope = {
        profile,
        currentUser,
        onNavigateTab: setActiveTab,
        isOwner: fsIsOwner,
        workerRole: fsWorkerRole,
        features: profile.features || {},
      };
      break;
    case 'team': {
      const currentTeamMember = teamMembers.find((m) => m.user_id === currentUser?.id);
      const rawRole = currentTeamMember?.role;
      const effectiveRole = rawRole === 'assistant_coach' ? 'coach' : rawRole;
      scope = {
        team: profile,
        members: teamMembers,
        currentUserId: currentUser?.id,
        isCoach: effectiveRole === 'coach',
        onNavigateTab: setActiveTab,
        onCopyInviteLink: () => {
          const code = profile?.invite_code;
          if (code) { navigator.clipboard.writeText(`${window.location.origin}/join/${code}`); toast.success('Family link copied'); }
        },
        onArchived: () => {},
        viewingAsMember: null,
        effectiveRole,
        effectivePosition: null,
      };
      break;
    }
    case 'finance':
      scope = {
        profile,
        currentUser,
        onNavigateTab: setActiveTab,
      };
      break;
    case 'property-pulse':
      scope = {
        profile,
        currentUser,
        onNavigateTab: setActiveTab,
        memberRole: pmIsOwner ? 'admin' : 'viewer',
        isAdmin: pmIsOwner,
        canEdit: pmIsOwner,
        isTenant: false,
        isOwner: pmIsOwner,
      };
      break;
    case 'meal-prep':
      scope = {
        profile,
        currentUser,
        onNavigateTab: setActiveTab,
      };
      break;
    default:
      break;
  }

  if (!activeTabConfig) return null;

  const TabComponent = activeTabConfig.component;
  const props = activeTabConfig.getProps ? activeTabConfig.getProps(scope) : {};

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto flex-nowrap pb-1 mb-4 scrollbar-hide border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap transition-colors min-h-[44px] ${
                isActive
                  ? 'text-primary border-b-2 border-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground-soft'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <TabComponent {...props} />
    </div>
  );
}
