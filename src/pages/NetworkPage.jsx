/**
 * Network info page — DEC-050 Build 3.
 * Route: /networks/:slug
 * Public page; follow/unfollow requires auth.
 */
import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useConfig } from '@/hooks/useConfig';
import { createPageUrl } from '@/utils';
import EventCard from '@/components/events/EventCard';
import EventDetailModal from '@/components/events/EventDetailModal';
import BusinessCard from '@/components/business/BusinessCard';
import { Button } from '@/components/ui/button';
import { Loader2, Store, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function NetworkPage() {
  const { slug } = useParams();
  const queryClient = useQueryClient();
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [unfollowConfirm, setUnfollowConfirm] = useState(false);

  const { data: networksConfig = [], isLoading: networksLoading } = useConfig('platform', 'networks');
  const network = useMemo(() => {
    const list = Array.isArray(networksConfig) ? networksConfig : [];
    return list.find((n) => (n.value ?? n.slug ?? n.id) === slug) ?? null;
  }, [networksConfig, slug]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    },
  });

  const networkInterests = currentUser?.data?.network_interests ?? [];
  const followsNetwork = Array.isArray(networkInterests) && networkInterests.includes(slug);

  const handleFollow = async () => {
    if (!currentUser) {
      base44.auth.redirectToLogin();
      return;
    }
    const next = followsNetwork
      ? networkInterests.filter((s) => s !== slug)
      : [...networkInterests, slug];
    try {
      await base44.functions.invoke('updateUser', {
        action: 'update_onboarding',
        data: { onboarding_complete: true, network_interests: next },
      });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setUnfollowConfirm(false);
      toast.success(followsNetwork ? 'Unfollowed' : 'Following');
    } catch (err) {
      toast.error('Failed to update. Please try again.');
    }
  };

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['network-events', slug],
    queryFn: async () => {
      const all = await base44.entities.Event.filter({ is_active: true }, 'date', 200);
      return all.filter((e) => !e.is_deleted && e.status !== 'cancelled');
    },
    enabled: !!slug,
  });

  const { data: businesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ['network-businesses', slug],
    queryFn: async () => {
      const list = await base44.entities.Business.filter({ is_active: true }, '-created_date', 200);
      return list.filter((b) => Array.isArray(b.network_ids) && b.network_ids.includes(slug));
    },
    enabled: !!slug,
  });

  const now = new Date();
  const upcomingEvents = useMemo(() => {
    console.log('Network page debug:', { slug, allEvents: events?.length, sampleEvent: events?.[0] });
    console.log(
      'Event network check:',
      events?.map((e) => ({
        title: e.title,
        network: e.network,
        networks: e.networks,
        'data?.network': e.data?.network,
        date: e.date,
        status: e.status,
      }))
    );

    const slugLower = (slug || '').toLowerCase();
    const eventMatchesNetwork = (e) => {
      const single = (e.network ?? e.data?.network ?? '').toString().toLowerCase();
      const arr = Array.isArray(e.networks) ? e.networks : [];
      return single === slugLower || arr.some((n) => (n || '').toString().toLowerCase() === slugLower);
    };

    // Show ALL events for this network (including network_only) — this is the network's home page.
    // Network-only filtering applies only on Events page and MyLane Happening Soon.
    return events
      .filter(
        (e) =>
          eventMatchesNetwork(e) &&
          new Date(e.date) >= now &&
          e.status === 'published'
      )
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [events, slug]);

  if (networksLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!network || network.active === false) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-slate-100 mb-2">Network not found</h1>
          <p className="text-slate-400 mb-6">This network doesn&apos;t exist or is no longer active.</p>
          <Link
            to="/networks"
            className="inline-block bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Browse networks
          </Link>
        </div>
      </div>
    );
  }

  const displayName = network.label ?? network.name ?? slug;
  const tagline = network.tagline;
  const description = network.description;

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-white">{displayName}</h1>
          {tagline && <p className="text-slate-400 text-lg">{tagline}</p>}
          <div className="flex flex-wrap items-center gap-3">
            {!currentUser ? (
              <Button
                onClick={() => base44.auth.redirectToLogin()}
                variant="outline"
                className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
              >
                Sign in to join
              </Button>
            ) : unfollowConfirm ? (
              <div className="flex gap-2">
                <Button
                  onClick={handleFollow}
                  className="bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30"
                >
                  Unfollow
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300"
                  onClick={() => setUnfollowConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : followsNetwork ? (
              <Button
                onClick={() => setUnfollowConfirm(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900"
              >
                Following
              </Button>
            ) : (
              <Button
                onClick={handleFollow}
                variant="outline"
                className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
              >
                Follow {displayName}
              </Button>
            )}
            {currentUser && followsNetwork && (
              <Link
                to={createPageUrl('MyLane')}
                className="text-slate-400 hover:text-amber-500 text-sm transition-colors"
              >
                Manage in My Lane
              </Link>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <p className="text-slate-300 whitespace-pre-line">{description}</p>
          </div>
        )}

        {/* Upcoming Events */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-500" />
            Upcoming Events
            <span className="text-slate-400 font-normal text-base">({upcomingEvents.length})</span>
          </h2>
          {eventsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
            </div>
          ) : upcomingEvents.length === 0 ? (
            <p className="text-slate-500 py-8">No upcoming events in {displayName} yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => setExpandedEvent(event)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Network Businesses */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Store className="h-5 w-5 text-amber-500" />
            Businesses in {displayName}
            <span className="text-slate-400 font-normal text-base">({businesses.length})</span>
          </h2>
          {businessesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
            </div>
          ) : businesses.length === 0 ? (
            <p className="text-slate-500 py-8">No businesses in {displayName} yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {businesses.map((business) => (
                <div key={business.id}>
                  <BusinessCard business={business} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {expandedEvent && (
        <EventDetailModal
          event={expandedEvent}
          isOpen={!!expandedEvent}
          onClose={() => setExpandedEvent(null)}
        />
      )}
    </div>
  );
}
