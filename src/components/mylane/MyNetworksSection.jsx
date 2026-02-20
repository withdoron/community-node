/**
 * My Networks section for MyLane — toggle which networks the user follows.
 * DEC-050 Build 1: Network Events spec.
 */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '@/hooks/useConfig';
import { base44 } from '@/api/base44Client';
import { Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function MyNetworksSection({ currentUser, onUpdate }) {
  const { data: networksConfig = [], isLoading } = useConfig('platform', 'networks');
  const [selectedNetworks, setSelectedNetworks] = useState(
    () => currentUser?.data?.network_interests || []
  );

  useEffect(() => {
    setSelectedNetworks(currentUser?.data?.network_interests || []);
  }, [currentUser?.id]);

  const networks = (networksConfig || []).filter((n) => n.active !== false);
  if (networks.length === 0) return null;

  const handleToggle = async (slug) => {
    const prev = [...selectedNetworks];
    const next = prev.includes(slug)
      ? prev.filter((s) => s !== slug)
      : [...prev, slug];

    setSelectedNetworks(next);

    try {
      await base44.functions.invoke('updateUser', {
        action: 'update_onboarding',
        data: {
          onboarding_complete: true,
          network_interests: next,
        },
      });
      onUpdate?.();
    } catch (err) {
      setSelectedNetworks(prev);
      toast.error('Failed to update networks. Please try again.');
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-slate-100">My Networks</h2>
        <p className="text-slate-400 text-sm mt-1">
          Follow networks to see member-only events and updates.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 rounded-xl border border-slate-700 bg-slate-800/50 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* TIER_GATE: future - limit free users to 1 network */}
          {networks.map((net) => {
            const value = net.value ?? net.slug ?? net.id;
            const label = net.label ?? net.name ?? value;
            const isActive = selectedNetworks.includes(value);
            return (
              <Link
                key={value}
                to={`/networks/${value}`}
                className={cn(
                  'rounded-xl border p-4 cursor-pointer transition-all text-left flex items-center justify-between gap-2',
                  isActive
                    ? 'bg-amber-500/10 border-amber-500/50 hover:border-amber-500/70'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-600'
                )}
              >
                <span className="font-medium text-slate-100 truncate">{label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggle(value);
                  }}
                  className="shrink-0 p-1 rounded hover:bg-slate-800/50 transition-colors"
                  aria-label={isActive ? `Unfollow ${label}` : `Follow ${label}`}
                >
                  {isActive ? (
                    <Check className="h-5 w-5 text-amber-500" aria-hidden />
                  ) : (
                    <Plus className="h-5 w-5 text-slate-500" aria-hidden />
                  )}
                </button>
              </Link>
            );
          })}
        </div>
      )}
      <div className="text-right">
        <Link
          to="/networks"
          className="text-sm text-slate-400 hover:text-amber-500 transition-colors"
        >
          Browse all networks →
        </Link>
      </div>
    </section>
  );
}
