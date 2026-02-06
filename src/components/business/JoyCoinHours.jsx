import React from 'react';
import { Coins } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAccessWindows } from '@/hooks/useAccessWindows';

const DAY_ABBREV = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun'
};

function formatTime(time24) {
  if (!time24) return '';
  const parts = time24.split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1] ? parseInt(parts[1], 10) : 0;
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m === 0 ? `${hour12}${period}` : `${hour12}:${String(m).padStart(2, '0')}${period}`;
}

export default function JoyCoinHours({ businessId }) {
  const { activeWindows, isLoading } = useAccessWindows(businessId);

  if (isLoading || !activeWindows?.length) return null;

  return (
    <Card className="p-4 bg-slate-900 border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        <Coins className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-slate-100">Joy Coin Hours</h3>
      </div>

      <div className="space-y-2">
        {activeWindows.map((window) => (
          <div
            key={window.id}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-slate-300 w-8 shrink-0">
                {DAY_ABBREV[window.day_of_week] || window.day_of_week?.slice(0, 3)}
              </span>
              <span className="text-slate-400">
                {formatTime(window.start_time)}–{formatTime(window.end_time)}
              </span>
            </div>
            <Badge
              className="bg-amber-500/20 text-amber-400 border-0 text-xs px-2 py-0.5"
            >
              {window.coin_cost} {window.coin_cost === 1 ? 'coin' : 'coins'}
            </Badge>
          </div>
        ))}
      </div>

      {activeWindows.some(w => w.label) && (
        <div className="mt-3 pt-3 border-t border-slate-800">
          {activeWindows.filter(w => w.label).map((window) => (
            <p key={window.id} className="text-xs text-slate-500">
              {DAY_ABBREV[window.day_of_week]}: {window.label}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}
