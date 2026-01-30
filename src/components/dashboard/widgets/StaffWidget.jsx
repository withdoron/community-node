import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Plus, UserPlus } from "lucide-react";

export default function StaffWidget({ business }) {
  const queryClient = useQueryClient();
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const { data: staffUsers = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff', business?.id, business?.instructors],
    queryFn: async () => {
      if (!business?.instructors?.length) return [];
      const users = await Promise.all(
        business.instructors.map((id) =>
          base44.entities.User.get(id).catch(() => null)
        )
      );
      return users.filter(Boolean);
    },
    enabled: !!business?.id && !!business?.instructors?.length,
  });

  return (
    <>
    <Card className="p-6 bg-slate-900 border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Staff & Instructors</h2>
          <p className="text-sm text-slate-400">Manage your team members</p>
        </div>
        <Button
          variant="outline"
          className="border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black"
          onClick={() => {
            setAddStaffOpen(true);
            setSearchEmail('');
            setSearchResult(null);
            setSearchError('');
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-slate-400" />
              </div>
              <div>
                <p className="text-white font-medium">{user.full_name || user.email}</p>
                <p className="text-slate-400 text-sm">{user.email}</p>
              </div>
            </div>
            <Badge variant="outline" className="border-slate-600 text-slate-300">Instructor</Badge>
          </div>
        ))}

        {/* Loading state */}
        {staffLoading && business?.instructors?.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
            <div className="w-10 h-10 bg-slate-700 rounded-full animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 bg-slate-700 rounded w-32 animate-pulse" />
              <div className="h-3 bg-slate-700 rounded w-48 animate-pulse" />
            </div>
          </div>
        )}

        {/* Empty state when no instructors */}
        {!staffLoading && staffUsers.length === 0 && business?.instructors?.length === 0 && (
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{searchResult.full_name || searchResult.email}</p>
                    <p className="text-slate-400 text-sm">{searchResult.email}</p>
                  </div>
                </div>
                <Button
                  onClick={() => addStaffMutation.mutate(searchResult.id)}
                  disabled={addStaffMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {addStaffMutation.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
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