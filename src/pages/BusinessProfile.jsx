import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StarRating from '@/components/reviews/StarRating';
import ReviewCard from '@/components/reviews/ReviewCard';
import { 
  Phone, Mail, Globe, MapPin, Clock, ChevronLeft, 
  Share2, Heart, CheckCircle, Coins, Navigation, ExternalLink,
  Loader2
} from "lucide-react";
import { formatAddress, buildMapsQuery } from '@/components/locations/formatAddress';

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

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', businessId],
    queryFn: async () => {
      return await base44.entities.Review.filter({ business_id: businessId }, '-created_date', 50);
    },
    enabled: !!businessId
  });

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-900">Business not found</h2>
          <Link to={createPageUrl('Search')}>
            <Button className="mt-4">Back to Search</Button>
          </Link>
        </div>
      </div>
    );
  }

  const ratingBreakdown = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(r => r.rating === rating).length,
    percentage: reviews.length > 0 
      ? (reviews.filter(r => r.rating === rating).length / reviews.length) * 100 
      : 0
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={createPageUrl('Search')}>
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Heart className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Image */}
      <div className="relative h-64 sm:h-80 bg-slate-200">
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
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                      {categoryLabels[business.category] || business.category}
                    </Badge>
                    {business.subscription_tier === 'partner' && (
                      <Badge className="bg-emerald-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Partner
                      </Badge>
                    )}
                    {business.accepts_silver && (
                      <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                        <Coins className="h-3 w-3 mr-1" />
                        Accepts Silver
                      </Badge>
                    )}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{business.name}</h1>
                  
                  <div className="flex items-center gap-3 mt-3">
                    <StarRating rating={business.average_rating || 0} size="md" />
                    <span className="font-semibold text-slate-900">
                      {(business.average_rating || 0).toFixed(1)}
                    </span>
                    <span className="text-slate-500">
                      ({business.review_count || 0} reviews)
                    </span>
                  </div>

                  {(primaryLocation || business.city) && (
                    <div className="flex items-start gap-1.5 text-slate-600 mt-3">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        {primaryLocation ? (
                          formatAddress(primaryLocation, { multiline: true }).map((line, idx) => (
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

              <p className="text-slate-600 mt-6 leading-relaxed">
                {business.description || 'No description available.'}
              </p>

              {business.service_area && (
                <p className="text-sm text-slate-500 mt-4 flex items-center gap-1.5">
                  <Navigation className="h-4 w-4" />
                  Service area: {business.service_area}
                </p>
              )}
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="services" className="w-full">
              <TabsList className="w-full justify-start bg-white border border-slate-200 p-1">
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
                <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="mt-4">
                <Card className="divide-y divide-slate-100">
                  {business.services?.length > 0 ? (
                    business.services.map((service, idx) => (
                      <div key={idx} className="p-4 flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-medium text-slate-900">{service.name}</h4>
                          {service.description && (
                            <p className="text-sm text-slate-600 mt-1">{service.description}</p>
                          )}
                        </div>
                        {service.starting_price && (
                          <p className="font-semibold text-slate-900 whitespace-nowrap">
                            From ${service.starting_price}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      No services listed yet
                    </div>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="photos" className="mt-4">
                {business.photos?.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {business.photos.map((photo, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-slate-200">
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

              <TabsContent value="reviews" className="mt-4 space-y-6">
                {/* Rating Summary */}
                <Card className="p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="text-center">
                      <p className="text-5xl font-bold text-slate-900">
                        {(business.average_rating || 0).toFixed(1)}
                      </p>
                      <StarRating rating={business.average_rating || 0} size="md" />
                      <p className="text-sm text-slate-500 mt-2">
                        {business.review_count || 0} reviews
                      </p>
                    </div>
                    <div className="flex-1 w-full space-y-2">
                      {ratingBreakdown.map(({ rating, count, percentage }) => (
                        <div key={rating} className="flex items-center gap-3">
                          <span className="text-sm text-slate-600 w-3">{rating}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-400 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-500 w-8">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {/* Write Review Button */}
                <div className="flex justify-end">
                  <Link to={createPageUrl(`WriteReview?businessId=${business.id}`)}>
                    <Button className="bg-slate-900 hover:bg-slate-800">
                      Write a Review
                    </Button>
                  </Link>
                </div>

                {/* Reviews List */}
                {reviewsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <ReviewCard key={review.id} review={review} />
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 text-center text-slate-500">
                    No reviews yet. Be the first to write one!
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Contact Card */}
            <Card className="p-5 sticky top-20">
              <h3 className="font-semibold text-slate-900 mb-4">Contact</h3>
              <div className="space-y-3">
                {business.phone && (
                  <a 
                    href={`tel:${business.phone}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    <Phone className="h-5 w-5" />
                    <span className="font-medium">{business.phone}</span>
                  </a>
                )}
                
                {business.email && (
                  <a 
                    href={`mailto:${business.email}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
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
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Globe className="h-5 w-5" />
                    <span className="truncate">{business.website.replace(/^https?:\/\//, '')}</span>
                    <ExternalLink className="h-4 w-4 ml-auto flex-shrink-0" />
                  </a>
                )}

                {(primaryLocation?.street_address || business.address) && (
                  <a 
                    href={`https://maps.google.com/?q=${primaryLocation ? buildMapsQuery(primaryLocation) : encodeURIComponent(business.address + ', ' + business.city)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      {primaryLocation ? (
                        formatAddress(primaryLocation, { multiline: true }).map((line, idx) => (
                          <span key={idx} className="block text-sm">{line}</span>
                        ))
                      ) : (
                        <span>{business.address}, {business.city}</span>
                      )}
                    </div>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  </a>
                )}
              </div>

              {business.accepts_silver && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800 flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    This business accepts silver as payment
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>

      <div className="h-16" />
    </div>
  );
}