import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import StarRating from '@/components/reviews/StarRating';
import ReviewCard from '@/components/reviews/ReviewCard';
import {
  BarChart3, Star, Eye, Rocket, Settings, MessageSquare,
  Loader2, CheckCircle, Crown, Zap, ArrowUp, Upload, X, Plus, Trash2,
  ExternalLink, Check
} from "lucide-react";
import { format, addHours } from 'date-fns';

const categories = [
  { value: 'carpenter', label: 'Carpenter' },
  { value: 'mechanic', label: 'Mechanic' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'farm', label: 'Farm' },
  { value: 'bullion_dealer', label: 'Bullion Dealer' },
  { value: 'electrician', label: 'Electrician' },
  { value: 'plumber', label: 'Plumber' },
  { value: 'handyman', label: 'Handyman' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'other', label: 'Other' }
];

const tiers = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$9',
    period: '/month',
    icon: Star,
    features: ['Business listing', 'Basic profile', 'Contact info', 'Customer reviews'],
    bumps: 0
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '$29',
    period: '/month',
    icon: Zap,
    popular: true,
    features: ['Everything in Basic', 'Photo gallery', 'Service listings', '3 bumps per month', 'Priority support'],
    bumps: 3
  },
  {
    id: 'partner',
    name: 'Partner',
    price: '$79',
    period: '/month',
    icon: Crown,
    features: ['Everything in Standard', 'Partner badge', 'Featured placement', '10 bumps per month', 'Analytics dashboard'],
    bumps: 10
  }
];

export default function BusinessDashboard() {
  const queryClient = useQueryClient();
  const [bumpDialogOpen, setBumpDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const { data: business, isLoading: businessLoading } = useQuery({
    queryKey: ['myBusiness', currentUser?.business_id],
    queryFn: async () => {
      if (!currentUser?.business_id) return null;
      const businesses = await base44.entities.Business.filter({ id: currentUser.business_id });
      return businesses[0];
    },
    enabled: !!currentUser?.business_id
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['myReviews', business?.id],
    queryFn: async () => {
      return await base44.entities.Review.filter({ business_id: business.id }, '-created_date', 50);
    },
    enabled: !!business?.id
  });

  const [editData, setEditData] = useState(null);

  React.useEffect(() => {
    if (business && !editData) {
      setEditData({
        name: business.name || '',
        description: business.description || '',
        category: business.category || '',
        address: business.address || '',
        city: business.city || '',
        phone: business.phone || '',
        email: business.email || '',
        website: business.website || '',
        service_area: business.service_area || '',
        accepts_silver: business.accepts_silver || false,
        photos: business.photos || [],
        services: business.services?.length > 0 ? business.services : [{ name: '', starting_price: '', description: '' }]
      });
    }
  }, [business]);

  const updateBusiness = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Business.update(business.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myBusiness']);
    }
  });

  const upgradePlan = useMutation({
    mutationFn: async (newTier) => {
      const tier = tiers.find(t => t.id === newTier);
      await base44.entities.Business.update(business.id, {
        subscription_tier: newTier,
        bumps_remaining: tier?.bumps || 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myBusiness']);
      setUpgradeDialogOpen(false);
    }
  });

  const useBump = useMutation({
    mutationFn: async () => {
      const expiresAt = addHours(new Date(), 4);
      
      // Create bump record
      await base44.entities.Bump.create({
        business_id: business.id,
        activated_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      });

      // Update business
      await base44.entities.Business.update(business.id, {
        is_bumped: true,
        bump_expires_at: expiresAt.toISOString(),
        bumps_remaining: (business.bumps_remaining || 0) - 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myBusiness']);
      setBumpDialogOpen(false);
    }
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const uploadedUrls = [];

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }

    setEditData({ ...editData, photos: [...editData.photos, ...uploadedUrls] });
    setUploading(false);
  };

  const removePhoto = (index) => {
    setEditData({ 
      ...editData, 
      photos: editData.photos.filter((_, i) => i !== index) 
    });
  };

  const addService = () => {
    setEditData({
      ...editData,
      services: [...editData.services, { name: '', starting_price: '', description: '' }]
    });
  };

  const removeService = (index) => {
    setEditData({
      ...editData,
      services: editData.services.filter((_, i) => i !== index)
    });
  };

  const updateService = (index, field, value) => {
    const newServices = [...editData.services];
    newServices[index] = { ...newServices[index], [field]: value };
    setEditData({ ...editData, services: newServices });
  };

  const handleSave = () => {
    const cleanedServices = editData.services
      .filter(s => s.name)
      .map(s => ({
        ...s,
        starting_price: s.starting_price ? parseFloat(s.starting_price) : null
      }));

    updateBusiness.mutate({
      ...editData,
      services: cleanedServices
    });
  };

  if (businessLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900">No Business Found</h2>
          <p className="text-slate-600 mt-2">
            You haven't created a business listing yet.
          </p>
          <Link to={createPageUrl('BusinessOnboarding')}>
            <Button className="mt-4 bg-slate-900 hover:bg-slate-800">
              Create Your Listing
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const tierInfo = {
    basic: { icon: Star, color: 'text-slate-600', bg: 'bg-slate-100', name: 'Basic' },
    standard: { icon: Zap, color: 'text-blue-600', bg: 'bg-blue-100', name: 'Standard' },
    partner: { icon: Crown, color: 'text-amber-600', bg: 'bg-amber-100', name: 'Partner' }
  };

  const currentTier = tierInfo[business.subscription_tier] || tierInfo.basic;
  const TierIcon = currentTier.icon;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{business.name}</h1>
                <Badge className={`${currentTier.bg} ${currentTier.color} border-0`}>
                  <TierIcon className="h-3 w-3 mr-1" />
                  {currentTier.name}
                </Badge>
              </div>
              <p className="text-slate-600 mt-1">Manage your business listing</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to={createPageUrl(`BusinessProfile?id=${business.id}`)}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Public Profile
                </Button>
              </Link>
              
              {/* Upgrade Plan Button */}
              <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ArrowUp className="h-4 w-4 mr-2" />
                    {business.subscription_tier === 'partner' ? 'Manage Plan' : 'Upgrade Plan'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Choose Your Plan</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      {tiers.map((tier) => {
                        const TierIconComponent = tier.icon;
                        const isCurrentPlan = business.subscription_tier === tier.id;
                        return (
                          <div
                            key={tier.id}
                            className={`relative rounded-xl border-2 p-5 transition-all ${
                              isCurrentPlan 
                                ? 'border-slate-900 bg-slate-50' 
                                : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            {tier.popular && (
                              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white">
                                Popular
                              </Badge>
                            )}
                            <div className="text-center mb-4">
                              <div className={`h-12 w-12 rounded-lg flex items-center justify-center mx-auto mb-3 ${
                                tier.id === 'partner' ? 'bg-amber-100' : 
                                tier.id === 'standard' ? 'bg-blue-100' : 'bg-slate-100'
                              }`}>
                                <TierIconComponent className={`h-6 w-6 ${
                                  tier.id === 'partner' ? 'text-amber-600' : 
                                  tier.id === 'standard' ? 'text-blue-600' : 'text-slate-600'
                                }`} />
                              </div>
                              <h3 className="font-semibold text-lg">{tier.name}</h3>
                              <p className="text-2xl font-bold mt-1">
                                {tier.price}
                                <span className="text-sm font-normal text-slate-500">{tier.period}</span>
                              </p>
                            </div>
                            <ul className="space-y-2 mb-4">
                              {tier.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                                  <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                            <Button
                              className={`w-full ${isCurrentPlan 
                                ? 'bg-slate-200 text-slate-600 cursor-default' 
                                : 'bg-slate-900 hover:bg-slate-800'}`}
                              disabled={isCurrentPlan || upgradePlan.isPending}
                              onClick={() => upgradePlan.mutate(tier.id)}
                            >
                              {upgradePlan.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : isCurrentPlan ? (
                                'Current Plan'
                              ) : (
                                'Select Plan'
                              )}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Bump Button */}
              {(business.subscription_tier === 'standard' || business.subscription_tier === 'partner') && (
                <Dialog open={bumpDialogOpen} onOpenChange={setBumpDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                      disabled={business.bumps_remaining <= 0 || business.is_bumped}
                    >
                      <Rocket className="h-4 w-4 mr-2" />
                      {business.is_bumped ? 'Already Bumped' : `Bump (${business.bumps_remaining} left)`}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Boost Your Listing</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-lg mb-4">
                        <ArrowUp className="h-8 w-8 text-amber-600" />
                        <div>
                          <h4 className="font-semibold text-slate-900">What's a Bump?</h4>
                          <p className="text-sm text-slate-600">
                            Your listing will appear at the top of search results for 4 hours.
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-4">
                        You have <strong>{business.bumps_remaining}</strong> bumps remaining this month.
                      </p>
                      <div className="flex gap-3">
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => setBumpDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          className="flex-1 bg-amber-500 hover:bg-amber-600"
                          onClick={() => useBump.mutate()}
                          disabled={useBump.isPending}
                        >
                          {useBump.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Use Bump Now'
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {(business.average_rating || 0).toFixed(1)}
                </p>
                <p className="text-sm text-slate-500">Avg. Rating</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{business.review_count || 0}</p>
                <p className="text-sm text-slate-500">Reviews</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">—</p>
                <p className="text-sm text-slate-500">Profile Views</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Rocket className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{business.bumps_remaining || 0}</p>
                <p className="text-sm text-slate-500">Bumps Left</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Bump Status */}
        {business.is_bumped && business.bump_expires_at && (
          <Card className="p-4 mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <div className="flex items-center gap-3">
              <Rocket className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-slate-900">Your listing is currently boosted!</p>
                <p className="text-sm text-slate-600">
                  Expires {format(new Date(business.bump_expires_at), 'MMM d, h:mm a')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full justify-start bg-white border border-slate-200 p-1 mb-6">
            <TabsTrigger value="profile">
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <MessageSquare className="h-4 w-4 mr-2" />
              Reviews ({reviews.length})
            </TabsTrigger>
          </TabsList>

          {/* Edit Profile Tab */}
          <TabsContent value="profile">
            {editData && (
              <Card className="p-6">
                <div className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Business Name</Label>
                      <Input
                        id="name"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={editData.category}
                        onValueChange={(value) => setEditData({ ...editData, category: value })}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      className="mt-1.5 min-h-[100px]"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={editData.city}
                        onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={editData.address}
                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={editData.website}
                        onChange={(e) => setEditData({ ...editData, website: e.target.value })}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="service_area">Service Area</Label>
                    <Input
                      id="service_area"
                      value={editData.service_area}
                      onChange={(e) => setEditData({ ...editData, service_area: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 px-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div>
                      <Label htmlFor="silver" className="font-medium text-slate-900">Accept Silver Payment</Label>
                      <p className="text-sm text-slate-600">Let customers know you accept silver/precious metals</p>
                    </div>
                    <Switch
                      id="silver"
                      checked={editData.accepts_silver}
                      onCheckedChange={(checked) => setEditData({ ...editData, accepts_silver: checked })}
                    />
                  </div>

                  {/* Photos */}
                  <div>
                    <Label>Photos</Label>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {editData.photos.map((photo, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={photo}
                            alt={`Upload ${idx + 1}`}
                            className="h-24 w-24 rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      <label className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                        {uploading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                        ) : (
                          <Upload className="h-5 w-5 text-slate-400" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Services */}
                  <div>
                    <Label>Services</Label>
                    <div className="mt-2 space-y-3">
                      {editData.services.map((service, idx) => (
                        <div key={idx} className="p-3 border border-slate-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Service {idx + 1}</span>
                            {editData.services.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeService(idx)}
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="grid sm:grid-cols-3 gap-2">
                            <Input
                              value={service.name}
                              onChange={(e) => updateService(idx, 'name', e.target.value)}
                              placeholder="Service name"
                            />
                            <Input
                              type="number"
                              value={service.starting_price}
                              onChange={(e) => updateService(idx, 'starting_price', e.target.value)}
                              placeholder="Starting price ($)"
                            />
                            <Input
                              value={service.description}
                              onChange={(e) => updateService(idx, 'description', e.target.value)}
                              placeholder="Description"
                            />
                          </div>
                        </div>
                      ))}
                      <Button variant="outline" onClick={addService} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Service
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-slate-200">
                    <Button 
                      onClick={handleSave}
                      disabled={updateBusiness.isPending}
                      className="bg-slate-900 hover:bg-slate-800"
                    >
                      {updateBusiness.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : updateBusiness.isSuccess ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Saved!
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <div className="space-y-4">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))
              ) : (
                <Card className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-slate-900">No reviews yet</h3>
                  <p className="text-slate-600 mt-2">
                    Once customers leave reviews, they'll appear here.
                  </p>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}