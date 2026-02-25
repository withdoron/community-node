/**
 * My Networks section for MyLane — discovery (no networks) vs navigation (following networks).
 * DEC-050: follow/unfollow lives on NetworkPage; here we only link to network pages.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '@/hooks/useConfig';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const TAGLINE_FALLBACK = {
  recess: 'Move your body, build your crew',
  harvest: 'Know your farmer, feed your family',
  'creative-alliance': 'Learn something new, make something real',
  'gathering-circle': 'Show up, belong, celebrate together',
};

function getTagline(network) {
  if (network.tagline) return network.tagline;
  const slug = (network.value ?? network.slug ?? network.id ?? '').toLowerCase().replace(/\s+/g, '-');
  return TAGLINE_FALLBACK[slug] ?? '';
}

export default function MyNetworksSection({ currentUser }) {
  const { data: networksConfig = [], isLoading } = useConfig('platform', 'networks');
  const networks = (networksConfig || []).filter((n) => n.active !== false);
  const networkInterests = currentUser?.data?.network_interests ?? [];
  const followed = Array.isArray(networkInterests) ? networkInterests : [];
  const isDiscovery = followed.length === 0;

  if (networks.length === 0) return null;

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-100">Community Networks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-slate-700 bg-slate-800/50 animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  // State 1: Discovery — not following any networks
  if (isDiscovery) {
    return (
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Community Networks</h2>
          <p className="text-slate-400 text-sm mt-1">
            Explore networks and their events. Tap one to learn more.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {networks.map((net) => {
            const value = net.value ?? net.slug ?? net.id;
            const label = net.label ?? net.name ?? value;
            const tagline = getTagline(net);
            const hasImage = !!net.image?.trim();
            return (
              <Link
                key={value}
                to={`/networks/${value}`}
                className={cn(
                  'block rounded-xl p-5 hover:border-amber-500/50 cursor-pointer transition-colors text-left min-h-[100px]',
                  hasImage
                    ? 'border border-slate-800 bg-cover bg-center relative overflow-hidden'
                    : 'bg-slate-900 border border-slate-800'
                )}
                style={hasImage ? { backgroundImage: `url(${net.image.trim()})` } : undefined}
              >
                {hasImage && <div className="absolute inset-0 bg-slate-900/80" />}
                <div className={cn('flex items-start justify-between gap-2', hasImage && 'relative z-10')}>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-slate-100">{label}</h3>
                    {tagline && <p className="text-sm text-slate-400 mt-1">{tagline}</p>}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-600" aria-hidden />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

  // State 2: Navigation — following one or more networks
  const followedNetworks = networks.filter((n) => followed.includes(n.value ?? n.slug ?? n.id));
  const notFollowingAll = followedNetworks.length < networks.length;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-slate-100">My Networks</h2>
        <p className="text-slate-400 text-sm mt-1">
          Quick access to networks you follow.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {followedNetworks.map((net) => {
          const value = net.value ?? net.slug ?? net.id;
          const label = net.label ?? net.name ?? value;
          const tagline = getTagline(net);
          const hasImage = !!net.image?.trim();
          return (
            <Link
              key={value}
              to={`/networks/${value}`}
              className={cn(
                'block rounded-xl p-4 hover:border-amber-500/50 cursor-pointer transition-colors text-left min-h-[88px]',
                hasImage
                  ? 'border border-amber-500/30 bg-cover bg-center relative overflow-hidden'
                  : 'bg-slate-900 border border-amber-500/30'
              )}
              style={hasImage ? { backgroundImage: `url(${net.image.trim()})` } : undefined}
            >
              {hasImage && <div className="absolute inset-0 bg-slate-900/80" />}
              <div className={cn('flex items-start justify-between gap-2', hasImage && 'relative z-10')}>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-100">{label}</h3>
                  {tagline && <p className="text-sm text-slate-400 mt-0.5">{tagline}</p>}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-amber-500/50" aria-hidden />
              </div>
            </Link>
          );
        })}
      </div>
      {notFollowingAll && (
        <div className="text-right">
          <Link
            to="/networks"
            className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
          >
            Explore more networks →
          </Link>
        </div>
      )}
    </section>
  );
}
