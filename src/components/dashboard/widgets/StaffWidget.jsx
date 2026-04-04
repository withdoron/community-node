import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, UserPlus, Plus, X, Mail } from "lucide-react";

export default function StaffWidget({ business, currentUserId }) {
  const queryClient = useQueryClient();
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedRole, setSelectedRole] = useState('instructor');

  // Active staff: from business.instructors only (Business.staff not in schema)
  const staffList = useMemo(() => {
    return (business?.instructors || []).map((id) => ({
      user_id: id,
      role: 'instructor',
      status: 'active',
    }));
  }, [business?.instructors]);

  const staffUserIds = useMemo(() => staffList.map((s) => s.user_id), [staffList]);

  // Pending invites: stored in AdminSettings (key: staff_invites:{business_id})
  const { data: pendingInvites = [] } = useQuery({
    queryKey: ['staffInvites', business?.id],
    queryFn: async () => {
      if (!business?.id) return [];
      const key = `staff_invites:${business.id}`;
      const settings = await base44.entities.AdminSettings.filter({ key });
      if (!settings?.length) return [];
      try {
        return JSON.parse(settings[0].value) || [];
      } catch {
        return [];
      }
    },
    enabled: !!business?.id,
  });

  // Active staff roles: stored in AdminSettings (key: staff_roles:{business_id})
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

  const isOwner = business?.owner_user_id === currentUserId;
  const myRole = currentUserId ? getRoleForUser(currentUserId) : null;
  const isCoOwner = myRole === 'co-owner';
  const isManager = myRole === 'manager';

  const { data: staffUsers = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff', business?.id, business?.instructors],
    queryFn: async () => {
      if (!business?.instructors?.length) return [];

      const users = await Promise.all(
        business.instructors.map(async (id) => {
          try {
            const results = await base44.entities.User.filter({ id }, '', 1);
            if (results.length > 0) {
              return results[0];
            }
            return { id, email: 'Team Member', full_name: null, _notFound: true };
          } catch (error) {
            return { id, email: 'Team Member', full_name: null, _permissionDenied: true };
          }
        })
      );

      return users.filter(Boolean);
    },
    enabled: !!business?.id && !!business?.instructors?.length,
  });

  const addStaffMutation = useMutation({
    mutationFn: async ({ userId, email, role }) => {
      // 1. Add user to instructors array
      const currentInstructors = business.instructors || [];
      if (!currentInstructors.includes(userId)) {
        await base44.functions.invoke('updateBusiness', {
          action: 'update',
          business_id: business.id,
          data: { instructors: [...currentInstructors, userId] },
        });
      }

      // 2. Write role to staff_roles
      const rolesKey = `staff_roles:${business.id}`;
      const rolesRes = await base44.functions.invoke('updateAdminSettings', {
        action: 'filter',
        key: rolesKey,
      });
      const rolesExisting = Array.isArray(rolesRes) ? rolesRes : (rolesRes?.data ?? []);
      let currentRoles = [];
      if (rolesExisting.length > 0) {
        try {
          currentRoles = JSON.parse(rolesExisting[0].value || '[]') || [];
        } catch { /* malformed JSON — use empty default */ }
      }
      const newRole = {
        user_id: userId,
        role: role || 'instructor',
        added_at: new Date().toISOString(),
      };
      const updatedRoles = [...currentRoles.filter((r) => r.user_id !== userId), newRole];
      if (rolesExisting.length > 0) {
        await base44.functions.invoke('updateAdminSettings', {
          action: 'update',
          id: rolesExisting[0].id,
          key: rolesKey,
          value: JSON.stringify(updatedRoles),
        });
      } else {
        await base44.functions.invoke('updateAdminSettings', {
          action: 'create',
          key: rolesKey,
          value: JSON.stringify(updatedRoles),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', business.id] });
      queryClient.invalidateQueries({ queryKey: ['staffRoles', business.id] });
      queryClient.invalidateQueries({ queryKey: ['associatedBusinesses'] });
      queryClient.invalidateQueries({ queryKey: ['ownedBusinesses'] });
      queryClient.invalidateQueries({ queryKey: ['staffBusinesses'] });
      setAddStaffOpen(false);
      setSearchEmail('');
      setSearchResult(null);
      setSearchError('');
      setSelectedRole('instructor');
      toast.success('Staff member added successfully');
    },
    onError: () => {
      toast.error('Failed to add staff member');
    },
  });

  // Pending invites stored in AdminSettings (Business.staff not in schema)
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
      queryClient.invalidateQueries({ queryKey: ['staffInvites', business.id] });
      setAddStaffOpen(false);
      setSearchEmail('');
      setSearchResult(null);
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

  const removeStaffMutation = useMutation({
    mutationFn: async (identifier) => {
      const isPendingInvite = pendingInvites.some(
        (inv) => (inv.email || '').toLowerCase() === String(identifier).toLowerCase()
      );
      if (isPendingInvite) {
        const key = `staff_invites:${business.id}`;
        const res = await base44.functions.invoke('updateAdminSettings', { action: 'filter', key });
        const existing = Array.isArray(res) ? res : (res?.data ?? []);
        if (existing.length > 0) {
          let currentInvites = [];
          try {
            currentInvites = JSON.parse(existing[0].value) || [];
          } catch { /* malformed JSON — use empty default */ }
          const updatedInvites = currentInvites.filter(
            (inv) => (inv.email || '').toLowerCase() !== String(identifier).toLowerCase()
          );
          await base44.functions.invoke('updateAdminSettings', {
            action: 'update',
            id: existing[0].id,
            key,
            value: JSON.stringify(updatedInvites),
          });
        }
      } else {
        const updatedInstructors = (business.instructors || []).filter((id) => id !== identifier);
        await base44.functions.invoke('updateBusiness', {
          action: 'update',
          business_id: business.id,
          data: { instructors: updatedInstructors },
        });
        const rolesKey = `staff_roles:${business.id}`;
        const rolesRes = await base44.functions.invoke('updateAdminSettings', {
          action: 'filter',
          key: rolesKey,
        });
        const rolesExisting = Array.isArray(rolesRes) ? rolesRes : (rolesRes?.data ?? []);
        if (rolesExisting.length > 0) {
          let currentRoles = [];
          try {
            currentRoles = JSON.parse(rolesExisting[0].value) || [];
          } catch { /* malformed JSON — use empty default */ }
          const updatedRoles = currentRoles.filter((r) => r.user_id !== identifier);
          await base44.functions.invoke('updateAdminSettings', {
            action: 'update',
            id: rolesExisting[0].id,
            key: rolesKey,
            value: JSON.stringify(updatedRoles),
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffInvites', business.id] });
      queryClient.invalidateQueries({ queryKey: ['staff', business.id] });
      queryClient.invalidateQueries({ queryKey: ['associatedBusinesses'] });
      queryClient.invalidateQueries({ queryKey: ['ownedBusinesses'] });
      queryClient.invalidateQueries({ queryKey: ['staffBusinesses'] });
      toast.success('Removed');
    },
    onError: () => {
      toast.error('Failed to remove');
    },
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'co-owner':
        return <Badge className="border-primary text-primary" variant="outline">Co-Owner</Badge>;
      case 'manager':
        return <Badge className="bg-purple-500 text-white">Manager</Badge>;
      case 'instructor':
        return <Badge className="bg-blue-500 text-white">Instructor</Badge>;
      case 'staff':
        return <Badge variant="outline" className="border-muted-foreground text-foreground-soft">Staff</Badge>;
      default:
        return <Badge variant="outline" className="border-border text-muted-foreground">Unknown</Badge>;
    }
  };

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;

    setIsSearching(true);
    setSearchError('');
    setSearchResult(null);

    try {
      const res = await base44.functions.invoke('updateAdminSettings', {
        action: 'search_user_by_email',
        email: searchEmail.trim(),
      });
      const user = res?.user ?? null;

      if (!user) {
        const email = searchEmail.trim().toLowerCase();
        const alreadyInvited = (pendingInvites || []).some(
          (inv) => (inv.email || '').toLowerCase() === email
        );
        if (alreadyInvited) {
          setSearchError('This email has already been invited.');
          return;
        }
        setSearchResult({ notFound: true, email: searchEmail.trim() });
        setSearchError('');
        return;
      }

      const alreadyInInstructors = (business?.instructors || []).includes(user.id);
      if (alreadyInInstructors) {
        setSearchError('This user is already a staff member.');
        return;
      }

      if (user.id === business.owner_user_id) {
        setSearchError('This user is already the owner.');
        return;
      }

      setSearchResult(user);
    } catch (err) {
      setSearchError('No account found with that email.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <>
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Staff & Instructors</h2>
          <p className="text-sm text-muted-foreground">Manage your team members</p>
        </div>
        {(isOwner || isCoOwner || isManager) && (
          <Button
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => {
              setAddStaffOpen(true);
              setSearchEmail('');
              setSearchResult(null);
              setSearchError('');
              setSelectedRole('instructor');
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {/* Owner row */}
        <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-foreground font-medium">{business?.owner_email}</p>
              <p className="text-muted-foreground text-sm">Owner</p>
            </div>
          </div>
          <Badge className="bg-primary text-primary-foreground">Owner</Badge>
        </div>

        {/* Staff list */}
        {staffUsers.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-foreground font-medium truncate">
                  {user._permissionDenied ? 'Team Member' : (user.full_name || user.email)}
                </p>
                {!user._permissionDenied && user.email && (
                  <p className="text-muted-foreground text-sm truncate">{user.email}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getRoleBadge(getRoleForUser(user.id))}
              {(isOwner || isCoOwner || isManager) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStaffMutation.mutate(user.id)}
                  disabled={removeStaffMutation.isPending}
                  className="text-muted-foreground hover:text-red-400 hover:bg-surface"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-2 pt-4 mt-4 border-t border-border">
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Pending Invites</p>
            {pendingInvites.map((invite, idx) => (
              <div
                key={(invite.email || 'invite') + idx}
                className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-muted-foreground/70" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground-soft truncate">{invite.email}</p>
                    <p className="text-muted-foreground/70 text-sm">Invited as {invite.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/50 text-primary">
                    Pending
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-secondary"
                    onClick={() => removeStaffMutation.mutate(invite.email)}
                    disabled={removeStaffMutation.isPending}
                    className="text-muted-foreground hover:text-red-400 hover:bg-surface"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading state */}
        {staffLoading && staffList.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
            <div className="w-10 h-10 bg-surface rounded-full animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-surface rounded w-32 animate-pulse" />
              <div className="h-3 bg-surface rounded w-48 animate-pulse" />
            </div>
          </div>
        )}

        {/* Empty state when no staff and no pending invites */}
        {!staffLoading && staffList.length === 0 && pendingInvites.length === 0 && (
          <div className="text-center py-6 border border-dashed border-border rounded-lg">
            <UserPlus className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-muted-foreground">Invite your team</p>
            <p className="text-muted-foreground/70 text-sm">Give permissions to managers or door staff</p>
          </div>
        )}
      </div>
    </Card>

    <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Staff Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-foreground-soft">Search by email</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="email"
                placeholder="staff@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                className="bg-secondary border-border text-foreground"
              />
              <Button
                onClick={handleSearchUser}
                disabled={isSearching || !searchEmail.trim()}
                className="bg-primary hover:bg-primary/80 text-primary-foreground"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {searchError && (
            <p className="text-red-400 text-sm">{searchError}</p>
          )}

          {searchResult && (
            <div className="p-3 bg-secondary rounded-lg">
              {searchResult.notFound ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-foreground font-medium">{searchResult.email}</p>
                      <p className="text-primary text-sm">No account found — send invite</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground-soft text-sm">Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="bg-surface border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        <SelectItem value="co-owner" className="text-foreground-soft focus:bg-surface">Co-Owner</SelectItem>
                        <SelectItem value="manager" className="text-foreground-soft focus:bg-surface">Manager</SelectItem>
                        <SelectItem value="instructor" className="text-foreground-soft focus:bg-surface">Instructor</SelectItem>
                        <SelectItem value="staff" className="text-foreground-soft focus:bg-surface">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={() =>
                      inviteStaffMutation.mutate({
                        email: searchResult.email,
                        role: selectedRole,
                      })
                    }
                    disabled={inviteStaffMutation.isPending}
                    className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {inviteStaffMutation.isPending ? 'Sending...' : 'Send Invite'}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-3">
                    <Label className="text-foreground-soft">Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="bg-secondary border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-secondary border-border">
                        <SelectItem value="co-owner" className="text-foreground-soft focus:bg-surface">Co-Owner</SelectItem>
                        <SelectItem value="manager" className="text-foreground-soft focus:bg-surface">Manager</SelectItem>
                        <SelectItem value="instructor" className="text-foreground-soft focus:bg-surface">Instructor</SelectItem>
                        <SelectItem value="staff" className="text-foreground-soft focus:bg-surface">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-muted-foreground/70 text-xs">
                      {selectedRole === 'co-owner' && 'Owner-level access: everything except delete business'}
                      {selectedRole === 'manager' && 'Full access: create events, manage staff, view analytics'}
                      {selectedRole === 'instructor' && 'Can edit assigned events and use check-in'}
                      {selectedRole === 'staff' && 'Check-in access only'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate">{searchResult.full_name || searchResult.email}</p>
                        <p className="text-muted-foreground text-sm truncate">{searchResult.email}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() =>
                        addStaffMutation.mutate({
                          userId: searchResult.id,
                          email: searchResult.email,
                          role: selectedRole,
                        })
                      }
                      disabled={addStaffMutation.isPending}
                      className="bg-primary hover:bg-primary/80 text-primary-foreground"
                    >
                      {addStaffMutation.isPending ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-muted-foreground/70 text-sm">
            The person must have a LocalLane account. They'll appear in your staff list and can be assigned to events.
          </p>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}