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
  Users, Copy, RefreshCw, UserMinus,
} from 'lucide-react';
import { toast } from 'sonner';
import { generateInviteCode } from '@/utils/inviteCode';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

// ═══ Collapsible Section ═══

function Section({ icon: Icon, title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-secondary/50 transition-colors min-h-[44px]"
      >
        <Icon className="h-5 w-5 text-primary flex-shrink-0" />
        <span className="text-lg font-bold text-foreground flex-1">{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </div>
  );
}

// ═══ Main Component ═══

export default function PropertyManagementSettings({ profile, currentUser, memberRole, isAdmin, canEdit }) {
  // Role guard
  if (!memberRole) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>You don't have access to this workspace.</p>
      </div>
    );
  }

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

  // ─── Invite code regeneration dialogs ────────
  const [regenType, setRegenType] = useState(null); // 'tenant' | 'owner' | 'manager'

  // ─── Members query ──────────────────────────────
  const { data: members = [], refetch: refetchMembers } = useQuery({
    queryKey: ['pm-members', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      try {
        const list = await base44.entities.PMWorkspaceMember.filter({ profile_id: profile.id });
        return Array.isArray(list) ? list : [];
      } catch { return []; }
    },
    enabled: !!profile?.id,
  });

  // Auto-generate missing invite codes on mount
  useEffect(() => {
    if (!profile?.id || profile.user_id !== currentUser?.id) return;
    const updates = {};
    if (!profile.tenant_invite_code) updates.tenant_invite_code = generateInviteCode();
    if (!profile.owner_invite_code) updates.owner_invite_code = generateInviteCode();
    if (!profile.manager_invite_code) updates.manager_invite_code = generateInviteCode();
    if (Object.keys(updates).length > 0) {
      base44.entities.PMPropertyProfile.update(profile.id, updates).then(() => {
        queryClient.invalidateQueries({ queryKey: ['pm-profiles'] });
      }).catch(() => {});
    }
  }, [profile?.id, profile?.tenant_invite_code, profile?.owner_invite_code, profile?.manager_invite_code, currentUser?.id]);

  const regenerateCode = useMutation({
    mutationFn: async (type) => {
      const field = type === 'tenant' ? 'tenant_invite_code'
        : type === 'owner' ? 'owner_invite_code'
        : 'manager_invite_code';
      await base44.entities.PMPropertyProfile.update(profile.id, {
        [field]: generateInviteCode(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-profiles'] });
      setRegenType(null);
      toast.success('Invite code regenerated. Old links will no longer work.');
    },
    onError: (err) => toast.error(err?.message || 'Failed to regenerate'),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId) => {
      await base44.entities.PMWorkspaceMember.delete(memberId);
    },
    onSuccess: () => {
      refetchMembers();
      toast.success('Member removed');
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove member'),
  });

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

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

  // ─── Delete Workspace (server-side cascade) ────
  const deleteWorkspace = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('managePMWorkspace', {
        action: 'delete_workspace_cascade',
        profile_id: profile.id,
      });
      if (result.error) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-profiles'] });
      toast.success('Space deleted');
      navigate(createPageUrl('MyLane'));
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
            <Label className="text-muted-foreground">Business name</Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
              placeholder="Business or portfolio name"
            />
          </div>

          <div>
            <Label className="text-muted-foreground">Manager name</Label>
            <Input
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
              placeholder="Your name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Email</Label>
              <Input
                type="email"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <Input
                value={managerPhone}
                onChange={(e) => setManagerPhone(e.target.value)}
                className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
                placeholder="(541) 555-0100"
              />
            </div>
          </div>

          <Button
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold min-h-[44px]"
          >
            {saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Profile</>}
          </Button>
        </div>
      </Section>

      {/* ═══ Default Percentages ═══ */}
      <Section icon={DollarSign} title="Default Percentages">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These defaults apply to new property groups. Existing groups keep their own percentages.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-muted-foreground">Management fee %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={mgmtFeePct}
                onChange={(e) => setMgmtFeePct(e.target.value)}
                className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Maintenance reserve %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={maintReservePct}
                onChange={(e) => setMaintReservePct(e.target.value)}
                className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <Label className="text-muted-foreground">Emergency reserve %</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={emergReservePct}
                onChange={(e) => setEmergReservePct(e.target.value)}
                className="w-full mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Live preview */}
          <div className="bg-secondary/50 rounded-lg p-4 border border-border/50">
            <p className="text-xs text-muted-foreground/70 mb-3">Sample: {fmt(sampleRent)}/mo gross rent</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Management fee ({mgmtFeePct || 0}%)</span>
                <span className="text-foreground-soft">{fmt(previewMgmt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Maintenance reserve ({maintReservePct || 0}%)</span>
                <span className="text-foreground-soft">{fmt(previewMaint)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Emergency reserve ({emergReservePct || 0}%)</span>
                <span className="text-foreground-soft">{fmt(previewEmerg)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="text-foreground font-medium">Net distributable</span>
                <span className="text-primary font-semibold">{fmt(previewNet)}</span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => saveDefaults.mutate()}
            disabled={saveDefaults.isPending}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold min-h-[44px]"
          >
            {saveDefaults.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Defaults</>}
          </Button>
        </div>
      </Section>

      {/* ═══ Linked Spaces ═══ */}
      <Section icon={Link2} title="Linked Spaces">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Link this space to other spaces for integrated financial tracking.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-4">
              <div>
                <p className="text-sm text-foreground-soft">Finance Space</p>
                <p className="text-xs text-muted-foreground/70">
                  {linkedFinance
                    ? linkedFinance.workspace_name || 'Linked'
                    : 'Not linked'}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                linkedFinance
                  ? 'bg-primary/20 text-primary'
                  : 'bg-surface text-muted-foreground'
              }`}>
                {linkedFinance ? 'Connected' : 'None'}
              </span>
            </div>

            <div className="flex items-center justify-between bg-secondary/50 rounded-lg p-4">
              <div>
                <p className="text-sm text-foreground-soft">Business Space</p>
                <p className="text-xs text-muted-foreground/70">
                  {linkedBusiness
                    ? linkedBusiness.name || 'Linked'
                    : 'Not linked'}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                linkedBusiness
                  ? 'bg-primary/20 text-primary'
                  : 'bg-surface text-muted-foreground'
              }`}>
                {linkedBusiness ? 'Connected' : 'None'}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground/70">
            Space linking will be available in a future update.
          </p>
        </div>
      </Section>

      {/* ═══ Invite Codes ═══ */}
      <Section icon={Users} title="Invite Links">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share these links to invite tenants, co-owners, and managers to your workspace.
          </p>

          {[
            { type: 'tenant', label: 'TENANT INVITE', desc: 'Share with tenants to access their unit', code: profile?.tenant_invite_code, accent: 'border-primary/30' },
            { type: 'owner', label: 'OWNER INVITE', desc: 'Share with co-owners to view property data', code: profile?.owner_invite_code, accent: 'border-border' },
            { type: 'manager', label: 'MANAGER INVITE', desc: 'Share with property managers', code: profile?.manager_invite_code, accent: 'border-border' },
          ].map(({ type, label, desc, code, accent }) => (
            <div key={type} className={`bg-secondary/50 border ${accent} rounded-xl p-4`}>
              <p className={`text-xs font-semibold tracking-wider mb-1 ${type === 'tenant' ? 'text-primary' : 'text-foreground-soft'}`}>
                {label}
              </p>
              <p className="text-xs text-muted-foreground/70 mb-3">{desc}</p>
              {code ? (
                <>
                  <p className="text-xl font-mono text-foreground mb-3">{code}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => copyToClipboard(code, 'Code')}
                      className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Code
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`${window.location.origin}/join-pm/${code}`, 'Link')}
                      className="border-border text-foreground-soft hover:bg-secondary hover:text-foreground gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRegenType(type)}
                      disabled={regenerateCode.isPending}
                      className="border-border text-foreground-soft hover:bg-secondary hover:text-foreground gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground/70">Code will be generated automatically.</p>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ═══ Members ═══ */}
      <Section icon={Users} title="Members">
        <div className="space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet. Share an invite link to add people.</p>
          ) : (
            members
              .filter((m) => m.user_id !== currentUser?.id)
              .map((m) => {
                const roleBadge = {
                  admin: 'bg-primary text-primary-foreground',
                  property_manager: 'bg-purple-500 text-white',
                  owner: 'bg-blue-500/20 text-blue-400',
                  tenant: 'border border-muted-foreground text-foreground-soft',
                  worker: 'border border-muted-foreground text-foreground-soft',
                }[m.role] || 'bg-surface text-muted-foreground';
                const roleLabel = {
                  admin: 'Admin',
                  property_manager: 'Manager',
                  owner: 'Owner',
                  tenant: 'Tenant',
                  worker: 'Worker',
                }[m.role] || m.role;
                return (
                  <div key={m.id} className="flex items-center justify-between bg-secondary/50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{m.name || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground/70">{m.joined_at ? `Joined ${String(m.joined_at).slice(0, 10)}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${roleBadge}`}>{roleLabel}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMember.mutate(m.id)}
                        disabled={removeMember.isPending}
                        className="text-muted-foreground/70 hover:text-red-400 hover:bg-transparent p-1"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      </Section>

      {/* Regenerate confirmation */}
      <AlertDialog open={!!regenType} onOpenChange={(open) => !open && setRegenType(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Regenerate invite code?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              The current {regenType} invite link will stop working. Anyone who already joined will keep access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-foreground-soft hover:bg-secondary">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => regenerateCode.mutate(regenType)}
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
              disabled={regenerateCode.isPending}
            >
              {regenerateCode.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Regenerate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ Danger Zone ═══ */}
      <Section icon={AlertTriangle} title="Danger Zone">
        <div className="space-y-4">
          {/* Rename */}
          <div>
            <Label className="text-muted-foreground">Space name</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="flex-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-primary focus:ring-1 focus:ring-ring"
                placeholder="My Properties"
              />
              <Button
                onClick={() => saveWorkspaceName.mutate()}
                disabled={saveWorkspaceName.isPending}
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold min-h-[44px]"
              >
                {saveWorkspaceName.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rename'}
              </Button>
            </div>
          </div>

          {/* Delete */}
          <div className="border-t border-border pt-4">
            <p className="text-sm text-muted-foreground mb-3">
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
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete this space?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete all properties, expenses, labor entries, maintenance requests,
              settlements, owners, and all other data in this space. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-muted-foreground text-sm">
              Type <span className="text-red-400 font-mono">DELETE</span> to confirm
            </Label>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="mt-1 bg-secondary border-border text-foreground placeholder-muted-foreground/70 focus:border-red-500 focus:ring-1 focus:ring-red-500"
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="bg-transparent border-border text-foreground-soft hover:bg-secondary"
              onClick={() => setDeleteConfirmText('')}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWorkspace.mutate()}
              className="bg-red-600 hover:bg-red-500 text-foreground"
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
