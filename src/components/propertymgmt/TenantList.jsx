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
    return { label: `${diffDays}d left`, className: 'bg-primary/20 text-primary' };
  }
  return { label: `${diffDays}d left`, className: 'bg-surface text-muted-foreground' };
}

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + (d.includes('T') ? '' : 'T12:00:00'));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function TenantList({ tenants, onEdit }) {
  if (tenants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <UserCheck className="h-7 w-7 text-primary" />
        </div>
        <p className="text-foreground-soft font-medium mb-1">No tenants yet</p>
        <p className="text-muted-foreground/70 text-sm text-center max-w-xs">
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
            className="bg-card border border-border rounded-xl p-4 hover:border-border transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {t.tenant_name}
                  </h3>
                  {badge && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/70 truncate">{t.propertyLabel}</p>

                {/* Contact info */}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                  {t.tenant_email && <span>{t.tenant_email}</span>}
                  {t.tenant_phone && <span>{formatPhone(t.tenant_phone)}</span>}
                </div>

                {/* Lease dates */}
                {(t.lease_start || t.lease_end) && (
                  <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground/70">
                    {t.lease_start && <span>Start: {fmtDate(t.lease_start)}</span>}
                    {t.lease_end && <span>End: {fmtDate(t.lease_end)}</span>}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => onEdit(t)}
                className="text-muted-foreground hover:text-primary p-1 min-h-[32px]"
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
