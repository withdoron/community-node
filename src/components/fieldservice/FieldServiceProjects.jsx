import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import VoiceInput from './VoiceInput';
import ClientSelector from './ClientSelector';
import FieldServiceTimeline from './FieldServiceTimeline';
import FieldServicePayments from './FieldServicePayments';
import FieldServicePermits from './FieldServicePermits';
import FieldServicePhotoGallery from './FieldServicePhotoGallery';
import FieldServiceClientPortal from './FieldServiceClientPortal';
import FieldServiceClientDetail from './FieldServiceClientDetail';
import {
  FolderOpen, Plus, ArrowLeft, Pencil, Trash2, Loader2, Save, X,
  MapPin, Calendar, DollarSign, Clock, Search, GitBranch, FileText,
  Eye, Camera, Shield, Copy, User, Users, LayoutList,
} from 'lucide-react';

const INPUT_CLASS =
  'w-full bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent';
const LABEL_CLASS = 'block text-slate-300 text-sm font-medium mb-1';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'quoting', label: 'Quoting', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'paused', label: 'Paused', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'completed', label: 'Completed', color: 'bg-slate-500/20 text-slate-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-slate-500/20 text-slate-500' },
];

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'quoting', label: 'Quoting' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d + (d.includes('T') ? '' : 'T12:00:00')).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return d; }
};

const EMPTY_PROJECT = {
  name: '', client_id: '', client_name: '', client_phone: '', client_email: '',
  address: '', description: '', status: 'active',
  start_date: '', estimated_end_date: '',
  total_budget: '', notes: '',
};

export default function FieldServiceProjects({ profile, currentUser }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState('list'); // list | detail | form | timeline | client_portal | client_detail
  const [timelineProjectId, setTimelineProjectId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [clientDetailId, setClientDetailId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupByClient, setGroupByClient] = useState(true);
  const [formData, setFormData] = useState(EMPTY_PROJECT);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // ─── Query: All projects ────────────────────────
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['fs-projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSProject.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Log counts per project ─────────────
  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['fs-daily-logs-all', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSDailyLog.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Material totals ────────────────────
  const { data: allMaterials = [] } = useQuery({
    queryKey: ['fs-materials-all', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSMaterialEntry.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Labor totals ──────────────────────
  const { data: allLabor = [] } = useQuery({
    queryKey: ['fs-labor-all', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSLaborEntry.filter({ profile_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Clients ──────────────────────────
  const { data: clients = [] } = useQuery({
    queryKey: ['fs-clients', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const list = await base44.entities.FSClient.filter({ workspace_id: profile.id });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!profile?.id,
  });

  const clientMap = useMemo(() => {
    const map = {};
    clients.forEach((c) => { map[c.id] = c; });
    return map;
  }, [clients]);

  // ─── Derived data ─────────────────────────────
  const logCountByProject = useMemo(() => {
    const map = {};
    dailyLogs.forEach((l) => {
      if (l.project_id) map[l.project_id] = (map[l.project_id] || 0) + 1;
    });
    return map;
  }, [dailyLogs]);

  const spendByProject = useMemo(() => {
    const map = {};
    allMaterials.forEach((m) => {
      if (m.project_id) map[m.project_id] = (map[m.project_id] || 0) + (m.total_cost || 0);
    });
    allLabor.forEach((l) => {
      if (l.project_id) map[l.project_id] = (map[l.project_id] || 0) + (l.total_cost || 0);
    });
    return map;
  }, [allMaterials, allLabor]);

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (filter !== 'all') list = list.filter((p) => p.status === filter);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.client_name || '').toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
  }, [projects, filter, searchTerm]);

  const groupedProjects = useMemo(() => {
    const groups = {};
    filteredProjects.forEach((p) => {
      const key = p.client_id || '__unassigned__';
      if (!groups[key]) {
        const client = p.client_id ? clientMap[p.client_id] : null;
        groups[key] = {
          clientId: p.client_id || null,
          clientName: client?.name || p.client_name || 'Unassigned',
          projects: [],
        };
      }
      groups[key].projects.push(p);
    });
    return Object.values(groups).sort((a, b) => {
      if (a.clientId === null) return 1;
      if (b.clientId === null) return -1;
      return a.clientName.localeCompare(b.clientName);
    });
  }, [filteredProjects, clientMap]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedId),
    [projects, selectedId]
  );

  // ─── Query: Estimate for selected project ─────
  const { data: selectedEstimate } = useQuery({
    queryKey: ['fs-project-estimate', selectedProject?.estimate_id],
    queryFn: async () => {
      if (!selectedProject?.estimate_id) return null;
      const list = await base44.entities.FSEstimate.filter({ id: selectedProject.estimate_id });
      return Array.isArray(list) && list[0] ? list[0] : null;
    },
    enabled: !!selectedProject?.estimate_id,
  });

  // ─── Query: Per-project materials & labor (matches Timeline pattern) ───
  const { data: projectMaterials = [] } = useQuery({
    queryKey: ['fs-project-materials', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const list = await base44.entities.FSMaterialEntry.filter({ project_id: selectedId });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!selectedId,
  });

  const { data: projectLabor = [] } = useQuery({
    queryKey: ['fs-project-labor', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const list = await base44.entities.FSLaborEntry.filter({ project_id: selectedId });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!selectedId,
  });

  const { data: projectPhotos = [] } = useQuery({
    queryKey: ['fs-project-photos', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const list = await base44.entities.FSDailyPhoto.filter({ project_id: selectedId });
      return Array.isArray(list) ? list : list ? [list] : [];
    },
    enabled: !!selectedId,
  });

  const projectSpent = useMemo(() => {
    const matTotal = projectMaterials.reduce((s, m) => s + (m.total_cost || 0), 0);
    const labTotal = projectLabor.reduce((s, l) => s + (l.total_cost || 0), 0);
    return matTotal + labTotal;
  }, [projectMaterials, projectLabor]);

  const photosByLogId = useMemo(() => {
    const map = {};
    projectPhotos.forEach((p) => {
      if (p.daily_log_id) {
        if (!map[p.daily_log_id]) map[p.daily_log_id] = [];
        map[p.daily_log_id].push(p);
      }
    });
    return map;
  }, [projectPhotos]);

  // ─── Mutations ────────────────────────────────
  const createProject = useMutation({
    mutationFn: async (data) => {
      return base44.entities.FSProject.create({
        ...data,
        profile_id: profile.id,
        user_id: currentUser?.id,
        client_id: data.client_id || null,
        total_budget: parseFloat(data.total_budget) || 0,
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['fs-projects'] });
      toast.success('Project created');
      setView('detail');
      setSelectedId(created.id);
      setFormData(EMPTY_PROJECT);
      setEditingId(null);
    },
    onError: (err) => toast.error(err?.message || 'Failed to create project'),
  });

  const updateProject = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.FSProject.update(id, {
        ...data,
        total_budget: parseFloat(data.total_budget) || 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-projects'] });
      toast.success('Project updated');
      setView('detail');
      setFormData(EMPTY_PROJECT);
      setEditingId(null);
    },
    onError: (err) => toast.error(err?.message || 'Failed to update project'),
  });

  const deleteProject = useMutation({
    mutationFn: (id) => base44.entities.FSProject.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-projects'] });
      toast.success('Project deleted');
      setView('list');
      setSelectedId(null);
      setDeleteConfirm(null);
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete project'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.FSProject.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-projects'] });
      toast.success('Status updated');
    },
    onError: (err) => toast.error(err?.message || 'Failed to update status'),
  });

  // ─── Helpers ──────────────────────────────────
  const openCreateForm = () => {
    setFormData(EMPTY_PROJECT);
    setEditingId(null);
    setView('form');
  };

  const openEditForm = (project) => {
    setFormData({
      name: project.name || '',
      client_id: project.client_id || '',
      client_name: project.client_name || '',
      client_phone: project.client_phone || '',
      client_email: project.client_email || '',
      address: project.address || '',
      description: project.description || '',
      status: project.status || 'active',
      start_date: project.start_date || '',
      estimated_end_date: project.estimated_end_date || '',
      total_budget: project.total_budget?.toString() || '',
      notes: project.notes || '',
    });
    setEditingId(project.id);
    setView('form');
  };

  const openDetail = (project) => {
    setSelectedId(project.id);
    setView('detail');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    if (editingId) {
      updateProject.mutate({ id: editingId, data: formData });
    } else {
      createProject.mutate(formData);
    }
  };

  const setField = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));

  const appendVoice = (key, text) =>
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key] ? `${prev[key]} ${text}` : text,
    }));

  // ─── Loading ──────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
      </div>
    );
  }

  // ═══ CLIENT DETAIL VIEW ═════════════════════════
  if (view === 'client_detail' && clientDetailId) {
    return (
      <FieldServiceClientDetail
        clientId={clientDetailId}
        profile={profile}
        currentUser={currentUser}
        onBack={() => { setView(selectedId ? 'detail' : 'list'); setClientDetailId(null); }}
        onViewProject={(projectId) => { setSelectedId(projectId); setClientDetailId(null); setView('detail'); }}
        onViewEstimate={() => {}}
      />
    );
  }

  // ═══ CLIENT PORTAL VIEW ══════════════════════════
  if (view === 'client_portal' && selectedProject) {
    return (
      <FieldServiceClientPortal
        project={selectedProject}
        profile={profile}
        onBack={() => setView('detail')}
      />
    );
  }

  // ═══ TIMELINE VIEW ═════════════════════════════
  if (view === 'timeline' && timelineProjectId) {
    return (
      <FieldServiceTimeline
        projectId={timelineProjectId}
        profile={profile}
        onBack={() => { setView('detail'); setTimelineProjectId(null); }}
      />
    );
  }

  // ═══ FORM VIEW ════════════════════════════════
  if (view === 'form') {
    const isPending = createProject.isPending || updateProject.isPending;
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => { setView(editingId ? 'detail' : 'list'); setFormData(EMPTY_PROJECT); setEditingId(null); }}
          className="flex items-center gap-2 text-slate-400 hover:text-amber-500 text-sm mb-2 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h2 className="text-xl font-bold text-slate-100">
          {editingId ? 'Edit Project' : 'New Project'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Project Name */}
          <div>
            <label className={LABEL_CLASS}>Project name *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setField('name', e.target.value)}
                className={INPUT_CLASS}
                placeholder="e.g. Kitchen Remodel — 123 Oak St"
                required
              />
              <VoiceInput onTranscript={(t) => setField('name', t)} />
            </div>
          </div>

          {/* Client Info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-slate-400">Client info</p>
            <ClientSelector
              clients={clients}
              selectedClientId={formData.client_id}
              onSelect={(clientId) => {
                const client = clients.find((c) => c.id === clientId);
                setFormData((prev) => ({
                  ...prev,
                  client_id: clientId,
                  client_name: client?.name || prev.client_name,
                  client_email: client?.email || prev.client_email,
                  client_phone: client?.phone || prev.client_phone,
                }));
              }}
              onClientCreated={(client) => {
                setFormData((prev) => ({
                  ...prev,
                  client_id: client.id,
                  client_name: client.name || '',
                  client_email: client.email || '',
                  client_phone: client.phone || '',
                }));
              }}
              profileId={profile?.id}
              currentUser={currentUser}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS}>Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.client_name}
                    onChange={(e) => setField('client_name', e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="Client name"
                  />
                  <VoiceInput onTranscript={(t) => setField('client_name', t)} />
                </div>
              </div>
              <div>
                <label className={LABEL_CLASS}>Phone</label>
                <input
                  type="tel"
                  value={formData.client_phone}
                  onChange={(e) => setField('client_phone', formatPhone(e.target.value))}
                  className={INPUT_CLASS}
                  placeholder="555-1234"
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLASS}>Email</label>
              <input
                type="email"
                value={formData.client_email}
                onChange={(e) => setField('client_email', e.target.value)}
                className={INPUT_CLASS}
                placeholder="client@example.com"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className={LABEL_CLASS}>Job site address</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setField('address', e.target.value)}
                className={INPUT_CLASS}
                placeholder="123 Main St, Eugene OR"
              />
              <VoiceInput onTranscript={(t) => setField('address', t)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={LABEL_CLASS}>Description</label>
            <div className="flex gap-2 items-start">
              <textarea
                value={formData.description}
                onChange={(e) => setField('description', e.target.value)}
                rows={3}
                className={`${INPUT_CLASS} resize-y`}
                placeholder="Scope of work..."
              />
              <VoiceInput onTranscript={(t) => appendVoice('description', t)} className="mt-1" />
            </div>
          </div>

          {/* Status + Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={LABEL_CLASS}>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setField('status', e.target.value)}
                className={INPUT_CLASS}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS}>Start date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setField('start_date', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>Est. end date</label>
              <input
                type="date"
                value={formData.estimated_end_date}
                onChange={(e) => setField('estimated_end_date', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className={LABEL_CLASS}>Total budget</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.total_budget}
                onChange={(e) => setField('total_budget', e.target.value)}
                onFocus={(e) => { if (parseFloat(e.target.value) === 0) setField('total_budget', ''); }}
                onBlur={(e) => { if (e.target.value === '') setField('total_budget', 0); }}
                className={`${INPUT_CLASS} pl-7`}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={LABEL_CLASS}>Notes</label>
            <div className="flex gap-2 items-start">
              <textarea
                value={formData.notes}
                onChange={(e) => setField('notes', e.target.value)}
                rows={2}
                className={`${INPUT_CLASS} resize-y`}
                placeholder="Internal notes..."
              />
              <VoiceInput onTranscript={(t) => appendVoice('notes', t)} className="mt-1" />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl py-3 transition-colors min-h-[44px] disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>{editingId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingId ? 'Save Changes' : 'Create Project'}</>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setView(editingId ? 'detail' : 'list'); setFormData(EMPTY_PROJECT); setEditingId(null); }}
              className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-transparent transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ═══ DETAIL VIEW ══════════════════════════════
  if (view === 'detail' && selectedProject) {
    const proj = selectedProject;
    const spent = projectSpent || spendByProject[proj.id] || 0;
    const budget = proj.total_budget || 0;
    const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
    const logCount = logCountByProject[proj.id] || 0;
    const statusObj = STATUS_OPTIONS.find((s) => s.value === proj.status) || STATUS_OPTIONS[0];

    const projectLogs = dailyLogs
      .filter((l) => l.project_id === proj.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => { setView('list'); setSelectedId(null); }}
          className="flex items-center gap-2 text-slate-400 hover:text-amber-500 text-sm mb-2 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" /> All Projects
        </button>

        {/* Project Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-slate-100">{proj.name}</h2>
              {proj.client_name && (
                proj.client_id ? (
                  <button
                    type="button"
                    onClick={() => { setClientDetailId(proj.client_id); setView('client_detail'); }}
                    className="flex items-center gap-1.5 text-sm text-amber-500 hover:text-amber-400 mt-1 transition-colors"
                  >
                    <User className="h-3.5 w-3.5" /> {proj.client_name}
                  </button>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">{proj.client_name}</p>
                )
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusObj.color} flex-shrink-0 ml-3`}>
              {statusObj.label}
            </span>
          </div>

          {proj.address && (
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>{proj.address}</span>
            </div>
          )}

          {(proj.start_date || proj.estimated_end_date) && (
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>
                {proj.start_date ? fmtDate(proj.start_date) : '—'}
                {' → '}
                {proj.estimated_end_date ? fmtDate(proj.estimated_end_date) : '—'}
              </span>
            </div>
          )}

          {proj.description && (
            <p className="text-sm text-slate-300 mt-3">{proj.description}</p>
          )}

          {(proj.client_phone || proj.client_email) && (
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-400">
              {proj.client_phone && <a href={`tel:${proj.client_phone.replace(/\D/g, '')}`} className="hover:text-amber-500 transition-colors">Phone: {proj.client_phone}</a>}
              {proj.client_email && <a href={`mailto:${proj.client_email}`} className="hover:text-amber-500 transition-colors">Email: {proj.client_email}</a>}
            </div>
          )}
        </div>

        {/* Status Quick Change */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-sm text-slate-400 mb-3">Change status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                disabled={s.value === proj.status || updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id: proj.id, status: s.value })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] ${
                  s.value === proj.status
                    ? `${s.color} ring-2 ring-white/20`
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                } disabled:opacity-50`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Budget & Spend */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Budget</p>
            <p className="text-lg font-bold text-slate-100">{budget > 0 ? fmt(budget) : '—'}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Spent</p>
            <p className="text-lg font-bold text-amber-500">{fmt(spent)}</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Remaining</p>
            <p className={`text-lg font-bold ${budget > 0 && spent > budget ? 'text-red-400' : 'text-slate-100'}`}>
              {budget > 0 ? fmt(budget - spent) : '—'}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-1">Daily Logs</p>
            <p className="text-lg font-bold text-slate-100">{logCount}</p>
          </div>
        </div>

        {/* Budget Progress */}
        {budget > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Budget used</span>
              <span className="text-slate-300">{Math.round(pct)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${pct > 90 ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Linked Estimate */}
        {proj.estimate_id && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <FileText className="h-4 w-4 text-amber-500" />
              <span>Created from estimate</span>
            </div>
            <span className="text-xs text-slate-500">{proj.estimate_id}</span>
          </div>
        )}

        {/* Payments */}
        <FieldServicePayments
          projectId={proj.id}
          profileId={profile?.id}
          currentUser={currentUser}
          estimateTotal={selectedEstimate?.total || 0}
          budgetTotal={proj.total_budget || 0}
        />

        {/* Permits */}
        <FieldServicePermits projectId={proj.id} profileId={profile?.id} currentUser={currentUser} />

        {/* Photo Gallery */}
        <FieldServicePhotoGallery
          projectId={proj.id}
          phases={Array.isArray(profile?.phase_labels) ? profile.phase_labels : (profile?.phase_labels?.items || ['Before', 'Demo', 'Framing', 'Rough-in', 'Finish', 'Final'])}
        />

        {/* Recent Logs */}
        {projectLogs.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-lg font-bold text-slate-100 mb-3">Recent Logs</h3>
            <div className="space-y-2">
              {projectLogs.slice(0, 5).map((log) => {
                const taskPreview = (() => {
                  const t = log.tasks_completed;
                  if (!t) return '';
                  if (Array.isArray(t)) return t.join(', ');
                  if (typeof t === 'string') {
                    const s = t.trim();
                    if (s.startsWith('[')) {
                      try { const parsed = JSON.parse(s); return Array.isArray(parsed) ? parsed.join(', ') : s; }
                      catch { return s; }
                    }
                    return s.slice(0, 120);
                  }
                  return '';
                })();
                return (
                  <div key={log.id} className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">{fmtDate(log.date)}</span>
                      {log.day_number && (
                        <span className="text-xs text-slate-500">
                          {String(log.day_number).startsWith('Day ') ? log.day_number : `Day ${log.day_number}`}
                        </span>
                      )}
                    </div>
                    {taskPreview && (
                      <p className="text-sm text-slate-300 line-clamp-2">{taskPreview}</p>
                    )}
                    {log.weather && (
                      <p className="text-xs text-slate-500 mt-1">{log.weather}</p>
                    )}
                    {/* Inline photo thumbnails */}
                    {photosByLogId[log.id]?.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {photosByLogId[log.id].map((photo) => {
                          const url = typeof photo.photo === 'object' && photo.photo?.url ? photo.photo.url : (photo.photo || '');
                          if (!url) return null;
                          return (
                            <button
                              key={photo.id}
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setLightboxPhoto(url); }}
                              className="h-14 w-14 rounded-lg overflow-hidden border border-slate-700 hover:border-amber-500 transition-colors flex-shrink-0"
                            >
                              <img src={url} alt={photo.caption || ''} className="h-full w-full object-cover" />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {projectLogs.length > 5 && (
                <p className="text-xs text-slate-500 text-center pt-2">
                  + {projectLogs.length - 5} more logs
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {proj.notes && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-2">Notes</h3>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{proj.notes}</p>
          </div>
        )}

        {/* Client Portal + Timeline Links */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setView('client_portal')}
            className="flex-1 flex items-center justify-center gap-2 border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 hover:bg-transparent rounded-xl py-3 transition-colors text-sm font-medium min-h-[44px]"
          >
            <Eye className="h-4 w-4" /> View as Client
          </button>
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/client-portal/${profile?.id}/${proj.id}`;
              navigator.clipboard.writeText(url).then(() => toast.success('Client link copied!'));
            }}
            className="flex items-center justify-center gap-2 border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 hover:bg-transparent rounded-xl py-3 px-4 transition-colors text-sm font-medium min-h-[44px]"
          >
            <Copy className="h-4 w-4" /> Copy Link
          </button>
          {projectLogs.length > 0 && (
            <button
              type="button"
              onClick={() => { setTimelineProjectId(proj.id); setView('timeline'); }}
              className="flex-1 flex items-center justify-center gap-2 border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 hover:bg-transparent rounded-xl py-3 transition-colors text-sm font-medium min-h-[44px]"
            >
              <GitBranch className="h-4 w-4" /> Timeline
            </button>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => openEditForm(proj)}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-3 transition-colors min-h-[44px]"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button
            type="button"
            onClick={() => setDeleteConfirm(proj.id)}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:bg-transparent transition-colors min-h-[44px]"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>

        {/* Delete confirmation */}
        {deleteConfirm === proj.id && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center space-y-3">
            <p className="text-sm text-red-400">Delete this project? This cannot be undone.</p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => deleteProject.mutate(proj.id)}
                disabled={deleteProject.isPending}
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors min-h-[44px] disabled:opacity-50"
              >
                {deleteProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-6 py-2 bg-slate-800 text-slate-400 rounded-lg transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Photo Lightbox */}
        {lightboxPhoto && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
            <button type="button" onClick={() => setLightboxPhoto(null)} className="absolute top-4 right-4 text-white/80 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
              <X className="h-6 w-6" />
            </button>
            <img src={lightboxPhoto} alt="" className="max-h-[85vh] max-w-full object-contain rounded-lg" />
          </div>
        )}
      </div>
    );
  }

  // ═══ LIST VIEW ════════════════════════════════
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">Projects</h2>
        <button
          type="button"
          onClick={openCreateForm}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-xl transition-colors text-sm min-h-[44px]"
        >
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>

      {/* Search + Filter + Group Toggle */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`${INPUT_CLASS} pl-10`}
            placeholder="Search projects..."
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={`${INPUT_CLASS} w-auto min-w-[120px]`}
        >
          {FILTER_OPTIONS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setGroupByClient((v) => !v)}
          title={groupByClient ? 'Flat list' : 'Group by client'}
          className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-colors min-h-[44px] min-w-[44px] ${
            groupByClient
              ? 'border-amber-500 text-amber-500 bg-amber-500/10'
              : 'border-slate-700 text-slate-400 hover:text-amber-500 hover:border-amber-500'
          }`}
        >
          {groupByClient ? <Users className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
        </button>
      </div>

      {/* Project Cards */}
      {filteredProjects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <FolderOpen className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">
            {projects.length === 0
              ? 'No projects yet. Create your first project to get started.'
              : 'No projects match your filters.'}
          </p>
          {projects.length === 0 && (
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-4 text-amber-500 hover:text-amber-400 font-medium text-sm"
            >
              + Create Project
            </button>
          )}
        </div>
      ) : groupByClient ? (
        /* ── Grouped by Client ── */
        <div className="space-y-5">
          {groupedProjects.map((group) => (
            <div key={group.clientId || '__unassigned__'}>
              {/* Client group header */}
              <button
                type="button"
                onClick={() => {
                  if (group.clientId) { setClientDetailId(group.clientId); setView('client_detail'); }
                }}
                className={`flex items-center gap-2 mb-2 text-sm font-semibold ${
                  group.clientId
                    ? 'text-amber-500 hover:text-amber-400 transition-colors'
                    : 'text-slate-500 cursor-default'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                {group.clientName}
                <span className="text-slate-600 font-normal">({group.projects.length})</span>
              </button>

              <div className="space-y-2 pl-1 border-l-2 border-slate-800 ml-1.5">
                {group.projects.map((proj) => {
                  const statusObj = STATUS_OPTIONS.find((s) => s.value === proj.status) || STATUS_OPTIONS[0];
                  const spent = spendByProject[proj.id] || 0;
                  const budget = proj.total_budget || 0;
                  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
                  const logs = logCountByProject[proj.id] || 0;

                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => openDetail(proj)}
                      className="w-full text-left bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-slate-100 truncate min-w-0 flex-1">{proj.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusObj.color} flex-shrink-0 ml-2`}>
                          {statusObj.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {proj.address && (
                          <span className="flex items-center gap-1 truncate max-w-[200px]">
                            <MapPin className="h-3 w-3 flex-shrink-0" /> {proj.address}
                          </span>
                        )}
                        {logs > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {logs} log{logs !== 1 ? 's' : ''}
                          </span>
                        )}
                        {spent > 0 && (
                          <span className="flex items-center gap-1 text-amber-500">
                            <DollarSign className="h-3 w-3" /> {fmt(spent)}
                          </span>
                        )}
                      </div>

                      {budget > 0 && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : 'bg-amber-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-600 mt-1">
                            <span>{fmt(spent)}</span>
                            <span>{fmt(budget)}</span>
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Flat list ── */
        <div className="space-y-3">
          {filteredProjects.map((proj) => {
            const statusObj = STATUS_OPTIONS.find((s) => s.value === proj.status) || STATUS_OPTIONS[0];
            const spent = spendByProject[proj.id] || 0;
            const budget = proj.total_budget || 0;
            const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
            const logs = logCountByProject[proj.id] || 0;

            return (
              <button
                key={proj.id}
                type="button"
                onClick={() => openDetail(proj)}
                className="w-full text-left bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl p-4 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-100 truncate">{proj.name}</p>
                    {proj.client_name && (
                      <p className="text-xs text-slate-400 truncate">{proj.client_name}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusObj.color} flex-shrink-0 ml-2`}>
                    {statusObj.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  {proj.address && (
                    <span className="flex items-center gap-1 truncate max-w-[200px]">
                      <MapPin className="h-3 w-3 flex-shrink-0" /> {proj.address}
                    </span>
                  )}
                  {logs > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {logs} log{logs !== 1 ? 's' : ''}
                    </span>
                  )}
                  {spent > 0 && (
                    <span className="flex items-center gap-1 text-amber-500">
                      <DollarSign className="h-3 w-3" /> {fmt(spent)}
                    </span>
                  )}
                </div>

                {budget > 0 && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : 'bg-amber-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-600 mt-1">
                      <span>{fmt(spent)}</span>
                      <span>{fmt(budget)}</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
