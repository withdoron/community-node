import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Settings, Save, Plus, X, Loader2, AlertTriangle, Trash2,
  ChevronDown, ChevronRight, HardHat, Users, FileText, Camera,
  Link2, RefreshCw, Copy, ToggleLeft, SlidersHorizontal, BookOpen,
} from 'lucide-react';

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
import { toast } from 'sonner';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let code = '';
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 8; i++) code += chars[arr[i] % chars.length];
  return code;
}

// ═══ Feature defaults ═══
const FEATURE_DEFAULTS = {
  permits_enabled: true,
  subs_enabled: true,
  management_fees_enabled: false,
  overhead_profit_enabled: false,
  xactimate_enabled: false,
  payments_enabled: true,
  timeline_enabled: true,
};

function getFeatures(profile) {
  const f = profile?.features_json || {};
  const merged = { ...FEATURE_DEFAULTS, ...f };
  // Migrate old insurance_work_enabled → split into two toggles
  if (f.insurance_work_enabled === true && !f.overhead_profit_enabled && !f.xactimate_enabled) {
    merged.overhead_profit_enabled = true;
    merged.xactimate_enabled = true;
  }
  delete merged.insurance_work_enabled;
  return merged;
}

const DEFAULT_TRADE_CATEGORIES = [
  'General Conditions', 'Demolition', 'Framing', 'Roofing', 'Siding & Exterior',
  'Windows & Doors', 'Electrical', 'Plumbing', 'HVAC', 'Insulation',
  'Drywall', 'Painting', 'Flooring', 'Concrete & Foundation',
  'Cabinetry & Countertops', 'Appliances', 'Cleanup & Hauling', 'Other',
];

function parseTradeCategories(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === 'object' && Array.isArray(val.items)) return val.items;
  return [];
}

function seedTradeCategories() {
  return DEFAULT_TRADE_CATEGORIES.map((name, i) => ({
    id: `cat_${Date.now()}_${i}`,
    name,
    order: i,
  }));
}

// ═══ Collapsible Section ═══

function Section({ icon: Icon, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-slate-800/50 transition-colors min-h-[44px]"
      >
        <Icon className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <span className="text-lg font-bold text-slate-100 flex-1">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
      </button>
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </div>
  );
}

// ═══ Main Component ═══

export default function FieldServiceSettings({ profile, currentUser, onNavigateTab }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ─── Business Profile state ──────────────────────
  const [businessName, setBusinessName] = useState(profile?.business_name || '');
  const [ownerName, setOwnerName] = useState(profile?.owner_name || '');
  const [licenseNumber, setLicenseNumber] = useState(profile?.license_number || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [serviceArea, setServiceArea] = useState(profile?.service_area || '');
  const [tagline, setTagline] = useState(profile?.tagline || '');
  const [hourlyRate, setHourlyRate] = useState(profile?.hourly_rate?.toString() || '');
  const [brandColor, setBrandColor] = useState(profile?.brand_color || '#f59e0b');
  const [logoUrl, setLogoUrl] = useState(profile?.logo_url || '');
  const [logoUploading, setLogoUploading] = useState(false);

  // ─── Workers state ───────────────────────────────
  const [workers, setWorkers] = useState(() => {
    const w = profile?.workers_json;
    if (Array.isArray(w)) return w;
    if (w && typeof w === 'object' && Array.isArray(w.items)) return w.items;
    return [];
  });
  // Workers managed in People tab — workers_json still read here for rate defaults

  // ─── Default Terms state ─────────────────────────
  const [defaultTerms, setDefaultTerms] = useState(profile?.default_terms || '');

  // ─── Phase Labels state ──────────────────────────
  const [phases, setPhases] = useState(() => {
    const p = profile?.phase_labels;
    if (Array.isArray(p)) return p;
    if (p && typeof p === 'object' && Array.isArray(p.items)) return p.items;
    return ['Before', 'Demo', 'Framing', 'Rough-in', 'Finish', 'Final'];
  });
  const [newPhase, setNewPhase] = useState('');

  // ─── Workspace state ─────────────────────────────
  const [workspaceName, setWorkspaceName] = useState(profile?.workspace_name || '');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // ─── Features state ─────────────────────────
  const [features, setFeatures] = useState(() => getFeatures(profile));

  // ─── Trade Categories state ────────────────────
  const [tradeCategories, setTradeCategories] = useState(() => {
    const existing = parseTradeCategories(profile?.trade_categories_json);
    return existing.length > 0 ? existing : seedTradeCategories();
  });
  const [newTradeCat, setNewTradeCat] = useState('');

  // Sync from profile if it changes
  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name || '');
      setOwnerName(profile.owner_name || '');
      setLicenseNumber(profile.license_number || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setWebsite(profile.website || '');
      setServiceArea(profile.service_area || '');
      setTagline(profile.tagline || '');
      setHourlyRate(profile.hourly_rate?.toString() || '');
      setBrandColor(profile.brand_color || '#f59e0b');
      setLogoUrl(profile.logo_url || '');
      const w = profile.workers_json;
      setWorkers(Array.isArray(w) ? w : (w && typeof w === 'object' && Array.isArray(w.items)) ? w.items : []);
      setDefaultTerms(profile.default_terms || '');
      const p = profile.phase_labels;
      setPhases(Array.isArray(p) ? p : (p && typeof p === 'object' && Array.isArray(p.items)) ? p.items : ['Before', 'Demo', 'Framing', 'Rough-in', 'Finish', 'Final']);
      setWorkspaceName(profile.workspace_name || '');
      setFeatures(getFeatures(profile));
      const tc = parseTradeCategories(profile.trade_categories_json);
      setTradeCategories(tc.length > 0 ? tc : seedTradeCategories());
    }
  }, [profile]);

  // ─── Save Business Profile ───────────────────────
  const saveProfile = useMutation({
    mutationFn: () =>
      base44.entities.FieldServiceProfile.update(profile.id, {
        business_name: businessName.trim(),
        owner_name: ownerName.trim(),
        license_number: licenseNumber.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        service_area: serviceArea.trim(),
        tagline: tagline.trim(),
        hourly_rate: parseFloat(hourlyRate) || 0,
        brand_color: brandColor.trim() || null,
        logo_url: logoUrl.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-profiles'] });
      toast.success('Business profile saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save'),
  });

  // ─── Save Default Terms ──────────────────────────
  const saveTerms = useMutation({
    mutationFn: () =>
      base44.entities.FieldServiceProfile.update(profile.id, {
        default_terms: defaultTerms,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-profiles'] });
      toast.success('Default terms saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save terms'),
  });

  // ─── Save Phases ─────────────────────────────────
  const savePhases = useMutation({
    mutationFn: () =>
      base44.entities.FieldServiceProfile.update(profile.id, {
        phase_labels: { items: phases },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-profiles'] });
      toast.success('Photo phases saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save phases'),
  });

  const addPhase = () => {
    if (!newPhase.trim()) return;
    setPhases((prev) => [...prev, newPhase.trim()]);
    setNewPhase('');
  };

  const removePhase = (index) => {
    setPhases((prev) => prev.filter((_, i) => i !== index));
  };

  const movePhase = (index, direction) => {
    setPhases((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // ─── Save Features ─────────────────────────────
  const saveFeatures = useMutation({
    mutationFn: () =>
      base44.entities.FieldServiceProfile.update(profile.id, {
        features_json: features,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-profiles'] });
      toast.success('Feature settings saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save features'),
  });

  // ─── Save Trade Categories ────────────────────
  const saveTradeCategories = useMutation({
    mutationFn: () =>
      base44.entities.FieldServiceProfile.update(profile.id, {
        trade_categories_json: { items: tradeCategories },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-profiles'] });
      toast.success('Trade categories saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save trade categories'),
  });

  // ─── Save Workspace Name ─────────────────────────
  const saveWorkspaceName = useMutation({
    mutationFn: () =>
      base44.entities.FieldServiceProfile.update(profile.id, {
        workspace_name: workspaceName.trim() || 'My Field Service',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-profiles'] });
      toast.success('Workspace name saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save'),
  });

  // ─── Delete workspace (server-side cascade) ────────────────────────────
  const deleteWorkspace = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('manageFieldServiceWorkspace', {
        action: 'delete_workspace_cascade',
        profile_id: profile.id,
      });
      if (result?.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-profiles'] });
      toast.success('Workspace deleted');
      navigate(createPageUrl('MyLane'));
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete workspace'),
  });

  const createdDate = profile?.created_date
    ? new Date(profile.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="space-y-4">
      {/* Section 0: Workspace Features */}
      <Section icon={SlidersHorizontal} title="Workspace Features" defaultOpen>
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Turn features on or off based on your needs.</p>

          {[
            { key: 'permits_enabled', label: 'Permits & Inspections', desc: 'Track building permits, inspection logs, and eBuild links' },
            { key: 'subs_enabled', label: 'Subcontractor Tracking', desc: 'Add subs to estimates, assign to projects, track in People tab' },
            { key: 'management_fees_enabled', label: 'Management Fees', desc: 'Add a percentage-based management fee to estimates' },
            { key: 'overhead_profit_enabled', label: 'Overhead & Profit (O&P)', desc: 'Add an O&P percentage line to estimates for insurance work' },
            { key: 'xactimate_enabled', label: 'Xactimate Formatting', desc: 'Group estimate line items by trade category in Xactimate style' },
            { key: 'payments_enabled', label: 'Payment Tracking', desc: 'Track payments received per project' },
            { key: 'timeline_enabled', label: 'Project Timeline', desc: 'Chronological view of project activity' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
              <button
                type="button"
                onClick={() => setFeatures((prev) => ({ ...prev, [key]: !prev[key] }))}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                  features[key] ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-slate-100 transition-transform ${
                  features[key] ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => saveFeatures.mutate()}
              disabled={saveFeatures.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
            >
              {saveFeatures.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Features</>}
            </Button>
          </div>
        </div>
      </Section>

      {/* Section: Trade Categories — only when insurance feature is on */}
      {features.xactimate_enabled && (
        <Section icon={FileText} title="Trade Categories">
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Categories used to organize line items on insurance estimates. Drag to reorder.
            </p>

            {tradeCategories.length > 0 && (
              <div className="space-y-2">
                {tradeCategories.map((cat, idx) => (
                  <div key={cat.id || idx} className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-3">
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (idx === 0) return;
                          setTradeCategories((prev) => {
                            const next = [...prev];
                            [next[idx], next[idx - 1]] = [next[idx - 1], next[idx]];
                            return next.map((c, i) => ({ ...c, order: i }));
                          });
                        }}
                        disabled={idx === 0}
                        className="text-slate-500 hover:text-amber-500 disabled:opacity-30 text-xs leading-none"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (idx === tradeCategories.length - 1) return;
                          setTradeCategories((prev) => {
                            const next = [...prev];
                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                            return next.map((c, i) => ({ ...c, order: i }));
                          });
                        }}
                        disabled={idx === tradeCategories.length - 1}
                        className="text-slate-500 hover:text-amber-500 disabled:opacity-30 text-xs leading-none"
                      >
                        ▼
                      </button>
                    </div>
                    <Input
                      value={cat.name}
                      onChange={(e) => {
                        setTradeCategories((prev) =>
                          prev.map((c, i) => i === idx ? { ...c, name: e.target.value } : c)
                        );
                      }}
                      className="flex-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setTradeCategories((prev) => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, order: i })))}
                      className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Input
                value={newTradeCat}
                onChange={(e) => setNewTradeCat(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTradeCat.trim()) {
                    e.preventDefault();
                    setTradeCategories((prev) => [
                      ...prev,
                      { id: `cat_${Date.now()}`, name: newTradeCat.trim(), order: prev.length },
                    ]);
                    setNewTradeCat('');
                  }
                }}
                className="flex-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="New category name"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newTradeCat.trim()) return;
                  setTradeCategories((prev) => [
                    ...prev,
                    { id: `cat_${Date.now()}`, name: newTradeCat.trim(), order: prev.length },
                  ]);
                  setNewTradeCat('');
                }}
                disabled={!newTradeCat.trim()}
                className="flex items-center gap-1 text-sm text-amber-500 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => saveTradeCategories.mutate()}
                disabled={saveTradeCategories.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
              >
                {saveTradeCategories.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Categories</>}
              </Button>
            </div>
          </div>
        </Section>
      )}

      {/* Section 1: Business Profile */}
      <Section icon={HardHat} title="Business Profile" defaultOpen>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-400">Business name</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-400">Owner name</Label>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-400">License/CCB number</Label>
            <Input
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-400">Phone</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-400">Email</Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-400">Website</Label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="https://"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-400">Service area</Label>
              <Input
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
                className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-400">Default hourly rate</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  onFocus={(e) => { if (parseFloat(e.target.value) === 0) setHourlyRate(''); }}
                  onBlur={(e) => { if (e.target.value === '') setHourlyRate('0'); }}
                  className="pl-7 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-slate-400">Tagline</Label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="A short description of your business"
            />
          </div>

          <div>
            <Label className="text-slate-400">Business Logo</Label>
            <div className="flex items-center gap-4 mt-1">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="max-h-16 max-w-[200px] object-contain rounded-lg border border-slate-700" />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <Camera className="h-5 w-5 text-slate-500" />
                </div>
              )}
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 transition-colors text-sm cursor-pointer min-h-[44px]">
                    {logoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                    {logoUploading ? 'Uploading...' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={logoUploading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const { validateFile } = await import('@/utils/fileValidation');
                        const check = validateFile(file);
                        if (!check.valid) { toast.error(check.error); return; }
                        setLogoUploading(true);
                        try {
                          const result = await base44.integrations.Core.UploadFile({ file });
                          const url = result?.file_url ?? result?.url;
                          if (url) {
                            setLogoUrl(url);
                            toast.success('Logo uploaded');
                          }
                        } catch (err) {
                          toast.error('Upload failed: ' + (err?.message || 'Unknown error'));
                        } finally {
                          setLogoUploading(false);
                        }
                      }}
                    />
                  </label>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl('')}
                      className="px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-400 transition-colors text-sm min-h-[44px]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">Square image recommended (PNG or JPG)</p>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-slate-400">Brand color</Label>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="flex-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="#f59e0b"
                maxLength={7}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => saveProfile.mutate()}
              disabled={saveProfile.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
            >
              {saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Profile</>}
            </Button>
          </div>
        </div>
      </Section>

      {/* Section 2: Team & Invite Link */}
      <Section icon={Users} title="Team">
        <div className="space-y-4">
          {/* Invite Link */}
          <div>
            <p className="text-sm text-slate-400 mb-3">
              Share this link with workers and subcontractors so they can join your workspace.
            </p>
            {profile?.invite_code ? (
              <div className="bg-slate-800/50 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <code className="text-sm text-slate-200 font-mono flex-1 truncate">
                    {window.location.origin}/join-field-service/{profile.invite_code}
                  </code>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/join-field-service/${profile.invite_code}`).then(
                        () => toast.success('Invite link copied!'),
                        () => toast.error('Could not copy link'),
                      );
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-amber-500 hover:border-amber-500 hover:bg-transparent transition-colors text-sm min-h-[44px]"
                  >
                    <Copy className="h-4 w-4" /> Copy Link
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const newCode = generateInviteCode();
                      try {
                        await base44.entities.FieldServiceProfile.update(profile.id, { invite_code: newCode });
                        queryClient.invalidateQueries({ queryKey: ['fs-profiles'] });
                        toast.success('Invite code regenerated. Old links will stop working.');
                      } catch (err) {
                        toast.error(err?.message || 'Failed to regenerate');
                      }
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-amber-500 hover:border-amber-500 hover:bg-transparent transition-colors text-sm min-h-[44px]"
                  >
                    <RefreshCw className="h-4 w-4" /> Regenerate
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 rounded-lg p-3">
                <p className="text-sm text-slate-500 mb-2">No invite code yet.</p>
                <button
                  type="button"
                  onClick={async () => {
                    const code = generateInviteCode();
                    try {
                      await base44.entities.FieldServiceProfile.update(profile.id, { invite_code: code });
                      queryClient.invalidateQueries({ queryKey: ['fs-profiles'] });
                      toast.success('Invite code generated!');
                    } catch (err) {
                      toast.error(err?.message || 'Failed to generate invite code');
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-colors text-sm min-h-[44px]"
                >
                  <Link2 className="h-4 w-4" /> Generate Invite Code
                </button>
              </div>
            )}
          </div>

          {/* Link to People tab */}
          <div className="border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={() => onNavigateTab?.('people')}
              className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 transition-colors min-h-[44px]"
            >
              <Users className="h-4 w-4" /> Manage your team in the People tab →
            </button>
          </div>
        </div>
      </Section>

      {/* Section 3: Default Terms */}
      <Section icon={FileText} title="Default Terms">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            These will be pre-filled on new estimates. You can edit them per-estimate.
          </p>
          <textarea
            value={defaultTerms}
            onChange={(e) => setDefaultTerms(e.target.value)}
            rows={6}
            className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg p-3 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none resize-y"
            placeholder="Enter your default estimate terms and conditions..."
          />
          <div className="flex justify-end">
            <Button
              onClick={() => saveTerms.mutate()}
              disabled={saveTerms.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
            >
              {saveTerms.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Terms</>}
            </Button>
          </div>
        </div>
      </Section>

      {/* Section 4: Photo Phases */}
      <Section icon={Camera} title="Photo Phases">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            These appear when you tag photos during daily logging.
          </p>

          {phases.length > 0 && (
            <div className="space-y-2">
              {phases.map((phase, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-3">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => movePhase(idx, -1)}
                      disabled={idx === 0}
                      className="text-slate-500 hover:text-amber-500 disabled:opacity-30 text-xs leading-none"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => movePhase(idx, 1)}
                      disabled={idx === phases.length - 1}
                      className="text-slate-500 hover:text-amber-500 disabled:opacity-30 text-xs leading-none"
                    >
                      ▼
                    </button>
                  </div>
                  <span className="flex-1 text-sm text-slate-100">{phase}</span>
                  <button
                    type="button"
                    onClick={() => removePhase(idx)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Input
              value={newPhase}
              onChange={(e) => setNewPhase(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPhase(); } }}
              className="flex-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="New phase name"
            />
            <button
              type="button"
              onClick={addPhase}
              disabled={!newPhase.trim()}
              className="flex items-center gap-1 text-sm text-amber-500 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => savePhases.mutate()}
              disabled={savePhases.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
            >
              {savePhases.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Phases</>}
            </Button>
          </div>
        </div>
      </Section>

      {/* Section 5: Workspace */}
      <Section icon={Settings} title="Workspace">
        <div className="space-y-4">
          <div>
            <Label className="text-slate-400">Workspace name</Label>
            <Input
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Created</span>
            <span className="text-slate-300">{createdDate}</span>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => saveWorkspaceName.mutate()}
              disabled={saveWorkspaceName.isPending}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
            >
              {saveWorkspaceName.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save</>}
            </Button>
          </div>

          {/* Getting Started Guide Toggle */}
          <div className="border-t border-slate-800 pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-sm font-medium text-slate-200">Getting started guide</p>
                  <p className="text-xs text-slate-500">Show the walkthrough on your Home tab</p>
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const newVal = !profile?.guide_dismissed;
                  try {
                    await base44.entities.FieldServiceProfile.update(profile.id, { guide_dismissed: !newVal });
                    queryClient.setQueryData(['fs-profile', profile?.id], (old) =>
                      old ? { ...old, guide_dismissed: !newVal } : old
                    );
                    queryClient.invalidateQueries(['fs-profile']);
                    toast.success(newVal ? 'Guide hidden' : 'Guide restored — check your Home tab');
                  } catch {
                    toast.error('Could not update guide setting');
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  !profile?.guide_dismissed ? 'bg-amber-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-slate-100 transition-transform ${
                    !profile?.guide_dismissed ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-t border-slate-800 pt-4 mt-4">
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <p className="text-sm font-medium text-red-400">Danger Zone</p>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Permanently delete this workspace and all its data. This cannot be undone.
              </p>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(true)}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-500 hover:text-red-400 min-h-[44px]"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Workspace
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Delete Field Service Workspace?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete your workspace, all projects, logs, and estimates.
              Type <span className="text-red-400 font-mono">delete</span> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            placeholder='Type "delete" to confirm'
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWorkspace.mutate()}
              disabled={deleteConfirmText !== 'delete' || deleteWorkspace.isPending}
              className="bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
            >
              {deleteWorkspace.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete Forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
