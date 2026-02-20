/**
 * Networks index — DEC-050 Build 3.
 * Route: /networks
 * Lists active networks as cards with link to /networks/:slug.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '@/hooks/useConfig';
import { Loader2, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {networks.map((n) => {
              const slug = n.value ?? n.slug ?? n.id;
              const name = n.label ?? n.name ?? slug;
              const tagline = n.tagline;
              return (
                <Card
                  key={slug}
                  className="bg-slate-800 border-slate-700 rounded-lg p-6 hover:border-amber-500/50 transition-colors"
                >
                  <div className="space-y-3">
                    <h2 className="text-lg font-bold text-white">{name}</h2>
                    {tagline && <p className="text-slate-400 text-sm">{tagline}</p>}
                    <Link to={`/networks/${slug}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-amber-500 text-amber-500 hover:bg-amber-500/10 mt-2"
                      >
                        View
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
