import React from 'react';
import { ChevronDown, ChevronUp, Trash2, Lock, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMonthDisplay } from './utils/calculateSettlement';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n ?? 0);
}

/**
 * Summary card for a single settlement.
 * Expandable to show waterfall detail below.
 */
export default function SettlementCard({
  settlement,
  groupName,
  isExpanded,
  onToggleExpand,
  onDelete,
  onFinalize,
  onUnfinalize,
  liveNetDistributable,
}) {
  const isDraft = settlement.status === 'draft';
  const netDist =
    liveNetDistributable !== undefined && liveNetDistributable !== null
      ? Number(liveNetDistributable)
      : Number(settlement.net_distributable) || 0;

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div
        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-foreground">
            {formatMonthDisplay(settlement.month)}
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">{groupName}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${
                isDraft
                  ? 'bg-primary/20 text-primary-hover'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {isDraft ? (
                <FileCheck className="w-3 h-3" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
              {isDraft ? 'Draft' : 'Finalized'}
            </span>
            {!isDraft && settlement.finalized_at && (
              <span className="text-xs text-muted-foreground/70">
                Finalized {String(settlement.finalized_at).slice(0, 10)}
              </span>
            )}
          </div>
        </div>
        <div
          className="flex items-center gap-3 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-2xl font-bold text-primary">
            {formatCurrency(netDist)}
          </p>
          {!isDraft && onUnfinalize && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onUnfinalize(settlement);
              }}
              className="border-border text-foreground-soft hover:bg-secondary hover:text-foreground"
            >
              Reopen
            </Button>
          )}
          {isDraft && onFinalize && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFinalize(settlement);
              }}
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold"
            >
              Finalize
            </Button>
          )}
          {isDraft && onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(settlement);
              }}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <button
            type="button"
            className="p-2 text-muted-foreground hover:text-foreground"
            aria-expanded={isExpanded}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
