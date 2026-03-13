import React from 'react';
import { Pencil, UserCheck } from 'lucide-react';

/**
 * Lease expiry badge logic:
 * - >60 days: normal (slate)
 * - 30-60 days: amber warning
 * - <30 days: red urgent
 * - expired: red "Expired"
 */
function getLeaseExpiryBadge(leaseEnd) {
  if (!leaseEnd) return null;
  const now = new Date();
  const end = new Date(leaseEnd + 'T23:59:59');
  const diffMs = end - now;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Expired', className: 'bg-red-500/20 text-red-400' };
  }
  if (diffDays <= 30) {
    return { label: `${diffDays}d left`, className: 'bg-red-500/20 text-red-400' };
  }
  if (diffDays <= 60) {
    return { label: `${diffDays}d left`, className: 'bg-amber-500/20 text-amber-500' };
  }
  return { label: `${diffDays}d left`, className: 'bg-slate-700 text-slate-400' };
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + (d.includes('T') ? '' : 'T12:00:00'));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function TenantList({ tenants, onEdit }) {
  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
          <UserCheck className="h-7 w-7 text-amber-500" />
        </div>
        <p className="text-slate-300 font-medium mb-1">No tenants yet</p>
        <p className="text-slate-500 text-sm text-center max-w-xs">
          Tenant information is pulled from your property records. Edit a property to add tenant details.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tenants.map((t) => {
        const badge = getLeaseExpiryBadge(t.lease_end);
        return (
          <div
            key={t.property_id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-slate-100 truncate">
                    {t.tenant_name}
                  </h3>
                  {badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate">{t.propertyLabel}</p>

                {/* Contact info */}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
                  {t.tenant_email && <span>{t.tenant_email}</span>}
                  {t.tenant_phone && <span>{t.tenant_phone}</span>}
                </div>

                {/* Lease dates */}
                {(t.lease_start || t.lease_end) && (
                  <div className="flex gap-3 mt-1.5 text-xs text-slate-500">
                    {t.lease_start && <span>Start: {fmtDate(t.lease_start)}</span>}
                    {t.lease_end && <span>End: {fmtDate(t.lease_end)}</span>}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onEdit(t)}
                className="text-slate-400 hover:text-amber-500 p-1 min-h-[32px]"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
