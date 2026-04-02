import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { calculateSettlement, formatMonthDisplay, getCurrentMonth } from './utils/calculateSettlement';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

const inputClass =
  'rounded-md bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-ring px-3 py-2 text-sm';

/**
 * Waterfall summary view: shows settlement breakdown per property group for a selected month.
 */
export default function FinanceSummaryView({
  groups,
  properties,
  expenses,
  laborEntries,
  owners,
  ownershipStakes,
  distributionSplits,
}) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [expandedLines, setExpandedLines] = useState({});

  const toggleExpand = (key) =>
    setExpandedLines((prev) => ({ ...prev, [key]: !prev[key] }));

  // Generate month options (current + 11 past)
  const monthOptions = useMemo(() => {
    const opts = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      opts.push({ value: val, label: formatMonthDisplay(val) });
    }
    return opts;
  }, []);

  const allData = useMemo(
    () => ({
      groups,
      properties,
      expenses,
      laborEntries,
      owners,
      ownershipStakes,
      distributionSplits,
    }),
    [groups, properties, expenses, laborEntries, owners, ownershipStakes, distributionSplits]
  );

  const settlements = useMemo(() => {
    return (groups || [])
      .map((g) => calculateSettlement(g.id, selectedMonth, allData))
      .filter(Boolean);
  }, [groups, selectedMonth, allData]);

  const safeParseDistributions = (dists) => {
    if (!dists) return [];
    if (typeof dists === 'string') {
      try { return JSON.parse(dists); } catch { return []; }
    }
    return Array.isArray(dists) ? dists : [];
  };

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-muted-foreground">Month:</label>
        <select
          className={inputClass + ' w-auto min-w-[180px]'}
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {settlements.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No property groups to display for {formatMonthDisplay(selectedMonth)}</p>
        </div>
      )}

      {settlements.map((s) => {
        const distributions = safeParseDistributions(s.distributions);
        const groupKey = s.group_id;

        const lines = [
          { label: 'Gross Rent', amount: s.gross_rent, type: 'income', items: s.units, itemLabel: (u) => `${u.name}: ${formatCurrency(u.monthly_rent)}/mo` },
          { label: 'Fixed Expenses', amount: -s.total_fixed_expenses, type: 'expense', items: s.month_expenses, itemLabel: (e) => `${e.category}: ${formatCurrency(e.amount)} — ${e.description || 'No description'}` },
          { label: `Management Fee (${Number(s.group?.management_fee_pct) || 10}%)`, amount: -s.management_fee, type: 'expense' },
          { label: `Maintenance Reserve (${Number(s.group?.maintenance_reserve_pct) || 10}%)`, amount: -s.maintenance_reserve, type: 'expense' },
          { label: `Emergency Reserve (${Number(s.group?.emergency_reserve_pct) || 5}%)`, amount: -s.emergency_reserve, type: 'expense' },
          { label: 'Labor Costs', amount: -s.total_labor_costs, type: 'expense', items: s.month_labor, itemLabel: (l) => `${l.worker_name}: ${l.hours}h × ${formatCurrency(l.hourly_rate)} = ${formatCurrency(l.total)}` },
          { label: 'Reimbursements', amount: -s.total_reimbursements, type: 'expense', items: s.reimbursable_expenses, itemLabel: (e) => `${e.category}: ${formatCurrency(e.amount)} — ${e.description || ''}` },
        ];

        return (
          <div key={groupKey} className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">{s.group?.name || 'Unknown Group'}</h3>

            <div className="space-y-1">
              {lines.map((line, i) => {
                const expandKey = `${groupKey}-${i}`;
                const hasItems = line.items && line.items.length > 0;
                const isExpanded = expandedLines[expandKey];

                return (
                  <div key={i}>
                    <button
                      type="button"
                      onClick={() => hasItems && toggleExpand(expandKey)}
                      className={`w-full flex items-center justify-between py-2 px-2 rounded transition-colors ${
                        hasItems ? 'hover:bg-secondary cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {hasItems ? (
                          isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/70" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/70" />
                          )
                        ) : (
                          <span className="w-3.5" />
                        )}
                        <span className="text-sm text-foreground-soft">{line.label}</span>
                      </div>
                      <span
                        className={`text-sm font-mono font-medium ${
                          line.type === 'income' ? 'text-emerald-400' : 'text-primary-hover'
                        }`}
                      >
                        {line.amount >= 0 ? '' : ''}{formatCurrency(Math.abs(line.amount))}
                        {line.amount < 0 && <span className="text-xs ml-1 text-muted-foreground/70">−</span>}
                      </span>
                    </button>
                    {isExpanded && hasItems && (
                      <div className="ml-8 mb-2 space-y-1">
                        {line.items.map((item, j) => (
                          <p key={j} className="text-xs text-muted-foreground/70 py-0.5">
                            {line.itemLabel(item)}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Separator */}
            <div className="border-t border-border my-3" />

            {/* Net distributable */}
            <div className="flex items-center justify-between py-2 px-2">
              <span className="text-sm font-semibold text-foreground">Net Distributable</span>
              <span
                className={`text-lg font-bold font-mono ${
                  s.net_distributable >= 0 ? 'text-emerald-400' : 'text-primary-hover'
                }`}
              >
                {formatCurrency(s.net_distributable)}
              </span>
            </div>

            {/* Distributions */}
            {distributions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-xs text-muted-foreground/70 uppercase tracking-wide mb-2">
                  Owner Distributions
                </h4>
                <div className="space-y-2">
                  {distributions.map((d, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 px-2 bg-secondary/50 rounded"
                    >
                      <div className="min-w-0">
                        <span className="text-sm text-foreground">{d.owner_name}</span>
                        <span className="text-xs text-muted-foreground/70 ml-2">
                          {d.ownership_pct}%
                        </span>
                        {d.reimbursement > 0 && (
                          <span className="text-xs text-primary-hover ml-2">
                            +{formatCurrency(d.reimbursement)} reimb.
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-foreground font-mono">
                        {formatCurrency(d.net_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
