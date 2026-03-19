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
  DollarSign,
  ArrowDownUp,
  Repeat,
  Landmark,
  HardHat,
  ClipboardList,
  FolderOpen,
  FileText,
  Building,
  Building2,
  Home,
  Wrench,
  UserCheck,
  Megaphone,
  Calculator,
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
import FinanceHome from '@/components/finance/FinanceHome';
import FinanceActivity from '@/components/finance/FinanceActivity';
import FinanceBills from '@/components/finance/FinanceBills';
import FinanceDebts from '@/components/finance/FinanceDebts';
import FinanceSettings from '@/components/finance/FinanceSettings';
import FieldServiceHome from '@/components/fieldservice/FieldServiceHome';
import FieldServiceLog from '@/components/fieldservice/FieldServiceLog';
import FieldServiceProjects from '@/components/fieldservice/FieldServiceProjects';
import FieldServiceEstimates from '@/components/fieldservice/FieldServiceEstimates';
import FieldServicePeople from '@/components/fieldservice/FieldServicePeople';
import FieldServiceSettings from '@/components/fieldservice/FieldServiceSettings';
import FieldServiceDocuments from '@/components/fieldservice/FieldServiceDocuments';
import PropertyManagementHome from '@/components/propertymgmt/PropertyManagementHome';
import PropertyManagementProperties from '@/components/propertymgmt/PropertyManagementProperties';
import PropertyManagementOwners from '@/components/propertymgmt/PropertyManagementOwners';
import PropertyManagementFinances from '@/components/propertymgmt/PropertyManagementFinances';
import PropertyManagementMaintenance from '@/components/propertymgmt/PropertyManagementMaintenance';
import PropertyManagementPeople from '@/components/propertymgmt/PropertyManagementPeople';
import PropertyManagementListings from '@/components/propertymgmt/PropertyManagementListings';
import PropertyManagementSettlements from '@/components/propertymgmt/PropertyManagementSettlements';
import PropertyManagementSettings from '@/components/propertymgmt/PropertyManagementSettings';

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
      onNavigateTab: scope.setActiveTab,
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
      { id: 'home', label: 'Home', icon: LayoutDashboard, component: TeamHome, getProps: (scope) => ({ team: scope.team, members: scope.members, onNavigateTab: scope.onNavigateTab, onCopyInviteLink: scope.onCopyInviteLink, currentUserId: scope.currentUserId }) },
      { id: 'playbook', label: 'Playbook', icon: BookOpen, component: TeamPlaybook, getProps: (scope) => ({ team: scope.team, members: scope.members, isCoach: scope.isCoach, currentUserId: scope.currentUserId }) },
      { id: 'schedule', label: 'Schedule', icon: Calendar, component: TeamSchedule, getProps: () => ({}) },
      { id: 'roster', label: 'Roster', icon: Users, component: TeamRoster, getProps: (scope) => ({ team: scope.team, members: scope.members, isCoach: scope.isCoach }) },
      { id: 'messages', label: 'Messages', icon: MessageSquare, component: TeamMessages, getProps: () => ({}) },
      { id: 'settings', label: 'Settings', icon: Settings, component: TeamSettings, getProps: (scope) => ({ team: scope.team, members: scope.members, isCoach: scope.isCoach, onArchived: scope.onArchived, teamScope: scope }) },
    ],
  },
  finance: {
    id: 'finance',
    label: 'Finance',
    icon: 'DollarSign',
    description: 'Track income, expenses, debts, and your Monthly Target',
    archetypeSupport: false,
    networkAffinity: false,
    available: true,
    createWizard: 'FinanceOnboarding',
    roles: {
      owner: 'Owner',
    },
    tabs: [
      { id: 'home', label: 'Home', icon: LayoutDashboard, component: FinanceHome, getProps: (scope) => ({ profile: scope.profile, currentUser: scope.currentUser, onNavigateTab: scope.onNavigateTab }) },
      { id: 'activity', label: 'Activity', icon: ArrowDownUp, component: FinanceActivity, getProps: (scope) => ({ profile: scope.profile, currentUser: scope.currentUser }) },
      { id: 'bills', label: 'Bills & Income', icon: Repeat, component: FinanceBills, getProps: (scope) => ({ profile: scope.profile, currentUser: scope.currentUser }) },
      { id: 'debts', label: 'Debts', icon: Landmark, component: FinanceDebts, getProps: (scope) => ({ profile: scope.profile, currentUser: scope.currentUser }) },
      { id: 'settings', label: 'Settings', icon: Settings, component: FinanceSettings, getProps: (scope) => ({ profile: scope.profile, currentUser: scope.currentUser }) },
    ],
  },
  fieldservice: {
    id: 'fieldservice',
    label: 'Field Service',
    icon: 'HardHat',
    description: 'Project management for contractors',
    archetypeSupport: false,
    networkAffinity: false,
    available: true,
    testingMode: false, // Unlocked for real users (Bari, Dan) — 2026-03-17
    createWizard: 'FieldServiceOnboarding',
    roles: {
      owner: 'Owner',
      worker: 'Worker',
      client: 'Client',
    },
    tabs: [
      { id: 'home', label: 'Home', icon: LayoutDashboard, component: FieldServiceHome, getProps: (scope) => ({ profile: scope.profile, currentUser: scope.currentUser, onNavigateTab: scope.onNavigateTab, isOwner: scope.isOwner, workerRole: scope.workerRole, features: scope.features }) },
      { id: 'log', label: 'Log', icon: ClipboardList, component: FieldServiceLog, getProps: (scope) => ({ profile: scope.profile, currentUser: scope.currentUser, isOwner: scope.isOwner, workerRole: scope.workerRole, features: scope.features }) },
      { id: 'projects', label: 'Projects', icon: FolderOpen, component: FieldServiceProjects, getProps: (scope) => ({ profile: scope.profile, currentUser: scope.currentUser, onNavigateTab: scope.onNavigateTab, isOwner: scope.isOwner, workerRole: scope.workerRole, features: scope.features }) },
      { id: 'estimates', label: 'Estimates', icon: FileText, component: FieldServiceEstimates, getProps: (scope) => ({ profile: scope.profile, currentUser: scope.currentUser, onNavigateTab: scope.onNavigateTab, isOwner: scope.isOwner, workerRole: scope.workerRole, features: scope.features }) },
      { id: 'people', label: 'People', icon: Users, component: FieldServicePeople, getProps: (scope) => ({ profile: scope.profile, currentUser: scope.currentUser, onNavigateTab: scope.onNavigateTab, isOwner: scope.isOwner, workerRole: scope.workerRole, features: scope.features }) },
      { id: 'documents', label: 'Documents', icon: FileText, component: FieldServiceDocuments, getProps: (scope) => ({ profile: scope.profile, currentUser: scope.currentUser, onNavigateTab: scope.onNavigateTab, isOwner: scope.isOwner, workerRole: scope.workerRole, features: scope.features }) },
      { id: 'settings', label: 'Settings', icon: Settings, component: FieldServiceSettings, getProps: (scope) => ({ profile: scope.profile, currentUser: scope.currentUser, onNavigateTab: scope.onNavigateTab, isOwner: scope.isOwner, workerRole: scope.workerRole, features: scope.features }) },
    ],
  },
  property_management: {
    id: 'property_management',
    label: 'Property Management',
    icon: 'Building2',
    description: 'Manage rental properties, tenants, and maintenance',
    archetypeSupport: false,
    networkAffinity: false,
    available: true,
    testingMode: true,
    createWizard: 'PropertyManagementOnboarding',
    roles: {
      admin: 'Admin',
      owner: 'Property Manager',
      staff: 'Owner',
      member: 'Tenant',
    },
    tabs: [
      { id: 'home', label: 'Home', icon: Home, component: PropertyManagementHome, getProps: (scope) => scope },
      { id: 'properties', label: 'Properties', icon: Building, component: PropertyManagementProperties, getProps: (scope) => scope },
      { id: 'owners', label: 'Owners', icon: Users, component: PropertyManagementOwners, getProps: (scope) => scope },
      { id: 'finances', label: 'Finances', icon: DollarSign, component: PropertyManagementFinances, getProps: (scope) => scope },
      { id: 'maintenance', label: 'Maintenance', icon: Wrench, component: PropertyManagementMaintenance, getProps: (scope) => scope },
      { id: 'settlements', label: 'Settlements', icon: Calculator, component: PropertyManagementSettlements, getProps: (scope) => scope },
      { id: 'people', label: 'People', icon: UserCheck, component: PropertyManagementPeople, getProps: (scope) => scope },
      { id: 'listings', label: 'Listings', icon: Megaphone, component: PropertyManagementListings, getProps: (scope) => scope },
      { id: 'settings', label: 'Settings', icon: Settings, component: PropertyManagementSettings, getProps: (scope) => scope },
    ],
  },
};
