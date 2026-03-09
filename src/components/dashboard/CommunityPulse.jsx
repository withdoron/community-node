import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useConfig } from '@/hooks/useConfig';

const PULSE_STYLES = `
@keyframes communityPulse {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}
`;

/**
 * CommunityPulse — a vitality card showing real community stats.
 * Designed to sit at the top of the Dashboard for all users.
 */
export default function CommunityPulse() {
  // Member count — total users on the platform
  const { data: memberCount = null } = useQuery({
    queryKey: ['community-pulse-members'],
    queryFn: async () => {
      try {
        const users = await base44.entities.User.filter({});
        return Array.isArray(users) ? users.length : 0;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Active networks from platform config
  const { data: networksConfig = [] } = useConfig('platform', 'networks');
  const activeNetworkCount = useMemo(() => {
    if (!Array.isArray(networksConfig)) return 0;
    return networksConfig.filter((n) => n.active !== false).length;
  }, [networksConfig]);

  // Events this month
  const { data: eventsThisMonth = null } = useQuery({
    queryKey: ['community-pulse-events'],
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      const events = await base44.entities.Event.filter({ is_active: true });
      return (Array.isArray(events) ? events : []).filter(
        (e) => e.date >= monthStart && e.date <= monthEnd && e.status !== 'cancelled'
      ).length;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Businesses listed (active, non-archived)
  const { data: businessCount = null } = useQuery({
    queryKey: ['community-pulse-businesses'],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter({ is_active: true });
      return Array.isArray(businesses) ? businesses.length : 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Newsletter subscribers
  const { data: subscriberCount = null } = useQuery({
    queryKey: ['community-pulse-newsletter'],
    queryFn: async () => {
      const subscribers = await base44.entities.NewsletterSubscriber.list();
      return (Array.isArray(subscribers) ? subscribers : []).filter(
        (s) => s.is_active !== false
      ).length;
    },
    staleTime: 5 * 60 * 1000,
  });

  const stats = [
    { value: memberCount, label: 'Members' },
    { value: activeNetworkCount, label: 'Networks' },
    { value: eventsThisMonth, label: 'Events this month' },
    { value: businessCount, label: 'Businesses' },
    { value: subscriberCount, label: 'Subscribers' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <style dangerouslySetInnerHTML={{ __html: PULSE_STYLES }} />

      {/* Heading with pulse dot */}
      <div className="flex items-center gap-2 mb-5">
        <div
          className="w-2 h-2 rounded-full bg-amber-500"
          style={{ animation: 'communityPulse 3s ease-in-out infinite' }}
        />
        <h3 className="text-sm font-semibold text-slate-300 tracking-wide">Community Pulse</h3>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-2xl font-bold text-slate-100">
              {stat.value != null ? stat.value : '—'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tagline */}
      <p className="text-sm text-slate-500 italic mt-5">
        LocalLane is built by the community that uses it. Your ideas shape what comes next.
      </p>
    </div>
  );
}
