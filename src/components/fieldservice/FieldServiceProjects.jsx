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
  Eye, Camera, Shield, Copy, User, Users, LayoutList, Phone, HardHat, Briefcase,
} from 'lucide-react';

/** Budget bar color: amber shades only — no red. */
function budgetBarColor(pct) {
  if (pct >= 95) return 'bg-amber-700';
  if (pct >= 75) return 'bg-primary/80';
  return 'bg-primary';
}

function parseWorkers(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object' && Array.isArray(val.items)) return val.items;
  return [];
}

function generateCONumber(existingCOs) {
  const year = new Date().getFullYear();
  const prefix = `CO-${year}-`;
  const seqs = (existingCOs || [])
    .map((co) => co.change_order_number || '')
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));
  const next = seqs.length > 0 ? Math.max(...seqs) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

const INPUT_CLASS =
  'w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent';
const LABEL_CLASS = 'block text-foreground-soft text-sm font-medium mb-1';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'paused', label: 'Paused', color: 'bg-primary/20 text-primary-hover' },
  { value: 'completed', label: 'Completed', color: 'bg-muted-foreground/20 text-muted-foreground' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-muted-foreground/20 text-muted-foreground/70' },
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

export default function FieldServiceProjects({ profile, currentUser, onNavigateTab, features }) {
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
  const [showCOForm, setShowCOForm] = useState(false);
  const [coTitle, setCOTitle] = useState('');
  const [coDescription, setCODescription] = useState('');
  const [coItems, setCOItems] = useState([{ id: `co_${Date.now()}`, category: 'materials', description: '', quantity: 1, unit_price: 0, amount: 0 }]);
  const [expandedCO, setExpandedCO] = useState(null);

  // ─── Query: All projects ────────────────────────
  const { data: projects = [], isLoading } = useQuery({
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

  // ─── Query: Log counts per project ─────────────
  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['fs-daily-logs-all', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSDailyLog.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Material totals ────────────────────
  const { data: allMaterials = [] } = useQuery({
    queryKey: ['fs-materials-all', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSMaterialEntry.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Labor totals ──────────────────────
  const { data: allLabor = [] } = useQuery({
    queryKey: ['fs-labor-all', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSLaborEntry.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Clients ──────────────────────────
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
      try {
        const list = await base44.entities.FSEstimate.filter({ id: selectedProject.estimate_id });
        return Array.isArray(list) && list[0] ? list[0] : null;
      } catch { return null; }
    },
    enabled: !!selectedProject?.estimate_id,
  });

  // ─── Query: Per-project materials & labor (matches Timeline pattern) ───
  const { data: projectMaterials = [] } = useQuery({
    queryKey: ['fs-project-materials', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      try {
        const list = await base44.entities.FSMaterialEntry.filter({ project_id: selectedId });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!selectedId,
  });

  const { data: projectLabor = [] } = useQuery({
    queryKey: ['fs-project-labor', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      try {
        const list = await base44.entities.FSLaborEntry.filter({ project_id: selectedId });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!selectedId,
  });

  const { data: projectPhotos = [] } = useQuery({
    queryKey: ['fs-project-photos', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      try {
        const list = await base44.entities.FSDailyPhoto.filter({ project_id: selectedId });
        return Array.isArray(list) ? list : list ? [list] : [];
      } catch { return []; }
    },
    enabled: !!selectedId,
  });

  // ─── Query: Change Orders ──────────────────────
  const { data: changeOrders = [] } = useQuery({
    queryKey: ['fs-change-orders', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject?.id) return [];
      try {
        const list = await base44.entities.FSChangeOrder.filter({ project_id: selectedProject.id });
        return (Array.isArray(list) ? list : list ? [list] : [])
          .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
      } catch { return []; }
    },
    enabled: !!selectedProject?.id,
  });

  const projectSpent = useMemo(() => {
    const matTotal = projectMaterials.reduce((s, m) => s + (m.total_cost || 0), 0);
    const labTotal = projectLabor.reduce((s, l) => s + (l.total_cost || 0), 0);
    return matTotal + labTotal;
  }, [projectMaterials, projectLabor]);

  // ─── People assigned to selected project ─────────
  const assignedTeam = useMemo(() => {
    if (!selectedId) return [];
    const people = parseWorkers(profile?.workers_json);
    return people.filter(
      (p) => Array.isArray(p.assigned_projects) && p.assigned_projects.includes(selectedId)
    );
  }, [selectedId, profile?.workers_json]);

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
      // Sync inline client fields from live FSClient
      const live = data.client_id ? clientMap[data.client_id] : null;
      return base44.entities.FSProject.create({
        ...data,
        profile_id: profile.id,
        user_id: currentUser?.id,
        client_id: data.client_id || null,
        client_name: live?.name || data.client_name || '',
        client_email: live?.email || data.client_email || '',
        client_phone: live?.phone || data.client_phone || '',
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
      // Sync inline client fields from live FSClient
      const live = data.client_id ? clientMap[data.client_id] : null;
      const payload = {
        ...data,
        total_budget: parseFloat(data.total_budget) || 0,
      };
      if (live) {
        payload.client_name = live.name || data.client_name || '';
        payload.client_email = live.email || data.client_email || '';
        payload.client_phone = live.phone || data.client_phone || '';
      }
      return base44.entities.FSProject.update(id, payload);
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

  const createCOMutation = useMutation({
    mutationFn: async () => {
      const validItems = coItems.filter((it) => it.description?.trim() || (parseFloat(it.amount) || 0) !== 0);
      const subtotal = validItems.reduce((s, it) => s + (parseFloat(it.amount) || ((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0))), 0);
      return base44.entities.FSChangeOrder.create({
        project_id: selectedProject.id,
        estimate_id: selectedProject.estimate_id || null,
        user_id: currentUser?.id,
        workspace_id: profile?.id,
        change_order_number: generateCONumber(changeOrders),
        title: coTitle.trim(),
        description: coDescription.trim(),
        line_items: { items: validItems },
        subtotal,
        total: subtotal,
        status: 'draft',
        created_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fs-change-orders', selectedProject?.id]);
      toast.success('Change order created');
      setShowCOForm(false);
      setCOTitle('');
      setCODescription('');
      setCOItems([{ id: `co_${Date.now()}`, category: 'materials', description: '', quantity: 1, unit_price: 0, amount: 0 }]);
    },
    onError: (err) => toast.error(err?.message || 'Failed to create change order'),
  });

  const acceptCOMutation = useMutation({
    mutationFn: async (co) => {
      await base44.entities.FSChangeOrder.update(co.id, {
        status: 'accepted',
        accepted_date: new Date().toISOString(),
      });
      // Update project budget: original + all accepted COs
      const allCOs = changeOrders.map((c) => c.id === co.id ? { ...c, status: 'accepted' } : c);
      const coTotal = allCOs.filter((c) => c.status === 'accepted').reduce((s, c) => s + (parseFloat(c.total) || 0), 0);
      const originalBudget = parseFloat(selectedProject.original_budget || selectedProject.total_budget) || 0;
      await base44.entities.FSProject.update(selectedProject.id, {
        total_budget: originalBudget + coTotal,
        original_budget: originalBudget, // preserve original
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fs-change-orders', selectedProject?.id]);
      queryClient.invalidateQueries(['fs-projects', profile?.id]);
      toast.success('Change order accepted, budget updated');
    },
    onError: (err) => toast.error(err?.message || 'Failed to accept change order'),
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
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
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
        onViewEstimate={() => { if (onNavigateTab) onNavigateTab('estimates'); else toast.info('Navigate to Estimates tab to view details'); }}
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
          className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm mb-2 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h2 className="text-xl font-bold text-foreground">
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
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Client info</p>
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
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">$</span>
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
              className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-xl py-3 transition-colors min-h-[44px] disabled:opacity-50"
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
              className="px-6 py-3 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-transparent transition-colors min-h-[44px]"
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

    // Live client data from FSClient (source of truth), fallback to inline copies
    const liveClient = proj.client_id ? clientMap[proj.client_id] : null;
    const clientName = liveClient?.name || proj.client_name;
    const clientPhone = liveClient?.phone || proj.client_phone;
    const clientEmail = liveClient?.email || proj.client_email;

    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => { setView('list'); setSelectedId(null); }}
          className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm mb-2 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" /> All Projects
        </button>

        {/* Project Header */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-foreground">{proj.name}</h2>
              {clientName && (
                proj.client_id ? (
                  <button
                    type="button"
                    onClick={() => { setClientDetailId(proj.client_id); setView('client_detail'); }}
                    className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover mt-1 transition-colors"
                  >
                    <User className="h-3.5 w-3.5" /> {clientName}
                  </button>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">{clientName}</p>
                )
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusObj.color} flex-shrink-0 ml-3`}>
              {statusObj.label}
            </span>
          </div>

          {proj.address && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span>{proj.address}</span>
            </div>
          )}

          {(proj.start_date || proj.estimated_end_date) && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-2">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>
                {proj.start_date ? fmtDate(proj.start_date) : '—'}
                {' → '}
                {proj.estimated_end_date ? fmtDate(proj.estimated_end_date) : '—'}
              </span>
            </div>
          )}

          {proj.description && (
            <p className="text-sm text-foreground-soft mt-3">{proj.description}</p>
          )}

          {(clientPhone || clientEmail) && (
            <div className="flex flex-wrap gap-3 mt-3 text-sm text-muted-foreground">
              {clientPhone && <a href={`tel:${clientPhone.replace(/\D/g, '')}`} className="hover:text-primary transition-colors">Phone: {formatPhone(clientPhone)}</a>}
              {clientEmail && <a href={`mailto:${clientEmail}`} className="hover:text-primary transition-colors">Email: {clientEmail}</a>}
            </div>
          )}

          {/* Client Visibility Toggle — inline in header */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-border px-1">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-foreground">Client sees: {proj.client_show_breakdown ? 'Full breakdown' : 'Total only'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Toggle to change what clients see in the portal</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const current = proj.client_show_breakdown === true;
                updateProject.mutate({ id: proj.id, data: { client_show_breakdown: !current } });
              }}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                proj.client_show_breakdown ? 'bg-primary' : 'bg-surface'
              }`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-slate-100 transition-transform ${
                proj.client_show_breakdown ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Status Quick Change */}
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-3">Change status</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                type="button"
                disabled={s.value === proj.status || updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id: proj.id, status: s.value })}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[44px] ${
                  s.value === proj.status
                    ? `${s.color} ring-2 ring-white/20`
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                } disabled:opacity-50`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Assigned Team */}
        {assignedTeam.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Assigned Team</h3>
            <div className="space-y-2">
              {assignedTeam.map((person, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-2.5">
                  {person.role === 'subcontractor' ? (
                    <Briefcase className="h-4 w-4 text-sky-400 flex-shrink-0" />
                  ) : (
                    <HardHat className="h-4 w-4 text-primary-hover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{person.name}</p>
                    {person.company_name && (
                      <p className="text-xs text-muted-foreground/70">{person.company_name}</p>
                    )}
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    person.role === 'subcontractor' ? 'bg-sky-500/20 text-sky-400' : 'bg-primary/20 text-primary-hover'
                  }`}>
                    {person.role === 'subcontractor' ? 'Sub' : 'Worker'}
                  </span>
                  {person.phone && (
                    <a href={`tel:${person.phone.replace(/\D/g, '')}`} className="text-muted-foreground/70 hover:text-primary transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Budget & Spend */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Budget</p>
            <p className="text-lg font-bold text-foreground">{budget > 0 ? fmt(budget) : '—'}</p>
            {/* Budget breakdown with change orders */}
            {(() => {
              const acceptedCOs = changeOrders.filter((co) => co.status === 'accepted');
              if (acceptedCOs.length === 0) return null;
              const originalBudget = parseFloat(proj.original_budget || proj.total_budget) || 0;
              const coTotal = acceptedCOs.reduce((s, co) => s + (parseFloat(co.total) || 0), 0);
              return (
                <div className="flex items-center gap-3 text-xs text-muted-foreground/70 mt-1">
                  <span>Original: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(originalBudget)}</span>
                  <span>|</span>
                  <span className="text-primary-hover">COs: {coTotal >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(coTotal)}</span>
                </div>
              );
            })()}
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Spent</p>
            <p className="text-lg font-bold text-primary">{fmt(spent)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Remaining</p>
            <p className={`text-lg font-bold ${budget > 0 && spent > budget ? 'text-red-400' : 'text-foreground'}`}>
              {budget > 0 ? fmt(budget - spent) : '—'}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Daily Logs</p>
            <p className="text-lg font-bold text-foreground">{logCount}</p>
          </div>
        </div>

        {/* Budget Progress */}
        {budget > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Budget used</span>
              <span className="text-foreground-soft">{Math.round(pct)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${budgetBarColor(pct)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Financial Ledger */}
        {(() => {
          // Parse estimate line items by category for comparison
          const estLineItems = selectedEstimate ? (() => {
            const raw = selectedEstimate.line_items;
            const items = Array.isArray(raw) ? raw : (raw?.items || []);
            if (typeof items[0] === 'string') try { return JSON.parse(items[0]); } catch { return []; }
            return items;
          })() : [];

          const estByCategory = {};
          for (const it of estLineItems) {
            const cat = it.category || 'materials';
            const amt = parseFloat(it.amount) || ((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0));
            estByCategory[cat] = (estByCategory[cat] || 0) + amt;
          }

          // Actual costs by category
          const matTotal = projectMaterials.reduce((s, m) => s + (parseFloat(m.total_cost) || 0), 0);
          const labTotal = projectLabor.reduce((s, l) => s + (parseFloat(l.total_cost) || 0), 0);

          const actualByCategory = {
            materials: matTotal,
            labor: labTotal,
            // Subcontractor and other costs aren't tracked separately yet — show estimated only
          };

          const LEDGER_CATS = [
            { key: 'materials', label: 'Materials' },
            { key: 'labor', label: 'Labor' },
            { key: 'subcontractor', label: 'Subcontractors' },
            { key: 'fee', label: 'Fees' },
            { key: 'other', label: 'Other' },
          ];

          const hasEstimate = selectedEstimate && Object.keys(estByCategory).length > 0;
          const totalEstimated = Object.values(estByCategory).reduce((s, v) => s + v, 0);
          const totalActual = matTotal + labTotal;
          const totalVariance = totalEstimated - totalActual;

          // Only show if there's meaningful data
          if (!hasEstimate && totalActual === 0) return null;

          const varianceColor = (v) => {
            if (v > 0) return 'text-emerald-400';
            if (v < 0) return 'text-red-400';
            return 'text-muted-foreground';
          };

          return (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <LayoutList className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Financial Ledger</h3>
                </div>

                {/* Category breakdown table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground font-medium text-xs">Category</th>
                        {hasEstimate && <th className="text-right py-2 text-muted-foreground font-medium text-xs">Estimated</th>}
                        <th className="text-right py-2 text-muted-foreground font-medium text-xs">Actual</th>
                        {hasEstimate && <th className="text-right py-2 text-muted-foreground font-medium text-xs">Variance</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {LEDGER_CATS.filter((c) => (estByCategory[c.key] || 0) > 0 || (actualByCategory[c.key] || 0) > 0).map((c) => {
                        const est = estByCategory[c.key] || 0;
                        const act = actualByCategory[c.key] || 0;
                        const v = est - act;
                        return (
                          <tr key={c.key} className="border-b border-border/50">
                            <td className="py-2 text-foreground-soft">{c.label}</td>
                            {hasEstimate && <td className="py-2 text-right text-muted-foreground">{fmt(est)}</td>}
                            <td className="py-2 text-right text-foreground">{fmt(act)}</td>
                            {hasEstimate && (
                              <td className={`py-2 text-right font-medium ${varianceColor(v)}`}>
                                {v >= 0 ? '+' : ''}{fmt(v)}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border">
                        <td className="py-2 text-foreground font-bold">Totals</td>
                        {hasEstimate && <td className="py-2 text-right text-foreground-soft font-bold">{fmt(totalEstimated)}</td>}
                        <td className="py-2 text-right text-primary font-bold">{fmt(totalActual)}</td>
                        {hasEstimate && (
                          <td className={`py-2 text-right font-bold ${varianceColor(totalVariance)}`}>
                            {totalVariance >= 0 ? '+' : ''}{fmt(totalVariance)}
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Linked Estimate */}
        {proj.estimate_id && (
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-foreground-soft text-sm">
              <FileText className="h-4 w-4 text-primary" />
              <span>Created from estimate</span>
            </div>
            <span className="text-xs text-muted-foreground/70">{proj.estimate_id}</span>
          </div>
        )}

        {/* Payments */}
        {features?.payments_enabled !== false && (
        <FieldServicePayments
          projectId={proj.id}
          profileId={profile?.id}
          currentUser={currentUser}
          estimateTotal={selectedEstimate?.total || 0}
          budgetTotal={proj.total_budget || 0}
        />
        )}

        {/* Permits */}
        {features?.permits_enabled !== false && (
          <FieldServicePermits projectId={proj.id} profileId={profile?.id} currentUser={currentUser} />
        )}

        {/* Photo Gallery */}
        <FieldServicePhotoGallery
          projectId={proj.id}
          phases={Array.isArray(profile?.phase_labels) ? profile.phase_labels : (profile?.phase_labels?.items || ['Before', 'Demo', 'Framing', 'Rough-in', 'Finish', 'Final'])}
        />

        {/* ═══ Change Orders ═══ */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider">
              Change Orders {changeOrders.length > 0 && <span className="text-muted-foreground/70 ml-1">({changeOrders.length})</span>}
            </h3>
            <button type="button" onClick={() => setShowCOForm((prev) => !prev)}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover min-h-[44px]">
              <Plus className="h-4 w-4" /> New Change Order
            </button>
          </div>

          {/* CO Form */}
          {showCOForm && (
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              <input type="text" value={coTitle} onChange={(e) => setCOTitle(e.target.value)}
                className="w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="What changed? e.g., Additional bathroom scope" />
              <textarea value={coDescription} onChange={(e) => setCODescription(e.target.value)}
                className="w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px]"
                placeholder="Why did it change?" rows={2} />

              {/* CO Line Items */}
              {coItems.map((item, idx) => (
                <div key={item.id} className="bg-secondary/50 rounded-lg p-3 space-y-2">
                  <input type="text" value={item.description}
                    onChange={(e) => {
                      const next = [...coItems]; next[idx] = { ...next[idx], description: e.target.value }; setCOItems(next);
                    }}
                    className="w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Description" />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground/70">Qty</label>
                      <input type="number" value={item.quantity}
                        onChange={(e) => {
                          const next = [...coItems]; const q = e.target.value; next[idx] = { ...next[idx], quantity: q, amount: (parseFloat(q) || 0) * (parseFloat(next[idx].unit_price) || 0) }; setCOItems(next);
                        }}
                        onFocus={(e) => { if (parseFloat(e.target.value) === 0) { const next = [...coItems]; next[idx] = { ...next[idx], quantity: '' }; setCOItems(next); } }}
                        onBlur={(e) => { if (e.target.value === '') { const next = [...coItems]; next[idx] = { ...next[idx], quantity: 0 }; setCOItems(next); } }}
                        className="w-full bg-secondary border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        min="0" step="any" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground/70">Unit Price</label>
                      <input type="number" value={item.unit_price}
                        onChange={(e) => {
                          const next = [...coItems]; const p = e.target.value; next[idx] = { ...next[idx], unit_price: p, amount: (parseFloat(next[idx].quantity) || 0) * (parseFloat(p) || 0) }; setCOItems(next);
                        }}
                        onFocus={(e) => { if (parseFloat(e.target.value) === 0) { const next = [...coItems]; next[idx] = { ...next[idx], unit_price: '' }; setCOItems(next); } }}
                        onBlur={(e) => { if (e.target.value === '') { const next = [...coItems]; next[idx] = { ...next[idx], unit_price: 0 }; setCOItems(next); } }}
                        className="w-full bg-secondary border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        step="0.01" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground/70">Amount</label>
                      <input type="number" value={item.amount}
                        onChange={(e) => {
                          const next = [...coItems]; next[idx] = { ...next[idx], amount: e.target.value }; setCOItems(next);
                        }}
                        onFocus={(e) => { if (parseFloat(e.target.value) === 0) { const next = [...coItems]; next[idx] = { ...next[idx], amount: '' }; setCOItems(next); } }}
                        onBlur={(e) => { if (e.target.value === '') { const next = [...coItems]; next[idx] = { ...next[idx], amount: (parseFloat(next[idx].quantity) || 0) * (parseFloat(next[idx].unit_price) || 0) }; setCOItems(next); } }}
                        className="w-full bg-secondary border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        step="0.01" />
                    </div>
                  </div>
                  {coItems.length > 1 && (
                    <button type="button" onClick={() => setCOItems((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-xs text-muted-foreground/70 hover:text-primary">Remove</button>
                  )}
                </div>
              ))}

              <button type="button" onClick={() => setCOItems((prev) => [...prev, { id: `co_${Date.now()}_${prev.length}`, category: 'materials', description: '', quantity: 1, unit_price: 0, amount: 0 }])}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary-hover min-h-[44px]">
                <Plus className="h-4 w-4" /> Add Line Item
              </button>

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm text-muted-foreground">Total: <span className="text-primary font-bold">{fmt(coItems.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0))}</span></span>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowCOForm(false)}
                    className="px-3 py-2 rounded-lg border border-border text-foreground-soft hover:text-foreground text-sm min-h-[44px]">Cancel</button>
                  <button type="button" disabled={!coTitle.trim() || createCOMutation.isPending}
                    onClick={() => createCOMutation.mutate()}
                    className="px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm min-h-[44px] disabled:opacity-50">
                    {createCOMutation.isPending ? 'Saving...' : 'Save Draft'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Existing Change Orders */}
          {changeOrders.length > 0 && (
            <div className="divide-y divide-border">
              {changeOrders.map((co) => {
                const coSc = co.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' : co.status === 'sent' ? 'bg-primary/20 text-primary-hover' : 'bg-muted-foreground/20 text-muted-foreground';
                const coLineItems = (() => { const li = co.line_items; if (Array.isArray(li)) return li; if (li?.items) return li.items; return []; })();
                const isExpanded = expandedCO === co.id;
                return (
                  <div key={co.id} className="px-4 py-3">
                    <button type="button" onClick={() => setExpandedCO(isExpanded ? null : co.id)}
                      className="w-full flex items-center justify-between text-left min-h-[44px]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{co.title || 'Change Order'}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${coSc}`}>{co.status || 'draft'}</span>
                        </div>
                        <p className="text-xs text-muted-foreground/70">{co.change_order_number}</p>
                      </div>
                      <span className={`text-sm font-bold ${(parseFloat(co.total) || 0) >= 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                        {(parseFloat(co.total) || 0) >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(co.total || 0)}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="mt-2 pl-2 space-y-2">
                        {co.description && <p className="text-xs text-muted-foreground">{co.description}</p>}
                        {coLineItems.length > 0 && (
                          <div className="space-y-1">
                            {coLineItems.map((it, i) => (
                              <div key={i} className="flex justify-between text-xs text-muted-foreground">
                                <span>{it.description || '\u2014'}</span>
                                <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(it.amount) || 0)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {co.status === 'draft' && (
                          <div className="flex gap-2 pt-1">
                            <button type="button" onClick={() => acceptCOMutation.mutate(co)}
                              className="text-xs text-emerald-400 hover:text-emerald-300 min-h-[44px]">
                              Accept & Update Budget
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Logs */}
        {projectLogs.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-lg font-bold text-foreground mb-3">Recent Logs</h3>
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
                  <div key={log.id} className="bg-secondary/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground/70">{fmtDate(log.date)}</span>
                      {log.day_number && (
                        <span className="text-xs text-muted-foreground/70">
                          {String(log.day_number).startsWith('Day ') ? log.day_number : `Day ${log.day_number}`}
                        </span>
                      )}
                    </div>
                    {taskPreview && (
                      <p className="text-sm text-foreground-soft line-clamp-2">{taskPreview}</p>
                    )}
                    {log.weather && (
                      <p className="text-xs text-muted-foreground/70 mt-1">{log.weather}</p>
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
                              className="h-14 w-14 rounded-lg overflow-hidden border border-border hover:border-primary transition-colors flex-shrink-0"
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
                <p className="text-xs text-muted-foreground/70 text-center pt-2">
                  + {projectLogs.length - 5} more logs
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        {proj.notes && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
            <p className="text-sm text-foreground-soft whitespace-pre-wrap">{proj.notes}</p>
          </div>
        )}

        {/* Client Portal + Timeline Links */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/client-portal/${profile?.id}/${proj.id}`;
              window.open(url, '_blank');
            }}
            className="flex-1 flex items-center justify-center gap-2 border border-primary/30 text-primary hover:bg-primary/10 hover:bg-transparent rounded-xl py-3 transition-colors text-sm font-medium min-h-[44px]"
          >
            <Eye className="h-4 w-4" /> Preview as Client
          </button>
          <button
            type="button"
            onClick={() => {
              const url = `${window.location.origin}/client-portal/${profile?.id}/${proj.id}`;
              navigator.clipboard.writeText(url).then(() => toast.success('Client link copied!'));
            }}
            className="flex items-center justify-center gap-2 border border-border text-foreground-soft hover:text-primary hover:border-primary hover:bg-transparent rounded-xl py-3 px-4 transition-colors text-sm font-medium min-h-[44px]"
          >
            <Copy className="h-4 w-4" /> Copy Link
          </button>
          {features?.timeline_enabled !== false && projectLogs.length > 0 && (
            <button
              type="button"
              onClick={() => { setTimelineProjectId(proj.id); setView('timeline'); }}
              className="flex-1 flex items-center justify-center gap-2 border border-border text-foreground-soft hover:text-primary hover:border-primary hover:bg-transparent rounded-xl py-3 transition-colors text-sm font-medium min-h-[44px]"
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
            className="flex-1 flex items-center justify-center gap-2 bg-secondary hover:bg-surface text-foreground-soft rounded-xl py-3 transition-colors min-h-[44px]"
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
                className="px-6 py-2 bg-red-600 hover:bg-red-500 text-foreground rounded-lg font-medium transition-colors min-h-[44px] disabled:opacity-50"
              >
                {deleteProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-6 py-2 bg-secondary text-muted-foreground rounded-lg transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Photo Lightbox */}
        {lightboxPhoto && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
            <button type="button" onClick={() => setLightboxPhoto(null)} className="absolute top-4 right-4 text-foreground/80 hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center">
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
        <h2 className="text-xl font-bold text-foreground">Projects</h2>
        <button
          type="button"
          onClick={openCreateForm}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-4 py-2 rounded-xl transition-colors text-sm min-h-[44px]"
        >
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>

      {/* Search + Filter + Group Toggle */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 text-muted-foreground/70 absolute left-3 top-1/2 -translate-y-1/2" />
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
              ? 'border-primary text-primary bg-primary/10'
              : 'border-border text-muted-foreground hover:text-primary hover:border-primary'
          }`}
        >
          {groupByClient ? <Users className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
        </button>
      </div>

      {/* Project Cards */}
      {filteredProjects.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {projects.length === 0
              ? 'No projects yet. Create your first project to get started.'
              : 'No projects match your filters.'}
          </p>
          {projects.length === 0 && (
            <button
              type="button"
              onClick={openCreateForm}
              className="mt-4 text-primary hover:text-primary-hover font-medium text-sm"
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
                    ? 'text-primary hover:text-primary-hover transition-colors'
                    : 'text-muted-foreground/70 cursor-default'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                {group.clientName}
                <span className="text-muted-foreground/50 font-normal">({group.projects.length})</span>
              </button>

              <div className="space-y-2 pl-1 border-l-2 border-border ml-1.5">
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
                      className="w-full text-left bg-card border border-border hover:border-primary/50 rounded-xl p-4 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-foreground truncate min-w-0 flex-1">{proj.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusObj.color} flex-shrink-0 ml-2`}>
                          {statusObj.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/70">
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
                          <span className="flex items-center gap-1 text-primary">
                            <DollarSign className="h-3 w-3" /> {fmt(spent)}
                          </span>
                        )}
                      </div>

                      {budget > 0 && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${budgetBarColor(pct)}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground/50 mt-1">
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
                className="w-full text-left bg-card border border-border hover:border-primary/50 rounded-xl p-4 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{proj.name}</p>
                    {proj.client_name && (
                      <p className="text-xs text-muted-foreground truncate">{proj.client_name}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusObj.color} flex-shrink-0 ml-2`}>
                    {statusObj.label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground/70">
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
                    <span className="flex items-center gap-1 text-primary">
                      <DollarSign className="h-3 w-3" /> {fmt(spent)}
                    </span>
                  )}
                </div>

                {budget > 0 && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${budgetBarColor(pct)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground/50 mt-1">
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
