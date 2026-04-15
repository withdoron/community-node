/**
 * Network info page — DEC-050 Build 3.
 * Route: /networks/:slug
 * Auth-gated: networks are private gardens discovered through relationships (DEC-121).
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useConfig } from '@/hooks/useConfig';
import EventDetailModal from '@/components/events/EventDetailModal';
import WeekCalendarStrip from '@/components/events/WeekCalendarStrip';
import BusinessCard from '@/components/business/BusinessCard';
import { Button } from '@/components/ui/button';
import { Loader2, Store, Calendar, ArrowLeft, X, Search, LayoutGrid, Map as MapIcon, Sprout } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function NetworkPage({ slug: slugProp, onBusinessClick, onNetworkClick } = {}) {
  const navigate = useNavigate();
  const { slug: slugParam } = useParams();
  const slug = slugProp || slugParam;
  const queryClient = useQueryClient();
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [followHover, setFollowHover] = useState(false);
  const [optimisticFollowing, setOptimisticFollowing] = useState(null);
  const [productFilter, setProductFilter] = useState('');

  const { data: networksConfig = [], isLoading: networksLoading } = useConfig('platform', 'networks');
  const network = useMemo(() => {
    const list = Array.isArray(networksConfig) ? networksConfig : [];
    return list.find((n) => (n.value ?? n.slug ?? n.id) === slug) ?? null;
  }, [networksConfig, slug]);

  const { data: currentUser, isLoading: authLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) return null;
      return base44.auth.me();
    },
  });

  // Auth gate — networks are private gardens (DEC-121)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <Sprout className="h-10 w-10 text-primary/60 mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Sign in to discover networks</h1>
          <p className="text-muted-foreground text-sm">
            Networks grow from connections. Sign in and they'll find you.
          </p>
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="mt-4 bg-primary hover:bg-primary-hover text-primary-foreground font-bold px-6 py-3 rounded-xl transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    setOptimisticFollowing(null);
    setFollowHover(false);
  }, [slug]);

  const networkInterests = currentUser?.data?.network_interests ?? [];
  const followsNetwork =
    optimisticFollowing !== null ? optimisticFollowing : (Array.isArray(networkInterests) && networkInterests.includes(slug));

  const displayNameForToast = network?.label ?? network?.name ?? slug;

  const handleFollow = async () => {
    if (!currentUser) {
      base44.auth.redirectToLogin();
      return;
    }
    const willUnfollow = followsNetwork;
    const next = willUnfollow
      ? networkInterests.filter((s) => s !== slug)
      : [...networkInterests, slug];
    setOptimisticFollowing(!willUnfollow);
    setFollowHover(false);
    try {
      await base44.functions.invoke('updateUser', {
        action: 'update_onboarding',
        data: { onboarding_complete: true, network_interests: next },
      });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      toast.success(
        willUnfollow ? `You've unfollowed ${displayNameForToast}` : `You're now following ${displayNameForToast}!`
      );
    } catch (err) {
      setOptimisticFollowing(null);
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

  // Product tag filter — applies to both grid and map views
  const filteredBusinesses = useMemo(() => {
    if (!productFilter.trim()) return businesses;
    const term = productFilter.toLowerCase().trim();
    return businesses.filter((b) =>
      Array.isArray(b.product_tags) &&
      b.product_tags.some((tag) => tag.toLowerCase().includes(term))
    );
  }, [businesses, productFilter]);

  const now = new Date();
  const upcomingEvents = useMemo(() => {
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!network || network.active === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-foreground mb-2">Network not found</h1>
          <p className="text-muted-foreground mb-6">This network doesn&apos;t exist or is no longer active.</p>
          <Link
            to="/networks"
            className="inline-block bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-6 py-3 rounded-xl transition-colors"
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
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Back button */}
        <button
          type="button"
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/MyLane')}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Network image banner */}
        {network.image?.trim() && (
          <div className="w-full rounded-lg overflow-hidden">
            <img
              src={network.image.trim()}
              alt=""
              className="w-full max-h-[300px] object-cover rounded-lg"
            />
          </div>
        )}

        {/* Header */}
        <div className="space-y-4">
          <h1 className="font-serif text-3xl font-bold text-foreground">{displayName}</h1>
          {tagline && <p className="text-muted-foreground text-lg">{tagline}</p>}
          <div className="flex flex-wrap items-center gap-3">
            {!currentUser ? (
              <Button
                onClick={() => base44.auth.redirectToLogin()}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium px-6 py-2 rounded-lg transition-colors"
              >
                Sign in to follow
              </Button>
            ) : followsNetwork ? (
              <Button
                onClick={handleFollow}
                onMouseEnter={() => setFollowHover(true)}
                onMouseLeave={() => setFollowHover(false)}
                className={
                  followHover
                    ? 'bg-secondary border border-red-500/50 text-red-400 hover:bg-red-500/10 px-6 py-2 rounded-lg transition-colors'
                    : 'bg-secondary border border-primary/30 text-primary px-6 py-2 rounded-lg transition-colors'
                }
              >
                {followHover ? 'Unfollow' : 'Following ✓'}
              </Button>
            ) : (
              <Button
                onClick={handleFollow}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium px-6 py-2 rounded-lg transition-colors"
              >
                Follow {displayName}
              </Button>
            )}
          </div>
        </div>

        {/* Description */}
        {description && (
          <div className="bg-gradient-to-br from-secondary to-secondary/90 border border-border rounded-lg p-6">
            <p className="text-foreground-soft whitespace-pre-line">{description}</p>
          </div>
        )}

        {/* How it works */}
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider mb-2">How it works</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {displayName} connects local producers and businesses with the community. Businesses apply to join
            and are reviewed by our team. Once accepted, they appear here with their products and contact info
            so you can shop local and support your neighbors.
          </p>
        </div>

        {/* Construction Gate — remove when network application flow passes walkthrough */}
        {false && currentUser && (
          <div className="bg-card border border-border rounded-lg p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
              <Store className="w-6 h-6 text-muted-foreground/70" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Apply to Join {displayName} — Coming Soon</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
              Business owners will be able to apply to join this network directly from here.
            </p>
          </div>
        )}

        {/* Gallery */}
        {network.gallery?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {network.gallery.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setLightboxImage(url)}
                className="aspect-square w-full rounded-lg overflow-hidden bg-secondary border border-border hover:border-primary/30 hover:shadow-[0_0_15px_rgba(245,158,11,0.08)] transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Upcoming Events */}
        <section className="space-y-4">
          <h2 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Upcoming Events
            <span className="text-muted-foreground font-normal text-base">({upcomingEvents.length})</span>
          </h2>
          {eventsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : (
            <WeekCalendarStrip
              events={upcomingEvents}
              onEventClick={setExpandedEvent}
              emptyMessage={`No upcoming events in ${displayName} yet.`}
            />
          )}
        </section>

        {/* Network Businesses */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-serif text-xl font-bold text-foreground flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              Businesses in {displayName}
              <span className="text-muted-foreground font-normal text-base">({filteredBusinesses.length})</span>
            </h2>
            <div className="flex items-center gap-2">
              {/* Construction Gate — remove when map view passes walkthrough */}
              {false && (
                <div className="flex bg-secondary rounded-lg p-0.5">
                  <button type="button" className="p-1.5 rounded bg-primary text-primary-foreground">
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button type="button" className="p-1.5 rounded text-muted-foreground hover:text-foreground">
                    <MapIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Product tag filter — LIVE */}
          {businesses.length > 0 && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
                <Input
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  placeholder="Filter by product (e.g., eggs)"
                  className="pl-9 bg-secondary border-border text-foreground placeholder-muted-foreground/70"
                />
              </div>
              {productFilter.trim() && (
                <div className="flex items-center gap-2">
                  <span className="bg-primary/20 text-primary rounded-full px-3 py-1 text-sm flex items-center gap-1.5">
                    {productFilter.trim()}
                    <button type="button" onClick={() => setProductFilter('')} className="hover:text-red-400">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                  <span className="text-sm text-muted-foreground/70">
                    Showing {filteredBusinesses.length} of {businesses.length} businesses
                  </span>
                </div>
              )}
            </div>
          )}

          {businessesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <p className="text-muted-foreground/70 py-8">
              {productFilter.trim()
                ? `No businesses match "${productFilter}" in ${displayName}.`
                : `No businesses in ${displayName} yet.`}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBusinesses.map((business) => (
                <div key={business.id}>
                  <BusinessCard business={business} onBusinessClick={onBusinessClick} onNetworkClick={onNetworkClick} />
                </div>
              ))}
            </div>
          )}

          {/* Construction Gate — remove when map view passes walkthrough */}
          {false && (
            <div className="rounded-lg bg-card border border-border p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <MapIcon className="w-8 h-8 text-muted-foreground/70" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Map View — Coming Soon</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                See where businesses are located on an interactive map.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-lg text-foreground-soft hover:text-foreground hover:bg-surface transition-colors z-10"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightboxImage}
            alt=""
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

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
