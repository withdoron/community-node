import React, { useState, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ClientSelector from './ClientSelector';
import LineItemsEditor from './LineItemsEditor';
import CurrencyInput from './CurrencyInput';
import VoiceInput from './VoiceInput';
import FieldServiceTimeline from './FieldServiceTimeline';
import FieldServicePayments from './FieldServicePayments';
import FieldServicePermits from './FieldServicePermits';
import FieldServicePhotoGallery from './FieldServicePhotoGallery';
import FieldServiceClientPortal from './FieldServiceClientPortal';
import FieldServiceClientDetail from './FieldServiceClientDetail';
import ProjectTileDrillIn from './ProjectTileDrillIn';
import ConfirmDeleteWithDependents from './ConfirmDeleteWithDependents';
import { softDeleteProjectWithCascade } from '@/utils/softDeleteProjectWithCascade';
import { makeItem, calcTotals } from '@/utils/fsLineItems';
import { isChangeOrderLocked } from '@/utils/fsEstimateLifecycle';
import { useFSPayments, summarizePayments } from '@/hooks/useFSPayments';
import { useProjectLinkedEstimates, deriveProjectClient } from '@/hooks/useProjectLinkedEstimates';
import { useConsumePrefill } from '@/hooks/useConsumePrefill';
import { useContractLineItems } from '@/hooks/useContractLineItems';
import { excludeDeleted } from '@/utils/softDelete';
import {
  FolderOpen, Plus, ArrowLeft, Pencil, Trash2, Loader2, Save, X,
  MapPin, Calendar, DollarSign, Clock, Search, GitBranch, FileText,
  Eye, Camera, Shield, Copy, User, Users, LayoutList, Phone, HardHat, Briefcase,
  Ban, AlertTriangle,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

// Per-project sequential CO number — format CO-001, CO-002, ...
// Reads any 3+ digit number out of existing change_order_number values for the
// same project (handles legacy CO-2026-001 and bare CO-001 alike) and increments.
function generateCONumber(existingCOs) {
  const seqs = (existingCOs || [])
    .map((co) => co.change_order_number || '')
    .map((n) => {
      const match = n.match(/(\d+)\s*$/);
      return match ? parseInt(match[1], 10) : NaN;
    })
    .filter((n) => !isNaN(n));
  const next = seqs.length > 0 ? Math.max(...seqs) + 1 : 1;
  return `CO-${String(next).padStart(3, '0')}`;
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
  const [editingCOId, setEditingCOId] = useState(null); // null = creating; id = editing draft
  const [coForm, setCOForm] = useState({
    title: '',
    description: '',
    line_items: [makeItem()],
    management_fee_pct: 0,
    insurance_fee_pct: 0,
    overhead_profit_pct: 0,
    tax_rate: 0,
    other_amount: 0,
  });
  const [expandedCO, setExpandedCO] = useState(null);
  // Dialog state for CO Delete (drafts) and CO Void (signed/accepted).
  // Two separate dialogs because the friction levels are different — drafts
  // get one click, signed COs get a typed confirmation.
  const [deleteCOTarget, setDeleteCOTarget] = useState(null);
  const [voidCOTarget, setVoidCOTarget] = useState(null);
  const [voidConfirmText, setVoidConfirmText] = useState('');
  const [voidReason, setVoidReason] = useState('');
  // Tile drill-in: which tile's source records are being audited.
  // null = closed, otherwise one of: 'contract' | 'received' | 'paid' | 'net' | 'spent' | 'remaining' | 'logs'.
  const [drillIn, setDrillIn] = useState(null);

  // Pre-fill helper — reads a percentage from the parent estimate, falling back to 0.
  const parseEstimatePct = (estimate, field) => {
    const v = parseFloat(estimate?.[field]);
    return Number.isFinite(v) ? v : 0;
  };

  const openCOForm = () => {
    setEditingCOId(null);
    setCOForm({
      title: '',
      description: '',
      line_items: [makeItem()],
      management_fee_pct: parseEstimatePct(parentEstimate, 'management_fee_pct'),
      insurance_fee_pct: parseEstimatePct(parentEstimate, 'insurance_fee_pct'),
      overhead_profit_pct: parseEstimatePct(parentEstimate, 'overhead_profit_pct'),
      tax_rate: parseEstimatePct(parentEstimate, 'tax_rate'),
      other_amount: 0,
    });
    setShowCOForm(true);
  };

  // Open the same builder pre-populated with an existing draft CO's values.
  // Edit is only available in 'draft' state — once a CO transitions to
  // awaiting_signature / signed / accepted / declined it's locked.
  const openEditCOForm = (co) => {
    if (co.status !== 'draft') return;
    const rawItems = co.line_items;
    const items = Array.isArray(rawItems)
      ? rawItems
      : (rawItems?.items && Array.isArray(rawItems.items)) ? rawItems.items
      : [];
    const hydrated = items.length > 0
      ? items.map((it) => ({
          id: it.id || `co_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          category: it.category || 'materials',
          trade_category_id: it.trade_category_id || '',
          description: it.description || '',
          quantity: it.quantity ?? 1,
          unit_price: it.unit_price ?? 0,
          amount: it.amount ?? 0,
          sub_name: it.sub_name || '',
        }))
      : [makeItem()];
    setEditingCOId(co.id);
    setCOForm({
      title: co.title || '',
      description: co.description || '',
      line_items: hydrated,
      management_fee_pct: parseFloat(co.management_fee_pct) || 0,
      insurance_fee_pct: parseFloat(co.insurance_fee_pct) || 0,
      overhead_profit_pct: parseFloat(co.overhead_profit_pct) || 0,
      tax_rate: parseFloat(co.tax_rate) || 0,
      other_amount: parseFloat(co.other_amount) || 0,
    });
    setExpandedCO(null);
    setShowCOForm(true);
  };

  const setCOField = (field, value) => setCOForm((prev) => ({ ...prev, [field]: value }));
  const setCOLineItems = (items) => setCOForm((prev) => ({ ...prev, line_items: items }));
  const coTotals = useMemo(
    () => calcTotals(coForm.line_items, coForm.overhead_profit_pct, coForm.tax_rate, coForm.other_amount, coForm.management_fee_pct, coForm.insurance_fee_pct),
    [coForm.line_items, coForm.overhead_profit_pct, coForm.tax_rate, coForm.other_amount, coForm.management_fee_pct, coForm.insurance_fee_pct],
  );

  // ─── Query: All projects ────────────────────────
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['fs-projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSProject.filter({ profile_id: profile.id });
        const arr = Array.isArray(list) ? list : list ? [list] : [];
        // IF-008 Session 1: hide soft-deleted projects and the Unassigned
        // sentinel from the project list. Session 2 sweeps the remaining
        // consumer surfaces (Home tab, pickers, drill-ins).
        return arr.filter((p) => !p.deleted_at && p.is_unassigned !== true);
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Workspace-wide estimates + project_id → estimate map ─────
  // Empty-field link derivation (5f35c0f → this commit's sweep). Lifted to
  // a shared hook once 3+ surfaces (this file's grouping/header/cards/drill-
  // in subtitles, FSLog project picker, FSDocument project filter) needed
  // the same lookup. See src/hooks/useProjectLinkedEstimates.js for the
  // multi-estimate dedup rule + invalidation contract.
  const { projectIdToEstimate } = useProjectLinkedEstimates(profile?.id);

  // ─── Query: Log counts per project ─────────────
  const { data: dailyLogs = [] } = useQuery({
    queryKey: ['fs-daily-logs-all', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSDailyLog.filter({ profile_id: profile.id });
        return excludeDeleted(Array.isArray(list) ? list : list ? [list] : []);
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
        return excludeDeleted(Array.isArray(list) ? list : list ? [list] : []);
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
        return excludeDeleted(Array.isArray(list) ? list : list ? [list] : []);
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Query: Workspace-wide payments (Phase 1.0 commit 1) ─────────────
  // Workspace-scoped FSPayment cache, shared with FieldServiceHome's
  // Desk Home Received tile via the same cache key (DEC-196 / DEC-202
  // invalidation discipline). Drives spendByProject's new sub-payment
  // contribution per spec §12 Q3 — projectSpent honesty: sub payments
  // are Bari's actual costs and should land in the spent rollup.
  const { data: allPayments = [] } = useQuery({
    queryKey: ['fs-payments-all', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSPayment.filter({ profile_id: profile.id });
        return excludeDeleted(Array.isArray(list) ? list : list ? [list] : []);
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

  // Phase 1.0 commit 1: spendByProject now includes settled FSPayment(paid)
  // records grouped by project_id. Per LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL
  // §12 Q3 lock: sub payments ARE Bari's actual costs; including them in
  // the spent rollup matches FINANCIAL-WORKFLOW-SPEC §2.4 intent. List-view
  // Spent column reads through here.
  const spendByProject = useMemo(() => {
    const map = {};
    allMaterials.forEach((m) => {
      if (m.project_id && !m.deleted_at) map[m.project_id] = (map[m.project_id] || 0) + (m.total_cost || 0);
    });
    allLabor.forEach((l) => {
      if (l.project_id && !l.deleted_at) map[l.project_id] = (map[l.project_id] || 0) + (l.total_cost || 0);
    });
    allPayments.forEach((p) => {
      // Settled + direction='paid' only (out-going to subs/vendors).
      // Direction defaults to 'received' per FSPayment.jsonc schema, so
      // legacy records without direction are NOT counted as paid.
      if (!p.project_id) return;
      if (p.deleted_at) return;
      if (p.direction !== 'paid') return;
      if (p.status !== 'received' && p.status !== 'cleared') return;
      map[p.project_id] = (map[p.project_id] || 0) + (parseFloat(p.amount) || 0);
    });
    return map;
  }, [allMaterials, allLabor, allPayments]);

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

  // Group projects by client. Derivation per project goes through the shared
  // deriveProjectClient chain (project.client_id → linkedEstimate.client_id →
  // denormalized inline labels). See useProjectLinkedEstimates.js for the
  // chain rules and DEC-148 extraction rationale.
  const groupedProjects = useMemo(() => {
    const groups = {};
    filteredProjects.forEach((p) => {
      const { clientId, clientName } = deriveProjectClient(p, projectIdToEstimate, clientMap);
      const key = clientId || '__unassigned__';
      if (!groups[key]) {
        groups[key] = {
          clientId,
          clientName: clientName || 'Unassigned',
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
  }, [filteredProjects, clientMap, projectIdToEstimate]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedId),
    [projects, selectedId]
  );

  // ─── Query: Estimate for selected project ─────
  // The CO builder pre-fills its O&P / tax / other fields from this estimate
  // (the project's source spine) so the contractor's most-common case is one
  // tap. Per-CO override is just normal form editing.
  //
  // Bidirectional link integrity: there are two ways an estimate ends up linked
  // to a project — convertMutation (project created from estimate, writes BOTH
  // sides) and the estimate edit form's "Link to project" select (writes only
  // estimate.project_id). The previous query gated on selectedProject.estimate_id
  // which only covered the convertMutation path; manually-linked projects came
  // back null, the contract total derivation fell through to storedTotal, and
  // the project showed Contract Total $0 (Test Project regression).
  // Read-side single source of truth: query estimates by project_id pointing
  // back at us. That field is set by both link flows, so this single lookup
  // handles both directions without requiring bidirectional writes. Falls back
  // to the legacy project.estimate_id path for any pre-existing record where
  // the inverse wasn't backfilled.
  const { data: selectedEstimate } = useQuery({
    queryKey: ['fs-project-estimate', selectedProject?.id, selectedProject?.estimate_id],
    queryFn: async () => {
      if (!selectedProject?.id) return null;
      try {
        const byProject = await base44.entities.FSEstimate.filter({ project_id: selectedProject.id });
        const linked = Array.isArray(byProject) ? byProject : byProject ? [byProject] : [];
        if (linked[0]) return linked[0];
        if (selectedProject.estimate_id) {
          const byId = await base44.entities.FSEstimate.filter({ id: selectedProject.estimate_id });
          const idList = Array.isArray(byId) ? byId : byId ? [byId] : [];
          return idList[0] || null;
        }
        return null;
      } catch { return null; }
    },
    enabled: !!selectedProject?.id,
  });
  const parentEstimate = selectedEstimate;

  // ─── Query: Per-project materials & labor (matches Timeline pattern) ───
  const { data: projectMaterials = [] } = useQuery({
    queryKey: ['fs-project-materials', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      try {
        const list = await base44.entities.FSMaterialEntry.filter({ project_id: selectedId });
        return excludeDeleted(Array.isArray(list) ? list : list ? [list] : []);
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
        return excludeDeleted(Array.isArray(list) ? list : list ? [list] : []);
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

  // ─── Query: Payments (shared cache key with FieldServicePayments view) ─
  const { data: projectPayments = [] } = useFSPayments(selectedId);
  const paymentSummary = useMemo(
    () => summarizePayments(projectPayments),
    [projectPayments]
  );

  // ─── Phase 1.0 commit 1: line-item attribution ────────────────────────
  // useContractLineItems returns the chronological union of estimate +
  // signed/accepted CO line items. Drives the per-line rollup section
  // below the existing category-level Financial Ledger. Each item carries
  // _origin / _co_number / _origin_label metadata for display labeling.
  // Spec §9 + §12 Q5 lock (chronological grouping default).
  const contractLineItems = useContractLineItems(selectedId);

  // ─── Cross-tab prefill consumers (Desk Home tile drill-in → Projects) ──
  // Two paired one-shot keys via useConsumePrefill (DEC-146):
  //   fs-projects-prefill-project-id  → open that project's detail surface
  //   fs-projects-prefill-payment-id  → after detail mounts and payments
  //                                      load, scroll-flash the matching
  //                                      Recent Payments row (mirrors the
  //                                      same-component goToPaymentRow
  //                                      pattern further down per DEC-209
  //                                      honest-navigation discipline —
  //                                      FSPayment has no edit form yet, so
  //                                      we land the user on the payment's
  //                                      actual context instead).
  // Payment-id without project-id is a no-op guard; in practice they're
  // always paired from Desk Home's Received tile.
  const prefillProjectId = useConsumePrefill('fs-projects-prefill-project-id');
  const prefillPaymentId = useConsumePrefill('fs-projects-prefill-payment-id');
  const paymentFlashConsumedRef = useRef(false);

  useEffect(() => {
    if (!prefillProjectId) return;
    setSelectedId(prefillProjectId);
    setView('detail');
  }, [prefillProjectId]);

  useEffect(() => {
    if (paymentFlashConsumedRef.current) return;
    if (!prefillPaymentId) return;
    if (selectedId !== prefillProjectId) return; // wait for project open
    if (view !== 'detail') return;
    if (projectPayments.length === 0) return;    // wait for payments query
    paymentFlashConsumedRef.current = true;
    // Two RAFs to let the Recent Payments DOM settle, then scroll + ring.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try {
        const section = document.getElementById('fs-project-payments');
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const row = document.querySelector(`[data-payment-id="${prefillPaymentId}"]`);
        if (row) {
          row.classList.add('ring-2', 'ring-primary', 'shadow-lg');
          setTimeout(() => {
            try { row.classList.remove('ring-2', 'ring-primary', 'shadow-lg'); } catch { /* unmounted */ }
          }, 1500);
        }
      } catch { /* DOM not ready or selector escape failed — silent no-op */ }
    }));
  }, [prefillPaymentId, prefillProjectId, selectedId, view, projectPayments.length]);

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

  // ─── Query: Documents linked to this project ────
  // Per-project subscriber under list/detail invalidation pair (DEC-199).
  // FieldServiceDocuments owns the list-level ['fs-documents', profile.id]
  // query; this is the project-scoped peer. Document mutations there
  // invalidate the bare ['fs-documents-by-project'] prefix so every
  // mounted subscriber refreshes regardless of project id.
  const { data: projectDocuments = [] } = useQuery({
    queryKey: ['fs-documents-by-project', selectedProject?.id],
    queryFn: async () => {
      if (!selectedProject?.id) return [];
      try {
        const list = await base44.entities.FSDocument.filter({ project_id: selectedProject.id });
        return (Array.isArray(list) ? list : list ? [list] : [])
          .filter((d) => !d.archived)
          .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
      } catch { return []; }
    },
    enabled: !!selectedProject?.id,
  });

  // Phase 1.0 commit 1: projectSpent now includes settled FSPayment(paid)
  // for this project. Same semantic as spendByProject above — sub payments
  // are real costs per spec §12 Q3 lock. The Project Detail Spent tile
  // reads this and shows "Materials + labor + sub payments" caption.
  // Filters exclude soft-deleted records (commit 1 plumbs the schema; the
  // delete UI ships in commit 2).
  const projectSpent = useMemo(() => {
    const matTotal = projectMaterials.reduce(
      (s, m) => s + (m.deleted_at ? 0 : (m.total_cost || 0)), 0
    );
    const labTotal = projectLabor.reduce(
      (s, l) => s + (l.deleted_at ? 0 : (l.total_cost || 0)), 0
    );
    const subPayTotal = projectPayments.reduce((s, p) => {
      if (p.deleted_at) return s;
      if (p.direction !== 'paid') return s;
      if (p.status !== 'received' && p.status !== 'cleared') return s;
      return s + (parseFloat(p.amount) || 0);
    }, 0);
    return matTotal + labTotal + subPayTotal;
  }, [projectMaterials, projectLabor, projectPayments]);

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
      queryClient.invalidateQueries({ queryKey: ['fs-project-detail'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-projects'] });
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
      queryClient.invalidateQueries({ queryKey: ['fs-project-detail'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-projects'] });
      toast.success('Project updated');
      setView('detail');
      setFormData(EMPTY_PROJECT);
      setEditingId(null);
    },
    onError: (err) => toast.error(err?.message || 'Failed to update project'),
  });

  // IF-008 Session 1 + rate-limit fix: replaces the prior hard-delete with
  // the cascade flow. Mutation accepts { projectId, mode, reassignTo? }.
  // The user's choice surfaces through ConfirmDeleteWithDependents.
  //
  // retry:false — the cascade has its own bounded retry-on-429 inside
  // withRetry; the mutation must not multiply that with React Query's
  // default mutation-retry behavior. Honesty over optimism: the toast
  // fires only when the cascade returns success (cascade now throws on
  // any persistent failure instead of swallowing as empty).
  const deleteProject = useMutation({
    mutationFn: ({ projectId, mode, reassignTo }) =>
      softDeleteProjectWithCascade(projectId, mode, {
        reassignTo,
        actingUserId: currentUser?.id,
      }),
    retry: false,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['fs-projects'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-detail'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-projects'] });
      queryClient.invalidateQueries({ queryKey: ['fs-payments-all'] });
      queryClient.invalidateQueries({ queryKey: ['fs-estimates'] });
      queryClient.invalidateQueries({ queryKey: ['fs-daily-logs-all'] });
      queryClient.invalidateQueries({ queryKey: ['fs-change-orders'] });
      queryClient.invalidateQueries({ queryKey: ['fs-materials-all'] });
      queryClient.invalidateQueries({ queryKey: ['fs-labor-all'] });
      queryClient.invalidateQueries({ queryKey: ['fs-documents'] });
      queryClient.invalidateQueries({ queryKey: ['fs-permits'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-dependents'] });
      const total = result?.dependentsAffected
        ? Object.values(result.dependentsAffected).reduce((s, n) => s + n, 0)
        : 0;
      if (result?.alreadyDeleted) {
        toast.success('Project already deleted');
      } else {
        toast.success(
          total > 0
            ? `Project deleted (${total} attached record${total === 1 ? '' : 's'} handled)`
            : 'Project deleted',
        );
      }
      setView('list');
      setSelectedId(null);
      setDeleteConfirm(null);
    },
    onError: (err) => {
      // Close the modal so the user isn't stuck on the "Deleting…" loader.
      // NO query invalidation on error — invalidating the same keys that
      // are mid-failure compounds the rate-limit storm. The user retries
      // from a clean state.
      setDeleteConfirm(null);
      toast.error(`Could not delete project — please try again: ${err?.message || 'request failed'}`);
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.FSProject.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-projects'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-detail'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-projects'] });
      toast.success('Status updated');
    },
    onError: (err) => toast.error(err?.message || 'Failed to update status'),
  });

  // Save mutation — creates a new CO when editingCOId is null, updates the
  // existing draft CO otherwise. Both paths recompute totals via the shared
  // calcTotals so amount stays in sync with the form's grand total.
  const saveCOMutation = useMutation({
    mutationFn: async () => {
      if (!coForm.title.trim()) {
        // FSChangeOrder.title is required at the entity level; the save button
        // is also disabled when title is empty, but throw explicitly so an
        // unexpected click path surfaces a human message instead of a Base44
        // schema error.
        throw new Error('Please enter a change order title');
      }
      const validItems = (coForm.line_items || [])
        .filter((it) => (it.description || '').trim() || (parseFloat(it.unit_price) || 0) > 0)
        .map((it) => ({
          ...it,
          amount: (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0),
        }));
      const totals = calcTotals(
        validItems,
        coForm.overhead_profit_pct,
        coForm.tax_rate,
        coForm.other_amount,
        coForm.management_fee_pct,
        coForm.insurance_fee_pct,
      );
      const payload = {
        title: coForm.title.trim(),
        description: coForm.description.trim(),
        line_items: { items: validItems },
        subtotal: totals.subtotal,
        management_fee_pct: parseFloat(coForm.management_fee_pct) || 0,
        management_fee_amount: totals.managementFeeAmount,
        insurance_fee_pct: parseFloat(coForm.insurance_fee_pct) || 0,
        insurance_fee_amount: totals.insuranceFeeAmount,
        overhead_profit_pct: parseFloat(coForm.overhead_profit_pct) || 0,
        tax_rate: parseFloat(coForm.tax_rate) || 0,
        tax_amount: totals.taxAmount,
        other_amount: parseFloat(coForm.other_amount) || 0,
        total: totals.total,
        // amount is canonical for FSProject.total_budget recompute. It carries
        // the FULL grand total — line items + management fee + insurance fee +
        // O&P + tax + other — so every signed CO contributes its complete
        // client-billed value to the parent project's contract total.
        amount: totals.total,
      };
      if (editingCOId) {
        return base44.entities.FSChangeOrder.update(editingCOId, payload);
      }
      return base44.entities.FSChangeOrder.create({
        ...payload,
        project_id: selectedProject.id,
        estimate_id: selectedProject.estimate_id || null,
        user_id: currentUser?.id,
        workspace_id: profile?.id,
        change_order_number: generateCONumber(changeOrders),
        status: 'draft',
        created_date: new Date().toISOString(),
      });
    },
    onSuccess: (_saved, _vars, _ctx) => {
      queryClient.invalidateQueries({ queryKey: ['fs-change-orders', selectedProject?.id] });
      toast.success(editingCOId ? 'Change order updated' : 'Change order created');
      setShowCOForm(false);
      setEditingCOId(null);
      setCOForm({
        title: '',
        description: '',
        line_items: [makeItem()],
        management_fee_pct: parseEstimatePct(parentEstimate, 'management_fee_pct'),
        insurance_fee_pct: parseEstimatePct(parentEstimate, 'insurance_fee_pct'),
        overhead_profit_pct: parseEstimatePct(parentEstimate, 'overhead_profit_pct'),
        tax_rate: parseEstimatePct(parentEstimate, 'tax_rate'),
        other_amount: 0,
      });
    },
    onError: (err) => toast.error(err?.message || 'Failed to save change order'),
  });

  // ─── CO signing flow (mirrors FSEstimate) ─────
  const sendCOForSignature = async (co) => {
    try {
      const portalToken = co.portal_token || crypto.randomUUID();
      await base44.entities.FSChangeOrder.update(co.id, {
        status: 'awaiting_signature',
        portal_token: portalToken,
        portal_link_active: true,
        sent_for_signature_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['fs-change-orders', selectedProject?.id] });
      const url = `${window.location.origin}/client-portal?workspace=${profile.id}&co=${co.id}&token=${portalToken}&sign=true`;
      navigator.clipboard.writeText(url).then(
        () => toast.success('Signing link copied! Share it with your client.'),
        () => toast.success('Change order sent for signature (could not copy link)'),
      );
    } catch (err) {
      toast.error(err?.message || 'Failed to send for signature');
    }
  };

  const recallCO = async (co) => {
    try {
      await base44.entities.FSChangeOrder.update(co.id, {
        status: 'draft',
        portal_link_active: false,
        recalled_at: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ['fs-change-orders', selectedProject?.id] });
      toast.success('Change order recalled. You can edit and resend.');
    } catch (err) {
      toast.error(err?.message || 'Failed to recall change order');
    }
  };

  const copyCOSigningLink = async (co) => {
    if (!co.portal_token) {
      return sendCOForSignature(co);
    }
    const url = `${window.location.origin}/client-portal?workspace=${profile.id}&co=${co.id}&token=${co.portal_token}&sign=true`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied!'),
      () => toast.error('Failed to copy link'),
    );
  };

  // Recompute parent FSProject.total_budget from signed/accepted COs.
  // amount is canonical (Phase 1 architectural primitive); falls back to total
  // for legacy records that pre-date the amount field.
  const recomputeProjectBudgetLocal = async (project, cos) => {
    const originalBudget = parseFloat(project.original_budget || project.total_budget) || 0;
    const counted = cos.filter(isChangeOrderLocked);
    const adjustments = counted.reduce((sum, c) => {
      const adj = c.amount !== undefined && c.amount !== null
        ? parseFloat(c.amount)
        : parseFloat(c.total) || 0;
      return sum + (Number.isFinite(adj) ? adj : 0);
    }, 0);
    await base44.entities.FSProject.update(project.id, {
      total_budget: originalBudget + adjustments,
    });
  };

  const acceptCOMutation = useMutation({
    mutationFn: async (co) => {
      await base44.entities.FSChangeOrder.update(co.id, {
        status: 'accepted',
        accepted_date: new Date().toISOString(),
      });
      const updated = changeOrders.map((c) => c.id === co.id ? { ...c, status: 'accepted' } : c);
      await recomputeProjectBudgetLocal(selectedProject, updated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-change-orders', selectedProject?.id] });
      queryClient.invalidateQueries({ queryKey: ['fs-projects', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-detail'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-projects'] });
      toast.success('Change order accepted, budget updated');
    },
    onError: (err) => toast.error(err?.message || 'Failed to accept change order'),
  });

  // Delete a draft CO. Drafts have no legal weight — hard-delete client-side.
  // Only available on `status === 'draft'` (UI-gated). Signed/accepted COs use
  // voidCOMutation instead.
  const deleteCOMutation = useMutation({
    mutationFn: async (co) => {
      await base44.entities.FSChangeOrder.delete(co.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-change-orders', selectedProject?.id] });
      toast.success('Draft change order deleted');
      setDeleteCOTarget(null);
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete change order'),
  });

  // Void a signed/accepted CO via the server function. The function marks the
  // CO voided + recomputes FSProject.total_budget excluding the voided record
  // (mirrors signChangeOrder's pattern but inverted). Per FINANCIAL-WORKFLOW-SPEC
  // §2.1+§2.4: signed COs are legal artifacts — we preserve the record, just
  // exclude it from the active contract math.
  const voidCOMutation = useMutation({
    mutationFn: async ({ co, reason }) => {
      const result = await base44.functions.invoke('voidChangeOrder', {
        change_order_id: co.id,
        reason: reason || null,
      });
      // base44.functions.invoke returns the Axios wrapper — actual payload at .data
      const payload = result?.data;
      if (payload?.error) throw new Error(payload.error);
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-change-orders', selectedProject?.id] });
      queryClient.invalidateQueries({ queryKey: ['fs-projects', profile?.id] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-detail'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-projects'] });
      toast.success('Change order voided, budget updated');
      setVoidCOTarget(null);
      setVoidConfirmText('');
      setVoidReason('');
    },
    onError: (err) => toast.error(err?.message || 'Failed to void change order'),
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
            <CurrencyInput
              showPrefix
              value={formData.total_budget}
              onChange={(v) => setField('total_budget', v)}
              className={INPUT_CLASS}
              placeholder="0.00"
            />
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
    const logCount = logCountByProject[proj.id] || 0;
    const statusObj = STATUS_OPTIONS.find((s) => s.value === proj.status) || STATUS_OPTIONS[0];

    // Derived Contract Total — read from the linked estimate + signed/accepted
    // CO amounts at render time, not from FSProject.total_budget. The stored
    // field is fragile: convertMutation never wrote `original_budget`, and the
    // recompute path in signChangeOrder/voidChangeOrder uses `total_budget` as
    // its own fallback for `originalBudget`, which drifts after sign+void
    // cycles. Bari's project (linked $900 estimate) shows $0 because of this.
    // Derivation heals existing bad data without a backfill — every render
    // recomputes from the source of truth (the estimate + signed COs).
    const signedCOs = (changeOrders || []).filter(
      isChangeOrderLocked
    );
    const signedCOAdjustments = signedCOs.reduce((sum, co) => {
      const adj = co.amount !== undefined && co.amount !== null
        ? parseFloat(co.amount)
        : parseFloat(co.total) || 0;
      return sum + (Number.isFinite(adj) ? adj : 0);
    }, 0);
    const linkedEstimateTotal = selectedEstimate
      ? parseFloat(selectedEstimate.total) || 0
      : 0;
    const storedOriginal = parseFloat(proj.original_budget);
    const storedTotal = parseFloat(proj.total_budget);
    // Original = the contract value at moment of project creation. Source-of-
    // truth chain: stored original_budget (DEC-193's intent) → linked estimate
    // total → stored total_budget. The middle fallback heals the legacy gap
    // where convertMutation skipped writing original_budget.
    const originalContract = Number.isFinite(storedOriginal) && storedOriginal > 0
      ? storedOriginal
      : selectedEstimate
        ? linkedEstimateTotal
        : Number.isFinite(storedTotal) ? storedTotal : 0;
    // Contract Total = original + signed COs. When no estimate is linked
    // (manually-created project), fall back to the stored total_budget so we
    // don't regress those projects.
    const contractTotal = selectedEstimate
      ? linkedEstimateTotal + signedCOAdjustments
      : (Number.isFinite(storedTotal) ? storedTotal : 0) + signedCOAdjustments;
    // Budget tile + remaining/progress bar follow the derived contract total
    // so the two financial banners stay consistent. They were both reading
    // proj.total_budget — same broken source.
    const budget = contractTotal;
    const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;

    const projectLogs = dailyLogs
      .filter((l) => l.project_id === proj.id)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Live client data from FSClient (source of truth), then inline copies,
    // then derived from the linked estimate (Test Project pattern: standalone
    // project + estimate linked from estimate-edit form ⇒ project.client_id
    // is null but the estimate carries the client). Phone/email derive too —
    // contractor adds the linked estimate's client contact info, project
    // detail surfaces it without forcing a manual copy. See deriveProjectClient
    // for the source-of-truth chain.
    const derived = deriveProjectClient(proj, projectIdToEstimate, clientMap);
    const linkedEstClient = derived.source === 'estimate' && derived.clientId
      ? clientMap[derived.clientId]
      : null;
    const liveClient = proj.client_id ? clientMap[proj.client_id] : linkedEstClient;
    const clientName = derived.clientName;
    const clientPhone = liveClient?.phone || proj.client_phone;
    const clientEmail = liveClient?.email || proj.client_email;

    // ─── Drill-in row builders ──────────────────────────────────────────
    // Each tile reveals its source records on click. One slide-over component
    // (ProjectTileDrillIn), seven row sets — one per drillable tile. Living
    // Feet at the modal layer: same shell, different rows. Derived tiles
    // (Net Cash, Remaining) pass `math` JSX instead of `rows` so the user
    // sees the calculation with each input clickable to drill into its source.
    //
    // Per-row navigation: row.onClick closes the modal and routes to the
    // source record's edit/detail view. Cross-tab navigation reuses the
    // localStorage-prefill pattern established by FieldServiceLog's
    // PREFILL_TYPE_KEY — the receiving tab consumes the prefill on mount.
    // Payment rows + CO rows stay on Project Detail (no tab switch needed —
    // payments render in the Recent Payments section below the tiles, COs in
    // the COs section). Estimate row + Daily Log / Material / Labor rows
    // navigate to Estimates and Log tabs respectively, prefilling the target
    // record so the user lands directly on its edit/preview.
    const goToEstimatePreview = (estId) => {
      if (estId) localStorage.setItem('fs-estimate-prefill-id', estId);
      setDrillIn(null);
      onNavigateTab?.('estimates');
    };
    const goToLogForRecord = (logId) => {
      if (logId) localStorage.setItem('fs-log-prefill-log-id', logId);
      setDrillIn(null);
      onNavigateTab?.('log');
    };
    const goToCOOnPage = (coId) => {
      setExpandedCO(coId || null);
      setDrillIn(null);
    };

    const settledPayments = (projectPayments || []).filter(
      (p) => p.status === 'received' || p.status === 'cleared'
    );
    const receivedPayments = settledPayments.filter((p) => p.direction === 'received');
    const paidPayments = settledPayments.filter((p) => p.direction === 'paid');

    const contractRows = [];
    if (selectedEstimate) {
      contractRows.push({
        key: `est-${selectedEstimate.id}`,
        primary: selectedEstimate.title || `Estimate ${selectedEstimate.estimate_number || ''}`.trim() || 'Estimate',
        secondary: `${selectedEstimate.estimate_number || 'Estimate'}${selectedEstimate.date ? ` · ${fmtDate(selectedEstimate.date)}` : ''} · Original contract`,
        amount: fmt(linkedEstimateTotal),
        amountClass: 'text-foreground',
        onClick: () => goToEstimatePreview(selectedEstimate.id),
      });
    } else if (originalContract > 0) {
      contractRows.push({
        key: 'manual-original',
        primary: 'Original budget',
        secondary: 'Manually entered (no linked estimate)',
        amount: fmt(originalContract),
        amountClass: 'text-foreground',
        // Manual entry has no linked record to drill into; non-clickable row.
      });
    }
    signedCOs.forEach((co) => {
      const adj = co.amount !== undefined && co.amount !== null
        ? parseFloat(co.amount)
        : parseFloat(co.total) || 0;
      contractRows.push({
        key: `co-${co.id}`,
        primary: co.title || `Change Order ${co.change_order_number || ''}`.trim() || 'Change Order',
        secondary: `${co.change_order_number || 'CO'} · ${co.status === 'accepted' ? 'Accepted' : 'Signed'}${co.signed_at ? ` ${fmtDate(co.signed_at)}` : ''}`,
        amount: `${adj >= 0 ? '+' : ''}${fmt(adj)}`,
        amountClass: 'text-primary-hover',
        onClick: () => goToCOOnPage(co.id),
      });
    });

    // FSPayment edit form doesn't exist in this build — payments are create-
    // only via the Log tab's universal capture surface (FINANCIAL-WORKFLOW
    // §2.6 — Log is the universal *input surface*; underlying entities stay
    // distinct, so FSPayment is NOT a child of FSDailyLog). Row click closes
    // the modal, scrolls the Recent Payments section into view, and briefly
    // rings the matching row so the user sees what they navigated to. The
    // honest navigation target — an FSPayment edit form — is its own
    // architectural conversation tied to financial-layer Phase 2 work
    // (Log-Line-Item Attribution Proposal sign-off, Spent semantic
    // redefinition, returns/refunds), not tonight's polish.
    const goToPaymentRow = (paymentId) => {
      setDrillIn(null);
      // Two RAFs: first lets the modal unmount + Recent Payments DOM settle,
      // second runs after layout so scrollIntoView lands on the right offset.
      requestAnimationFrame(() => requestAnimationFrame(() => {
        try {
          const section = document.getElementById('fs-project-payments');
          if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
          const row = document.querySelector(`[data-payment-id="${paymentId}"]`);
          if (row) {
            row.classList.add('ring-2', 'ring-primary', 'shadow-lg');
            setTimeout(() => {
              row.classList.remove('ring-2', 'ring-primary', 'shadow-lg');
            }, 1500);
          }
        } catch { /* DOM not ready or selector escape failed — silent no-op */ }
      }));
    };

    const receivedRows = receivedPayments.map((p) => ({
      key: `pay-${p.id}`,
      primary: p.party_name || 'Payment received',
      secondary: `${p.date ? fmtDate(p.date) : ''}${p.payment_method ? ` · ${p.payment_method}` : ''}${p.reference_number ? ` · #${p.reference_number}` : ''}`.replace(/^ · /, ''),
      amount: fmt(parseFloat(p.amount) || 0),
      amountClass: 'text-emerald-400',
      onClick: () => goToPaymentRow(p.id),
    }));

    const paidRows = paidPayments.map((p) => ({
      key: `pay-${p.id}`,
      primary: p.party_name || `Paid to ${p.party_type || 'party'}`,
      secondary: `${p.date ? fmtDate(p.date) : ''}${p.payment_method ? ` · ${p.payment_method}` : ''}${p.reference_number ? ` · #${p.reference_number}` : ''}`.replace(/^ · /, ''),
      amount: fmt(parseFloat(p.amount) || 0),
      amountClass: 'text-primary',
      onClick: () => goToPaymentRow(p.id),
    }));

    // Spent = materials + labor + sub payments. Phase 1.0 commit 1 closed
    // the FSPayment(paid) gap per spec §12 Q3 — sub payments are real costs
    // and contribute to projectSpent. Drill-in shows all three streams so
    // the rollup is honest about its sources.
    // Click navigates to the parent FSDailyLog (materials + labor) or to
    // the payment's row in the Recent Payments section (sub payments —
    // FSPayment edit form deferred to commit 2 per DEC-214).
    const spentRows = [];
    projectMaterials.forEach((m) => {
      if (m.deleted_at) return;
      const qty = parseFloat(m.quantity) || 0;
      const unitCost = parseFloat(m.unit_cost) || 0;
      const cost = parseFloat(m.total_cost) || (qty * unitCost);
      spentRows.push({
        key: `mat-${m.id}`,
        primary: m.description || 'Material',
        secondary: `Material${qty ? ` · ${qty}${m.unit ? ' ' + m.unit : ''}` : ''}${unitCost ? ` × ${fmt(unitCost)}` : ''}`,
        amount: fmt(cost),
        amountClass: 'text-primary',
        onClick: m.daily_log_id ? () => goToLogForRecord(m.daily_log_id) : undefined,
      });
    });
    projectLabor.forEach((l) => {
      if (l.deleted_at) return;
      const hours = parseFloat(l.hours) || 0;
      const cost = parseFloat(l.total_cost) || 0;
      spentRows.push({
        key: `lab-${l.id}`,
        primary: l.description || 'Labor',
        secondary: `Labor${hours ? ` · ${hours} hr` : ''}`,
        amount: fmt(cost),
        amountClass: 'text-primary',
        onClick: l.daily_log_id ? () => goToLogForRecord(l.daily_log_id) : undefined,
      });
    });
    // Phase 1.0 commit 1: sub payments contribute to Spent. Same row click
    // pattern as the Paid Out drill-in (goToPaymentRow). Settled-only.
    projectPayments.forEach((p) => {
      if (p.deleted_at) return;
      if (p.direction !== 'paid') return;
      if (p.status !== 'received' && p.status !== 'cleared') return;
      spentRows.push({
        key: `pay-spent-${p.id}`,
        primary: p.party_name || `Paid to ${p.party_type || 'party'}`,
        secondary: `Sub payment${p.date ? ` · ${fmtDate(p.date)}` : ''}${p.method ? ` · ${p.method}` : ''}`,
        amount: fmt(parseFloat(p.amount) || 0),
        amountClass: 'text-primary',
        onClick: () => goToPaymentRow(p.id),
      });
    });

    const logRows = projectLogs.map((l) => ({
      key: `log-${l.id}`,
      primary: l.tasks_completed || 'Daily log',
      secondary: l.date ? fmtDate(l.date) : '',
      amount: l.weather || '',
      amountClass: 'text-muted-foreground',
      onClick: () => goToLogForRecord(l.id),
    }));

    // Math JSX for derived tiles. Each input is a button that re-targets
    // the drill-in to that input's tile — transparency by navigation.
    const MathInput = ({ label, value, target, valueClass }) => (
      <button
        type="button"
        onClick={() => setDrillIn(target)}
        className="flex items-center gap-2 hover:bg-secondary/40 rounded-lg px-2 py-1 -mx-2 transition-colors text-left"
      >
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-semibold ${valueClass || 'text-foreground'}`}>{value}</span>
      </button>
    );

    const netMath = (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Net Cash is the difference between what came in and what went out on this project.
        </p>
        <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
          <MathInput label="Received" value={fmt(paymentSummary.received)} target="received" valueClass="text-emerald-400" />
          <div className="flex items-center gap-2 px-2 text-muted-foreground">
            <span>−</span>
          </div>
          <MathInput label="Paid Out" value={fmt(paymentSummary.paid)} target="paid" valueClass="text-primary" />
          <div className="flex items-center gap-2 px-2 pt-2 border-t border-border">
            <span className="text-sm font-semibold text-foreground-soft">=</span>
            <span className={`text-sm font-bold ${paymentSummary.net > 0 ? 'text-emerald-400' : paymentSummary.net < 0 ? 'text-red-400' : 'text-foreground'}`}>
              {paymentSummary.net > 0 ? '+' : ''}{fmt(paymentSummary.net)}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Tap Received or Paid Out to see the underlying payments.
        </p>
      </div>
    );

    const remainingMath = (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Remaining is the contract value still left to spend against current cost lines (materials and labor).
        </p>
        <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
          <MathInput label="Budget" value={budget > 0 ? fmt(budget) : '—'} target="contract" />
          <div className="flex items-center gap-2 px-2 text-muted-foreground">
            <span>−</span>
          </div>
          <MathInput label="Spent" value={fmt(spent)} target="spent" valueClass="text-primary" />
          <div className="flex items-center gap-2 px-2 pt-2 border-t border-border">
            <span className="text-sm font-semibold text-foreground-soft">=</span>
            <span className={`text-sm font-bold ${budget > 0 && spent > budget ? 'text-red-400' : 'text-foreground'}`}>
              {budget > 0 ? fmt(budget - spent) : '—'}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Tap Budget or Spent to see the underlying records.
        </p>
      </div>
    );

    // Project + client context for drill-in modal subtitles. Surfaces the
    // derived client name so users auditing a tile in a generically-named
    // project ("Test Project", "Site A") can confirm at a glance which
    // contract context they're looking at. Falls back to project-only when
    // no client info is available.
    const drillContext = clientName
      ? `${proj.name} · ${clientName}`
      : proj.name;

    const drillConfig = {
      contract: {
        title: 'Contract Total',
        subtitle: selectedEstimate
          ? `${drillContext} · Linked estimate + signed change orders`
          : `${drillContext} · Manually-entered budget + signed change orders`,
        total: fmt(contractTotal),
        rows: contractRows,
        emptyMessage: 'No estimate or signed change orders yet.',
      },
      received: {
        title: 'Received',
        subtitle: `${drillContext} · Settled payments coming in (received or cleared)`,
        total: fmt(paymentSummary.received),
        rows: receivedRows,
        emptyMessage: 'No received payments yet.',
        footer: 'Pending payments are not counted until status flips to received or cleared.',
      },
      paid: {
        title: 'Paid Out',
        subtitle: `${drillContext} · Settled payments going out (subs, vendors, refunds)`,
        total: fmt(paymentSummary.paid),
        rows: paidRows,
        emptyMessage: 'No outgoing payments yet.',
      },
      net: {
        title: 'Net Cash',
        subtitle: `${drillContext} · Received minus Paid Out`,
        total: `${paymentSummary.net > 0 ? '+' : ''}${fmt(paymentSummary.net)}`,
        math: netMath,
      },
      spent: {
        title: 'Spent',
        subtitle: `${drillContext} · Materials, labor, and sub payments logged against this project`,
        total: fmt(spent),
        rows: spentRows,
        emptyMessage: 'No materials, labor, or sub payments logged yet.',
        footer: 'Spent = sum of materials, labor cost lines, and settled sub/vendor payments. Per LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL §12 Q3.',
      },
      remaining: {
        title: 'Remaining',
        subtitle: `${drillContext} · Contract budget minus spent cost lines`,
        total: budget > 0 ? fmt(budget - spent) : '—',
        math: remainingMath,
      },
      logs: {
        title: 'Daily Logs',
        subtitle: `${drillContext} · ${logCount} log${logCount === 1 ? '' : 's'}`,
        total: undefined,
        rows: logRows,
        emptyMessage: 'No daily logs yet.',
      },
    };
    const drillCurrent = drillIn ? drillConfig[drillIn] : null;

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
                derived.clientId ? (
                  <button
                    type="button"
                    onClick={() => { setClientDetailId(derived.clientId); setView('client_detail'); }}
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
                    {person.business_name && (
                      <p className="text-xs text-muted-foreground/70">{person.business_name}</p>
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

        {/* Financial header — Contract / Received / Paid Out / Net Cash.
            Daily check-in view per FINANCIAL-WORKFLOW-SPEC. The existing
            budget breakdown below stays — banner adds metrics, doesn't
            replace what's there. Tiles are clickable for source-record audit
            (transparency through navigation — every number reveals its inputs). */}
        {(() => {
          const received = paymentSummary.received;
          const paidOut = paymentSummary.paid;
          const netCash = paymentSummary.net;
          const receivedPct = contractTotal > 0 ? Math.min(100, (received / contractTotal) * 100) : 0;
          const netColor = netCash > 0
            ? 'text-emerald-400'
            : netCash < 0
            ? 'text-red-400'
            : 'text-foreground-soft';
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setDrillIn('contract')}
                className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 hover:bg-secondary/40 transition-colors min-h-[44px]"
              >
                <p className="text-xs text-muted-foreground mb-1">Contract Total</p>
                <p className="text-xl font-bold text-foreground">{fmt(contractTotal)}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Original: {fmt(originalContract)}
                  {signedCOs.length > 0 && (
                    <span className="text-primary-hover ml-1">+{signedCOs.length} CO</span>
                  )}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setDrillIn('received')}
                className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 hover:bg-secondary/40 transition-colors min-h-[44px]"
              >
                <p className="text-xs text-muted-foreground mb-1">Received</p>
                <p className="text-xl font-bold text-emerald-400">{fmt(received)}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {contractTotal > 0
                    ? `${fmt(received)} of ${fmt(contractTotal)} (${Math.round(receivedPct)}%)`
                    : 'Receipts on this project'}
                </p>
              </button>
              <button
                type="button"
                onClick={() => setDrillIn('paid')}
                className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 hover:bg-secondary/40 transition-colors min-h-[44px]"
              >
                <p className="text-xs text-muted-foreground mb-1">Paid Out</p>
                <p className="text-xl font-bold text-primary">{fmt(paidOut)}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Sub & vendor payments</p>
              </button>
              <button
                type="button"
                onClick={() => setDrillIn('net')}
                className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 hover:bg-secondary/40 transition-colors min-h-[44px]"
              >
                <p className="text-xs text-muted-foreground mb-1">Net Cash</p>
                <p className={`text-xl font-bold ${netColor}`}>
                  {netCash > 0 ? '+' : ''}{fmt(netCash)}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">Receipts − payouts</p>
              </button>
            </div>
          );
        })()}

        {/* Budget & Spend — clickable tiles for source-record audit. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setDrillIn('contract')}
            className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 hover:bg-secondary/40 transition-colors min-h-[44px]"
          >
            <p className="text-xs text-muted-foreground mb-1">Budget</p>
            <p className="text-lg font-bold text-foreground">{budget > 0 ? fmt(budget) : '—'}</p>
            {signedCOs.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground/70 mt-1">
                <span>Original: {fmt(originalContract)}</span>
                <span>|</span>
                <span className="text-primary-hover">COs: {signedCOAdjustments >= 0 ? '+' : ''}{fmt(signedCOAdjustments)}</span>
              </div>
            )}
          </button>
          <button
            type="button"
            onClick={() => setDrillIn('spent')}
            className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 hover:bg-secondary/40 transition-colors min-h-[44px]"
          >
            <p className="text-xs text-muted-foreground mb-1">Spent</p>
            <p className="text-lg font-bold text-primary">{fmt(spent)}</p>
            {/* Phase 1.0 commit 1: caption explains the new math.
                Spent now includes settled sub payments per spec §12 Q3. */}
            <p className="text-xs text-muted-foreground/70 mt-1">Materials + labor + sub payments</p>
          </button>
          <button
            type="button"
            onClick={() => setDrillIn('remaining')}
            className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 hover:bg-secondary/40 transition-colors min-h-[44px]"
          >
            <p className="text-xs text-muted-foreground mb-1">Remaining</p>
            <p className={`text-lg font-bold ${budget > 0 && spent > budget ? 'text-red-400' : 'text-foreground'}`}>
              {budget > 0 ? fmt(budget - spent) : '—'}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setDrillIn('logs')}
            className="bg-card border border-border rounded-xl p-4 text-left hover:border-primary/50 hover:bg-secondary/40 transition-colors min-h-[44px]"
          >
            <p className="text-xs text-muted-foreground mb-1">Daily Logs</p>
            <p className="text-lg font-bold text-foreground">{logCount}</p>
          </button>
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
          // Parse line items from a record's line_items field. Handles three
          // shapes: a direct array, a nested {items: [...]} object, or a
          // stringified JSON blob (legacy estimates).
          const parseLineItems = (raw) => {
            if (!raw) return [];
            const items = Array.isArray(raw) ? raw : (raw?.items || []);
            if (typeof items[0] === 'string') {
              try { return JSON.parse(items[0]); } catch { return []; }
            }
            return items;
          };

          // Estimate spine + signed change orders both feed the Estimated
          // column. After Item 2c, total_budget on the project recomputes from
          // signed COs; the Estimated column needs the same composition so
          // category-level rollups match the contract the contractor actually
          // committed to.
          const estLineItems = parseLineItems(selectedEstimate?.line_items);

          const estByCategory = {};
          const addLine = (it) => {
            const cat = it.category || 'materials';
            const amt = parseFloat(it.amount) || ((parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0));
            estByCategory[cat] = (estByCategory[cat] || 0) + amt;
          };
          for (const it of estLineItems) addLine(it);

          // Layer in signed/accepted CO line items by category. Only counted
          // COs (status === signed | accepted) — drafts and awaiting-signature
          // don't move the contract.
          const countedCOs = changeOrders.filter(isChangeOrderLocked);
          for (const co of countedCOs) {
            for (const it of parseLineItems(co.line_items)) addLine(it);
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

        {/* Per-line rollup view (Phase 1.0 commit 1, Thread 2)
            Per LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL.md §5.2 / §12 Q3 / §14.4.
            Shows Estimated / Billed / Cost / Variance per contract line item
            (estimate + signed COs, chronological), plus an Unallocated row
            at the bottom for FSPayment with line_item_id IS NULL.

            Orphaned references (line_item_id pointing to a now-deleted line)
            auto-shift to Unallocated visually so the rollup totals balance
            against total Received / Paid Out — the picker exposes the
            "Detached" hint on edit (commit 2) for the contractor to re-pick.

            Sits below the category-level Ledger above — the category roll
            stays for at-a-glance read; this section gives the line-level
            audit when the contractor wants to see per-line detail.

            Renders only when there's something to show: contract line items
            exist OR there are payments (allocated or not) on the project. */}
        {(() => {
          // Settled + by-direction grouping mirrors useFSPayments
          // summarizePayments helper. Only counts settled rows (received /
          // cleared); pending doesn't move the gauge.
          const settled = projectPayments.filter(
            (p) => p.status === 'received' || p.status === 'cleared'
          );

          // Group by line_item_id (null bucket = Unallocated).
          const byLine = {};
          for (const p of settled) {
            const key = p.line_item_id || '__unallocated__';
            if (!byLine[key]) byLine[key] = { received: 0, paid: 0 };
            const amt = parseFloat(p.amount) || 0;
            if (p.direction === 'paid') byLine[key].paid += amt;
            else if ((p.direction || 'received') === 'received') byLine[key].received += amt;
          }

          // Orphan handling (spec §5.3 — auto-shift to Unallocated visually).
          // Any line_item_id that doesn't appear in the current contract gets
          // its totals folded into the Unallocated bucket so the rollup totals
          // stay consistent with the project header's Received / Paid Out.
          const lineIds = new Set(contractLineItems.map((it) => it.id));
          const unalloc = byLine.__unallocated__ || { received: 0, paid: 0 };
          for (const [key, v] of Object.entries(byLine)) {
            if (key !== '__unallocated__' && !lineIds.has(key)) {
              unalloc.received += v.received;
              unalloc.paid += v.paid;
            }
          }
          byLine.__unallocated__ = unalloc;

          const hasLineItems = contractLineItems.length > 0;
          const hasAnyPayments = settled.length > 0;

          // Skip if neither lines nor payments exist (avoids empty card on
          // brand-new projects). Empty-state for projects WITH lines but no
          // payments yet renders em-dashes per spec §4.6.
          if (!hasLineItems && !hasAnyPayments) return null;

          const variancColor = (v) => {
            if (v > 0) return 'text-emerald-400';
            if (v < 0) return 'text-red-400';
            return 'text-muted-foreground';
          };

          // Totals row math
          const totalEstimated = contractLineItems.reduce(
            (s, it) => s + (parseFloat(it.amount) || 0), 0
          );
          let totalBilled = 0;
          let totalCost = 0;
          for (const v of Object.values(byLine)) {
            totalBilled += v.received;
            totalCost += v.paid;
          }
          const totalVariance = totalEstimated - totalCost;

          return (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <LayoutList className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">Per-line rollup</h3>
                </div>
                <p className="text-xs text-muted-foreground/70 mb-3">
                  Each line: Estimated from contract; Billed from settled
                  client payments attributed to that line; Cost from settled
                  sub/vendor payments attributed to that line. Unattributed
                  payments fall into the Unallocated row.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 text-muted-foreground font-medium text-xs">Line item</th>
                        <th className="text-right py-2 text-muted-foreground font-medium text-xs">Estimated</th>
                        <th className="text-right py-2 text-muted-foreground font-medium text-xs">Billed</th>
                        <th className="text-right py-2 text-muted-foreground font-medium text-xs">Cost</th>
                        <th className="text-right py-2 text-muted-foreground font-medium text-xs">Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contractLineItems.map((it) => {
                        const row = byLine[it.id] || { received: 0, paid: 0 };
                        const est = parseFloat(it.amount) || 0;
                        const v = est - row.paid;
                        const desc = it.description || `${it.category || 'Line'} item`;
                        return (
                          <tr key={it.id} className="border-b border-border/50">
                            <td className="py-2 pr-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground flex-shrink-0">
                                  {it._origin_label}
                                </span>
                                <span className="text-foreground-soft truncate">{desc}</span>
                              </div>
                            </td>
                            <td className="py-2 text-right text-muted-foreground">{fmt(est)}</td>
                            <td className="py-2 text-right text-emerald-400">{row.received > 0 ? fmt(row.received) : '—'}</td>
                            <td className="py-2 text-right text-primary">{row.paid > 0 ? fmt(row.paid) : '—'}</td>
                            <td className={`py-2 text-right font-medium ${variancColor(v)}`}>
                              {est > 0 ? `${v >= 0 ? '+' : ''}${fmt(v)}` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Unallocated row — always render when there's any
                          unattributed activity OR contract has lines (so the
                          contractor sees the bucket exists even at $0). */}
                      {(byLine.__unallocated__.received > 0 || byLine.__unallocated__.paid > 0 || hasLineItems) && (
                        <tr className="border-b border-border/50 bg-secondary/30">
                          <td className="py-2 pr-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs px-1.5 py-0.5 rounded bg-muted-foreground/20 text-muted-foreground flex-shrink-0">
                                Unallocated
                              </span>
                              <span className="text-muted-foreground italic truncate">
                                Payments not tied to a specific line
                              </span>
                            </div>
                          </td>
                          <td className="py-2 text-right text-muted-foreground">—</td>
                          <td className="py-2 text-right text-emerald-400">{byLine.__unallocated__.received > 0 ? fmt(byLine.__unallocated__.received) : '—'}</td>
                          <td className="py-2 text-right text-primary">{byLine.__unallocated__.paid > 0 ? fmt(byLine.__unallocated__.paid) : '—'}</td>
                          <td className="py-2 text-right text-muted-foreground">—</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border">
                        <td className="py-2 text-foreground font-bold">Totals</td>
                        <td className="py-2 text-right text-foreground-soft font-bold">{fmt(totalEstimated)}</td>
                        <td className="py-2 text-right text-emerald-400 font-bold">{fmt(totalBilled)}</td>
                        <td className="py-2 text-right text-primary font-bold">{fmt(totalCost)}</td>
                        <td className={`py-2 text-right font-bold ${variancColor(totalVariance)}`}>
                          {totalEstimated > 0 ? `${totalVariance >= 0 ? '+' : ''}${fmt(totalVariance)}` : '—'}
                        </td>
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

        {/* Payments — view-only; writes flow through the Log tab */}
        {features?.payments_enabled !== false && (
        <FieldServicePayments
          projectId={proj.id}
          onLogPayment={() => {
            // Drop a project + type hint, then jump to the Log tab. Log reads
            // fs-last-project on mount (existing behavior) and the type hint
            // (new in Item 4) so the user lands ready to type.
            try {
              localStorage.setItem('fs-last-project', String(proj.id));
              localStorage.setItem('fs-log-prefill-type', 'sub_payment');
            } catch { /* ignore localStorage errors */ }
            if (onNavigateTab) onNavigateTab('log');
          }}
        />
        )}

        {/* Permits */}
        {features?.permits_enabled !== false && (
          <FieldServicePermits projectId={proj.id} profileId={profile?.id} currentUser={currentUser} />
        )}

        {/* ═══ Documents ═══ */}
        {/* Documents linked to this project via FSDocument.project_id.
            Same entity-rollup family as Permits and Change Orders — query by
            project_id, render as a clickable card list, header with "Add"
            action. Click navigates to the Documents tab via fs-document-prefill-*
            keys (canonical localStorage prefill pattern, fourth instance
            after fs-log-prefill-type, fs-log-prefill-log-id, fs-estimate-prefill-id). */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <h3 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider">
              Documents {projectDocuments.length > 0 && <span className="text-muted-foreground/70 ml-1">({projectDocuments.length})</span>}
            </h3>
            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem('fs-document-prefill-project-id', String(proj.id));
                } catch { /* ignore localStorage errors */ }
                if (onNavigateTab) onNavigateTab('documents');
              }}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover min-h-[44px]"
            >
              <Plus className="h-4 w-4" /> Add Document
            </button>
          </div>

          {projectDocuments.length === 0 ? (
            <div className="px-4 pb-4 text-sm text-muted-foreground/70">
              No documents linked to this project yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {projectDocuments.map((doc) => {
                const status = doc.status === 'sent' ? 'awaiting_signature' : doc.status;
                const statusClass =
                  status === 'signed'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : status === 'awaiting_signature'
                      ? 'bg-primary/20 text-primary-hover'
                      : status === 'archived'
                        ? 'bg-muted-foreground/20 text-muted-foreground/70'
                        : 'bg-muted-foreground/20 text-muted-foreground';
                const statusLabel = status === 'awaiting_signature'
                  ? 'Awaiting Signature'
                  : status === 'signed'
                    ? 'Signed'
                    : status === 'archived'
                      ? 'Archived'
                      : 'Draft';
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      try {
                        localStorage.setItem('fs-document-prefill-id', String(doc.id));
                      } catch { /* ignore localStorage errors */ }
                      if (onNavigateTab) onNavigateTab('documents');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left min-h-[44px]"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.title || 'Untitled document'}</p>
                      <p className="text-xs text-muted-foreground/70">
                        {doc.created_date ? fmtDate(doc.created_date) : ''}
                        {doc.signed_at ? ` · Signed ${fmtDate(doc.signed_at)}` : ''}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

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
            <button type="button" onClick={() => showCOForm ? setShowCOForm(false) : openCOForm()}
              className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover min-h-[44px]">
              <Plus className="h-4 w-4" /> New Change Order
            </button>
          </div>

          {/* CO Form — mirrors FSEstimate builder shape */}
          {showCOForm && (
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-3">
              <p className="text-xs text-muted-foreground/70">
                {editingCOId ? 'Editing draft change order' : 'New change order'}
              </p>
              {/* Title + Description */}
              <div>
                <label className="block text-foreground-soft text-sm font-medium mb-1">Title *</label>
                <input type="text" value={coForm.title} onChange={(e) => setCOField('title', e.target.value)}
                  className="w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="What changed? e.g., Additional bathroom scope" />
              </div>
              <div>
                <label className="block text-foreground-soft text-sm font-medium mb-1">Description</label>
                <textarea value={coForm.description} onChange={(e) => setCOField('description', e.target.value)}
                  className="w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring min-h-[60px]"
                  placeholder="Why did it change? (optional)" rows={2} />
              </div>

              {/* Line Items — shared editor (same component used by FSEstimate builder) */}
              <div>
                <h4 className="text-sm font-semibold text-foreground-soft uppercase tracking-wider mb-2">Line Items</h4>
                <LineItemsEditor items={coForm.line_items} onChange={setCOLineItems} profile={profile} />
              </div>

              {/* Summary — same math as FSEstimate */}
              <div className="bg-secondary/30 border border-border rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between text-foreground-soft">
                  <span>Subtotal</span><span className="font-medium">{fmt(coTotals.subtotal)}</span>
                </div>

                {/* Management Fee — gated on management_fees_enabled feature flag, same as estimates.
                    Calculates against subtotal-only; never stacks on Insurance Fee or O&P. */}
                {features?.management_fees_enabled === true && (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-foreground-soft">Management Fee</span>
                      <div className="flex items-center gap-1">
                        <input type="number"
                          className="w-20 bg-secondary border border-border text-foreground rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                          value={coForm.management_fee_pct}
                          onChange={(e) => setCOField('management_fee_pct', e.target.value)}
                          onFocus={(e) => { if (parseFloat(e.target.value) === 0) setCOField('management_fee_pct', ''); }}
                          onBlur={(e) => { if (e.target.value === '') setCOField('management_fee_pct', 0); }}
                          min="0" max="100" step="0.5" />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                    {coTotals.managementFeeAmount > 0 && (
                      <div className="flex justify-between text-muted-foreground pl-4">
                        <span>Management Fee Amount</span><span>{fmt(coTotals.managementFeeAmount)}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Insurance Fee — gated on insurance_fee_enabled feature flag, same as estimates.
                    Manual % entry of the contractor's annual insurance allocation, applied to subtotal-only.
                    Inherits from parent estimate on CO create; editable per CO. */}
                {features?.insurance_fee_enabled === true && (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-foreground-soft">Insurance Fee</span>
                      <div className="flex items-center gap-1">
                        <input type="number"
                          className="w-20 bg-secondary border border-border text-foreground rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                          value={coForm.insurance_fee_pct}
                          onChange={(e) => setCOField('insurance_fee_pct', e.target.value)}
                          onFocus={(e) => { if (parseFloat(e.target.value) === 0) setCOField('insurance_fee_pct', ''); }}
                          onBlur={(e) => { if (e.target.value === '') setCOField('insurance_fee_pct', 0); }}
                          min="0" max="100" step="0.5" />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                    {coTotals.insuranceFeeAmount > 0 && (
                      <div className="flex justify-between text-muted-foreground pl-4">
                        <span>Insurance Fee Amount</span><span>{fmt(coTotals.insuranceFeeAmount)}</span>
                      </div>
                    )}
                  </>
                )}

                {/* O&P — gated on overhead_profit_enabled feature flag, same as estimates */}
                {features?.overhead_profit_enabled === true && (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-foreground-soft">O&P (Overhead & Profit)</span>
                      <div className="flex items-center gap-1">
                        <input type="number"
                          className="w-20 bg-secondary border border-border text-foreground rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                          value={coForm.overhead_profit_pct}
                          onChange={(e) => setCOField('overhead_profit_pct', e.target.value)}
                          onFocus={(e) => { if (parseFloat(e.target.value) === 0) setCOField('overhead_profit_pct', ''); }}
                          onBlur={(e) => { if (e.target.value === '') setCOField('overhead_profit_pct', 0); }}
                          min="0" max="100" step="0.5" />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                    {coTotals.opAmount > 0 && (
                      <div className="flex justify-between text-muted-foreground pl-4">
                        <span>O&P Amount</span><span>{fmt(coTotals.opAmount)}</span>
                      </div>
                    )}
                  </>
                )}

                {/* Tax — gated on tax_enabled feature flag (Settings → Workspace Features). */}
                {features?.tax_enabled === true && (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-foreground-soft">Tax Rate</span>
                      <div className="flex items-center gap-1">
                        <input type="number"
                          className="w-20 bg-secondary border border-border text-foreground rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                          value={coForm.tax_rate}
                          onChange={(e) => setCOField('tax_rate', e.target.value)}
                          onFocus={(e) => { if (parseFloat(e.target.value) === 0) setCOField('tax_rate', ''); }}
                          onBlur={(e) => { if (e.target.value === '') setCOField('tax_rate', 0); }}
                          min="0" max="100" step="0.1" />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </div>
                    {coTotals.taxAmount > 0 && (
                      <div className="flex justify-between text-muted-foreground pl-4">
                        <span>Tax Amount</span><span>{fmt(coTotals.taxAmount)}</span>
                      </div>
                    )}
                  </>
                )}

                <div className="flex items-center justify-between gap-4">
                  <span className="text-foreground-soft">Other</span>
                  <CurrencyInput
                    showPrefix
                    className="w-32 bg-secondary border border-border text-foreground rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-ring"
                    value={coForm.other_amount}
                    onChange={(v) => setCOField('other_amount', v)}
                  />
                </div>

                <div className="flex justify-between text-base font-bold text-primary border-t border-border pt-2">
                  <span>Total</span><span>{fmt(coTotals.total)}</span>
                </div>
                {parentEstimate && (coForm.management_fee_pct || coForm.insurance_fee_pct || coForm.overhead_profit_pct || coForm.tax_rate) ? (
                  <p className="text-xs text-muted-foreground/70">
                    Defaults pulled from this project's estimate. Override per CO above.
                  </p>
                ) : null}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button type="button" onClick={() => { setShowCOForm(false); setEditingCOId(null); }}
                  className="px-3 py-2 rounded-lg border border-border text-foreground-soft hover:text-foreground text-sm min-h-[44px]">Cancel</button>
                <button type="button" disabled={!coForm.title.trim() || saveCOMutation.isPending}
                  onClick={() => saveCOMutation.mutate()}
                  className="px-3 py-2 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground font-semibold text-sm min-h-[44px] disabled:opacity-50">
                  {saveCOMutation.isPending ? 'Saving...' : (editingCOId ? 'Save Changes' : 'Save Draft')}
                </button>
              </div>
            </div>
          )}

          {/* Existing Change Orders */}
          {changeOrders.length > 0 && (
            <div className="divide-y divide-border">
              {changeOrders.map((co) => {
                const isVoided = co.status === 'voided';
                const coSc =
                  isVoided
                    ? 'bg-muted-foreground/20 text-muted-foreground/70'
                    : isChangeOrderLocked(co)
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : co.status === 'awaiting_signature'
                        ? 'bg-primary/20 text-primary-hover'
                        : co.status === 'sent'
                          ? 'bg-primary/20 text-primary-hover'
                          : co.status === 'declined'
                            ? 'bg-rose-700/20 text-rose-400'
                            : 'bg-muted-foreground/20 text-muted-foreground';
                const coLineItems = (() => { const li = co.line_items; if (Array.isArray(li)) return li; if (li?.items) return li.items; return []; })();
                const isExpanded = expandedCO === co.id;
                const coAdjustment = co.amount !== undefined && co.amount !== null
                  ? parseFloat(co.amount)
                  : parseFloat(co.total) || 0;
                const statusLabel =
                  co.status === 'awaiting_signature' ? 'Awaiting Signature'
                  : co.status === 'signed' ? 'Signed'
                  : co.status === 'accepted' ? 'Accepted'
                  : co.status === 'declined' ? 'Declined'
                  : co.status === 'voided' ? 'Voided'
                  : co.status === 'sent' ? 'Sent'
                  : 'Draft';
                // Voided COs render struck-through — the contractor sees "this
                // happened, then was undone" instead of the record disappearing.
                const titleClass = isVoided ? 'line-through text-muted-foreground/60' : 'text-foreground';
                const amountClass = isVoided
                  ? 'line-through text-muted-foreground/50'
                  : (coAdjustment >= 0 ? 'text-primary' : 'text-muted-foreground');
                return (
                  <div key={co.id} className="px-4 py-3">
                    <button type="button" onClick={() => setExpandedCO(isExpanded ? null : co.id)}
                      className="w-full flex items-center justify-between text-left min-h-[44px]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${titleClass}`}>{co.title || 'Change Order'}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${coSc}`}>{statusLabel}</span>
                        </div>
                        <p className="text-xs text-muted-foreground/70">{co.change_order_number}</p>
                      </div>
                      <span className={`text-sm font-bold ${amountClass}`}>
                        {coAdjustment >= 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(coAdjustment)}
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
                        {/* Calculated lines breakdown \u2014 mirrors estimate summary */}
                        {(() => {
                          const subtotal = parseFloat(co.subtotal) || coLineItems.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
                          const mfPct = parseFloat(co.management_fee_pct) || 0;
                          const ifPct = parseFloat(co.insurance_fee_pct) || 0;
                          const opPct = parseFloat(co.overhead_profit_pct) || 0;
                          const taxPct = parseFloat(co.tax_rate) || 0;
                          const taxAmt = parseFloat(co.tax_amount) || 0;
                          const otherAmt = parseFloat(co.other_amount) || 0;
                          const mfAmt = subtotal * (mfPct / 100);
                          const ifAmt = subtotal * (ifPct / 100);
                          const opAmt = subtotal * (opPct / 100);
                          const taxVisible = features?.tax_enabled === true && taxPct > 0;
                          const hasBreakdown = mfPct > 0 || ifPct > 0 || opPct > 0 || taxVisible || otherAmt > 0;
                          if (!hasBreakdown) return null;
                          return (
                            <div className="border-t border-border pt-2 space-y-0.5 text-xs text-muted-foreground">
                              <div className="flex justify-between"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                              {mfPct > 0 && (
                                <div className="flex justify-between"><span>Management Fee ({mfPct}%)</span><span>{fmt(mfAmt)}</span></div>
                              )}
                              {ifPct > 0 && (
                                <div className="flex justify-between"><span>Insurance Fee ({ifPct}%)</span><span>{fmt(ifAmt)}</span></div>
                              )}
                              {opPct > 0 && (
                                <div className="flex justify-between"><span>O&P ({opPct}%)</span><span>{fmt(opAmt)}</span></div>
                              )}
                              {otherAmt > 0 && (
                                <div className="flex justify-between"><span>Other</span><span>{fmt(otherAmt)}</span></div>
                              )}
                              {taxVisible && (
                                <div className="flex justify-between"><span>Tax ({taxPct}%)</span><span>{fmt(taxAmt)}</span></div>
                              )}
                            </div>
                          );
                        })()}
                        {co.status === 'draft' && (
                          <div className="flex flex-wrap gap-3 pt-1">
                            <button type="button" onClick={() => openEditCOForm(co)}
                              className="text-xs text-foreground-soft hover:text-primary min-h-[44px]">
                              Edit
                            </button>
                            <button type="button" onClick={() => sendCOForSignature(co)}
                              className="text-xs text-primary hover:text-primary-hover min-h-[44px]">
                              Send for Signature
                            </button>
                            <button type="button" onClick={() => acceptCOMutation.mutate(co)}
                              className="text-xs text-emerald-400 hover:text-emerald-300 min-h-[44px]">
                              Accept (skip signature)
                            </button>
                            <button type="button" onClick={() => setDeleteCOTarget(co)}
                              className="text-xs text-rose-400 hover:text-rose-300 min-h-[44px]">
                              Delete
                            </button>
                          </div>
                        )}
                        {co.status === 'awaiting_signature' && (
                          <div className="flex flex-wrap gap-3 pt-1">
                            <button type="button" onClick={() => copyCOSigningLink(co)}
                              className="text-xs text-primary hover:text-primary-hover min-h-[44px]">
                              Copy Signing Link
                            </button>
                            <button type="button" onClick={() => recallCO(co)}
                              className="text-xs text-muted-foreground hover:text-foreground min-h-[44px]">
                              Recall
                            </button>
                          </div>
                        )}
                        {isChangeOrderLocked(co) && (
                          <div className="flex flex-wrap gap-3 pt-1 items-center">
                            {co.status === 'signed' && co.signed_at && (
                              <p className="text-xs text-emerald-400">
                                <Shield className="inline-block h-3 w-3 mr-1" />
                                Signed {fmtDate(co.signed_at)}
                              </p>
                            )}
                            <button type="button" onClick={() => { setVoidCOTarget(co); setVoidConfirmText(''); setVoidReason(''); }}
                              className="text-xs text-rose-400 hover:text-rose-300 min-h-[44px] flex items-center gap-1">
                              <Ban className="h-3 w-3" /> Void
                            </button>
                          </div>
                        )}
                        {isVoided && (
                          <p className="text-xs text-muted-foreground/70 pt-1">
                            <Ban className="inline-block h-3 w-3 mr-1" />
                            Voided{co.voided_at ? ` ${fmtDate(co.voided_at)}` : ''}
                            {co.voided_reason ? ` — ${co.voided_reason}` : ''}
                          </p>
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

        {/* Delete with dependents — IF-008 Session 1 */}
        <ConfirmDeleteWithDependents
          open={deleteConfirm === proj.id}
          onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
          projectId={proj.id}
          projectName={proj.name}
          profileId={profile?.id}
          onConfirm={({ mode, reassignTo }) =>
            deleteProject.mutate({ projectId: proj.id, mode, reassignTo })
          }
          onCancel={() => setDeleteConfirm(null)}
        />

        {/* Photo Lightbox */}
        {lightboxPhoto && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
            <button type="button" onClick={() => setLightboxPhoto(null)} className="absolute top-4 right-4 text-foreground/80 hover:text-foreground min-h-[44px] min-w-[44px] flex items-center justify-center">
              <X className="h-6 w-6" />
            </button>
            <img src={lightboxPhoto} alt="" className="max-h-[85vh] max-w-full object-contain rounded-lg" />
          </div>
        )}

        {/* Delete Draft CO Confirmation — single-step. Drafts have no legal weight. */}
        <AlertDialog open={!!deleteCOTarget} onOpenChange={(open) => { if (!open) setDeleteCOTarget(null); }}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground">Delete this draft change order?</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                {deleteCOTarget?.title || 'This change order'} will be permanently removed. Drafts haven't been sent to the client, so nothing else changes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border-border text-foreground-soft hover:bg-secondary">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteCOTarget && deleteCOMutation.mutate(deleteCOTarget)}
                disabled={deleteCOMutation.isPending}
                className="bg-rose-600 hover:bg-rose-500 text-foreground disabled:opacity-50"
              >
                {deleteCOMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Void Signed/Accepted CO Confirmation — two-step. The CO stays in the
            record for audit but is excluded from contract math. Friction is
            proportional to consequence: typed confirmation matches the workspace
            delete pattern in FieldServiceSettings. */}
        <AlertDialog open={!!voidCOTarget} onOpenChange={(open) => { if (!open) { setVoidCOTarget(null); setVoidConfirmText(''); setVoidReason(''); } }}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
                Void this change order?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                {voidCOTarget?.title || 'This change order'} ({voidCOTarget?.change_order_number}) will remain in the record for audit purposes but will not count toward the project budget. The client will see it as voided.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground/70 uppercase tracking-wider">Reason (optional)</label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="mt-1 w-full bg-secondary border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g., scope changed, client request"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground/70 uppercase tracking-wider">
                  Type <span className="text-rose-400 font-mono">VOID</span> to confirm
                </label>
                <input
                  type="text"
                  value={voidConfirmText}
                  onChange={(e) => setVoidConfirmText(e.target.value)}
                  className="mt-1 w-full bg-secondary border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder='Type "VOID"'
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border-border text-foreground-soft hover:bg-secondary">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => voidCOTarget && voidCOMutation.mutate({ co: voidCOTarget, reason: voidReason })}
                disabled={voidConfirmText !== 'VOID' || voidCOMutation.isPending}
                className="bg-rose-600 hover:bg-rose-500 text-foreground disabled:opacity-50"
              >
                {voidCOMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Void Change Order'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Tile drill-in modal — single component for every tile, mounted
            at the detail-view root so it overlays the whole project page. */}
        <ProjectTileDrillIn
          open={!!drillIn}
          onClose={() => setDrillIn(null)}
          title={drillCurrent?.title}
          subtitle={drillCurrent?.subtitle}
          total={drillCurrent?.total}
          rows={drillCurrent?.rows}
          math={drillCurrent?.math}
          emptyMessage={drillCurrent?.emptyMessage}
          footer={drillCurrent?.footer}
        />
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
            // Same chain as the grouped view's bucket label so flat cards
            // surface the linked estimate's client when project.client_name
            // is empty (Test Project pattern).
            const flatClientName = deriveProjectClient(proj, projectIdToEstimate, clientMap).clientName;

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
                    {flatClientName && (
                      <p className="text-xs text-muted-foreground truncate">{flatClientName}</p>
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
