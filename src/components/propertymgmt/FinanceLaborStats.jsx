import React from 'react';
import { Clock, DollarSign, User, Activity } from 'lucide-react';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

export default function FinanceLaborStats({ totalHours, totalCost, avgRate, topWorker }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">Hours</span>
        </div>
        <p className="text-lg font-bold text-slate-100">
          {new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(totalHours || 0)}
        </p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-amber-500" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">Labor Cost</span>
        </div>
        <p className="text-lg font-bold text-amber-400">{formatCurrency(totalCost)}</p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">Avg Rate</span>
        </div>
        <p className="text-lg font-bold text-slate-100">
          {totalHours > 0 ? formatCurrency(avgRate) : '—'}<span className="text-xs text-slate-500">/hr</span>
        </p>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 uppercase tracking-wide">Top Worker</span>
        </div>
        <p className="text-lg font-bold text-slate-100 truncate">{topWorker || '—'}</p>
      </div>
    </div>
  );
}
