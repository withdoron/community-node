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
  Users,
} from 'lucide-react';
import DashboardHome from '@/components/dashboard/DashboardHome';
import AccessWindowManager from '@/components/dashboard/AccessWindowManager';
import RevenueOverview from '@/components/dashboard/RevenueOverview';
import EventsWidget from '@/components/dashboard/widgets/EventsWidget';
import DashboardSettings from '@/components/dashboard/DashboardSettings';

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
export const WORKSPACE_TYPES = {
  business: {
    id: 'business',
    label: 'Business',
    icon: LayoutDashboard,
    archetypeSupport: true,
    getTabs: (workspace) => getBusinessTabs(workspace?.archetype || 'location'),
  },
  team: {
    id: 'team',
    label: 'Team',
    icon: Users,
    archetypeSupport: false,
    tabs: [], // no tabs until Team workspace UI exists
  },
};
