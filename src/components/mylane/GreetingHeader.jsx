import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { getGreeting } from '@/utils/greeting';
import { Coins } from 'lucide-react';
import { useRole } from '@/hooks/useRole';

export default function GreetingHeader({ currentUser, joyCoins }) {
  const { isAppAdmin } = useRole();
  const displayName = currentUser?.data?.display_name || currentUser?.data?.full_name || currentUser?.full_name || 'neighbor';
  const firstName = displayName.split(' ')[0];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">
          {getGreeting()}, {firstName}
        </h1>
        <p className="text-slate-400 mt-1">Your community, organized around you.</p>
      </div>

      {isAppAdmin && (
        <div className="flex items-center gap-3">
          <Link
            to="/my-lane/transactions"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors"
          >
            <Coins className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-amber-500 font-bold text-lg leading-tight">
                {joyCoins?.current_balance ?? 0}
              </p>
              <p className="text-amber-500/70 text-xs">Joy Coins</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
