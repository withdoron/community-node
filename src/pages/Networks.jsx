/**
 * Networks index — DEC-050 Build 3 + DEC-060 living tiles.
 * Route: /networks
 * Lists active networks as typographic living tiles with link to /networks/:slug.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '@/hooks/useConfig';
import { Loader2 } from 'lucide-react';

export default function Networks() {
  const { data: networksConfig = [], isLoading } = useConfig('platform', 'networks');
  const networks = (networksConfig || []).filter((n) => n.active !== false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Networks</h1>
          <p className="text-slate-400 mt-1">Explore community networks and their events.</p>
        </div>

        {networks.length === 0 ? (
          <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-xl">
            <p className="text-slate-400">No networks available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {networks.map((n) => {
              const slug = n.value ?? n.slug ?? n.id;
              const name = n.label ?? n.name ?? slug;
              const tagline = n.tagline;
              const description = n.description;
              return (
                <Link
                  key={slug}
                  to={`/networks/${slug}`}
                  className="block rounded-lg p-5 cursor-pointer bg-gradient-to-br from-slate-800 to-slate-800/90 border border-slate-700 hover:border-amber-500/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.08)] hover:-translate-y-0.5 transition-all duration-300 ease-out border-l-4 border-l-amber-500/60"
                  data-vitality="neutral"
                >
                  <h2 className="font-serif text-lg font-semibold text-white">{name}</h2>
                  {tagline && <p className="text-sm text-slate-400 mt-1">{tagline}</p>}
                  {description && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-2">{description}</p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
