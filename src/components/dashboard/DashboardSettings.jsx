import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Settings, Trash2 } from 'lucide-react';
import BusinessSettings from '@/components/dashboard/BusinessSettings';

/**
 * Settings tab for the business workspace dashboard.
 * Renders BusinessSettings plus owner-only delete card.
 * Used by BusinessDashboard via workspace tab config.
 */
export default function DashboardSettings({
  business,
  currentUserId,
  isOwner,
  onDeleteClick,
  deleteMutation,
}) {
  return (
    <div className="space-y-6">
      <BusinessSettings business={business} currentUserId={currentUserId} />
      {isOwner && (
        <Card className="p-6 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-slate-400" />
              <h2 className="text-xl font-bold text-slate-100">Business settings</h2>
            </div>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Permanently remove this business and its data. This action uses a soft delete (business is marked deleted).
          </p>
          <Button
            variant="outline"
            size="sm"
            className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
            onClick={onDeleteClick}
            disabled={deleteMutation?.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Business
          </Button>
        </Card>
      )}
    </div>
  );
}
