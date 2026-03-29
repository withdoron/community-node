import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { FileText, CheckCircle2 } from 'lucide-react';

const fmtUsd = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

const DAY_MS = 86400000;

export default function PendingEstimatesCard({ profile, onClick, onUrgency }) {
  if (!profile) return null;

  const { data: estimates = [] } = useQuery({
    queryKey: ['mylane-fs-estimates', profile.id],
    queryFn: async () => {
      if (!profile.id) return [];
      try {
        const list = await base44.entities.FSEstimate.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile.id,
  });

  const pending = estimates.filter(
    (e) => e.status && !['signed', 'declined', 'expired', 'accepted'].includes(e.status)
  );
  const pendingTotal = pending.reduce((s, e) => s + (parseFloat(e.total) || 0), 0);

  // Time awareness: any draft older than 7 days
  const now = Date.now();
  const staleDrafts = pending.filter(
    (e) => e.status === 'draft' && e.created_date && (now - new Date(e.created_date).getTime()) > 7 * DAY_MS
  );
  const hasStale = staleDrafts.length > 0;

  // Report urgency to parent for sort boost
  useEffect(() => {
    onUrgency?.('pending-estimates', hasStale);
  }, [hasStale, onUrgency]);

  const countColor = hasStale ? 'text-amber-400' : 'text-white';
  const borderColor = hasStale ? 'border-amber-500/40' : 'border-slate-800';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className={`bg-slate-900 border ${borderColor} rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-colors`}
    >
      <div className="flex items-center gap-2 mb-2">
        <FileText className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-medium text-amber-500">Estimates</span>
      </div>
      {pending.length > 0 ? (
        <>
          <div className={`text-2xl font-bold ${countColor}`}>{pending.length}</div>
          <div className="text-xs text-slate-400 mt-1">
            pending &middot; {fmtUsd(pendingTotal)} total
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="text-lg font-semibold text-emerald-400">All sent</span>
          </div>
          <div className="text-xs text-slate-400 mt-1">{estimates.length} total estimates</div>
        </>
      )}
    </div>
  );
}
