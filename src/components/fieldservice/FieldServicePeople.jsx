import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users, Plus, Pencil, Trash2, Save, X, Loader2,
  ChevronDown, ChevronRight, HardHat, Briefcase, User,
  Phone, Mail, Shield, FolderOpen, Link2, Share2,
} from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

function formatPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function parseWorkers(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object' && Array.isArray(val.items)) return val.items;
  if (typeof val === 'string') {
    try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; }
    catch { return []; }
  }
  return [];
}

const INPUT_CLASS =
  'w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent min-h-[44px]';

const ROLE_BADGES = {
  worker: { label: 'Worker', className: 'bg-primary/20 text-primary-hover' },
  subcontractor: { label: 'Sub', className: 'bg-sky-500/20 text-sky-400' },
};

const EMPTY_PERSON = {
  name: '',
  role: 'worker',
  phone: '',
  email: '',
  company_name: '',
  hourly_rate: '',
  notes: '',
  assigned_projects: [],
};

// ═══════════════════════════════════════════════════
// Collapsible Section
// ═══════════════════════════════════════════════════
function Section({ icon: Icon, title, count, defaultOpen = false, onAdd, addLabel, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex-1 flex items-center gap-3 p-4 text-left hover:bg-secondary/50 transition-colors min-h-[44px]"
        >
          <Icon className="h-5 w-5 text-primary flex-shrink-0" />
          <span className="text-base font-bold text-foreground flex-1">{title}</span>
          {count != null && (
            <span className="text-xs text-muted-foreground mr-2">{count}</span>
          )}
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {onAdd && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className="flex items-center gap-1.5 px-3 py-2 mr-2 rounded-lg text-xs text-primary hover:text-primary-hover hover:bg-primary/10 transition-colors min-h-[44px]"
          >
            <Plus className="h-3.5 w-3.5" /> {addLabel || 'Add'}
          </button>
        )}
      </div>
      {open && <div className="px-4 pb-4 pt-0">{children}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Person Card
// ═══════════════════════════════════════════════════
function copyInviteLink(inviteCode) {
  if (!inviteCode) {
    toast.error('No invite code found. Save the workspace in Settings to generate one.');
    return;
  }
  const url = `${window.location.origin}/join-field-service/${inviteCode}`;
  navigator.clipboard.writeText(url).then(
    () => toast.success('Invite link copied! Share with your team.'),
    () => toast.error('Could not copy link'),
  );
}

function PersonCard({ person, projectMap, onEdit, onRemove, onShareInvite }) {
  const badge = ROLE_BADGES[person.role] || ROLE_BADGES.worker;
  const assignedCount = (person.assigned_projects || []).filter(
    (pid) => projectMap[pid]
  ).length;

  return (
    <div className="bg-secondary/50 rounded-lg p-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
            {person.user_id ? (
              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">Connected</span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-surface text-muted-foreground">Pending</span>
            )}
          </div>
          {person.company_name && (
            <p className="text-xs text-muted-foreground mt-0.5">{person.company_name}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
            {person.phone && (
              <a href={`tel:${person.phone.replace(/\D/g, '')}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Phone className="h-3 w-3" /> {formatPhone(person.phone)}
              </a>
            )}
            {person.email && (
              <a href={`mailto:${person.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                <Mail className="h-3 w-3" /> {person.email}
              </a>
            )}
            {person.role === 'worker' && person.hourly_rate > 0 && (
              <span className="text-xs text-muted-foreground/70">{fmt(person.hourly_rate)}/hr</span>
            )}
          </div>
          {assignedCount > 0 && (
            <p className="text-xs text-muted-foreground/70 mt-1">
              <FolderOpen className="h-3 w-3 inline mr-1" />{assignedCount} project{assignedCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {onShareInvite && (
            <button
              type="button"
              onClick={() => onShareInvite()}
              className="p-2 text-muted-foreground/70 hover:text-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Copy invite link"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(person)}
            className="p-2 text-muted-foreground/70 hover:text-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(person)}
            className="p-2 text-muted-foreground/70 hover:text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Client Card (read-only)
// ═══════════════════════════════════════════════════
function ClientCard({ client, projectCount, onView }) {
  return (
    <button
      type="button"
      onClick={() => onView?.(client.id)}
      className="w-full bg-secondary/50 rounded-lg p-3 text-left hover:border-primary/50 hover:bg-secondary transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-primary truncate">{client.name}</p>
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
              Client
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
            {client.phone && (
              <a
                href={`tel:${client.phone.replace(/\D/g, '')}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="h-3 w-3" /> {formatPhone(client.phone)}
              </a>
            )}
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-3 w-3" /> {client.email}
              </a>
            )}
          </div>
          {projectCount > 0 && (
            <p className="text-xs text-muted-foreground/70 mt-1">
              <FolderOpen className="h-3 w-3 inline mr-1" />{projectCount} project{projectCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/70 flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════
// Add/Edit Person Modal (full-screen on mobile)
// ═══════════════════════════════════════════════════
function PersonModal({ person, activeProjects, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_PERSON,
    ...(person || {}),
    hourly_rate: person?.hourly_rate?.toString() || '',
    assigned_projects: person?.assigned_projects || [],
  }));
  const isEdit = person != null && typeof person._editIndex === 'number' && person._editIndex >= 0;
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const toggleProject = (pid) => {
    setForm((prev) => {
      const current = prev.assigned_projects || [];
      return {
        ...prev,
        assigned_projects: current.includes(pid)
          ? current.filter((id) => id !== pid)
          : [...current, pid],
      };
    });
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    onSave({
      ...form,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      company_name: form.company_name?.trim() || '',
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      notes: form.notes?.trim() || '',
      user_id: person?.user_id || null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">
          {isEdit ? 'Edit Person' : 'Add Person'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className={INPUT_CLASS}
            placeholder="Full name"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Role</label>
          <select
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            className={INPUT_CLASS}
          >
            <option value="worker">Worker</option>
            <option value="subcontractor">Subcontractor</option>
          </select>
        </div>

        {/* Company (subs only) */}
        {form.role === 'subcontractor' && (
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Company name</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => set('company_name', e.target.value)}
              className={INPUT_CLASS}
              placeholder="Business or company name"
            />
          </div>
        )}

        {/* Phone */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', formatPhone(e.target.value))}
            className={INPUT_CLASS}
            placeholder="(541) 555-1234"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            className={INPUT_CLASS}
            placeholder="name@example.com"
          />
        </div>

        {/* Hourly Rate (workers only) */}
        {form.role === 'worker' && (
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Hourly rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.hourly_rate}
                onChange={(e) => set('hourly_rate', e.target.value)}
                onFocus={(e) => { if (parseFloat(e.target.value) === 0) set('hourly_rate', ''); }}
                onBlur={(e) => { if (e.target.value === '') set('hourly_rate', '0'); }}
                className={`${INPUT_CLASS} pl-7`}
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm text-muted-foreground mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            className={`${INPUT_CLASS} min-h-[60px] resize-y`}
            rows={2}
            placeholder="Specialties, certifications, etc."
          />
        </div>

        {/* Project Assignment */}
        {activeProjects.length > 0 && (
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Assigned projects</label>
            <div className="space-y-2">
              {activeProjects.map((p) => {
                const isAssigned = (form.assigned_projects || []).includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProject(p.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors min-h-[44px] ${
                      isAssigned
                        ? 'bg-primary/10 border border-primary/30 text-primary-hover'
                        : 'bg-secondary/50 border border-border text-foreground-soft hover:border-border'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 ${
                      isAssigned ? 'bg-primary border-primary' : 'border-border'
                    }`}>
                      {isAssigned && <span className="text-primary-foreground text-xs font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      {p.client_name && (
                        <p className="text-xs text-muted-foreground/70">{p.client_name}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-3">
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
            {isEdit ? 'Save Changes' : 'Add Person'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Delete Confirmation
// ═══════════════════════════════════════════════════
function DeleteConfirm({ personName, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full space-y-4">
        <h3 className="text-lg font-bold text-foreground">Remove {personName}?</h3>
        <p className="text-sm text-muted-foreground">
          This will remove them from your team roster. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border border-border text-foreground-soft hover:bg-secondary transition-colors text-sm min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-foreground font-semibold transition-colors text-sm min-h-[44px]"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════
export default function FieldServicePeople({ profile, currentUser, onNavigateTab, features }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [clientDetailId, setClientDetailId] = useState(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', company_name: '', address: '', city: '', state: '', zip_code: '' });

  // ─── Parse workers from profile ──────────────────
  const people = useMemo(() => parseWorkers(profile?.workers_json), [profile?.workers_json]);
  const workers = useMemo(() => people.filter((p) => p.role === 'worker' || !p.role), [people]);
  const subs = useMemo(() => people.filter((p) => p.role === 'subcontractor'), [people]);

  // ─── Query: Projects ─────────────────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ['fs-projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSProject.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active' || p.status === 'paused'),
    [projects]
  );

  const projectMap = useMemo(() => {
    const map = {};
    projects.forEach((p) => { map[p.id] = p; });
    return map;
  }, [projects]);

  // ─── Query: Clients ──────────────────────────────
  const { data: clients = [] } = useQuery({
    queryKey: ['fs-clients', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSClient.filter({ workspace_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  const activeClients = useMemo(
    () => clients.filter((c) => c.status === 'active'),
    [clients]
  );

  // Client project counts
  const clientProjectCounts = useMemo(() => {
    const map = {};
    projects.forEach((p) => {
      if (p.client_id) map[p.client_id] = (map[p.client_id] || 0) + 1;
    });
    return map;
  }, [projects]);

  // ─── Save Mutation ───────────────────────────────
  const savePeople = useMutation({
    mutationFn: (updatedPeople) =>
      base44.entities.FieldServiceProfile.update(profile.id, {
        workers_json: { items: updatedPeople },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-profiles'] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to save'),
  });

  const handleSavePerson = (personData) => {
    const updated = [...people];
    if (editingPerson?._editIndex != null && editingPerson._editIndex >= 0) {
      // Edit existing
      updated[editingPerson._editIndex] = {
        ...updated[editingPerson._editIndex],
        ...personData,
      };
    } else {
      // Add new
      updated.push(personData);
    }
    savePeople.mutate(updated, {
      onSuccess: () => {
        toast.success(editingPerson?._editIndex >= 0 ? 'Person updated' : 'Person added');
        setShowModal(false);
        setEditingPerson(null);
      },
    });
  };

  const handleRemovePerson = () => {
    if (deleteTarget == null) return;
    const idx = people.indexOf(deleteTarget);
    if (idx < 0) return;
    const updated = people.filter((_, i) => i !== idx);
    savePeople.mutate(updated, {
      onSuccess: () => {
        toast.success(`${deleteTarget.name} removed`);
        setDeleteTarget(null);
      },
    });
  };

  const openAdd = (role = 'worker') => {
    setEditingPerson({ ...EMPTY_PERSON, role });
    setShowModal(true);
  };

  const handleAddClient = async () => {
    if (!newClient.name.trim() || !newClient.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    try {
      await base44.entities.FSClient.create({
        workspace_id: profile.id,
        user_id: currentUser?.id,
        name: newClient.name.trim(),
        email: newClient.email.trim(),
        phone: newClient.phone.trim() || null,
        company_name: newClient.company_name.trim() || null,
        address: newClient.address.trim() || null,
        city: newClient.city.trim() || null,
        state: newClient.state.trim() || null,
        zip_code: newClient.zip_code.trim() || null,
        status: 'active',
      });
      queryClient.invalidateQueries(['fs-clients', profile?.id]);
      setNewClient({ name: '', email: '', phone: '', company_name: '', address: '', city: '', state: '', zip_code: '' });
      setShowAddClient(false);
      toast.success('Client added');
    } catch (err) {
      toast.error(`Failed to add client: ${err.message}`);
    }
  };

  const openEdit = (person) => {
    const idx = people.indexOf(person);
    setEditingPerson({ ...person, _editIndex: idx });
    setShowModal(true);
  };

  // ─── Client Detail View ──────────────────────────
  if (clientDetailId) {
    // Lazy-load FieldServiceClientDetail to avoid circular deps
    const FieldServiceClientDetail = React.lazy(() =>
      import('./FieldServiceClientDetail')
    );
    return (
      <React.Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      }>
        <FieldServiceClientDetail
          clientId={clientDetailId}
          profile={profile}
          currentUser={currentUser}
          onBack={() => setClientDetailId(null)}
          onViewProject={() => { if (onNavigateTab) onNavigateTab('projects'); else toast.info('Navigate to Projects tab to view details'); }}
          onViewEstimate={() => { if (onNavigateTab) onNavigateTab('estimates'); else toast.info('Navigate to Estimates tab to view details'); }}
        />
      </React.Suspense>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">People</h2>
        <button
          type="button"
          onClick={() => copyInviteLink(profile?.invite_code)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-foreground-soft hover:text-primary hover:border-primary hover:bg-transparent transition-colors text-sm min-h-[44px]"
        >
          <Link2 className="h-4 w-4" /> Invite Link
        </button>
      </div>

      {/* Workers Section */}
      <Section icon={HardHat} title="Workers" count={workers.length} onAdd={() => openAdd('worker')} addLabel="Add Worker">
        {workers.length === 0 ? (
          <p className="text-sm text-muted-foreground/70 py-2">
            No workers yet. Add your crew to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {workers.map((w, idx) => (
              <PersonCard
                key={`worker-${idx}`}
                person={w}
                projectMap={projectMap}
                onEdit={() => openEdit(w)}
                onRemove={() => setDeleteTarget(w)}
                onShareInvite={() => copyInviteLink(profile?.invite_code)}
              />
            ))}
          </div>
        )}
      </Section>

      {features?.subs_enabled !== false && (
        <>
          {/* Subcontractors Section */}
          <Section icon={Briefcase} title="Subcontractors" count={subs.length} onAdd={() => openAdd('subcontractor')} addLabel="Add Sub">
            {subs.length === 0 ? (
              <p className="text-sm text-muted-foreground/70 py-2">
                No subcontractors yet.
              </p>
            ) : (
              <div className="space-y-2">
                {subs.map((s, idx) => (
                  <PersonCard
                    key={`sub-${idx}`}
                    person={s}
                    projectMap={projectMap}
                    onEdit={() => openEdit(s)}
                    onRemove={() => setDeleteTarget(s)}
                    onShareInvite={() => copyInviteLink(profile?.invite_code)}
                  />
                ))}
              </div>
            )}
          </Section>
        </>
      )}

      {/* Clients Section */}
      <Section icon={User} title="Clients" count={activeClients.length} onAdd={() => setShowAddClient(true)} addLabel="Add Client">
        {/* Inline Quick Add Client Form */}
        {showAddClient && (
          <div className="bg-secondary rounded-lg p-4 mb-3 space-y-3 border border-border">
            <h4 className="text-sm font-medium text-foreground">Add Client</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Name *</label>
                <input type="text" className={INPUT_CLASS} value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} placeholder="Client name" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Email *</label>
                <input type="email" className={INPUT_CLASS} value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} placeholder="client@email.com" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Company</label>
              <input type="text" className={INPUT_CLASS} value={newClient.company_name}
                onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })} placeholder="Company or business name" />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Address</label>
              <input type="text" className={INPUT_CLASS} value={newClient.address}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} placeholder="Street address" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">City</label>
                <input type="text" className={INPUT_CLASS} value={newClient.city}
                  onChange={(e) => setNewClient({ ...newClient, city: e.target.value })} placeholder="City" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">State</label>
                <input type="text" className={INPUT_CLASS} value={newClient.state}
                  onChange={(e) => setNewClient({ ...newClient, state: e.target.value })} placeholder="State" />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Zip</label>
                <input type="text" className={INPUT_CLASS} value={newClient.zip_code}
                  onChange={(e) => setNewClient({ ...newClient, zip_code: e.target.value })} placeholder="Zip code" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Phone</label>
              <input type="tel" className={INPUT_CLASS} value={newClient.phone}
                onChange={(e) => setNewClient({ ...newClient, phone: formatPhone(e.target.value) })} placeholder="(555) 555-5555" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleAddClient} disabled={!newClient.name.trim() || !newClient.email.trim()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-xs min-h-[44px] transition-colors disabled:opacity-50">
                <Plus className="h-3.5 w-3.5" /> Add Client
              </button>
              <button type="button" onClick={() => setShowAddClient(false)}
                className="px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-transparent text-xs min-h-[44px] transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
        {activeClients.length === 0 && !showAddClient ? (
          <p className="text-sm text-muted-foreground/70 py-2">
            No clients yet. Click "Add Client" to add your first client.
          </p>
        ) : (
          <div className="space-y-2">
            {activeClients.map((c) => (
              <ClientCard
                key={c.id}
                client={c}
                projectCount={clientProjectCounts[c.id] || 0}
                onView={(id) => setClientDetailId(id)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Permissions Guide */}
      <div className="bg-secondary/50 border border-border rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setPermissionsOpen((prev) => !prev)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary transition-colors min-h-[44px]"
        >
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground flex-1">View permissions</span>
          {permissionsOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground/70" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
          )}
        </button>
        {permissionsOpen && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-muted-foreground/70 uppercase tracking-wider font-medium">What each role can access</p>
            <div className="space-y-2">
              <div className="bg-card/50 rounded-lg p-3">
                <p className="text-sm font-medium text-primary">Owner</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Full access to all projects, estimates, financials, settings, and people management.
                </p>
              </div>
              <div className="bg-card/50 rounded-lg p-3">
                <p className="text-sm font-medium text-primary-hover">Worker</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Assigned projects only. Can create daily logs, add photos, and log materials and labor. Cannot see estimates, financials, other clients, or settings.
                </p>
              </div>
              <div className="bg-card/50 rounded-lg p-3">
                <p className="text-sm font-medium text-sky-400">Subcontractor</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Their assigned project scope only. Can upload photos of completed work. Cannot see project budget, other subs, client details, or financials.
                </p>
              </div>
              <div className="bg-card/50 rounded-lg p-3">
                <p className="text-sm font-medium text-emerald-400">Client</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Branded portal view via shareable link. Can see project status, photos, and updates. Read-only.
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/50 italic">
              Workers and subs join via the invite link and see only their assigned projects. Owner sees everything.
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <PersonModal
          person={editingPerson}
          activeProjects={activeProjects}
          onSave={handleSavePerson}
          onCancel={() => { setShowModal(false); setEditingPerson(null); }}
          isSaving={savePeople.isPending}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <DeleteConfirm
          personName={deleteTarget.name}
          onConfirm={handleRemovePerson}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
