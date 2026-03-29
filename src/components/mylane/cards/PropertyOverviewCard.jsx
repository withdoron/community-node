import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';

const DAY_MS = 86400000;

export default function PropertyOverviewCard({ profile, onClick, onUrgency }) {
  if (!profile) return null;

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

  const borderColor = hasLongVacancy ? 'border-amber-500/40' : 'border-slate-800';
  const vacantColor = hasLongVacancy ? 'text-amber-400' : 'text-slate-400';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className={`bg-slate-900 border ${borderColor} rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-colors`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-medium text-amber-500">Properties</span>
      </div>
      <div className="text-2xl font-bold text-white">{total} <span className="text-sm font-normal text-slate-400">units</span></div>
      <div className={`text-xs mt-1 ${vacantColor}`}>
        {occupancyPct}% occupied{openRequests > 0 ? ` · ${openRequests} open request${openRequests > 1 ? 's' : ''}` : ''}
        {vacant.length > 0 && ` · ${vacant.length} vacant`}
      </div>
    </div>
  );
}
