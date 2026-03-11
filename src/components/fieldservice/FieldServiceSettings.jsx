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
} from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

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

export default function FieldServiceSettings({ profile, currentUser }) {
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

  // ─── Workers state ───────────────────────────────
  const [workers, setWorkers] = useState(profile?.workers_json || []);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerRate, setNewWorkerRate] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');

  // ─── Default Terms state ─────────────────────────
  const [defaultTerms, setDefaultTerms] = useState(profile?.default_terms || '');

  // ─── Phase Labels state ──────────────────────────
  const [phases, setPhases] = useState(profile?.phase_labels || ['Before', 'Demo', 'Framing', 'Rough-in', 'Finish', 'Final']);
  const [newPhase, setNewPhase] = useState('');

  // ─── Workspace state ─────────────────────────────
  const [workspaceName, setWorkspaceName] = useState(profile?.workspace_name || '');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

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
      setWorkers(profile.workers_json || []);
      setDefaultTerms(profile.default_terms || '');
      setPhases(profile.phase_labels || ['Before', 'Demo', 'Framing', 'Rough-in', 'Finish', 'Final']);
      setWorkspaceName(profile.workspace_name || '');
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
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-profiles'] });
      toast.success('Business profile saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save'),
  });

  // ─── Save Workers ────────────────────────────────
  const saveWorkers = useMutation({
    mutationFn: () =>
      base44.entities.FieldServiceProfile.update(profile.id, {
        workers_json: workers,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-profiles'] });
      toast.success('Workers saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save workers'),
  });

  const addWorker = () => {
    if (!newWorkerName.trim()) return;
    setWorkers((prev) => [
      ...prev,
      {
        name: newWorkerName.trim(),
        hourly_rate: parseFloat(newWorkerRate) || parseFloat(hourlyRate) || 0,
        phone: newWorkerPhone.trim(),
      },
    ]);
    setNewWorkerName('');
    setNewWorkerRate('');
    setNewWorkerPhone('');
  };

  const removeWorker = (index) => {
    setWorkers((prev) => prev.filter((_, i) => i !== index));
  };

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
        phase_labels: phases,
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

  // ─── Delete workspace ────────────────────────────
  const deleteWorkspace = useMutation({
    mutationFn: () => base44.entities.FieldServiceProfile.delete(profile.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fs-profiles'] });
      toast.success('Workspace deleted');
      navigate(createPageUrl('BusinessDashboard') + '?landing=1');
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete workspace'),
  });

  const createdDate = profile?.created_date
    ? new Date(profile.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  return (
    <div className="space-y-4">
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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

      {/* Section 2: Workers */}
      <Section icon={Users} title="Workers">
        <div className="space-y-4">
          {workers.length > 0 && (
            <div className="space-y-2">
              {workers.map((worker, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">{worker.name}</p>
                    <p className="text-xs text-slate-400">
                      {fmt(worker.hourly_rate)}/hr
                      {worker.phone ? ` · ${worker.phone}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeWorker(idx)}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-slate-800 pt-4">
            <p className="text-sm text-slate-400 mb-3">Add a worker</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="Name"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newWorkerRate}
                  onChange={(e) => setNewWorkerRate(e.target.value)}
                  className="pl-7 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="Rate/hr"
                />
              </div>
              <Input
                value={newWorkerPhone}
                onChange={(e) => setNewWorkerPhone(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="Phone (optional)"
              />
            </div>
            <div className="flex justify-between mt-3">
              <button
                type="button"
                onClick={addWorker}
                disabled={!newWorkerName.trim()}
                className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                <Plus className="h-4 w-4" /> Add Worker
              </button>
              <Button
                onClick={() => saveWorkers.mutate()}
                disabled={saveWorkers.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
              >
                {saveWorkers.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Workers</>}
              </Button>
            </div>
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
