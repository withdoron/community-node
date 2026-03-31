import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { ArrowLeft, Store, Plus, Loader2, Users, DollarSign, HardHat, Building2, ChevronRight, MessageCircle, LogIn } from "lucide-react";
import { useBusinessRevenue } from '@/hooks/useBusinessRevenue';
import { useRole } from '@/hooks/useRole';
import { CheckInMode } from '@/components/dashboard/CheckInMode';
import { ARCHETYPE_TITLES, getBusinessTabs, WORKSPACE_TYPES } from '@/config/workspaceTypes';
import AgentChatButton from '@/components/fieldservice/AgentChatButton';
import TeamContextSwitcher from '@/components/team/TeamContextSwitcher';
import { toast } from "sonner";
import CommunityPulse from '@/components/dashboard/CommunityPulse';
import MyLaneSurface from '@/components/mylane/MyLaneSurface';
import MylanePanel from '@/components/mylane/MylanePanel';
import MylaneMobileSheet from '@/components/mylane/MylaneMobileSheet';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Revolving "Add a ___" Button ────────────────────────────────

const REVOLVING_WORDS = ['workspace', 'playspace', 'garden', 'room', 'plot', 'space', 'fruit'];

function RevolvingAddButton({ onClick }) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * REVOLVING_WORDS.length));
  const [visible, setVisible] = useState(true);
  const hoveredRef = useRef(false);
  const intervalRef = useRef(null);

  const startCycle = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (hoveredRef.current) return;
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % REVOLVING_WORDS.length);
        setVisible(true);
      }, 300);
    }, 3000);
  }, []);

  useEffect(() => {
    startCycle();
    return () => clearInterval(intervalRef.current);
  }, [startCycle]);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => { hoveredRef.current = true; }}
      onMouseLeave={() => { hoveredRef.current = false; }}
      className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition-colors min-h-[44px] min-w-[200px] cursor-pointer"
    >
      <Plus className="h-4 w-4 shrink-0" />
      <span className="text-slate-800">Add a</span>{' '}
      <span
        className="text-black font-bold transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {REVOLVING_WORDS[index]}
      </span>
    </button>
  );
}

// ─── Workspace Picker Groups ─────────────────────────────────────

const WORKSPACE_GROUPS = [
  {
    header: 'For your community',
    types: ['business'],
  },
  {
    header: 'For your work',
    types: ['fieldservice', 'property_management'],
  },
  {
    header: 'For your team',
    types: ['team'],
  },
  {
    header: 'For yourself',
    types: ['finance'],
  },
];

export default function BusinessDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [selectedFinanceId, setSelectedFinanceId] = useState(null);
  const [selectedFieldServiceId, setSelectedFieldServiceId] = useState(null);
  const [selectedPropertyMgmtId, setSelectedPropertyMgmtId] = useState(null);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [checkInEvent, setCheckInEvent] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [myLaneMode, setMyLaneMode] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mylaneCollapsed, setMylaneCollapsed] = useState(() => {
    try { return localStorage.getItem('mylane_panel_collapsed') === 'true'; } catch { return false; }
  });
  const [viewingAsPlayerId, setViewingAsPlayerId] = useState(null);
  const [comingSoonType, setComingSoonType] = useState(null);
  const [teamJoinStep, setTeamJoinStep] = useState(null); // null | 'choice' | 'code'
  const [teamInviteCode, setTeamInviteCode] = useState('');
  const [teamInviteError, setTeamInviteError] = useState('');
  const isMobile = useIsMobile();
  const agentMessageRef = useRef(null);

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
        return result;
      }
      const allBusinesses = await base44.entities.Business.list('-created_date', 500);
      const result = (allBusinesses || []).filter(
        (b) =>
          b.instructors?.includes(currentUser.id) &&
          b.owner_user_id !== currentUser.id
      );
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

  // Handle URL params: ?landing=1 resets to grid, ?team=id / ?finance=id opens workspace
  useEffect(() => {
    const landing = searchParams.get('landing');
    if (landing) {
      setSelectedBusinessId(null);
      setSelectedTeamId(null);
      setSelectedFinanceId(null);
      setSelectedFieldServiceId(null);
      setSelectedPropertyMgmtId(null);
      setActiveTab('home');
      setSearchParams({}, { replace: true });
      return;
    }
    const teamId = searchParams.get('team');
    if (teamId) {
      setSelectedTeamId(teamId);
      setSelectedBusinessId(null);
      setSelectedFinanceId(null);
      setSelectedFieldServiceId(null);
      setSelectedPropertyMgmtId(null);
      setSearchParams({}, { replace: true });
    }
    const financeId = searchParams.get('finance');
    if (financeId) {
      setSelectedFinanceId(financeId);
      setSelectedBusinessId(null);
      setSelectedTeamId(null);
      setSelectedFieldServiceId(null);
      setSelectedPropertyMgmtId(null);
      setSearchParams({}, { replace: true });
    }
    const fsId = searchParams.get('fieldservice');
    if (fsId) {
      setSelectedFieldServiceId(fsId);
      setSelectedBusinessId(null);
      setSelectedTeamId(null);
      setSelectedFinanceId(null);
      setSelectedPropertyMgmtId(null);
      setSearchParams({}, { replace: true });
    }
    const pmId = searchParams.get('property_management');
    if (pmId) {
      setSelectedPropertyMgmtId(pmId);
      setSelectedBusinessId(null);
      setSelectedTeamId(null);
      setSelectedFinanceId(null);
      setSelectedFieldServiceId(null);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Fetch teams where user has ANY membership (owner, coach, player, parent)
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
  // Normalize: treat legacy 'assistant_coach' records as 'coach'
  const rawRole = viewingAsMember ? viewingAsMember.role : currentTeamMember?.role;
  const effectiveRole = rawRole === 'assistant_coach' ? 'coach' : rawRole;

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

  // Fetch finance profiles for current user
  const { data: financeProfiles = [], isLoading: financeLoading } = useQuery({
    queryKey: ['finance-profiles', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const list = await base44.entities.FinancialProfile.filter({ user_id: currentUser.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!currentUser?.id,
  });

  // Fetch field service profiles for current user (owned)
  const { data: ownedFSProfiles = [], isLoading: fsLoading } = useQuery({
    queryKey: ['fs-profiles', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const list = await base44.entities.FieldServiceProfile.filter({ user_id: currentUser.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!currentUser?.id,
  });

  // Fetch joined FS workspaces (worker/sub) from localStorage
  const { data: joinedFSProfiles = [] } = useQuery({
    queryKey: ['fs-joined-profiles', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const raw = localStorage.getItem('joinedFSWorkspaces');
        if (!raw) return [];
        const joined = JSON.parse(raw);
        if (!Array.isArray(joined)) return [];
        // Try to load each joined workspace
        const results = await Promise.all(
          joined.map(async (entry) => {
            try {
              const list = await base44.entities.FieldServiceProfile.filter({ id: entry.id });
              const profile = Array.isArray(list) ? list[0] : list;
              if (profile) return { ...profile, _workerRole: entry.role || 'worker' };
              return null;
            } catch {
              // RLS may block — return cached entry as fallback
              return { id: entry.id, workspace_name: entry.name || 'Field Service', _workerRole: entry.role || 'worker', _cached: true };
            }
          })
        );
        return results.filter(Boolean);
      } catch { return []; }
    },
    enabled: !!currentUser?.id,
  });

  // Merge owned + joined FS profiles (dedup by id)
  const fieldServiceProfiles = React.useMemo(() => {
    const ownedIds = new Set(ownedFSProfiles.map((p) => p.id));
    const merged = [...ownedFSProfiles];
    joinedFSProfiles.forEach((jp) => {
      if (!ownedIds.has(jp.id)) merged.push(jp);
    });
    return merged;
  }, [ownedFSProfiles, joinedFSProfiles]);

  // Fetch PM profiles: owned workspaces
  const { data: ownedPMProfiles = [], isLoading: pmLoading } = useQuery({
    queryKey: ['pm-profiles', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const list = await base44.entities.PMPropertyProfile.filter({ user_id: currentUser.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!currentUser?.id,
  });

  // Fetch PM memberships: joined workspaces
  const { data: pmMemberships = [] } = useQuery({
    queryKey: ['pm-memberships', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      try {
        const list = await base44.entities.PMWorkspaceMember.filter({ user_id: currentUser.id, status: 'active' });
        return Array.isArray(list) ? list : [];
      } catch { return []; }
    },
    enabled: !!currentUser?.id,
  });

  // Fetch profiles for joined workspaces and merge with owned
  const { data: joinedPMProfiles = [] } = useQuery({
    queryKey: ['pm-joined-profiles', pmMemberships.map((m) => m.profile_id).join(',')],
    queryFn: async () => {
      const ownedIds = new Set(ownedPMProfiles.map((p) => p.id));
      const joinedProfileIds = pmMemberships
        .map((m) => m.profile_id)
        .filter((id) => id && !ownedIds.has(id));
      if (joinedProfileIds.length === 0) return [];
      const profiles = [];
      for (const id of [...new Set(joinedProfileIds)]) {
        try {
          const p = await base44.entities.PMPropertyProfile.get(id);
          if (p) profiles.push(p);
        } catch {}
      }
      return profiles;
    },
    enabled: pmMemberships.length > 0,
  });

  // Merge: owned profiles (role=admin) + joined profiles (role from membership)
  const propertyMgmtProfiles = [
    ...ownedPMProfiles.map((p) => ({ ...p, _memberRole: 'admin' })),
    ...joinedPMProfiles.map((p) => {
      const membership = pmMemberships.find((m) => m.profile_id === p.id);
      return { ...p, _memberRole: membership?.role || 'tenant' };
    }),
  ];

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

  // Scroll to top when switching tabs or workspaces
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab, selectedBusinessId, selectedTeamId, selectedFinanceId, selectedFieldServiceId, selectedPropertyMgmtId]);

  // Signal to Layout when an agent-enabled workspace is active (hides global feedback button)
  const agentActive = !!(selectedFieldServiceId || selectedTeamId || selectedFinanceId || selectedPropertyMgmtId || myLaneMode);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('agent-active', { detail: agentActive }));
    return () => { window.dispatchEvent(new CustomEvent('agent-active', { detail: false })); };
  }, [agentActive]);

  // Server-side cascade delete via manageBusinessWorkspace
  const deleteMutation = useMutation({
    mutationFn: async (businessId) => {
      const result = await base44.functions.invoke('manageBusinessWorkspace', {
        action: 'delete_workspace_cascade',
        business_id: businessId,
      });
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
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

  const isLoading = userLoading || businessesLoading || membershipsLoading || teamsLoading || financeLoading || fsLoading || pmLoading;

  const getUserRole = (business) => {
    if (business?.owner_user_id === currentUser?.id) return 'owner';
    if (business?.instructors?.includes(currentUser?.id)) return 'staff';
    return 'none';
  };

  const TYPE_ICON_MAP = { Users, Store, DollarSign, HardHat, Building2 };

  const TESTING_MODE_LABELS = { fieldservice: 'contractors', property_management: 'property managers' };

  const renderTypePickerModal = () => (
    <>
      <Dialog open={typePickerOpen} onOpenChange={setTypePickerOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100">What do you want to grow?</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {WORKSPACE_GROUPS.map((group) => {
              const groupTypes = group.types
                .map((id) => availableTypes.find((t) => t.id === id))
                .filter(Boolean);
              if (groupTypes.length === 0) return null;
              return (
                <div key={group.header}>
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-2 px-1">{group.header}</p>
                  <div className="grid gap-2">
                    {groupTypes.map((type) => {
                      const Icon = TYPE_ICON_MAP[type.icon] || Store;
                      const isTestingLocked = type.testingMode && !isAppAdmin;
                      const handleChoose = () => {
                        if (isTestingLocked) {
                          setComingSoonType(type);
                          return;
                        }
                        if (type.id === 'team') {
                          setTypePickerOpen(false);
                          setTeamJoinStep('choice');
                          setTeamInviteCode('');
                          setTeamInviteError('');
                          return;
                        }
                        setTypePickerOpen(false);
                        if (type.id === 'business') navigate(createPageUrl('BusinessOnboarding'));
                        else if (type.id === 'finance') navigate(createPageUrl('FinanceOnboarding'));
                        else if (type.id === 'fieldservice') navigate(createPageUrl('FieldServiceOnboarding'));
                        else if (type.id === 'property_management') navigate(createPageUrl('PropertyManagementOnboarding'));
                      };
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={handleChoose}
                          className={`relative flex items-start gap-4 p-4 rounded-xl bg-slate-800 border text-left transition-colors min-h-[44px] ${isTestingLocked ? 'border-amber-500/30 hover:border-amber-500/60' : 'border-slate-700 hover:border-amber-500/50'}`}
                        >
                          {isTestingLocked && (
                            <span className="absolute top-2 right-3 text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Coming Soon</span>
                          )}
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
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!comingSoonType} onOpenChange={(open) => !open && setComingSoonType(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Coming Soon</DialogTitle>
          </DialogHeader>
          <p className="text-slate-300 text-sm leading-relaxed">
            We're building this with real local {TESTING_MODE_LABELS[comingSoonType?.id] || 'professionals'}. Interested in early access? Reach out at{' '}
            <a href="mailto:hello@locallane.app" className="text-amber-500 hover:text-amber-400 underline">hello@locallane.app</a>
          </p>
          <div className="flex justify-end mt-2">
            <Button
              onClick={() => setComingSoonType(null)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Create or Join */}
      <Dialog open={!!teamJoinStep} onOpenChange={(open) => { if (!open) setTeamJoinStep(null); }}>
        <DialogContent className="bg-slate-900 border-slate-800 max-w-sm">
          {teamJoinStep === 'choice' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-slate-100">Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <button
                  type="button"
                  onClick={() => { setTeamJoinStep(null); navigate(createPageUrl('TeamOnboarding')); }}
                  className="w-full flex items-start gap-4 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-left transition-colors min-h-[44px]"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Plus className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100">Create a new team</div>
                    <div className="text-sm text-slate-400">Start fresh — add players, build your playbook</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setTeamJoinStep('code')}
                  className="w-full flex items-start gap-4 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:border-amber-500/50 text-left transition-colors min-h-[44px]"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <LogIn className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100">I have an invite code</div>
                    <div className="text-sm text-slate-400">Join an existing team with a code from your coach</div>
                  </div>
                </button>
              </div>
            </>
          )}
          {teamJoinStep === 'code' && (
            <>
              <DialogHeader>
                <DialogTitle className="text-slate-100">Enter invite code</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-slate-400 text-sm">Enter the 6-character code from your coach or team admin.</p>
                <input
                  type="text"
                  value={teamInviteCode}
                  onChange={(e) => { setTeamInviteCode(e.target.value.trim().slice(0, 20)); setTeamInviteError(''); }}
                  placeholder="e.g. ABC123"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white text-center text-lg font-mono tracking-widest placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none min-h-[44px]"
                  autoFocus
                />
                {teamInviteError && <p className="text-red-400 text-sm">{teamInviteError}</p>}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTeamJoinStep('choice')}
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-transparent hover:border-amber-500 hover:text-amber-500 min-h-[44px]"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      const code = teamInviteCode.trim();
                      if (!code) { setTeamInviteError('Enter an invite code'); return; }
                      setTeamJoinStep(null);
                      navigate(`/join/${encodeURIComponent(code)}`);
                    }}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
                    disabled={!teamInviteCode.trim()}
                  >
                    Join Team
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasAnyWorkspace = (associatedBusinesses?.length > 0) || (allTeams?.length > 0) || (financeProfiles?.length > 0) || (fieldServiceProfiles?.length > 0) || (propertyMgmtProfiles?.length > 0);
  const availableTypes = Object.values(WORKSPACE_TYPES).filter((t) => t.available);

  // STEP 1: No workspaces — community pulse + explainer + workspace CTA
  if (!hasAnyWorkspace) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="bg-slate-900 border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-amber-500" />
              <div>
                <h1 className="text-lg font-bold text-slate-100">Dashboard</h1>
                <p className="text-xs text-slate-400">Your community at a glance</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
          <CommunityPulse />

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
            <h2 className="text-xl font-bold text-slate-100 mb-3">Your Spaces</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">
              Manage your business, create events, and connect with local families.
              Spaces are where your work lives. Every space shapes what LocalLane becomes.
            </p>
            <Button
              onClick={() => setTypePickerOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8 py-6 text-lg min-h-[44px]"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First Space
            </Button>
            <p className="text-sm text-slate-500 mt-6">
              Or <Link to={createPageUrl('MyLane')} className="text-amber-500 hover:text-amber-400 underline">go to My Lane</Link>
            </p>
          </div>
        </div>
        {renderTypePickerModal()}
      </div>
    );
  }

  // STEP 2: Has workspaces but none selected — landing with business + team + finance cards
  if (!selectedBusinessId && !selectedTeamId && !selectedFinanceId && !selectedFieldServiceId && !selectedPropertyMgmtId) {
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
                <button
                  type="button"
                  onClick={() => setMyLaneMode((m) => !m)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    myLaneMode
                      ? 'bg-amber-500 text-black'
                      : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-amber-500/50'
                  }`}
                >
                  {myLaneMode ? 'Classic View' : 'MyLane Beta'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MyLane Beta Surface (admin only) */}
        {isAppAdmin && myLaneMode ? (
          isMobile ? (
            /* Mobile: card grid + FAB + full-screen sheet */
            <>
              <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
                <MyLaneSurface
                  currentUser={currentUser}
                  financeProfiles={financeProfiles}
                  fieldServiceProfiles={fieldServiceProfiles}
                  allTeams={allTeams}
                  propertyMgmtProfiles={propertyMgmtProfiles}
                  agentMessageRef={agentMessageRef}
                />
              </div>
              {/* FAB to open Mylane */}
              {!mobileSheetOpen && (
                <button
                  type="button"
                  onClick={() => setMobileSheetOpen(true)}
                  className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 flex items-center justify-center transition-all hover:scale-105"
                  style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
                  title="Open Mylane"
                >
                  <MessageCircle className="h-6 w-6" />
                </button>
              )}
              <MylaneMobileSheet
                isOpen={mobileSheetOpen}
                onClose={() => setMobileSheetOpen(false)}
                currentUser={currentUser}
                onMessage={(msg) => agentMessageRef.current?.(msg)}
                workspaceProfiles={{
                  fieldService: fieldServiceProfiles,
                  finance: financeProfiles,
                  teams: allTeams,
                  propertyMgmt: propertyMgmtProfiles,
                  isAdmin: currentUser?.role === 'admin',
                }}
              />
            </>
          ) : (
            /* Desktop: resizable side panel */
            <div className="h-[calc(100vh-88px)]">
              <MylanePanel
                currentUser={currentUser}
                onMessage={(msg) => agentMessageRef.current?.(msg)}
                workspaceProfiles={{
                  fieldService: fieldServiceProfiles,
                  finance: financeProfiles,
                  teams: allTeams,
                  propertyMgmt: propertyMgmtProfiles,
                  isAdmin: currentUser?.role === 'admin',
                }}
                isCollapsed={mylaneCollapsed}
                onToggle={(collapsed) => {
                  setMylaneCollapsed(collapsed);
                  try { localStorage.setItem('mylane_panel_collapsed', String(collapsed)); } catch {}
                }}
              >
                <div className="max-w-5xl mx-auto px-6 pt-8 pb-4">
                  <MyLaneSurface
                    currentUser={currentUser}
                    financeProfiles={financeProfiles}
                    fieldServiceProfiles={fieldServiceProfiles}
                    allTeams={allTeams}
                    propertyMgmtProfiles={propertyMgmtProfiles}
                    agentMessageRef={agentMessageRef}
                  />
                </div>
              </MylanePanel>
            </div>
          )
        ) : (
        <>
        {/* Business Grid - "The Pro Section" */}
        <div className="max-w-7xl mx-auto px-6 pt-8 pb-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-100">My Spaces</h2>
              <p className="text-slate-400 text-sm mt-1">
                Manage the things you lead
              </p>
            </div>
            <RevolvingAddButton onClick={() => setTypePickerOpen(true)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {associatedBusinesses.map((business) => (
              <BusinessCard
                key={business.id}
                business={business}
                userRole={getUserRole(business)}
                eventCount={eventCounts[business.id] || 0}
                onClick={() => { setSelectedBusinessId(business.id); setSelectedTeamId(null); setSelectedFinanceId(null); setSelectedFieldServiceId(null); setSelectedPropertyMgmtId(null); setActiveTab('home'); }}
                workspaceTypeLabel="Business"
              />
            ))}
            {allTeams.map((team) => {
              const membership = myTeamMemberships.find((m) => m.team_id === team.id);
              const roleLabel = (membership?.role === 'coach' || membership?.role === 'assistant_coach') ? 'COACH' : (membership?.role === 'player' || membership?.role === 'parent') ? 'PLAYER' : 'MEMBER';
              return (
                <div
                  key={team.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { setSelectedTeamId(team.id); setSelectedBusinessId(null); setSelectedFinanceId(null); setSelectedFieldServiceId(null); setSelectedPropertyMgmtId(null); setActiveTab('home'); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedTeamId(team.id); setSelectedBusinessId(null); setSelectedFinanceId(null); setSelectedFieldServiceId(null); setSelectedPropertyMgmtId(null); setActiveTab('home'); } }}
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
            {financeProfiles.map((profile) => {
              const enoughTarget = profile.enough_number || 0;
              const fmtUsd = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
              return (
                <div
                  key={profile.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { setSelectedFinanceId(profile.id); setSelectedBusinessId(null); setSelectedTeamId(null); setSelectedFieldServiceId(null); setSelectedPropertyMgmtId(null); setActiveTab('home'); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedFinanceId(profile.id); setSelectedBusinessId(null); setSelectedTeamId(null); setSelectedFieldServiceId(null); setSelectedPropertyMgmtId(null); setActiveTab('home'); } }}
                  className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-6 cursor-pointer transition-colors min-h-[44px]"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <DollarSign className="h-6 w-6 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <h3 className="font-bold text-lg text-slate-100 truncate">{profile.workspace_name || 'My Finances'}</h3>
                        <Badge className="bg-amber-500 text-black text-xs">OWNER</Badge>
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Finance</span>
                      </div>
                      <p className="text-sm text-slate-400">
                        Enough: {fmtUsd(0)} / {fmtUsd(enoughTarget)} target
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {fieldServiceProfiles.map((fsProfile) => (
              <div
                key={fsProfile.id}
                role="button"
                tabIndex={0}
                onClick={() => { setSelectedFieldServiceId(fsProfile.id); setSelectedBusinessId(null); setSelectedTeamId(null); setSelectedFinanceId(null); setSelectedPropertyMgmtId(null); setActiveTab('home'); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedFieldServiceId(fsProfile.id); setSelectedBusinessId(null); setSelectedTeamId(null); setSelectedFinanceId(null); setSelectedPropertyMgmtId(null); setActiveTab('home'); } }}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-6 cursor-pointer transition-colors min-h-[44px]"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <HardHat className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-lg text-slate-100 truncate">{fsProfile.workspace_name || fsProfile.business_name || 'Field Service'}</h3>
                      {fsProfile._workerRole === 'subcontractor' ? (
                        <Badge className="bg-sky-500/20 text-sky-400 text-xs">SUB</Badge>
                      ) : fsProfile._workerRole === 'worker' ? (
                        <Badge className="bg-amber-500/20 text-amber-400 text-xs">WORKER</Badge>
                      ) : (
                        <Badge className="bg-amber-500 text-black text-xs">OWNER</Badge>
                      )}
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Field Service</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {fsProfile.service_area || 'Project management for contractors'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {propertyMgmtProfiles.map((pmProfile) => (
              <div
                key={pmProfile.id}
                role="button"
                tabIndex={0}
                onClick={() => { setSelectedPropertyMgmtId(pmProfile.id); setSelectedBusinessId(null); setSelectedTeamId(null); setSelectedFinanceId(null); setSelectedFieldServiceId(null); setActiveTab('home'); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedPropertyMgmtId(pmProfile.id); setSelectedBusinessId(null); setSelectedTeamId(null); setSelectedFinanceId(null); setSelectedFieldServiceId(null); setActiveTab('home'); } }}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-6 cursor-pointer transition-colors min-h-[44px]"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-lg text-slate-100 truncate">{pmProfile.workspace_name || pmProfile.business_name || 'Property Management'}</h3>
                      <Badge className={`text-xs ${
                        pmProfile._memberRole === 'admin' ? 'bg-amber-500 text-black'
                          : pmProfile._memberRole === 'property_manager' ? 'bg-purple-500 text-white'
                          : pmProfile._memberRole === 'owner' ? 'bg-blue-500/20 text-blue-400'
                          : 'border border-slate-500 text-slate-300'
                      }`}>
                        {pmProfile._memberRole === 'admin' ? 'ADMIN' : pmProfile._memberRole === 'property_manager' ? 'MANAGER' : pmProfile._memberRole === 'owner' ? 'OWNER' : pmProfile._memberRole === 'tenant' ? 'TENANT' : 'WORKER'}
                      </Badge>
                      <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">Property Mgmt</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      {pmProfile.property_type === 'short_term' ? 'Short-term rentals' : pmProfile.property_type === 'both' ? 'Long & short-term rentals' : 'Long-term rentals'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shaping the Garden — link to standalone page */}
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <Link
            to="/shaping"
            className="block bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-amber-500/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">🌱</span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Shaping the Garden</h3>
                  <p className="text-xs text-slate-400">Ideas, seeds, and community growth</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </Link>
        </div>

        {/* Community Pulse */}
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-8">
          <CommunityPulse />
        </div>
        </>
        )}

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
      isCoach: effectiveRole === 'coach',
      onNavigateTab: setActiveTab,
      onCopyInviteLink: () => {
        const code = selectedTeam?.invite_code;
        if (code) {
          navigator.clipboard.writeText(`${window.location.origin}/join/${code}`);
          toast.success('Family link copied');
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
                onClick={() => { setSelectedTeamId(null); setSelectedBusinessId(null); setSelectedFinanceId(null); setSelectedFieldServiceId(null); setSelectedPropertyMgmtId(null); setViewingAsPlayerId(null); }}
                className="text-slate-400 hover:text-slate-100 min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Spaces
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
                  const badgeText = (role === 'coach' || role === 'assistant_coach') ? 'COACH' : role === 'player' ? 'PLAYER' : role === 'parent' ? 'PARENT' : 'MEMBER';
                  return <Badge className="ml-2 bg-amber-500 text-black">{badgeText}</Badge>;
                })()}
              </div>
            </div>
          </div>
          <div className="flex gap-1 px-6 overflow-x-auto flex-nowrap pb-1 scrollbar-hide">
            {teamTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap transition-colors min-h-[44px] ${isActive ? 'text-amber-500 border-b-2 border-amber-500 font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
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
                      : activeTabConfig.id === 'settings'
                        ? { teamId: selectedTeam?.id, teamScope }
                        : {};
            return <TabComponent {...props} {...extraProps} />;
          })()}
        </div>

        {/* PlaymakerAgent — second nerve ending in the organism */}
        <AgentChatButton agentName="PlaymakerAgent" userId={currentUser?.id} />
      </div>
    );
  }

  // STEP 3c: Finance workspace selected
  const selectedProfile = financeProfiles.find((p) => p.id === selectedFinanceId);
  if (selectedFinanceId && selectedProfile) {
    const financeTabs = WORKSPACE_TYPES.finance.tabs;
    const financeScope = { profile: selectedProfile, currentUser, onNavigateTab: setActiveTab };
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="bg-slate-900 border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedFinanceId(null); setSelectedBusinessId(null); setSelectedTeamId(null); setSelectedFieldServiceId(null); setSelectedPropertyMgmtId(null); }}
                className="text-slate-400 hover:text-slate-100 min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Spaces
              </Button>
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-amber-500" />
                <div>
                  <h1 className="text-lg font-bold text-slate-100">{selectedProfile.workspace_name || 'My Finances'}</h1>
                  <p className="text-xs text-slate-400">Personal Finance</p>
                </div>
                <Badge className="ml-2 bg-amber-500 text-black">OWNER</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-1 px-6 overflow-x-auto flex-nowrap pb-1 scrollbar-hide">
            {financeTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap transition-colors min-h-[44px] ${isActive ? 'text-amber-500 border-b-2 border-amber-500 font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8">
          {(() => {
            const activeTabConfig = financeTabs.find((t) => t.id === activeTab);
            if (!activeTabConfig) return null;
            const TabComponent = activeTabConfig.component;
            const props = activeTabConfig.getProps ? activeTabConfig.getProps(financeScope) : {};
            return <TabComponent {...props} />;
          })()}
        </div>

        {/* FinanceAgent — the organism's circulatory system */}
        <AgentChatButton agentName="FinanceAgent" userId={currentUser?.id} />
      </div>
    );
  }

  // STEP 3d: Field Service workspace selected
  const selectedFSProfile = fieldServiceProfiles.find((p) => p.id === selectedFieldServiceId);
  if (selectedFieldServiceId && selectedFSProfile) {
    // Detect user role on this workspace
    const fsIsOwner = selectedFSProfile.user_id === currentUser?.id;
    let fsWorkerRole = null;
    if (!fsIsOwner && selectedFSProfile._workerRole) {
      fsWorkerRole = selectedFSProfile._workerRole;
    } else if (!fsIsOwner) {
      // Check workers_json for current user
      const wj = selectedFSProfile.workers_json;
      const wList = Array.isArray(wj) ? wj : (wj?.items || []);
      const match = wList.find((w) => w.user_id === currentUser?.id);
      if (match) fsWorkerRole = match.role || 'worker';
    }

    // Parse features config with safe defaults
    const fsFeatures = (() => {
      const DEFAULTS = { permits_enabled: true, subs_enabled: true, management_fees_enabled: false, overhead_profit_enabled: false, xactimate_enabled: false, payments_enabled: true, timeline_enabled: true };
      const f = selectedFSProfile.features_json || {};
      return { ...DEFAULTS, ...f };
    })();

    const fsTabs = WORKSPACE_TYPES.fieldservice.tabs;
    const fsScope = { profile: selectedFSProfile, currentUser, onNavigateTab: setActiveTab, isOwner: fsIsOwner, workerRole: fsWorkerRole, features: fsFeatures };
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="bg-slate-900 border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedFieldServiceId(null); setSelectedBusinessId(null); setSelectedTeamId(null); setSelectedFinanceId(null); setSelectedPropertyMgmtId(null); }}
                className="text-slate-400 hover:text-slate-100 min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Spaces
              </Button>
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-3">
                <HardHat className="h-5 w-5 text-amber-500" />
                <div>
                  <h1 className="text-lg font-bold text-slate-100">{selectedFSProfile.workspace_name || selectedFSProfile.business_name || 'Field Service'}</h1>
                  <p className="text-xs text-slate-400">Field Service</p>
                </div>
                {fsWorkerRole === 'subcontractor' ? (
                  <Badge className="ml-2 bg-sky-500/20 text-sky-400">SUB</Badge>
                ) : fsWorkerRole === 'worker' ? (
                  <Badge className="ml-2 bg-amber-500/20 text-amber-400">WORKER</Badge>
                ) : (
                  <Badge className="ml-2 bg-amber-500 text-black">OWNER</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1 px-6 overflow-x-auto flex-nowrap pb-1 scrollbar-hide">
            {fsTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap transition-colors min-h-[44px] ${isActive ? 'text-amber-500 border-b-2 border-amber-500 font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8">
          {(() => {
            const activeTabConfig = fsTabs.find((t) => t.id === activeTab);
            if (!activeTabConfig) return null;
            const TabComponent = activeTabConfig.component;
            const props = activeTabConfig.getProps ? activeTabConfig.getProps(fsScope) : {};
            return <TabComponent {...props} />;
          })()}
        </div>

        {/* Construction Gate — remove when agent chat passes walkthrough */}
        <AgentChatButton agentName="FieldServiceAgent" userId={currentUser?.id} />
      </div>
    );
  }

  // STEP 3e: Property Management workspace selected
  const selectedPMProfile = propertyMgmtProfiles.find((p) => p.id === selectedPropertyMgmtId);
  if (selectedPropertyMgmtId && selectedPMProfile) {
    const pmMemberRole = selectedPMProfile._memberRole || 'admin';
    const pmIsAdmin = pmMemberRole === 'admin';
    const pmCanEdit = pmMemberRole === 'admin' || pmMemberRole === 'property_manager';
    const pmIsTenant = pmMemberRole === 'tenant';
    const pmIsOwner = pmMemberRole === 'owner';

    // Filter tabs based on role
    const allPmTabs = WORKSPACE_TYPES.property_management.tabs;
    const tenantTabs = ['home', 'maintenance', 'people', 'settings'];
    const ownerTabs = ['home', 'properties', 'finances', 'settlements', 'settings'];
    const pmTabs = pmIsTenant
      ? allPmTabs.filter((t) => tenantTabs.includes(t.id))
      : pmIsOwner
        ? allPmTabs.filter((t) => ownerTabs.includes(t.id))
        : allPmTabs;

    const pmScope = {
      profile: selectedPMProfile,
      currentUser,
      onNavigateTab: setActiveTab,
      memberRole: pmMemberRole,
      isAdmin: pmIsAdmin,
      canEdit: pmCanEdit,
      isTenant: pmIsTenant,
      isOwner: pmIsOwner,
    };
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="bg-slate-900 border-b border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSelectedPropertyMgmtId(null); setSelectedBusinessId(null); setSelectedTeamId(null); setSelectedFinanceId(null); setSelectedFieldServiceId(null); }}
                className="text-slate-400 hover:text-slate-100 min-h-[44px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Spaces
              </Button>
              <div className="h-4 w-px bg-slate-700" />
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-amber-500" />
                <div>
                  <h1 className="text-lg font-bold text-slate-100">{selectedPMProfile.workspace_name || selectedPMProfile.business_name || 'Property Management'}</h1>
                  <p className="text-xs text-slate-400">Property Management</p>
                </div>
                <Badge className={`ml-2 ${
                  pmIsAdmin ? 'bg-amber-500 text-black'
                    : pmMemberRole === 'property_manager' ? 'bg-purple-500 text-white'
                    : pmIsOwner ? 'bg-blue-500/20 text-blue-400'
                    : 'border border-slate-500 text-slate-300'
                }`}>
                  {pmIsAdmin ? 'ADMIN' : pmMemberRole === 'property_manager' ? 'MANAGER' : pmIsOwner ? 'OWNER' : pmIsTenant ? 'TENANT' : 'WORKER'}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-1 px-6 overflow-x-auto flex-nowrap pb-1 scrollbar-hide">
            {pmTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap transition-colors min-h-[44px] ${isActive ? 'text-amber-500 border-b-2 border-amber-500 font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8">
          {(() => {
            const activeTabConfig = pmTabs.find((t) => t.id === activeTab);
            if (!activeTabConfig) return null;
            const TabComponent = activeTabConfig.component;
            const props = activeTabConfig.getProps ? activeTabConfig.getProps(pmScope) : {};
            return <TabComponent {...props} />;
          })()}
        </div>

        {/* PropertyPulseAgent — the organism's skeleton */}
        <AgentChatButton agentName="PropertyPulseAgent" userId={currentUser?.id} />
      </div>
    );
  }

  const selectedBusiness = associatedBusinesses.find(b => b.id === selectedBusinessId);
  if (selectedTeamId && !selectedTeam) return null;
  if (selectedFinanceId && !selectedProfile) return null;
  if (selectedFieldServiceId && !selectedFSProfile) return null;
  if (selectedPropertyMgmtId && !selectedPMProfile) return null;
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
              onClick={() => { setSelectedBusinessId(null); setSelectedTeamId(null); setSelectedFinanceId(null); setSelectedFieldServiceId(null); setSelectedPropertyMgmtId(null); }}
              className="text-slate-400 hover:text-slate-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Spaces
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
        <div className="flex gap-1 px-6 overflow-x-auto flex-nowrap pb-1 scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap transition-colors min-h-[44px] ${isActive ? 'text-amber-500 border-b-2 border-amber-500 font-semibold' : 'text-slate-400 hover:text-slate-300'}`}
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