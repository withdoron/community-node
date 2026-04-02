import React from 'react';
import { Users, DollarSign, TrendingUp, Calendar } from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

export default function GuestStats({ guests }) {
  const totalGuests = guests.length;
  const totalRevenue = guests.reduce((s, g) => s + (Number(g.total_amount) || 0), 0);
  const checkedOut = guests.filter((g) => g.status === 'checked_out');
  const avgRate =
    checkedOut.length > 0
      ? checkedOut.reduce((s, g) => s + (Number(g.nightly_rate) || 0), 0) / checkedOut.length
      : 0;

  // Occupancy: percentage of days in current month that have a guest checked in
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  let occupiedDays = 0;
  guests.forEach((g) => {
    if (!g.check_in || !g.check_out) return;
    const ci = new Date(g.check_in + 'T12:00:00');
    const co = new Date(g.check_out + 'T12:00:00');
    const overlapStart = ci < monthStart ? monthStart : ci;
    const overlapEnd = co > monthEnd ? monthEnd : co;
    if (overlapStart <= overlapEnd) {
      const days = Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
      occupiedDays += days;
    }
  });
  const occupancyPct = daysInMonth > 0 ? Math.min(100, Math.round((occupiedDays / daysInMonth) * 100)) : 0;

  const stats = [
    { label: 'Total Guests', value: totalGuests, icon: Users },
    { label: 'Revenue', value: fmt(totalRevenue), icon: DollarSign },
    { label: 'Avg Rate', value: fmt(avgRate), icon: TrendingUp },
    { label: 'Occupancy', value: `${occupancyPct}%`, icon: Calendar },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.label}
            className="bg-card border border-border rounded-xl p-3"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
                {s.label}
              </span>
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
          </div>
        );
      })}
    </div>
  );
}
