import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  User,
  Pencil,
  Save,
  X,
  Loader2,
  FolderOpen,
  FileText,
  Phone,
  Mail,
  MapPin,
  Eye,
} from 'lucide-react';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return d;
  }
};

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const STATUS_COLORS = {
  active: 'bg-emerald-500/20 text-emerald-400',
  quoting: 'bg-emerald-500/20 text-emerald-400', // legacy — treated as active
  paused: 'bg-primary/20 text-primary-hover',
  completed: 'bg-muted-foreground/20 text-muted-foreground',
  cancelled: 'bg-muted-foreground/20 text-muted-foreground',
};

const ESTIMATE_STATUS_COLORS = {
  draft: 'bg-muted-foreground/20 text-muted-foreground',
  sent: 'bg-blue-500/20 text-blue-400',
  accepted: 'bg-emerald-500/20 text-emerald-400',
  declined: 'bg-red-500/20 text-red-400',
  expired: 'bg-primary/20 text-primary-hover',
};

export default function FieldServiceClientDetail({
  clientId,
  profile,
  currentUser,
  onBack,
  onViewProject,
  onViewEstimate,
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  const {
    data: client,
    isLoading: clientLoading,
  } = useQuery({
    queryKey: ['fs-client', clientId],
    queryFn: async () => {
      const results = await base44.entities.FSClient.filter({ id: clientId });
      return results?.[0] || null;
    },
    enabled: !!clientId,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['fs-client-projects', clientId],
    queryFn: () => base44.entities.FSProject.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const { data: estimates = [], isLoading: estimatesLoading } = useQuery({
    queryKey: ['fs-client-estimates', clientId],
    queryFn: () => base44.entities.FSEstimate.filter({ client_id: clientId }),
    enabled: !!clientId,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.FSClient.update(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-client', clientId] });
      toast.success('Client updated');
      setEditing(false);
    },
    onError: () => {
      toast.error('Failed to update client');
    },
  });

  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const totalEstimates = estimates.length;
    return { totalProjects, activeProjects, totalEstimates };
  }, [projects, estimates]);

  function startEdit() {
    setForm({
      name: client?.name || '',
      email: client?.email || '',
      phone: client?.phone || '',
      company_name: client?.company_name || '',
      address: client?.address || '',
      city: client?.city || '',
      state: client?.state || '',
      zip_code: client?.zip_code || '',
      notes: client?.notes || '',
      status: client?.status || 'active',
    });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setForm({});
  }

  function handleSave() {
    updateMutation.mutate({
      name: form.name,
      email: form.email,
      phone: form.phone,
      company_name: form.company_name,
      address: form.address,
      city: form.city,
      state: form.state,
      zip_code: form.zip_code,
      notes: form.notes,
      status: form.status,
    });
  }

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-background p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-foreground-soft hover:text-primary-hover transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="mt-12 text-center text-muted-foreground">Client not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24 space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-foreground-soft hover:text-primary-hover transition-colors min-h-[44px]"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      {/* Client header card */}
      <div className="bg-card rounded-xl p-5 space-y-4">
        {editing ? (
          /* Edit mode */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Edit Client</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg bg-secondary text-foreground-soft hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-lg bg-primary text-slate-950 font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground/70 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground/70 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground/70 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Company</label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground/70 focus:outline-none focus:border-primary"
                  placeholder="Company or business name"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground/70 focus:outline-none focus:border-primary"
                  placeholder="Street address"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full min-h-[44px] px-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground/70 focus:outline-none focus:border-primary"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full min-h-[44px] px-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground/70 focus:outline-none focus:border-primary"
                    placeholder="State"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Zip</label>
                  <input
                    type="text"
                    value={form.zip_code}
                    onChange={(e) => setForm({ ...form, zip_code: e.target.value })}
                    className="w-full min-h-[44px] px-3 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground/70 focus:outline-none focus:border-primary"
                    placeholder="Zip code"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder-muted-foreground/70 focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          /* View mode */
          <>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">{client.name}</h1>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-muted-foreground/20 text-muted-foreground/70'
                    }`}
                  >
                    {client.status || 'active'}
                  </span>
                </div>
              </div>
              <button
                onClick={startEdit}
                className="flex items-center justify-center w-10 min-h-[44px] rounded-lg text-muted-foreground hover:text-primary-hover transition-colors"
              >
                <Pencil className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {client.phone && (
                <a
                  href={`tel:${client.phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-2.5 text-foreground-soft hover:text-primary-hover transition-colors min-h-[44px]"
                >
                  <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{formatPhone(client.phone)}</span>
                </a>
              )}
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-2.5 text-foreground-soft hover:text-primary-hover transition-colors min-h-[44px]"
                >
                  <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{client.email}</span>
                </a>
              )}
              {(client.address || client.city || client.state || client.zip_code) && (
                <div className="flex items-center gap-2.5 text-foreground-soft min-h-[44px]">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{[client.address, client.city, [client.state, client.zip_code].filter(Boolean).join(' ')].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {client.company_name && (
                <div className="flex items-center gap-2.5 text-foreground-soft min-h-[44px]">
                  <span className="w-4 h-4 text-primary flex-shrink-0 text-center text-xs font-bold">Co</span>
                  <span>{client.company_name}</span>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">{client.notes}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{stats.totalProjects}</div>
          <div className="text-sm text-muted-foreground mt-1">Total Projects</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.activeProjects}</div>
          <div className="text-sm text-muted-foreground mt-1">Active Projects</div>
        </div>
        <div className="bg-card rounded-xl p-4 text-center col-span-2 sm:col-span-1">
          <div className="text-2xl font-bold text-foreground">{stats.totalEstimates}</div>
          <div className="text-sm text-muted-foreground mt-1">Total Estimates</div>
        </div>
      </div>

      {/* Projects section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Projects</h2>
        </div>

        {projectsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-card rounded-xl p-6 text-center">
            <FolderOpen className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-muted-foreground">No projects yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onViewProject(project.id)}
                className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors min-h-[44px]"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground truncate pr-2">{project.name}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                      STATUS_COLORS[project.status] || STATUS_COLORS.active
                    }`}
                  >
                    {project.status || 'active'}
                  </span>
                </div>
                {(project.budget != null || project.spent != null) && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Budget</span>
                      <span className="text-foreground-soft">
                        {fmt(project.spent || 0)} / {fmt(project.budget || 0)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            project.budget
                              ? ((project.spent || 0) / project.budget) * 100
                              : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground/70">
                  <Eye className="h-3 w-3" />
                  <span>Client sees: {project.client_show_breakdown ? 'Full breakdown' : 'Total only'}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Estimates section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Estimates</h2>
        </div>

        {estimatesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : estimates.length === 0 ? (
          <div className="bg-card rounded-xl p-6 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-muted-foreground">No estimates yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {estimates.map((estimate) => (
              <button
                key={estimate.id}
                onClick={() => onViewEstimate(estimate.id)}
                className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors min-h-[44px]"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-foreground truncate pr-2">
                    {estimate.title || 'Untitled Estimate'}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                      ESTIMATE_STATUS_COLORS[estimate.status] || ESTIMATE_STATUS_COLORS.draft
                    }`}
                  >
                    {estimate.status || 'draft'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {estimate.estimate_number || '—'}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {fmt(estimate.total)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground/70">
                  <Eye className="h-3 w-3" />
                  <span>Client sees: {estimate.client_show_breakdown ? 'Full breakdown' : 'Total only'}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
