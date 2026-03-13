import React, { useState, useEffect, useMemo } from 'react';
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

const INITIAL = {
  guest_name: '',
  guest_email: '',
  guest_phone: '',
  property_id: '',
  group_id: '',
  check_in: '',
  check_out: '',
  nightly_rate: '',
  num_guests: '1',
  booking_source: 'direct',
  status: 'confirmed',
  notes: '',
};

export default function GuestFormDialog({
  open,
  onClose,
  guest,
  properties,
  groups,
  onSave,
}) {
  const [form, setForm] = useState(INITIAL);
  const isEdit = !!guest;

  useEffect(() => {
    if (!open) return;
    if (guest) {
      setForm({
        guest_name: guest.guest_name || '',
        guest_email: guest.guest_email || '',
        guest_phone: guest.guest_phone || '',
        property_id: guest.property_id || '',
        group_id: guest.group_id || '',
        check_in: guest.check_in || '',
        check_out: guest.check_out || '',
        nightly_rate: guest.nightly_rate?.toString() || '',
        num_guests: guest.num_guests?.toString() || '1',
        booking_source: guest.booking_source || 'direct',
        status: guest.status || 'confirmed',
        notes: guest.notes || '',
      });
    } else {
      setForm(INITIAL);
    }
  }, [open, guest]);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  // Auto-calculate total
  const calculatedTotal = useMemo(() => {
    if (!form.check_in || !form.check_out || !form.nightly_rate) return 0;
    const ci = new Date(form.check_in + 'T12:00:00');
    const co = new Date(form.check_out + 'T12:00:00');
    const nights = Math.max(0, Math.ceil((co - ci) / (1000 * 60 * 60 * 24)));
    return nights * (parseFloat(form.nightly_rate) || 0);
  }, [form.check_in, form.check_out, form.nightly_rate]);

  const nights = useMemo(() => {
    if (!form.check_in || !form.check_out) return 0;
    const ci = new Date(form.check_in + 'T12:00:00');
    const co = new Date(form.check_out + 'T12:00:00');
    return Math.max(0, Math.ceil((co - ci) / (1000 * 60 * 60 * 24)));
  }, [form.check_in, form.check_out]);

  const handlePropertyChange = (propId) => {
    set('property_id', propId);
    if (!propId) {
      set('group_id', '');
      return;
    }
    const prop = (properties || []).find((p) => p.id === propId);
    if (prop) set('group_id', prop.group_id || '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      guest_name: form.guest_name.trim(),
      guest_email: form.guest_email.trim(),
      guest_phone: form.guest_phone.trim(),
      property_id: form.property_id || null,
      group_id: form.group_id || null,
      check_in: form.check_in || null,
      check_out: form.check_out || null,
      nightly_rate: parseFloat(form.nightly_rate) || 0,
      total_amount: calculatedTotal,
      num_guests: parseInt(form.num_guests) || 1,
      booking_source: form.booking_source,
      status: form.status,
      notes: form.notes.trim(),
    });
  };

  // Build property options grouped by group
  const groupsById = {};
  (groups || []).forEach((g) => { groupsById[g.id] = g; });

  const fmt = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-slate-900 border border-slate-800 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            {isEdit ? 'Edit Guest' : 'Add Guest'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Guest name */}
          <div>
            <Label className="text-slate-400">Guest Name *</Label>
            <Input
              value={form.guest_name}
              onChange={(e) => set('guest_name', e.target.value)}
              required
              className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="Full name"
            />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400">Email</Label>
              <Input
                type="email"
                value={form.guest_email}
                onChange={(e) => set('guest_email', e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-400">Phone</Label>
              <Input
                value={form.guest_phone}
                onChange={(e) => set('guest_phone', e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Property */}
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

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-400">Check In</Label>
              <Input
                type="date"
                value={form.check_in}
                onChange={(e) => set('check_in', e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-400">Check Out</Label>
              <Input
                type="date"
                value={form.check_out}
                onChange={(e) => set('check_out', e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Rate + Guests + Source */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-slate-400">Nightly Rate ($)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.nightly_rate}
                onChange={(e) => set('nightly_rate', e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-400"># Guests</Label>
              <Input
                type="number"
                min="1"
                value={form.num_guests}
                onChange={(e) => set('num_guests', e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-400">Source</Label>
              <select
                value={form.booking_source}
                onChange={(e) => set('booking_source', e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="direct">Direct</option>
                <option value="airbnb">Airbnb</option>
                <option value="vrbo">VRBO</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Auto total */}
          {nights > 0 && form.nightly_rate && (
            <div className="bg-slate-800/50 rounded-lg p-3 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>{nights} night{nights !== 1 ? 's' : ''} × {fmt(parseFloat(form.nightly_rate) || 0)}</span>
                <span className="text-amber-500 font-bold">{fmt(calculatedTotal)}</span>
              </div>
            </div>
          )}

          {/* Status */}
          {isEdit && (
            <div>
              <Label className="text-slate-400">Status</Label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full mt-1 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="checked_out">Checked Out</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-slate-400">Notes</Label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              className="w-full mt-1 bg-slate-800 border border-slate-700 text-white rounded-md px-3 py-2 text-sm placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
              placeholder="Additional notes..."
            />
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
              {isEdit ? 'Save Changes' : 'Add Guest'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
