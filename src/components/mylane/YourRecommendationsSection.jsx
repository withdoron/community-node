import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import SectionWrapper from './SectionWrapper';

export default function YourRecommendationsSection({ recommendations }) {
  const businessIds = useMemo(
    () => [...new Set(recommendations.map((r) => r.business_id))],
    [recommendations]
  );

  const { data: businesses = [] } = useQuery({
    queryKey: ['recommended-businesses', businessIds],
    queryFn: async () => {
      if (businessIds.length === 0) return [];
      const allBiz = await base44.entities.Business.filter({ is_active: true }, '-created_date', 200);
      return allBiz.filter((b) => businessIds.includes(b.id));
    },
    enabled: businessIds.length > 0
  });

  const displayBusinesses = businesses.slice(0, 6);

  return (
    <SectionWrapper
      title="Your Recommendations"
      subtitle={`${businessIds.length} business${businessIds.length !== 1 ? 'es' : ''} you've supported`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayBusinesses.map((business) => {
          const userRecs = recommendations.filter((r) => r.business_id === business.id);
          return (
            <div
              key={business.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-500 font-bold text-lg">
                    {business.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    to={createPageUrl(`BusinessProfile?id=${business.id}`)}
                    className="text-slate-100 font-semibold hover:text-amber-500 truncate block transition-colors"
                  >
                    {business.name}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {userRecs.some((r) => r.type === 'nod') && (
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs">
                        👍 Nodded
                      </Badge>
                    )}
                    {userRecs.some((r) => r.type === 'story') && (
                      <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                        📖 Story
                      </Badge>
                    )}
                    {userRecs.some((r) => r.type === 'vouch') && (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                        🛡️ Vouched
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
