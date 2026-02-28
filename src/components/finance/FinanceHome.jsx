import React from 'react';
import { DollarSign, TrendingUp, CalendarClock, Landmark } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const now = new Date();
const monthName = now.toLocaleString('en-US', { month: 'long' });
const year = now.getFullYear();

export default function FinanceHome({ profile }) {
  return (
    <div className="space-y-6">
      {/* Card 1: The Enough Number — hero */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">The Enough Number</h2>
        </div>
        <p className="text-4xl font-bold text-amber-500 mb-2">{fmt(0)}</p>
        <p className="text-sm text-slate-400">Your monthly essentials target</p>
        <p className="text-xs text-slate-500 mt-1">This month: {fmt(0)} income</p>
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
            <span className="text-slate-100">{fmt(0)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Expenses</span>
            <span className="text-slate-100">{fmt(0)}</span>
          </div>
          <div className="border-t border-slate-800 pt-2 mt-2 flex justify-between text-sm font-medium">
            <span className="text-slate-300">Net</span>
            <span className="text-slate-100">{fmt(0)}</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">Add transactions to see your monthly summary</p>
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
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-amber-500 text-amber-500 hover:bg-amber-500/10 transition-colors text-sm font-medium min-h-[44px]"
        >
          + Add Income
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-amber-500 text-amber-500 hover:bg-amber-500/10 transition-colors text-sm font-medium min-h-[44px]"
        >
          + Add Expense
        </button>
      </div>
    </div>
  );
}
