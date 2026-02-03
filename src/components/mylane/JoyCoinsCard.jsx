import { Coins, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useJoyCoins } from '@/hooks/useJoyCoins';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function JoyCoinsCard() {
  const {
    balance,
    reservedCoins,
    hasJoyCoins,
    isLoading,
  } = useJoyCoins();

  if (!isLoading && !hasJoyCoins) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Coins className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Joy Coins</p>
              <p className="text-2xl font-bold text-slate-100">{balance}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {reservedCoins > 0 && (
              <div className="text-right">
                <div className="flex items-center gap-1 text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span className="text-xs">Reserved</span>
                </div>
                <p className="text-sm font-medium text-slate-300">{reservedCoins}</p>
              </div>
            )}

            <Link
              to="/my-lane/transactions"
              className="flex items-center gap-1 text-amber-500 hover:text-amber-400 text-sm"
            >
              History
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
