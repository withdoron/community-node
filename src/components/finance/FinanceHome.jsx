import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, CalendarClock, Landmark } from 'lucide-react';
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
  const [formOpen, setFormOpen] = useState(false);
  const [formDefaultType, setFormDefaultType] = useState(null);

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

  // ─── Upcoming Bills (next 5 recurring expenses by next_date) ──
  const upcomingBills = useMemo(() => {
    return activeRecurring
      .filter((r) => r.type === 'expense' && r.next_date)
      .sort((a, b) => (a.next_date || '').localeCompare(b.next_date || ''))
      .slice(0, 5);
  }, [activeRecurring]);

  const openForm = (type) => {
    setFormDefaultType(type);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Card 1: The Enough Number — hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">The Enough Number</h2>
        </div>
        <p className={`text-4xl font-bold mb-2 ${getEnoughColor()}`}>
          {fmt(enoughNumber)}
        </p>
        <p className="text-sm text-slate-400">Your monthly essentials target</p>
        <p className="text-xs text-slate-500 mt-1">
          This month: {fmt(monthIncome)} income
        </p>
        {hasEnoughNumber && (
          <div className="mt-3 space-y-1">
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (monthIncome / enoughNumber) * 100)}%` }} />
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
        {hasEnoughNumber && enoughMode === 'auto' && (
          <p className="text-xs text-slate-500 mt-2">
            Auto-calculated: {fmt(recurringExpenseMonthly)} recurring + {fmt(monthlyDebtMins)} debt mins
          </p>
        )}
      </div>

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
            <button type="button" onClick={() => onNavigateTab?.('recurring')}
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

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => openForm('income')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-amber-500 text-amber-500 hover:bg-amber-500/10 transition-colors text-sm font-medium min-h-[44px]"
        >
          + Add Income
        </button>
        <button
          type="button"
          onClick={() => openForm('expense')}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-amber-500 text-amber-500 hover:bg-amber-500/10 transition-colors text-sm font-medium min-h-[44px]"
        >
          + Add Expense
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
