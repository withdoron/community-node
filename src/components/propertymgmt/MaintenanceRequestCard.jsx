import React, { useState } from 'react';
import { Pencil, Trash2, PlayCircle, CheckCircle, Eye, Clock, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MaintenancePhotoGrid from './MaintenancePhotoGrid';

const PRIORITY_STYLES = {
  emergency: 'bg-red-500/20 text-red-400 border border-red-500/30',
  high: 'bg-primary/20 text-primary-hover border border-primary/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  low: 'bg-surface text-muted-foreground',
};

const STATUS_STYLES = {
  submitted: 'bg-blue-500/20 text-blue-400',
  triaged: 'bg-purple-500/20 text-purple-400',
  assigned: 'bg-primary/20 text-primary-hover',
  in_progress: 'bg-sky-500/20 text-sky-400',
  complete: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-surface text-muted-foreground/70',
};

const PRIORITY_LABELS = { emergency: 'Emergency', high: 'High', medium: 'Medium', low: 'Low' };
const STATUS_LABELS = {
  submitted: 'Submitted',
  triaged: 'Triaged',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  complete: 'Complete',
  cancelled: 'Cancelled',
};

function formatCurrency(n) {
  if (n == null || n === '') return null;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(n));
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const safeParseJSON = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
};

export default function MaintenanceRequestCard({
  request,
  propertyLabel,
  onEdit,
  onDelete,
  onStatusChange,
  onMarkComplete,
}) {
  const [descExpanded, setDescExpanded] = useState(false);
  const desc = (request.description || '').trim();
  const hasLongDesc = desc.length > 120;
  const showDesc = descExpanded ? desc : desc.slice(0, 120) + (hasLongDesc ? '…' : '');

  const priorityStyle = PRIORITY_STYLES[request.priority] || PRIORITY_STYLES.low;
  const statusStyle = STATUS_STYLES[request.status] || STATUS_STYLES.submitted;

  const photos = safeParseJSON(request.photos);
  const completionPhotos = safeParseJSON(request.completion_photos);
  const photoCount = photos.length + completionPhotos.length;

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground flex-1 min-w-0">
          {request.title}
        </h3>
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <span className={`px-2 py-0.5 text-xs rounded-full border ${priorityStyle}`}>
            {PRIORITY_LABELS[request.priority] || request.priority}
          </span>
          <span className={`px-2 py-0.5 text-xs rounded-full ${statusStyle}`}>
            {STATUS_LABELS[request.status] || request.status}
          </span>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>{propertyLabel}</span>
        {request.reported_date && <span>{formatDate(request.reported_date)}</span>}
        {request.assigned_to && (
          <span className="text-primary-hover">→ {request.assigned_to}</span>
        )}
        {photoCount > 0 && (
          <span className="flex items-center gap-1 text-muted-foreground/70">
            <Camera className="w-3 h-3" /> {photoCount}
          </span>
        )}
      </div>

      {/* Description */}
      {desc && (
        <div className="text-sm text-foreground-soft">
          <p>{showDesc}</p>
          {hasLongDesc && (
            <button
              type="button"
              onClick={() => setDescExpanded((e) => !e)}
              className="text-primary hover:text-primary-hover text-sm mt-1"
            >
              {descExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Photos */}
      <MaintenancePhotoGrid
        photos={request.photos}
        completionPhotos={request.completion_photos}
        compact
      />

      {/* Actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border">
        <div className="flex items-center gap-3 text-sm">
          {request.estimated_cost != null && request.estimated_cost !== '' && (
            <span className="text-muted-foreground">
              Est: {formatCurrency(request.estimated_cost)}
            </span>
          )}
          {request.actual_cost != null && request.actual_cost !== '' && (
            <span className="text-primary font-bold">
              Actual: {formatCurrency(request.actual_cost)}
            </span>
          )}
          {request.status === 'complete' && request.completed_date && (
            <span className="text-muted-foreground/70">Done {formatDate(request.completed_date)}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Status progression buttons */}
          {request.status === 'submitted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(request, 'triaged')}
              className="border-border text-foreground-soft hover:bg-secondary hover:text-foreground gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /> Triage
            </Button>
          )}
          {request.status === 'triaged' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(request, 'assigned')}
              className="border-border text-foreground-soft hover:bg-secondary hover:text-foreground gap-1.5"
            >
              Assign
            </Button>
          )}
          {(request.status === 'assigned' || request.status === 'triaged') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(request, 'in_progress')}
              className="border-border text-foreground-soft hover:bg-secondary hover:text-foreground gap-1.5"
            >
              <PlayCircle className="w-3.5 h-3.5" /> Start
            </Button>
          )}
          {request.status === 'in_progress' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkComplete(request)}
              className="border-border text-foreground-soft hover:bg-secondary hover:text-foreground gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Complete
            </Button>
          )}
          {(request.status === 'complete' || request.status === 'cancelled') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(request, 'submitted')}
              className="border-border text-foreground-soft hover:bg-secondary hover:text-foreground gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" /> Reopen
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(request)}
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-secondary"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(request)}
            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-secondary"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
