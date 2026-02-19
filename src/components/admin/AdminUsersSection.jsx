import React, { useState, useMemo } from 'react';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, X, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminUsersSection({ businesses = [] }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editData, setEditData] = useState(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date', 500)
  });

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const { data: userRecommendations = [] } = useQuery({
    queryKey: ['admin-user-recommendations', selectedUser?.id],
    queryFn: () =>
      base44.entities.Recommendation.filter({ user_id: String(selectedUser.id) }),
    enabled: !!selectedUser?.id
  });

  const { data: userRSVPs = [] } = useQuery({
    queryKey: ['admin-user-rsvps', selectedUser?.id],
    queryFn: () =>
      base44.entities.RSVP.filter({
        user_id: String(selectedUser.id),
        is_active: true
      }),
    enabled: !!selectedUser?.id
  });

  // Reads from legacy PunchPass entity — field mapping to Joy Coins terminology
  const { data: userLegacyJoyCoinRecords = [] } = useQuery({
    queryKey: ['admin-user-legacy-joycoins', selectedUser?.id],
    queryFn: () =>
      base44.entities.PunchPass.filter({ user_id: String(selectedUser.id) }),
    enabled: !!selectedUser?.id
  });

  const updateUserMutation = useMutation({
    mutationFn: async (updates) => {
      const existingData = selectedUser.data || {};
      await base44.entities.User.update(selectedUser.id, {
        data: { ...existingData, ...updates }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User updated');
      setSelectedUser(null);
      setEditData(null);
    },
    onError: (error) => {
      toast.error(getFriendlyErrorMessage(error, 'Failed to update user. Please try again.'));
    }
  });

  const handleOpenDrawer = (user) => {
    setSelectedUser(user);
    setEditData({
      status: user.data?.status || 'active',
      tier: user.data?.tier || 'free',
      admin_notes: user.data?.admin_notes || ''
    });
  };

  const handleCloseDrawer = () => {
    setSelectedUser(null);
    setEditData(null);
  };

  const handleSave = () => {
    updateUserMutation.mutate(editData);
  };

  const ownedBusinesses = useMemo(() => {
    if (!selectedUser) return [];
    return businesses.filter((b) => b.owner_id === String(selectedUser.id));
  }, [selectedUser, businesses]);

  const staffBusinesses = useMemo(() => {
    if (!selectedUser) return [];
    return businesses.filter((b) =>
      b.instructors?.includes(String(selectedUser.id))
    );
  }, [selectedUser, businesses]);

  const joyCoinBalance =
    userLegacyJoyCoinRecords.length > 0 ? userLegacyJoyCoinRecords[0].current_balance || 0 : 0;

  const initials = (name) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Users</h2>
          <p className="text-slate-400 text-sm mt-1">{users.length} total users</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-slate-800 border-slate-700 text-slate-100"
          />
        </div>
      </div>

      {/* User Table */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-xl">
          <p className="text-slate-400">No users found</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50 border-b border-slate-800">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                    Joined
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleOpenDrawer(user)}
                    className="border-b border-slate-800 hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-100">
                      {user.full_name || user.email?.split('@')[0] || 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-[150px] sm:max-w-xs">
                      {user.email}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {user.created_date
                        ? format(new Date(user.created_date), 'MMM yy')
                        : 'Unknown'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        className={
                          user.data?.status === 'suspended'
                            ? 'bg-red-500/20 text-red-500 border-red-500/30'
                            : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                        }
                      >
                        {user.data?.status === 'suspended' ? 'Suspended' : 'Active'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* User Detail Drawer */}
      <Sheet open={!!selectedUser} onOpenChange={handleCloseDrawer}>
        <SheetContent className="w-full sm:max-w-lg bg-slate-900 border-slate-800 overflow-y-auto">
          {selectedUser && editData && (
            <>
              <SheetHeader>
                <SheetTitle className="text-slate-100">User Details</SheetTitle>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Avatar & Name */}
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-amber-500 flex items-center justify-center mb-3">
                    <span className="text-xl font-bold text-black">
                      {initials(selectedUser.full_name || selectedUser.email)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">
                    {selectedUser.full_name || selectedUser.email?.split('@')[0]}
                  </h3>
                  <p className="text-sm text-slate-400">{selectedUser.email}</p>
                </div>

                <Separator className="bg-slate-800" />

                {/* Profile */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Profile
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="text-slate-100">
                        {selectedUser.phone ||
                          selectedUser.data?.phone ||
                          'Not provided'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Home Community:</span>
                      <span className="text-slate-100">
                        {selectedUser.data?.home_region === 'greater_eugene'
                          ? 'Greater Eugene Area'
                          : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Member Since:</span>
                      <span className="text-slate-100">
                        {selectedUser.created_date
                          ? format(new Date(selectedUser.created_date), 'MMMM yyyy')
                          : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-slate-800" />

                {/* Activity */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Activity
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Recommendations:</span>
                      <span className="text-slate-100">{userRecommendations.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">RSVPs:</span>
                      <span className="text-slate-100">{userRSVPs.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Joy Coin balance:</span>
                      <span className="text-slate-100">{joyCoinBalance}</span>
                    </div>
                  </div>
                </div>

                {/* Linked Businesses */}
                {(ownedBusinesses.length > 0 || staffBusinesses.length > 0) && (
                  <>
                    <Separator className="bg-slate-800" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Linked Businesses
                      </h4>
                      <div className="space-y-1 text-sm">
                        {ownedBusinesses.map((b) => (
                          <div key={b.id} className="text-slate-300">
                            • {b.name} <span className="text-slate-500">(Owner)</span>
                          </div>
                        ))}
                        {staffBusinesses.map((b) => (
                          <div key={b.id} className="text-slate-300">
                            • {b.name} <span className="text-slate-500">(Staff)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator className="bg-slate-800" />

                {/* Admin Controls */}
                <div>
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Admin Controls
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-300 mb-1">
                        Account Status
                      </Label>
                      <Select
                        value={editData.status}
                        onValueChange={(value) =>
                          setEditData({ ...editData, status: value })
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-300 mb-1">
                        User Tier
                      </Label>
                      <Select
                        value={editData.tier}
                        onValueChange={(value) =>
                          setEditData({ ...editData, tier: value })
                        }
                      >
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-slate-300 mb-1">
                        Admin Notes
                      </Label>
                      <Textarea
                        value={editData.admin_notes}
                        onChange={(e) =>
                          setEditData({ ...editData, admin_notes: e.target.value })
                        }
                        placeholder="Internal notes about this user..."
                        className="bg-slate-800 border-slate-700 text-slate-100 min-h-[100px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  disabled={updateUserMutation.isPending}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold"
                >
                  {updateUserMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
