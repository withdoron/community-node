import React from 'react';
import { Pencil, Trash2, ChevronRight, Users } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + (d.includes('T') ? '' : 'T12:00:00'));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const STATUS_STYLES = {
  confirmed: 'bg-blue-500/20 text-blue-400',
  checked_in: 'bg-green-500/20 text-green-400',
  checked_out: 'bg-surface text-muted-foreground',
  cancelled: 'bg-red-500/20 text-red-400',
};

const STATUS_LABELS = {
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  checked_out: 'Checked Out',
  cancelled: 'Cancelled',
};

const SOURCE_STYLES = {
  direct: 'bg-primary/20 text-primary',
  airbnb: 'bg-rose-500/20 text-rose-400',
  vrbo: 'bg-blue-500/20 text-blue-400',
  other: 'bg-surface text-muted-foreground',
};

export default function GuestList({
  guests,
  propertyLabels,
  onEdit,
  onDelete,
  onStatusAction,
}) {
  if (guests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Users className="h-7 w-7 text-primary" />
        </div>
        <p className="text-foreground-soft font-medium mb-1">No guests yet</p>
        <p className="text-muted-foreground/70 text-sm text-center max-w-xs">
          Add your first guest booking to start tracking short-term rentals
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {guests.map((g) => {
        // Calculate nights
        let nights = 0;
        if (g.check_in && g.check_out) {
          const ci = new Date(g.check_in + 'T12:00:00');
          const co = new Date(g.check_out + 'T12:00:00');
          nights = Math.max(0, Math.ceil((co - ci) / (1000 * 60 * 60 * 24)));
        }

        // Next status action
        const nextAction =
          g.status === 'confirmed'
            ? { label: 'Check In', next: 'checked_in' }
            : g.status === 'checked_in'
              ? { label: 'Check Out', next: 'checked_out' }
              : null;

        return (
          <div
            key={g.id}
            className="bg-card border border-border rounded-xl p-4 hover:border-border transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {g.guest_name || 'Unnamed Guest'}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[g.status] || STATUS_STYLES.confirmed}`}>
                    {STATUS_LABELS[g.status] || g.status}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${SOURCE_STYLES[g.booking_source] || SOURCE_STYLES.other}`}>
                    {(g.booking_source || 'direct').charAt(0).toUpperCase() + (g.booking_source || 'direct').slice(1)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground/70 truncate">
                  {propertyLabels[g.property_id] || '—'}
                </p>

                {/* Dates + pricing */}
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                  <span>
                    {fmtDate(g.check_in)} → {fmtDate(g.check_out)}
                    {nights > 0 && ` (${nights} night${nights !== 1 ? 's' : ''})`}
                  </span>
                  {g.nightly_rate > 0 && (
                    <span>{fmt(g.nightly_rate)}/night</span>
                  )}
                  {g.num_guests > 0 && (
                    <span>{g.num_guests} guest{g.num_guests !== 1 ? 's' : ''}</span>
                  )}
                </div>

                {/* Total */}
                {g.total_amount > 0 && (
                  <p className="text-sm font-bold text-primary mt-1.5">
                    {fmt(g.total_amount)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {nextAction && (
                  <button
                    type="button"
                    onClick={() => onStatusAction(g, nextAction.next)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover min-h-[28px] font-medium"
                  >
                    {nextAction.label} <ChevronRight className="w-3 h-3" />
                  </button>
                )}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onEdit(g)}
                    className="text-muted-foreground hover:text-foreground p-1 min-h-[28px]"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(g)}
                    className="text-muted-foreground/70 hover:text-red-400 p-1 min-h-[28px]"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
