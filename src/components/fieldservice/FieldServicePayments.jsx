import React, { useMemo } from 'react';
import { useFSPayments } from '@/hooks/useFSPayments';
import {
  DollarSign, Loader2, ArrowDownToLine, ArrowUpFromLine, Plus,
} from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return d; }
};

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: 'bg-primary/20 text-primary-hover' },
  received: { label: 'Received', color: 'bg-emerald-500/20 text-emerald-400' },
  cleared:  { label: 'Cleared',  color: 'bg-emerald-500/20 text-emerald-400' },
};

// View-only Payments section. Writes flow through the Log tab — Sub Payment /
// Client Payment types — per FINANCIAL-WORKFLOW-SPEC §2.6 (one input surface,
// distinct underlying writes). Records are grouped by direction so received
// vs paid-out reads at a glance.
export default function FieldServicePayments({ projectId, onLogPayment }) {
  const { data: payments = [], isLoading } = useFSPayments(projectId);

  const groups = useMemo(() => {
    const received = [];
    const paid = [];
    payments.forEach((p) => {
      // Defensive: legacy records may pre-date the direction field. Without a
      // direction we can't classify, so they fall into received (the original
      // semantics of the payments form before Item 4 shipped).
      if (p.direction === 'paid') paid.push(p);
      else received.push(p);
    });
    const sumSettled = (rows) =>
      rows
        .filter((p) => p.status === 'received' || p.status === 'cleared')
        .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
    return {
      received,
      paid,
      receivedTotal: sumSettled(received),
      paidTotal: sumSettled(paid),
    };
  }, [payments]);

  const renderRow = (p) => {
    const sc = STATUS_CONFIG[p.status] || STATUS_CONFIG.pending;
    return (
      <div key={p.id} className="bg-secondary/50 rounded-lg p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {p.party_name && (
              <span className="text-sm font-medium text-foreground-soft truncate">{p.party_name}</span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.color}`}>{sc.label}</span>
            {p.method && <span className="text-xs text-muted-foreground/70 capitalize">{p.method}</span>}
            {p.reference && <span className="text-xs text-muted-foreground/70">#{p.reference}</span>}
            {!p.reference && p.check_number && <span className="text-xs text-muted-foreground/70">#{p.check_number}</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
            <span>{fmtDate(p.date)}</span>
            {p.notes && <span className="truncate">{p.notes}</span>}
          </div>
        </div>
        <p className="text-sm font-bold text-foreground flex-shrink-0">{fmt(p.amount)}</p>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Payments</h3>
        </div>
        {onLogPayment && (
          <button
            type="button"
            onClick={onLogPayment}
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover min-h-[44px]"
          >
            <Plus className="h-4 w-4" /> Log a payment
          </button>
        )}
      </div>

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        </div>
      )}

      {!isLoading && payments.length === 0 && (
        <p className="text-sm text-muted-foreground/70 text-center py-2">
          No payments recorded yet. Log a payment from the Log tab.
        </p>
      )}

      {!isLoading && groups.received.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-400" />
              Received from client
            </div>
            <span className="text-xs font-bold text-emerald-400">{fmt(groups.receivedTotal)}</span>
          </div>
          {groups.received.map(renderRow)}
        </div>
      )}

      {!isLoading && groups.paid.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ArrowUpFromLine className="h-3.5 w-3.5 text-primary" />
              Paid out to subs/vendors
            </div>
            <span className="text-xs font-bold text-primary">{fmt(groups.paidTotal)}</span>
          </div>
          {groups.paid.map(renderRow)}
        </div>
      )}
    </div>
  );
}
