import { ArrowLeft, Coins, Plus, Minus, RefreshCw, ArrowRightLeft, AlertCircle, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useJoyCoins } from '@/hooks/useJoyCoins';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createPageUrl } from '@/utils';

const TRANSACTION_CONFIG = {
  monthly_grant: { label: 'Monthly Grant', icon: Plus, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  reservation: { label: 'Reserved for Event', icon: Minus, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  redemption: { label: 'Redeemed', icon: Coins, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  refund: { label: 'Refunded', icon: RefreshCw, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  forfeit: { label: 'Forfeited', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  release: { label: 'Released (Event Cancelled)', icon: RefreshCw, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  transfer_out: { label: 'Sent to Member', icon: ArrowRightLeft, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  transfer_in: { label: 'Received from Member', icon: ArrowRightLeft, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  adjustment: { label: 'Adjustment', icon: RefreshCw, color: 'text-slate-400', bg: 'bg-slate-500/10' },
};

function TransactionRow({ transaction }) {
  const config = TRANSACTION_CONFIG[transaction.type] || TRANSACTION_CONFIG.adjustment;
  const Icon = config.icon;
  const isPositive = Number(transaction.amount) > 0;

  const date = new Date(transaction.created_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  });

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${config.bg}`}>
          <Icon className={`h-4 w-4 ${config.color}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-100">{config.label}</p>
          <p className="text-xs text-slate-500">{formattedDate} · {formattedTime}</p>
          {transaction.note && (
            <p className="text-xs text-slate-400 mt-0.5">{transaction.note}</p>
          )}
        </div>
      </div>

      <div className="text-right">
        <p className={`text-sm font-semibold ${isPositive ? 'text-emerald-500' : 'text-slate-300'}`}>
          {isPositive ? '+' : ''}{transaction.amount}
        </p>
        <p className="text-xs text-slate-500">Balance: {transaction.balance_after}</p>
      </div>
    </div>
  );
}

export default function JoyCoinsHistory() {
  const {
    balance,
    transactions = [],
    transactionsLoading,
    hasJoyCoins,
    isLoading
  } = useJoyCoins();

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link
              to={createPageUrl('MyLane')}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Joy Coins History</h1>
              {!isLoading && hasJoyCoins && (
                <p className="text-sm text-slate-400">Current balance: {balance}</p>
              )}
            </div>
          </div>
          {hasJoyCoins && (
            <Link
              to="/my-lane/transfer"
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-sm font-medium transition-colors"
            >
              <Send className="h-4 w-4" />
              Send
            </Link>
          )}
        </div>

        {isLoading || transactionsLoading ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        ) : !hasJoyCoins ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8 text-center">
              <Coins className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No Joy Coins account yet.</p>
              <p className="text-sm text-slate-500 mt-1">
                Subscribe to Community Pass to start earning Joy Coins.
              </p>
            </CardContent>
          </Card>
        ) : transactions.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-8 text-center">
              <Coins className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No transactions yet.</p>
              <p className="text-sm text-slate-500 mt-1">
                Your Joy Coin activity will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
