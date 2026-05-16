import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { validateFile } from '@/utils/fileValidation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import VoiceInput from './VoiceInput';
import CurrencyInput from './CurrencyInput';
import SubVendorPicker from './SubVendorPicker';
import LineItemPicker from './LineItemPicker';
import { scrollToTopOf } from '@/utils/scrollToTop';
import useBottomInset from '@/hooks/useBottomInset';
import { useProjectLinkedEstimates, deriveProjectClient } from '@/hooks/useProjectLinkedEstimates';
import { useConsumePrefill } from '@/hooks/useConsumePrefill';
import { excludeDeleted } from '@/utils/softDelete';
import {
  Camera, Plus, X, ClipboardList, Package, Users, Cloud,
  Loader2, Save, Trash2, FolderOpen, Receipt, ChevronDown, Pencil,
  ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';

const INPUT_CLASS =
  'w-full bg-secondary border border-border text-foreground placeholder:text-muted-foreground/70 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent';
const LABEL_CLASS = 'block text-foreground-soft text-sm font-medium mb-1';
const SECTION_CLASS = 'bg-card border border-border rounded-xl p-4 mb-4';
const SECTION_HEADER_CLASS = 'text-lg font-bold text-foreground mb-3 flex items-center gap-2';
const UNITS = ['each', 'ft', 'sq ft', 'board', 'roll', 'box', 'bag', 'gal'];
const WEATHER_CHIPS = ['Sunny', 'Cloudy', 'Rain', 'Snow', 'Hot', 'Cold'];
const LAST_PROJECT_KEY = 'fs-last-project';
// Project Detail's "Log a payment" button drops a hint here so Log opens
// pre-pointed at the right entry type. Read once on mount, then cleared.
const PREFILL_TYPE_KEY = 'fs-log-prefill-type';
// Per-row drill-into-source navigation from Project Detail's tile drill-in
// modals: clicking a Daily Log / Material / Labor row writes the parent
// FSDailyLog id here, navigates to the Log tab, and we open that log for
// editing on mount. Same one-shot consume-and-clear semantics.
const PREFILL_LOG_ID_KEY = 'fs-log-prefill-log-id';

// Universal capture surface — three entry types share one input. Daily Log is
// the default; Sub Payment / Client Payment write FSPayment with the right
// direction + party fields. Per FINANCIAL-WORKFLOW-SPEC §2.6.
const LOG_TYPES = [
  { id: 'daily',          label: 'Daily Log',      icon: ClipboardList,    description: 'Photos, materials, labor, work completed' },
  { id: 'sub_payment',    label: 'Sub Payment',    icon: ArrowUpFromLine,  description: 'Payment paid out to a sub or vendor' },
  { id: 'client_payment', label: 'Client Payment', icon: ArrowDownToLine,  description: 'Payment received from the client' },
];

const PAYMENT_METHODS = [
  { value: '',         label: 'Method (optional)' },
  { value: 'check',    label: 'Check' },
  { value: 'cash',     label: 'Cash' },
  { value: 'ach',      label: 'ACH' },
  { value: 'card',     label: 'Card' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'other',    label: 'Other' },
];

const PARTY_TYPES = [
  { value: 'subcontractor', label: 'Subcontractor' },
  { value: 'vendor',        label: 'Vendor' },
  { value: 'other',         label: 'Other' },
];

const EMPTY_PAYMENT_FORM = {
  amount: '',
  method: '',
  reference: '',
  notes: '',
  payee_name: '',
  party_id: '',           // Phase 2.4: workers_json id when picker selects a sub/vendor
  party_type: 'subcontractor',
  line_item_id: null,     // Phase 1.0 commit 1: nullable FK to estimate/CO line item; null = Unallocated
  receipt_file: null,
  receipt_preview: null,
};

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

function parseWorkers(workersJson) {
  if (!workersJson) return [];
  if (Array.isArray(workersJson)) return workersJson;
  if (workersJson && typeof workersJson === 'object' && Array.isArray(workersJson.items)) return workersJson.items;
  if (typeof workersJson === 'string') {
    try { const p = JSON.parse(workersJson); return Array.isArray(p) ? p : []; }
    catch { return []; }
  }
  return [];
}

function parsePhaseLabels(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object' && Array.isArray(val.items)) return val.items;
  return null;
}

export default function FieldServiceLog({ profile, currentUser }) {
  const queryClient = useQueryClient();
  const photoInputRef = useRef(null);
  const rootRef = useRef(null);
  // Bottom inset for the FrequencyMiniPlayer (which fixes itself to the
  // viewport bottom at z-9998). The save button below lives at the same
  // viewport edge with z-20, so without compensation the mini-player covers
  // it visually. Living Feet (DEC-146) — same hook Layout.jsx uses; one
  // source of truth for "how much bottom space is the player taking."
  // CommandBar isn't shown on FS tabs, so agentEnabled is false here.
  const bottomInset = useBottomInset(false);

  // Scroll-to-top on mount. The Mylane content area scroll position persists
  // across tab switches, so coming from Project Detail's "Log a payment"
  // button (which is deep in the page) lands the user at the bottom of the
  // Log form.
  useEffect(() => { scrollToTopOf(rootRef.current); }, []);

  // ─── Queries ──────────────────────────────────
  const { data: projects = [] } = useQuery({
    queryKey: ['fs-projects', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.FSProject.filter({ profile_id: profile.id });
        return (Array.isArray(list) ? list : list ? [list] : []).filter(
          (p) => p.status === 'active' || p.status === 'paused'
        );
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // ─── Form state ───────────────────────────────
  const [logType, setLogType] = useState('daily'); // daily | sub_payment | client_payment
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayNumber, setDayNumber] = useState('');
  const [weather, setWeather] = useState('');
  const [tasksText, setTasksText] = useState('');
  const [notes, setNotes] = useState('');

  // Photos
  const [photos, setPhotos] = useState([]); // { file, preview, caption, phase }
  const [photoUploading, setPhotoUploading] = useState(false);

  // Materials
  const [materials, setMaterials] = useState([]);
  // Labor
  const [labor, setLabor] = useState([]);

  // Payment form (used when logType !== 'daily')
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT_FORM);
  const paymentReceiptInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  // Recent Logs panel defaults to collapsed — every Log tab open should land
  // on the entry form, not require scrolling past N previous logs to reach it.
  // Doron's morning dogfood (2026-05-05) flagged this. Precursor to the larger
  // Log → Project surface architecture work (LOG-LINE-ITEM-ATTRIBUTION-PROPOSAL).
  // Per-session expand state only — fresh page load defaults to collapsed.
  const [recentLogsCollapsed, setRecentLogsCollapsed] = useState(true);

  const isPaymentType = logType === 'sub_payment' || logType === 'client_payment';

  // Restore last project from localStorage
  useEffect(() => {
    const last = localStorage.getItem(LAST_PROJECT_KEY);
    if (last && projects.some((p) => String(p.id) === String(last))) {
      setProjectId(last);
    } else if (projects.length === 1) {
      setProjectId(String(projects[0].id));
    }
  }, [projects]);

  // One-shot prefills via useConsumePrefill (DEC-146):
  //   PREFILL_TYPE_KEY    → Project Detail "Log a payment" button drops a
  //                         type hint so Log opens on the right entry form.
  //   PREFILL_LOG_ID_KEY  → Tile drill-in row click (Project Detail Daily
  //                         Log / Material / Labor; Desk Home Spent This
  //                         Month) writes the parent FSDailyLog id; we
  //                         fetch fresh and open it for editing.
  // Hook reads + clears on first mount; effects act on the captured value
  // once any data dependency resolves.
  const prefillLogType = useConsumePrefill(PREFILL_TYPE_KEY);
  const prefillLogId = useConsumePrefill(PREFILL_LOG_ID_KEY);

  useEffect(() => {
    if (prefillLogType && LOG_TYPES.some((t) => t.id === prefillLogType)) {
      setLogType(prefillLogType);
    }
  }, [prefillLogType]);

  useEffect(() => {
    if (!prefillLogId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.entities.FSDailyLog.filter({ id: prefillLogId });
        const log = Array.isArray(res) ? res[0] : res;
        // Skip soft-deleted logs (commit 2 deletes shouldn't open for editing).
        if (!cancelled && log && !log.deleted_at) await loadLogForEditing(log);
      } catch {
        // best-effort: if the fetch fails the user lands on the Log home,
        // which is still a reasonable destination.
      }
    })();
    return () => { cancelled = true; };
  }, [prefillLogId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto day number
  const { data: existingLogs = [] } = useQuery({
    queryKey: ['fs-logs-for-project', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      try {
        const list = await base44.entities.FSDailyLog.filter({ project_id: projectId });
        return excludeDeleted(Array.isArray(list) ? list : list ? [list] : []);
      } catch { return []; }
    },
    enabled: !!projectId,
  });

  useEffect(() => {
    if (projectId && existingLogs.length > 0) {
      const maxDay = existingLogs.reduce((max, l) => {
        const d = parseInt(String(l.day_number).replace('Day ', ''), 10);
        return d > max ? d : max;
      }, 0);
      setDayNumber(String(maxDay + 1));
    } else if (projectId) {
      setDayNumber('1');
    }
  }, [projectId, existingLogs]);

  // Project record for payment metadata (client_id / client_name auto-resolve
  // for Client Payment, project name for receipts, etc.)
  const selectedProject = useMemo(
    () => projects.find((p) => String(p.id) === String(projectId)) || null,
    [projects, projectId]
  );

  // Empty-field link derivation for project↔estimate↔client. When a project
  // has no direct client_id but the linked estimate does, fill the gap at
  // read time. See useProjectLinkedEstimates for the chain rules. Used by
  // the project picker dropdown labels, the Client Payment "From" line, and
  // the FSPayment payload's party_name + party_id resolution below.
  const { projectIdToEstimate } = useProjectLinkedEstimates(profile?.id);
  const selectedProjectClient = useMemo(
    () => deriveProjectClient(selectedProject, projectIdToEstimate),
    [selectedProject, projectIdToEstimate]
  );

  const allWorkers = useMemo(() => parseWorkers(profile?.workers_json), [profile?.workers_json]);
  // Show workers assigned to selected project first, fall back to all workers
  const workers = useMemo(() => {
    if (!projectId) return allWorkers;
    const assigned = allWorkers.filter(
      (w) => Array.isArray(w.assigned_projects) && w.assigned_projects.includes(projectId)
    );
    return assigned.length > 0 ? assigned : allWorkers;
  }, [allWorkers, projectId]);
  const phases = useMemo(() => parsePhaseLabels(profile?.phase_labels) || ['Before', 'Demo', 'Framing', 'Rough-in', 'Finish', 'Final'], [profile?.phase_labels]);

  // ─── Photo capture ────────────────────────────
  const handlePhotoCapture = (e) => {
    const files = Array.from(e.target.files || []);
    const validPhotos = [];
    for (const file of files) {
      const check = validateFile(file);
      if (!check.valid) { toast.error(check.error); continue; }
      validPhotos.push({ file, preview: URL.createObjectURL(file), caption: '', phase: phases[0] || '' });
    }
    if (validPhotos.length) setPhotos((prev) => [...prev, ...validPhotos]);
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx]?.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const updatePhoto = (idx, key, value) => {
    setPhotos((prev) => prev.map((p, i) => (i === idx ? { ...p, [key]: value } : p)));
  };

  // ─── Materials ────────────────────────────────
  const addMaterial = () => {
    setMaterials((prev) => [
      ...prev,
      { description: '', quantity: '1', unit: 'each', unit_cost: '', receipt_photo: null, receipt_preview: null },
    ]);
  };

  const updateMaterial = (idx, key, value) => {
    setMaterials((prev) => prev.map((m, i) => (i === idx ? { ...m, [key]: value } : m)));
  };

  const removeMaterial = (idx) => {
    setMaterials((prev) => {
      if (prev[idx]?.receipt_preview) URL.revokeObjectURL(prev[idx].receipt_preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleReceiptPhoto = (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateFile(file, { acceptedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] });
    if (!check.valid) { toast.error(check.error); return; }
    updateMaterial(idx, 'receipt_photo', file);
    updateMaterial(idx, 'receipt_preview', URL.createObjectURL(file));
    e.target.value = '';
  };

  // ─── Labor ────────────────────────────────────
  const addLabor = () => {
    setLabor((prev) => [
      ...prev,
      {
        worker_name: workers[0]?.name || '',
        hours: '',
        hourly_rate: workers[0]?.hourly_rate?.toString() || profile?.hourly_rate?.toString() || '',
        description: '',
      },
    ]);
  };

  const updateLabor = (idx, key, value) => {
    setLabor((prev) => prev.map((l, i) => {
      if (i !== idx) return l;
      const updated = { ...l, [key]: value };
      // Auto-fill rate when worker changes
      if (key === 'worker_name') {
        const w = workers.find((w) => w.name === value);
        if (w) updated.hourly_rate = w.hourly_rate?.toString() || profile?.hourly_rate?.toString() || '';
      }
      return updated;
    }));
  };

  const removeLabor = (idx) => {
    setLabor((prev) => prev.filter((_, i) => i !== idx));
  };

  // ─── Load log for editing ─────────────────────
  const loadLogForEditing = async (log) => {
    setEditingLogId(log.id);
    setProjectId(String(log.project_id));
    setDate(log.date || new Date().toISOString().split('T')[0]);
    setDayNumber(String(log.day_number || '').replace('Day ', ''));
    setWeather(log.weather || '');
    setNotes(log.notes || '');

    // Parse tasks
    const t = log.tasks_completed;
    if (Array.isArray(t)) {
      setTasksText(t.join('\n'));
    } else if (typeof t === 'string') {
      const s = t.trim();
      if (s.startsWith('[')) {
        try { const parsed = JSON.parse(s); setTasksText(Array.isArray(parsed) ? parsed.join('\n') : s); }
        catch { setTasksText(s); }
      } else {
        setTasksText(s);
      }
    } else {
      setTasksText('');
    }

    // Load associated materials
    try {
      const mats = await base44.entities.FSMaterialEntry.filter({ daily_log_id: log.id });
      const matList = excludeDeleted(Array.isArray(mats) ? mats : mats ? [mats] : []);
      setMaterials(matList.map((m) => ({
        id: m.id,
        description: m.description || '',
        quantity: String(m.quantity || 1),
        unit: m.unit || 'each',
        unit_cost: String(m.unit_cost || 0),
        receipt_photo: null,
        receipt_preview: typeof m.receipt_photo === 'object' && m.receipt_photo?.url ? m.receipt_photo.url : (m.receipt_photo || null),
      })));
    } catch { setMaterials([]); }

    // Load associated labor
    try {
      const labs = await base44.entities.FSLaborEntry.filter({ daily_log_id: log.id });
      const labList = excludeDeleted(Array.isArray(labs) ? labs : labs ? [labs] : []);
      setLabor(labList.map((l) => ({
        id: l.id,
        worker_name: l.worker_name || '',
        hours: String(l.hours || ''),
        hourly_rate: String(l.hourly_rate || ''),
        description: l.description || '',
      })));
    } catch { setLabor([]); }

    // Load existing photos as previews (not File objects — they're already uploaded)
    try {
      const existingPhotos = await base44.entities.FSDailyPhoto.filter({ daily_log_id: log.id });
      const photoList = Array.isArray(existingPhotos) ? existingPhotos : existingPhotos ? [existingPhotos] : [];
      setPhotos(photoList.map((p) => ({
        id: p.id,
        file: null, // already uploaded — no File object
        preview: typeof p.photo === 'object' && p.photo?.url ? p.photo.url : (p.photo || ''),
        caption: p.caption || '',
        phase: p.phase || '',
        _existing: true, // marker: skip re-upload on save
      })));
    } catch { setPhotos([]); }
  };

  const cancelEditing = () => {
    setEditingLogId(null);
    setTasksText('');
    setNotes('');
    setPhotos([]);
    setMaterials([]);
    setLabor([]);
    setWeather('');
  };

  // ─── Upload helper ────────────────────────────
  const uploadFile = async (file) => {
    // Base44 file upload via entity file field
    // Convert to base64 data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // ─── Payment form helpers ─────────────────────
  const setPaymentField = (field, value) =>
    setPaymentForm((prev) => ({ ...prev, [field]: value }));

  const handlePaymentReceipt = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateFile(file, {
      acceptedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    });
    if (!check.valid) { toast.error(check.error); return; }
    setPaymentForm((prev) => {
      if (prev.receipt_preview) URL.revokeObjectURL(prev.receipt_preview);
      return { ...prev, receipt_file: file, receipt_preview: URL.createObjectURL(file) };
    });
    e.target.value = '';
  };

  const clearPaymentReceipt = () => {
    setPaymentForm((prev) => {
      if (prev.receipt_preview) URL.revokeObjectURL(prev.receipt_preview);
      return { ...prev, receipt_file: null, receipt_preview: null };
    });
  };

  // ─── Submit ───────────────────────────────────
  const handleSubmit = async () => {
    if (!projectId) {
      toast.error('Select a project');
      return;
    }
    if (!date) {
      toast.error('Date is required');
      return;
    }
    if (logType === 'daily' && !tasksText.trim()) {
      // FSDailyLog.tasks_completed is required at the entity level. Without
      // this guard the user gets a raw schema error from Base44.
      toast.error('Please describe the work completed');
      return;
    }

    // Payment paths (Sub Payment / Client Payment) — write FSPayment, not FSDailyLog.
    if (isPaymentType) {
      const amt = parseFloat(paymentForm.amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        toast.error('Amount is required');
        return;
      }
      if (logType === 'sub_payment' && !paymentForm.payee_name.trim()) {
        toast.error('Payee name is required');
        return;
      }
      if (logType === 'client_payment' && !selectedProject) {
        toast.error('Project not found');
        return;
      }
      setSaving(true);
      try {
        localStorage.setItem(LAST_PROJECT_KEY, projectId);

        const isPaid = logType === 'sub_payment';
        const partyName = isPaid
          ? paymentForm.payee_name.trim()
          : (selectedProjectClient.clientName || selectedProject.client_name || 'Client');
        const partyType = isPaid ? paymentForm.party_type : 'client';
        // Phase 2.4: party_id semantic broadened. When isPaid (sub_payment),
        // references the workers_json item id from SubVendorPicker. When
        // received (client_payment), references FSClient.id. Field-shape
        // unchanged; description-only Base44 update tracks the new semantic.
        const partyId = isPaid
          ? (paymentForm.party_id || null)
          : (selectedProject.client_id || selectedProjectClient.clientId || null);

        const payload = {
          profile_id: profile.id,
          user_id: currentUser?.id,
          project_id: projectId,
          // `type` is required by FSPayment schema. Phase 1 doesn't ask the
          // user to pick a project-stage type for these flows, so we default
          // to progress_payment — the most common case for both directions.
          type: 'progress_payment',
          amount: amt,
          date,
          direction: isPaid ? 'paid' : 'received',
          party_type: partyType,
          party_name: partyName,
          party_id: partyId,
          method: paymentForm.method || null,
          reference: paymentForm.reference.trim() || null,
          // Mirror reference into check_number for legacy summaries that still
          // read it (existing FieldServicePayments list rendering).
          check_number: paymentForm.method === 'check' ? (paymentForm.reference.trim() || null) : null,
          notes: paymentForm.notes.trim() || null,
          status: 'received',
          // Phase 1.0 commit 1: line-item attribution. Null = Unallocated
          // (flows into project-level Unallocated bucket per spec §3.2.5).
          // Optional field on every payment write — picker default empty.
          line_item_id: paymentForm.line_item_id || null,
        };

        if (paymentForm.receipt_file) {
          try {
            payload.receipt_photo = await uploadFile(paymentForm.receipt_file);
          } catch (err) {
            console.error('Receipt upload error:', err);
          }
        }

        await base44.entities.FSPayment.create(payload);

        // FSPayment subscribers: per-project ['fs-payments', projectId] in
        // FieldServiceClientPortal + ['fs-payments-all', profile.id] in
        // FieldServiceHome. Both must invalidate or one view drifts stale.
        queryClient.invalidateQueries({ queryKey: ['fs-payments', projectId] });
        queryClient.invalidateQueries({ queryKey: ['fs-payments'] });
        queryClient.invalidateQueries({ queryKey: ['fs-payments-all'] });

        if (paymentForm.receipt_preview) URL.revokeObjectURL(paymentForm.receipt_preview);
        setPaymentForm(EMPTY_PAYMENT_FORM);

        toast.success(isPaid ? 'Sub payment logged' : 'Client payment logged');
      } catch (err) {
        console.error('Payment save error:', err);
        toast.error(err?.message || 'Failed to save payment');
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    try {
      // Save last project
      localStorage.setItem(LAST_PROJECT_KEY, projectId);

      const tasksArray = tasksText
        .split('\n')
        .map((t) => t.trim())
        .filter(Boolean);

      if (editingLogId) {
        // ═══ UPDATE MODE ══════════════════════════
        await base44.entities.FSDailyLog.update(editingLogId, {
          date,
          day_number: dayNumber || null,
          weather: weather || null,
          tasks_completed: tasksArray.length > 0 ? JSON.stringify(tasksArray) : null,
          notes: notes || null,
        });

        // Upload only NEW photos (skip existing ones loaded during edit)
        for (const photo of photos) {
          if (photo._existing) continue; // already saved — skip
          try {
            const photoData = await uploadFile(photo.file);
            await base44.entities.FSDailyPhoto.create({
              profile_id: profile.id,
              user_id: currentUser?.id,
              project_id: projectId,
              daily_log_id: editingLogId,
              photo: photoData,
              caption: photo.caption || null,
              phase: photo.phase || null,
            });
          } catch (err) {
            console.error('Photo upload error:', err);
          }
        }

        // Update existing materials, create new ones
        for (const mat of materials) {
          if (!mat.description.trim()) continue;
          const qty = parseFloat(mat.quantity) || 1;
          const unitCost = parseFloat(mat.unit_cost) || 0;
          const matData = {
            description: mat.description.trim(),
            quantity: qty,
            unit: mat.unit || 'each',
            unit_cost: unitCost,
            total_cost: qty * unitCost,
            project_id: projectId,
          };
          if (mat.id) {
            await base44.entities.FSMaterialEntry.update(mat.id, matData);
          } else {
            await base44.entities.FSMaterialEntry.create({
              ...matData,
              profile_id: profile.id,
              user_id: currentUser?.id,
              project_id: projectId,
              daily_log_id: editingLogId,
            });
          }
        }

        // Update existing labor, create new ones
        for (const lab of labor) {
          if (!lab.worker_name.trim() || !lab.hours) continue;
          const hrs = parseFloat(lab.hours) || 0;
          const rate = parseFloat(lab.hourly_rate) || 0;
          const labData = {
            worker_name: lab.worker_name.trim(),
            hours: hrs,
            hourly_rate: rate,
            total_cost: hrs * rate,
            description: lab.description || null,
            project_id: projectId,
          };
          if (lab.id) {
            await base44.entities.FSLaborEntry.update(lab.id, labData);
          } else {
            await base44.entities.FSLaborEntry.create({
              ...labData,
              profile_id: profile.id,
              user_id: currentUser?.id,
              project_id: projectId,
              daily_log_id: editingLogId,
            });
          }
        }

        toast.success('Daily log updated');
        setEditingLogId(null);
      } else {
        // ═══ CREATE MODE ══════════════════════════
        const log = await base44.entities.FSDailyLog.create({
          profile_id: profile.id,
          user_id: currentUser?.id,
          project_id: projectId,
          date,
          day_number: dayNumber || null,
          weather: weather || null,
          tasks_completed: tasksArray.length > 0 ? JSON.stringify(tasksArray) : null,
          notes: notes || null,
        });

        // Upload photos
        for (const photo of photos) {
          try {
            const photoData = await uploadFile(photo.file);
            await base44.entities.FSDailyPhoto.create({
              profile_id: profile.id,
              user_id: currentUser?.id,
              project_id: projectId,
              daily_log_id: log.id,
              photo: photoData,
              caption: photo.caption || null,
              phase: photo.phase || null,
            });
          } catch (err) {
            console.error('Photo upload error:', err);
          }
        }

        // Create material entries
        for (const mat of materials) {
          if (!mat.description.trim()) continue;
          const qty = parseFloat(mat.quantity) || 1;
          const unitCost = parseFloat(mat.unit_cost) || 0;
          const createData = {
            profile_id: profile.id,
            user_id: currentUser?.id,
            project_id: projectId,
            daily_log_id: log.id,
            description: mat.description.trim(),
            quantity: qty,
            unit: mat.unit || 'each',
            unit_cost: unitCost,
            total_cost: qty * unitCost,
          };
          if (mat.receipt_photo) {
            try {
              createData.receipt_photo = await uploadFile(mat.receipt_photo);
            } catch (err) {
              console.error('Receipt upload error:', err);
            }
          }
          await base44.entities.FSMaterialEntry.create(createData);
        }

        // Create labor entries
        for (const lab of labor) {
          if (!lab.worker_name.trim() || !lab.hours) continue;
          const hrs = parseFloat(lab.hours) || 0;
          const rate = parseFloat(lab.hourly_rate) || 0;
          await base44.entities.FSLaborEntry.create({
            profile_id: profile.id,
            user_id: currentUser?.id,
            project_id: projectId,
            daily_log_id: log.id,
            worker_name: lab.worker_name.trim(),
            hours: hrs,
            hourly_rate: rate,
            total_cost: hrs * rate,
            description: lab.description || null,
          });
        }

        toast.success('Daily log saved');
      }

      // Invalidate queries. The all-* keys back the project list view; the
      // per-project keys back the project detail view's "Spent" rollup
      // (FieldServiceProjects.jsx queries fs-project-materials / fs-project-labor
      // by selectedId). Without invalidating those, a log saved from the Log
      // tab leaves the detail view's totals stale until React Query's 5-minute
      // staleTime expires or the user fully unmounts/remounts the view.
      queryClient.invalidateQueries({ queryKey: ['fs-daily-logs-all'] });
      queryClient.invalidateQueries({ queryKey: ['fs-materials-all'] });
      queryClient.invalidateQueries({ queryKey: ['fs-labor-all'] });
      queryClient.invalidateQueries({ queryKey: ['fs-recent-logs'] });
      queryClient.invalidateQueries({ queryKey: ['fs-logs-for-project'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-materials'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-labor'] });
      queryClient.invalidateQueries({ queryKey: ['fs-project-photos'] });
      // Timeline view (FieldServiceTimeline.jsx) has its own per-project keys
      // for logs/materials/labor/photos; client portal (FieldServiceClientPortal)
      // has its own per-project view of the same data. Both must invalidate
      // alongside the contractor-internal keys above (DEC-199).
      queryClient.invalidateQueries({ queryKey: ['fs-timeline-logs'] });
      queryClient.invalidateQueries({ queryKey: ['fs-timeline-materials'] });
      queryClient.invalidateQueries({ queryKey: ['fs-timeline-labor'] });
      queryClient.invalidateQueries({ queryKey: ['fs-timeline-photos'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-logs'] });
      queryClient.invalidateQueries({ queryKey: ['fs-client-photos'] });
      queryClient.invalidateQueries({ queryKey: ['fs-portal-materials'] });
      queryClient.invalidateQueries({ queryKey: ['fs-portal-labor'] });

      // Cleanup previews
      photos.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview); });
      materials.forEach((m) => { if (m.receipt_preview) URL.revokeObjectURL(m.receipt_preview); });

      // Reset form
      setTasksText('');
      setNotes('');
      setPhotos([]);
      setMaterials([]);
      setLabor([]);
      setWeather('');

    } catch (err) {
      console.error('Save error:', err);
      toast.error(err?.message || 'Failed to save daily log');
    } finally {
      setSaving(false);
    }
  };

  // ─── Material totals ──────────────────────────
  const materialsTotal = materials.reduce((s, m) => {
    const qty = parseFloat(m.quantity) || 0;
    const cost = parseFloat(m.unit_cost) || 0;
    return s + qty * cost;
  }, 0);

  const laborTotal = labor.reduce((s, l) => {
    const hrs = parseFloat(l.hours) || 0;
    const rate = parseFloat(l.hourly_rate) || 0;
    return s + hrs * rate;
  }, 0);

  return (
    // pb-24 (96px) clears the fixed Save Button below; bottomInset (54 when a
    // song is loaded + station enabled, 0 otherwise) adds extra space so
    // content scrolls above the mini-player too.
    <div ref={rootRef} className="space-y-0" style={{ paddingBottom: 96 + bottomInset }}>
      {editingLogId && logType === 'daily' && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-primary font-medium">Editing log — {date}</span>
          <button type="button" onClick={cancelEditing}
            className="text-xs text-muted-foreground hover:text-foreground min-h-[44px]">Cancel</button>
        </div>
      )}

      {/* Log Type Picker — universal capture surface (FINANCIAL-WORKFLOW-SPEC §2.6) */}
      {!editingLogId && (
        <div className={SECTION_CLASS}>
          <div className={SECTION_HEADER_CLASS}>
            <ClipboardList className="h-5 w-5 text-primary" />
            What are you logging?
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {LOG_TYPES.map((t) => {
              const Icon = t.icon;
              const active = logType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setLogType(t.id)}
                  className={`flex items-start gap-2 p-3 rounded-lg border text-left transition-colors min-h-[64px] ${
                    active
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-secondary/50 hover:border-primary/40'
                  }`}
                >
                  <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${active ? 'text-foreground' : 'text-foreground-soft'}`}>{t.label}</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{t.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Logs for selected project — collapsible, defaults collapsed.
          Tap header to expand. Per-session preference; fresh page load resets
          to collapsed so the entry form is always the landing surface. */}
      {logType === 'daily' && projectId && existingLogs.length > 0 && !editingLogId && (
        <div className={SECTION_CLASS}>
          <button
            type="button"
            onClick={() => setRecentLogsCollapsed((v) => !v)}
            className={`${SECTION_HEADER_CLASS} w-full flex items-center justify-between min-h-[44px] cursor-pointer`}
            aria-expanded={!recentLogsCollapsed}
          >
            <span className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <span>Recent Logs</span>
              <span className="text-sm text-muted-foreground/70 font-normal">({existingLogs.length})</span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${recentLogsCollapsed ? '-rotate-90' : ''}`}
            />
          </button>
          {!recentLogsCollapsed && (
            <div className="space-y-2 mt-3">
              {[...existingLogs]
                .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                .slice(0, 5)
                .map((log) => {
                  const tasks = (() => {
                    const t = log.tasks_completed;
                    if (!t) return '';
                    if (Array.isArray(t)) return t.join(', ');
                    if (typeof t === 'string') {
                      const s = t.trim();
                      if (s.startsWith('[')) {
                        try { const p = JSON.parse(s); return Array.isArray(p) ? p.join(', ') : s; }
                        catch { return s; }
                      }
                      return s;
                    }
                    return '';
                  })();
                  return (
                    <div key={log.id} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-muted-foreground/70">
                            {log.date ? new Date(log.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                          </span>
                          {log.day_number && (
                            <span className="text-xs text-muted-foreground/70">Day {String(log.day_number).replace('Day ', '')}</span>
                          )}
                        </div>
                        {tasks && <p className="text-sm text-foreground-soft truncate">{tasks}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => loadLogForEditing(log)}
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* Project + Date + Day */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          <FolderOpen className="h-5 w-5 text-primary" />
          Project & Date
        </div>

        <div className="space-y-3">
          <div>
            <label className={LABEL_CLASS}>Project *</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Select project...</option>
              {projects.map((p) => {
                const derivedName = deriveProjectClient(p, projectIdToEstimate).clientName;
                return (
                  <option key={p.id} value={p.id}>
                    {p.name}{derivedName ? ` — ${derivedName}` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS}>Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            {logType === 'daily' && (
              <div>
                <label className={LABEL_CLASS}>Day #</label>
                <input
                  type="text"
                  value={dayNumber}
                  onChange={(e) => setDayNumber(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="1"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Payment forms (Sub Payment / Client Payment) ═══════════════════ */}
      {logType === 'sub_payment' && (
        <div className={SECTION_CLASS}>
          <div className={SECTION_HEADER_CLASS}>
            <ArrowUpFromLine className="h-5 w-5 text-primary" />
            Sub Payment
            <span className="ml-auto text-xs font-normal text-muted-foreground/70">Paid out</span>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={LABEL_CLASS}>Payee *</label>
                <SubVendorPicker
                  profile={profile}
                  value={paymentForm.party_id}
                  fallbackText={paymentForm.payee_name}
                  role={['subcontractor', 'vendor']}
                  placeholder="Pick a sub or vendor…"
                  onChange={(person) => {
                    // Dual-write: party_id (workers_json id) + payee_name (local
                    // form variable, mapped to party_name on FSPayment write).
                    // Auto-update party_type to match the picked person's role
                    // — small UX nicety; the user can still override after.
                    setPaymentForm((prev) => ({
                      ...prev,
                      party_id: person?.id || '',
                      payee_name: person?.name || '',
                      party_type: person?.role === 'vendor' ? 'vendor' : 'subcontractor',
                    }));
                  }}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Payee type</label>
                <select
                  value={paymentForm.party_type}
                  onChange={(e) => setPaymentField('party_type', e.target.value)}
                  className={INPUT_CLASS}
                >
                  {PARTY_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={LABEL_CLASS}>Amount *</label>
                <CurrencyInput
                  showPrefix
                  value={paymentForm.amount}
                  onChange={(v) => setPaymentField('amount', v)}
                  className={`${INPUT_CLASS} text-lg font-bold`}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentField('method', e.target.value)}
                  className={INPUT_CLASS}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLASS}>Reference</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentField('reference', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Check #, ACH ID, etc."
                />
              </div>
              {/* Phase 1.0 commit 1: line-item attribution. Picker is optional;
                  empty selection writes line_item_id: null = Unallocated bucket
                  per FINANCIAL-WORKFLOW-SPEC §3.2.5. Type-ahead per §12 Q4 lock. */}
              <div className="sm:col-span-2">
                <label className={LABEL_CLASS}>Line item</label>
                <LineItemPicker
                  projectId={projectId}
                  value={paymentForm.line_item_id}
                  onChange={(id) => setPaymentField('line_item_id', id)}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLASS}>Notes</label>
              <div className="flex gap-2 items-start">
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentField('notes', e.target.value)}
                  rows={2}
                  className={`${INPUT_CLASS} resize-y`}
                  placeholder="Optional notes"
                />
                <VoiceInput
                  onTranscript={(t) => setPaymentField('notes', (paymentForm.notes ? paymentForm.notes + ' ' : '') + t)}
                  className="mt-1"
                />
              </div>
            </div>
            {/* Receipt photo (optional) */}
            <div>
              <input
                ref={paymentReceiptInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handlePaymentReceipt}
                className="hidden"
              />
              {paymentForm.receipt_preview ? (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                  {paymentForm.receipt_file?.type?.startsWith('image/') ? (
                    <img src={paymentForm.receipt_preview} alt="Receipt" className="h-14 w-14 object-cover rounded border border-border" />
                  ) : (
                    <Receipt className="h-8 w-8 text-primary" />
                  )}
                  <span className="flex-1 text-sm text-foreground-soft truncate">{paymentForm.receipt_file?.name || 'Receipt'}</span>
                  <button type="button" onClick={clearPaymentReceipt}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground/70 hover:text-red-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => paymentReceiptInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-3 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors min-h-[44px]"
                >
                  <Receipt className="h-4 w-4" />
                  Add receipt (optional)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {logType === 'client_payment' && (
        <div className={SECTION_CLASS}>
          <div className={SECTION_HEADER_CLASS}>
            <ArrowDownToLine className="h-5 w-5 text-primary" />
            Client Payment
            <span className="ml-auto text-xs font-normal text-muted-foreground/70">Received</span>
          </div>
          {selectedProjectClient.clientName && (
            <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
              <Users className="h-4 w-4" />
              <span>From: <span className="text-foreground-soft font-medium">{selectedProjectClient.clientName}</span></span>
            </div>
          )}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={LABEL_CLASS}>Amount *</label>
                <CurrencyInput
                  showPrefix
                  value={paymentForm.amount}
                  onChange={(v) => setPaymentField('amount', v)}
                  className={`${INPUT_CLASS} text-lg font-bold`}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentField('method', e.target.value)}
                  className={INPUT_CLASS}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLASS}>Reference</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentField('reference', e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Check #, ACH ID, etc."
                />
              </div>
              {/* Phase 1.0 commit 1: line-item attribution (Client Payment).
                  Same picker as Sub Payment; client receipts can attribute to
                  the contract line they're paying for. Empty = Unallocated
                  (the deposit-style case until allocation_status ships in
                  the post-migration layer per FINANCIAL-WORKFLOW-SPEC §3.2.5). */}
              <div className="sm:col-span-2">
                <label className={LABEL_CLASS}>Line item</label>
                <LineItemPicker
                  projectId={projectId}
                  value={paymentForm.line_item_id}
                  onChange={(id) => setPaymentField('line_item_id', id)}
                />
              </div>
            </div>
            <div>
              <label className={LABEL_CLASS}>Notes</label>
              <div className="flex gap-2 items-start">
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentField('notes', e.target.value)}
                  rows={2}
                  className={`${INPUT_CLASS} resize-y`}
                  placeholder="Optional notes"
                />
                <VoiceInput
                  onTranscript={(t) => setPaymentField('notes', (paymentForm.notes ? paymentForm.notes + ' ' : '') + t)}
                  className="mt-1"
                />
              </div>
            </div>
            {/* Receipt photo (optional) */}
            <div>
              <input
                ref={paymentReceiptInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handlePaymentReceipt}
                className="hidden"
              />
              {paymentForm.receipt_preview ? (
                <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                  {paymentForm.receipt_file?.type?.startsWith('image/') ? (
                    <img src={paymentForm.receipt_preview} alt="Receipt" className="h-14 w-14 object-cover rounded border border-border" />
                  ) : (
                    <Receipt className="h-8 w-8 text-primary" />
                  )}
                  <span className="flex-1 text-sm text-foreground-soft truncate">{paymentForm.receipt_file?.name || 'Receipt'}</span>
                  <button type="button" onClick={clearPaymentReceipt}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground/70 hover:text-red-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => paymentReceiptInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-3 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors min-h-[44px]"
                >
                  <Receipt className="h-4 w-4" />
                  Add receipt (optional)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Daily-log-only sections — Weather, Photos, Work, Materials, Labor, Notes, Day Summary */}
      {logType === 'daily' && (
      <>
      {/* Weather */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          <Cloud className="h-5 w-5 text-primary" />
          Weather
        </div>
        <div className="flex flex-wrap gap-2">
          {WEATHER_CHIPS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeather((prev) => (prev === w ? '' : w))}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors min-h-[44px] ${
                weather === w
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      {/* Photos */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          <Camera className="h-5 w-5 text-primary" />
          Photos
        </div>

        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            {photos.map((photo, idx) => (
              <div key={idx} className="relative">
                <img
                  src={photo.preview}
                  alt=""
                  className="w-full aspect-square object-cover rounded-lg border border-border"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-foreground hover:text-red-400"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="mt-1 space-y-1">
                  <input
                    type="text"
                    value={photo.caption}
                    onChange={(e) => updatePhoto(idx, 'caption', e.target.value)}
                    className="w-full bg-secondary border border-border text-foreground rounded px-2 py-1 text-xs placeholder:text-muted-foreground/70"
                    placeholder="Caption..."
                  />
                  <select
                    value={photo.phase}
                    onChange={(e) => updatePhoto(idx, 'phase', e.target.value)}
                    className="w-full bg-secondary border border-border text-foreground rounded px-2 py-1 text-xs"
                  >
                    <option value="">No phase</option>
                    {phases.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No capture attribute — lets mobile users choose camera OR gallery */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoCapture}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-4 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors min-h-[44px]"
        >
          <Camera className="h-5 w-5" />
          {photos.length > 0 ? 'Add More Photos' : 'Add Photos'}
        </button>
      </div>

      {/* Work Completed */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          <ClipboardList className="h-5 w-5 text-primary" />
          Work Completed *
        </div>
        <div className="flex gap-2 items-start">
          <textarea
            value={tasksText}
            onChange={(e) => setTasksText(e.target.value)}
            rows={4}
            className={`${INPUT_CLASS} resize-y`}
            placeholder="One task per line:&#10;Installed drywall in kitchen&#10;Ran electrical for island&#10;Framed bathroom doorway"
          />
          <VoiceInput
            onTranscript={(t) => setTasksText((prev) => (prev ? `${prev}\n${t}` : t))}
            className="mt-1"
          />
        </div>
      </div>

      {/* Materials */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          <Package className="h-5 w-5 text-primary" />
          Materials
          {materialsTotal > 0 && (
            <span className="text-sm font-normal text-primary ml-auto">{fmt(materialsTotal)}</span>
          )}
        </div>

        {materials.length > 0 && (
          <div className="space-y-3 mb-3">
            {materials.map((mat, idx) => {
              const lineTotal = (parseFloat(mat.quantity) || 0) * (parseFloat(mat.unit_cost) || 0);
              return (
                <div key={idx} className="bg-secondary/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={mat.description}
                          onChange={(e) => updateMaterial(idx, 'description', e.target.value)}
                          className={INPUT_CLASS}
                          placeholder="Material description"
                        />
                        <VoiceInput onTranscript={(t) => updateMaterial(idx, 'description', t)} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={mat.quantity}
                          onChange={(e) => updateMaterial(idx, 'quantity', e.target.value)}
                          onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateMaterial(idx, 'quantity', ''); }}
                          onBlur={(e) => { if (e.target.value === '') updateMaterial(idx, 'quantity', 0); }}
                          className={INPUT_CLASS}
                          placeholder="Qty"
                        />
                        <select
                          value={mat.unit}
                          onChange={(e) => updateMaterial(idx, 'unit', e.target.value)}
                          className={INPUT_CLASS}
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                        <CurrencyInput
                          value={mat.unit_cost}
                          onChange={(v) => updateMaterial(idx, 'unit_cost', v)}
                          className={INPUT_CLASS}
                          placeholder="Cost"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMaterial(idx)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground/70 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Receipt photo */}
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs text-muted-foreground/70 hover:text-primary cursor-pointer min-h-[44px]">
                        <Receipt className="h-3.5 w-3.5" />
                        {mat.receipt_preview ? 'Change receipt' : 'Add receipt'}
                        {/* No capture attribute — lets mobile users choose camera OR gallery */}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleReceiptPhoto(idx, e)}
                          className="hidden"
                        />
                      </label>
                      {mat.receipt_preview && (
                        <img
                          src={mat.receipt_preview}
                          alt="Receipt"
                          className="h-8 w-8 object-cover rounded border border-border"
                        />
                      )}
                    </div>
                    {lineTotal > 0 && (
                      <span className="text-sm text-primary font-medium">{fmt(lineTotal)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={addMaterial}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary-hover min-h-[44px]"
        >
          <Plus className="h-4 w-4" /> Add Material
        </button>
      </div>

      {/* Labor */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          <Users className="h-5 w-5 text-primary" />
          Labor
          {laborTotal > 0 && (
            <span className="text-sm font-normal text-primary ml-auto">{fmt(laborTotal)}</span>
          )}
        </div>

        {labor.length > 0 && (
          <div className="space-y-3 mb-3">
            {labor.map((lab, idx) => {
              const lineTotal = (parseFloat(lab.hours) || 0) * (parseFloat(lab.hourly_rate) || 0);
              return (
                <div key={idx} className="bg-secondary/50 rounded-lg p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        {/* Worker picker */}
                        {workers.length > 0 ? (
                          <select
                            value={lab.worker_name}
                            onChange={(e) => updateLabor(idx, 'worker_name', e.target.value)}
                            className={INPUT_CLASS}
                          >
                            <option value="">Select worker</option>
                            {workers.map((w) => (
                              <option key={w.name} value={w.name}>{w.name}</option>
                            ))}
                            <option value="_custom">Other...</option>
                          </select>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={lab.worker_name}
                              onChange={(e) => updateLabor(idx, 'worker_name', e.target.value)}
                              className={INPUT_CLASS}
                              placeholder="Worker name"
                            />
                            <VoiceInput onTranscript={(t) => updateLabor(idx, 'worker_name', t)} />
                          </div>
                        )}
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          value={lab.hours}
                          onChange={(e) => updateLabor(idx, 'hours', e.target.value)}
                          onFocus={(e) => { if (parseFloat(e.target.value) === 0) updateLabor(idx, 'hours', ''); }}
                          onBlur={(e) => { if (e.target.value === '') updateLabor(idx, 'hours', 0); }}
                          className={INPUT_CLASS}
                          placeholder="Hours"
                        />
                        <div className="relative">
                          {/* "/hr" suffix sits inside the input gutter; the
                              "$" itself comes from the CurrencyInput's
                              formatted display, no need for an outer prefix. */}
                          <CurrencyInput
                            value={lab.hourly_rate}
                            onChange={(v) => updateLabor(idx, 'hourly_rate', v)}
                            className={`${INPUT_CLASS} pr-10`}
                            placeholder="Rate"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/70 text-sm pointer-events-none">/hr</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={lab.description}
                          onChange={(e) => updateLabor(idx, 'description', e.target.value)}
                          className={INPUT_CLASS}
                          placeholder="Work description (optional)"
                        />
                        <VoiceInput onTranscript={(t) => updateLabor(idx, 'description', t)} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLabor(idx)}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground/70 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {lineTotal > 0 && (
                    <div className="text-right">
                      <span className="text-sm text-primary font-medium">{fmt(lineTotal)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={addLabor}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary-hover min-h-[44px]"
        >
          <Plus className="h-4 w-4" /> Add Labor
        </button>
      </div>

      {/* Notes */}
      <div className={SECTION_CLASS}>
        <div className={SECTION_HEADER_CLASS}>
          Notes
        </div>
        <div className="flex gap-2 items-start">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`${INPUT_CLASS} resize-y`}
            placeholder="Additional notes..."
          />
          <VoiceInput
            onTranscript={(t) => setNotes((prev) => (prev ? `${prev} ${t}` : t))}
            className="mt-1"
          />
        </div>
      </div>

      {/* Day Summary */}
      {(materialsTotal > 0 || laborTotal > 0) && (
        <div className="bg-card border border-primary/30 rounded-xl p-4 mb-4">
          <div className="space-y-1 text-sm">
            {materialsTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Materials</span>
                <span className="text-foreground-soft">{fmt(materialsTotal)}</span>
              </div>
            )}
            {laborTotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labor</span>
                <span className="text-foreground-soft">{fmt(laborTotal)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-foreground font-bold">Day Total</span>
              <span className="text-primary font-bold text-lg">{fmt(materialsTotal + laborTotal)}</span>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {editingLogId && logType === 'daily' && (
        <div className="mb-4">
          <button
            type="button"
            onClick={cancelEditing}
            className="w-full flex items-center justify-center gap-2 border border-border text-muted-foreground hover:text-foreground hover:bg-transparent rounded-xl py-3 transition-colors text-sm min-h-[44px]"
          >
            <X className="h-4 w-4" /> Cancel Editing
          </button>
        </div>
      )}

      {/* Save Button — fixed at viewport bottom. Sits ABOVE the FrequencyMiniPlayer
          (which is z-9998, this is z-20). Without the bottomInset offset, the
          player would visually cover the bottom 54px of the save bar. */}
      <div
        className="fixed left-0 right-0 bg-background/95 backdrop-blur border-t border-border p-4 z-20"
        style={{ bottom: bottomInset }}
      >
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !projectId || !date}
          className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl py-4 transition-colors text-lg min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> {editingLogId ? 'Updating...' : 'Saving...'}</>
          ) : (() => {
            if (logType === 'sub_payment') return <><Save className="h-5 w-5" /> Save Sub Payment</>;
            if (logType === 'client_payment') return <><Save className="h-5 w-5" /> Save Client Payment</>;
            return <><Save className="h-5 w-5" /> {editingLogId ? 'Update Daily Log' : 'Save Daily Log'}</>;
          })()}
        </button>
      </div>
    </div>
  );
}
