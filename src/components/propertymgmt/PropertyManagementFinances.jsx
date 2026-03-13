import React from 'react';
import { DollarSign } from 'lucide-react';

export default function PropertyManagementFinances() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
        <DollarSign className="h-8 w-8 text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-100 mb-2">Finances</h2>
      <p className="text-slate-400 text-sm text-center max-w-md">
        Expense tracking, labor logging, and monthly settlements coming in Session 3.
        Includes the full settlement waterfall with reserve calculations and owner distributions.
      </p>
    </div>
  );
}
