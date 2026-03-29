import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { DollarSign } from 'lucide-react';

const fmtUsd = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export default function EnoughNumberCard({ profile, onClick, onUrgency }) {
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

  // Time awareness: last 7 days of month + below target
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();
  const endOfMonthUrgent = daysLeft <= 7 && remaining > 0 && enoughTarget > 0;

  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  const borderColor = endOfMonthUrgent ? 'border-amber-500/40' : 'border-slate-800';
  const valueColor = endOfMonthUrgent && pct < 50 ? 'text-amber-400' : 'text-white';

  // Report urgency to parent for sort boost
  useEffect(() => {
    onUrgency?.('enough-number', endOfMonthUrgent);
  }, [endOfMonthUrgent, onUrgency]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.(); }}
      className={`bg-slate-900 border ${borderColor} rounded-xl p-4 cursor-pointer hover:border-amber-500/30 transition-colors`}
    >
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="h-4 w-4 text-amber-500" />
        <span className="text-xs font-medium text-amber-500">Enough Number</span>
      </div>
      <div className={`text-2xl font-bold ${valueColor}`}>{fmtUsd(monthIncome)}</div>
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
