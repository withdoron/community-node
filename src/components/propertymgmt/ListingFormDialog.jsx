import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

function safeParseJSON(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'object') return [];
  try { return JSON.parse(val); } catch { return []; }
}

function resolveUrl(val) {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (val.url) return val.url;
  return null;
}

const AMENITY_OPTIONS = [
  { key: 'washer_dryer', label: 'Washer/Dryer' },
  { key: 'dishwasher', label: 'Dishwasher' },
  { key: 'ac', label: 'A/C' },
  { key: 'heating', label: 'Heating' },
  { key: 'pool', label: 'Pool' },
  { key: 'gym', label: 'Gym' },
  { key: 'storage', label: 'Storage' },
  { key: 'patio', label: 'Patio/Balcony' },
  { key: 'fireplace', label: 'Fireplace' },
  { key: 'ev_charging', label: 'EV Charging' },
  { key: 'fenced_yard', label: 'Fenced Yard' },
  { key: 'furnished', label: 'Furnished' },
];

const INITIAL = {
  title: '',
  description: '',
  listing_type: 'long_term',
  status: 'active',
  monthly_rent: '',
  nightly_rate: '',
  security_deposit: '',
  bedrooms: '',
  bathrooms: '',
  sqft: '',
  pet_policy: 'none',
  parking: 'none',
  utilities_included: [],
  amenities: [],
  photos: [],
  available_date: '',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  property_id: '',
  group_id: '',
};

const UTILITY_OPTIONS = ['water', 'electric', 'gas', 'trash', 'internet', 'cable'];

export default function ListingFormDialog({
  open,
  onClose,
  listing,
  properties,
  groups,
  profile,
  onSave,
}) {
  const [form, setForm] = useState(INITIAL);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const isEdit = !!listing;

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.title || !form.title.trim()) newErrors.title = 'Title is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (listing) {
      setForm({
        title: listing.title || '',
        description: listing.description || '',
        listing_type: listing.listing_type || 'long_term',
        status: listing.status || 'active',
        monthly_rent: listing.monthly_rent?.toString() || '',
        nightly_rate: listing.nightly_rate?.toString() || '',
        security_deposit: listing.security_deposit?.toString() || '',
        bedrooms: listing.bedrooms?.toString() || '',
        bathrooms: listing.bathrooms?.toString() || '',
        sqft: listing.sqft?.toString() || '',
        pet_policy: listing.pet_policy || 'none',
        parking: listing.parking || 'none',
        utilities_included: safeParseJSON(listing.utilities_included),
        amenities: safeParseJSON(listing.amenities),
        photos: safeParseJSON(listing.photos),
        available_date: listing.available_date || '',
        contact_name: listing.contact_name || '',
        contact_phone: listing.contact_phone || '',
        contact_email: listing.contact_email || '',
        property_id: listing.property_id || '',
        group_id: listing.group_id || '',
      });
    } else {
      setForm({
        ...INITIAL,
        contact_name: profile?.manager_name || '',
        contact_phone: profile?.manager_phone || '',
        contact_email: profile?.manager_email || '',
      });
    }
  }, [open, listing, profile]);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  // Auto-populate from selected property
  const handlePropertyChange = (propId) => {
    set('property_id', propId);
    if (!propId) {
      set('group_id', '');
      return;
    }
    const prop = (properties || []).find((p) => p.id === propId);
    if (!prop) return;
    set('group_id', prop.group_id || '');
    if (!form.title && !isEdit) set('title', prop.name || '');
    if (!form.monthly_rent && prop.monthly_rent) set('monthly_rent', prop.monthly_rent.toString());
    if (!form.bedrooms && prop.bedrooms) set('bedrooms', prop.bedrooms.toString());
    if (!form.bathrooms && prop.bathrooms) set('bathrooms', prop.bathrooms.toString());
    if (!form.sqft && prop.sqft) set('sqft', prop.sqft.toString());
  };

  // Photo upload — TODO: Replace base64 with file upload API when available
  const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB
  const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // Validate size and type
    for (const file of files) {
      if (file.size > MAX_PHOTO_SIZE) {
        toast.error(`"${file.name}" is too large. Photos must be under 5MB.`);
        if (fileRef.current) fileRef.current.value = '';
        return;
      }
      if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" is not supported. Use JPEG, PNG, or WebP.`);
        if (fileRef.current) fileRef.current.value = '';
        return;
      }
    }
    setUploading(true);
    const newPhotos = [];
    for (const file of files.slice(0, 10 - form.photos.length)) {
      const b64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      newPhotos.push(b64);
    }
    setForm((prev) => ({ ...prev, photos: [...prev.photos, ...newPhotos] }));
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removePhoto = (index) => {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  // Amenity toggle
  const toggleAmenity = (key) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(key)
        ? prev.amenities.filter((a) => a !== key)
        : [...prev.amenities, key],
    }));
  };

  // Utility toggle
  const toggleUtility = (key) => {
    setForm((prev) => ({
      ...prev,
      utilities_included: prev.utilities_included.includes(key)
        ? prev.utilities_included.filter((u) => u !== key)
        : [...prev.utilities_included, key],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      listing_type: form.listing_type,
      status: form.status,
      monthly_rent: parseFloat(form.monthly_rent) || 0,
      nightly_rate: parseFloat(form.nightly_rate) || 0,
      security_deposit: parseFloat(form.security_deposit) || 0,
      bedrooms: parseInt(form.bedrooms) || 0,
      bathrooms: parseFloat(form.bathrooms) || 0,
      sqft: parseInt(form.sqft) || 0,
      pet_policy: form.pet_policy,
      parking: form.parking,
      utilities_included: JSON.stringify(form.utilities_included),
      amenities: JSON.stringify(form.amenities),
      photos: JSON.stringify(form.photos),
      available_date: form.available_date || null,
      contact_name: form.contact_name.trim(),
      contact_phone: form.contact_phone.trim(),
      contact_email: form.contact_email.trim(),
      property_id: form.property_id || null,
      group_id: form.group_id || null,
    });
  };

  const isLongTerm = form.listing_type === 'long_term';

  // Build property options grouped by group
  const groupsById = {};
  (groups || []).forEach((g) => { groupsById[g.id] = g; });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {isEdit ? 'Edit Listing' : 'Create Listing'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Property selection */}
          <div>
            <Label className="text-slate-400">Property</Label>
            <select
              value={form.property_id}
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="w-full mt-1 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            >
              <option value="">— Select property —</option>
              {(properties || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {groupsById[p.group_id]?.name ? `${groupsById[p.group_id].name} — ` : ''}{p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <Label className="text-slate-400">Title *</Label>
            <Input
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              required
              className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="e.g. Cozy 2BR near campus"
            />
            {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <Label className="text-slate-400">Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              className="w-full mt-1 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
              placeholder="Describe the property..."
            />
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-400">Type</Label>
              <select
                value={form.listing_type}
                onChange={(e) => set('listing_type', e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="long_term">Long-Term Rental</option>
                <option value="short_term">Short-Term Rental</option>
              </select>
            </div>
            <div>
              <Label className="text-slate-400">Status</Label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="rented">Rented</option>
              </select>
            </div>
          </div>

          {/* Price fields */}
          <div className="grid grid-cols-2 gap-4">
            {isLongTerm ? (
              <div>
                <Label className="text-slate-400">Monthly Rent ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.monthly_rent}
                  onChange={(e) => set('monthly_rent', e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="0"
                />
              </div>
            ) : (
              <div>
                <Label className="text-slate-400">Nightly Rate ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.nightly_rate}
                  onChange={(e) => set('nightly_rate', e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="0"
                />
              </div>
            )}
            <div>
              <Label className="text-slate-400">Security Deposit ($)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.security_deposit}
                onChange={(e) => set('security_deposit', e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="0"
              />
            </div>
          </div>

          {/* Bed/Bath/Sqft */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-slate-400">Bedrooms</Label>
              <Input
                type="number"
                min="0"
                value={form.bedrooms}
                onChange={(e) => set('bedrooms', e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-400">Bathrooms</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={form.bathrooms}
                onChange={(e) => set('bathrooms', e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-400">Sq Ft</Label>
              <Input
                type="number"
                min="0"
                value={form.sqft}
                onChange={(e) => set('sqft', e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Available date */}
          <div>
            <Label className="text-slate-400">Available Date</Label>
            <Input
              type="date"
              value={form.available_date}
              onChange={(e) => set('available_date', e.target.value)}
              className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Pet / Parking */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-400">Pet Policy</Label>
              <select
                value={form.pet_policy}
                onChange={(e) => set('pet_policy', e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="none">No Pets</option>
                <option value="cats">Cats Only</option>
                <option value="dogs">Dogs Only</option>
                <option value="all">All Pets</option>
              </select>
            </div>
            <div>
              <Label className="text-slate-400">Parking</Label>
              <select
                value={form.parking}
                onChange={(e) => set('parking', e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="none">None</option>
                <option value="street">Street</option>
                <option value="driveway">Driveway</option>
                <option value="garage">Garage</option>
              </select>
            </div>
          </div>

          {/* Amenities checkboxes — uses pure CSS checkbox (DEC-018) */}
          <div>
            <Label className="text-slate-400 mb-2 block">Amenities</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AMENITY_OPTIONS.map((a) => (
                <label
                  key={a.key}
                  className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-slate-100 min-h-[32px]"
                >
                  <input
                    type="checkbox"
                    checked={form.amenities.includes(a.key)}
                    onChange={() => toggleAmenity(a.key)}
                    className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                  />
                  {a.label}
                </label>
              ))}
            </div>
          </div>

          {/* Utilities included */}
          <div>
            <Label className="text-slate-400 mb-2 block">Utilities Included</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {UTILITY_OPTIONS.map((u) => (
                <label
                  key={u}
                  className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer hover:text-slate-100 min-h-[32px]"
                >
                  <input
                    type="checkbox"
                    checked={form.utilities_included.includes(u)}
                    onChange={() => toggleUtility(u)}
                    className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500"
                  />
                  {u.charAt(0).toUpperCase() + u.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <Label className="text-slate-400 mb-2 block">Photos (max 10)</Label>
            {form.photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {form.photos.map((photo, i) => {
                  const src = resolveUrl(photo);
                  return (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-slate-800">
                      {src ? (
                        <img src={src} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {form.photos.length < 10 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100 hover:bg-transparent"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Photos'}
              </Button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Contact info */}
          <div className="border-t border-slate-800 pt-4">
            <Label className="text-slate-400 mb-2 block text-sm font-medium">Contact Information</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-slate-500 text-xs">Name</Label>
                <Input
                  value={form.contact_name}
                  onChange={(e) => set('contact_name', e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <Label className="text-slate-500 text-xs">Phone</Label>
                <Input
                  value={form.contact_phone}
                  onChange={(e) => set('contact_phone', e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <Label className="text-slate-500 text-xs">Email</Label>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => set('contact_email', e.target.value)}
                  className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 hover:bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
            >
              {isEdit ? 'Save Changes' : 'Create Listing'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
