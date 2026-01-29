import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Star, Calendar, User, Shield, Store, Coins, Zap, Crown, Trash2, Link2 } from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";

export default function BusinessEditDrawer({ business, open, onClose, adminEmail }) {
  const queryClient = useQueryClient();
  const [editData, setEditData] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, field: '', value: null, message: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (business) {
      setEditData({
        subscription_tier: business.subscription_tier || 'basic',
        is_bumped: business.is_bumped || false,
        accepts_silver: business.accepts_silver || false,
        is_locally_owned_franchise: business.is_locally_owned_franchise || false,
        is_active: business.is_active !== false,
      });
    }
  }, [business]);

  const updateMutation = useMutation({
    mutationFn: async ({ field, value, actionType }) => {
      // Update business
      await base44.entities.Business.update(business.id, { [field]: value });
      
      // Log the action
      await base44.entities.AdminAuditLog.create({
        admin_email: adminEmail,
        business_id: business.id,
        business_name: business.name,
        action_type: actionType,
        field_changed: field,
        old_value: String(business[field] ?? ''),
        new_value: String(value),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-businesses']);
      toast.success('Business updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update business');
      console.error(error);
    }
  });

  // Soft delete: prefer is_deleted: true; backend may use status: 'deleted'
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Business.update(business.id, { is_deleted: true });
      await base44.entities.AdminAuditLog.create({
        admin_email: adminEmail,
        business_id: business.id,
        business_name: business.name,
        action_type: 'business_delete',
        field_changed: 'is_deleted',
        old_value: 'false',
        new_value: 'true',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-businesses']);
      toast.success('Business deleted');
      setDeleteDialogOpen(false);
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to delete business');
      console.error(error);
    },
  });

  // Link owner: look up user by owner_email and set owner_user_id
  const linkOwnerMutation = useMutation({
    mutationFn: async () => {
      const ownerEmail = business?.owner_email?.trim();
      if (!ownerEmail) {
        throw new Error('No owner email set');
      }
      const users = await base44.entities.User.filter({ email: ownerEmail }, '', 1);
      const foundUser = users?.[0];
      if (!foundUser?.id) {
        throw new Error('No user found with that email');
      }
      await base44.entities.Business.update(business.id, { owner_user_id: foundUser.id });
      await base44.entities.AdminAuditLog.create({
        admin_email: adminEmail,
        business_id: business.id,
        business_name: business.name,
        action_type: 'owner_link',
        field_changed: 'owner_user_id',
        old_value: String(business.owner_user_id ?? ''),
        new_value: String(foundUser.id),
      });
      return foundUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-businesses']);
      toast.success('Owner linked successfully');
    },
    onError: (error) => {
      const message = error?.message || 'Failed to link owner';
      if (message.includes('No user found')) {
        toast.error('No user found with that email');
      } else if (message.includes('No owner email')) {
        toast.error('No owner email set on this business');
      } else {
        toast.error(message);
      }
      console.error(error);
    },
  });

  const handleFieldChange = (field, value, actionType, confirmMessage) => {
    if (confirmMessage) {
      setConfirmDialog({ open: true, field, value, actionType, message: confirmMessage });
    } else {
      updateMutation.mutate({ field, value, actionType });
      setEditData({ ...editData, [field]: value });
    }
  };

  const confirmChange = () => {
    const { field, value, actionType } = confirmDialog;
    updateMutation.mutate({ field, value, actionType });
    setEditData({ ...editData, [field]: value });
    setConfirmDialog({ open: false, field: '', value: null, message: '' });
  };

  if (!business || !editData) return null;

  const tierLabels = {
    basic: { label: 'Basic', icon: Star, color: 'bg-slate-700 text-slate-300' },
    standard: { label: 'Standard', icon: Zap, color: 'bg-slate-700 text-slate-300' },
    partner: { label: 'Partner', icon: Crown, color: 'bg-amber-500 text-black' },
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-slate-900 border-slate-800">
          <SheetHeader>
            <SheetTitle className="text-xl text-slate-100">{business.name}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Read-only Info */}
            <div className="space-y-3 p-4 bg-slate-800 rounded-lg border border-slate-700">
              <h3 className="font-medium text-slate-100 flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                Business Info
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-400">ID:</span>
                  <p className="font-mono text-xs text-slate-300 truncate">{business.id}</p>
                </div>
                <div>
                  <span className="text-slate-400">Owner email:</span>
                  <p className="text-slate-300 truncate">{business.owner_email || '—'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Owner user ID:</span>
                  <p className="font-mono text-xs text-slate-300 truncate">
                    {business.owner_user_id ?? 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">Created:</span>
                  <p className="text-slate-300">{format(new Date(business.created_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="text-slate-400">Updated:</span>
                  <p className="text-slate-300">{format(new Date(business.updated_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="text-slate-400">Rating:</span>
                  <p className="text-slate-300 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    {(business.average_rating || 0).toFixed(1)} ({business.review_count || 0} reviews)
                  </p>
                </div>
                <div>
                  <span className="text-slate-400">City:</span>
                  <p className="text-slate-300">{business.city || '—'}</p>
                </div>
              </div>
              {/* Link owner by email: set owner_user_id from user lookup */}
              <div className="mt-4 pt-3 border-t border-slate-700">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => linkOwnerMutation.mutate()}
                  disabled={linkOwnerMutation.isPending || !business.owner_email?.trim()}
                >
                  {linkOwnerMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Link Owner by Email
                </Button>
                {!business.owner_email?.trim() && (
                  <p className="text-xs text-slate-500 mt-2">Set owner email first to link.</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Tier Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium text-slate-100">Subscription Tier</Label>
              <Select
                value={editData.subscription_tier}
                onValueChange={(value) => handleFieldChange(
                  'subscription_tier',
                  value,
                  'tier_change',
                  `Change this business to ${tierLabels[value].label} tier?`
                )}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="basic" className="text-slate-300 focus:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-slate-400" />
                      Basic
                    </div>
                  </SelectItem>
                  <SelectItem value="standard" className="text-slate-300 focus:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      Standard
                    </div>
                  </SelectItem>
                  <SelectItem value="partner" className="text-slate-300 focus:bg-slate-800">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      Partner
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Boost Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium text-slate-100">Boosted</Label>
                <p className="text-sm text-slate-400">Listing appears at top of search results</p>
              </div>
              <Switch
                checked={editData.is_bumped}
                onCheckedChange={(checked) => handleFieldChange(
                  'is_bumped',
                  checked,
                  'boost_toggle',
                  checked ? 'Boost this listing?' : 'Remove boost from this listing?'
                )}
                disabled={updateMutation.isPending}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>

            <Separator className="bg-slate-700" />

            {/* Badges/Flags Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-slate-100">Badges & Flags</h3>
              
              {/* Accepts Silver */}
              <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <Coins className="h-5 w-5 text-amber-500" />
                  <div>
                    <Label className="font-medium text-slate-100">Accepts Silver</Label>
                    <p className="text-xs text-slate-400">Business accepts silver/precious metals</p>
                  </div>
                </div>
                <Switch
                  checked={editData.accepts_silver}
                  onCheckedChange={(checked) => handleFieldChange(
                    'accepts_silver',
                    checked,
                    'accepts_silver_toggle'
                  )}
                  disabled={updateMutation.isPending}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>

              {/* Locally Owned Franchise */}
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-amber-500" />
                  <div>
                    <Label className="font-medium text-slate-100">Locally Owned Franchise</Label>
                    <p className="text-xs text-slate-400">Part of a franchise but majority-owned and operated locally</p>
                  </div>
                </div>
                <Switch
                  checked={editData.is_locally_owned_franchise}
                  onCheckedChange={(checked) => handleFieldChange(
                    'is_locally_owned_franchise',
                    checked,
                    'locally_owned_franchise_toggle',
                    checked ? 'Mark this as a Locally Owned Franchise?' : 'Remove Locally Owned Franchise status?'
                  )}
                  disabled={updateMutation.isPending}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>
            </div>

            <Separator className="bg-slate-700" />

            {/* Visibility */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium text-slate-100">Active / Visible</Label>
                <p className="text-sm text-slate-400">Listing is visible to the public</p>
              </div>
              <Switch
                checked={editData.is_active}
                onCheckedChange={(checked) => handleFieldChange(
                  'is_active',
                  checked,
                  'visibility_toggle',
                  checked ? 'Make this listing visible?' : 'Hide this listing from the public?'
                )}
                disabled={updateMutation.isPending}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>

            {/* Save indicator */}
            {updateMutation.isPending && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </div>
            )}

            <Separator className="bg-slate-700" />

            {/* Delete Business */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-slate-400">Danger zone</h3>
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={updateMutation.isPending || deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Business
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Delete Business?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure? This will remove all events and data associated with this business.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-500 text-white"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Confirm Change</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">{confirmDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange} className="bg-amber-500 hover:bg-amber-400 text-black font-bold">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}