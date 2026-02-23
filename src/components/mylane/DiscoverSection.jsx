import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCategories } from '@/hooks/useCategories';
import SectionWrapper from './SectionWrapper';
import { Sprout, Activity, Palette, Wrench, Heart, Store } from 'lucide-react';

const CATEGORY_ICONS = { Sprout, Activity, Palette, Wrench, Heart };

export default function DiscoverSection() {
  const { mainCategories, defaultPopularCategoryIds } = useCategories();
  const popularCategories = mainCategories.filter((c) =>
    defaultPopularCategoryIds.includes(c.id)
  );

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
              className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center hover:border-amber-500/50 hover:bg-slate-800/80 transition-all group"
            >
              <Icon className="h-8 w-8 mx-auto mb-2 text-amber-500" />
              <span className="text-sm font-medium text-slate-300 group-hover:text-amber-500 transition-colors block">
                {cat.label}
              </span>
            </Link>
          );
        })}
      </div>
    </SectionWrapper>
  );
}
