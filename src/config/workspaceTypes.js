/**
 * Workspace Engine — type registry and tab config.
 * Drives the Business Dashboard (and future workspace types) from config
 * instead of hardcoded tabs. Archetype customizes business workspace tabs.
 */

import {
  LayoutDashboard,
  Coins,
  TrendingUp,
  Calendar,
  Settings,
  BookOpen,
  Users,
  MessageSquare,
} from 'lucide-react';
import DashboardHome from '@/components/dashboard/DashboardHome';
import AccessWindowManager from '@/components/dashboard/AccessWindowManager';
import RevenueOverview from '@/components/dashboard/RevenueOverview';
import EventsWidget from '@/components/dashboard/widgets/EventsWidget';
import DashboardSettings from '@/components/dashboard/DashboardSettings';
import TeamHome from '@/components/team/TeamHome';
import TeamPlaybook from '@/components/team/TeamPlaybook';
import TeamSchedule from '@/components/team/TeamSchedule';
import TeamRoster from '@/components/team/TeamRoster';
import TeamMessages from '@/components/team/TeamMessages';
import TeamSettings from '@/components/team/TeamSettings';

// ——— Archetype display titles (subtitle under business name) ———
export const ARCHETYPE_TITLES = {
  location: 'Storefront Management',
  venue: 'Storefront Management',
  service: 'Artist Command Center',
  talent: 'Artist Command Center',
  community: 'Group Hub',
  organizer: 'Event Command Center',
};

// ——— Business workspace: same 5 tabs for all archetypes (Build 1a). ———
// Keyed by archetype so we can vary tabs per archetype later without changing call sites.
const BUSINESS_TABS = [
  {
    id: 'home',
    label: 'Home',
    icon: LayoutDashboard,
    component: DashboardHome,
    getProps: (scope) => ({
      revenue: scope.revenue,
      businessEvents: scope.businessEvents,
      eventRsvpCounts: scope.eventRsvpCounts,
      onNavigateTab: scope.setActiveTab,
    }),
  },
  {
    id: 'joy-coins',
    label: 'Joy Coins',
    icon: Coins,
    component: AccessWindowManager,
    getProps: (scope) => ({
      business: scope.business,
      currentUserId: scope.currentUser?.id,
    }),
  },
  {
    id: 'revenue',
    label: 'Revenue',
    icon: TrendingUp,
    component: RevenueOverview,
    getProps: (scope) => ({ business: scope.business }),
  },
  {
    id: 'events',
    label: 'Events',
    icon: Calendar,
    component: EventsWidget,
    getProps: (scope) => ({
      business: scope.business,
      allowEdit: true,
      userRole: scope.userRole,
      onEnterCheckIn: scope.setCheckInEvent,
    }),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    component: DashboardSettings,
    getProps: (scope) => ({
      business: scope.business,
      currentUserId: scope.currentUser?.id,
      isOwner: scope.isOwner,
      onDeleteClick: scope.setDeleteDialogOpen,
      deleteMutation: scope.deleteMutation,
    }),
  },
];

/** BUSINESS_TAB_CONFIG[archetype] → array of tab config. Fallback: default. */
export const BUSINESS_TAB_CONFIG = {
  location: BUSINESS_TABS,
  venue: BUSINESS_TABS,
  service: BUSINESS_TABS,
  talent: BUSINESS_TABS,
  community: BUSINESS_TABS,
  organizer: BUSINESS_TABS,
  default: BUSINESS_TABS,
};

/**
 * Resolve tab list for a business workspace by archetype.
 * @param {string} archetype - business.archetype (e.g. 'location', 'venue')
 * @returns {Array} tab config items { id, label, icon, component, getProps }
 */
export function getBusinessTabs(archetype) {
  return BUSINESS_TAB_CONFIG[archetype] ?? BUSINESS_TAB_CONFIG.default;
}

// ——— Workspace type registry (outer layer). ———
// business: archetypeSupport true → tabs from BUSINESS_TAB_CONFIG[archetype]
// team: archetypeSupport false → tabs from type.tabs (future)
// icon as string for type picker; getTabs/components stay in business for dashboard.
export const WORKSPACE_TYPES = {
  business: {
    id: 'business',
    label: 'Business',
    icon: 'Storefront',
    description: 'List your business, host events, and connect with the community',
    archetypeSupport: true,
    getTabs: (workspace) => getBusinessTabs(workspace?.archetype || 'location'),
    roles: {
      owner: 'Owner',
      co_owner: 'Co-Owner',
      staff: 'Staff/Manager',
      member: 'Customer',
    },
    createWizard: null, // navigates to BusinessOnboarding for now
    networkAffinity: true,
    available: true,
  },
  team: {
    id: 'team',
    label: 'Team',
    icon: 'Users',
    description: 'Manage a sports team — roster, playbook, schedule, communication',
    archetypeSupport: false,
    networkAffinity: true,
    available: true,
    createWizard: 'TeamOnboarding',
    roles: {
      owner: 'Head Coach',
      co_owner: 'Co-Coach',
      staff: 'Assistant Coach',
      member: 'Player/Parent',
    },
    tabs: [
      { id: 'home', label: 'Home', icon: LayoutDashboard, component: TeamHome, getProps: (scope) => ({ team: scope.team, members: scope.members, onNavigateTab: scope.onNavigateTab, onCopyInviteLink: scope.onCopyInviteLink }) },
      { id: 'playbook', label: 'Playbook', icon: BookOpen, component: TeamPlaybook, getProps: () => ({}) },
      { id: 'schedule', label: 'Schedule', icon: Calendar, component: TeamSchedule, getProps: () => ({}) },
      { id: 'roster', label: 'Roster', icon: Users, component: TeamRoster, getProps: (scope) => ({ team: scope.team, members: scope.members, isCoach: scope.isCoach }) },
      { id: 'messages', label: 'Messages', icon: MessageSquare, component: TeamMessages, getProps: () => ({}) },
      { id: 'settings', label: 'Settings', icon: Settings, component: TeamSettings, getProps: (scope) => ({ team: scope.team, members: scope.members, isCoach: scope.isCoach, onArchived: scope.onArchived }) },
    ],
  },
};
