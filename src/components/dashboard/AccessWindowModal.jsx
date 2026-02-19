import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DAYS = [
  { key: 'monday', label: 'Mon' },
  { key: 'tuesday', label: 'Tue' },
  { key: 'wednesday', label: 'Wed' },
  { key: 'thursday', label: 'Thu' },
  { key: 'friday', label: 'Fri' },
  { key: 'saturday', label: 'Sat' },
  { key: 'sunday', label: 'Sun' },
];

const COIN_OPTIONS = [
  { value: 1, label: '1 coin', hint: 'Off-peak — fills more slots' },
  { value: 2, label: '2 coins', hint: 'Standard pricing' },
  { value: 3, label: '3 coins', hint: 'Peak — earns more per visit' },
];

const DEFAULT_FORM = {
  label: '',
  day_of_week: 'monday',
  start_time: '09:00',
  end_time: '12:00',
  coin_cost: 1,
  capacity: 0,
  is_active: true,
};

export default function AccessWindowModal({ open, onOpenChange, onSave, existingWindow }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [capacityMode, setCapacityMode] = useState('unlimited');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingWindow) {
        setForm({
          label: existingWindow.label || '',
          day_of_week: existingWindow.day_of_week || 'monday',
          start_time: existingWindow.start_time || '09:00',
          end_time: existingWindow.end_time || '12:00',
          coin_cost: existingWindow.coin_cost || 1,
          capacity: existingWindow.capacity || 0,
          is_active: existingWindow.is_active !== false,
        });
        setCapacityMode(existingWindow.capacity > 0 ? 'limited' : 'unlimited');
      } else {
        setForm(DEFAULT_FORM);
        setCapacityMode('unlimited');
      }
    }
  }, [open, existingWindow]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({
        ...form,
        capacity: capacityMode === 'unlimited' ? 0 : (parseInt(form.capacity, 10) || 0),
      });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-100">
            {existingWindow ? 'Edit Access Window' : 'Add Access Window'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Label */}
          <div>
            <Label className="text-slate-300 text-sm">Label (optional)</Label>
            <Input
              value={form.label}
              onChange={(e) => updateField('label', e.target.value)}
              placeholder="e.g. Morning Open Play"
              className="bg-slate-800 border-slate-700 text-white mt-1 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Day of Week */}
          <div>
            <Label className="text-slate-300 text-sm">Day</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {DAYS.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => updateField('day_of_week', day.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.day_of_week === day.key
                      ? 'bg-amber-500 text-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>

          {/* Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300 text-sm">Start Time</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => updateField('start_time', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white mt-1 focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm">End Time</Label>
              <Input
                type="time"
                value={form.end_time}
                onChange={(e) => updateField('end_time', e.target.value)}
                className="bg-slate-800 border-slate-700 text-white mt-1 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Coin Cost */}
          <div>
            <Label className="text-slate-300 text-sm">Joy Coin Cost</Label>
            <div className="space-y-2 mt-2">
              {COIN_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField('coin_cost', option.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center justify-between ${
                    form.coin_cost === option.value
                      ? 'bg-amber-500/10 border border-amber-500 text-amber-500'
                      : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="text-sm text-slate-400">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Capacity */}
          <div>
            <Label className="text-slate-300 text-sm">Capacity</Label>
            <div className="space-y-2 mt-2">
              <button
                type="button"
                onClick={() => setCapacityMode('unlimited')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  capacityMode === 'unlimited'
                    ? 'bg-amber-500/10 border border-amber-500 text-amber-500'
                    : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                Unlimited
              </button>
              <button
                type="button"
                onClick={() => setCapacityMode('limited')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  capacityMode === 'limited'
                    ? 'bg-amber-500/10 border border-amber-500 text-amber-500'
                    : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600'
                }`}
              >
                Limited
              </button>
              {capacityMode === 'limited' && (
                <div className="flex items-center gap-3 pt-1">
                  <Input
                    type="number"
                    min={1}
                    value={form.capacity || ''}
                    onChange={(e) => updateField('capacity', e.target.value)}
                    placeholder="Max people"
                    className="bg-slate-800 border-slate-700 text-white w-32 focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-slate-400 text-sm">people per window</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-transparent border-slate-600 text-slate-300 hover:bg-transparent hover:border-amber-500 hover:text-amber-500"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
            >
              {saving ? 'Saving...' : (existingWindow ? 'Update Window' : 'Save Window')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
