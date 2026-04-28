// BusinessSettingsSpace — Phase 4.2-tiles-5
//
// The owner-facing Settings space surface. Lights up when a business owner
// taps the Settings tile inside their business cockpit. Operational concerns
// only — public-facing content (logo, name, services, etc.) lives on the
// Profile space (BusinessProfileSpace.jsx).
//
// Sections (in render order):
//   1. Enabled Spaces — list of currently-active spaces with remove control.
//      Universal spaces (Profile, Settings) appear with no remove control.
//   2. Add Space — picker modal showing every non-universal catalog entry.
//      Already-enabled entries marked "Active". Coming-soon entries disabled.
//   3. Document Branding — document_logo_url + business_name_for_documents.
//      Document logo is separate from the Profile's directory logo (different
//      use cases, different optimal crops).
//   4. Directory Visibility — listed_in_directory toggle.
//   5. Accepts Payments — accepts_joy_coins, accepts_silver toggles.
//   6. Subscription — read-only tier display.
//   7. Delete Business — destructive action with confirmation.
//
// Living-feet discipline (DEC-190): every space label, sublabel, description,
// and pricing display reads from the SPACE_TYPES catalog. No hardcoded space
// names anywhere in this file. The Jobs rename arc updates the catalog, not
// this UI.
//
// Universal spaces constant (DEC-186): UNIVERSAL_SPACE_IDS exported from
// spaceTypes.js. Imported here, used to filter the picker and gate remove
// controls. Never re-declared inline.
//
// Pricing display (DEC-101/DEC-128): every entry's pricing.display field is
// 'Free during beta' for now. When Stripe integration lands, the override
// is removed and the display computes from type/amount/period. This UI
// reads `pricing.display` directly — no schema change needed at that time.

import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Settings as SettingsIcon, Plus, X, Loader2, Upload, FileText, Globe, Coins, Trash2, Star, Zap, Crown, Check,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Business } from '@/api/business';
import {
  SPACE_TYPES,
  UNIVERSAL_SPACE_IDS,
  resolveBusinessSpaces,
  listAddableSpaces,
} from '@/config/spaceTypes';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const TIER_CONFIG = {
  basic: {
    label: 'Basic', sublabel: 'Free', icon: Star,
    color: 'text-foreground-soft', bg: 'bg-surface',
    description: 'List your business, create events (pending review), appear in directory.',
  },
  standard: {
    label: 'Standard', sublabel: '', icon: Zap,
    color: 'text-primary', bg: 'bg-primary/20',
    description: 'Accept Joy Coins, auto-publish events, revenue analytics, priority in directory.',
  },
  partner: {
    label: 'Partner', sublabel: '', icon: Crown,
    color: 'text-primary', bg: 'bg-primary/20',
    description: 'Everything in Standard plus dedicated partner node, custom branding, priority support.',
  },
};

export default function BusinessSettingsSpace({ business, currentUserId, onAfterDelete }) {
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeTargetId, setRemoveTargetId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const documentLogoInputRef = useRef(null);

  const isOwner = business?.owner_user_id === currentUserId;
  const tier = business?.subscription_tier || 'basic';
  const tierConfig = TIER_CONFIG[tier] || TIER_CONFIG.basic;
  const TierIcon = tierConfig.icon;

  const invalidateBusiness = () => {
    queryClient.invalidateQueries({ queryKey: ['ownedBusinesses', currentUserId] });
    queryClient.invalidateQueries({ queryKey: ['staffBusinesses', currentUserId] });
    queryClient.invalidateQueries({ queryKey: ['business', business?.id] });
    queryClient.invalidateQueries({ queryKey: ['directory-businesses'] });
    queryClient.invalidateQueries({ queryKey: ['network-businesses'] });
    queryClient.invalidateQueries({ queryKey: ['homepage-recent-businesses'] });
  };

  // ─── enabled_spaces mutation — used for both add and remove ────────
  const enabledSpacesMutation = useMutation({
    mutationFn: (nextArr) => Business.updateProfile(business.id, { enabled_spaces: nextArr }),
    onSuccess: () => invalidateBusiness(),
    onError: (err) => {
      console.error('enabled_spaces save error:', err);
      toast.error('Could not save space change. Please try again.');
    },
  });

  const handleAddSpace = (spaceId) => {
    const current = Array.isArray(business?.enabled_spaces) ? business.enabled_spaces : [];
    if (current.includes(spaceId)) return;
    enabledSpacesMutation.mutate([...current, spaceId], {
      onSuccess: () => {
        invalidateBusiness();
        toast.success(`${SPACE_TYPES[spaceId]?.label || spaceId} added`);
        setPickerOpen(false);
      },
    });
  };

  const handleRemoveSpace = (spaceId) => {
    const current = Array.isArray(business?.enabled_spaces) ? business.enabled_spaces : [];
    enabledSpacesMutation.mutate(current.filter((s) => s !== spaceId), {
      onSuccess: () => {
        invalidateBusiness();
        toast.success(`${SPACE_TYPES[spaceId]?.label || spaceId} removed`);
        setRemoveTargetId(null);
      },
    });
  };

  // ─── Document logo upload ──────────────────────────────────────────
  const documentLogoUploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url ?? result?.url;
      if (!url) throw new Error('No URL returned');
      await Business.updateProfile(business.id, { document_logo_url: url });
      return url;
    },
    onSuccess: () => {
      invalidateBusiness();
      toast.success('Document logo updated');
    },
    onError: () => toast.error('Failed to upload document logo'),
  });

  const handleDocumentLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { validateFile } = await import('@/utils/fileValidation');
    const check = validateFile(file);
    if (!check.valid) { toast.error(check.error); return; }
    documentLogoUploadMutation.mutate(file);
    if (documentLogoInputRef.current) documentLogoInputRef.current.value = '';
  };

  // ─── Visibility + accepts toggles (immediate writes) ───────────────
  const visibilityMutation = useMutation({
    mutationFn: (nextValue) => Business.updateProfile(business.id, { listed_in_directory: nextValue }),
    onSuccess: (_, nextValue) => {
      invalidateBusiness();
      toast.success(nextValue ? 'Business now appears in the directory' : 'Business hidden from the directory');
    },
    onError: () => toast.error('Failed to update directory visibility.'),
  });

  const acceptsMutation = useMutation({
    mutationFn: ({ field, value }) => Business.updateProfile(business.id, { [field]: value }),
    onSuccess: () => {
      invalidateBusiness();
      toast.success('Saved');
    },
    onError: () => toast.error('Could not save that change.'),
  });

  // ─── Delete business — soft delete via direct entity update ────────
  // Mirrors the legacy MyLaneDrillView pattern (is_deleted + status: 'deleted').
  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Business.update(business.id, { is_deleted: true, status: 'deleted' }),
    onSuccess: () => {
      invalidateBusiness();
      toast.success('Business deleted');
      setDeleteDialogOpen(false);
      if (typeof onAfterDelete === 'function') onAfterDelete();
    },
    onError: () => toast.error('Failed to delete business.'),
  });

  // ─── Resolved data for render ──────────────────────────────────────
  const resolvedSpaces = resolveBusinessSpaces(business);
  const addableSpaces = listAddableSpaces(business);
  const removeTarget = removeTargetId ? SPACE_TYPES[removeTargetId] : null;

  if (!business) return null;

  const directoryListed = business?.listed_in_directory !== false;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          Settings
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your business — enable spaces, document branding, visibility, and payment options.
        </p>
      </div>

      {/* ─── Section A — Enabled Spaces ─────────────────────────────── */}
      <Card className="bg-card border-border rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Enabled spaces
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Spaces active on this business. Profile and Settings are always on — they're part of every business.
            </p>
          </div>
          {isOwner && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="border-primary text-primary hover:bg-primary/10"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add space
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {resolvedSpaces.map((meta) => {
            const isUniversal = UNIVERSAL_SPACE_IDS.includes(meta.id);
            return (
              <div
                key={meta.id}
                className={`flex items-center justify-between rounded-lg border-l-4 ${meta.accentClass} bg-secondary/40 border-y border-r border-border px-4 py-3`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-foreground font-medium">{meta.label}</p>
                    {isUniversal && (
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 border border-border rounded-full px-2 py-0.5">
                        Universal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">{meta.sublabel}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-xs text-primary">{meta.pricing?.display || 'Free during beta'}</span>
                  {isOwner && !isUniversal && (
                    <button
                      type="button"
                      onClick={() => setRemoveTargetId(meta.id)}
                      aria-label={`Remove ${meta.label}`}
                      className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ─── Section C — Document Branding ─────────────────────────── */}
      <Card className="bg-card border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Document branding
        </h3>
        <div className="flex items-center gap-4">
          {(business?.document_logo_url || business?.logo_url) ? (
            <img
              src={business.document_logo_url || business.logo_url}
              alt="Document logo"
              className="h-20 w-20 rounded-lg object-cover border border-border bg-white p-2"
            />
          ) : (
            <div className="h-20 w-20 rounded-lg bg-secondary border border-border flex items-center justify-center">
              <FileText className="h-8 w-8 text-muted-foreground/70" />
            </div>
          )}
          {isOwner && (
            <div>
              <input
                ref={documentLogoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleDocumentLogoUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary/10"
                onClick={() => documentLogoInputRef.current?.click()}
                disabled={documentLogoUploadMutation.isPending}
              >
                {documentLogoUploadMutation.isPending
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Upload className="h-4 w-4 mr-2" />}
                {business?.document_logo_url ? 'Replace' : 'Upload'}
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
          This appears on estimates, invoices, contracts, and any documents you send to clients. Different from
          your directory logo — documents print or render at a different size, so the optimal crop is often
          different. Falls back to your directory logo if not set.
        </p>
      </Card>

      {/* ─── Directory Visibility ────────────────────────────────── */}
      {isOwner && (
        <Card className="bg-card border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Directory visibility
          </h3>
          <div className="mt-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Switch
                checked={directoryListed}
                disabled={visibilityMutation.isPending}
                onCheckedChange={(checked) => visibilityMutation.mutate(checked)}
              />
              <span className="text-sm text-foreground">
                Appear in the LocalLane directory
              </span>
            </label>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {directoryListed
                ? 'Visible to everyone browsing LocalLane. Visitors can find you through search and category browsing.'
                : 'Hidden from the public directory. Your tools still work; the business just won’t appear to people browsing.'}
            </p>
          </div>
        </Card>
      )}

      {/* ─── Accepts Payments ────────────────────────────────────── */}
      {isOwner && (
        <Card className="bg-card border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Coins className="h-4 w-4 text-primary" />
            Accepts payments
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Badges appear on your directory tile and profile so neighbors know how they can pay.
          </p>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <Switch
                checked={business?.accepts_joy_coins === true}
                disabled={acceptsMutation.isPending}
                onCheckedChange={(checked) => acceptsMutation.mutate({ field: 'accepts_joy_coins', value: checked })}
              />
              <span className="text-sm text-foreground">Accepts Joy Coins</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <Switch
                checked={business?.accepts_silver === true}
                disabled={acceptsMutation.isPending}
                onCheckedChange={(checked) => acceptsMutation.mutate({ field: 'accepts_silver', value: checked })}
              />
              <span className="text-sm text-foreground">Accepts Silver</span>
            </label>
          </div>
        </Card>
      )}

      {/* ─── Subscription ─────────────────────────────────────────── */}
      <Card className="bg-card border-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Subscription</h3>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg ${tierConfig.bg}`}>
            <TierIcon className={`h-5 w-5 ${tierConfig.color}`} />
          </div>
          <div>
            <p className="text-foreground font-semibold">{tierConfig.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{tierConfig.description}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm text-foreground-soft">
            <span className="text-primary font-medium">Founding Member.</span> You believed in LocalLane before there was proof. Thank you for being part of building this community.
          </p>
        </div>
      </Card>

      {/* ─── Delete Business ─────────────────────────────────────── */}
      {isOwner && (
        <Card className="bg-card border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-red-400" />
            Delete business
          </h3>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Permanently mark this business as deleted. This is a soft delete — the record is hidden from the directory and from your cockpit.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete business
          </Button>
        </Card>
      )}

      {/* ─── Add Space picker modal ──────────────────────────────── */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add a space</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Each space adds a new section to your business cockpit. Profile and Settings are always on.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {addableSpaces.map((meta) => {
              const isComingSoon = meta.status === 'coming_soon';
              const isDisabled = isComingSoon || meta.isEnabled || enabledSpacesMutation.isPending;
              return (
                <div
                  key={meta.id}
                  className={`rounded-lg border-l-4 ${meta.accentClass} bg-secondary/40 border-y border-r border-border p-4`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-foreground font-medium">{meta.label}</p>
                        <span className="text-xs text-primary">{meta.pricing?.display || 'Free during beta'}</span>
                        {isComingSoon && (
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 border border-border rounded-full px-2 py-0.5">
                            Coming soon
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground/80 mt-0.5">{meta.sublabel}</p>
                      {meta.description && (
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{meta.description}</p>
                      )}
                    </div>
                    <div className="shrink-0">
                      {meta.isEnabled ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-primary border border-primary/40 rounded-full px-3 py-1">
                          <Check className="h-3 w-3" /> Active
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={isDisabled}
                          onClick={() => handleAddSpace(meta.id)}
                          className="border-primary text-primary hover:bg-primary/10 disabled:opacity-50"
                        >
                          {isComingSoon ? 'Coming soon' : 'Add'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {addableSpaces.length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center py-6">
                No additional spaces in the catalog yet.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Remove space confirmation ──────────────────────────── */}
      <ConfirmDialog
        open={!!removeTargetId}
        onOpenChange={(open) => { if (!open) setRemoveTargetId(null); }}
        title={`Remove ${removeTarget?.label || ''}?`}
        description={`Your ${removeTarget?.label || ''} data will be hidden from your cockpit but retained. You can restore it anytime by re-adding the space.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        destructive
        loading={enabledSpacesMutation.isPending}
        onConfirm={() => removeTargetId && handleRemoveSpace(removeTargetId)}
      />

      {/* ─── Delete business confirmation ───────────────────────── */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete this business?"
        description="The business will be marked deleted and hidden from the directory. This is a soft delete — the record stays in the system."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        destructive
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
