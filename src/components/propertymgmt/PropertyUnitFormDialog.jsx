import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const inputClass =
  'w-full rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2 text-sm';
const labelClass = 'text-slate-300 text-sm font-medium block mb-1';

const PROPERTY_TYPE_OPTIONS = [
  { value: 'single_family', label: 'Single Family' },
  { value: 'duplex_unit', label: 'Duplex Unit' },
  { value: 'triplex_unit', label: 'Triplex Unit' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'short_term', label: 'Short-Term Rental' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'occupied', label: 'Occupied' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'listed', label: 'Listed' },
];

const AMENITY_OPTIONS = [
  { value: 'pet_friendly', label: 'Pet Friendly' },
  { value: 'parking', label: 'Parking' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'furnished', label: 'Furnished' },
  { value: 'pool', label: 'Pool' },
  { value: 'gym', label: 'Gym' },
  { value: 'ac', label: 'A/C' },
  { value: 'dishwasher', label: 'Dishwasher' },
];

export default function PropertyUnitFormDialog({
  open,
  onClose,
  unit,
  groupId,
  groupAddress,
  onSave,
}) {
  const [form, setForm] = useState({
    name: '',
    unit_label: '',
    property_type: 'single_family',
    address: '',
    monthly_rent: '',
    nightly_rate: '',
    has_garage: false,
    status: 'occupied',
    tenant_name: '',
    tenant_email: '',
    tenant_phone: '',
    lease_start: '',
    lease_end: '',
    bedrooms: '',
    bathrooms: '',
    amenities: [],
    notes: '',
  });

  useEffect(() => {
    if (open) {
      if (unit) {
        const amenities = Array.isArray(unit.amenities) ? unit.amenities : [];
        setForm({
          name: unit.name ?? '',
          unit_label: unit.unit_label ?? '',
          property_type: unit.property_type ?? 'single_family',
          address: unit.address ?? groupAddress ?? '',
          monthly_rent: unit.monthly_rent ?? '',
          nightly_rate: unit.nightly_rate ?? '',
          has_garage: unit.has_garage ?? false,
          status: unit.status ?? 'occupied',
          tenant_name: unit.tenant_name ?? '',
          tenant_email: unit.tenant_email ?? '',
          tenant_phone: unit.tenant_phone ?? '',
          lease_start: unit.lease_start ?? '',
          lease_end: unit.lease_end ?? '',
          bedrooms: unit.bedrooms ?? '',
          bathrooms: unit.bathrooms ?? '',
          amenities,
          notes: unit.notes ?? '',
        });
      } else {
        setForm({
          name: '',
          unit_label: '',
          property_type: 'duplex_unit',
          address: groupAddress ?? '',
          monthly_rent: '',
          nightly_rate: '',
          has_garage: false,
          status: 'occupied',
          tenant_name: '',
          tenant_email: '',
          tenant_phone: '',
          lease_start: '',
          lease_end: '',
          bedrooms: '',
          bathrooms: '',
          amenities: [],
          notes: '',
        });
      }
    }
  }, [unit, groupId, groupAddress, open]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const isShortTerm = form.property_type === 'short_term';

  const toggleAmenity = (val) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(val)
        ? f.amenities.filter((a) => a !== val)
        : [...f.amenities, val],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      unit_label: form.unit_label || null,
      property_type: form.property_type,
      address: form.address,
      monthly_rent: isShortTerm ? 0 : (Number(form.monthly_rent) || 0),
      nightly_rate: isShortTerm ? (Number(form.nightly_rate) || 0) : 0,
      has_garage: form.has_garage,
      status: form.status,
      tenant_name: form.tenant_name || null,
      tenant_email: form.tenant_email || null,
      tenant_phone: form.tenant_phone || null,
      lease_start: form.lease_start || null,
      lease_end: form.lease_end || null,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
      bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
      amenities: isShortTerm ? form.amenities : [],
      notes: form.notes || null,
    };
    if (!unit && groupId) payload.group_id = groupId;
    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">{unit ? 'Edit Unit' : 'Add Unit'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Name *</label>
              <input type="text" className={inputClass} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Unit A" required />
            </div>
            <div>
              <label className={labelClass}>Unit label</label>
              <input type="text" className={inputClass} value={form.unit_label} onChange={(e) => set('unit_label', e.target.value)} placeholder="e.g. A" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Property type *</label>
            <select className={inputClass} value={form.property_type} onChange={(e) => set('property_type', e.target.value)} required>
              {PROPERTY_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Address *</label>
            <input type="text" className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} required />
          </div>
          {isShortTerm ? (
            <div>
              <label className={labelClass}>Nightly rate *</label>
              <input type="number" min={0} step={1} className={inputClass} value={form.nightly_rate} onChange={(e) => set('nightly_rate', e.target.value)} required />
            </div>
          ) : (
            <div>
              <label className={labelClass}>Monthly rent *</label>
              <input type="number" min={0} step={1} className={inputClass} value={form.monthly_rent} onChange={(e) => set('monthly_rent', e.target.value)} required />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bedrooms</label>
              <input type="number" min={0} className={inputClass} value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Bathrooms</label>
              <input type="number" min={0} step={0.5} className={inputClass} value={form.bathrooms} onChange={(e) => set('bathrooms', e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="has_garage_unit" checked={form.has_garage} onChange={(e) => set('has_garage', e.target.checked)} className="rounded border-slate-600 bg-slate-800 text-amber-500 focus:ring-amber-500" />
            <label htmlFor="has_garage_unit" className="text-slate-300 text-sm">Has garage</label>
          </div>
          <div>
            <label className={labelClass}>Status *</label>
            <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)} required>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          {isShortTerm && (
            <div>
              <label className={labelClass}>Amenities</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {AMENITY_OPTIONS.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => toggleAmenity(a.value)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors min-h-[28px] ${form.amenities.includes(a.value) ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!isShortTerm && (
            <div className="border-t border-slate-800 pt-3">
              <p className="text-slate-400 text-sm font-medium mb-2">Tenant</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Tenant name</label>
                  <input type="text" className={inputClass} value={form.tenant_name} onChange={(e) => set('tenant_name', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Tenant email</label>
                  <input type="email" className={inputClass} value={form.tenant_email} onChange={(e) => set('tenant_email', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Tenant phone</label>
                  <input type="text" className={inputClass} value={form.tenant_phone} onChange={(e) => set('tenant_phone', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className={labelClass}>Lease start</label>
                  <input type="date" className={inputClass} value={form.lease_start} onChange={(e) => set('lease_start', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Lease end</label>
                  <input type="date" className={inputClass} value={form.lease_end} onChange={(e) => set('lease_end', e.target.value)} />
                </div>
              </div>
            </div>
          )}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea className={inputClass + ' min-h-[80px]'} value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={onClose} className="text-slate-400 hover:text-slate-200 hover:bg-transparent">Cancel</Button>
            <Button type="submit" className="bg-amber-500 hover:bg-amber-400 text-black font-bold">{unit ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
