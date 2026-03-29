/**
 * MyLane Card Registry
 * Maps card IDs to their components, labels, and workspace types.
 * MyLaneSurface uses this to render the card grid.
 * Add new cards here — the surface picks them up automatically.
 */
import { DollarSign, FileText, Users, Building2, FolderKanban } from 'lucide-react';

import EnoughNumberCard from '@/components/mylane/cards/EnoughNumberCard';
import PendingEstimatesCard from '@/components/mylane/cards/PendingEstimatesCard';
import PlayerReadinessCard from '@/components/mylane/cards/PlayerReadinessCard';
import PropertyOverviewCard from '@/components/mylane/cards/PropertyOverviewCard';
import ActiveProjectsCard from '@/components/mylane/cards/ActiveProjectsCard';

const MY_LANE_REGISTRY = [
  {
    id: 'enough-number',
    label: 'Enough Number',
    space: 'finance',
    icon: DollarSign,
    CardComponent: EnoughNumberCard,
    getProfile: (profiles) => profiles.financeProfiles?.[0] || null,
  },
  {
    id: 'pending-estimates',
    label: 'Pending Estimates',
    space: 'field-service',
    icon: FileText,
    CardComponent: PendingEstimatesCard,
    getProfile: (profiles) => profiles.fieldServiceProfiles?.[0] || null,
  },
  {
    id: 'active-projects',
    label: 'Active Projects',
    space: 'field-service',
    icon: FolderKanban,
    CardComponent: ActiveProjectsCard,
    getProfile: (profiles) => profiles.fieldServiceProfiles?.[0] || null,
  },
  {
    id: 'player-readiness',
    label: 'Game Day Readiness',
    space: 'team',
    icon: Users,
    CardComponent: PlayerReadinessCard,
    getProfile: (profiles) => profiles.allTeams?.[0] || null,
  },
  {
    id: 'property-overview',
    label: 'Property Overview',
    space: 'property-pulse',
    icon: Building2,
    CardComponent: PropertyOverviewCard,
    getProfile: (profiles) => profiles.propertyMgmtProfiles?.[0] || null,
  },
];

export default MY_LANE_REGISTRY;
