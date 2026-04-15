import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from "@/hooks/useOrganization";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TrustSignal from '@/components/recommendations/TrustSignal';
import StoryCard from '@/components/recommendations/StoryCard';
import NodAvatars from '@/components/recommendations/NodAvatars';
import VouchCard from '@/components/recommendations/VouchCard';
import {
  Phone, Mail, Globe, MapPin, Clock, ChevronLeft,
  Share2, CheckCircle, Coins, ExternalLink,
  Loader2, ThumbsUp, BookOpen, Shield, Instagram, Facebook, ShoppingBag, Sprout
} from "lucide-react";
import { formatAddress, buildMapsQuery } from '@/components/locations/formatAddress';
import { toast } from 'sonner';
import JoyCoinHours from '@/components/business/JoyCoinHours';
import EventCard from '@/components/events/EventCard';
import { useCategories } from '@/hooks/useCategories';
import { useConfig } from '@/hooks/useConfig';
import { resolveCategoryAccent } from '@/components/business/BusinessCard';

function formatPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function getCategoryDisplayLabel(business, getLabel, legacyCategoryMapping) {
  const fromMain = getLabel(business.main_category, business.subcategory);
  if (fromMain) return fromMain;
  const fromPrimary = getLabel(business.primary_category, business.sub_category_id);
  if (fromPrimary) return fromPrimary;
  if (business.category && legacyCategoryMapping?.[business.category]) {
    const { main, sub } = legacyCategoryMapping[business.category];
    return getLabel(main, sub) || business.category;
  }
  return business.category || '';
}

export default function BusinessProfile({ businessId: businessIdProp, onRecommendClick } = {}) {
  const navigate = useNavigate();
  const { getLabel, legacyCategoryMapping } = useCategories();
  const { data: networksConfig = [] } = useConfig('platform', 'networks');
  const urlParams = new URLSearchParams(window.location.search);
  const businessId = businessIdProp || urlParams.get('id');

  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      const businesses = await base44.entities.Business.filter({ id: businessId });
      return businesses[0];
    },
    enabled: !!businessId
  });

  const { data: recommendations = [], isLoading: recommendationsLoading } = useQuery({
    queryKey: ['recommendations', businessId],
    queryFn: async () => {
      return await base44.entities.Recommendation.filter({ business_id: businessId, is_active: true }, '-created_date', 100);
    },
    enabled: !!businessId
  });

  const nods = recommendations.filter(r => r.type === 'nod');
  const stories = recommendations.filter(r => r.type === 'story');
  const vouches = recommendations.filter(r => r.type === 'vouch');

  const { isPartner } = useOrganization(business);

  // Fetch locations for this business
  const { data: locations = [] } = useQuery({
    queryKey: ['business-locations', businessId],
    queryFn: async () => {
      return await base44.entities.Location.filter({ business_id: businessId, is_active: true }, '-created_date', 20);
    },
    enabled: !!businessId
  });

  // Primary location (first one, or use business-level address as fallback)
  const primaryLocation = locations[0] || null;

  // Fetch upcoming events for this business
  const { data: allBusinessEvents = [] } = useQuery({
    queryKey: ['business-events', businessId],
    queryFn: async () => {
      return await base44.entities.Event.filter({ business_id: businessId, is_active: true }, 'date', 50);
    },
    enabled: !!businessId
  });

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allBusinessEvents
      .filter(e => !e.is_deleted && new Date(e.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 4);
  }, [allBusinessEvents]);

  // Resolve network slugs + labels
  const networks = (business?.network_ids || [])
    .map((slug) => {
      const match = Array.isArray(networksConfig)
        ? networksConfig.find((n) => n.value === slug)
        : null;
      const label = match?.label || slug?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      return label ? { slug, label } : null;
    })
    .filter(Boolean);

  if (businessLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">Business not found</h2>
          <Button onClick={() => navigate(-1)} className="mt-4 border-border text-foreground-soft hover:border-primary hover:text-primary">
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background/90 backdrop-blur-sm border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-foreground-soft hover:text-primary hover:bg-secondary">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-secondary"
            onClick={() => {
              const url = window.location.href;
              navigator.clipboard.writeText(url).then(() => {
                toast.success('Link copied!');
              }).catch(() => {
                toast.error('Could not copy link');
              });
            }}
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hero Banner */}
      {(() => {
        const heroImage = business.banner_url || business.photos?.[0] || business.logo_url;
        if (heroImage) {
          return (
            <div className="relative h-52 sm:h-64 lg:h-72 w-full overflow-hidden bg-card">
              <img
                src={heroImage}
                alt={business.name}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            </div>
          );
        }
        const accentBorder = resolveCategoryAccent(business, legacyCategoryMapping);
        const accentBg = accentBorder.replace('border-l-', 'bg-');
        return (
          <div className="relative h-32 sm:h-40 w-full bg-gradient-to-br from-secondary via-slate-900 to-background flex items-center justify-center">
            <span className="text-2xl font-bold text-foreground-soft/20 select-none truncate px-8 max-w-full">
              {business.name}
            </span>
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${accentBg}`} />
          </div>
        );
      })()}

      <div className="max-w-6xl mx-auto px-4 relative z-10 mt-4">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Info Card */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-secondary text-foreground-soft">
                      {getCategoryDisplayLabel(business, getLabel, legacyCategoryMapping)}
                    </Badge>
                    {isPartner && (
                      <Badge className="bg-primary text-primary-foreground">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Partner
                      </Badge>
                    )}
                    {business.accepts_silver && (
                      <Badge variant="outline" className="border-primary/30 text-primary bg-primary/10">
                        <Coins className="h-3 w-3 mr-1" />
                        Accepts Silver
                      </Badge>
                    )}
                    {business.accepts_joy_coins && (
                      <Badge className="bg-primary/20 text-primary-hover border border-primary/30 flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        Accepts Joy Coins
                      </Badge>
                    )}
                    {networks.map(({ slug, label }) => (
                      <Link
                        key={slug}
                        to={`/networks/${slug}`}
                        className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{business.name}</h1>
                  {business.subcategory?.trim() && (
                    <p className="text-muted-foreground text-sm mt-1">{business.subcategory.trim()}</p>
                  )}
                  <div className="mt-3">
                    <TrustSignal business={business} />
                  </div>

                  {(primaryLocation || business.city) && (
                    <div className="flex items-start gap-1.5 text-muted-foreground mt-3">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        {primaryLocation ? (
                          formatAddress(primaryLocation, { multiline: true, forPublic: true }).map((line, idx) => (
                            <span key={idx} className="block">{line}</span>
                          ))
                        ) : (
                          <span>{business.address ? `${business.address}, ` : ''}{business.city}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <p className="text-muted-foreground mt-6 leading-relaxed">
                {business.description || 'No description available.'}
              </p>

              {business.service_area?.trim() && (
                <p className="text-foreground-soft mt-4 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  Serves: {business.service_area.trim()}
                </p>
              )}
              {business.services_offered?.trim() && (
                <div className="mt-4">
                  <p className="text-foreground-soft whitespace-pre-line">{business.services_offered.trim()}</p>
                </div>
              )}

              {/* What's Available — product tags */}
              {Array.isArray(business.product_tags) && business.product_tags.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Sprout className="h-4 w-4 text-primary" />
                    What's Available
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {business.product_tags.map((tag, idx) => (
                      <span key={idx} className="bg-primary/20 text-primary rounded-full px-3 py-1 text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* How to Purchase — payment methods */}
              {Array.isArray(business.payment_methods) && business.payment_methods.length > 0 && (
                <div className="mt-6 p-4 bg-secondary/50 rounded-lg border border-border">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    How to Purchase
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {business.payment_methods.map((method, idx) => {
                      const labels = { cash: 'Cash', venmo: 'Venmo', cashapp: 'CashApp', zelle: 'Zelle', paypal: 'PayPal', other: 'Other' };
                      return (
                        <span key={idx} className="bg-secondary text-foreground rounded-full px-3 py-1 text-sm border border-border">
                          {labels[method] || method}
                        </span>
                      );
                    })}
                  </div>
                  {business.payment_notes?.trim() && (
                    <p className="text-foreground-soft text-sm mt-2">{business.payment_notes.trim()}</p>
                  )}
                </div>
              )}
            </Card>

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-foreground font-serif">Upcoming Events</h2>
                  <Link
                    to="/Events"
                    className="text-sm text-primary hover:text-primary-hover transition-colors"
                  >
                    See all
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {upcomingEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={(clickedEvent) => {
                        navigate(`/Events/${(clickedEvent || event).id}`);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="w-full justify-start bg-card border border-border p-1">
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations ({recommendations.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="mt-4">
                <Card className="divide-y divide-border">
                  {business.services?.length > 0 ? (
                    business.services.map((service, idx) => (
                      <div key={idx} className="p-4 flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-medium text-foreground">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                          )}
                        </div>
                        {service.starting_price && (
                          <p className="font-semibold text-primary whitespace-nowrap">
                            From ${service.starting_price}
                          </p>
                        )}
                      </div>
                    ))
                  ) : business.services_offered?.trim() ? (
                    <div className="p-4">
                      <p className="text-foreground-soft whitespace-pre-line">{business.services_offered.trim()}</p>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      No services listed yet
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="photos" className="mt-4">
                {business.photos?.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {business.photos.map((photo, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-secondary">
                        <img
                          src={photo}
                          alt={`${business.name} photo ${idx + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center text-muted-foreground/70">
                    No photos available
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="recommendations" className="mt-4 space-y-6">
                {/* Recommendation Summary */}
                <Card className="p-6 border-border bg-card">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="text-center">
                      <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <ThumbsUp className="h-8 w-8 text-primary" />
                      </div>
                      <p className="text-3xl font-bold text-foreground">
                        {(business.recommendation_count || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">neighbors recommend</p>
                    </div>
                    <div className="flex-1 w-full space-y-4">
                      {/* Nod avatars */}
                      {nods.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">{nods.length} quick recommendations</p>
                          <NodAvatars recommendations={nods} maxShow={8} />
                        </div>
                      )}
                      {/* Story count */}
                      {stories.length > 0 && (
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <p className="text-sm text-foreground-soft">{stories.length} {stories.length === 1 ? 'story' : 'stories'} shared</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Vouches */}
                {vouches.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">
                        {vouches.length} Verified {vouches.length === 1 ? 'Vouch' : 'Vouches'}
                      </h3>
                    </div>
                    <div className="space-y-3">
                      {vouches.map(vouch => (
                        <VouchCard key={vouch.id} vouch={vouch} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommend CTA */}
                <div className="flex flex-col sm:flex-row gap-3 justify-end">
                  {onRecommendClick ? (
                    <>
                      <Button onClick={() => onRecommendClick(business.id)} className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold">
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Recommend
                      </Button>
                      <Button onClick={() => onRecommendClick(business.id, 'story')} variant="outline" className="border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Share a Story
                      </Button>
                      <Button onClick={() => onRecommendClick(business.id, 'vouch')} variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
                        <Shield className="h-4 w-4 mr-2" />
                        Vouch for This Business
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link to={createPageUrl(`Recommend?businessId=${business.id}`)}>
                        <Button className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold">
                          <ThumbsUp className="h-4 w-4 mr-2" />
                          Recommend
                        </Button>
                      </Link>
                      <Link to={createPageUrl(`Recommend?businessId=${business.id}&mode=story`)}>
                        <Button variant="outline" className="border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Share a Story
                        </Button>
                      </Link>
                      <Link to={createPageUrl(`Recommend?businessId=${business.id}&mode=vouch`)}>
                        <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10">
                          <Shield className="h-4 w-4 mr-2" />
                          Vouch for This Business
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
                <div className="mt-4 text-center">
                  {onRecommendClick ? (
                    <button
                      type="button"
                      onClick={() => onRecommendClick(business.id, 'concern')}
                      className="text-sm text-muted-foreground/70 hover:text-foreground-soft transition-colors cursor-pointer bg-transparent border-none"
                    >
                      Had a different experience?
                    </button>
                  ) : (
                    <Link
                      to={createPageUrl(`Recommend?businessId=${business.id}&mode=concern`)}
                      className="text-sm text-muted-foreground/70 hover:text-foreground-soft transition-colors"
                    >
                      Had a different experience?
                    </Link>
                  )}
                </div>

                {/* Stories List */}
                {recommendationsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : stories.length > 0 ? (
                  <div className="space-y-4">
                    {stories.map(story => (
                      <StoryCard key={story.id} recommendation={story} />
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center border-border">
                    <BookOpen className="h-8 w-8 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No stories yet. Be the first to share your experience!</p>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Contact Card */}
            <Card className="p-5 sticky top-20">
              <h3 className="font-semibold text-foreground mb-4">Contact</h3>
              <div className="space-y-3">
                {business.phone && (
                  <a 
                    href={`tel:${business.phone}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover transition-colors font-medium"
                  >
                    <Phone className="h-5 w-5" />
                    <span className="font-medium">{formatPhone(business.phone)}</span>
                  </a>
                )}
                
                {business.email && (
                  <a 
                    href={`mailto:${business.email}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border text-foreground-soft hover:border-primary hover:text-primary transition-colors"
                  >
                    <Mail className="h-5 w-5" />
                    <span>{business.email}</span>
                  </a>
                )}

                {business.website && (
                  <a 
                    href={business.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border text-foreground-soft hover:border-primary hover:text-primary transition-colors"
                  >
                    <Globe className="h-5 w-5" />
                    <span className="truncate">{business.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="h-4 w-4 ml-auto flex-shrink-0" />
                  </a>
                )}

                {business.business_hours?.trim() && (
                  <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
                    <Clock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground-soft text-sm whitespace-pre-line">{business.business_hours.trim()}</span>
                  </div>
                )}

                {business.instagram?.trim() && (
                  <a
                    href={business.instagram.trim().startsWith('http') ? business.instagram.trim() : `https://instagram.com/${business.instagram.trim().replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border text-primary hover:text-primary-hover underline underline-offset-2 transition-colors"
                  >
                    <Instagram className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="truncate">@{business.instagram.trim().replace(/^@/, '')}</span>
                    <ExternalLink className="h-4 w-4 ml-auto flex-shrink-0" />
                  </a>
                )}

                {business.facebook?.trim() && (
                  <a
                    href={business.facebook.trim().startsWith('http') ? business.facebook.trim() : `https://${business.facebook.trim()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border text-primary hover:text-primary-hover underline underline-offset-2 transition-colors"
                  >
                    <Facebook className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span className="truncate">{business.facebook.trim().replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="h-4 w-4 ml-auto flex-shrink-0" />
                  </a>
                )}

                {business.shop_url?.trim() && (
                  <a
                    href={business.shop_url.trim().startsWith('http') ? business.shop_url.trim() : `https://${business.shop_url.trim()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border text-primary hover:text-primary-hover underline underline-offset-2 transition-colors"
                  >
                    <ShoppingBag className="h-5 w-5 flex-shrink-0 text-primary" />
                    <span>Shop Online</span>
                    <ExternalLink className="h-4 w-4 ml-auto flex-shrink-0" />
                  </a>
                )}

                {/* Locations Section */}
              {locations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground-soft mb-3">
                    {locations.length === 1 ? 'Location' : `${locations.length} Locations`}
                  </h4>
                  <div className="space-y-3">
                    {locations.map((loc, idx) => (
                      <a 
                        key={loc.id || idx}
                        href={`https://maps.google.com/?q=${buildMapsQuery(loc)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg border border-border text-foreground-soft hover:border-primary hover:text-primary transition-colors"
                      >
                        <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1">
                          {loc.name && <span className="block text-sm font-medium text-foreground">{loc.name}</span>}
                          {formatAddress(loc, { multiline: true, forPublic: true }).map((line, lineIdx) => (
                            <span key={lineIdx} className="block text-sm text-muted-foreground">{line}</span>
                          ))}
                          {loc.phone && <span className="block text-sm text-muted-foreground/70 mt-1">{formatPhone(loc.phone)}</span>}
                        </div>
                        <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback if no locations but business has address */}
              {locations.length === 0 && business.address && (
                <a 
                  href={`https://maps.google.com/?q=${encodeURIComponent(business.address + ', ' + business.city)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 p-3 rounded-lg border border-border text-foreground-soft hover:border-primary hover:text-primary transition-colors"
                >
                  <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span>{business.address}, {business.city}</span>
                  <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5" />
                </a>
              )}
              </div>

              {business.accepts_silver && (
                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="text-sm text-primary flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    This business accepts silver as payment
                  </p>
                </div>
              )}
            </Card>
            {business.accepts_joy_coins && (
              <JoyCoinHours businessId={business.id} />
            )}
          </div>
        </div>
      </div>

      <div className="h-16" />
    </div>
  );
}