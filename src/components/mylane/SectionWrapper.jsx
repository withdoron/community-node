import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronRight } from 'lucide-react';

export default function SectionWrapper({ title, subtitle, seeAllPage, seeAllParams, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">{title}</h2>
          {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {seeAllPage && (
          <Link
            to={createPageUrl(seeAllPage) + (seeAllParams || '')}
            className="flex items-center gap-1 text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
          >
            See all
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
