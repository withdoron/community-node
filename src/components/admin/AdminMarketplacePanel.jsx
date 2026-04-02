import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Check, X, ShoppingBag, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminMarketplacePanel() {
  const queryClient = useQueryClient();
  const [geocoding, setGeocoding] = useState(false);

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['admin-businesses'],
    queryFn: () => base44.entities.Business.list('-created_date', 500),
  });

  const activeBusinesses = useMemo(
    () => businesses.filter((b) => !b.is_deleted && b.status !== 'deleted'),
    [businesses]
  );

  const stats = useMemo(() => {
    const withProducts = activeBusinesses.filter((b) => Array.isArray(b.product_tags) && b.product_tags.length > 0);
    const withCoords = activeBusinesses.filter((b) => b.latitude && b.longitude);
    const inHarvest = activeBusinesses.filter(
      (b) => Array.isArray(b.network_ids) && b.network_ids.includes('harvest_network')
    );
    return { withProducts: withProducts.length, withCoords: withCoords.length, inHarvest: inHarvest.length };
  }, [activeBusinesses]);

  const handleGeocodeAll = async () => {
    const needsGeocode = activeBusinesses.filter(
      (b) => !b.latitude && !b.longitude && (b.address || b.city)
    );
    if (needsGeocode.length === 0) {
      toast.info('All businesses with addresses already have coordinates.');
      return;
    }
    setGeocoding(true);
    let success = 0;
    let failed = 0;
    for (const biz of needsGeocode) {
      try {
        // Trigger geocoding by calling updateBusiness with an address field
        await base44.functions.invoke('updateBusiness', {
          action: 'update_profile',
          business_id: biz.id,
          data: { city: biz.city || '' },
        });
        success++;
      } catch {
        failed++;
      }
      // Nominatim rate limit: 1 req/sec
      await new Promise((r) => setTimeout(r, 1100));
    }
    setGeocoding(false);
    queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
    toast.success(`Geocoded ${success} businesses${failed > 0 ? `, ${failed} failed` : ''}.`);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Marketplace</h2>
        <p className="text-sm text-muted-foreground mt-1">Product tags, payment methods, and geocoding status</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-card border-border">
          <p className="text-2xl font-bold text-primary">{stats.withProducts}</p>
          <p className="text-sm text-muted-foreground">With Products</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-2xl font-bold text-primary">{stats.withCoords}</p>
          <p className="text-sm text-muted-foreground">With Coordinates</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <p className="text-2xl font-bold text-primary">{stats.inHarvest}</p>
          <p className="text-sm text-muted-foreground">In Harvest Network</p>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleGeocodeAll}
          disabled={geocoding}
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
        >
          {geocoding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          {geocoding ? 'Geocoding...' : 'Geocode All Missing'}
        </Button>
      </div>

      {/* Table */}
      <Card className="bg-card border-border overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Business</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Archetype</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Product Tags</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Payment</th>
              <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Coords</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Networks</th>
            </tr>
          </thead>
          <tbody>
            {activeBusinesses.map((biz) => (
              <tr key={biz.id} className="border-b border-border hover:bg-secondary/50 transition-colors">
                <td className="py-3 px-4">
                  <p className="font-medium text-foreground text-sm">{biz.name}</p>
                  <p className="text-xs text-muted-foreground/70">{biz.city || ''}</p>
                </td>
                <td className="py-3 px-4 text-xs text-muted-foreground">{biz.archetype || '—'}</td>
                <td className="py-3 px-4">
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {Array.isArray(biz.product_tags) && biz.product_tags.length > 0
                      ? biz.product_tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-xs bg-primary/20 text-primary rounded-full px-2 py-0.5">
                            {tag}
                          </span>
                        ))
                      : <span className="text-xs text-muted-foreground/50">—</span>
                    }
                    {Array.isArray(biz.product_tags) && biz.product_tags.length > 3 && (
                      <span className="text-xs text-muted-foreground/70">+{biz.product_tags.length - 3}</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  {Array.isArray(biz.payment_methods) && biz.payment_methods.length > 0 ? (
                    <span className="text-xs text-foreground-soft">{biz.payment_methods.join(', ')}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {biz.latitude && biz.longitude ? (
                    <Check className="h-4 w-4 text-emerald-500 mx-auto" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/50 mx-auto" />
                  )}
                </td>
                <td className="py-3 px-4">
                  {Array.isArray(biz.network_ids) && biz.network_ids.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {biz.network_ids.map((n, i) => (
                        <span key={i} className="text-xs bg-secondary text-foreground-soft rounded-full px-2 py-0.5">
                          {n}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
