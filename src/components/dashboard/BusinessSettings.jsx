import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Store, Star, Zap, Crown, ExternalLink, Mail, Phone, Globe, MapPin, Pencil, Loader2, Upload, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { US_STATES } from '@/lib/usStates';
import StaffWidget from './widgets/StaffWidget';
import { useCategories } from '@/hooks/useCategories';
import { ARCHETYPE_SLUG_TO_CONFIG } from '@/config/onboardingConfig';
import { archetypeSubcategories } from '@/components/categories/categoryData';

const TIER_CONFIG = {
  basic: {
    label: 'Basic',
    sublabel: 'Free',
    icon: Star,
    color: 'text-slate-300',
    bg: 'bg-slate-700',
    description: 'List your business, create events (pending review), appear in directory.'
  },
  standard: {
    label: 'Standard',
    sublabel: '',
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-500/20',
    description: 'Accept Joy Coins, auto-publish events, revenue analytics, priority in directory.'
  },
  partner: {
    label: 'Partner',
    sublabel: '',
    icon: Crown,
    color: 'text-amber-500',
    bg: 'bg-amber-500/20',
    description: 'Everything in Standard plus dedicated partner node, custom branding, priority support.'
  }
};

const INPUT_CLASS =
  'bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none transition-colors';

function getInitialFormData(business) {
  if (!business) return null;
  const mainId = business.primary_category || business.main_category || business.category || '';
  return {
    name: business.name || '',
    description: business.description || '',
    primary_category: mainId,
    main_category: business.main_category || mainId || '',
    sub_category: business.sub_category || '',
    sub_category_id: business.sub_category_id || '',
    subcategory: business.subcategory || '',
    business_hours: business.business_hours || '',
    email: business.email || business.contact_email || '',
    phone: business.phone || '',
    website: business.website || '',
    instagram: business.instagram || '',
    facebook: business.facebook || '',
    address: business.address || '',
    city: business.city || '',
    state: business.state || '',
    zip_code: business.zip_code || '',
    display_full_address: business.display_full_address === true,
    service_area: business.service_area || '',
    services_offered: business.services_offered || '',
    shop_url: business.shop_url || '',
  };
}

export default function BusinessSettings({ business, currentUserId }) {
  const queryClient = useQueryClient();
  const { mainCategories, getSubcategory, getLabel, legacyCategoryMapping } = useCategories();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const logoInputRef = React.useRef(null);

  // Compute Select value: must match SelectItem value format "mainId|subId"
  const categorySelectValue = useMemo(() => {
    if (!formData) return '';
    const mainId = formData.primary_category || formData.main_category;
    const subId = formData.sub_category_id;
    if (mainId && subId) return `${mainId}|${subId}`;
    // Legacy: primary_category/sub_category may be labels
    const main = mainCategories.find((m) => m.id === mainId || m.label === formData.primary_category);
    const sub = main?.subcategories.find((s) => s.id === subId || s.label === formData.sub_category);
    if (main && sub) return `${main.id}|${sub.id}`;
    return '';
  }, [formData, mainCategories]);

  const resolvedArchetype = useMemo(() => {
    if (!business?.archetype) return null;
    return archetypeSubcategories[business.archetype]
      ? business.archetype
      : ARCHETYPE_SLUG_TO_CONFIG[business.archetype] || business.archetype;
  }, [business?.archetype]);

  const subcategoryOptions = useMemo(
    () => (resolvedArchetype ? archetypeSubcategories[resolvedArchetype] || [] : []),
    [resolvedArchetype]
  );

  useEffect(() => {
    const next = getInitialFormData(business);
    if (next) setFormData(next);
  }, [business?.id]);

  // When not in edit mode, keep formData in sync with business (e.g. after refetch)
  useEffect(() => {
    if (!isEditing && business && formData) {
      setFormData(getInitialFormData(business));
    }
  }, [business, isEditing]);

  const tier = business?.subscription_tier || 'basic';
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.basic;
  const TierIcon = tierConfig.icon;

  const updateMutation = useMutation({
    mutationFn: async (changedFields) => {
      await base44.functions.invoke('updateBusiness', {
        action: 'update_profile',
        business_id: business.id,
        data: changedFields,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownedBusinesses', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['staffBusinesses', currentUserId] });
      toast.success('Business profile updated');
      setIsEditing(false);
    },
    onError: (err) => {
      console.error('Business profile save error:', err);
      toast.error('Failed to update profile. Please try again.');
    },
  });

  const logoUploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url ?? result?.url;
      if (!url) throw new Error('No URL returned');
      await base44.functions.invoke('updateBusiness', {
        action: 'update_profile',
        business_id: business.id,
        data: { logo_url: url },
      });
      return url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownedBusinesses', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['staffBusinesses', currentUserId] });
      toast.success('Logo uploaded successfully');
    },
    onError: () => {
      toast.error('Failed to upload logo');
    },
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    logoUploadMutation.mutate(file);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handleChange = (field, value) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSave = () => {
    if (!business || !formData) return;
    const changedFields = {};
    const initial = getInitialFormData(business);
    (Object.keys(formData) || []).forEach((key) => {
      const a = initial[key];
      const b = formData[key];
      const va = a == null ? '' : String(a).trim();
      const vb = b == null ? '' : String(b).trim();
      if (va !== vb) changedFields[key] = b;
    });
    if (Object.keys(changedFields).length === 0) {
      setIsEditing(false);
      return;
    }
    updateMutation.mutate(changedFields);
  };

  const handleCancel = () => {
    setFormData(getInitialFormData(business));
    setIsEditing(false);
  };

  // Dev tier override (only in development)
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost';

  if (!business || !formData) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="h-5 w-5 text-amber-500" />
          Business Settings
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Manage your profile, team, and subscription.
        </p>
      </div>

      {/* Business Profile Card */}
      <Card className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-amber-500/50 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">Business Profile</h3>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-amber-500 hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit Profile
              </Button>
            ) : null}
            <Link to={createPageUrl(`BusinessProfile?id=${business?.id}`)}>
              <Button
                variant="outline"
                size="sm"
                className="border border-amber-500 text-amber-500 hover:bg-amber-500/10 px-4 py-2 rounded-lg transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View Public Profile
              </Button>
            </Link>
          </div>
        </div>

        {isEditing ? (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="border-b border-slate-700 pb-2">
                <h4 className="text-xs text-slate-400 uppercase tracking-wider">Basic Info</h4>
              </div>
              <div>
                <Label htmlFor="business-name" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Business name *
                </Label>
                <Input
                  id="business-name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Your business name"
                />
              </div>
              <div>
                <Label htmlFor="business-description" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Description / bio
                </Label>
                <Textarea
                  id="business-description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={4}
                  className={INPUT_CLASS}
                  placeholder="Tell people what you do"
                />
              </div>
              <div>
                <Label htmlFor="business-category" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Category
                </Label>
                <Select
                  value={categorySelectValue}
                  onValueChange={(val) => {
                    if (!val) {
                      handleChange('primary_category', '');
                      handleChange('main_category', '');
                      handleChange('sub_category', '');
                      handleChange('sub_category_id', '');
                      return;
                    }
                    const [mainId, subId] = val.split('|');
                    const sub = getSubcategory(mainId, subId);
                    const subLabel = sub?.label ?? subId;
                    handleChange('primary_category', mainId);
                    handleChange('main_category', mainId);
                    handleChange('sub_category', subLabel);
                    handleChange('sub_category_id', subId || '');
                  }}
                >
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 rounded-lg focus:border-amber-500 focus:ring-amber-500/20">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {mainCategories.map((main) => (
                      <SelectGroup key={main.id}>
                        <SelectLabel className="text-slate-400 text-xs uppercase tracking-wide px-2 py-1">
                          {main.label}
                        </SelectLabel>
                        {main.subcategories.map((sub) => (
                          <SelectItem
                            key={`${main.id}|${sub.id}`}
                            value={`${main.id}|${sub.id}`}
                            className="text-slate-300 focus:bg-slate-800 pl-4"
                          >
                            {sub.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {subcategoryOptions.length > 0 && (
                <div>
                  <Label htmlFor="business-subcategory" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                    What best describes your business?
                  </Label>
                  <Select
                    value={formData.subcategory || ''}
                    onValueChange={(val) => handleChange('subcategory', val)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 rounded-lg focus:border-amber-500 focus:ring-amber-500/20">
                      <SelectValue placeholder="Select one" />
                    </SelectTrigger>
                    <SelectContent>
                      {subcategoryOptions.map((opt) => (
                        <SelectItem
                          key={opt}
                          value={opt}
                          className="text-slate-300 focus:bg-slate-800 focus:text-amber-500"
                        >
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="business-hours" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Business Hours
                </Label>
                <Textarea
                  id="business-hours"
                  value={formData.business_hours}
                  onChange={(e) => handleChange('business_hours', e.target.value)}
                  rows={2}
                  className={INPUT_CLASS}
                  placeholder="e.g., Mon-Fri 9am-5pm, Sat 10am-2pm"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <div className="border-b border-slate-700 pb-2">
                <h4 className="text-xs text-slate-400 uppercase tracking-wider">Contact</h4>
              </div>
              <div>
                <Label htmlFor="business-email" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Contact email
                </Label>
                <Input
                  id="business-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="contact@example.com"
                />
              </div>
              <div>
                <Label htmlFor="business-phone" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Contact phone
                </Label>
                <Input
                  id="business-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="(541) 555-1234"
                />
              </div>
              <div>
                <Label htmlFor="business-website" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Website URL
                </Label>
                <Input
                  id="business-website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="https://example.com"
                />
              </div>
              <div>
                <Label htmlFor="business-instagram" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Instagram
                </Label>
                <Input
                  id="business-instagram"
                  value={formData.instagram}
                  onChange={(e) => handleChange('instagram', (e.target.value || '').replace(/^@/, ''))}
                  className={INPUT_CLASS}
                  placeholder="@yourbusiness"
                />
              </div>
              <div>
                <Label htmlFor="business-facebook" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Facebook Page
                </Label>
                <Input
                  id="business-facebook"
                  value={formData.facebook}
                  onChange={(e) => handleChange('facebook', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="facebook.com/yourbusiness"
                />
              </div>
            </div>

            {/* Archetype-specific: Your Services (service_provider) */}
            {resolvedArchetype === 'service_provider' && (
              <div className="space-y-4">
                <div className="border-b border-slate-700 pb-2">
                  <h4 className="text-xs text-slate-400 uppercase tracking-wider">Your Services</h4>
                </div>
                <div>
                  <Label htmlFor="business-service-area" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                    Service Area
                  </Label>
                  <Input
                    id="business-service-area"
                    value={formData.service_area}
                    onChange={(e) => handleChange('service_area', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="e.g., Eugene/Springfield area"
                  />
                </div>
                <div>
                  <Label htmlFor="business-services-offered" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                    What services do you offer?
                  </Label>
                  <Textarea
                    id="business-services-offered"
                    value={formData.services_offered}
                    onChange={(e) => handleChange('services_offered', e.target.value)}
                    rows={3}
                    className={INPUT_CLASS}
                    placeholder="Describe the services you provide"
                  />
                </div>
              </div>
            )}

            {/* Archetype-specific: Your Shop (product_seller / micro_business) */}
            {(resolvedArchetype === 'product_seller' || resolvedArchetype === 'micro_business') && (
              <div className="space-y-4">
                <div className="border-b border-slate-700 pb-2">
                  <h4 className="text-xs text-slate-400 uppercase tracking-wider">Your Shop</h4>
                </div>
                <div>
                  <Label htmlFor="business-shop-url" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                    Where can people buy from you online?
                  </Label>
                  <Input
                    id="business-shop-url"
                    value={formData.shop_url}
                    onChange={(e) => handleChange('shop_url', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="e.g., etsy.com/shop/yourshop"
                  />
                </div>
              </div>
            )}

            {/* Location */}
            <div className="space-y-4">
              <div className="border-b border-slate-700 pb-2">
                <h4 className="text-xs text-slate-400 uppercase tracking-wider">Location</h4>
              </div>
              <label className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700 cursor-pointer">
                <Switch
                  checked={formData.display_full_address}
                  onCheckedChange={(checked) => handleChange('display_full_address', checked)}
                  className="data-[state=checked]:bg-amber-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-200">Display full address on map?</p>
                  <p className="text-xs text-slate-500">Off by default to protect privacy</p>
                </div>
              </label>
              <div>
                <Label htmlFor="business-address" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                  Street address <span className="text-amber-500">*</span>
                </Label>
                <Input
                  id="business-address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="business-city" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                    City <span className="text-amber-500">*</span>
                  </Label>
                  <Input
                    id="business-city"
                    value={formData.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Eugene"
                  />
                </div>
                <div>
                  <Label htmlFor="business-state" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                    State <span className="text-amber-500">*</span>
                  </Label>
                  <Select
                    value={formData.state || ''}
                    onValueChange={(val) => handleChange('state', val)}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 rounded-lg focus:border-amber-500 focus:ring-amber-500/20">
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((s) => (
                        <SelectItem key={s.code} value={s.code} className="text-slate-100 focus:bg-slate-800 focus:text-amber-500">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="business-zip" className="text-xs text-slate-400 uppercase tracking-wider mb-1 block">
                    Zip code <span className="text-amber-500">*</span>
                  </Label>
                  <Input
                    id="business-zip"
                    value={formData.zip_code}
                    onChange={(e) => handleChange('zip_code', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="97401"
                    maxLength={10}
                  />
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="flex items-center gap-4 pt-2">
              {business?.logo_url ? (
                <img
                  src={business.logo_url}
                  alt={business.name}
                  className="h-20 w-20 rounded-lg object-cover border border-slate-700"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <Store className="h-8 w-8 text-slate-500" />
                </div>
              )}
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-amber-500 text-amber-500 hover:bg-amber-500/10"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploadMutation.isPending}
                >
                  {logoUploadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload New
                </Button>
                <p className="text-xs text-slate-500 mt-1">Recommended: 200x200px, PNG or JPG</p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
                className="border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300 px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {business?.logo_url ? (
                  <img
                    src={business.logo_url}
                    alt={business.name}
                    className="h-12 w-12 rounded-lg object-cover border border-slate-700"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <Store className="h-6 w-6 text-slate-500" />
                  </div>
                )}
                <div>
                  <p className="text-slate-100 font-semibold">{business?.name || 'Unnamed Business'}</p>
                  <p className="text-xs text-slate-400">
                    {(() => {
                      const mainId = business?.main_category || business?.primary_category;
                      const subId = business?.sub_category_id;
                      let categoryDisplay = mainId ? getLabel(mainId, subId) : null;
                      if (!categoryDisplay && business?.category && legacyCategoryMapping?.[business.category]) {
                        const { main, sub } = legacyCategoryMapping[business.category];
                        categoryDisplay = getLabel(main, sub);
                      }
                      if (!categoryDisplay) {
                        categoryDisplay = `${business?.archetype || 'location'} · ${business?.primary_category || business?.category || 'General'}`;
                      }
                      return categoryDisplay;
                    })()}
                  </p>
                </div>
              </div>

              {business?.description && (
                <p className="text-sm text-slate-400 line-clamp-2">{business.description}</p>
              )}
            </div>

            <div className="space-y-2 text-sm">
              {(business?.address || business?.city || business?.state) && (
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>
                    {[business.address, business.city, business.state].filter(Boolean).join(', ')}
                    {business?.zip_code ? ` ${business.zip_code}` : ''}
                  </span>
                </div>
              )}
              {(business?.email || business?.contact_email) && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>{business.email || business.contact_email}</span>
                </div>
              )}
              {business?.phone && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <span>{business.phone}</span>
                </div>
              )}
              {business?.website && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Globe className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                  <a
                    href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-500 hover:text-amber-400 truncate transition-colors"
                  >
                    {business.website}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Subscription Status */}
      <Card className="bg-slate-900 border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-100 mb-4">Subscription</h3>
        <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${tierConfig.bg}`}>
              <TierIcon className={`h-5 w-5 ${tierConfig.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-slate-100 font-semibold">{tierConfig.label}</p>
                {tierConfig.sublabel && (
                  <Badge className={`${tierConfig.bg} ${tierConfig.color} text-xs border-0`}>
                    {tierConfig.sublabel}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{tierConfig.description}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800">
          <p className="text-sm text-slate-300">
            <span className="text-amber-500 font-medium">Founding Member.</span> You believed in LocalLane before there was proof. Thank you for being part of building this community.
          </p>
        </div>
      </Card>

      {/* Team Management — feature guarded with Coming Soon (re-enable: render StaffWidget below) */}
      <Card className="bg-slate-900 border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-100 uppercase tracking-wider mb-4">Team</h3>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-200">Team Management — Coming Soon</h3>
          <p className="text-slate-400 mt-2 max-w-md">
            Soon you&apos;ll be able to invite co-owners, managers, and staff to help run your business on LocalLane. We&apos;re building this for you.
          </p>
        </div>
      </Card>
      {false && <StaffWidget business={business} currentUserId={currentUserId} />}

      {/* Dev Tier Override */}
      {isDev && (
        <Card className="bg-slate-900 border-red-900/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Badge className="bg-red-500/20 text-red-400 text-xs border-0">DEV ONLY</Badge>
            <h3 className="text-sm font-semibold text-slate-100">Tier Override</h3>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Override subscription tier for testing. Changes are saved to the database.
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(TIER_CONFIG).map(([key, config]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    // Dev-only: direct update so tier can be toggled without admin role; production profile updates use update_profile server function.
                    await base44.entities.Business.update(business.id, { subscription_tier: key });
                    queryClient.invalidateQueries({ queryKey: ['ownedBusinesses', currentUserId] });
                    queryClient.invalidateQueries({ queryKey: ['staffBusinesses', currentUserId] });
                    window.location.reload();
                  } catch (err) {
                    console.error('Failed to update tier:', err);
                    toast.error('Failed to update tier');
                  }
                }}
                className={`${
                  tier === key
                    ? 'border-amber-500 text-amber-500'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                } bg-transparent hover:bg-transparent transition-colors`}
              >
                {config.label}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
