import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, TrendingUp, CalendarClock, Landmark, X, Info, PieChart } from 'lucide-react';
import TransactionForm from './TransactionForm';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const fmtShortDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + (d.includes('T') ? '' : 'T12:00:00'));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/** Convert any frequency to a monthly equivalent. */
function toMonthly(amount, frequency) {
  switch (frequency) {
    case 'weekly': return amount * 4.33;
    case 'biweekly': return amount * 2.17;
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'annual': return amount / 12;
    default: return amount;
  }
}

export default function FinanceHome({ profile, currentUser, onNavigateTab }) {
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [formDefaultType, setFormDefaultType] = useState(null);
  const [explanationDismissed, setExplanationDismissed] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();
  const monthStart = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // ─── Query: Transactions ────────────────────────
  const { data: allTransactions = [] } = useQuery({
    queryKey: ['finance-transactions', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.Transaction.filter(
        { profile_id: profile.id },
        '-date',
        1000
      );
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Recurring Transactions ──────────────
  const { data: recurringItems = [] } = useQuery({
    queryKey: ['finance-recurring', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.RecurringTransaction.filter(
        { profile_id: profile.id },
        'description',
        500
      );
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Debts ───────────────────────────────
  const { data: debts = [] } = useQuery({
    queryKey: ['finance-debts', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.Debt.filter(
        { profile_id: profile.id },
        'priority',
        200
      );
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Derived: Monthly Cash Flow ─────────────────
  const monthTransactions = useMemo(() => {
    return allTransactions.filter((t) => {
      const td = (t.date || '').split('T')[0];
      return td >= monthStart;
    });
  }, [allTransactions, monthStart]);

  const monthIncome = useMemo(
    () => monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0),
    [monthTransactions]
  );
  const monthExpenses = useMemo(
    () => monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0),
    [monthTransactions]
  );
  const monthNet = monthIncome - monthExpenses;

  // ─── Derived: Active Recurring ──────────────────
  const activeRecurring = useMemo(
    () => recurringItems.filter((r) => r.is_active !== false),
    [recurringItems]
  );

  const recurringExpenseMonthly = useMemo(
    () => activeRecurring
      .filter((r) => r.type === 'expense')
      .reduce((s, r) => s + toMonthly(r.amount || 0, r.frequency || 'monthly'), 0),
    [activeRecurring]
  );

  // ─── Derived: Active Debts ──────────────────────
  const activeDebts = useMemo(
    () => debts.filter((d) => d.status !== 'paid_off'),
    [debts]
  );

  const totalDebt = useMemo(
    () => activeDebts.reduce((s, d) => s + (d.current_balance || 0), 0),
    [activeDebts]
  );

  const monthlyDebtMins = useMemo(
    () => activeDebts.reduce((s, d) => s + (d.minimum_payment || 0), 0),
    [activeDebts]
  );

  // ─── Enough Number ─────────────────────────────
  const enoughMode = profile?.enough_number_mode || 'auto';
  const enoughManual = profile?.enough_number;

  const autoEnoughNumber = recurringExpenseMonthly + monthlyDebtMins;
  const enoughNumber = enoughMode === 'manual' && enoughManual
    ? enoughManual
    : autoEnoughNumber;
  const hasEnoughNumber = enoughNumber > 0;

  const getEnoughColor = () => {
    if (!hasEnoughNumber) return 'text-amber-500';
    if (monthIncome >= enoughNumber) return 'text-emerald-400';
    if (monthIncome >= enoughNumber * 0.9) return 'text-amber-500';
    return 'text-red-400';
  };

  // ─── Left to Spend ──────────────────────────────
  const leftToSpend = monthIncome - enoughNumber;

  const getLeftToSpendColor = () => {
    if (leftToSpend < 0) return 'text-red-400';
    if (hasEnoughNumber && leftToSpend < enoughNumber * 0.1) return 'text-amber-500';
    return 'text-emerald-400';
  };

  const getLeftToSpendText = () => {
    if (leftToSpend < 0) {
      return `You're ${fmt(Math.abs(leftToSpend))} over this month`;
    }
    if (hasEnoughNumber && leftToSpend < enoughNumber * 0.1) {
      return `Tight month — ${fmt(leftToSpend)} left`;
    }
    return `You have ${fmt(leftToSpend)} left to spend this month`;
  };

  // ─── Explanation dismiss ────────────────────────
  const showExplanation = !profile?.enough_number_explained && !explanationDismissed;

  const dismissExplanation = useMutation({
    mutationFn: () =>
      base44.entities.FinancialProfile.update(profile.id, { enough_number_explained: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-profiles'] });
    },
    // Silently ignore errors (field may not exist in entity yet)
    onError: () => {},
  });

  const handleDismissExplanation = () => {
    setExplanationDismissed(true);
    dismissExplanation.mutate();
  };

  // ─── Upcoming Bills (next 5 recurring expenses by next_date) ──
  const upcomingBills = useMemo(() => {
    return activeRecurring
      .filter((r) => r.type === 'expense' && r.next_date)
      .sort((a, b) => (a.next_date || '').localeCompare(b.next_date || ''))
      .slice(0, 5);
  }, [activeRecurring]);

  // ─── Profit First helpers ───────────────────────
  const businessContext = useMemo(() => {
    const entries = Object.entries(profile?.contexts || {});
    return entries.find(([, ctx]) => ctx.tax_schedule === 'schedule_c' && ctx.is_active);
  }, [profile?.contexts]);

  const pfEnabled = !!profile?.profit_first_enabled && !!businessContext;
  const pfTargets = profile?.profit_first_targets || { profit: 5, owners_pay: 50, tax_reserve: 15, operating_expenses: 30 };

  const pfData = useMemo(() => {
    if (!pfEnabled || !businessContext) return null;
    const [ctxId, ctx] = businessContext;
    const bizTxns = monthTransactions.filter((t) => t.context === ctxId);
    const bizIncome = bizTxns.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
    const bizExpenses = bizTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const opExPct = bizIncome > 0 ? (bizExpenses / bizIncome) * 100 : 0;
    const profitPct = bizIncome > 0 ? 100 - opExPct : 0;
    return {
      label: ctx.label,
      revenue: bizIncome,
      hasTxns: bizTxns.length > 0,
      rows: [
        { key: 'profit', label: 'Profit', actual: profitPct, target: pfTargets.profit },
        { key: 'owners_pay', label: "Owner's Pay", actual: 0, target: pfTargets.owners_pay },
        { key: 'tax_reserve', label: 'Tax Reserve', actual: 0, target: pfTargets.tax_reserve },
        { key: 'operating_expenses', label: 'Operating Expenses', actual: opExPct, target: pfTargets.operating_expenses },
      ],
    };
  }, [pfEnabled, businessContext, monthTransactions, pfTargets]);

  // ─── Context helpers ────────────────────────────
  const contextCount = Object.keys(profile?.contexts || {}).length;

  const openForm = (type) => {
    setFormDefaultType(type);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* First-view Explanation (dismissible) */}
      {showExplanation && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 relative">
          <button
            type="button"
            onClick={handleDismissExplanation}
            className="absolute top-3 right-3 text-slate-400 hover:text-amber-500 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <p className="text-sm text-slate-200 pr-6">
            <span className="font-semibold text-amber-500">Your Enough Number</span> is the monthly
            amount that covers your essentials. Above it, you're building. Below it, you know exactly
            where to focus.
          </p>
        </div>
      )}

      {/* Card 1: The Enough Number — hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">The Enough Number</h2>
        </div>
        <p className={`text-4xl font-bold mb-2 ${getEnoughColor()}`}>
          {fmt(enoughNumber)}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-400">Your monthly essentials</p>
          {hasEnoughNumber && (
            <button
              type="button"
              onClick={() => setShowBreakdown((prev) => !prev)}
              className="text-slate-500 hover:text-amber-500 transition-colors"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Breakdown (toggle on info click) */}
        {showBreakdown && hasEnoughNumber && enoughMode === 'auto' && (
          <div className="mt-3 bg-slate-800/50 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Recurring expenses</span>
              <span className="text-slate-300">{fmt(recurringExpenseMonthly)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Debt minimums</span>
              <span className="text-slate-300">{fmt(monthlyDebtMins)}</span>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-500 mt-2">
          This month: {fmt(monthIncome)} income
        </p>
        {hasEnoughNumber && (
          <div className="mt-3 space-y-1">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (monthIncome / enoughNumber) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 text-right">
              {((monthIncome / enoughNumber) * 100).toFixed(0)}% covered
            </p>
          </div>
        )}
        {!hasEnoughNumber && (
          <p className="text-xs text-slate-500 mt-2">
            Add recurring expenses and debts to calculate your Enough Number
          </p>
        )}
      </div>

      {/* Card 1b: Left to Spend — companion metric */}
      {hasEnoughNumber && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <p className={`text-2xl font-semibold ${getLeftToSpendColor()}`}>
            {getLeftToSpendText()}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {fmt(monthIncome)} income − {fmt(enoughNumber)} essentials
          </p>
        </div>
      )}

      {/* Card 2: Monthly Cash Flow */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">Cash Flow — {monthName} {year}</h2>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Income</span>
            <span className="text-emerald-400">{fmt(monthIncome)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Expenses</span>
            <span className="text-red-400">{fmt(monthExpenses)}</span>
          </div>
          <div className="border-t border-slate-800 pt-2 mt-2 flex justify-between text-sm font-medium">
            <span className="text-slate-300">Net</span>
            <span className={monthNet >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {fmt(monthNet)}
            </span>
          </div>
        </div>
        {monthTransactions.length === 0 && (
          <p className="text-xs text-slate-500 mt-4">Add transactions to see your monthly summary</p>
        )}
      </div>

      {/* Card 3: Upcoming Bills */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-100">Upcoming Bills</h2>
          </div>
          {upcomingBills.length > 0 && (
            <button type="button" onClick={() => onNavigateTab?.('bills')}
              className="text-xs text-amber-500 hover:text-amber-400">
              View all
            </button>
          )}
        </div>
        {upcomingBills.length === 0 ? (
          <p className="text-sm text-slate-500">
            {activeRecurring.filter((r) => r.type === 'expense').length > 0
              ? 'Set next dates on recurring expenses to see upcoming bills'
              : 'No recurring expenses set up yet'}
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingBills.map((bill) => (
              <div key={bill.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-slate-500 w-16 flex-shrink-0">
                    {fmtShortDate(bill.next_date)}
                  </span>
                  <span className="text-slate-300 truncate">{bill.description}</span>
                </div>
                <span className="text-red-400 flex-shrink-0 ml-2">{fmt(bill.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Card 4: Debt Snapshot */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-100">Debt Overview</h2>
          </div>
          {activeDebts.length > 0 && (
            <button type="button" onClick={() => onNavigateTab?.('debts')}
              className="text-xs text-amber-500 hover:text-amber-400">
              View all
            </button>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Debt</span>
            <span className={totalDebt > 0 ? 'text-red-400' : 'text-slate-100'}>{fmt(totalDebt)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Monthly Minimums</span>
            <span className="text-slate-100">{fmt(monthlyDebtMins)}</span>
          </div>
          {activeDebts.length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Active Debts</span>
              <span className="text-slate-100">{activeDebts.length}</span>
            </div>
          )}
        </div>
        {activeDebts.length === 0 && (
          <p className="text-xs text-slate-500 mt-4">
            No debts tracked yet — that's great, or add them to start tracking
          </p>
        )}
      </div>

      {/* Card 5: Profit First Allocation (only when enabled + business context) */}
      {pfData && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-100">Profit First — {pfData.label}</h2>
            </div>
            <button type="button" onClick={() => onNavigateTab?.('settings')}
              className="text-xs text-amber-500 hover:text-amber-400">
              Targets
            </button>
          </div>

          {!pfData.hasTxns ? (
            <p className="text-sm text-slate-500">
              No business transactions this month. Add income and expenses to see your allocation.
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-400 mb-4">
                {monthName} revenue: <span className="text-emerald-400 font-medium">{fmt(pfData.revenue)}</span>
              </p>
              <div className="space-y-3">
                {pfData.rows.map((row) => {
                  const barColor =
                    row.actual >= row.target
                      ? 'bg-emerald-500'
                      : row.actual >= row.target - 5
                        ? 'bg-amber-500'
                        : 'bg-red-500';
                  const textColor =
                    row.actual >= row.target
                      ? 'text-emerald-400'
                      : row.actual >= row.target - 5
                        ? 'text-amber-500'
                        : 'text-red-400';
                  return (
                    <div key={row.key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-300">{row.label}</span>
                        <span className="text-xs text-slate-400">
                          <span className={textColor}>{row.actual.toFixed(0)}%</span>
                          {' / '}
                          <span className="text-slate-500">{row.target}%</span>
                        </span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${barColor} rounded-full transition-all`}
                          style={{ width: `${Math.min(100, row.actual)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick Actions — Expense primary, Income secondary */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => openForm('expense')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors text-sm min-h-[44px]"
        >
          + Add Expense
        </button>
        <button
          type="button"
          onClick={() => openForm('income')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-amber-500 text-amber-500 hover:bg-amber-500/10 transition-colors text-sm font-medium min-h-[44px]"
        >
          + Add Income
        </button>
      </div>

      {/* Transaction Form Dialog (opened from quick actions) */}
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        profile={profile}
        currentUser={currentUser}
        transaction={null}
        defaultType={formDefaultType}
      />
    </div>
  );
}
