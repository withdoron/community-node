import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useActiveRegion, filterBusinessesByRegion } from '@/components/region/useActiveRegion';
import BusinessCard from '@/components/business/BusinessCard';
import SectionWrapper from './SectionWrapper';
import { Store } from 'lucide-react';

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

  if (newBusinesses.length === 0) {
    return (
      <SectionWrapper title="New in Your Community" seeAllPage="Directory">
        <div className="text-center py-10 bg-slate-900 border border-slate-800 rounded-xl">
          <Store className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 font-medium">No new businesses this month</p>
          <p className="text-sm text-slate-500 mt-1">Browse the Directory to explore what&apos;s here.</p>
          <Link
            to={createPageUrl('Directory')}
            className="mt-4 inline-flex items-center gap-2 text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
          >
            Browse Directory
            <span aria-hidden>→</span>
          </Link>
        </div>
      </SectionWrapper>
    );
  }

  return (
    <SectionWrapper title="New in Your Community" seeAllPage="Directory">
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none' }}>
        {newBusinesses.map((business) => (
          <div
            key={business.id}
            className="snap-start flex-shrink-0 w-56 sm:w-64 min-w-0"
          >
            <BusinessCard business={business} showNewToLocalLane />
          </div>
        ))}
      </div>
    </SectionWrapper>
  );
}
