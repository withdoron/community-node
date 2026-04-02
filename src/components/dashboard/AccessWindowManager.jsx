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

  const handleSelect = () => {
    updateMutation.mutate('yes');
  };

  const isYes = value === 'yes';

  if (isYes && !showChange) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-sm text-primary-hover">Great! We&apos;ll reach out when Community Pass is ready.</p>
        <p className="text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => setShowChange(true)}
            className="text-primary hover:text-primary-hover transition-colors underline"
          >
            Change
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={handleSelect}
        disabled={updateMutation.isPending}
        className={`transition-colors rounded-lg px-4 py-2.5 text-sm ${
          isYes
            ? 'bg-primary text-foreground border border-primary'
            : 'border border-border text-foreground-soft hover:border-primary hover:text-primary-hover'
        }`}
      >
        Yes, I&apos;m interested
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
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Coins className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-3">Joy Coins — Coming Soon</h2>
          <p className="text-muted-foreground leading-relaxed mb-5">
            Joy Coins let Community Pass members support local businesses like yours.
            Members visit participating businesses as part of their subscription, and
            you earn revenue from the community pool based on check-ins.
          </p>
          <div className="border-t border-border pt-4">
            <p className="text-foreground-soft text-sm font-medium mb-3">Interested in participating?</p>
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
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Joy Coin Access Hours
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Set when Community Pass families can visit. You get paid from the monthly pool based on check-ins.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Window
        </Button>
      </div>

      {/* Windows List */}
      {isLoading ? (
        <Card className="bg-card border-border rounded-xl p-8 text-center">
          <p className="text-muted-foreground">Loading access windows...</p>
        </Card>
      ) : windows.length === 0 ? (
        <Card className="bg-card border-border rounded-xl p-8 text-center">
          <div className="p-4 bg-secondary rounded-full inline-block mb-4">
            <Clock className="h-8 w-8 text-muted-foreground/70" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No access windows yet</h3>
          <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
            Add your first window to let Community Pass families know when they can visit.
          </p>
          <Button
            onClick={handleCreate}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold"
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
              className={`bg-card border rounded-xl p-4 ${
                win.is_active ? 'border-border' : 'border-border/50 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Status indicator */}
                  <div className={`h-2.5 w-2.5 rounded-full ${win.is_active ? 'bg-emerald-500' : 'bg-surface'}`} />

                  <div>
                    {/* Label + paused badge */}
                    <div className="flex items-center gap-2">
                      <h3 className="text-foreground font-semibold">
                        {win.label || `${DAY_LABELS[win.day_of_week] || ''} Window`}
                      </h3>
                      {!win.is_active && (
                        <Badge className="bg-surface text-muted-foreground text-xs">Paused</Badge>
                      )}
                    </div>

                    {/* Details line */}
                    <p className="text-muted-foreground text-sm mt-0.5">
                      {DAY_LABELS[win.day_of_week] || win.day_of_week}
                      {' · '}
                      {formatTime(win.start_time)} – {formatTime(win.end_time)}
                      {' · '}
                      <span className="text-primary">{win.coin_cost} {win.coin_cost === 1 ? 'coin' : 'coins'}</span>
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
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="default" className="text-muted-foreground hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-card border-border">
                      <DropdownMenuItem
                        onClick={() => handleToggle(win)}
                        className="text-foreground-soft focus:bg-surface cursor-pointer"
                      >
                        {win.is_active ? (
                          <><Pause className="h-4 w-4 mr-2" /> Pause Window</>
                        ) : (
                          <><Play className="h-4 w-4 mr-2" /> Resume Window</>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => { setWindowToDelete(win); setDeleteConfirmOpen(true); }}
                        className="text-red-500 focus:bg-surface focus:text-red-400 cursor-pointer"
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
        <Card className="bg-card border-border rounded-xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div>
              <h3 className="text-foreground font-semibold text-sm">Pricing Tip</h3>
              <p className="text-muted-foreground text-sm mt-1">
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
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Access Window</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete &quot;{windowToDelete?.label || 'this window'}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-foreground-soft hover:bg-secondary hover:bg-transparent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-500 text-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
