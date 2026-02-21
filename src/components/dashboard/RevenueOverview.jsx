import React, { useState, useMemo } from 'react';
import { TrendingUp, DollarSign, Users, Coins, Calendar, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useBusinessRevenue } from '@/hooks/useBusinessRevenue';

const DAY_LABELS = {
  sunday: 'Sun', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat'
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount || 0);
}

function StatCard({ icon: Icon, label, value, subtext }) {
  return (
    <Card className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <Icon className="h-5 w-5 text-amber-500 mb-2" />
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
      {subtext && <p className="text-xs text-slate-500 mt-1">{subtext}</p>}
    </Card>
  );
}

function BarChart({ data, maxValue }) {
  const max = maxValue || Math.max(...(data || []).map(d => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {(data || []).map((item) => (
        <div key={item.day} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-slate-500">{item.count ?? ''}</span>
          <div
            className="w-full bg-amber-500/80 rounded-t-sm transition-all duration-300"
            style={{
              height: `${max > 0 ? ((item.count || 0) / max) * 100 : 0}%`,
              minHeight: (item.count || 0) > 0 ? '4px' : '0px'
            }}
          />
          <span className="text-xs text-slate-400">{DAY_LABELS[item.day] || item.day}</span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueOverview({ business }) {
  const tier = business?.subscription_tier || 'basic';
  const isBasicTier = tier === 'basic';
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const {
    totalRedemptions,
    totalCoinsRedeemed,
    uniqueFamilies,
    redemptionsByEvent,
    redemptionsByDay,
    estimatedPerCoinValue,
    estimatedPayout,
    isLoading,
    error
  } = useBusinessRevenue(business?.id);

  const currentMonth = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  // Basic tier — Coming Soon (pricing not finalized)
  if (isBasicTier) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Card className="bg-slate-900 border-slate-800 rounded-xl p-8 text-center">
          <div className="p-4 bg-slate-800 rounded-full inline-block mb-4">
            <TrendingUp className="h-8 w-8 text-slate-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Revenue Analytics — Coming Soon</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            When Community Pass launches, this is where you&apos;ll see your impact — pool share, check-in trends, and the families you&apos;re serving. We&apos;re building this for you.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Card className="bg-slate-900 border-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-400">Loading revenue data...</p>
        </Card>
      </div>
    );
  }

  const hasData = totalRedemptions > 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Estimated Payout Banner (DEC-037) */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-3 flex items-center gap-3">
        <Info className="h-4 w-4 text-amber-500 shrink-0" />
        <p className="text-sm text-amber-200">
          <span className="font-semibold">Estimated payout</span> — Deposits begin when Stripe Connect activates. These numbers reflect your current month&apos;s activity.
        </p>
      </div>

      {/* Month Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-amber-500" />
          Revenue — {currentMonth}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Your share from the Community Pass pool based on check-ins this month.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Estimated Payout"
          value={formatCurrency(estimatedPayout)}
          subtext={`${formatCurrency(estimatedPerCoinValue)} per coin`}
        />
        <StatCard
          icon={Coins}
          label="Coins Redeemed"
          value={totalCoinsRedeemed}
        />
        <StatCard
          icon={Users}
          label="Families Served"
          value={uniqueFamilies}
        />
        <StatCard
          icon={Calendar}
          label="Total Check-ins"
          value={totalRedemptions}
        />
      </div>

      {/* How It Works (collapsible) */}
      <Card className="bg-slate-900 border-slate-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setHowItWorksOpen(!howItWorksOpen)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-slate-100">How Pool Share Works</span>
          </div>
          {howItWorksOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>
        {howItWorksOpen && (
          <div className="px-5 pb-5 border-t border-slate-800 pt-4">
            <div className="space-y-3 text-sm text-slate-400">
              <p>
                Community Pass members pay a monthly subscription. <span className="text-amber-500 font-medium">75%</span> of that revenue goes into a shared business pool.
              </p>
              <p>
                The pool is split based on <span className="text-slate-200 font-medium">actual check-ins</span> — the more families you serve, the larger your share.
              </p>
              <div className="overflow-x-auto">
                <div className="bg-slate-800 rounded-lg p-4 mt-3">
                  <p className="text-slate-300 text-xs font-mono">
                    Your Check-ins ÷ Total Network Check-ins × Business Pool = Your Payout
                  </p>
                </div>
              </div>
              <p>
                Each Joy Coin redeemed is currently worth approximately <span className="text-amber-500 font-medium">{formatCurrency(estimatedPerCoinValue)}</span> to your business (75% of coin value).
              </p>
            </div>
          </div>
        )}
      </Card>

      {hasData ? (
        <>
          {/* By-Event Breakdown */}
          {redemptionsByEvent.length > 0 && (
            <Card className="bg-slate-900 border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-100 mb-4">By Event</h3>
              <div className="space-y-2">
                {redemptionsByEvent.map((item, i) => (
                  <div
                    key={item.eventId || i}
                    className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm text-slate-200">{item.eventTitle}</p>
                      <p className="text-xs text-slate-500">
                        {item.count} check-in{item.count !== 1 ? 's' : ''} · {item.coins} coin{item.coins !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-amber-500">
                      {formatCurrency(item.coins * estimatedPerCoinValue)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* By-Day Chart */}
          <Card className="bg-slate-900 border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-100 mb-4">Check-ins by Day of Week</h3>
            <BarChart data={redemptionsByDay} />
            <p className="text-xs text-slate-500 mt-3 text-center">
              Shows which days families visit most. Consider adjusting Joy Coin hours to match demand.
            </p>
          </Card>
        </>
      ) : (
        /* Empty State */
        <Card className="bg-slate-900 border-slate-800 rounded-xl p-8 text-center">
          <div className="p-4 bg-slate-800 rounded-full inline-block mb-4">
            <TrendingUp className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">No check-ins yet this month</h3>
          <p className="text-slate-400 max-w-sm mx-auto">
            When Community Pass families check in at your events, you&apos;ll see your revenue data here. Make sure your Joy Coin access hours are set up.
          </p>
        </Card>
      )}

      {/* Network Position placeholder — DEC-038 requires 10+ businesses */}
      {/* This section will appear in a future build once network size reaches threshold */}
    </div>
  );
}
