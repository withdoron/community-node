import React from 'react';
import { Repeat } from 'lucide-react';

export default function FinanceRecurring({ profile }) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Repeat className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-100">Recurring</h2>
        </div>
        <p className="text-sm text-slate-400">
          Manage recurring bills and income. Set up autopay reminders and track fixed monthly costs.
        </p>
      </div>
    </div>
  );
}
