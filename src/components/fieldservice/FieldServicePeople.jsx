import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Users, Plus, Pencil, Trash2, Save, X, Loader2,
  ChevronDown, ChevronRight, HardHat, Briefcase, User,
  Phone, Mail, Shield, FolderOpen, Link2, Share2,
} from 'lucide-react';

function formatPhone(value) {
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
  'w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent min-h-[44px]';

const ROLE_BADGES = {
  worker: { label: 'Worker', className: 'bg-amber-500/20 text-amber-400' },
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
function Section({ icon: Icon, title, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-800/50 transition-colors min-h-[44px]"
      >
        <Icon className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <span className="text-base font-bold text-slate-100 flex-1">{title}</span>
        {count != null && (
          <span className="text-xs text-slate-400 mr-2">{count}</span>
        )}
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>
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
    <div className="bg-slate-800/50 rounded-lg p-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-slate-100 truncate">{person.name}</p>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
            {person.user_id ? (
              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">Connected</span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-400">Pending</span>
            )}
          </div>
          {person.company_name && (
            <p className="text-xs text-slate-400 mt-0.5">{person.company_name}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
            {person.phone && (
              <a href={`tel:${person.phone.replace(/\D/g, '')}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 transition-colors">
                <Phone className="h-3 w-3" /> {person.phone}
              </a>
            )}
            {person.email && (
              <a href={`mailto:${person.email}`} className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 transition-colors">
                <Mail className="h-3 w-3" /> {person.email}
              </a>
            )}
            {person.role === 'worker' && person.hourly_rate > 0 && (
              <span className="text-xs text-slate-500">${person.hourly_rate}/hr</span>
            )}
          </div>
          {assignedCount > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              <FolderOpen className="h-3 w-3 inline mr-1" />{assignedCount} project{assignedCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          {onShareInvite && (
            <button
              type="button"
              onClick={() => onShareInvite()}
              className="p-2 text-slate-500 hover:text-amber-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Copy invite link"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(person)}
            className="p-2 text-slate-500 hover:text-amber-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(person)}
            className="p-2 text-slate-500 hover:text-red-400 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
      className="w-full bg-slate-800/50 rounded-lg p-3 text-left hover:border-amber-500/50 hover:bg-slate-800 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-amber-500 truncate">{client.name}</p>
            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">
              Client
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
            {client.phone && (
              <a
                href={`tel:${client.phone.replace(/\D/g, '')}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 transition-colors"
              >
                <Phone className="h-3 w-3" /> {client.phone}
              </a>
            )}
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-500 transition-colors"
              >
                <Mail className="h-3 w-3" /> {client.email}
              </a>
            )}
          </div>
          {projectCount > 0 && (
            <p className="text-xs text-slate-500 mt-1">
              <FolderOpen className="h-3 w-3 inline mr-1" />{projectCount} project{projectCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-slate-500 flex-shrink-0 mt-1" />
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
    <div className="fixed inset-0 z-50 bg-slate-950/95 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <h2 className="text-lg font-bold text-slate-100">
          {isEdit ? 'Edit Person' : 'Add Person'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-slate-400 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm text-slate-400 mb-1">Name *</label>
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
          <label className="block text-sm text-slate-400 mb-1">Role</label>
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
            <label className="block text-sm text-slate-400 mb-1">Company name</label>
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
          <label className="block text-sm text-slate-400 mb-1">Phone</label>
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
          <label className="block text-sm text-slate-400 mb-1">Email</label>
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
            <label className="block text-sm text-slate-400 mb-1">Hourly rate</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
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
          <label className="block text-sm text-slate-400 mb-1">Notes</label>
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
            <label className="block text-sm text-slate-400 mb-2">Assigned projects</label>
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
                        ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                        : 'bg-slate-800/50 border border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className={`h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 ${
                      isAssigned ? 'bg-amber-500 border-amber-500' : 'border-slate-600'
                    }`}>
                      {isAssigned && <span className="text-black text-xs font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      {p.client_name && (
                        <p className="text-xs text-slate-500">{p.client_name}</p>
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
      <div className="p-4 border-t border-slate-800">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!form.name.trim() || isSaving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors text-sm min-h-[44px] disabled:opacity-50 disabled:pointer-events-none"
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-sm w-full space-y-4">
        <h3 className="text-lg font-bold text-slate-100">Remove {personName}?</h3>
        <p className="text-sm text-slate-400">
          This will remove them from your team roster. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors text-sm min-h-[44px]"
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
export default function FieldServicePeople({ profile, currentUser, onNavigateTab }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [clientDetailId, setClientDetailId] = useState(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);

  // ─── Parse workers from profile ──────────────────
  const people = useMemo(() => parseWorkers(profile?.workers_json), [profile?.workers_json]);
  const workers = useMemo(() => people.filter((p) => p.role === 'worker' || !p.role), [people]);
  const subs = useMemo(() => people.filter((p) => p.role === 'subcontractor'), [people]);

  // ─── Query: Projects ─────────────────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ['fs-projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSProject.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
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
      const list = await base44.entities.FSClient.filter({ workspace_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
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

  const openAdd = () => {
    setEditingPerson(null);
    setShowModal(true);
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
          <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
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
        <h2 className="text-xl font-bold text-slate-100">People</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => copyInviteLink(profile?.invite_code)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 hover:bg-transparent transition-colors text-sm min-h-[44px]"
          >
            <Link2 className="h-4 w-4" /> Invite Link
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors text-sm min-h-[44px]"
          >
            <Plus className="h-4 w-4" /> Add Person
          </button>
        </div>
      </div>

      {/* Workers Section */}
      <Section icon={HardHat} title="Workers" count={workers.length}>
        {workers.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">
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

      {/* Subcontractors Section */}
      <Section icon={Briefcase} title="Subcontractors" count={subs.length}>
        {subs.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">
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

      {/* Clients Section (read-only) */}
      <Section icon={User} title="Clients" count={activeClients.length}>
        {activeClients.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">
            No clients yet. Create an estimate to add your first client.
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
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setPermissionsOpen((prev) => !prev)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-800 transition-colors min-h-[44px]"
        >
          <Shield className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-400 flex-1">View permissions</span>
          {permissionsOpen ? (
            <ChevronDown className="h-4 w-4 text-slate-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-500" />
          )}
        </button>
        {permissionsOpen && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">What each role can access</p>
            <div className="space-y-2">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-500">Owner</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Full access to all projects, estimates, financials, settings, and people management.
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-400">Worker</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assigned projects only. Can create daily logs, add photos, and log materials and labor. Cannot see estimates, financials, other clients, or settings.
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-sm font-medium text-sky-400">Subcontractor</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Their assigned project scope only. Can upload photos of completed work. Cannot see project budget, other subs, client details, or financials.
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-sm font-medium text-emerald-400">Client</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Branded portal view via shareable link. Can see project status, photos, and updates. Read-only.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-600 italic">
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
