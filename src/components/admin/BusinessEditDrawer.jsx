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
import { Loader2, Star, Calendar, User, Shield, Store, Coins, Zap, Crown } from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";

export default function BusinessEditDrawer({ business, open, onClose, adminEmail }) {
  const queryClient = useQueryClient();
  const [editData, setEditData] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, field: '', value: null, message: '' });

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
    basic: { label: 'Basic', icon: Star, color: 'bg-slate-100 text-slate-700' },
    standard: { label: 'Standard', icon: Zap, color: 'bg-blue-100 text-blue-700' },
    partner: { label: 'Partner', icon: Crown, color: 'bg-amber-100 text-amber-700' },
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-xl">{business.name}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Read-only Info */}
            <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Business Info
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-slate-500">ID:</span>
                  <p className="font-mono text-xs text-slate-700 truncate">{business.id}</p>
                </div>
                <div>
                  <span className="text-slate-500">Owner:</span>
                  <p className="text-slate-700 truncate">{business.owner_email}</p>
                </div>
                <div>
                  <span className="text-slate-500">Created:</span>
                  <p className="text-slate-700">{format(new Date(business.created_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="text-slate-500">Updated:</span>
                  <p className="text-slate-700">{format(new Date(business.updated_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="text-slate-500">Rating:</span>
                  <p className="text-slate-700 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {(business.average_rating || 0).toFixed(1)} ({business.review_count || 0} reviews)
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">City:</span>
                  <p className="text-slate-700">{business.city || '—'}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Tier Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Subscription Tier</Label>
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-slate-500" />
                      Basic
                    </div>
                  </SelectItem>
                  <SelectItem value="standard">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      Standard
                    </div>
                  </SelectItem>
                  <SelectItem value="partner">
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
                <Label className="text-base font-medium">Boosted</Label>
                <p className="text-sm text-slate-500">Listing appears at top of search results</p>
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
              />
            </div>

            <Separator />

            {/* Badges/Flags Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-slate-900">Badges & Flags</h3>
              
              {/* Accepts Silver */}
              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex items-center gap-3">
                  <Coins className="h-5 w-5 text-amber-600" />
                  <div>
                    <Label className="font-medium">Accepts Silver</Label>
                    <p className="text-xs text-slate-500">Business accepts silver/precious metals</p>
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
                />
              </div>

              {/* Locally Owned Franchise */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-blue-600" />
                  <div>
                    <Label className="font-medium">Locally Owned Franchise</Label>
                    <p className="text-xs text-slate-500">Part of a franchise but majority-owned and operated locally</p>
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
                />
              </div>
            </div>

            <Separator />

            {/* Visibility */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Active / Visible</Label>
                <p className="text-sm text-slate-500">Listing is visible to the public</p>
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
              />
            </div>

            {/* Save indicator */}
            {updateMutation.isPending && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Change</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}