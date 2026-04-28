// BusinessProfileSpace — Phase 4.2-tiles-5
//
// The owner-facing Profile space surface. Lights up when a business owner
// taps the Profile tile inside their business cockpit. Public-facing
// content lives here: directory logo, name, tagline, services, hours,
// contact, address/service area, photos. The Settings space (separate
// surface) owns operational concerns — enabled spaces, document branding,
// directory visibility, accepts toggles, subscription, delete.
//
// Honest minimum scope (DEC-183 path-walking): edit toggle + the fields
// neighbors actually see in the directory. Archetype-specific shop/payment
// editors stay in the legacy BusinessSettings.jsx (still rendered for
// allowlisted spinner cockpit users via DashboardSettings) until path-walking
// surfaces a real need to migrate them here. The Settings space links to
// this surface with "Edit profile" affordance.
//
// Write path: every mutation goes through `Business.updateProfile` (DEC-177
// SDK wrap), which hits the `updateBusiness` server function with
// PROFILE_ALLOWLIST gating (DEC-025).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Mail, Phone, Globe, MapPin, Pencil, Loader2, Upload, Store, Plus, X, ImageIcon,
} from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Business } from '@/api/business';
import SlugMultiSelect from '@/components/business/SlugMultiSelect';
import { LANE_COUNTY_TOWNS } from '@/config/laneCountyTowns';

const INPUT_CLASS =
  'bg-secondary border border-border rounded-lg px-3 py-2 text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring focus:outline-none transition-colors';

function formatPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function getInitialFormData(business) {
  if (!business) return null;
  return {
    name: business.name || '',
    tagline: business.tagline || '',
    description: business.description || '',
    business_hours: business.business_hours || '',
    email: business.email || business.contact_email || '',
    phone: business.phone || '',
    website: business.website || '',
    address: business.address || '',
    city: business.city || '',
    state: business.state || '',
    zip_code: business.zip_code || '',
    services: Array.isArray(business.services) ? business.services : [],
  };
}

export default function BusinessProfileSpace({ business, currentUserId }) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(() => getInitialFormData(business));
  const logoInputRef = useRef(null);
  const photosInputRef = useRef(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    if (!isEditing) setFormData(getInitialFormData(business));
  }, [business, isEditing]);

  const isOwner = business?.owner_user_id === currentUserId;

  // ─── Mutations ─────────────────────────────────────────────────────
  // All writes invalidate the same queries the legacy BusinessSettings
  // invalidates, so directory/profile/network surfaces repaint together.

  const invalidateBusiness = () => {
    queryClient.invalidateQueries({ queryKey: ['ownedBusinesses', currentUserId] });
    queryClient.invalidateQueries({ queryKey: ['staffBusinesses', currentUserId] });
    queryClient.invalidateQueries({ queryKey: ['business', business?.id] });
    queryClient.invalidateQueries({ queryKey: ['directory-businesses'] });
    queryClient.invalidateQueries({ queryKey: ['network-businesses'] });
    queryClient.invalidateQueries({ queryKey: ['homepage-recent-businesses'] });
  };

  const updateMutation = useMutation({
    mutationFn: (changedFields) => Business.updateProfile(business.id, changedFields),
    onSuccess: () => {
      invalidateBusiness();
      toast.success('Profile updated');
      setIsEditing(false);
    },
    onError: (err) => {
      console.error('Profile save error:', err);
      toast.error('Failed to save. Please try again.');
    },
  });

  const logoUploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url ?? result?.url;
      if (!url) throw new Error('No URL returned');
      await Business.updateProfile(business.id, { logo_url: url });
      return url;
    },
    onSuccess: () => {
      invalidateBusiness();
      toast.success('Directory logo updated');
    },
    onError: () => toast.error('Failed to upload logo'),
  });

  const photosMutation = useMutation({
    mutationFn: (nextPhotos) => Business.updateProfile(business.id, { photos: nextPhotos }),
    onSuccess: () => invalidateBusiness(),
    onError: (err) => {
      console.error('Photos save error:', err);
      toast.error('Failed to save photo changes.');
    },
  });

  const serviceAreaMutation = useMutation({
    mutationFn: (nextSlugs) => Business.updateProfile(business.id, { service_area: nextSlugs }),
    onSuccess: () => {
      invalidateBusiness();
      toast.success('Service area saved');
    },
    onError: () => toast.error('Could not save service area.'),
  });

  const currentServiceAreaSlugs = Array.isArray(business?.service_area) ? business.service_area : [];

  const handleAddTown = (slug) => {
    if (currentServiceAreaSlugs.includes(slug)) return;
    serviceAreaMutation.mutate([...currentServiceAreaSlugs, slug]);
  };
  const handleRemoveTown = (slug) => {
    serviceAreaMutation.mutate(currentServiceAreaSlugs.filter((s) => s !== slug));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { validateFile } = await import('@/utils/fileValidation');
    const check = validateFile(file);
    if (!check.valid) { toast.error(check.error); return; }
    logoUploadMutation.mutate(file);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const handlePhotoUpload = async (files) => {
    if (!files?.length) return;
    const { validateFile } = await import('@/utils/fileValidation');
    setUploadingPhotos(true);
    const uploaded = [];
    for (const file of files) {
      const check = validateFile(file);
      if (!check.valid) { toast.error(check.error); continue; }
      try {
        const result = await base44.integrations.Core.UploadFile({ file });
        const url = result?.file_url ?? result?.url;
        if (url) uploaded.push(url);
      } catch (err) {
        console.error('Photo upload failed:', err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    if (uploaded.length > 0) {
      const existing = Array.isArray(business?.photos) ? business.photos : [];
      await photosMutation.mutateAsync([...existing, ...uploaded]);
      toast.success(uploaded.length === 1 ? 'Photo uploaded' : `${uploaded.length} photos uploaded`);
    }
    setUploadingPhotos(false);
    if (photosInputRef.current) photosInputRef.current.value = '';
  };

  const handlePhotoRemove = async (idx) => {
    const existing = Array.isArray(business?.photos) ? business.photos : [];
    await photosMutation.mutateAsync(existing.filter((_, i) => i !== idx));
    toast.success('Photo removed');
  };

  const handleChange = (field, value) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const addService = () => {
    setFormData((prev) => (prev
      ? { ...prev, services: [...(prev.services || []), { name: '', description: '', starting_price: '' }] }
      : prev));
  };
  const removeService = (idx) => {
    setFormData((prev) => (prev
      ? { ...prev, services: (prev.services || []).filter((_, i) => i !== idx) }
      : prev));
  };
  const updateService = (idx, field, value) => {
    setFormData((prev) => {
      if (!prev) return prev;
      const next = [...(prev.services || [])];
      next[idx] = { ...next[idx], [field]: value };
      return { ...prev, services: next };
    });
  };

  const handleSave = () => {
    if (!business || !formData) return;
    const initial = getInitialFormData(business);
    const changedFields = {};
    const arrayFields = ['services'];
    arrayFields.forEach((key) => {
      const cleaned = (formData.services || [])
        .filter((s) => (s.name || '').trim())
        .map((s) => ({
          ...s,
          name: (s.name || '').trim(),
          description: (s.description || '').trim(),
          starting_price: s.starting_price ? parseFloat(s.starting_price) : null,
        }));
      const a = JSON.stringify(initial[key] || []);
      const b = JSON.stringify(cleaned);
      if (a !== b) changedFields[key] = cleaned;
    });
    Object.keys(formData).forEach((key) => {
      if (arrayFields.includes(key)) return;
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

  if (!business || !formData) return null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Profile</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Your public face on LocalLane. This is what neighbors see in the directory and search results.
          </p>
        </div>
        {isOwner && !isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-primary hover:bg-secondary"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Edit
          </Button>
        )}
      </div>

      {/* Directory logo card */}
      <Card className="bg-card border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
          Directory logo
        </h3>
        <div className="flex items-center gap-4">
          {business?.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="h-20 w-20 rounded-lg object-cover border border-border"
            />
          ) : (
            <div className="h-20 w-20 rounded-lg bg-secondary border border-border flex items-center justify-center">
              <Store className="h-8 w-8 text-muted-foreground/70" />
            </div>
          )}
          {isOwner && (
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
                className="border-primary text-primary hover:bg-primary/10"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploadMutation.isPending}
              >
                {logoUploadMutation.isPending
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Upload className="h-4 w-4 mr-2" />}
                {business?.logo_url ? 'Replace' : 'Upload'}
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          This shows on your directory tile, public profile page, and search results. Square crops work best.
        </p>
      </Card>

      {/* Basic info card */}
      <Card className="bg-card border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
          Basics
        </h3>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-name" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Business name *
              </Label>
              <Input
                id="profile-name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={INPUT_CLASS}
                placeholder="Your business name"
              />
            </div>
            <div>
              <Label htmlFor="profile-tagline" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Tagline
              </Label>
              <Input
                id="profile-tagline"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className={INPUT_CLASS}
                placeholder="A short line that shows under your name"
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="profile-description" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Description
              </Label>
              <Textarea
                id="profile-description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className={INPUT_CLASS}
                placeholder="Tell neighbors what you do"
              />
            </div>
            <div>
              <Label htmlFor="profile-hours" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Business hours
              </Label>
              <Textarea
                id="profile-hours"
                value={formData.business_hours}
                onChange={(e) => handleChange('business_hours', e.target.value)}
                rows={2}
                className={INPUT_CLASS}
                placeholder="e.g. Mon–Fri 9am–5pm, Sat 10am–2pm"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-foreground font-semibold text-base">{business.name || 'Unnamed business'}</p>
              {business.tagline && <p className="text-foreground-soft mt-0.5">{business.tagline}</p>}
            </div>
            {business.description && (
              <p className="text-muted-foreground leading-relaxed pt-1">{business.description}</p>
            )}
            {business.business_hours && (
              <p className="text-muted-foreground pt-1 whitespace-pre-line">{business.business_hours}</p>
            )}
          </div>
        )}
      </Card>

      {/* Contact card */}
      <Card className="bg-card border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
          Contact
        </h3>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-email" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Email
              </Label>
              <Input
                id="profile-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={INPUT_CLASS}
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <Label htmlFor="profile-phone" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Phone
              </Label>
              <Input
                id="profile-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={INPUT_CLASS}
                placeholder="(541) 555-1234"
              />
            </div>
            <div>
              <Label htmlFor="profile-website" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Website
              </Label>
              <Input
                id="profile-website"
                type="url"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className={INPUT_CLASS}
                placeholder="https://example.com"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {(business.email || business.contact_email) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                <span>{business.email || business.contact_email}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                <span>{formatPhone(business.phone)}</span>
              </div>
            )}
            {business.website && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                <a
                  href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary-hover truncate transition-colors"
                >
                  {business.website}
                </a>
              </div>
            )}
            {!business.email && !business.contact_email && !business.phone && !business.website && (
              <p className="text-muted-foreground/70 italic">No contact info yet.</p>
            )}
          </div>
        )}
      </Card>

      {/* Address card */}
      <Card className="bg-card border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
          Location
        </h3>
        {isEditing ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="profile-address" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                Street address
              </Label>
              <Input
                id="profile-address"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className={INPUT_CLASS}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="profile-city" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                  City
                </Label>
                <Input
                  id="profile-city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Eugene"
                />
              </div>
              <div>
                <Label htmlFor="profile-state" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                  State
                </Label>
                <Input
                  id="profile-state"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value.toUpperCase().slice(0, 2))}
                  className={INPUT_CLASS}
                  placeholder="OR"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="profile-zip" className="text-xs text-muted-foreground uppercase tracking-wider mb-1 block">
                  Zip
                </Label>
                <Input
                  id="profile-zip"
                  value={formData.zip_code}
                  onChange={(e) => handleChange('zip_code', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="97401"
                  maxLength={10}
                />
              </div>
            </div>
          </div>
        ) : (business.address || business.city || business.state) ? (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0 mt-0.5" />
            <span>
              {[business.address, business.city, business.state].filter(Boolean).join(', ')}
              {business.zip_code ? ` ${business.zip_code}` : ''}
            </span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/70 italic">No address yet.</p>
        )}

        {/* Service area — immediate writes per chip toggle. Visible always
            (not gated to edit mode) because the SlugMultiSelect IS the editor. */}
        {isOwner && (
          <div className="mt-5 pt-5 border-t border-border">
            <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
              Service area
            </h4>
            <p className="text-xs text-muted-foreground/70 mb-3">
              Towns and communities you serve in Lane County. Independent of your business address.
            </p>
            <SlugMultiSelect
              selectedSlugs={currentServiceAreaSlugs}
              items={LANE_COUNTY_TOWNS}
              onAdd={handleAddTown}
              onRemove={handleRemoveTown}
              disabled={serviceAreaMutation.isPending}
              emptyHelpText="Pick the towns you serve."
            />
          </div>
        )}
      </Card>

      {/* Services card */}
      <Card className="bg-card border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
          Services
        </h3>
        {isEditing ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground/70">
              Each service becomes a row on your public profile. Starting price is optional.
            </p>
            {(formData.services || []).map((service, idx) => (
              <div key={idx} className="bg-secondary/40 border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={service.name || ''}
                      onChange={(e) => updateService(idx, 'name', e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="Service name"
                    />
                    <Textarea
                      value={service.description || ''}
                      onChange={(e) => updateService(idx, 'description', e.target.value)}
                      rows={2}
                      className={INPUT_CLASS}
                      placeholder="What's included (optional)"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">From $</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={service.starting_price ?? ''}
                        onChange={(e) => updateService(idx, 'starting_price', e.target.value)}
                        className={`${INPUT_CLASS} max-w-[140px]`}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeService(idx)}
                    aria-label={`Remove service ${idx + 1}`}
                    className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addService}
              className="border-border text-foreground-soft hover:border-primary hover:text-primary hover:bg-transparent"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add a service
            </Button>
          </div>
        ) : (Array.isArray(business.services) && business.services.length > 0) ? (
          <div className="space-y-2">
            {business.services.map((service, idx) => (
              <div key={idx} className="text-sm">
                <p className="text-foreground font-medium">{service.name}</p>
                {service.description && (
                  <p className="text-muted-foreground text-xs mt-0.5">{service.description}</p>
                )}
                {service.starting_price != null && service.starting_price !== '' && (
                  <p className="text-primary text-xs mt-0.5">From ${service.starting_price}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/70 italic">
            No services listed yet.{(business?.services_offered || '').trim() && (
              <> Legacy free-text: <span className="not-italic">{business.services_offered}</span></>
            )}
          </p>
        )}
      </Card>

      {/* Photos card — owner-only management; non-owners don't see this in
          the Profile space (they see photos on the public BusinessProfile page). */}
      {isOwner && (
        <Card className="bg-card border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            Photos
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            These show in the Photos tab on your public profile.
          </p>
          <div className="flex flex-wrap gap-3">
            {(business?.photos || []).map((photo, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={photo}
                  alt={`Photo ${idx + 1}`}
                  className="h-24 w-24 rounded-lg object-cover border-2 border-border"
                />
                <button
                  type="button"
                  onClick={() => handlePhotoRemove(idx)}
                  disabled={photosMutation.isPending}
                  aria-label={`Remove photo ${idx + 1}`}
                  className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="h-24 w-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/10 transition-all">
              {uploadingPhotos ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground mt-1">Add photo</span>
                </>
              )}
              <input
                ref={photosInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoUpload(Array.from(e.target.files || []))}
                className="hidden"
                disabled={uploadingPhotos || photosMutation.isPending}
              />
            </label>
          </div>
        </Card>
      )}

      {/* Edit-mode action bar */}
      {isEditing && (
        <div className="flex gap-2 sticky bottom-4 bg-card/80 backdrop-blur border border-border rounded-xl p-3">
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-medium"
          >
            {updateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
            ) : 'Save changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={updateMutation.isPending}
            className="border border-border text-muted-foreground hover:bg-secondary hover:text-foreground-soft"
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
