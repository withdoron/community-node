import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, Star, Calendar, User, Shield, Store, Coins, Zap, Crown, Trash2, Link2, X, Globe, Upload, Send, Copy, Check, ImageIcon } from "lucide-react";
import { format } from 'date-fns';
import { toast } from "sonner";
import { useConfig } from '@/hooks/useConfig';
import { useCategories } from '@/hooks/useCategories';
import { US_STATES } from '@/lib/usStates';
import { ONBOARDING_CONFIG, ARCHETYPE_SLUG_TO_CONFIG } from '@/config/onboardingConfig';
import { archetypeSubcategories, getSubcategoryLabel } from '@/components/categories/categoryData';

function formatPhone(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function BusinessEditDrawer({ business, open, onClose, adminEmail }) {
  const queryClient = useQueryClient();
  const { mainCategories, getSubcategory } = useCategories();
  const [originalState, setOriginalState] = useState(null);
  const [formState, setFormState] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, field: '', value: null, message: '' });
  const [unsavedCloseDialogOpen, setUnsavedCloseDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addStaffEmail, setAddStaffEmail] = useState('');
  const [staffSearchResult, setStaffSearchResult] = useState(null);
  const [staffSearchError, setStaffSearchError] = useState('');
  const [isSearchingStaff, setIsSearchingStaff] = useState(false);
  const [selectedRole, setSelectedRole] = useState('instructor');
  const [localInstructors, setLocalInstructors] = useState([]);
  const [claimInviteOpen, setClaimInviteOpen] = useState(false);
  const [claimEmail, setClaimEmail] = useState('');
  const [claimUrlCopied, setClaimUrlCopied] = useState(false);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState(null);
  const staffSearchRef = useRef(null);
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const photoInputRef = useRef(null);

  // Universal field update handler — every input uses this
  const updateField = (field, value) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSubcategory = (subId) => {
    const current = Array.isArray(formState.subcategories) ? formState.subcategories : [];
    const next = current.includes(subId)
      ? current.filter((id) => id !== subId)
      : [...current, subId];

    // Derive primary fields from first selected subcategory
    const firstSubId = next[0];
    let primaryCategory = '';
    let mainCat = '';
    let subCategory = '';
    let subCategoryId = '';
    if (firstSubId) {
      const main = mainCategories.find((m) => m.subcategories.some((s) => s.id === firstSubId));
      if (main) {
        primaryCategory = main.id;
        mainCat = main.id;
        const sub = main.subcategories.find((s) => s.id === firstSubId);
        subCategory = sub?.label ?? firstSubId;
        subCategoryId = firstSubId;
      }
    }

    setFormState((prev) => ({
      ...prev,
      subcategories: next,
      primary_category: primaryCategory,
      main_category: mainCat,
      sub_category: subCategory,
      sub_category_id: subCategoryId,
    }));
  };

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
        return <Badge className="border-primary text-primary text-xs" variant="outline">Co-Owner</Badge>;
      case 'manager':
        return <Badge className="bg-purple-500 text-white text-xs">Manager</Badge>;
      case 'instructor':
        return <Badge className="bg-blue-500 text-white text-xs">Instructor</Badge>;
      case 'staff':
        return <Badge variant="outline" className="border-muted-foreground text-foreground-soft text-xs">Staff</Badge>;
      default:
        return <Badge variant="outline" className="border-border text-muted-foreground text-xs">Staff</Badge>;
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

  const { data: networksConfig = [] } = useConfig('platform', 'networks');
  const networks = React.useMemo(
    () => Array.isArray(networksConfig) ? networksConfig.filter((n) => n.active !== false) : [],
    [networksConfig]
  );

  const resolvedArchetype = useMemo(() => {
    if (!formState?.archetype) return null;
    return archetypeSubcategories[formState.archetype]
      ? formState.archetype
      : ARCHETYPE_SLUG_TO_CONFIG[formState.archetype] || formState.archetype;
  }, [formState?.archetype]);

  const subcategoryOptions = useMemo(
    () => (resolvedArchetype ? archetypeSubcategories[resolvedArchetype] || [] : []),
    [resolvedArchetype]
  );

  useEffect(() => {
    if (business) {
      const snapshot = { ...business };
      setOriginalState(snapshot);
      setFormState({ ...snapshot });
      setHasChanges(false);
      setUploadedLogoUrl(null);
    }
  }, [business]);

  // Compute hasChanges by diffing formState against originalState
  useEffect(() => {
    if (!formState || !originalState) return;
    const changed = Object.keys(formState).some((key) => {
      const orig = JSON.stringify(originalState[key] ?? null);
      const curr = JSON.stringify(formState[key] ?? null);
      return orig !== curr;
    });
    setHasChanges(changed);
  }, [formState, originalState]);

  const saveMutation = useMutation({
    mutationFn: async (changedFields) => {
      await base44.functions.invoke('updateBusiness', {
        action: 'update_profile',
        business_id: business.id,
        data: changedFields,
      });
      try {
        await base44.entities.AdminAuditLog.create({
          admin_email: adminEmail,
          business_id: business.id,
          business_name: business.name,
          action_type: 'drawer_save',
          field_changed: Object.keys(changedFields).join(', '),
          old_value: JSON.stringify(
            Object.fromEntries(Object.keys(changedFields).map((k) => [k, originalState?.[k]]))
          ),
          new_value: JSON.stringify(changedFields),
        });
      } catch (auditErr) {
        // Audit log failed; business was still updated
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-businesses']);
      setHasChanges(false);
      toast.success('Business updated successfully');
      onClose();
    },
    onError: (error) => {
      toast.error('Failed to update business');
    },
  });

  const logoUploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url ?? result?.url;
      if (!url) throw new Error('No URL returned');
      // Persist immediately via server function (the only write path that works)
      await base44.functions.invoke('updateBusiness', {
        action: 'update_profile',
        business_id: business.id,
        data: { logo_url: url },
      });
      return url;
    },
    onSuccess: (url) => {
      setUploadedLogoUrl(url);
      updateField('logo_url', url);
      queryClient.invalidateQueries(['admin-businesses']);
      toast.success('Logo uploaded successfully');
    },
    onError: () => {
      toast.error('Failed to upload logo');
    },
  });

  const handleDrawerLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { validateFile } = await import('@/utils/fileValidation');
    const check = validateFile(file);
    if (!check.valid) { toast.error(check.error); return; }
    logoUploadMutation.mutate(file);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const photoUploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url ?? result?.url;
      if (!url) throw new Error('No URL returned');
      return url;
    },
    onSuccess: (url) => {
      const current = Array.isArray(formState.photos) ? formState.photos : [];
      updateField('photos', [...current, url]);
      toast.success('Photo uploaded');
    },
    onError: () => {
      toast.error('Failed to upload photo');
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { validateFile } = await import('@/utils/fileValidation');
    const check = validateFile(file);
    if (!check.valid) { toast.error(check.error); return; }
    photoUploadMutation.mutate(file);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const bannerUploadMutation = useMutation({
    mutationFn: async (file) => {
      const result = await base44.integrations.Core.UploadFile({ file });
      const url = result?.file_url ?? result?.url;
      if (!url) throw new Error('No URL returned');
      return url;
    },
    onSuccess: (url) => {
      updateField('banner_url', url);
      toast.success('Banner uploaded');
    },
    onError: () => {
      toast.error('Failed to upload banner');
    },
  });

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { validateFile } = await import('@/utils/fileValidation');
    const check = validateFile(file);
    if (!check.valid) { toast.error(check.error); return; }
    bannerUploadMutation.mutate(file);
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  // Server-side cascade delete via manageBusinessWorkspace
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('manageBusinessWorkspace', {
        action: 'delete_workspace_cascade',
        business_id: business.id,
      });
      if (result?.error) throw new Error(result.error);
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
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success('Business deleted');
      setDeleteDialogOpen(false);
      onClose();
    },
    onError: () => {
      toast.error('Failed to delete business');
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
    },
  });

  const generateClaimInviteMutation = useMutation({
    mutationFn: async (email) => {
      const token = crypto.randomUUID();
      await base44.functions.invoke('updateBusiness', {
        action: 'update',
        business_id: business.id,
        data: {
          claim_token: token,
          claim_email: email || null,
          claim_sent_at: new Date().toISOString(),
        },
      });
      return token;
    },
    onSuccess: (token) => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      const claimUrl = `${window.location.origin}/claim-business?token=${token}`;
      navigator.clipboard.writeText(claimUrl).then(() => {
        setClaimUrlCopied(true);
        setTimeout(() => setClaimUrlCopied(false), 3000);
      });
      toast.success('Claim link generated and copied to clipboard');
      setClaimInviteOpen(false);
    },
    onError: () => {
      toast.error('Failed to generate claim invite');
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
        } catch { /* malformed JSON — use empty default */ }
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
    onError: () => {
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
        } catch { /* malformed JSON — use empty default */ }
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
      setLocalInstructors((prev) => prev.filter((id) => id !== userId));
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
    onError: () => {
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
        } catch { /* malformed JSON — use empty default */ }
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
      updateField(field, value);
    }
  };

  const confirmChange = () => {
    const { field, value } = confirmDialog;
    updateField(field, value);
    setConfirmDialog({ open: false, field: '', value: null, message: '' });
  };

  // Read-only fields managed by Base44 — never send in updates
  const READONLY_KEYS = new Set([
    'id', 'created_date', 'updated_date', 'owner_user_id', 'owner_email',
    'claim_token', 'claim_email', 'claim_sent_at', 'instructors',
    'recommendation_count', 'nod_count', 'story_count', 'vouch_count', 'concern_count',
    'slug',
  ]);

  const handleSaveChanges = async () => {
    if (!formState || !originalState || !business) return;

    // Build diff: only send fields that actually changed
    const changedFields = {};
    for (const key of Object.keys(formState)) {
      if (READONLY_KEYS.has(key)) continue;
      const orig = JSON.stringify(originalState[key] ?? null);
      const curr = JSON.stringify(formState[key] ?? null);
      if (orig !== curr) {
        changedFields[key] = formState[key];
      }
    }

    // Strip instagram @ prefix if instagram changed
    if (changedFields.instagram != null) {
      changedFields.instagram = (changedFields.instagram ?? '').trim().replace(/^@/, '');
    }

    if (Object.keys(changedFields).length === 0) return;

    saveMutation.mutate(changedFields);
  };

  const handleDiscardChanges = () => {
    setFormState({ ...originalState });
    setUploadedLogoUrl(null);
    setUnsavedCloseDialogOpen(false);
  };

  const handleCloseWithDiscard = () => {
    handleDiscardChanges();
    onClose();
  };

  if (!business || !formState) return null;

  const tierLabels = {
    basic: { label: 'Basic', icon: Star, color: 'bg-surface text-foreground-soft' },
    standard: { label: 'Standard', icon: Zap, color: 'bg-surface text-foreground-soft' },
    partner: { label: 'Partner', icon: Crown, color: 'bg-primary text-primary-foreground' },
  };

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen === false && hasChanges) {
            setUnsavedCloseDialogOpen(true);
            return;
          }
          onClose();
        }}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto bg-card border-border flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-xl text-foreground">{business.name}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-6 flex-1 min-h-0 overflow-y-auto pb-28">
            {/* Read-only Info */}
            <div className="space-y-3 p-4 bg-secondary rounded-lg border border-border">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Business Info
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <p className="font-mono text-xs text-foreground-soft truncate">{business.id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Owner email:</span>
                  <p className="text-foreground-soft truncate">{business.owner_email || '—'}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Owner user ID:</span>
                  <p className="font-mono text-xs text-foreground-soft truncate">
                    {business.owner_user_id ?? 'Not set'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>
                  <p className="text-foreground-soft">{format(new Date(business.created_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated:</span>
                  <p className="text-foreground-soft">{format(new Date(business.updated_date), 'MMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Recommendations:</span>
                  <p className="text-foreground-soft">
                    {business.recommendation_count || 0}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">City:</span>
                  <p className="text-foreground-soft">{business.city || '—'}</p>
                </div>
              </div>
              {/* Link owner by email: set owner_user_id from user lookup */}
              <div className="mt-4 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-primary/50 text-primary-hover hover:bg-primary/10"
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
                  <p className="text-xs text-muted-foreground/70 mt-2">Set owner email first to link.</p>
                )}
              </div>

              {/* Claim Invite — only for unclaimed businesses */}
              {!business.owner_user_id && (
                <div className="mt-3 pt-3 border-t border-border">
                  {!claimInviteOpen ? (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-primary/50 text-primary-hover hover:bg-primary/10"
                        onClick={() => {
                          setClaimEmail(business.email || business.contact_email || '');
                          setClaimInviteOpen(true);
                        }}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Claim Invite
                      </Button>
                      {business.claim_token && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-border text-foreground-soft hover:bg-secondary"
                          onClick={() => {
                            const url = `${window.location.origin}/claim-business?token=${business.claim_token}`;
                            navigator.clipboard.writeText(url);
                            setClaimUrlCopied(true);
                            setTimeout(() => setClaimUrlCopied(false), 3000);
                            toast.success('Claim link copied');
                          }}
                        >
                          {claimUrlCopied ? (
                            <Check className="h-4 w-4 mr-1 text-emerald-400" />
                          ) : (
                            <Copy className="h-4 w-4 mr-1" />
                          )}
                          Copy Link
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Send claim invite to:</Label>
                      <div className="flex gap-2">
                        <Input
                          type="email"
                          value={claimEmail}
                          onChange={(e) => setClaimEmail(e.target.value)}
                          className="bg-secondary border-border text-foreground text-sm focus:border-primary focus:ring-ring/20"
                          placeholder="owner@example.com"
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold shrink-0"
                          onClick={() => generateClaimInviteMutation.mutate(claimEmail)}
                          disabled={generateClaimInviteMutation.isPending}
                        >
                          {generateClaimInviteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Generate Link'
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          onClick={() => setClaimInviteOpen(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground/70">
                        Generates a claim link you can copy and send manually.
                      </p>
                    </div>
                  )}
                  {business.claim_token && business.claim_sent_at && (
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      Invite sent {format(new Date(business.claim_sent_at), 'MMM d, yyyy')}
                      {business.claim_email && ` to ${business.claim_email}`}
                    </p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Profile (editable) */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                Profile
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Business name</Label>
                  <Input
                    value={formState.name ?? ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20"
                    placeholder="Business name"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
                  <Textarea
                    value={formState.description ?? ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={3}
                    className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20 resize-none"
                    placeholder="Description / bio"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                    Categories
                    {formState.subcategories?.length > 0 && (
                      <span className="ml-2 text-primary normal-case">
                        ({formState.subcategories.length} selected)
                      </span>
                    )}
                  </Label>

                  {/* Selected chips */}
                  {formState.subcategories?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 mb-1.5">
                      {formState.subcategories.map((subId) => (
                        <span
                          key={subId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary-hover text-xs border border-primary/30 cursor-pointer hover:bg-primary/30"
                          onClick={() => toggleSubcategory(subId)}
                        >
                          {getSubcategoryLabel(subId)}
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Grouped checkboxes */}
                  <div className="mt-1 border border-border rounded-lg bg-secondary max-h-52 overflow-y-auto">
                    {mainCategories.map((main) => (
                      <div key={main.id} className="px-2 py-1.5">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">{main.label}</p>
                        <div className="space-y-0.5">
                          {main.subcategories.map((sub) => {
                            const isSelected = formState.subcategories?.includes(sub.id);
                            return (
                              <div
                                key={sub.id}
                                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-surface/50 ${isSelected ? 'bg-surface/30' : ''}`}
                                onClick={() => toggleSubcategory(sub.id)}
                              >
                                <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-border bg-transparent'}`}>
                                  {isSelected && (
                                    <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </div>
                                <span className="text-sm text-foreground-soft">{sub.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Archetype</Label>
                  <Select
                    value={formState.archetype ?? ''}
                    onValueChange={(val) => handleFieldChange('archetype', val)}
                  >
                    <SelectTrigger className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20">
                      <SelectValue placeholder="Select archetype" />
                    </SelectTrigger>
                    <SelectContent>
                      {(ONBOARDING_CONFIG.archetypes || []).filter((a) => a.active !== false).map((arch) => (
                        <SelectItem
                          key={arch.value}
                          value={arch.value}
                          className="text-foreground-soft focus:bg-secondary focus:text-primary"
                        >
                          {arch.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {subcategoryOptions.length > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Subcategory</Label>
                    <Select
                      value={formState.subcategory ?? ''}
                      onValueChange={(val) => handleFieldChange('subcategory', val)}
                    >
                      <SelectTrigger className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20">
                        <SelectValue placeholder="Select subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategoryOptions.map((opt) => (
                          <SelectItem
                            key={opt}
                            value={opt}
                            className="text-foreground-soft focus:bg-secondary focus:text-primary"
                          >
                            {opt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Contact email</Label>
                  <Input
                    type="email"
                    value={formState.email ?? ''}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20"
                    placeholder="contact@example.com"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Contact phone</Label>
                  <Input
                    type="tel"
                    value={formState.phone ?? ''}
                    onChange={(e) => handleFieldChange('phone', formatPhone(e.target.value))}
                    className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20"
                    placeholder="(541) 555-1234"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Website</Label>
                  <Input
                    type="url"
                    value={formState.website ?? ''}
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                    className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20"
                    placeholder="https://example.com"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Business Hours</Label>
                  <Textarea
                    value={formState.business_hours ?? ''}
                    onChange={(e) => handleFieldChange('business_hours', e.target.value)}
                    rows={2}
                    className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20 resize-none"
                    placeholder="e.g., Mon-Fri 9am-5pm, Sat 10am-2pm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Instagram</Label>
                  <Input
                    value={formState.instagram ?? ''}
                    onChange={(e) => handleFieldChange('instagram', (e.target.value || '').replace(/^@/, ''))}
                    className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20"
                    placeholder="@yourbusiness"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Facebook Page</Label>
                  <Input
                    value={formState.facebook ?? ''}
                    onChange={(e) => handleFieldChange('facebook', e.target.value)}
                    className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20"
                    placeholder="facebook.com/yourbusiness"
                  />
                </div>
                {resolvedArchetype === 'service_provider' && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Service Area</Label>
                      <Input
                        value={formState.service_area ?? ''}
                        onChange={(e) => handleFieldChange('service_area', e.target.value)}
                        className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20"
                        placeholder="e.g., Eugene/Springfield area"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Services Offered</Label>
                      <Textarea
                        value={formState.services_offered ?? ''}
                        onChange={(e) => handleFieldChange('services_offered', e.target.value)}
                        rows={3}
                        className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20 resize-none"
                        placeholder="Describe the services you provide"
                      />
                    </div>
                  </>
                )}
                {(resolvedArchetype === 'product_seller' || resolvedArchetype === 'micro_business') && (
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Shop URL</Label>
                    <Input
                      value={formState.shop_url ?? ''}
                      onChange={(e) => handleFieldChange('shop_url', e.target.value)}
                      className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20"
                      placeholder="e.g., etsy.com/shop/yourshop"
                    />
                  </div>
                )}
                <label className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg border border-border cursor-pointer">
                  <Switch
                    checked={formState.display_full_address === true}
                    onCheckedChange={(checked) => handleFieldChange('display_full_address', checked)}
                    className="data-[state=checked]:bg-primary"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">Display full address on map?</p>
                    <p className="text-xs text-muted-foreground/70">Off by default to protect privacy</p>
                  </div>
                </label>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Street address <span className="text-primary">*</span></Label>
                  <Input
                    value={formState.address ?? ''}
                    onChange={(e) => handleFieldChange('address', e.target.value)}
                    className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20"
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">City <span className="text-primary">*</span></Label>
                    <Input
                      value={formState.city ?? ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">State <span className="text-primary">*</span></Label>
                    <Select
                      value={formState.state ?? ''}
                      onValueChange={(val) => handleFieldChange('state', val)}
                    >
                      <SelectTrigger className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20">
                        <SelectValue placeholder="State" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s.code} value={s.code} className="text-foreground focus:bg-secondary focus:text-primary">
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Zip <span className="text-primary">*</span></Label>
                    <Input
                      value={formState.zip_code ?? ''}
                      onChange={(e) => handleFieldChange('zip_code', e.target.value)}
                      className="bg-secondary border-border text-foreground rounded-lg mt-1 focus:border-primary focus:ring-ring/20"
                      placeholder="97401"
                      maxLength={10}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  {(uploadedLogoUrl || formState.logo_url || business?.logo_url) ? (
                    <img src={uploadedLogoUrl || formState.logo_url || business?.logo_url} alt={business.name} className="h-20 w-20 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="h-20 w-20 rounded-lg bg-secondary border border-border flex items-center justify-center">
                      <Store className="h-8 w-8 text-muted-foreground/70" />
                    </div>
                  )}
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      className="hidden"
                      onChange={handleDrawerLogoUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-primary text-primary hover:bg-primary/10"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoUploadMutation.isPending}
                    >
                      {logoUploadMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      Upload New
                    </Button>
                    <p className="text-xs text-muted-foreground/70 mt-1">Recommended: 200x200px, PNG or JPG</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Banner */}
            <div className="space-y-3">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Banner
              </h3>
              {formState.banner_url ? (
                <div className="relative rounded-lg overflow-hidden border border-border bg-card">
                  <img
                    src={formState.banner_url}
                    alt="Banner"
                    className="w-full max-h-24 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => updateField('banner_url', '')}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-secondary/90 border border-border flex items-center justify-center text-muted-foreground hover:text-red-400 hover:border-red-400 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center h-20 rounded-lg bg-secondary border border-dashed border-border">
                  <p className="text-xs text-muted-foreground/70">No banner image</p>
                </div>
              )}
              <div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={handleBannerUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary hover:bg-primary/10"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={bannerUploadMutation.isPending}
                >
                  {bannerUploadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {formState.banner_url ? 'Change Banner' : 'Upload Banner'}
                </Button>
                <p className="text-xs text-muted-foreground/70 mt-1">Recommended: 1200 x 400px, JPG or PNG. This appears at the top of the business profile.</p>
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-3">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                Photos
              </h3>
              <p className="text-xs text-muted-foreground">
                Gallery photos shown on the public profile. Also used as a banner fallback if no banner is set.
              </p>

              {/* Photo thumbnails */}
              {formState.photos?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {formState.photos.map((photoUrl, idx) => (
                    <div key={photoUrl + idx} className="relative shrink-0 group">
                      <img
                        src={photoUrl}
                        alt={`Photo ${idx + 1}`}
                        className="h-20 w-20 rounded-lg object-cover border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = formState.photos.filter((_, i) => i !== idx);
                          updateField('photos', updated);
                        }}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-red-400 hover:border-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-primary text-primary hover:bg-primary/10"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploadMutation.isPending}
                >
                  {photoUploadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Add Photo
                </Button>
                <p className="text-xs text-muted-foreground/70 mt-1">PNG or JPG. These appear in the photo gallery.</p>
              </div>
            </div>

            <Separator className="bg-surface" />

            {/* Tier Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium text-foreground">Subscription Tier</Label>
              <Select
                value={formState.subscription_tier}
                onValueChange={(value) => handleFieldChange(
                  'subscription_tier',
                  value,
                  'tier_change',
                  `Change this business to ${tierLabels[value].label} tier?`
                )}
                disabled={saveMutation.isPending}
              >
                <SelectTrigger className="bg-secondary border-border text-foreground-soft">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="basic" className="text-foreground-soft focus:bg-secondary">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      Basic
                    </div>
                  </SelectItem>
                  <SelectItem value="standard" className="text-foreground-soft focus:bg-secondary">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Standard
                    </div>
                  </SelectItem>
                  <SelectItem value="partner" className="text-foreground-soft focus:bg-secondary">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-primary" />
                      Partner
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-surface" />

            {/* Badges/Flags Section */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Badges & Flags</h3>
              
              {/* Accepts Silver */}
              <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="flex items-center gap-3">
                  <Coins className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="font-medium text-foreground">Accepts Silver</Label>
                    <p className="text-xs text-muted-foreground">Business accepts silver/precious metals</p>
                  </div>
                </div>
                <Switch
                  checked={formState.accepts_silver}
                  onCheckedChange={(checked) => handleFieldChange(
                    'accepts_silver',
                    checked,
                    'accepts_silver_toggle'
                  )}
                  disabled={saveMutation.isPending}
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              {/* Locally Owned Franchise */}
              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-primary" />
                  <div>
                    <Label className="font-medium text-foreground">Locally Owned Franchise</Label>
                    <p className="text-xs text-muted-foreground">Part of a franchise but majority-owned and operated locally</p>
                  </div>
                </div>
                <Switch
                  checked={formState.is_locally_owned_franchise}
                  onCheckedChange={(checked) => handleFieldChange(
                    'is_locally_owned_franchise',
                    checked,
                    'locally_owned_franchise_toggle',
                    checked ? 'Mark this as a Locally Owned Franchise?' : 'Remove Locally Owned Franchise status?'
                  )}
                  disabled={saveMutation.isPending}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>

            <Separator className="bg-surface" />

            {/* Networks */}
            <div className="space-y-4">
              <h3 className="font-medium text-foreground">Networks</h3>
              {networks.length === 0 ? (
                <p className="text-xs text-muted-foreground/70">No networks configured. Add networks in Admin → Networks.</p>
              ) : (
                networks.map((network) => {
                  const networkId = network.value ?? network.slug ?? network.id;
                  const displayName = network.label ?? network.name ?? networkId;
                  const currentIds = Array.isArray(formState.network_ids) ? formState.network_ids : [];
                  const isChecked = currentIds.includes(networkId);
                  return (
                    <div key={networkId} className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 text-primary" />
                        <div>
                          <Label className="font-medium text-foreground">{displayName}</Label>
                          <p className="text-xs text-muted-foreground">Assign this business to {displayName}</p>
                        </div>
                      </div>
                      <Switch
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const next = checked
                            ? [...currentIds, networkId]
                            : currentIds.filter((id) => id !== networkId);
                          handleFieldChange('network_ids', next, 'network_toggle');
                        }}
                        disabled={saveMutation.isPending}
                        className="data-[state=checked]:bg-primary"
                      />
                    </div>
                  );
                })
              )}
            </div>

            <Separator className="bg-surface" />

            {/* Visibility */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-medium text-foreground">Active / Visible</Label>
                <p className="text-sm text-muted-foreground">Listing is visible to the public</p>
              </div>
              <Switch
                checked={formState.is_active}
                onCheckedChange={(checked) => handleFieldChange(
                  'is_active',
                  checked,
                  'visibility_toggle',
                  checked ? 'Make this listing visible?' : 'Hide this listing from the public?'
                )}
                disabled={saveMutation.isPending}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <Separator className="bg-surface" />

            {/* Staff Management */}
            <div className="space-y-4">
              <h3 className="text-foreground font-semibold">Staff & Instructors</h3>

              <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div>
                  <p className="text-foreground text-sm">{business.owner_email}</p>
                  <p className="text-muted-foreground text-xs">Owner</p>
                </div>
                <Badge className="bg-primary text-primary-foreground">Owner</Badge>
              </div>

              {staffUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div>
                    <p className="text-foreground text-sm">{user.full_name || user.email}</p>
                    <p className="text-muted-foreground text-xs">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(getRoleForUser(user.id))}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        removeStaffMutation.mutate(user.id);
                      }}
                      className="h-8 w-8 text-muted-foreground hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pending Invites */}
              {pendingInvites.length > 0 && (
                <div className="space-y-2 pt-3 mt-3 border-t border-border">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">Pending Invites</p>
                  {pendingInvites.map((invite, idx) => (
                    <div key={invite.email + idx} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                      <div>
                        <p className="text-foreground-soft text-sm">{invite.email}</p>
                        <p className="text-muted-foreground/70 text-xs">Invited as {invite.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-primary/50 text-primary text-xs">Pending</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeInviteMutation.mutate(invite.email)}
                          disabled={removeInviteMutation.isPending}
                          className="h-8 w-8 text-muted-foreground hover:text-red-400"
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
                  className="flex h-10 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
                <Button
                  type="submit"
                  disabled={isSearchingStaff || !addStaffEmail.trim()}
                  size="sm"
                  className="bg-primary hover:bg-primary/80 text-primary-foreground"
                >
                  Search
                </Button>
              </form>

              {staffSearchError && (
                <p className="text-red-400 text-xs">{staffSearchError}</p>
              )}

              {staffSearchResult && !staffSearchResult.notFound && (
                <div className="space-y-3 p-3 bg-surface rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-foreground text-sm">{staffSearchResult.full_name || staffSearchResult.email}</p>
                      <p className="text-muted-foreground text-xs">{staffSearchResult.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-muted-foreground text-xs shrink-0">Role:</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={setSelectedRole}
                      disabled={addStaffMutation.isPending}
                    >
                      <SelectTrigger className="h-8 bg-secondary border-border text-foreground-soft text-sm w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="co-owner" className="text-foreground-soft focus:bg-secondary">Co-Owner</SelectItem>
                        <SelectItem value="manager" className="text-foreground-soft focus:bg-secondary">Manager</SelectItem>
                        <SelectItem value="instructor" className="text-foreground-soft focus:bg-secondary">Instructor</SelectItem>
                        <SelectItem value="staff" className="text-foreground-soft focus:bg-secondary">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => addStaffMutation.mutate({ userId: staffSearchResult.id, role: selectedRole })}
                      disabled={addStaffMutation.isPending}
                      size="sm"
                      className="bg-primary hover:bg-primary/80 text-primary-foreground"
                    >
                      {addStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
                    </Button>
                  </div>
                </div>
              )}

              {staffSearchResult?.notFound && (
                <div className="space-y-3 p-3 bg-surface rounded-lg">
                  <p className="text-foreground text-sm">{staffSearchResult.email}</p>
                  <p className="text-primary text-xs">No account found — send invite</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="text-muted-foreground text-xs shrink-0">Role:</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={setSelectedRole}
                      disabled={inviteStaffMutation.isPending}
                    >
                      <SelectTrigger className="h-8 bg-secondary border-border text-foreground-soft text-sm w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="co-owner" className="text-foreground-soft focus:bg-secondary">Co-Owner</SelectItem>
                        <SelectItem value="manager" className="text-foreground-soft focus:bg-secondary">Manager</SelectItem>
                        <SelectItem value="instructor" className="text-foreground-soft focus:bg-secondary">Instructor</SelectItem>
                        <SelectItem value="staff" className="text-foreground-soft focus:bg-secondary">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => inviteStaffMutation.mutate({ email: staffSearchResult.email, role: selectedRole })}
                      disabled={inviteStaffMutation.isPending}
                      size="sm"
                      className="w-full sm:w-auto bg-primary hover:bg-primary/80 text-primary-foreground"
                    >
                      {inviteStaffMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Invite'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <Separator className="bg-surface" />

            {/* Delete Business */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Danger zone</h3>
              <Button
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Business
              </Button>
            </div>
          </div>

          {hasChanges && (
            <div className="sticky bottom-0 bg-card border-t border-border p-4 flex flex-col gap-3 shrink-0">
              {saveMutation.isError && (
                <p className="text-red-400 text-sm">Save failed. Please try again.</p>
              )}
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDiscardChanges}
                  disabled={saveMutation.isPending}
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={saveMutation.isPending}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold rounded-lg transition-colors"
                >
                  {saveMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Business?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure? This will remove all events and data associated with this business.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-foreground-soft hover:bg-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-600 hover:bg-red-500 text-foreground"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirm Change</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">{confirmDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-foreground-soft hover:bg-secondary">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange} className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved changes on close */}
      <AlertDialog open={unsavedCloseDialogOpen} onOpenChange={setUnsavedCloseDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              You have unsaved changes. Discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-foreground-soft hover:bg-secondary">Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseWithDiscard}
              className="bg-surface hover:bg-surface text-foreground"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}