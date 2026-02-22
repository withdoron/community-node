import React, { useEffect } from 'react';
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
  Share2, Heart, CheckCircle, Coins, Navigation, ExternalLink,
  Loader2, ThumbsUp, BookOpen, Shield
} from "lucide-react";
import { formatAddress, buildMapsQuery } from '@/components/locations/formatAddress';
import JoyCoinHours from '@/components/business/JoyCoinHours';

const categoryLabels = {
  carpenter: 'Carpenter',
  mechanic: 'Mechanic',
  landscaper: 'Landscaper',
  farm: 'Farm',
  bullion_dealer: 'Bullion Dealer',
  electrician: 'Electrician',
  plumber: 'Plumber',
  handyman: 'Handyman',
  cleaning: 'Cleaning',
  other: 'Other'
};

export default function BusinessProfile() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const businessId = urlParams.get('id');

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

  if (businessLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white">Business not found</h2>
          <Button onClick={() => navigate(-1)} className="mt-4 border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500">
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-950/90 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-slate-300 hover:text-amber-500 hover:bg-slate-800">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="hover:bg-slate-800">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="hover:bg-slate-800">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-64 sm:h-80 bg-slate-900">
        <img
          src={business.photos?.[0] || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&h=600&fit=crop'}
          alt={business.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-20 relative z-10">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Info Card */}
            <Card className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                      {categoryLabels[business.category] || business.category}
                    </Badge>
                    {isPartner && (
                      <Badge className="bg-amber-500 text-black">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Partner
                      </Badge>
                    )}
                    {business.accepts_silver && (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/10">
                        <Coins className="h-3 w-3 mr-1" />
                        Accepts Silver
                      </Badge>
                    )}
                    {business.accepts_joy_coins && (
                      <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        Accepts Joy Coins
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">{business.name}</h1>
                  
                  <div className="mt-3">
                    <TrustSignal business={business} />
                  </div>

                  {(primaryLocation || business.city) && (
                    <div className="flex items-start gap-1.5 text-slate-400 mt-3">
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

              <p className="text-slate-400 mt-6 leading-relaxed">
                {business.description || 'No description available.'}
              </p>

              {business.service_area && (
                <p className="text-sm text-slate-400 mt-4 flex items-center gap-1.5">
                  <Navigation className="h-4 w-4" />
                  Service area: {business.service_area}
                </p>
              )}
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="w-full justify-start bg-slate-900 border border-slate-800 p-1">
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="recommendations">Recommendations ({recommendations.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="mt-4">
                <Card className="divide-y divide-slate-800">
                  {business.services?.length > 0 ? (
                    business.services.map((service, idx) => (
                      <div key={idx} className="p-4 flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-medium text-slate-100">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm text-slate-400 mt-1">{service.description}</p>
                          )}
                        </div>
                        {service.starting_price && (
                          <p className="font-semibold text-amber-500 whitespace-nowrap">
                            From ${service.starting_price}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400">
                      No services listed yet
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="photos" className="mt-4">
                {business.photos?.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {business.photos.map((photo, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-slate-800">
                        <img
                          src={photo}
                          alt={`${business.name} photo ${idx + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center text-slate-500">
                    No photos available
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="recommendations" className="mt-4 space-y-6">
                {/* Recommendation Summary */}
                <Card className="p-6 border-slate-800 bg-slate-900">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="text-center">
                      <div className="h-16 w-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                        <ThumbsUp className="h-8 w-8 text-amber-500" />
                      </div>
                      <p className="text-3xl font-bold text-white">
                        {(business.recommendation_count || 0)}
                      </p>
                      <p className="text-sm text-slate-400 mt-1">neighbors recommend</p>
                    </div>
                    <div className="flex-1 w-full space-y-4">
                      {/* Nod avatars */}
                      {nods.length > 0 && (
                        <div>
                          <p className="text-sm text-slate-400 mb-2">{nods.length} quick recommendations</p>
                          <NodAvatars recommendations={nods} maxShow={8} />
                        </div>
                      )}
                      {/* Story count */}
                      {stories.length > 0 && (
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-amber-500" />
                          <p className="text-sm text-slate-300">{stories.length} {stories.length === 1 ? 'story' : 'stories'} shared</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Vouches */}
                {vouches.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-5 w-5 text-amber-500" />
                      <h3 className="text-lg font-semibold text-white">
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
                  <Link to={createPageUrl(`Recommend?businessId=${business.id}`)}>
                    <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                      <ThumbsUp className="h-4 w-4 mr-2" />
                      Recommend
                    </Button>
                  </Link>
                  <Link to={createPageUrl(`Recommend?businessId=${business.id}&mode=story`)}>
                    <Button variant="outline" className="border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Share a Story
                    </Button>
                  </Link>
                  <Link to={createPageUrl(`Recommend?businessId=${business.id}&mode=vouch`)}>
                    <Button variant="outline" className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10">
                      <Shield className="h-4 w-4 mr-2" />
                      Vouch for This Business
                    </Button>
                  </Link>
                </div>
                <div className="mt-4 text-center">
                  <Link
                    to={createPageUrl(`Recommend?businessId=${business.id}&mode=concern`)}
                    className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Had a different experience?
                  </Link>
                </div>

                {/* Stories List */}
                {recommendationsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : stories.length > 0 ? (
                  <div className="space-y-4">
                    {stories.map(story => (
                      <StoryCard key={story.id} recommendation={story} />
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center border-slate-800">
                    <BookOpen className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No stories yet. Be the first to share your experience!</p>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Contact Card */}
            <Card className="p-5 sticky top-20">
              <h3 className="font-semibold text-white mb-4">Contact</h3>
              <div className="space-y-3">
                {business.phone && (
                  <a 
                    href={`tel:${business.phone}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors font-medium"
                  >
                    <Phone className="h-5 w-5" />
                    <span className="font-medium">{business.phone}</span>
                  </a>
                )}
                
                {business.email && (
                  <a 
                    href={`mailto:${business.email}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-colors"
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
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-colors"
                  >
                    <Globe className="h-5 w-5" />
                    <span className="truncate">{business.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="h-4 w-4 ml-auto flex-shrink-0" />
                  </a>
                )}

                {/* Locations Section */}
              {locations.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">
                    {locations.length === 1 ? 'Location' : `${locations.length} Locations`}
                  </h4>
                  <div className="space-y-3">
                    {locations.map((loc, idx) => (
                      <a 
                        key={loc.id || idx}
                        href={`https://maps.google.com/?q=${buildMapsQuery(loc)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-colors"
                      >
                        <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0 text-slate-400" />
                        <div className="flex-1">
                          {loc.name && <span className="block text-sm font-medium text-slate-200">{loc.name}</span>}
                          {formatAddress(loc, { multiline: true, forPublic: true }).map((line, lineIdx) => (
                            <span key={lineIdx} className="block text-sm text-slate-400">{line}</span>
                          ))}
                          {loc.phone && <span className="block text-sm text-slate-500 mt-1">{loc.phone}</span>}
                        </div>
                        <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5 text-slate-400" />
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
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 transition-colors"
                >
                  <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <span>{business.address}, {business.city}</span>
                  <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5" />
                </a>
              )}
              </div>

              {business.accepts_silver && (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <p className="text-sm text-amber-500 flex items-center gap-2">
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