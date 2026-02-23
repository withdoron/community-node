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
        } catch {}
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
          } catch {}
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
          } catch {}
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
        return <Badge className="border-amber-500 text-amber-500" variant="outline">Co-Owner</Badge>;
      case 'manager':
        return <Badge className="bg-purple-500 text-white">Manager</Badge>;
      case 'instructor':
        return <Badge className="bg-blue-500 text-white">Instructor</Badge>;
      case 'staff':
        return <Badge variant="outline" className="border-slate-500 text-slate-300">Staff</Badge>;
      default:
        return <Badge variant="outline" className="border-slate-600 text-slate-400">Unknown</Badge>;
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
    <Card className="p-6 bg-slate-900 border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Staff & Instructors</h2>
          <p className="text-sm text-slate-400">Manage your team members</p>
        </div>
        {(isOwner || isCoOwner || isManager) && (
          <Button
            variant="outline"
            className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black"
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
        <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-white font-medium">{business?.owner_email}</p>
              <p className="text-slate-400 text-sm">Owner</p>
            </div>
          </div>
          <Badge className="bg-amber-500 text-black">Owner</Badge>
        </div>

        {/* Staff list */}
        {staffUsers.map((user) => (
          <div key={user.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-slate-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium truncate">
                  {user._permissionDenied ? 'Team Member' : (user.full_name || user.email)}
                </p>
                {!user._permissionDenied && user.email && (
                  <p className="text-slate-400 text-sm truncate">{user.email}</p>
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
                  className="text-slate-400 hover:text-red-400 hover:bg-slate-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div className="space-y-2 pt-4 mt-4 border-t border-slate-700">
            <p className="text-slate-400 text-xs uppercase tracking-wide">Pending Invites</p>
            {pendingInvites.map((invite, idx) => (
              <div
                key={(invite.email || 'invite') + idx}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-slate-300 truncate">{invite.email}</p>
                    <p className="text-slate-500 text-sm">Invited as {invite.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                    Pending
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hover:bg-slate-800"
                    onClick={() => removeStaffMutation.mutate(invite.email)}
                    disabled={removeStaffMutation.isPending}
                    className="text-slate-400 hover:text-red-400 hover:bg-slate-700"
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
          <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
            <div className="w-10 h-10 bg-slate-700 rounded-full animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-slate-700 rounded w-32 animate-pulse" />
              <div className="h-3 bg-slate-700 rounded w-48 animate-pulse" />
            </div>
          </div>
        )}

        {/* Empty state when no staff and no pending invites */}
        {!staffLoading && staffList.length === 0 && pendingInvites.length === 0 && (
          <div className="text-center py-6 border border-dashed border-slate-700 rounded-lg">
            <UserPlus className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400">Invite your team</p>
            <p className="text-slate-500 text-sm">Give permissions to managers or door staff</p>
          </div>
        )}
      </div>
    </Card>

    <Dialog open={addStaffOpen} onOpenChange={setAddStaffOpen}>
      <DialogContent className="bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Add Staff Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-300">Search by email</Label>
            <div className="flex gap-2 mt-1">
              <Input
                type="email"
                placeholder="staff@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <Button
                onClick={handleSearchUser}
                disabled={isSearching || !searchEmail.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-black"
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {searchError && (
            <p className="text-red-400 text-sm">{searchError}</p>
          )}

          {searchResult && (
            <div className="p-3 bg-slate-800 rounded-lg">
              {searchResult.notFound ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{searchResult.email}</p>
                      <p className="text-amber-500 text-sm">No account found — send invite</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="co-owner" className="text-slate-300 focus:bg-slate-700">Co-Owner</SelectItem>
                        <SelectItem value="manager" className="text-slate-300 focus:bg-slate-700">Manager</SelectItem>
                        <SelectItem value="instructor" className="text-slate-300 focus:bg-slate-700">Instructor</SelectItem>
                        <SelectItem value="staff" className="text-slate-300 focus:bg-slate-700">Staff</SelectItem>
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
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {inviteStaffMutation.isPending ? 'Sending...' : 'Send Invite'}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-3">
                    <Label className="text-slate-300">Role</Label>
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="co-owner" className="text-slate-300 focus:bg-slate-700">Co-Owner</SelectItem>
                        <SelectItem value="manager" className="text-slate-300 focus:bg-slate-700">Manager</SelectItem>
                        <SelectItem value="instructor" className="text-slate-300 focus:bg-slate-700">Instructor</SelectItem>
                        <SelectItem value="staff" className="text-slate-300 focus:bg-slate-700">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-slate-500 text-xs">
                      {selectedRole === 'co-owner' && 'Owner-level access: everything except delete business'}
                      {selectedRole === 'manager' && 'Full access: create events, manage staff, view analytics'}
                      {selectedRole === 'instructor' && 'Can edit assigned events and use check-in'}
                      {selectedRole === 'staff' && 'Check-in access only'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{searchResult.full_name || searchResult.email}</p>
                        <p className="text-slate-400 text-sm truncate">{searchResult.email}</p>
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
                      className="bg-amber-500 hover:bg-amber-600 text-black"
                    >
                      {addStaffMutation.isPending ? 'Adding...' : 'Add'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-slate-500 text-sm">
            The person must have a LocalLane account. They'll appear in your staff list and can be assigned to events.
          </p>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}