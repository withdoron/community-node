import React from 'react';
import { Landmark } from 'lucide-react';

export default function FinanceDebts({ profile }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Landmark className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">Debts</h2>
        </div>
        <p className="text-sm text-slate-400">
          Track and pay down debts. See balances, interest rates, and payoff projections.
        </p>
      </div>
    </div>
  );
}
