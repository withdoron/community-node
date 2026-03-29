import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign } from 'lucide-react';

const fmtUsd = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export default function EnoughNumberCard({ profile, onClick }) {
  if (!profile) return null;

  const enoughTarget = parseFloat(profile.enough_number) || 0;

  const { data: transactions = [] } = useQuery({
    queryKey: ['mylane-finance-transactions', profile.id],
    queryFn: async () => {
      const list = await base44.entities.Transaction.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile.id,
  });

  // Current month income
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthIncome = transactions
    .filter((t) => t.type === 'income' && t.date >= monthStart)
    .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  const pct = enoughTarget > 0 ? Math.min((monthIncome / enoughTarget) * 100, 100) : 0;
  const remaining = Math.max(enoughTarget - monthIncome, 0);

  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className="bg-slate-900 border border-slate-800 rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-medium text-amber-500">Enough Number</span>
      </div>
      <div className="text-2xl font-bold text-white">{fmtUsd(monthIncome)}</div>
      <div className="text-xs text-slate-400 mt-1">
        {remaining > 0 ? `${fmtUsd(remaining)} left to enough` : 'Target reached'}
      </div>
      {enoughTarget > 0 && (
        <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden">
          <div className={`h-full ${barColor} rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
