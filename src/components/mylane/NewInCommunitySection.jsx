import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useActiveRegion, filterBusinessesByRegion } from '@/components/region/useActiveRegion';
import BusinessCard from '@/components/business/BusinessCard';
import SectionWrapper from './SectionWrapper';
import { Badge } from '@/components/ui/badge';

export default function NewInCommunitySection() {
  const { region } = useActiveRegion();

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ['mylane-new-businesses', region?.id],
    queryFn: async () => {
      const list = await base44.entities.Business.filter({ is_active: true }, '-created_date', 200);
      return filterBusinessesByRegion(list, region);
    },
    enabled: !!region
  });

  const newBusinesses = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return businesses.filter((b) => {
      const created = new Date(b.created_date);
      return created >= thirtyDaysAgo && (b.recommendation_count || 0) < 3;
    });
  }, [businesses]);

  if (isLoading) return null;
  if (newBusinesses.length === 0) return null;

  return (
    <SectionWrapper title="New in Your Community" seeAllPage="Directory">
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {newBusinesses.map((business) => (
          <div
            key={business.id}
            className="snap-start flex-shrink-0 w-72 space-y-2"
          >
            <div className="mb-2">
              <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs">
                🆕 New to LocalLane
              </Badge>
            </div>
            <BusinessCard business={business} />
            <Link
              to={createPageUrl(`Recommend?businessId=${business.id}`)}
              className="text-xs text-slate-400 hover:text-amber-500 mt-1 inline-block transition-colors"
            >
              Be the first to recommend →
            </Link>
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
