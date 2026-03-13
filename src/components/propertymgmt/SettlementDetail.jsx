import React from 'react';
import { formatMonthDisplay } from './utils/calculateSettlement';
import { CheckCircle, Circle } from 'lucide-react';
import SettlementDistributions from './SettlementDistributions';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n ?? 0);
}

function StepRow({ stepNum, label, amount, isNegative, isHighlight, hideConnector }) {
  return (
    <div className="flex items-start gap-4 py-2">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-medium">
          {stepNum}
        </div>
        {!hideConnector && (
          <div className="w-0.5 flex-1 min-h-[8px] border-l-2 border-slate-700 my-0.5" />
        )}
      </div>
      <div className="flex-1 flex items-center justify-between min-h-8">
        <span className="text-sm font-semibold text-slate-300">{label}</span>
        <span
          className={
            isHighlight
              ? 'text-xl font-bold text-amber-500'
              : isNegative
                ? 'text-red-400 font-medium'
                : 'text-slate-100 font-medium'
          }
        >
          {isNegative && amount > 0 ? '-' : ''}
          {formatCurrency(isNegative ? Math.abs(amount) : amount)}
        </span>
      </div>
    </div>
  );
}

/**
 * Full waterfall breakdown for a settlement.
 * Rendered when a SettlementCard is expanded.
 */
export default function SettlementDetail({
  settlement,
  groupName,
  managerName,
  group,
  isDraft = false,
  onExpenseReconcileToggle,
}) {
  const gross_rent = Number(settlement.gross_rent) || 0;
  const total_fixed_expenses = Number(settlement.total_fixed_expenses) || 0;
  const management_fee = Number(settlement.management_fee) || 0;
  const maintenance_reserve = Number(settlement.maintenance_reserve) || 0;
  const emergency_reserve = Number(settlement.emergency_reserve) || 0;
  const total_labor_costs = Number(settlement.total_labor_costs) || 0;
  const total_reimbursements = Number(settlement.total_reimbursements) || 0;
  const net_distributable = Number(settlement.net_distributable) || 0;

  const units = settlement.units || [];
  const month_expenses = settlement.month_expenses || [];
  const month_labor = settlement.month_labor || [];
  const reimbursable_expenses = settlement.reimbursable_expenses || [];

  let distributions = [];
  try {
    const d = settlement.distributions;
    distributions = typeof d === 'string' ? JSON.parse(d || '[]') : d || [];
  } catch (_) {
    distributions = [];
  }

  const groupData = group || settlement.group;
  const mgmtPct = groupData ? Number(groupData.management_fee_pct) || 10 : 10;
  const maintPct = groupData ? Number(groupData.maintenance_reserve_pct) || 10 : 10;
  const emergPct = groupData ? Number(groupData.emergency_reserve_pct) || 5 : 5;

  return (
    <div className="bg-slate-800/50 rounded-b-lg border border-t-0 border-slate-800 p-4 pl-6">
      <div className="mb-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider">
          {groupName} · {formatMonthDisplay(settlement.month)}
        </p>
      </div>
      <div className="relative pl-0">
        {/* Step 1: Gross Rent */}
        <div className="flex items-start gap-4 py-2">
          <div className="flex flex-col items-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-medium">
              1
            </div>
            <div className="w-0.5 flex-1 min-h-[8px] border-l-2 border-slate-700 my-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300">Gross Rent</span>
              <span className="text-slate-100 font-medium">
                {formatCurrency(gross_rent)}
              </span>
            </div>
            {units.length > 0 && (
              <div className="mt-2 pl-0 space-y-1">
                {units.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between text-sm gap-2"
                  >
                    <span className="text-slate-400 truncate">{u.name}</span>
                    <span className="text-slate-100 shrink-0">
                      {formatCurrency(Number(u.monthly_rent) || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Fixed Expenses */}
        <div className="flex items-start gap-4 py-2">
          <div className="flex flex-col items-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-medium">
              2
            </div>
            <div className="w-0.5 flex-1 min-h-[8px] border-l-2 border-slate-700 my-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300">
                Fixed Expenses
              </span>
              <span className="text-red-400 font-medium">
                -{formatCurrency(total_fixed_expenses)}
              </span>
            </div>
            {month_expenses.length > 0 && (
              <div className="mt-2 pl-0 space-y-1">
                {month_expenses.map((e) => {
                  const reconciled = !!e.reconciled;
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between text-sm gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isDraft && onExpenseReconcileToggle ? (
                          <button
                            type="button"
                            onClick={() => onExpenseReconcileToggle(e)}
                            className="p-0.5 rounded hover:bg-slate-700 shrink-0"
                            aria-label={
                              reconciled ? 'Un-reconcile' : 'Mark reconciled'
                            }
                          >
                            {reconciled ? (
                              <CheckCircle className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4 text-slate-600" />
                            )}
                          </button>
                        ) : reconciled ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                        )}
                        <span className="text-slate-400 truncate">
                          {e.description || '—'}
                        </span>
                      </div>
                      <span className="text-slate-100 shrink-0">
                        {formatCurrency(Number(e.amount) || 0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <StepRow
          stepNum={3}
          label={`Management Fee (${mgmtPct}%)`}
          amount={management_fee}
          isNegative
        />
        <StepRow
          stepNum={4}
          label={`Maintenance Reserve (${maintPct}%)`}
          amount={maintenance_reserve}
          isNegative
        />
        <StepRow
          stepNum={5}
          label={`Emergency Reserve (${emergPct}%)`}
          amount={emergency_reserve}
          isNegative
        />

        {/* Step 6: Labor */}
        <div className="flex items-start gap-4 py-2">
          <div className="flex flex-col items-center shrink-0">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-medium">
              6
            </div>
            <div className="w-0.5 flex-1 min-h-[8px] border-l-2 border-slate-700 my-0.5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-300">
                Labor Costs
              </span>
              <span className="text-red-400 font-medium">
                -{formatCurrency(total_labor_costs)}
              </span>
            </div>
            {month_labor.length > 0 && (
              <div className="mt-2 pl-0 space-y-1">
                {month_labor.map((l) => {
                  const amount =
                    Number(l.total) ??
                    (Number(l.hourly_rate) || 0) * (Number(l.hours) || 0);
                  return (
                    <div
                      key={l.id}
                      className="flex items-center justify-between text-sm gap-2"
                    >
                      <span className="text-slate-400 truncate">
                        {l.worker_name || l.description || '—'}
                      </span>
                      <span className="text-slate-100 shrink-0">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Step 6.5: Manager Reimbursements */}
        {(total_reimbursements > 0 || reimbursable_expenses.length > 0) && (
          <div className="flex items-start gap-4 py-2">
            <div className="flex flex-col items-center shrink-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-medium">
                6.5
              </div>
              <div className="w-0.5 flex-1 min-h-[8px] border-l-2 border-slate-700 my-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-300">
                  Manager Reimbursements
                </span>
                <span className="text-red-400 font-medium">
                  -{formatCurrency(total_reimbursements)}
                </span>
              </div>
              {reimbursable_expenses.length > 0 && (
                <div className="mt-2 pl-0 space-y-1">
                  {reimbursable_expenses.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-400 truncate">
                        {e.description || '—'}
                      </span>
                      <span className="text-slate-100 shrink-0">
                        {formatCurrency(Number(e.amount) || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <StepRow
          stepNum={7}
          label="Net Distributable"
          amount={net_distributable}
          isNegative={false}
          isHighlight
          hideConnector
        />
      </div>

      {/* Distribution breakdown */}
      <SettlementDistributions
        distributions={distributions}
        managerName={managerName}
        managementFee={management_fee}
      />
    </div>
  );
}
