import React from 'react';
import { Clock, DollarSign, User, Activity } from 'lucide-react';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

export default function FinanceLaborStats({ totalHours, totalCost, avgRate, topWorker }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Hours</span>
        </div>
        <p className="text-lg font-bold text-foreground">
          {new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(totalHours || 0)}
        </p>
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Labor Cost</span>
        </div>
        <p className="text-lg font-bold text-primary-hover">{formatCurrency(totalCost)}</p>
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Avg Rate</span>
        </div>
        <p className="text-lg font-bold text-foreground">
          {totalHours > 0 ? formatCurrency(avgRate) : '—'}<span className="text-xs text-muted-foreground/70">/hr</span>
        </p>
      </div>
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Top Worker</span>
        </div>
        <p className="text-lg font-bold text-foreground truncate">{topWorker || '—'}</p>
      </div>
    </div>
  );
}
