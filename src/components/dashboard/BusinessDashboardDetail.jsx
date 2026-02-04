import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrganization } from "@/hooks/useOrganization";
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
import StoryCard from '@/components/recommendations/StoryCard';
import NodAvatars from '@/components/recommendations/NodAvatars';
import VouchCard from '@/components/recommendations/VouchCard';
import { Checkbox } from "@/components/ui/checkbox";
import {
  Eye, Settings, MapPin,
  Loader2, CheckCircle, Crown, Zap, ArrowUp, Upload, X, Plus, Trash2,
  ExternalLink, Check, ChevronLeft, ThumbsUp, BookOpen, Star, Coins
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { mainCategories, getMainCategory } from '@/components/categories/categoryData';
import LocationsSection from '@/components/dashboard/LocationsSection';

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
];

const tiers = [
  {
    id: 'basic',
    name: 'Basic',
    price: '$9',
    period: '/month',
    icon: Star,
    features: ['Business listing', 'Basic profile', 'Contact info', 'Neighbor recommendations']
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '$29',
    period: '/month',
    icon: Zap,
    popular: true,
    features: ['Everything in Basic', 'Photo gallery', 'Service listings', 'Priority support']
  },
  {
    id: 'partner',
    name: 'Partner',
    price: '$79',
    period: '/month',
    icon: Crown,
    features: ['Everything in Standard', 'Partner badge', 'Dedicated account manager', 'Analytics dashboard']
  }
];

export default function BusinessDashboardDetail({ business, onBack }) {
  const queryClient = useQueryClient();
  const { tier, tierLevel, isPartner } = useOrganization(business);

  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editData, setEditData] = useState(null);

  const { data: recommendations = [], isLoading: recommendationsLoading } = useQuery({
    queryKey: ['recommendations', business?.id],
    queryFn: async () => {
      return await base44.entities.Recommendation.filter({ business_id: business.id, is_active: true }, '-created_date', 100);
    },
    enabled: !!business?.id
  });

  const nods = recommendations.filter(r => r.type === 'nod');
  const stories = recommendations.filter(r => r.type === 'story');
  const vouches = recommendations.filter(r => r.type === 'vouch');

  useEffect(() => {
    if (business && !editData) {
      setEditData({
        name: business.name || '',
        description: business.description || '',
        main_category: business.main_category || '',
        subcategories: business.subcategories || [],
        street_address: business.street_address || business.address || '',
        address_line2: business.address_line2 || '',
        city: business.city || '',
        state: business.state || '',
        zip_code: business.zip_code || '',
        country: business.country || 'United States',
        phone: business.phone || '',
        email: business.email || '',
        website: business.website || '',
        service_area: business.service_area || '',
        accepts_silver: business.accepts_silver || false,
        accepts_joy_coins: business.accepts_joy_coins ?? false,
        photos: business.photos || [],
        services: business.services?.length > 0 ? business.services : [{ name: '', starting_price: '', description: '' }]
      });
    }
  }, [business]);

  const selectedMainCategory = editData ? getMainCategory(editData.main_category) : null;
  const availableSubcategories = selectedMainCategory?.subcategories.filter(s => !s.id.startsWith('all_')) || [];

  const handleMainCategoryChange = (value) => {
    setEditData({ 
      ...editData, 
      main_category: value, 
      subcategories: []
    });
  };

  const handleSubcategoryToggle = (subId) => {
    const current = editData.subcategories || [];
    if (current.includes(subId)) {
      setEditData({ ...editData, subcategories: current.filter(s => s !== subId) });
    } else {
      setEditData({ ...editData, subcategories: [...current, subId] });
    }
  };

  const updateBusiness = useMutation({
    mutationFn: async (data) => {
      await base44.entities.Business.update(business.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myBusinesses']);
    }
  });

  const upgradePlan = useMutation({
    mutationFn: async (newTier) => {
      await base44.entities.Business.update(business.id, {
        subscription_tier: newTier
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['myBusinesses']);
      setUpgradeDialogOpen(false);
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

  if (!editData) return null;

  const tierInfo = {
    basic: { icon: Star, color: 'text-slate-300', bg: 'bg-slate-800', name: 'Basic' },
    standard: { icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/20', name: 'Standard' },
    partner: { icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/20', name: 'Partner' }
  };

  const currentTier = tierInfo[tier] || tierInfo.basic;
  const TierIcon = currentTier.icon;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="mb-4 text-slate-300 hover:text-amber-500 hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to All Businesses
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{business.name}</h1>
                <Badge className={`${currentTier.bg} ${currentTier.color} border-0`}>
                  <TierIcon className="h-3 w-3 mr-1" />
                  {currentTier.name}
                </Badge>
              </div>
              <p className="text-slate-400 mt-1">Manage your business listing</p>
            </div>
            <div className="flex items-center gap-3">
              <Link to={createPageUrl(`BusinessProfile?id=${business.id}`)}>
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Public Profile
                </Button>
              </Link>
              
              {/* Upgrade Plan Button */}
              <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent">
                    <ArrowUp className="h-4 w-4 mr-2" />
                    {isPartner ? 'Manage Plan' : 'Upgrade Plan'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-800">
                  <DialogHeader>
                    <DialogTitle>Choose Your Plan</DialogTitle>
                  </DialogHeader>
                  <div className="py-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      {tiers.map((planTier) => {
                        const TierIconComponent = planTier.icon;
                        const isCurrentPlan = tier === planTier.id;
                        return (
                          <div
                            key={planTier.id}
                            className={`relative rounded-xl border-2 p-5 transition-all ${
                              isCurrentPlan
                                ? 'border-amber-500 bg-slate-800'
                                : 'border-slate-700 hover:border-slate-600'
                            }`}
                          >
                            {planTier.popular && (
                              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black">
                                Popular
                              </Badge>
                            )}
                            <div className="text-center mb-4">
                              <div className={`h-12 w-12 rounded-lg flex items-center justify-center mx-auto mb-3 ${
                                planTier.id === 'partner' ? 'bg-amber-500/20' :
                                planTier.id === 'standard' ? 'bg-blue-500/20' : 'bg-slate-800'
                              }`}>
                                <TierIconComponent className={`h-6 w-6 ${
                                  planTier.id === 'partner' ? 'text-amber-500' :
                                  planTier.id === 'standard' ? 'text-blue-400' : 'text-slate-400'
                                }`} />
                              </div>
                              <h3 className="font-semibold text-lg text-white">{planTier.name}</h3>
                              <p className="text-2xl font-bold mt-1 text-white">
                                {planTier.price}
                                <span className="text-sm font-normal text-slate-400">{planTier.period}</span>
                              </p>
                            </div>
                            <ul className="space-y-2 mb-4">
                              {planTier.features.map((feature) => (
                                <li key={feature} className="flex items-center gap-2 text-sm text-slate-300">
                                  <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                  {feature}
                                </li>
                              ))}
                            </ul>
                            <Button
                              className={`w-full ${isCurrentPlan
                                ? 'bg-slate-700 text-slate-400 cursor-default'
                                : 'bg-amber-500 hover:bg-amber-400 text-black font-semibold'}`}
                              disabled={isCurrentPlan || upgradePlan.isPending}
                              onClick={() => upgradePlan.mutate(planTier.id)}
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


            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <Card className="p-5 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <ThumbsUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {business.recommendation_count || 0}
                </p>
                <p className="text-sm text-slate-400">Recommendations</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{business.story_count || 0}</p>
                <p className="text-sm text-slate-400">Stories</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-slate-900 border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <Eye className="h-5 w-5 text-slate-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">—</p>
                <p className="text-sm text-slate-400">Profile Views</p>
              </div>
            </div>
          </Card>
        </div>



        {/* Tabs */}
        <Tabs defaultValue="locations" className="w-full">
          <TabsList className="w-full justify-start bg-slate-900 border border-slate-800 p-1 mb-6">
            <TabsTrigger value="locations">
              <MapPin className="h-4 w-4 mr-2" />
              Locations
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              <ThumbsUp className="h-4 w-4 mr-2" />
              Recommendations ({recommendations.length})
            </TabsTrigger>
          </TabsList>

          {/* Locations Tab */}
          <TabsContent value="locations">
            <Card className="p-6 bg-slate-900 border-slate-800">
              <LocationsSection business={business} />
            </Card>
          </TabsContent>

          {/* Edit Profile Tab */}
          <TabsContent value="profile">
            <Card className="p-6 bg-slate-900 border-slate-800">
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-slate-100">Business Name</Label>
                    <Input
                      id="name"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="main_category">Category</Label>
                    <Select
                      value={editData.main_category}
                      onValueChange={handleMainCategoryChange}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {mainCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {editData.main_category && availableSubcategories.length > 0 && (
                  <div>
                    <Label className="text-slate-100">Subcategories (select all that apply)</Label>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableSubcategories.map((sub) => (
                        <label
                          key={sub.id}
                          className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                            editData.subcategories?.includes(sub.id)
                              ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                              : 'border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <Checkbox
                            checked={editData.subcategories?.includes(sub.id)}
                            onCheckedChange={() => handleSubcategoryToggle(sub.id)}
                          />
                          <span className="text-sm">{sub.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <Label htmlFor="description" className="text-slate-100">Description</Label>
                  <Textarea
                    id="description"
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="mt-1.5 min-h-[100px] bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="street_address" className="text-slate-100">Street Address</Label>
                  <Input
                    id="street_address"
                    value={editData.street_address}
                    onChange={(e) => setEditData({ ...editData, street_address: e.target.value })}
                    placeholder="123 Main Street"
                    className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="address_line2" className="text-slate-100">Apt, Suite, Unit (optional)</Label>
                  <Input
                    id="address_line2"
                    value={editData.address_line2}
                    onChange={(e) => setEditData({ ...editData, address_line2: e.target.value })}
                    placeholder="Suite 100"
                    className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={editData.city}
                      onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                      placeholder="Eugene"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={editData.state}
                      onValueChange={(value) => setEditData({ ...editData, state: value })}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state.code} value={state.code}>
                            {state.code} - {state.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="zip_code" className="text-slate-100">ZIP Code</Label>
                    <Input
                      id="zip_code"
                      value={editData.zip_code}
                      onChange={(e) => setEditData({ ...editData, zip_code: e.target.value })}
                      placeholder="97401"
                      className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="country" className="text-slate-100">Country</Label>
                    <Input
                      id="country"
                      value={editData.country}
                      className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                      disabled
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
                  <Label htmlFor="service_area" className="text-slate-100">Service Area</Label>
                  <Input
                    id="service_area"
                    value={editData.service_area}
                    onChange={(e) => setEditData({ ...editData, service_area: e.target.value })}
                    className="mt-1.5 bg-slate-800 border-slate-700 text-white"
                  />
                </div>

                <div className="flex items-center justify-between py-3 px-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                  <div>
                    <Label htmlFor="silver" className="font-medium text-slate-100">Accept Silver Payment</Label>
                    <p className="text-sm text-slate-400">Let customers know you accept silver/precious metals</p>
                  </div>
                  <Switch
                    id="silver"
                    checked={editData.accepts_silver}
                    onCheckedChange={(checked) => setEditData({ ...editData, accepts_silver: checked })}
                  />
                </div>

                {/* Joy Coins */}
                <div className="space-y-3 p-4 rounded-xl border border-slate-700 bg-slate-800/50">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Coins className="h-5 w-5 text-amber-500" />
                    Joy Coins
                  </h3>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setEditData((prev) => ({ ...prev, accepts_joy_coins: !prev.accepts_joy_coins }))}
                    onKeyDown={(e) => e.key === "Enter" && setEditData((prev) => ({ ...prev, accepts_joy_coins: !prev.accepts_joy_coins }))}
                    className="flex items-center justify-between cursor-pointer rounded-lg border border-transparent hover:border-amber-500/50 transition-colors -m-1 p-1"
                  >
                    <div className="pointer-events-none">
                      <span className="text-slate-300">Accept Joy Coins</span>
                      <p className="text-xs text-slate-500">Show "Accepts Joy Coins" badge on your profile</p>
                    </div>
                    <div
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 pointer-events-none",
                        editData.accepts_joy_coins ? "bg-amber-500" : "bg-slate-600"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 rounded-full bg-slate-100 shadow-sm transition-transform",
                          editData.accepts_joy_coins ? "translate-x-5" : "translate-x-0.5"
                        )}
                      />
                    </div>
                  </div>
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
                    <label className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-500/10 transition-colors">
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
                  <Label className="text-slate-100">Services</Label>
                  <div className="mt-2 space-y-3">
                    {editData.services.map((service, idx) => (
                      <div key={idx} className="p-3 border border-slate-700 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-slate-300">Service {idx + 1}</span>
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
                    <Button variant="outline" onClick={addService} className="w-full border-slate-700 text-slate-300 hover:border-amber-500 hover:text-amber-500 hover:bg-transparent">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <Button 
                    onClick={handleSave}
                    disabled={updateBusiness.isPending}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
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
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="recommendations">
            <div className="space-y-6">
              {/* Nods summary */}
              {nods.length > 0 && (
                <Card className="p-5 bg-slate-900 border-slate-800">
                  <p className="text-sm text-slate-400 mb-3">{nods.length} neighbors recommend your business</p>
                  <NodAvatars recommendations={nods} maxShow={12} />
                </Card>
              )}

              {/* Stories list */}
              {stories.length > 0 ? (
                stories.map((story) => (
                  <StoryCard key={story.id} recommendation={story} />
                ))
              ) : (
                <Card className="p-8 text-center bg-slate-900 border-slate-800">
                  <BookOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <h3 className="font-semibold text-white">No stories yet</h3>
                  <p className="text-slate-400 mt-2">
                    When neighbors share stories about your business, they'll appear here.
                  </p>
                </Card>
              )}

              {/* Vouches */}
              {vouches.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-slate-400 mb-3">Verified Vouches ({vouches.length})</h4>
                  <div className="space-y-3">
                    {vouches.map(v => (
                      <VouchCard key={v.id} vouch={v} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}