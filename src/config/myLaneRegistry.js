/**
 * MyLane Card Registry
 * Maps card IDs to their components, labels, and workspace types.
 * MyLaneSurface uses this to render the card grid.
 * Add new cards here — the surface picks them up automatically.
 *
 * timeAware: card has time-sensitive color shifts
 * urgencyWindow: days before event when card gets sort boost
 * urgencyEntity: which entity drives the urgency check
 */
import { DollarSign, FileText, Users, Building2, FolderKanban, UtensilsCrossed } from 'lucide-react';

import EnoughNumberCard from '@/components/mylane/cards/EnoughNumberCard';
import PendingEstimatesCard from '@/components/mylane/cards/PendingEstimatesCard';
import PlayerReadinessCard from '@/components/mylane/cards/PlayerReadinessCard';
import PropertyOverviewCard from '@/components/mylane/cards/PropertyOverviewCard';
import ActiveProjectsCard from '@/components/mylane/cards/ActiveProjectsCard';
import RecipeBookCard from '@/components/mylane/cards/RecipeBookCard';

const MY_LANE_REGISTRY = [
  {
    id: 'enough-number',
    label: 'Enough Number',
    space: 'finance',
    icon: DollarSign,
    CardComponent: EnoughNumberCard,
    getProfile: (profiles) => profiles.financeProfiles?.[0] || null,
    timeAware: true,
    urgencyWindow: 7, // last 7 days of month
    urgencyEntity: null, // driven by calendar, not entity
  },
  {
    id: 'pending-estimates',
    label: 'Pending Estimates',
    space: 'field-service',
    icon: FileText,
    CardComponent: PendingEstimatesCard,
    getProfile: (profiles) => profiles.fieldServiceProfiles?.[0] || null,
    timeAware: true,
    urgencyWindow: 7, // drafts older than 7 days
    urgencyEntity: 'FSEstimate',
  },
  {
    id: 'active-projects',
    label: 'Active Projects',
    space: 'field-service',
    icon: FolderKanban,
    CardComponent: ActiveProjectsCard,
    getProfile: (profiles) => profiles.fieldServiceProfiles?.[0] || null,
    timeAware: false,
  },
  {
    id: 'player-readiness',
    label: 'Game Day Readiness',
    space: 'team',
    icon: Users,
    CardComponent: PlayerReadinessCard,
    getProfile: (profiles) => profiles.allTeams?.[0] || null,
    timeAware: true,
    urgencyWindow: 3, // days before game
    urgencyEntity: 'TeamEvent',
  },
  {
    id: 'property-overview',
    label: 'Property Overview',
    space: 'property-pulse',
    icon: Building2,
    CardComponent: PropertyOverviewCard,
    getProfile: (profiles) => profiles.propertyMgmtProfiles?.[0] || null,
    timeAware: true,
    urgencyWindow: 30, // days vacant
    urgencyEntity: 'PMProperty',
  },
  {
    id: 'recipe-book',
    label: 'Recipe Book',
    space: 'meal-prep',
    icon: UtensilsCrossed,
    CardComponent: RecipeBookCard,
    getProfile: (profiles) => profiles.mealPrepProfiles?.[0] || null,
    timeAware: false,
  },
];

export default MY_LANE_REGISTRY;
