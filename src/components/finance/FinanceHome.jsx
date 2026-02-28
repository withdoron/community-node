import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, CalendarClock, Landmark } from 'lucide-react';
import TransactionForm from './TransactionForm';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

export default function FinanceHome({ profile, currentUser, onNavigateTab }) {
  const [formOpen, setFormOpen] = useState(false);
  const [formDefaultType, setFormDefaultType] = useState(null);

  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();
  const monthStart = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  // Query transactions for this profile
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

  // Filter to current month
  const monthTransactions = useMemo(() => {
    return allTransactions.filter((t) => {
      const td = (t.date || '').split('T')[0];
      return td >= monthStart;
    });
  }, [allTransactions, monthStart]);

  // Calculate cash flow
  const monthIncome = useMemo(
    () => monthTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0),
    [monthTransactions]
  );
  const monthExpenses = useMemo(
    () => monthTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0),
    [monthTransactions]
  );
  const monthNet = monthIncome - monthExpenses;

  // Enough Number logic
  const enoughMode = profile?.enough_number_mode || 'auto';
  const enoughManual = profile?.enough_number;
  const enoughNumber = enoughMode === 'manual' && enoughManual ? enoughManual : 0;
  const hasEnoughNumber = enoughMode === 'manual' && enoughManual > 0;

  // Color for Enough Number
  const getEnoughColor = () => {
    if (!hasEnoughNumber) return 'text-amber-500'; // neutral when not set
    if (monthIncome >= enoughNumber) return 'text-emerald-400';
    if (monthIncome >= enoughNumber * 0.9) return 'text-amber-500';
    return 'text-red-400';
  };

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
        {!hasEnoughNumber && (
          <p className="text-xs text-slate-500 mt-2">
            Add recurring expenses and debts to calculate your Enough Number
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
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">Upcoming Bills</h2>
        </div>
        <p className="text-sm text-slate-500">No recurring expenses set up yet</p>
      </div>

      {/* Card 4: Debt Snapshot */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Landmark className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">Debt Overview</h2>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Total Debt</span>
            <span className="text-slate-100">{fmt(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Monthly Minimums</span>
            <span className="text-slate-100">{fmt(0)}</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          No debts tracked yet — that's great, or add them to start tracking
        </p>
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
