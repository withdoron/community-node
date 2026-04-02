import { useState } from 'react';
import { Coins, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { processMonthlyGrantsBatch, getDefaultGrantAmount } from '@/functions/processMonthlyGrants';
import { processNoShows } from '@/functions/processNoShows';
import {
  calculateMonthlyRevenueShare,
  getPricingConfig
} from '@/functions/calculateRevenueShare';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

export function JoyCoinsAdminPanel() {
  const [grantAmount, setGrantAmount] = useState(getDefaultGrantAmount().toString());
  const [processingGrants, setProcessingGrants] = useState(false);
  const [processingNoShows, setProcessingNoShows] = useState(false);
  const [lastResults, setLastResults] = useState(null);
  const [revenueMonth, setRevenueMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [calculatingRevenue, setCalculatingRevenue] = useState(false);
  const [revenueReport, setRevenueReport] = useState(null);

  const handleProcessGrants = async () => {
    if (
      !confirm(
        'This will reset ALL user Joy Coin balances to the grant amount. Unused coins will expire. Continue?'
      )
    ) {
      return;
    }

    setProcessingGrants(true);
    try {
      const amount = parseInt(grantAmount, 10) || getDefaultGrantAmount();
      const results = await processMonthlyGrantsBatch(amount);
      setLastResults({ type: 'grants', ...results });
      toast.success(
        `Processed ${results.succeeded} grants, ${results.totalCoinsExpired} coins expired`
      );
    } catch (error) {
      toast.error('Failed to process grants');
    } finally {
      setProcessingGrants(false);
    }
  };

  const handleProcessNoShows = async () => {
    setProcessingNoShows(true);
    try {
      const results = await processNoShows();
      setLastResults({ type: 'noShows', ...results });
      toast.success(
        `Processed ${results.eventsProcessed} events, ${results.rsvpsMarkedNoShow} no-shows`
      );
    } catch (error) {
      toast.error('Failed to process no-shows');
    } finally {
      setProcessingNoShows(false);
    }
  };

  const handleCalculateRevenue = async () => {
    setCalculatingRevenue(true);
    try {
      const [year, month] = revenueMonth.split('-').map(Number);
      const results = await calculateMonthlyRevenueShare(year, month);
      setRevenueReport(results);
      toast.success(`Calculated revenue for ${results.businesses.length} businesses`);
    } catch (error) {
      toast.error('Failed to calculate revenue');
    } finally {
      setCalculatingRevenue(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Coins className="h-5 w-5 text-primary" />
          Joy Coins Administration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
          <h4 className="text-sm font-medium text-foreground">Monthly Grants</h4>
          <p className="text-xs text-muted-foreground/70">
            Reset all user balances to the grant amount. Unused coins expire.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Amount:</span>
              <Input
                type="number"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                className="w-20 bg-secondary border-border text-foreground"
                min="1"
              />
            </div>
            <Button
              onClick={handleProcessGrants}
              disabled={processingGrants}
              variant="outline"
              className="border-primary/50 text-primary-hover hover:bg-primary/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${processingGrants ? 'animate-spin' : ''}`} />
              {processingGrants ? 'Processing...' : 'Process All Grants'}
            </Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-primary/70">
            <AlertTriangle className="h-3 w-3 shrink-0" />
            <span>Use with caution — affects all users</span>
          </div>
        </div>

        <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
          <h4 className="text-sm font-medium text-foreground">No-Show Processing</h4>
          <p className="text-xs text-muted-foreground/70">
            Mark unchecked RSVPs as no-shows for events that ended 2+ hours ago.
          </p>
          <Button
            onClick={handleProcessNoShows}
            disabled={processingNoShows}
            variant="outline"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${processingNoShows ? 'animate-spin' : ''}`} />
            {processingNoShows ? 'Processing...' : 'Process All No-Shows'}
          </Button>
        </div>

        {/* Revenue Share Calculation */}
        <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
          <h4 className="text-sm font-medium text-foreground">Revenue Share Report</h4>
          <p className="text-xs text-muted-foreground/70">
            Calculate business payouts based on Joy Coin redemptions.
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            {(() => {
              const config = getPricingConfig();
              return (
                <>
                  <p>
                    Subscription: ${config.subscriptionPrice}/mo · Grant: {config.monthlyGrant} coins
                  </p>
                  <p>
                    Coin value: {fmt(config.coinValue)} · Business share: {fmt(config.businessSharePerCoin)}/coin ({config.businessSharePercent}%)
                  </p>
                </>
              );
            })()}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Input
              type="month"
              value={revenueMonth}
              onChange={(e) => setRevenueMonth(e.target.value)}
              className="w-40 bg-secondary border-border text-foreground"
            />
            <Button
              onClick={handleCalculateRevenue}
              disabled={calculatingRevenue}
              variant="outline"
              className="border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${calculatingRevenue ? 'animate-spin' : ''}`} />
              {calculatingRevenue ? 'Calculating...' : 'Calculate'}
            </Button>
          </div>
        </div>

        {/* Revenue Report Display */}
        {revenueReport && (
          <div className="p-4 bg-secondary/30 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-foreground-soft">
                Revenue Report: {revenueReport.period.month}/{revenueReport.period.year}
              </h4>
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-400">
                  {fmt(revenueReport.totals.totalBusinessShare)}
                </p>
                <p className="text-xs text-muted-foreground/70">Total business payouts</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold text-primary-hover">
                  {revenueReport.totals.totalCoinsRedeemed}
                </p>
                <p className="text-xs text-muted-foreground/70">Coins Redeemed</p>
              </div>
              <div>
                <p className="text-xl font-bold text-emerald-400">
                  {fmt(revenueReport.totals.totalBusinessShare)}
                </p>
                <p className="text-xs text-muted-foreground/70">Business Share (75%)</p>
              </div>
              <div>
                <p className="text-xl font-bold text-blue-400">
                  {fmt(revenueReport.totals.totalPlatformShare)}
                </p>
                <p className="text-xs text-muted-foreground/70">Platform Share (25%)</p>
              </div>
            </div>
            {revenueReport.businesses.length > 0 ? (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-2">By Business</h5>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {revenueReport.businesses.map((biz) => (
                    <div
                      key={biz.businessId}
                      className="flex items-center justify-between py-2 px-3 bg-secondary/50 rounded"
                    >
                      <div>
                        <p className="text-sm text-foreground">{biz.businessName}</p>
                        <p className="text-xs text-muted-foreground/70">
                          {biz.totalCoinsRedeemed} coins · {biz.totalRedemptions} check-ins
                        </p>
                      </div>
                      <p className="text-sm font-medium text-emerald-400">
                        {fmt(biz.businessShare)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/70 text-center py-4">
                No redemptions found for this period.
              </p>
            )}
          </div>
        )}

        {lastResults && (
          <div className="p-4 bg-secondary/30 rounded-lg">
            <h4 className="text-sm font-medium text-foreground-soft mb-2">Last Run Results</h4>
            <pre className="text-xs text-muted-foreground overflow-auto max-h-48">
              {JSON.stringify(lastResults, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
