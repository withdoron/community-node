import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getGreeting } from '@/utils/greeting';
import BusinessCard from '@/components/dashboard/BusinessCard';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Store, Wallet, Ticket, Plus, Loader2, Users } from "lucide-react";
import { useBusinessRevenue } from '@/hooks/useBusinessRevenue';
import { useRole } from '@/hooks/useRole';
import { CheckInMode } from '@/components/dashboard/CheckInMode';
import { ARCHETYPE_TITLES, getBusinessTabs, WORKSPACE_TYPES } from '@/config/workspaceTypes';
import TeamContextSwitcher from '@/components/team/TeamContextSwitcher';
import { toast } from "sonner";

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checkInEvent, setCheckInEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [viewingAsPlayerId, setViewingAsPlayerId] = useState(null);

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });
  const { isAppAdmin } = useRole();

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

  // Sync selectedTeamId from URL (?team=id) when coming back from TeamOnboarding
  useEffect(() => {
    const teamId = searchParams.get('team');
    if (teamId) {
      setSelectedTeamId(teamId);
      setSelectedBusinessId(null);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch teams where user has ANY membership (owner, assistant_coach, player, parent)
  const { data: myTeamMemberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['my-team-memberships', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const result = await base44.entities.TeamMember.filter({ user_id: currentUser.id, status: 'active' });
      return Array.isArray(result) ? result : result ? [result] : [];
    },
    enabled: !!currentUser?.id,
  });

  const teamIdsFromMemberships = [...new Set((myTeamMemberships || []).map((m) => m.team_id).filter(Boolean))];

  const { data: allTeams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['dashboard-teams', currentUser?.id, teamIdsFromMemberships.sort().join(',')],
    queryFn: async () => {
      if (teamIdsFromMemberships.length === 0) return [];
      const teams = await Promise.all(
        teamIdsFromMemberships.map((id) => base44.entities.Team.get(id))
      );
      const active = (teams || []).filter((t) => t && t.status === 'active');
      const byOwner = (a, b) => {
        const aOwn = a.owner_id === currentUser?.id ? 1 : 0;
        const bOwn = b.owner_id === currentUser?.id ? 1 : 0;
        if (bOwn !== aOwn) return bOwn - aOwn;
        return (a.name || '').localeCompare(b.name || '');
      };
      return active.sort(byOwner);
    },
    enabled: !!currentUser?.id && teamIdsFromMemberships.length > 0,
  });

  // Team members for selected team
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members', selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const list = await base44.entities.TeamMember.filter(
        { team_id: selectedTeamId, status: 'active' }
      );
      return Array.isArray(list) ? list : [];
    },
    enabled: !!selectedTeamId,
  });

  // Parent-child context: parent records and effective view (for team workspace only)
  const parentRecords = (teamMembers || []).filter(
    (m) => m.user_id === currentUser?.id && m.role === 'parent'
  );
  const isParent = parentRecords.length > 0;
  const viewingAsMember = viewingAsPlayerId
    ? (teamMembers || []).find((m) => m.id === viewingAsPlayerId)
    : null;
  const effectivePosition = viewingAsMember?.position ?? null;
  const currentTeamMember = (teamMembers || []).find((m) => m.user_id === currentUser?.id);
  const effectiveRole = viewingAsMember ? viewingAsMember.role : currentTeamMember?.role;

  // Member counts per team (for landing cards)
  const { data: teamMemberCounts = {} } = useQuery({
    queryKey: ['team-member-counts', allTeams.map((t) => t.id).join(',')],
    queryFn: async () => {
      const counts = {};
      await Promise.all(
        allTeams.map(async (t) => {
          const list = await base44.entities.TeamMember.filter({ team_id: t.id, status: 'active' });
          counts[t.id] = Array.isArray(list) ? list.length : 0;
        })
      );
      return counts;
    },
    enabled: allTeams.length > 0,
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

  // RSVP counts per event (for Home tab Upcoming Events)
  const { data: eventRsvpCounts = {} } = useQuery({
    queryKey: ['event-rsvp-counts', selectedBusinessId, businessEvents.map((e) => e.id).join(',')],
    queryFn: async () => {
      const counts = {};
      await Promise.all(
        businessEvents.map(async (e) => {
          const list = await base44.entities.RSVP.filter({ event_id: e.id, is_active: true });
          counts[e.id] = list.length;
        })
      );
      return counts;
    },
    enabled: !!selectedBusinessId && businessEvents.length > 0,
  });

  const revenue = useBusinessRevenue(selectedBusinessId);

  // Clear selectedTeamId if team no longer in list (e.g. archived)
  useEffect(() => {
    if (selectedTeamId && allTeams.length > 0 && !allTeams.find((t) => t.id === selectedTeamId)) {
      setSelectedTeamId(null);
    }
  }, [selectedTeamId, allTeams]);

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

  const isLoading = userLoading || businessesLoading || membershipsLoading || teamsLoading;

  const getUserRole = (business) => {
    if (business?.owner_user_id === currentUser?.id) return 'owner';
    if (business?.instructors?.includes(currentUser?.id)) return 'staff';
    return 'none';
  };

  const renderTypePickerModal = () => (
    <Dialog open={typePickerOpen} onOpenChange={setTypePickerOpen}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Add workspace</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {availableTypes.map((type) => {
            const Icon = type.icon === 'Users' ? Users : Store;
            const handleChoose = () => {
              setTypePickerOpen(false);
              if (type.id === 'business') navigate(createPageUrl('BusinessOnboarding'));
              else if (type.id === 'team') navigate(createPageUrl('TeamOnboarding'));
            };
            return (
              <button
                key={type.id}
                type="button"
                onClick={handleChoose}
                className="flex items-start gap-4 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-left transition-colors min-h-[44px]"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <div className="font-semibold text-slate-100">{type.label}</div>
                  <div className="text-sm text-slate-400">{type.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasAnyWorkspace = (associatedBusinesses?.length > 0) || (allTeams?.length > 0);
  const availableTypes = Object.values(WORKSPACE_TYPES).filter((t) => t.available);

  // STEP 1: No workspaces — empty state with type picker
  if (!hasAnyWorkspace) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="bg-slate-900 border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-amber-500" />
              <div>
                <h1 className="text-lg font-bold text-slate-100">Workspaces</h1>
                <p className="text-xs text-slate-400">Manage the things you lead</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-6 py-16">
          <div className="text-center">
            <div className="h-20 w-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Store className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-3">No workspaces yet</h2>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Create a business or team to get started.
            </p>
            <Button
              onClick={() => setTypePickerOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8 py-6 text-lg min-h-[44px]"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Workspace
            </Button>
            <p className="text-sm text-slate-500 mt-6">
              Or <Link to={createPageUrl('MyLane')} className="text-amber-500 hover:text-amber-400 underline">go to your personal dashboard</Link>
            </p>
          </div>
        </div>
        {renderTypePickerModal()}
      </div>
    );
  }

  // STEP 2: Has workspaces but none selected — landing with business + team cards
  if (!selectedBusinessId && !selectedTeamId) {
    return (
      <div className="min-h-screen bg-slate-950">
        {/* Personal Header - "Wallet Strip" */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-100">
                  {getGreeting()}, {(currentUser?.data?.display_name || currentUser?.data?.full_name || currentUser?.full_name || 'there').split(' ')[0]}
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
              <h2 className="text-2xl font-bold text-slate-100">My Workspaces</h2>
              <p className="text-slate-400 text-sm mt-1">
                Manage the things you lead
              </p>
            </div>
            <Button
              onClick={() => setTypePickerOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Workspace
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {associatedBusinesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                userRole={getUserRole(business)}
                eventCount={eventCounts[business.id] || 0}
                onClick={() => { setSelectedBusinessId(business.id); setSelectedTeamId(null); setActiveTab('home'); }}
                workspaceTypeLabel="Business"
              />
            ))}
            {allTeams.map((team) => {
              const membership = myTeamMemberships.find((m) => m.team_id === team.id);
              const roleLabel = team.owner_id === currentUser?.id ? 'HEAD COACH' : (membership?.role === 'assistant_coach' ? 'COACH' : membership?.role === 'player' ? 'PLAYER' : membership?.role === 'parent' ? 'PARENT' : 'MEMBER');
              return (
                <div
                  key={team.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { setSelectedTeamId(team.id); setSelectedBusinessId(null); setActiveTab('home'); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedTeamId(team.id); setSelectedBusinessId(null); setActiveTab('home'); } }}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-6 cursor-pointer transition-colors min-h-[44px]"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-lg text-slate-100 truncate">{team.name}</h3>
                        <Badge className="bg-amber-500 text-black text-xs">{roleLabel}</Badge>
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Team</span>
                      </div>
                      <p className="text-sm text-slate-400 mb-1">
                        {team.sport === 'flag_football' ? 'Flag Football' : team.sport || 'Team'} · {team.format || '—'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {teamMemberCounts[team.id] ?? 0} players · {team.season || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {renderTypePickerModal()}
      </div>
    );
  }

  const selectedTeam = allTeams.find((t) => t.id === selectedTeamId);

  // STEP 3a: Team selected — show team workspace
  if (selectedTeamId && selectedTeam) {
    const teamTabs = WORKSPACE_TYPES.team.tabs;
    const teamScope = {
      team: selectedTeam,
      members: teamMembers,
      currentUserId: currentUser?.id,
      isCoach: selectedTeam.owner_id === currentUser?.id,
      onNavigateTab: setActiveTab,
      onCopyInviteLink: () => {
        const link = selectedTeam.invite_code ? `locallane.app/join/${selectedTeam.invite_code}` : '';
        if (link) {
          navigator.clipboard.writeText(link);
          toast.success('Invite link copied');
        }
      },
      onArchived: () => {
        setSelectedTeamId(null);
        queryClient.invalidateQueries({ queryKey: ['my-team-memberships', currentUser?.id] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-teams'] });
      },
      viewingAsMember,
      effectiveRole,
      effectivePosition,
    };

    return (
      <div className="min-h-screen bg-slate-950">
        <div className="bg-slate-900 border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedTeamId(null); setSelectedBusinessId(null); setViewingAsPlayerId(null); }}
                className="text-slate-400 hover:text-slate-100 min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Workspaces
              </Button>
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-amber-500" />
                <div>
                  <h1 className="text-lg font-bold text-slate-100">{selectedTeam.name}</h1>
                  <p className="text-xs text-slate-400">
                    {selectedTeam.sport === 'flag_football' ? 'Flag Football' : selectedTeam.sport || 'Team'} · {selectedTeam.format || ''}
                  </p>
                </div>
                {(() => {
                  const memberRecord = (teamMembers || []).find((m) => m.user_id === currentUser?.id);
                  const role = memberRecord?.role;
                  const isOwner = selectedTeam.owner_id === currentUser?.id;
                  const badgeText = isOwner || role === 'coach' ? 'HEAD COACH' : role === 'assistant_coach' ? 'COACH' : role === 'player' ? 'PLAYER' : role === 'parent' ? 'PARENT' : 'MEMBER';
                  return <Badge className="ml-2 bg-amber-500 text-black">{badgeText}</Badge>;
                })()}
              </div>
            </div>
          </div>
          <div className="flex gap-1 px-6 overflow-x-auto flex-nowrap pb-1">
            {teamTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors min-h-[44px] ${isActive ? 'text-amber-500 border-b-2 border-amber-500 font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          {isParent && (
            <TeamContextSwitcher
              parentRecords={parentRecords}
              teamMembers={teamMembers}
              viewingAsPlayerId={viewingAsPlayerId}
              onSwitch={setViewingAsPlayerId}
            />
          )}
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8">
          {(() => {
            const activeTabConfig = teamTabs.find((t) => t.id === activeTab);
            if (!activeTabConfig) return null;
            const TabComponent = activeTabConfig.component;
            const props = activeTabConfig.getProps ? activeTabConfig.getProps(teamScope) : {};
            const extraProps =
              activeTabConfig.id === 'home'
                ? { viewingAsMember, effectiveRole }
                : activeTabConfig.id === 'playbook'
                  ? { playerPosition: effectivePosition }
                  : activeTabConfig.id === 'schedule'
                    ? { teamId: selectedTeam?.id, teamScope }
                    : activeTabConfig.id === 'messages'
                      ? { teamId: selectedTeam?.id, teamScope }
                      : {};
            return <TabComponent {...props} {...extraProps} />;
          })()}
        </div>
      </div>
    );
  }

  const selectedBusiness = associatedBusinesses.find(b => b.id === selectedBusinessId);
  if (selectedTeamId && !selectedTeam) return null;
  if (!selectedBusiness) return null;

  // STEP 3b: Business selected — show business workspace

  const userRole = getUserRole(selectedBusiness);
  const archetype = selectedBusiness.archetype || 'location';
  const archetypeTitle = ARCHETYPE_TITLES[archetype] || 'Business Dashboard';
  const isOwner = userRole === 'owner';
  const tabs = getBusinessTabs(archetype);

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
              onClick={() => { setSelectedBusinessId(null); setSelectedTeamId(null); }}
              className="text-slate-400 hover:text-slate-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workspaces
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
        {/* Tab bar — config-driven */}
        <div className="flex gap-1 px-6 overflow-x-auto flex-nowrap pb-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${isActive ? 'text-amber-500 border-b-2 border-amber-500 font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content — config-driven */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {(() => {
          const activeTabConfig = tabs.find((t) => t.id === activeTab);
          if (!activeTabConfig) return null;
          const scope = {
            business: selectedBusiness,
            currentUser,
            userRole,
            revenue,
            businessEvents,
            eventRsvpCounts,
            setActiveTab,
            setCheckInEvent,
            setDeleteDialogOpen,
            deleteMutation,
            isOwner,
          };
          const TabComponent = activeTabConfig.component;
          const props = activeTabConfig.getProps ? activeTabConfig.getProps(scope) : {};
          return <TabComponent {...props} />;
        })()}
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