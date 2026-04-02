import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useCategories } from '@/hooks/useCategories';
import SectionWrapper from './SectionWrapper';
import { Sprout, Activity, Palette, Wrench, Heart, Store } from 'lucide-react';

const CATEGORY_ICONS = { Sprout, Activity, Palette, Wrench, Heart };

export default function DiscoverSection() {
  const { mainCategories, defaultPopularCategoryIds } = useCategories();
  const popularCategories = mainCategories.filter((c) =>
    defaultPopularCategoryIds.includes(c.id)
  );

  // Only show Discover when there are actual businesses to browse.
  // Dark until there's something alive.
  const { data: businessCount = 0 } = useQuery({
    queryKey: ['discover-business-count'],
    queryFn: async () => {
      try {
        const list = await base44.entities.Business.filter({ is_active: true });
        return Array.isArray(list) ? list.length : 0;
      } catch { return 0; }
    },
    staleTime: 5 * 60 * 1000, // cache 5 minutes
  });

  // No businesses → don't show empty category cards
  if (businessCount === 0 || popularCategories.length === 0) return null;

  return (
    <SectionWrapper
      title="Discover"
      subtitle="Browse by category"
      seeAllPage="Directory"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {popularCategories.map((cat) => {
          const Icon = CATEGORY_ICONS[cat.icon] ?? Store;
          return (
            <Link
              key={cat.id}
              to={createPageUrl(`CategoryPage?id=${cat.id}`)}
              className="bg-secondary border border-border rounded-xl p-4 text-center hover:border-primary/50 hover:bg-secondary/80 transition-all group"
            >
              <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
              <span className="text-sm font-medium text-foreground-soft group-hover:text-primary transition-colors block">
                {cat.label}
              </span>
            </Link>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
