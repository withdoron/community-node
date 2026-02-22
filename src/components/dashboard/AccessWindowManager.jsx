import React, { useState } from 'react';
import { Coins, Plus, Clock, Pencil, MoreHorizontal, Pause, Play, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccessWindows } from '@/hooks/useAccessWindows';
import AccessWindowModal from './AccessWindowModal';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const DAY_LABELS = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
};

function CommunityPassInterestToggle({ business, currentUserId }) {
  const queryClient = useQueryClient();
  const value = business?.community_pass_interest ?? null;
  const [showChange, setShowChange] = useState(false);

  const updateMutation = useMutation({
    mutationFn: async (interest) => {
      // Business entity must have community_pass_interest (string, nullable) in Base44
      await base44.entities.Business.update(business.id, { community_pass_interest: interest });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ownedBusinesses', currentUserId] });
      queryClient.invalidateQueries({ queryKey: ['staffBusinesses', currentUserId] });
      setShowChange(false);
    },
    onError: (err) => {
      console.error('Community Pass interest update error:', err);
      toast.error('Failed to save. Please try again.');
    },
  });

  const handleSelect = (interest) => {
    updateMutation.mutate(interest);
  };

  const isYes = value === 'yes';
  const isMaybe = value === 'maybe_later';
  const hasSelection = isYes || isMaybe;

  if (hasSelection && !showChange) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-sm text-emerald-400/90">Thanks! We&apos;ll reach out when Community Pass is ready.</p>
        <p className="text-xs text-slate-400">
          Your response: {isYes ? "Yes, I'm interested" : 'Maybe later'}
          {' · '}
          <button
            type="button"
            onClick={() => setShowChange(true)}
            className="text-amber-500 hover:text-amber-400 transition-colors underline"
          >
            Change
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      <button
        type="button"
        onClick={() => handleSelect('yes')}
        disabled={updateMutation.isPending}
        className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
          isYes
            ? 'bg-amber-500 text-white border border-amber-500'
            : 'border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-400'
        }`}
      >
        Yes, I&apos;m interested
      </button>
      <button
        type="button"
        onClick={() => handleSelect('maybe_later')}
        disabled={updateMutation.isPending}
        className={`rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
          isMaybe
            ? 'bg-slate-700 text-slate-300 border border-slate-600'
            : 'border border-slate-600 text-slate-300 hover:border-amber-500 hover:text-amber-400'
        }`}
      >
        Maybe later
      </button>
    </div>
  );
}

function formatTime(time24) {
  if (!time24) return '';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${minutes} ${ampm}`;
}

export default function AccessWindowManager({ business, currentUserId }) {
  const tier = business?.subscription_tier || 'basic';
  const isBasicTier = tier === 'basic';

  const { windows, isLoading, createWindow, updateWindow, deleteWindow, toggleWindow } = useAccessWindows(business?.id);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingWindow, setEditingWindow] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [windowToDelete, setWindowToDelete] = useState(null);

  const handleCreate = () => {
    setEditingWindow(null);
    setModalOpen(true);
  };

  const handleEdit = (win) => {
    setEditingWindow(win);
    setModalOpen(true);
  };

  const handleSave = async (data) => {
    try {
      if (editingWindow) {
        await updateWindow(editingWindow.id, data);
        toast.success('Access window updated');
      } else {
        await createWindow(data);
        toast.success('Access window created');
      }
      setModalOpen(false);
      setEditingWindow(null);
    } catch (err) {
      console.error('Failed to save access window:', err);
      toast.error('Failed to save access window');
    }
  };

  const handleToggle = async (win) => {
    try {
      await toggleWindow(win.id);
      toast.success(win.is_active ? 'Window paused' : 'Window resumed');
    } catch (err) {
      console.error('Failed to toggle access window:', err);
      toast.error('Failed to update window');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!windowToDelete) return;
    try {
      await deleteWindow(windowToDelete.id);
      toast.success('Access window deleted');
      setDeleteConfirmOpen(false);
      setWindowToDelete(null);
    } catch (err) {
      console.error('Failed to delete access window:', err);
      toast.error('Failed to delete window');
    }
  };

  // Basic tier — single unified Joy Coins + Community Pass interest card
  if (isBasicTier) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-lg mx-auto mt-12 text-center">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Coins className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Joy Coins — Coming Soon</h2>
          <p className="text-slate-400 leading-relaxed mb-6">
            Joy Coins let Community Pass members support local businesses like yours.
            Members visit participating businesses as part of their subscription, and
            you earn revenue from the community pool based on check-ins.
          </p>
          <div className="border-t border-slate-700 pt-6">
            <p className="text-white font-medium mb-4">Interested in participating?</p>
            <CommunityPassInterestToggle business={business} currentUserId={currentUserId} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Joy Coins Toggle Info */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-500" />
            Joy Coin Access Hours
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Set when Community Pass families can visit. You get paid from the monthly pool based on check-ins.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Window
        </Button>
      </div>

      {/* Windows List */}
      {isLoading ? (
        <Card className="bg-slate-900 border-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-400">Loading access windows...</p>
        </Card>
      ) : windows.length === 0 ? (
        <Card className="bg-slate-900 border-slate-800 rounded-xl p-8 text-center">
          <div className="p-4 bg-slate-800 rounded-full inline-block mb-4">
            <Clock className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-100 mb-2">No access windows yet</h3>
          <p className="text-slate-400 mb-4 max-w-sm mx-auto">
            Add your first window to let Community Pass families know when they can visit.
          </p>
          <Button
            onClick={handleCreate}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Window
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {windows.map((win) => (
            <Card
              key={win.id}
              className={`bg-slate-900 border rounded-xl p-4 ${
                win.is_active ? 'border-slate-800' : 'border-slate-800/50 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Status indicator */}
                  <div className={`h-2.5 w-2.5 rounded-full ${win.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`} />

                  <div>
                    {/* Label + paused badge */}
                    <div className="flex items-center gap-2">
                      <h3 className="text-slate-100 font-semibold">
                        {win.label || `${DAY_LABELS[win.day_of_week] || ''} Window`}
                      </h3>
                      {!win.is_active && (
                        <Badge className="bg-slate-700 text-slate-400 text-xs">Paused</Badge>
                      )}
                    </div>

                    {/* Details line */}
                    <p className="text-slate-400 text-sm mt-0.5">
                      {DAY_LABELS[win.day_of_week] || win.day_of_week}
                      {' · '}
                      {formatTime(win.start_time)} – {formatTime(win.end_time)}
                      {' · '}
                      <span className="text-amber-500">{win.coin_cost} {win.coin_cost === 1 ? 'coin' : 'coins'}</span>
                      {win.capacity > 0 && (
                        <>
                          {' · '}
                          {win.capacity} {win.capacity === 1 ? 'person' : 'people'} max
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="default"
                    onClick={() => handleEdit(win)}
                    className="text-slate-400 hover:text-slate-100"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="default" className="text-slate-400 hover:text-slate-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-slate-900 border-slate-700">
                      <DropdownMenuItem
                        onClick={() => handleToggle(win)}
                        className="text-slate-300 focus:bg-slate-700 cursor-pointer"
                      >
                        {win.is_active ? (
                          <><Pause className="h-4 w-4 mr-2" /> Pause Window</>
                        ) : (
                          <><Play className="h-4 w-4 mr-2" /> Resume Window</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => { setWindowToDelete(win); setDeleteConfirmOpen(true); }}
                        className="text-red-500 focus:bg-slate-700 focus:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Window
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pricing Insight */}
      {windows.length > 0 && (
        <Card className="bg-slate-900 border-slate-800 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div>
              <h3 className="text-slate-100 font-semibold text-sm">Pricing Tip</h3>
              <p className="text-slate-400 text-sm mt-1">
                Off-peak hours (1 coin) fill more slots. Peak hours (2-3 coins) earn more per visit.
                Find your sweet spot — you can adjust anytime.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <AccessWindowModal
        open={modalOpen}
        onOpenChange={(open) => { setModalOpen(open); if (!open) setEditingWindow(null); }}
        onSave={handleSave}
        existingWindow={editingWindow}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="bg-slate-900 border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">Delete Access Window</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete &quot;{windowToDelete?.label || 'this window'}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:bg-transparent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
