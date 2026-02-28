import React from 'react';
import { Button } from '@/components/ui/button';
import { Users, Coins, Wallet, Calendar } from 'lucide-react';

/**
 * Home tab for the business workspace dashboard.
 * Renders stat cards, upcoming events list, and quick action buttons.
 * Used by BusinessDashboard via workspace tab config.
 */
export default function DashboardHome({
  revenue,
  businessEvents = [],
  eventRsvpCounts = {},
  onNavigateTab,
}) {
  const now = new Date();
  const thisMonthEvents = businessEvents.filter((e) => {
    const d = new Date(e.date || e.start_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const upcoming = businessEvents
    .filter((e) => new Date(e.date || e.start_date) >= now)
    .sort((a, b) => new Date(a.date || a.start_date) - new Date(b.date || b.start_date))
    .slice(0, 3);

  return (
    <>
      <p className="text-lg text-slate-300 mb-6">
        {revenue.totalRedemptions > 0 ? (
          <>
            This month, {revenue.uniqueFamilies} families visited through LocalLane. Your estimated pool share:{' '}
            <span className="text-amber-500 font-bold">${Number(revenue.estimatedPayout).toFixed(2)}</span>
          </>
        ) : (
          'Welcome to your LocalLane dashboard! Set your Joy Coin access hours and create events to start receiving families.'
        )}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <Users className="h-5 w-5 text-amber-500 mb-2" />
          <div className="text-2xl font-bold text-slate-100">{revenue.uniqueFamilies}</div>
          <div className="text-sm text-slate-400">Families Served</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <Coins className="h-5 w-5 text-amber-500 mb-2" />
          <div className="text-2xl font-bold text-slate-100">{revenue.totalCoinsRedeemed}</div>
          <div className="text-sm text-slate-400">Joy Coins Redeemed</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <Wallet className="h-5 w-5 text-amber-500 mb-2" />
          <div className="text-2xl font-bold text-slate-100">
            ${Number(revenue.estimatedPayout).toFixed(2)}
          </div>
          <div className="text-sm text-slate-400">Pool Share</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <Calendar className="h-5 w-5 text-amber-500 mb-2" />
          <div className="text-2xl font-bold text-slate-100">{thisMonthEvents}</div>
          <div className="text-sm text-slate-400">Events This Month</div>
        </div>
      </div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-100">Upcoming Events</h2>
          <button
            type="button"
            onClick={() => onNavigateTab?.('events')}
            className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
          >
            See All →
          </button>
        </div>
        {upcoming.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-center">
            <p className="text-slate-400 mb-4">No upcoming events. Create one to start attracting families.</p>
            <Button
              variant="outline"
              className="bg-transparent border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent transition-colors"
              onClick={() => onNavigateTab?.('events')}
            >
              Create Event
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((event) => {
              const rsvpCount = eventRsvpCounts[event.id] ?? 0;
              return (
                <div
                  key={event.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium text-slate-100">{event.title}</div>
                    <div className="text-sm text-slate-400">
                      {event.date || event.start_date ? new Date(event.date || event.start_date).toLocaleString() : '—'}
                      {rsvpCount !== undefined && (
                        <span className="ml-2 text-slate-500">
                          — {rsvpCount === 0 ? 'No RSVPs yet' : `${rsvpCount} RSVP${rsvpCount !== 1 ? 's' : ''}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    {event.joy_coin_enabled && event.joy_coin_cost > 0 && (
                      <span className="text-amber-500">{event.joy_coin_cost} coin(s)</span>
                    )}
                    <span>—</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          className="bg-transparent border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent transition-colors"
          onClick={() => onNavigateTab?.('events')}
        >
          Create Event
        </Button>
        <Button
          variant="outline"
          className="bg-transparent border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent transition-colors"
          onClick={() => onNavigateTab?.('joy-coins')}
        >
          Joy Coin Hours
        </Button>
        <Button
          variant="outline"
          className="bg-transparent border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent transition-colors"
          onClick={() => onNavigateTab?.('revenue')}
        >
          View Revenue
        </Button>
      </div>
    </>
  );
}
