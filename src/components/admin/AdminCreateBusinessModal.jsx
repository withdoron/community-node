import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { UNCLAIMED_EMAIL } from '@/config/pricing';
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
import { mainCategories, getSubcategoryLabel } from '@/components/categories/categoryData';
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
  subcategories: [],
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

  const toggleSubcategory = (subId) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.subcategories) ? prev.subcategories : [];
      const next = current.includes(subId)
        ? current.filter((id) => id !== subId)
        : [...current, subId];

      // Derive primary fields from first selected subcategory
      const firstSubId = next[0];
      let primaryCategory = '';
      let mainCategory = '';
      let subCategory = '';
      let subCategoryId = '';
      if (firstSubId) {
        const main = mainCategories.find((m) => m.subcategories.some((s) => s.id === firstSubId));
        if (main) {
          primaryCategory = main.id;
          mainCategory = main.id;
          const sub = main.subcategories.find((s) => s.id === firstSubId);
          subCategory = sub?.label ?? firstSubId;
          subCategoryId = firstSubId;
        }
      }

      return {
        ...prev,
        subcategories: next,
        primary_category: primaryCategory,
        main_category: mainCategory,
        sub_category: subCategory,
        sub_category_id: subCategoryId,
      };
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const optionalFields = ['description', 'email', 'phone', 'address', 'city', 'state', 'zip_code'];
      const payload = { ...data };
      optionalFields.forEach((key) => {
        if (payload[key] === '' || payload[key] == null) delete payload[key];
      });

      const businessData = {
        ...payload,
        slug: (payload.name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        is_active: true,
        subscription_tier: 'basic',
        sub_category_id: payload.sub_category_id || null,
        subcategories: Array.isArray(payload.subcategories) ? payload.subcategories : [],
        owner_email: payload.email || UNCLAIMED_EMAIL,
      };

      return base44.functions.invoke('updateBusiness', {
        action: 'create',
        data: businessData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success('Business created successfully');
      setFormData(initialFormData);
      onOpenChange(false);
    },
    onError: (error) => {
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

          {/* Categories (Multi-select) */}
          <div>
            <Label className="text-xs text-slate-400 uppercase tracking-wider">
              Categories
              {formData.subcategories?.length > 0 && (
                <span className="ml-2 text-amber-500 normal-case">
                  ({formData.subcategories.length} selected)
                </span>
              )}
            </Label>

            {/* Selected chips */}
            {formData.subcategories?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5 mb-1.5">
                {formData.subcategories.map((subId) => (
                  <span
                    key={subId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-xs border border-amber-500/30 cursor-pointer hover:bg-amber-500/30"
                    onClick={() => toggleSubcategory(subId)}
                  >
                    {getSubcategoryLabel(subId)}
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </span>
                ))}
              </div>
            )}

            {/* Grouped checkboxes */}
            <div className="mt-1 border border-slate-700 rounded-lg bg-slate-800 max-h-52 overflow-y-auto">
              {mainCategories.map((main) => (
                <div key={main.id} className="px-2 py-1.5">
                  <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">{main.label}</p>
                  <div className="space-y-0.5">
                    {main.subcategories.map((sub) => {
                      const isSelected = formData.subcategories?.includes(sub.id);
                      return (
                        <div
                          key={sub.id}
                          className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-slate-700/50 ${isSelected ? 'bg-slate-700/30' : ''}`}
                          onClick={() => toggleSubcategory(sub.id)}
                        >
                          <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-slate-600 bg-transparent'}`}>
                            {isSelected && (
                              <svg className="h-3 w-3 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm text-slate-300">{sub.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
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
