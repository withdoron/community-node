/**
 * My Networks section for MyLane — discovery (no networks) vs navigation (following networks).
 * DEC-050: follow/unfollow lives on NetworkPage; here we only link to network pages.
 * DEC-060: Living tile aesthetic — typographic cards with amber accent, warm hover.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '@/hooks/useConfig';

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
              className="h-24 rounded-lg border border-slate-700 bg-slate-800/50 animate-pulse"
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
            return (
              <Link
                key={value}
                to={`/networks/${value}`}
                className="block rounded-lg p-5 cursor-pointer text-left bg-gradient-to-br from-slate-800 to-slate-800/90 border border-slate-700 hover:border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.08)] hover:-translate-y-0.5 transition-all duration-300 ease-out border-l-4 border-l-amber-500/60"
                data-vitality="neutral"
              >
                <h3 className="font-serif text-lg font-semibold text-white">{label}</h3>
                {tagline && <p className="text-sm text-slate-400 mt-1">{tagline}</p>}
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
          return (
            <Link
              key={value}
              to={`/networks/${value}`}
              className="block rounded-lg p-4 cursor-pointer text-left bg-gradient-to-br from-slate-800 to-slate-800/90 border border-amber-500/30 hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.08)] hover:-translate-y-0.5 transition-all duration-300 ease-out border-l-4 border-l-amber-500/60"
              data-vitality="neutral"
            >
              <h3 className="font-serif text-base font-semibold text-white">{label}</h3>
              {tagline && <p className="text-sm text-slate-400 mt-0.5">{tagline}</p>}
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
