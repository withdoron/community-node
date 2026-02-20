import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Loader2, Mail } from 'lucide-react';
import { format } from 'date-fns';

function formatSubscribedAt(val) {
  if (val == null) return '—';
  try {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? '—' : format(d, 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

const SOURCE_BADGE = {
  footer: 'bg-slate-700 text-slate-300',
  onboarding: 'bg-amber-500/20 text-amber-500',
  post_rsvp: 'bg-emerald-500/20 text-emerald-500',
};

export default function AdminNewsletterSection() {
  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: ['admin-newsletter-subscribers'],
    queryFn: async () => {
      const list = await base44.entities.NewsletterSubscriber.list();
      return Array.isArray(list) ? list : [];
    },
  });

  const sorted = [...subscribers].sort((a, b) => {
    const da = a.subscribed_at ? new Date(a.subscribed_at).getTime() : 0;
    const db = b.subscribed_at ? new Date(b.subscribed_at).getTime() : 0;
    return db - da;
  });

  return (
    <Card className="p-6 bg-slate-900 border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Mail className="h-5 w-5 text-slate-400" />
        <h2 className="text-lg font-semibold text-white">The Good News</h2>
      </div>
      <p className="text-sm text-slate-400 mb-4">
        {sorted.length} subscriber{sorted.length !== 1 ? 's' : ''}
      </p>
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No subscribers yet</div>
      ) : (
        <div className="overflow-x-auto border border-slate-800 rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Source</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Subscribed</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((sub) => (
                <tr key={sub.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 text-slate-300">{sub.email}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_BADGE[sub.source] ?? 'bg-slate-700 text-slate-300'}`}>
                      {sub.source ?? '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 text-sm">
                    {formatSubscribedAt(sub.subscribed_at)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${sub.active !== false ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                      <span className="text-slate-400 text-sm">{sub.active !== false ? 'Active' : 'Inactive'}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
