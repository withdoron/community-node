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
    <Card className="bg-card border border-border rounded-xl p-4">
      <Icon className="h-5 w-5 text-primary mb-2" />
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {subtext && <p className="text-xs text-muted-foreground/70 mt-1">{subtext}</p>}
    </Card>
  );
}

function BarChart({ data, maxValue }) {
  const max = maxValue || Math.max(...(data || []).map(d => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {(data || []).map((item) => (
        <div key={item.day} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground/70">{item.count ?? ''}</span>
          <div
            className="w-full bg-primary/80 rounded-t-sm transition-all duration-300"
            style={{
              height: `${max > 0 ? ((item.count || 0) / max) * 100 : 0}%`,
              minHeight: (item.count || 0) > 0 ? '4px' : '0px'
            }}
          />
          <span className="text-xs text-muted-foreground">{DAY_LABELS[item.day] || item.day}</span>
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
        <Card className="bg-card border-border rounded-xl p-8 text-center">
          <div className="p-4 bg-secondary rounded-full inline-block mb-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground/70" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Revenue Analytics — Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            When Community Pass launches, this is where you&apos;ll see your impact — pool share, check-in trends, and the families you&apos;re serving. We&apos;re building this for you.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Card className="bg-card border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Loading revenue data...</p>
        </Card>
      </div>
    );
  }

  const hasData = totalRedemptions > 0;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Estimated Payout Banner (DEC-037) */}
      <div className="bg-primary/10 border border-primary/30 rounded-xl px-5 py-3 flex items-center gap-3">
        <Info className="h-4 w-4 text-primary shrink-0" />
        <p className="text-sm text-amber-200">
          <span className="font-semibold">Estimated payout</span> — Deposits begin when Stripe Connect activates. These numbers reflect your current month&apos;s activity.
        </p>
      </div>

      {/* Month Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Revenue — {currentMonth}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
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
      <Card className="bg-card border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setHowItWorksOpen(!howItWorksOpen)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-secondary/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">How Pool Share Works</span>
          </div>
          {howItWorksOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {howItWorksOpen && (
          <div className="px-5 pb-5 border-t border-border pt-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Community Pass members pay a monthly subscription. <span className="text-primary font-medium">75%</span> of that revenue goes into a shared business pool.
              </p>
              <p>
                The pool is split based on <span className="text-foreground font-medium">actual check-ins</span> — the more families you serve, the larger your share.
              </p>
              <div className="overflow-x-auto">
                <div className="bg-secondary rounded-lg p-4 mt-3">
                  <p className="text-foreground-soft text-xs font-mono">
                    Your Check-ins ÷ Total Network Check-ins × Business Pool = Your Payout
                  </p>
                </div>
              </div>
              <p>
                Each Joy Coin redeemed is currently worth approximately <span className="text-primary font-medium">{formatCurrency(estimatedPerCoinValue)}</span> to your business (75% of coin value).
              </p>
            </div>
          </div>
        )}
      </Card>

      {hasData ? (
        <>
          {/* By-Event Breakdown */}
          {redemptionsByEvent.length > 0 && (
            <Card className="bg-card border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">By Event</h3>
              <div className="space-y-2">
                {redemptionsByEvent.map((item, i) => (
                  <div
                    key={item.eventId || i}
                    className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm text-foreground">{item.eventTitle}</p>
                      <p className="text-xs text-muted-foreground/70">
                        {item.count} check-in{item.count !== 1 ? 's' : ''} · {item.coins} coin{item.coins !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-primary">
                      {formatCurrency(item.coins * estimatedPerCoinValue)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* By-Day Chart */}
          <Card className="bg-card border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Check-ins by Day of Week</h3>
            <BarChart data={redemptionsByDay} />
            <p className="text-xs text-muted-foreground/70 mt-3 text-center">
              Shows which days families visit most. Consider adjusting Joy Coin hours to match demand.
            </p>
          </Card>
        </>
      ) : (
        /* Empty State */
        <Card className="bg-card border-border rounded-xl p-8 text-center">
          <div className="p-4 bg-secondary rounded-full inline-block mb-4">
            <TrendingUp className="h-8 w-8 text-muted-foreground/70" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No check-ins yet this month</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            When Community Pass families check in at your events, you&apos;ll see your revenue data here. Make sure your Joy Coin access hours are set up.
          </p>
        </Card>
      )}

      {/* Network Position placeholder — DEC-038 requires 10+ businesses */}
      {/* This section will appear in a future build once network size reaches threshold */}
    </div>
  );
}
