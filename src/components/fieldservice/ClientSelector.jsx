import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, X, Loader2, User } from 'lucide-react';

const INPUT_CLASS =
  'w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent';
const LABEL_CLASS = 'block text-foreground-soft text-sm font-medium mb-1';

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const EMPTY_FORM = { name: '', email: '', phone: '', address: '' };

export default function ClientSelector({
  clients,
  selectedClientId,
  onSelect,
  onClientCreated,
  profileId,
  currentUser,
  onViewClient,
}) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const sorted = [...(clients || [])].sort((a, b) =>
    (a.name || '').localeCompare(b.name || '')
  );

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const created = await base44.entities.FSClient.create(data);
      return created;
    },
    onSuccess: (newClient) => {
      queryClient.invalidateQueries(['fs-clients', profileId]);
      toast.success('Client created');
      setForm(EMPTY_FORM);
      setShowCreate(false);
      onClientCreated?.(newClient);
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to create client');
    },
  });

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === '__new__') {
      setShowCreate(true);
      return;
    }
    setShowCreate(false);
    onSelect(val);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Client name is required');
      return;
    }
    createMutation.mutate({
      workspace_id: profileId,
      user_id: currentUser?.id,
      name: form.name.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      status: 'active',
    });
  };

  const handleCancel = () => {
    setShowCreate(false);
    setForm(EMPTY_FORM);
  };

  const handleFieldChange = (field, value) => {
    if (field === 'phone') {
      setForm((prev) => ({ ...prev, phone: formatPhone(value) }));
    } else {
      setForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  return (
    <div className="space-y-3">
      {/* Dropdown row */}
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className={LABEL_CLASS}>
            <User className="inline h-4 w-4 text-primary mr-1 -mt-0.5" />
            Client
          </label>
          <select
            value={showCreate ? '__new__' : selectedClientId || ''}
            onChange={handleSelectChange}
            className={INPUT_CLASS}
          >
            <option value="">Select a client...</option>
            <option value="__new__">+ New Client</option>
            {sorted.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {selectedClientId && onViewClient && !showCreate && (
          <button
            type="button"
            onClick={() => onViewClient(selectedClientId)}
            className="text-primary hover:text-primary-hover text-sm font-medium min-h-[44px] px-2 whitespace-nowrap"
          >
            View
          </button>
        )}
      </div>

      {/* Inline create form */}
      {showCreate && (
        <form
          onSubmit={handleSave}
          className="bg-card border border-border rounded-lg p-4 space-y-4"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-foreground text-sm font-semibold flex items-center gap-1.5">
              <Plus className="h-4 w-4 text-primary" />
              New Client
            </span>
            <button
              type="button"
              onClick={handleCancel}
              className="text-muted-foreground hover:text-foreground p-1"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Name */}
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="Client name"
                className={INPUT_CLASS}
                required
                autoFocus
              />
            </div>

            {/* Email */}
            <div>
              <label className={LABEL_CLASS}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="email@example.com"
                className={INPUT_CLASS}
              />
            </div>

            {/* Phone */}
            <div>
              <label className={LABEL_CLASS}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className={INPUT_CLASS}
              />
            </div>

            {/* Address */}
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS}>Address</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => handleFieldChange('address', e.target.value)}
                placeholder="Street address"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-primary hover:bg-primary-hover active:bg-primary/80 text-primary-foreground font-semibold rounded-lg px-4 min-h-[44px] text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Save
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="text-muted-foreground hover:text-foreground hover:bg-transparent text-sm font-medium min-h-[44px] px-3"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
