import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const inputClass =
  'w-full rounded-md bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring px-3 py-2 text-sm';
const labelClass = 'text-foreground-soft text-sm font-medium block mb-1';

const WORKER_TYPES = [
  { value: 'handyman', label: 'Handyman' },
  { value: 'manager', label: 'Manager' },
  { value: 'owner', label: 'Owner' },
  { value: 'cleaner', label: 'Cleaner' },
  { value: 'landscaper', label: 'Landscaper' },
  { value: 'other', label: 'Other' },
];

export default function FinanceLaborForm({
  open,
  onClose,
  entry,
  properties,
  groups,
  maintenanceRequests,
  previousEntries,
  onSave,
}) {
  const [form, setForm] = useState({
    worker_name: '',
    worker_type: 'handyman',
    hourly_rate: '',
    hours: '',
    total: '',
    date: new Date().toISOString().slice(0, 10),
    property_id: '',
    maintenance_id: '',
    description: '',
  });
  const [totalOverride, setTotalOverride] = useState(false);

  // Autocomplete: unique worker names from previous entries
  const workerNames = useMemo(() => {
    const set = new Set();
    (previousEntries || []).forEach((e) => e.worker_name && set.add(e.worker_name));
    return Array.from(set).sort();
  }, [previousEntries]);

  // Auto-fill rate from worker's last entry
  const autoFillRate = (name) => {
    if (!name) return;
    const prev = (previousEntries || [])
      .filter((e) => e.worker_name === name)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (prev.length > 0 && prev[0].hourly_rate) {
      setForm((f) => ({ ...f, hourly_rate: prev[0].hourly_rate }));
    }
  };

  const groupsById = useMemo(() => {
    const m = {};
    (groups || []).forEach((g) => { m[g.id] = g; });
    return m;
  }, [groups]);

  const propertiesWithLabels = useMemo(() => {
    return (properties || []).map((p) => ({
      ...p,
      label: `${groupsById[p.group_id]?.name || '—'} — ${p.name}`,
    }));
  }, [properties, groupsById]);

  // Filter maintenance requests by selected property
  const filteredMaintenance = useMemo(() => {
    if (!form.property_id) return [];
    return (maintenanceRequests || []).filter(
      (r) => r.property_id === form.property_id && r.status !== 'completed'
    );
  }, [maintenanceRequests, form.property_id]);

  useEffect(() => {
    if (open) {
      if (entry) {
        setForm({
          worker_name: entry.worker_name || '',
          worker_type: entry.worker_type || 'handyman',
          hourly_rate: entry.hourly_rate ?? '',
          hours: entry.hours ?? '',
          total: entry.total ?? '',
          date: entry.date || new Date().toISOString().slice(0, 10),
          property_id: entry.property_id || '',
          maintenance_id: entry.maintenance_id || '',
          description: entry.description || '',
        });
        setTotalOverride(false);
      } else {
        setForm({
          worker_name: '',
          worker_type: 'handyman',
          hourly_rate: '',
          hours: '',
          total: '',
          date: new Date().toISOString().slice(0, 10),
          property_id: '',
          maintenance_id: '',
          description: '',
        });
        setTotalOverride(false);
      }
    }
  }, [entry, open]);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  // Auto-calculate total
  const calculatedTotal =
    (Number(form.hourly_rate) || 0) * (Number(form.hours) || 0);
  const displayTotal = totalOverride ? form.total : calculatedTotal;

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalTotal = totalOverride ? Number(form.total) || 0 : calculatedTotal;
    onSave({
      worker_name: form.worker_name,
      worker_type: form.worker_type,
      hourly_rate: Number(form.hourly_rate) || 0,
      hours: Number(form.hours) || 0,
      total: Math.round(finalTotal * 100) / 100,
      date: form.date,
      property_id: form.property_id || null,
      maintenance_id: form.maintenance_id || null,
      description: form.description || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border border-border text-foreground max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {entry ? 'Edit Labor Entry' : 'Log Labor'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Worker name with datalist autocomplete */}
          <div>
            <label className={labelClass}>Worker Name *</label>
            <input
              type="text"
              list="worker-names-list"
              className={inputClass}
              value={form.worker_name}
              onChange={(e) => {
                set('worker_name', e.target.value);
                autoFillRate(e.target.value);
              }}
              required
              placeholder="e.g. John Smith"
            />
            <datalist id="worker-names-list">
              {workerNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          {/* Worker type */}
          <div>
            <label className={labelClass}>Worker Type *</label>
            <select
              className={inputClass}
              value={form.worker_type}
              onChange={(e) => set('worker_type', e.target.value)}
              required
            >
              {WORKER_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Rate + Hours + Total */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Rate ($/hr) *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className={inputClass}
                value={form.hourly_rate}
                onChange={(e) => set('hourly_rate', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Hours *</label>
              <input
                type="number"
                min={0}
                step={0.25}
                className={inputClass}
                value={form.hours}
                onChange={(e) => set('hours', e.target.value)}
                required
              />
            </div>
            <div>
              <label className={labelClass}>
                Total{' '}
                <button
                  type="button"
                  onClick={() => setTotalOverride(!totalOverride)}
                  className="text-[10px] text-primary hover:text-primary-hover ml-1"
                >
                  {totalOverride ? '(auto)' : '(override)'}
                </button>
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                className={inputClass + (totalOverride ? '' : ' opacity-60')}
                value={totalOverride ? form.total : calculatedTotal.toFixed(2)}
                onChange={(e) => totalOverride && set('total', e.target.value)}
                readOnly={!totalOverride}
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <label className={labelClass}>Date *</label>
            <input
              type="date"
              className={inputClass}
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              required
            />
          </div>

          {/* Property */}
          <div>
            <label className={labelClass}>Property</label>
            <select
              className={inputClass}
              value={form.property_id}
              onChange={(e) => {
                set('property_id', e.target.value);
                set('maintenance_id', '');
              }}
            >
              <option value="">Select property</option>
              {propertiesWithLabels.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Maintenance request (optional, filtered by property) */}
          {form.property_id && filteredMaintenance.length > 0 && (
            <div>
              <label className={labelClass}>Maintenance Request (optional)</label>
              <select
                className={inputClass}
                value={form.maintenance_id}
                onChange={(e) => set('maintenance_id', e.target.value)}
              >
                <option value="">None</option>
                {filteredMaintenance.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title || r.description || `Request #${r.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              className={inputClass + ' min-h-[80px]'}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="What work was done?"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold"
            >
              {entry ? 'Update' : 'Log'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
