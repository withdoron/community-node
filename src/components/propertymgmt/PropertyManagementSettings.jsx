import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
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
  Settings, Save, Loader2, AlertTriangle, Trash2,
  ChevronDown, ChevronRight, Building2, DollarSign, Link2, User,
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

export default function PropertyManagementSettings({ profile, currentUser }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ─── Manager Profile state ────────────────────
  const [managerName, setManagerName] = useState(profile?.manager_name || '');
  const [managerEmail, setManagerEmail] = useState(profile?.manager_email || '');
  const [managerPhone, setManagerPhone] = useState(profile?.manager_phone || '');
  const [businessName, setBusinessName] = useState(profile?.business_name || '');

  // ─── Default Percentages state ────────────────
  const [mgmtFeePct, setMgmtFeePct] = useState(profile?.default_mgmt_fee_pct?.toString() || '10');
  const [maintReservePct, setMaintReservePct] = useState(profile?.default_maint_reserve_pct?.toString() || '10');
  const [emergReservePct, setEmergReservePct] = useState(profile?.default_emerg_reserve_pct?.toString() || '5');

  // ─── Workspace state ──────────────────────────
  const [workspaceName, setWorkspaceName] = useState(profile?.workspace_name || '');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Sync from profile if it changes
  useEffect(() => {
    if (profile) {
      setManagerName(profile.manager_name || '');
      setManagerEmail(profile.manager_email || '');
      setManagerPhone(profile.manager_phone || '');
      setBusinessName(profile.business_name || '');
      setMgmtFeePct(profile.default_mgmt_fee_pct?.toString() || '10');
      setMaintReservePct(profile.default_maint_reserve_pct?.toString() || '10');
      setEmergReservePct(profile.default_emerg_reserve_pct?.toString() || '5');
      setWorkspaceName(profile.workspace_name || '');
    }
  }, [profile]);

  // ─── Linked workspace names ───────────────────
  const { data: linkedFinance } = useQuery({
    queryKey: ['linked-finance-profile', profile?.linked_finance_workspace_id],
    queryFn: async () => {
      if (!profile?.linked_finance_workspace_id) return null;
      return base44.entities.FinancialProfile.get(profile.linked_finance_workspace_id);
    },
    enabled: !!profile?.linked_finance_workspace_id,
  });

  const { data: linkedBusiness } = useQuery({
    queryKey: ['linked-business-profile', profile?.linked_business_workspace_id],
    queryFn: async () => {
      if (!profile?.linked_business_workspace_id) return null;
      return base44.entities.Business.get(profile.linked_business_workspace_id);
    },
    enabled: !!profile?.linked_business_workspace_id,
  });

  // ─── Save Manager Profile ────────────────────
  const saveProfile = useMutation({
    mutationFn: () =>
      base44.entities.PMPropertyProfile.update(profile.id, {
        manager_name: managerName.trim(),
        manager_email: managerEmail.trim(),
        manager_phone: managerPhone.trim(),
        business_name: businessName.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-profiles'] });
      toast.success('Manager profile saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save'),
  });

  // ─── Save Default Percentages ─────────────────
  const saveDefaults = useMutation({
    mutationFn: () =>
      base44.entities.PMPropertyProfile.update(profile.id, {
        default_mgmt_fee_pct: parseFloat(mgmtFeePct) || 0,
        default_maint_reserve_pct: parseFloat(maintReservePct) || 0,
        default_emerg_reserve_pct: parseFloat(emergReservePct) || 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-profiles'] });
      toast.success('Default percentages saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save'),
  });

  // ─── Save Workspace Name ──────────────────────
  const saveWorkspaceName = useMutation({
    mutationFn: () =>
      base44.entities.PMPropertyProfile.update(profile.id, {
        workspace_name: workspaceName.trim() || 'My Properties',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-profiles'] });
      toast.success('Space name saved');
    },
    onError: (err) => toast.error(err?.message || 'Failed to save'),
  });

  // ─── Delete Workspace ─────────────────────────
  const deleteWorkspace = useMutation({
    mutationFn: async () => {
      // Delete all child entities first
      const groups = await base44.entities.PMPropertyGroup.filter({ profile_id: profile.id });
      const props = await base44.entities.PMProperty.filter({ profile_id: profile.id });
      const expenses = await base44.entities.PMExpense.filter({ profile_id: profile.id });
      const laborEntries = await base44.entities.PMLaborEntry.filter({ profile_id: profile.id });
      const maintenanceReqs = await base44.entities.PMMaintenanceRequest.filter({ profile_id: profile.id });
      const settlements = await base44.entities.PMSettlement.filter({ profile_id: profile.id });
      const owners = await base44.entities.PMOwner.filter({ profile_id: profile.id });
      const stakes = await base44.entities.PMOwnershipStake.filter({ profile_id: profile.id });
      const splits = await base44.entities.PMDistributionSplit.filter({ profile_id: profile.id });
      const listingsData = await base44.entities.PMListing.filter({ profile_id: profile.id });
      const guestsData = await base44.entities.PMGuest.filter({ profile_id: profile.id });

      const toDelete = [
        ...(Array.isArray(guestsData) ? guestsData : []).map((r) => base44.entities.PMGuest.delete(r.id)),
        ...(Array.isArray(listingsData) ? listingsData : []).map((r) => base44.entities.PMListing.delete(r.id)),
        ...(Array.isArray(splits) ? splits : []).map((r) => base44.entities.PMDistributionSplit.delete(r.id)),
        ...(Array.isArray(stakes) ? stakes : []).map((r) => base44.entities.PMOwnershipStake.delete(r.id)),
        ...(Array.isArray(owners) ? owners : []).map((r) => base44.entities.PMOwner.delete(r.id)),
        ...(Array.isArray(settlements) ? settlements : []).map((r) => base44.entities.PMSettlement.delete(r.id)),
        ...(Array.isArray(maintenanceReqs) ? maintenanceReqs : []).map((r) => base44.entities.PMMaintenanceRequest.delete(r.id)),
        ...(Array.isArray(laborEntries) ? laborEntries : []).map((r) => base44.entities.PMLaborEntry.delete(r.id)),
        ...(Array.isArray(expenses) ? expenses : []).map((r) => base44.entities.PMExpense.delete(r.id)),
        ...(Array.isArray(props) ? props : []).map((r) => base44.entities.PMProperty.delete(r.id)),
        ...(Array.isArray(groups) ? groups : []).map((r) => base44.entities.PMPropertyGroup.delete(r.id)),
      ];
      await Promise.all(toDelete);
      await base44.entities.PMPropertyProfile.delete(profile.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-profiles'] });
      toast.success('Space deleted');
      navigate(createPageUrl('BusinessDashboard') + '?landing=1');
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete space'),
  });

  // ─── Live Preview ─────────────────────────────
  const sampleRent = 2690;
  const previewMgmt = sampleRent * ((parseFloat(mgmtFeePct) || 0) / 100);
  const previewMaint = sampleRent * ((parseFloat(maintReservePct) || 0) / 100);
  const previewEmerg = sampleRent * ((parseFloat(emergReservePct) || 0) / 100);
  const previewNet = sampleRent - previewMgmt - previewMaint - previewEmerg;

  return (
    <div className="space-y-4">
      {/* ═══ Manager Profile ═══ */}
      <Section icon={User} title="Manager Profile" defaultOpen>
        <div className="space-y-4">
          <div>
            <Label className="text-slate-400">Business name</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="Business or portfolio name"
            />
          </div>

          <div>
            <Label className="text-slate-400">Manager name</Label>
            <Input
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              placeholder="Your name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-400">Email</Label>
              <Input
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label className="text-slate-400">Phone</Label>
              <Input
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="(541) 555-0100"
              />
            </div>
          </div>

          <Button
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
          >
            {saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Profile</>}
          </Button>
        </div>
      </Section>

      {/* ═══ Default Percentages ═══ */}
      <Section icon={DollarSign} title="Default Percentages">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            These defaults apply to new property groups. Existing groups keep their own percentages.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-slate-400">Management fee %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={mgmtFeePct}
                onChange={(e) => setMgmtFeePct(e.target.value)}
                className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-400">Maintenance reserve %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={maintReservePct}
                onChange={(e) => setMaintReservePct(e.target.value)}
                className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <Label className="text-slate-400">Emergency reserve %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={emergReservePct}
                onChange={(e) => setEmergReservePct(e.target.value)}
                className="w-full mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <p className="text-xs text-slate-500 mb-3">Sample: {fmt(sampleRent)}/mo gross rent</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Management fee ({mgmtFeePct || 0}%)</span>
                <span className="text-slate-300">{fmt(previewMgmt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Maintenance reserve ({maintReservePct || 0}%)</span>
                <span className="text-slate-300">{fmt(previewMaint)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Emergency reserve ({emergReservePct || 0}%)</span>
                <span className="text-slate-300">{fmt(previewEmerg)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-700">
                <span className="text-slate-100 font-medium">Net distributable</span>
                <span className="text-amber-500 font-semibold">{fmt(previewNet)}</span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => saveDefaults.mutate()}
            disabled={saveDefaults.isPending}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
          >
            {saveDefaults.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Defaults</>}
          </Button>
        </div>
      </Section>

      {/* ═══ Linked Spaces ═══ */}
      <Section icon={Link2} title="Linked Spaces">
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Link this space to other spaces for integrated financial tracking.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4">
              <div>
                <p className="text-sm text-slate-300">Finance Space</p>
                <p className="text-xs text-slate-500">
                  {linkedFinance
                    ? linkedFinance.workspace_name || 'Linked'
                    : 'Not linked'}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                linkedFinance
                  ? 'bg-amber-500/20 text-amber-500'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {linkedFinance ? 'Connected' : 'None'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4">
              <div>
                <p className="text-sm text-slate-300">Business Space</p>
                <p className="text-xs text-slate-500">
                  {linkedBusiness
                    ? linkedBusiness.name || 'Linked'
                    : 'Not linked'}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                linkedBusiness
                  ? 'bg-amber-500/20 text-amber-500'
                  : 'bg-slate-700 text-slate-400'
              }`}>
                {linkedBusiness ? 'Connected' : 'None'}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Space linking will be available in a future update.
          </p>
        </div>
      </Section>

      {/* ═══ Danger Zone ═══ */}
      <Section icon={AlertTriangle} title="Danger Zone">
        <div className="space-y-4">
          {/* Rename */}
          <div>
            <Label className="text-slate-400">Space name</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="flex-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                placeholder="My Properties"
              />
              <Button
                onClick={() => saveWorkspaceName.mutate()}
                disabled={saveWorkspaceName.isPending}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold min-h-[44px]"
              >
                {saveWorkspaceName.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rename'}
              </Button>
            </div>
          </div>

          {/* Delete */}
          <div className="border-t border-slate-800 pt-4">
            <p className="text-sm text-slate-400 mb-3">
              Permanently delete this space and all its data. This cannot be undone.
            </p>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="border-red-600/50 text-red-400 hover:bg-red-600/10 hover:border-red-600 hover:text-red-400 min-h-[44px]"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Space
            </Button>
          </div>
        </div>
      </Section>

      {/* ─── Delete Confirmation Dialog ──────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Delete this space?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will permanently delete all properties, expenses, labor entries, maintenance requests,
              settlements, owners, and all other data in this space. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-slate-400 text-sm">
              Type <span className="text-red-400 font-mono">DELETE</span> to confirm
            </Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="mt-1 bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => setDeleteConfirmText('')}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWorkspace.mutate()}
              className="bg-red-600 hover:bg-red-500 text-white"
              disabled={deleteConfirmText !== 'DELETE' || deleteWorkspace.isPending}
            >
              {deleteWorkspace.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Delete Everything'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
