import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';

const DAY_MS = 86400000;

export default function PropertyOverviewCard({ profile, onClick, onUrgency }) {
  const { data: properties = [] } = useQuery({
    queryKey: ['mylane-pm-properties', profile.id],
    queryFn: async () => {
      if (!profile.id) return [];
      try {
        const list = await base44.entities.PMProperty.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile.id,
  });

  const { data: maintenanceRequests = [] } = useQuery({
    queryKey: ['mylane-pm-maintenance', profile.id],
    queryFn: async () => {
      if (!profile.id) return [];
      try {
        const list = await base44.entities.PMMaintenanceRequest.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile.id,
  });

  if (!profile) return null;

  const total = properties.length;
  const occupied = properties.filter((p) => p.status === 'occupied').length;
  const vacant = properties.filter((p) => p.status === 'vacant');
  const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;
  const openRequests = maintenanceRequests.filter((r) => r.status === 'open' || r.status === 'in_progress').length;

  // Time awareness: any property vacant > 30 days
  const now = Date.now();
  const longVacant = vacant.filter(
    (p) => p.updated_date && (now - new Date(p.updated_date).getTime()) > 30 * DAY_MS
  );
  const hasLongVacancy = longVacant.length > 0;

  // Report urgency to parent for sort boost
  useEffect(() => {
    onUrgency?.('property-overview', hasLongVacancy);
  }, [hasLongVacancy, onUrgency]);

  const borderColor = hasLongVacancy ? 'border-primary/40' : 'border-border';
  const vacantColor = hasLongVacancy ? 'text-primary-hover' : 'text-muted-foreground';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className={`bg-card border ${borderColor} rounded-xl p-4 cursor-pointer hover:border-primary/30 transition-colors`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-primary">Properties</span>
      </div>
      <div className="text-2xl font-bold text-foreground">{total} <span className="text-sm font-normal text-muted-foreground">units</span></div>
      <div className={`text-xs mt-1 ${vacantColor}`}>
        {occupancyPct}% occupied{openRequests > 0 ? ` · ${openRequests} open request${openRequests > 1 ? 's' : ''}` : ''}
        {vacant.length > 0 && ` · ${vacant.length} vacant`}
      </div>
    </div>
  );
}