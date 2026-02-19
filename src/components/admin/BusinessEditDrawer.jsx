import React, { useState, useEffect, useRef } from 'react';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Loader2, Star, Calendar, User, Shield, Store, Coins, Zap, Crown, Trash2, Link2, X, Globe } from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";

export default function BusinessEditDrawer({ business, open, onClose, adminEmail }) {
  const queryClient = useQueryClient();
  const [editData, setEditData] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, field: '', value: null, message: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addStaffEmail, setAddStaffEmail] = useState('');
  const [staffSearchResult, setStaffSearchResult] = useState(null);
  const [staffSearchError, setStaffSearchError] = useState('');
  const [isSearchingStaff, setIsSearchingStaff] = useState(false);
  const [selectedRole, setSelectedRole] = useState('instructor');
  const [localInstructors, setLocalInstructors] = useState([]);
  const staffSearchRef = useRef(null);

  useEffect(() => {
    setLocalInstructors(business?.instructors || []);
  }, [business?.instructors]);

  useEffect(() => {
    if (open && staffSearchRef.current) {
      const t = setTimeout(() => {
        staffSearchRef.current?.focus();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['staffInvites', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const key = `staff_invites:${business.id}`;
      const settings = await base44.entities.AdminSettings.filter({ key });
      if (settings.length === 0) return [];
      try {
        return JSON.parse(settings[0].value) || [];
      } catch {
        return [];
      }
    },
    enabled: !!business?.id,
  });

  const { data: staffRoles = [] } = useQuery({
    queryKey: ['staffRoles', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const key = `staff_roles:${business.id}`;
      const settings = await base44.entities.AdminSettings.filter({ key });
      if (settings.length === 0) return [];
      try {
        return JSON.parse(settings[0].value) || [];
      } catch {
        return [];
      }
    },
    enabled: !!business?.id,
  });

  const getRoleForUser = (userId) => {
    const roleData = staffRoles.find((r) => r.user_id === userId);
    return roleData?.role || 'instructor';
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'co-owner':
        return <Badge className="border-amber-500 text-amber-500 text-xs" variant="outline">Co-Owner</Badge>;
      case 'manager':
        return <Badge className="bg-purple-500 text-white text-xs">Manager</Badge>;
      case 'instructor':
        return <Badge className="bg-blue-500 text-white text-xs">Instructor</Badge>;
      case 'staff':
        return <Badge variant="outline" className="border-slate-500 text-slate-300 text-xs">Staff</Badge>;
      default:
        return <Badge variant="outline" className="border-slate-600 text-slate-400 text-xs">Staff</Badge>;
    }
  };

  const { data: staffUsers = [], refetch: refetchStaffUsers } = useQuery({
    queryKey: ['staff', business?.id, localInstructors],
    queryFn: async () => {
      if (!localInstructors?.length) return [];
      const users = await Promise.all(
        localInstructors.map((id) =>
          base44.entities.User.get(id).catch(() => null)
        )
      );
      return users.filter(Boolean);
    },
    enabled: !!business?.id && localInstructors.length > 0,
  });

  const [networks, setNetworks] = useState([]);

  useEffect(() => {
    const fetchNetworks = async () => {
      try {
        console.log('=== NETWORK DEBUG ===');
        console.log('base44.entities available:', Object.keys(base44.entities));

        const entityName = base44.entities.Network ? 'Network' :
          base44.entities.Networks ? 'Networks' :
            base44.entities.network ? 'network' : 'NONE_FOUND';
        console.log('Network entity found as:', entityName);

        if (entityName === 'NONE_FOUND') {
          console.error('No Network entity found in base44.entities');
          setNetworks([]);
          return;
        }

        const entity = base44.entities.Network || base44.entities.Networks || base44.entities.network;
        const allNetworks = await entity.list();
        console.log('Networks fetched:', allNetworks);
        const active = Array.isArray(allNetworks)
          ? allNetworks.filter((n) => n.is_active !== false)
          : [];
        console.log('Active networks:', active);
        setNetworks(active);
      } catch (err) {
        console.error('Network fetch error:', err);
        setNetworks([]);
      }
    };
    fetchNetworks();
  }, []);

  useEffect(() => {
    if (business) {
      setEditData({
        subscription_tier: business.subscription_tier || 'basic',
        accepts_silver: business.accepts_silver || false,
        is_locally_owned_franchise: business.is_locally_owned_franchise || false,
        is_active: business.is_active !== false,
        network_ids: Array.isArray(business.network_ids) ? business.network_ids : [],
      });
    }
  }, [business]);

  const updateMutation = useMutation({
    mutationFn: async ({ field, value, actionType }) => {
      await base44.functions.invoke('updateBusiness', {
        action: 'update',
        business_id: business.id,
        data: { [field]: value },
      });

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

  // Hard delete: remove record permanently (Business.delete). Fallback to soft delete if delete not available.
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { deleteBusinessCascade } = await import('@/utils/deleteBusinessCascade');
      await deleteBusinessCascade(business.id);
      await base44.entities.AdminAuditLog.create({
        admin_email: adminEmail,
        business_id: business.id,
        business_name: business.name,
        action_type: 'business_delete',
        field_changed: 'cascade_delete',
        old_value: 'active',
        new_value: 'deleted',
      });
    },
    onSuccess: () => {
      console.log('[Admin Delete] onSuccess');
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success('Business deleted');
      setDeleteDialogOpen(false);
      onClose();
    },
    onError: (error) => {
      console.error('[Admin Delete] onError:', error?.message, error);
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
      await base44.functions.invoke('updateBusiness', {
        action: 'update',
        business_id: business.id,
        data: { owner_user_id: foundUser.id },
      });
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
      const message = (error?.message || '').toLowerCase();
      if (message.includes('no user found')) {
        toast.error('No user found with that email');
      } else if (message.includes('no owner email')) {
        toast.error('No owner email set on this business');
      } else {
        toast.error(getFriendlyErrorMessage(error, 'Failed to link owner. Please try again.'));
      }
      console.error(error);
    },
  });

  const handleSearchStaff = async () => {
    if (!addStaffEmail.trim()) return;
    setIsSearchingStaff(true);
    setStaffSearchError('');
    setStaffSearchResult(null);
    try {
      const users = await base44.entities.User.filter({ email: addStaffEmail.trim() }, '', 1);
      if (!users?.length) {
        const alreadyInvited = (pendingInvites || []).some(
          (inv) => (inv.email || '').toLowerCase() === addStaffEmail.trim().toLowerCase()
        );
        if (alreadyInvited) {
          setStaffSearchError('This email has already been invited.');
          return;
        }
        setStaffSearchResult({ notFound: true, email: addStaffEmail.trim() });
        setStaffSearchError('');
        return;
      }
      const user = users[0];
      if (localInstructors?.includes(user.id)) {
        setStaffSearchError('Already a staff member.');
        return;
      }
      if (user.id === business.owner_user_id) {
        setStaffSearchError('This is the owner.');
        return;
      }
      setStaffSearchResult(user);
    } catch (err) {
      setStaffSearchError('Search failed.');
    } finally {
      setIsSearchingStaff(false);
    }
  };

  const addStaffMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      const currentInstructors = business.instructors || [];
      await base44.functions.invoke('updateBusiness', {
        action: 'update',
        business_id: business.id,
        data: { instructors: [...currentInstructors, userId] },
      });

      const key = `staff_roles:${business.id}`;
      const res = await base44.functions.invoke('updateAdminSettings', { action: 'filter', key });
      const existing = Array.isArray(res) ? res : (res?.data ?? []);
      let currentRoles = [];
      if (existing.length > 0) {
        try {
          currentRoles = JSON.parse(existing[0].value) || [];
        } catch {}
      }
      const newRole = { user_id: userId, role, added_at: new Date().toISOString() };
      const updatedRoles = [...currentRoles.filter((r) => r.user_id !== userId), newRole];
      const value = JSON.stringify(updatedRoles);
      if (existing.length > 0) {
        await base44.functions.invoke('updateAdminSettings', {
          action: 'update',
          id: existing[0].id,
          key,
          value,
        });
      } else {
        await base44.functions.invoke('updateAdminSettings', {
          action: 'create',
          key,
          value,
        });
      }
    },
    onSuccess: async (_data, { userId }) => {
      setLocalInstructors((prev) => [...prev, userId]);
      setAddStaffEmail('');
      setStaffSearchResult(null);
      setStaffSearchError('');
      setSelectedRole('instructor');
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staffRoles'] });
      queryClient.invalidateQueries({ queryKey: ['staffInvites'] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      await queryClient.refetchQueries({ queryKey: ['admin-businesses'] });
      await refetchStaffUsers();
      toast.success('Staff added');
    },
    onError: (error) => {
      console.error('[Admin] Add staff error:', error);
      toast.error('Failed to add staff');
    },
  });

  const removeStaffMutation = useMutation({
    mutationFn: async (userId) => {
      const updated = (business.instructors || []).filter((id) => id !== userId);
      await base44.functions.invoke('updateBusiness', {
        action: 'update',
        business_id: business.id,
        data: { instructors: updated },
      });

      const key = `staff_roles:${business.id}`;
      const res = await base44.functions.invoke('updateAdminSettings', { action: 'filter', key });
      const existing = Array.isArray(res) ? res : (res?.data ?? []);
      if (existing.length > 0) {
        let currentRoles = [];
        try {
          currentRoles = JSON.parse(existing[0].value) || [];
        } catch {}
        const updatedRoles = currentRoles.filter((r) => r.user_id !== userId);
        await base44.functions.invoke('updateAdminSettings', {
          action: 'update',
          id: existing[0].id,
          key,
          value: JSON.stringify(updatedRoles),
        });
      }
    },
    onSuccess: async (_data, userId) => {
      console.log('[Admin] Remove success, userId:', userId);
      setLocalInstructors((prev) => {
        const updated = prev.filter((id) => id !== userId);
        console.log('[Admin] Updated localInstructors:', updated);
        return updated;
      });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staffRoles'] });
      queryClient.invalidateQueries({ queryKey: ['staffInvites'] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      await queryClient.refetchQueries({ queryKey: ['admin-businesses'] });
      await refetchStaffUsers();
      setAddStaffEmail('');
      setStaffSearchResult(null);
      setStaffSearchError('');
      toast.success('Staff removed');
    },
    onError: (error) => {
      console.error('[Admin] Remove staff error:', error);
      toast.error('Failed to remove staff');
    },
  });

  const removeInviteMutation = useMutation({
    mutationFn: async (email) => {
      const key = `staff_invites:${business.id}`;
      const res = await base44.functions.invoke('updateAdminSettings', { action: 'filter', key });
      const existing = Array.isArray(res) ? res : (res?.data ?? []);
      if (existing.length > 0) {
        const currentInvites = JSON.parse(existing[0].value) || [];
        const updatedInvites = currentInvites.filter((inv) => (inv.email || '').toLowerCase() !== String(email).toLowerCase());
        await base44.functions.invoke('updateAdminSettings', {
          action: 'update',
          id: existing[0].id,
          key,
          value: JSON.stringify(updatedInvites),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffInvites'] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success('Invite removed');
    },
    onError: () => {
      toast.error('Failed to remove invite');
    },
  });

  const inviteStaffMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      const key = `staff_invites:${business.id}`;
      const res = await base44.functions.invoke('updateAdminSettings', { action: 'filter', key });
      const existing = Array.isArray(res) ? res : (res?.data ?? []);
      let currentInvites = [];
      if (existing.length > 0) {
        try {
          currentInvites = JSON.parse(existing[0].value) || [];
        } catch {}
      }
      if (currentInvites.some((inv) => (inv.email || '').toLowerCase() === email.toLowerCase())) {
        throw new Error('Already invited');
      }
      const newInvite = {
        email: email,
        role: role,
        status: 'invited',
        invited_at: new Date().toISOString(),
      };
      const updatedInvites = [...currentInvites, newInvite];
      const value = JSON.stringify(updatedInvites);
      if (existing.length > 0) {
        return base44.functions.invoke('updateAdminSettings', {
          action: 'update',
          id: existing[0].id,
          key,
          value,
        });
      }
      return base44.functions.invoke('updateAdminSettings', {
        action: 'create',
        key,
        value,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffInvites'] });
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      setAddStaffEmail('');
      setStaffSearchResult(null);
      setSelectedRole('instructor');
      toast.success('Invitation sent!');
    },
    onError: (error) => {
      if (error?.message === 'Already invited') {
        toast.error('This email has already been invited');
      } else {
        toast.error('Failed to send invitation');
      }
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
                  <span className="text-slate-400">Recommendations:</span>
                  <p className="text-slate-300">
                    {business.recommendation_count || 0}
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

            {/* Networks */}
            <div className="space-y-4">
              <h3 className="font-medium text-slate-100">Networks</h3>
              {networks.length === 0 ? (
                <p className="text-xs text-slate-500">No networks configured. Add networks in Admin → Networks.</p>
              ) : (
                networks.map((network) => {
                  const slug = network.slug ?? network.id;
                  const currentIds = Array.isArray(editData.network_ids) ? editData.network_ids : [];
                  const isChecked = currentIds.includes(slug);
                  return (
                    <div key={slug} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-amber-500" />
                        <div>
                          <Label className="font-medium text-slate-100">{network.name || slug}</Label>
                          <p className="text-xs text-slate-400">Assign this business to {network.name || slug}</p>
                        </div>
                      </div>
                      <Switch
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...currentIds, slug]
                            : currentIds.filter((id) => id !== slug);
                          handleFieldChange('network_ids', next, 'network_toggle');
                        }}
                        disabled={updateMutation.isPending}
                        className="data-[state=checked]:bg-amber-500"
                      />
                    </div>
                  );
                })
              )}
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

            {/* Staff Management */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold">Staff & Instructors</h3>

              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                <div>
                  <p className="text-white text-sm">{business.owner_email}</p>
                  <p className="text-slate-400 text-xs">Owner</p>
                </div>
                <Badge className="bg-amber-500 text-black">Owner</Badge>
              </div>

              {staffUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
                  <div>
                    <p className="text-white text-sm">{user.full_name || user.email}</p>
                    <p className="text-slate-400 text-xs">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(getRoleForUser(user.id))}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        console.log('[Admin] Removing user:', user.id);
                        removeStaffMutation.mutate(user.id);
                      }}
                      className="h-6 w-6 text-slate-400 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pending Invites */}
              {pendingInvites.length > 0 && (
                <div className="space-y-2 pt-3 mt-3 border-t border-slate-700">
                  <p className="text-slate-400 text-xs uppercase tracking-wide">Pending Invites</p>
                  {pendingInvites.map((invite, idx) => (
                    <div key={invite.email + idx} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                      <div>
                        <p className="text-slate-300 text-sm">{invite.email}</p>
                        <p className="text-slate-500 text-xs">Invited as {invite.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-amber-500/50 text-amber-500 text-xs">Pending</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInviteMutation.mutate(invite.email)}
                          disabled={removeInviteMutation.isPending}
                          className="h-6 w-6 text-slate-400 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSearchStaff();
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex gap-2"
              >
                <textarea
                  ref={staffSearchRef}
                  role="search"
                  aria-label="Staff email search"
                  placeholder="staff@example.com"
                  value={addStaffEmail}
                  onChange={(e) => setAddStaffEmail(e.target.value)}
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchStaff();
                    }
                  }}
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <Button
                  type="submit"
                  disabled={isSearchingStaff || !addStaffEmail.trim()}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  Search
                </Button>
              </form>

              {staffSearchError && (
                <p className="text-red-400 text-xs">{staffSearchError}</p>
              )}

              {staffSearchResult && !staffSearchResult.notFound && (
                <div className="space-y-3 p-3 bg-slate-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm">{staffSearchResult.full_name || staffSearchResult.email}</p>
                      <p className="text-slate-400 text-xs">{staffSearchResult.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-slate-400 text-xs shrink-0">Role:</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={setSelectedRole}
                      disabled={addStaffMutation.isPending}
                    >
                      <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-300 text-sm w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="co-owner" className="text-slate-300 focus:bg-slate-800">Co-Owner</SelectItem>
                        <SelectItem value="manager" className="text-slate-300 focus:bg-slate-800">Manager</SelectItem>
                        <SelectItem value="instructor" className="text-slate-300 focus:bg-slate-800">Instructor</SelectItem>
                        <SelectItem value="staff" className="text-slate-300 focus:bg-slate-800">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => addStaffMutation.mutate({ userId: staffSearchResult.id, role: selectedRole })}
                      disabled={addStaffMutation.isPending}
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-black"
                    >
                      {addStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
                    </Button>
                  </div>
                </div>
              )}

              {staffSearchResult?.notFound && (
                <div className="space-y-3 p-3 bg-slate-700 rounded-lg">
                  <p className="text-white text-sm">{staffSearchResult.email}</p>
                  <p className="text-amber-500 text-xs">No account found — send invite</p>
                  <div className="flex items-center gap-2">
                    <Label className="text-slate-400 text-xs shrink-0">Role:</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={setSelectedRole}
                      disabled={inviteStaffMutation.isPending}
                    >
                      <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-slate-300 text-sm w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800">
                        <SelectItem value="co-owner" className="text-slate-300 focus:bg-slate-800">Co-Owner</SelectItem>
                        <SelectItem value="manager" className="text-slate-300 focus:bg-slate-800">Manager</SelectItem>
                        <SelectItem value="instructor" className="text-slate-300 focus:bg-slate-800">Instructor</SelectItem>
                        <SelectItem value="staff" className="text-slate-300 focus:bg-slate-800">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => inviteStaffMutation.mutate({ email: staffSearchResult.email, role: selectedRole })}
                      disabled={inviteStaffMutation.isPending}
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-black"
                    >
                      {inviteStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invite'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

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
              onClick={() => {
                console.log('[Admin Delete] Confirmation clicked, calling mutate()');
                deleteMutation.mutate();
              }}
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