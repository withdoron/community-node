import React, { useState, useMemo } from 'react';
import { getFriendlyErrorMessage } from '@/lib/errorMessages';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminUpdateUser } from '@/functions/adminUpdateUser';
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

function formatPhone(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

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

  const { data: userJoyCoinRecords = [] } = useQuery({
    queryKey: ['admin-user-joycoins', selectedUser?.id],
    queryFn: () =>
      base44.entities.JoyCoins.filter({ user_id: String(selectedUser.id) }),
    enabled: !!selectedUser?.id
  });

  const updateUserMutation = useMutation({
    mutationFn: async (updates) => {
      await adminUpdateUser(selectedUser.id, updates);
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
      admin_notes: user.data?.admin_notes || '',
      mylane_tier: user.data?.mylane_tier || 'basic',
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
    userJoyCoinRecords.length > 0 ? userJoyCoinRecords[0].balance || 0 : 0;

  const initials = (name) =>
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Users</h2>
          <p className="text-muted-foreground text-sm mt-1">{users.length} total users</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary border-border text-foreground"
          />
        </div>
      </div>

      {/* User Table */}
      {filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-xl">
          <p className="text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-soft">
                    Name
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-soft">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-soft hidden sm:table-cell">
                    Joined
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-soft">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-foreground-soft hidden sm:table-cell w-10">
                    CP
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleOpenDrawer(user)}
                    className="border-b border-border hover:bg-secondary/30 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-foreground">
                      {user.full_name || user.email?.split('@')[0] || 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground truncate max-w-[150px] sm:max-w-xs">
                      {user.email}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
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
                    <td className="py-3 px-4 hidden sm:table-cell">
                      {user.data?.community_pass_interest === 'yes' ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" title="Yes, interested" aria-hidden />
                      ) : user.data?.community_pass_interest === 'maybe_later' ? (
                        <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground" title="Maybe later" aria-hidden />
                      ) : null}
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
        <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
          {selectedUser && editData && (
            <>
              <SheetHeader>
                <SheetTitle className="text-foreground">User Details</SheetTitle>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Avatar & Name */}
                <div className="flex flex-col items-center text-center">
                  <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-3">
                    <span className="text-xl font-bold text-primary-foreground">
                      {initials(selectedUser.full_name || selectedUser.email)}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">
                    {selectedUser.full_name || selectedUser.email?.split('@')[0]}
                  </h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>

                <Separator className="bg-secondary" />

                {/* Profile */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Profile
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="text-foreground">
                        {formatPhone(selectedUser.phone || selectedUser.data?.phone) ||
                          'Not provided'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Home Community:</span>
                      <span className="text-foreground">
                        {selectedUser.data?.home_region === 'greater_eugene'
                          ? 'Greater Eugene Area'
                          : 'Not set'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member Since:</span>
                      <span className="text-foreground">
                        {selectedUser.created_date
                          ? format(new Date(selectedUser.created_date), 'MMMM yyyy')
                          : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Community Pass:</span>
                      <span className="text-foreground">
                        {selectedUser.data?.community_pass_interest === 'yes'
                          ? 'Interested'
                          : selectedUser.data?.community_pass_interest === 'maybe_later'
                            ? 'Maybe later'
                            : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">The Good News:</span>
                      <span className="text-foreground">
                        {selectedUser.data?.newsletter_interest ? 'Subscribed' : 'Not subscribed'}
                      </span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-secondary" />

                {/* Activity */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Activity
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recommendations:</span>
                      <span className="text-foreground">{userRecommendations.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">RSVPs:</span>
                      <span className="text-foreground">{userRSVPs.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Joy Coin balance:</span>
                      <span className="text-foreground">{joyCoinBalance}</span>
                    </div>
                  </div>
                </div>

                {/* Linked Businesses */}
                {(ownedBusinesses.length > 0 || staffBusinesses.length > 0) && (
                  <>
                    <Separator className="bg-secondary" />
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Linked Businesses
                      </h4>
                      <div className="space-y-1 text-sm">
                        {ownedBusinesses.map((b) => (
                          <div key={b.id} className="text-foreground-soft">
                            • {b.name} <span className="text-muted-foreground/70">(Owner)</span>
                          </div>
                        ))}
                        {staffBusinesses.map((b) => (
                          <div key={b.id} className="text-foreground-soft">
                            • {b.name} <span className="text-muted-foreground/70">(Staff)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator className="bg-secondary" />

                {/* Admin Controls */}
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Admin Controls
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-foreground-soft mb-1">
                        Account Status
                      </Label>
                      <Select
                        value={editData.status}
                        onValueChange={(value) =>
                          setEditData({ ...editData, status: value })
                        }
                      >
                        <SelectTrigger className="bg-secondary border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground-soft mb-1">
                        User Tier
                      </Label>
                      <Select
                        value={editData.tier}
                        onValueChange={(value) =>
                          setEditData({ ...editData, tier: value })
                        }
                      >
                        <SelectTrigger className="bg-secondary border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground-soft mb-1">
                        Mylane Beta Access
                      </Label>
                      <Select
                        value={editData.mylane_tier}
                        onValueChange={(value) =>
                          setEditData({ ...editData, mylane_tier: value })
                        }
                      >
                        <SelectTrigger className="bg-secondary border-border text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic (no agent)</SelectItem>
                          <SelectItem value="beta">Beta (agent enabled)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-foreground-soft mb-1">
                        Admin Notes
                      </Label>
                      <Textarea
                        value={editData.admin_notes}
                        onChange={(e) =>
                          setEditData({ ...editData, admin_notes: e.target.value })
                        }
                        placeholder="Internal notes about this user..."
                        className="bg-secondary border-border text-foreground min-h-[100px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  disabled={updateUserMutation.isPending}
                  className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold"
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
