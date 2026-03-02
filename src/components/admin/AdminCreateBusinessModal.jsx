import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { mainCategories } from '@/components/categories/categoryData';
import { useConfig } from '@/hooks/useConfig';
import { US_STATES } from '@/lib/usStates';

function formatPhone(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const initialFormData = {
  name: '',
  primary_category: '',
  main_category: '',
  sub_category: '',
  sub_category_id: '',
  description: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: 'OR',
  zip_code: '',
  network_ids: [],
};

export default function AdminCreateBusinessModal({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState(initialFormData);

  const { data: networksConfig = [] } = useConfig('platform', 'networks');
  const networks = React.useMemo(
    () => Array.isArray(networksConfig) ? networksConfig.filter((n) => n.active !== false) : [],
    [networksConfig]
  );

  const categorySelectValue = React.useMemo(() => {
    const mainId = formData.primary_category;
    const subId = formData.sub_category_id;
    if (mainId && subId) return `${mainId}|${subId}`;
    return '';
  }, [formData.primary_category, formData.sub_category_id]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Client-side create — same pattern as BusinessOnboarding
      const optionalFields = ['description', 'email', 'phone', 'address', 'city', 'state', 'zip_code'];
      const payload = { ...data };
      optionalFields.forEach((key) => {
        if (payload[key] === '' || payload[key] == null) delete payload[key];
      });

      const business = await base44.entities.Business.create({
        ...payload,
        slug: (payload.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        is_active: true,
        subscription_tier: 'basic',
        sub_category_id: payload.sub_category_id || null,
        // CategoryPage filters on subcategories array, not sub_category_id
        subcategories: payload.sub_category_id ? [payload.sub_category_id] : [],
        owner_email: payload.email || 'unclaimed@locallane.app',
        // No owner_user_id — this is an admin-seeded unclaimed listing
      });

      return business;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success('Business created successfully');
      setFormData(initialFormData);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error('Create business error:', error);
      toast.error(error?.message || 'Failed to create business');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Business name is required');
      return;
    }
    const payload = { ...formData };
    // Clean empty optional fields
    Object.keys(payload).forEach((key) => {
      const val = payload[key];
      if (val === '' || val == null) delete payload[key];
      if (Array.isArray(val) && val.length === 0) delete payload[key];
    });
    createMutation.mutate(payload);
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (val) => {
    if (!val) {
      updateField('primary_category', '');
      updateField('main_category', '');
      updateField('sub_category', '');
      updateField('sub_category_id', '');
      return;
    }
    const [mainId, subId] = val.split('|');
    const main = mainCategories.find((m) => m.id === mainId);
    const sub = main?.subcategories.find((s) => s.id === subId);
    setFormData((prev) => ({
      ...prev,
      primary_category: mainId,
      main_category: mainId,
      sub_category: sub?.label ?? subId,
      sub_category_id: subId || '',
    }));
  };

  const toggleNetwork = (networkId, checked) => {
    const current = Array.isArray(formData.network_ids) ? formData.network_ids : [];
    const next = checked
      ? [...current, networkId]
      : current.filter((id) => id !== networkId);
    updateField('network_ids', next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Create Business Listing</DialogTitle>
          <DialogDescription className="text-slate-400">
            Seed a new business in the directory. The owner can claim it later.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Business Name */}
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">
              Business Name <span className="text-amber-500">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100 mt-1 focus:border-amber-500 focus:ring-amber-500/20"
              placeholder="Business name"
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Category</Label>
            <Select value={categorySelectValue} onValueChange={handleCategoryChange}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 mt-1 focus:border-amber-500 focus:ring-amber-500/20">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800">
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

          {/* Description */}
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="bg-slate-800 border-slate-700 text-slate-100 mt-1 focus:border-amber-500 focus:ring-amber-500/20 resize-none"
              placeholder="Brief description of the business"
            />
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider">Contact Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 mt-1 focus:border-amber-500 focus:ring-amber-500/20"
                placeholder="owner@example.com"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider">Phone</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => updateField('phone', formatPhone(e.target.value))}
                className="bg-slate-800 border-slate-700 text-slate-100 mt-1 focus:border-amber-500 focus:ring-amber-500/20"
                placeholder="(541) 555-1234"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">Street Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => updateField('address', e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100 mt-1 focus:border-amber-500 focus:ring-amber-500/20"
              placeholder="123 Main Street"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider">City</Label>
              <Input
                value={formData.city}
                onChange={(e) => updateField('city', e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 mt-1 focus:border-amber-500 focus:ring-amber-500/20"
                placeholder="Eugene"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider">State</Label>
              <Select value={formData.state} onValueChange={(val) => updateField('state', val)}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100 mt-1 focus:border-amber-500 focus:ring-amber-500/20">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  {US_STATES.map((s) => (
                    <SelectItem key={s.code} value={s.code} className="text-slate-300 focus:bg-slate-800">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider">Zip</Label>
              <Input
                value={formData.zip_code}
                onChange={(e) => updateField('zip_code', e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 mt-1 focus:border-amber-500 focus:ring-amber-500/20"
                placeholder="97401"
                maxLength={10}
              />
            </div>
          </div>

          {/* Networks */}
          {networks.length > 0 && (
            <div>
              <Label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Networks</Label>
              <div className="space-y-2">
                {networks.map((network) => {
                  const networkId = network.value ?? network.slug ?? network.id;
                  const displayName = network.label ?? network.name ?? networkId;
                  const currentIds = Array.isArray(formData.network_ids) ? formData.network_ids : [];
                  const isChecked = currentIds.includes(networkId);
                  return (
                    <div key={networkId} className="flex items-center justify-between p-2 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-amber-500" />
                        <span className="text-sm text-slate-200">{displayName}</span>
                      </div>
                      <Switch
                        checked={isChecked}
                        onCheckedChange={(checked) => toggleNetwork(networkId, checked)}
                        className="data-[state=checked]:bg-amber-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData(initialFormData);
                onOpenChange(false);
              }}
              className="bg-transparent border-slate-600 text-slate-300 hover:bg-transparent hover:border-slate-500"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !formData.name.trim()}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Business'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
