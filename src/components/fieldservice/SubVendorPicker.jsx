import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ChevronDown, Save, X, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useWorkspacePeople } from '@/hooks/useWorkspacePeople';
import {
  WORKERS_ROLES,
  ROLE_BADGES,
  getRoleConfig,
  newWorkerId,
} from '@/utils/fsWorkersRoles';
import { parseWrappedArray } from '@/utils/wrapShape';
import { invalidateFSProfiles } from '@/utils/fsFeatures';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TRIGGER_CLASS =
  'w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent min-h-[44px] flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
const INPUT_CLASS =
  'w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent min-h-[44px]';

/**
 * SubVendorPicker — typeahead picker for selecting a sub or vendor from
 * workers_json. Phase 2.4 build (cmdk-based).
 *
 * Architecture:
 *   - Reads workers_json via useWorkspacePeople(profile) — single source.
 *   - Filters by role(s) supplied by the calling surface.
 *   - On select: invokes onChange(person) — caller dual-writes
 *     sub_person_id + sub_name (line items) or party_id + party_name
 *     (FSPayment).
 *   - On quick-add: opens QuickAddPersonModal, generates id via
 *     newWorkerId(), appends to workers_json, auto-selects the new
 *     record, fires onChange.
 *
 * Live-read on active estimates: when value (id) is set, looks up the
 * person in workers_json by id and renders their CURRENT name (not the
 * frozen fallbackText). Caller's dual-write keeps fallbackText fresh
 * for lock-time freezing.
 *
 * Stale id handling: if value is set but no matching record exists
 * (record deleted), renders fallbackText with a "(deleted)" hint.
 *
 * Per-surface usage:
 *   - LineItemsEditor (sub line items): role="subcontractor" → label "Sub"
 *   - FSPayment Sub Payment: role={['subcontractor','vendor']} → label
 *     "Sub or Vendor"
 */
export default function SubVendorPicker({
  profile,
  value,
  fallbackText,
  role = 'subcontractor',
  disabled = false,
  onChange,
  placeholder,
}) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { allPeople } = useWorkspacePeople(profile);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddSeed, setQuickAddSeed] = useState({ name: '', role: 'subcontractor' });

  const roleArray = useMemo(
    () => (Array.isArray(role) ? role : [role]),
    [role]
  );
  const defaultQuickAddRole = roleArray[0] || 'subcontractor';
  const isMultiRole = roleArray.length > 1;
  const triggerLabelForEmpty =
    placeholder || (isMultiRole ? 'Pick a sub or vendor…' : 'Pick a sub…');

  // Resolve current selection by id. Live-read of name from workers_json.
  const selectedPerson = useMemo(
    () => (value ? allPeople.find((p) => p.id === value) : null),
    [value, allPeople]
  );
  const isStaleId = !!value && !selectedPerson;

  // Filter for picker: role-match + (sub-only) hide records the calling
  // surface shouldn't pick. Workers don't surface in the sub/vendor picker.
  const filtered = useMemo(
    () => allPeople.filter((p) => roleArray.includes(p.role)),
    [allPeople, roleArray]
  );

  // Trigger label — selected name (live-read), fallback text, or placeholder.
  const triggerLabel =
    selectedPerson?.name || fallbackText || triggerLabelForEmpty;

  // Mutation: append new person to workers_json. Re-parses from the live
  // profile prop so we don't clobber concurrent writes.
  const savePeople = useMutation({
    mutationFn: async (newPerson) => {
      const current = parseWrappedArray(profile?.workers_json);
      const next = [...current, newPerson];
      await base44.entities.FieldServiceProfile.update(profile.id, {
        workers_json: { items: next },
      });
      return newPerson;
    },
    onSuccess: () => {
      invalidateFSProfiles(queryClient, currentUser?.id);
    },
    onError: (err) => toast.error(err?.message || 'Failed to add person'),
  });

  const handlePick = (person) => {
    onChange?.(person);
    setOpen(false);
    setQuery('');
  };

  const openQuickAdd = () => {
    setQuickAddSeed({
      name: query.trim() || fallbackText || '',
      role: defaultQuickAddRole,
    });
    setQuickAddOpen(true);
    setOpen(false);
  };

  const handleQuickAddSave = (newPerson) => {
    savePeople.mutate(newPerson, {
      onSuccess: (saved) => {
        toast.success('Added');
        setQuickAddOpen(false);
        setQuery('');
        onChange?.(saved);
      },
    });
  };

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(o) => { if (!disabled) setOpen(o); }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={TRIGGER_CLASS}
          >
            <span className="flex-1 text-left truncate flex items-center gap-2">
              {selectedPerson && (
                <span
                  className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${ROLE_BADGES[selectedPerson.role]?.className || ''}`}
                >
                  {ROLE_BADGES[selectedPerson.role]?.label || selectedPerson.role}
                </span>
              )}
              <span className={selectedPerson || fallbackText ? '' : 'text-muted-foreground/70'}>
                {triggerLabel}
              </span>
              {isStaleId && (
                <span className="text-muted-foreground/70 italic text-xs">(deleted)</span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0 bg-popover border-border"
          align="start"
        >
          <Command shouldFilter={true}>
            <CommandInput
              placeholder={isMultiRole ? 'Search subs or vendors…' : 'Search subs…'}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty className="py-3 px-2 text-sm text-muted-foreground">
                {query.trim() ? (
                  <button
                    type="button"
                    onClick={openQuickAdd}
                    className="w-full text-left px-2 py-2 rounded hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add &quot;{query.trim()}&quot; as new {defaultQuickAddRole}
                  </button>
                ) : (
                  <span>No matches.</span>
                )}
              </CommandEmpty>
              {filtered.length > 0 && (
                <CommandGroup>
                  {filtered.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={`${p.name} ${p.business_name || ''}`}
                      onSelect={() => handlePick(p)}
                      className="flex items-center gap-2"
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${ROLE_BADGES[p.role]?.className || ''}`}
                      >
                        {ROLE_BADGES[p.role]?.label || p.role}
                      </span>
                      <span className="text-foreground">{p.name}</span>
                      {p.business_name && (
                        <span className="text-muted-foreground/70 text-xs">
                          — {p.business_name}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {/* Quick-add even when matches exist — supports adding a new
                  Tony Plumbing alongside an existing Tony Tile. */}
              {query.trim() && filtered.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      key="__quick_add"
                      value={`__quick_add_${query.trim()}`}
                      onSelect={openQuickAdd}
                      className="flex items-center gap-2 text-primary"
                    >
                      <Plus className="h-4 w-4" />
                      Add &quot;{query.trim()}&quot; as new {defaultQuickAddRole}
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {quickAddOpen && (
        <QuickAddPersonModal
          seed={quickAddSeed}
          allowedRoles={roleArray}
          onSave={handleQuickAddSave}
          onCancel={() => setQuickAddOpen(false)}
          isSaving={savePeople.isPending}
        />
      )}
    </>
  );
}

/**
 * QuickAddPersonModal — slim form for adding a new sub/vendor without
 * leaving the picker flow. Phase 2 §7.7: name + role + business_name only.
 * Phone, email, hourly_rate, notes, assigned_projects stay in the full
 * PersonModal in FieldServicePeople.
 *
 * `allowedRoles` constrains which roles the role select offers — for
 * single-role pickers (e.g., LineItemsEditor sub picker), the form
 * presets and locks the role to the surface's default. For multi-role
 * pickers (e.g., FSPayment), the user picks between sub and vendor.
 */
function QuickAddPersonModal({
  seed,
  allowedRoles = ['subcontractor'],
  onSave,
  onCancel,
  isSaving,
}) {
  const [form, setForm] = useState(() => ({
    name: seed.name || '',
    role: allowedRoles.includes(seed.role) ? seed.role : allowedRoles[0],
    business_name: '',
  }));
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const config = getRoleConfig(form.role);
  const showRoleSelect = allowedRoles.length > 1;

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    onSave({
      id: newWorkerId(),
      name: form.name.trim(),
      role: form.role,
      business_name: config.hasBusinessName ? form.business_name.trim() : '',
      phone: '',
      email: '',
      hourly_rate: 0,
      notes: '',
      assigned_projects: [],
      user_id: null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Add new person</h3>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={INPUT_CLASS}
            placeholder="Full name"
            autoFocus
          />
        </div>

        {/* Role — only when picker accepts multiple roles */}
        {showRoleSelect && (
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Role</label>
            <Select value={form.role} onValueChange={(value) => set('role', value)}>
              <SelectTrigger className="w-full bg-secondary border-border text-foreground min-h-[44px] focus:ring-ring">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORKERS_ROLES.filter((r) => allowedRoles.includes(r.value)).map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Business name — subs + vendors */}
        {config.hasBusinessName && (
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Business name</label>
            <input
              type="text"
              value={form.business_name}
              onChange={(e) => set('business_name', e.target.value)}
              className={INPUT_CLASS}
              placeholder="Business or DBA name"
            />
          </div>
        )}

        <p className="text-xs text-muted-foreground/70 italic">
          Phone, email, and other details can be added later in the People tab.
        </p>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border border-border text-foreground-soft hover:bg-secondary transition-colors text-sm font-medium min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!form.name.trim() || isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-semibold transition-colors text-sm min-h-[44px] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Add Person
          </button>
        </div>
      </div>
    </div>
  );
}
