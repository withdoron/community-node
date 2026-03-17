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
  paused: 'bg-amber-500/20 text-amber-400',
  completed: 'bg-slate-500/20 text-slate-400',
  cancelled: 'bg-slate-500/20 text-slate-400',
};

const ESTIMATE_STATUS_COLORS = {
  draft: 'bg-slate-500/20 text-slate-400',
  sent: 'bg-blue-500/20 text-blue-400',
  accepted: 'bg-emerald-500/20 text-emerald-400',
  declined: 'bg-red-500/20 text-red-400',
  expired: 'bg-amber-500/20 text-amber-400',
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
      address: client?.address || '',
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
      address: form.address,
      notes: form.notes,
      status: form.status,
    });
  }

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-slate-950 p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-300 hover:text-amber-400 transition-colors min-h-[44px]"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="mt-12 text-center text-slate-400">Client not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 pb-24 space-y-4">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-300 hover:text-amber-400 transition-colors min-h-[44px]"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      {/* Client header card */}
      <div className="bg-slate-900 rounded-xl p-5 space-y-4">
        {editing ? (
          /* Edit mode */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Edit Client</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-3 min-h-[44px] rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-lg bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50"
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
                <label className="block text-sm text-slate-400 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full min-h-[44px] px-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500"
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
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{client.name}</h1>
                  <span
                    className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-500'
                    }`}
                  >
                    {client.status || 'active'}
                  </span>
                </div>
              </div>
              <button
                onClick={startEdit}
                className="flex items-center justify-center w-10 min-h-[44px] rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
              >
                <Pencil className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {client.phone && (
                <a
                  href={`tel:${client.phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-2.5 text-slate-300 hover:text-amber-400 transition-colors min-h-[44px]"
                >
                  <Phone className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>{client.phone}</span>
                </a>
              )}
              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-2.5 text-slate-300 hover:text-amber-400 transition-colors min-h-[44px]"
                >
                  <Mail className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>{client.email}</span>
                </a>
              )}
              {client.address && (
                <div className="flex items-center gap-2.5 text-slate-300 min-h-[44px]">
                  <MapPin className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>{client.address}</span>
                </div>
              )}
            </div>

            {client.notes && (
              <div className="pt-2 border-t border-slate-800">
                <p className="text-sm text-slate-400">{client.notes}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{stats.totalProjects}</div>
          <div className="text-sm text-slate-400 mt-1">Total Projects</div>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.activeProjects}</div>
          <div className="text-sm text-slate-400 mt-1">Active Projects</div>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
          <div className="text-2xl font-bold text-white">{stats.totalEstimates}</div>
          <div className="text-sm text-slate-400 mt-1">Total Estimates</div>
        </div>
      </div>

      {/* Projects section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-white">Projects</h2>
        </div>

        {projectsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-slate-900 rounded-xl p-6 text-center">
            <FolderOpen className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No projects yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => onViewProject(project.id)}
                className="w-full text-left bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-amber-500/50 transition-colors min-h-[44px]"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white truncate pr-2">{project.name}</h3>
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
                      <span className="text-slate-400">Budget</span>
                      <span className="text-slate-300">
                        {fmt(project.spent || 0)} / {fmt(project.budget || 0)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all"
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
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
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
          <FileText className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-white">Estimates</h2>
        </div>

        {estimatesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
          </div>
        ) : estimates.length === 0 ? (
          <div className="bg-slate-900 rounded-xl p-6 text-center">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">No estimates yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {estimates.map((estimate) => (
              <button
                key={estimate.id}
                onClick={() => onViewEstimate(estimate.id)}
                className="w-full text-left bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-amber-500/50 transition-colors min-h-[44px]"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-white truncate pr-2">
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
                  <span className="text-sm text-slate-400">
                    {estimate.estimate_number || '—'}
                  </span>
                  <span className="text-sm font-medium text-slate-100">
                    {fmt(estimate.total)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
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
