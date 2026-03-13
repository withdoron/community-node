import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

export default function FinanceRunningTotals({ income, expenses, net }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">Income</span>
        </div>
        <p className="text-lg font-bold text-emerald-400">{formatCurrency(income)}</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">Expenses</span>
        </div>
        <p className="text-lg font-bold text-amber-400">{formatCurrency(expenses)}</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">Net</span>
        </div>
        <p className={`text-lg font-bold ${net >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
          {formatCurrency(net)}
        </p>
      </div>
    </div>
  );
}
