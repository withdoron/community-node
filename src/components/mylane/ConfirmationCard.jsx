/**
 * ConfirmationCard — structured preview card for agent write actions.
 * Renders entity data with Confirm / Edit / Cancel buttons.
 * Gold Standard dark theme.
 */
import React, { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';

const ENTITY_DISPLAY = {
  FSClient: 'Client',
  FSProject: 'Project',
  FSDailyLog: 'Daily Log',
  FSMaterialEntry: 'Material',
  FSLaborEntry: 'Labor',
  FSDailyPhoto: 'Photo',
  FSEstimate: 'Estimate',
  FSPayment: 'Payment',
  FSPermit: 'Permit',
  Transaction: 'Transaction',
  TransactionCategory: 'Category',
  RecurringTransaction: 'Recurring Transaction',
  Play: 'Play',
  PlayAssignment: 'Assignment',
  TeamMember: 'Player',
  PMProperty: 'Property',
  PMTenant: 'Tenant',
  PMMaintenanceRequest: 'Maintenance Request',
  PMTransaction: 'Transaction',
  PMListing: 'Listing',
  ServiceFeedback: 'Feedback',
  Recommendation: 'Recommendation',
};

// Fields to hide from display (internal/system fields)
const HIDDEN_FIELDS = new Set([
  'created_by', 'created_via', 'updated_via', 'user_id', 'owner_id',
  'profile_id', 'workspace_id', 'team_id',
]);

function formatFieldName(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\bid\b/gi, 'ID')
    .replace(/\burl\b/gi, 'URL')
    .replace(/^./, (c) => c.toUpperCase());
}

function formatFieldValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    // Heuristic: if it looks like currency (has decimal or is large)
    if (Number.isFinite(value) && (value >= 100 || String(value).includes('.'))) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }
    return String(value);
  }
  return String(value);
}

export default function ConfirmationCard({ entity, action = 'create', data = {}, onConfirm, onEdit, onCancel }) {
  const [acted, setActed] = useState(null); // 'confirm' | 'edit' | 'cancel'

  const displayName = ENTITY_DISPLAY[entity] || entity;
  const badgeText = action === 'update' ? `Update ${displayName}` : `New ${displayName}`;

  const visibleFields = Object.entries(data).filter(
    ([key]) => !HIDDEN_FIELDS.has(key)
  );

  const handleAction = (type, handler) => {
    if (acted) return;
    setActed(type);
    handler?.();
  };

  return (
    <div className="bg-secondary border border-border rounded-xl p-4 max-w-[85%]">
      {/* Badge */}
      <span className="inline-block bg-primary/20 text-primary text-xs font-semibold rounded-full px-3 py-1 mb-3">
        {badgeText}
      </span>

      {/* Fields */}
      {visibleFields.length > 0 ? (
        <div className="space-y-2 mb-4">
          {visibleFields.map(([key, value]) => (
            <div key={key} className="flex gap-3">
              <span className="text-sm text-muted-foreground min-w-[80px] flex-shrink-0">{formatFieldName(key)}</span>
              <span className="text-sm text-foreground font-medium">{formatFieldValue(value)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground/70 mb-4">No details provided.</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleAction('confirm', onConfirm)}
          disabled={!!acted}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold text-sm min-h-[44px] transition-colors ${
            acted === 'confirm'
              ? 'bg-green-500/20 text-green-400 cursor-default'
              : acted
              ? 'bg-surface text-muted-foreground/70 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-hover text-primary-foreground'
          }`}
        >
          <Check className="h-4 w-4" />
          {acted === 'confirm' ? 'Confirmed' : 'Confirm'}
        </button>
        <button
          type="button"
          onClick={() => handleAction('edit', onEdit)}
          disabled={!!acted}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm min-h-[44px] transition-colors ${
            acted === 'edit'
              ? 'bg-primary/20 text-primary-hover cursor-default'
              : acted
              ? 'bg-surface text-muted-foreground/70 cursor-not-allowed'
              : 'bg-surface hover:bg-surface text-foreground'
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => handleAction('cancel', onCancel)}
          disabled={!!acted}
          className={`text-sm px-2 py-2 min-h-[44px] transition-colors ${
            acted === 'cancel'
              ? 'text-red-400 cursor-default'
              : acted
              ? 'text-muted-foreground/50 cursor-not-allowed'
              : 'text-muted-foreground hover:text-foreground-soft'
          }`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
