import React, { useState } from 'react';
import { Pencil, Trash2, PlayCircle, CheckCircle, Eye, Clock, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MaintenancePhotoGrid from './MaintenancePhotoGrid';

const PRIORITY_STYLES = {
  emergency: 'bg-red-500/20 text-red-400 border border-red-500/30',
  high: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  low: 'bg-slate-700 text-slate-400',
};

const STATUS_STYLES = {
  submitted: 'bg-blue-500/20 text-blue-400',
  triaged: 'bg-purple-500/20 text-purple-400',
  assigned: 'bg-amber-500/20 text-amber-400',
  in_progress: 'bg-sky-500/20 text-sky-400',
  complete: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-slate-700 text-slate-500',
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
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-100 flex-1 min-w-0">
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
        <span>{propertyLabel}</span>
        {request.reported_date && <span>{formatDate(request.reported_date)}</span>}
        {request.assigned_to && (
          <span className="text-amber-400">→ {request.assigned_to}</span>
        )}
        {photoCount > 0 && (
          <span className="flex items-center gap-1 text-slate-500">
            <Camera className="w-3 h-3" /> {photoCount}
          </span>
        )}
      </div>

      {/* Description */}
      {desc && (
        <div className="text-sm text-slate-300">
          <p>{showDesc}</p>
          {hasLongDesc && (
            <button
              type="button"
              onClick={() => setDescExpanded((e) => !e)}
              className="text-amber-500 hover:text-amber-400 text-sm mt-1"
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
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800">
        <div className="flex items-center gap-3 text-sm">
          {request.estimated_cost != null && request.estimated_cost !== '' && (
            <span className="text-slate-400">
              Est: {formatCurrency(request.estimated_cost)}
            </span>
          )}
          {request.actual_cost != null && request.actual_cost !== '' && (
            <span className="text-amber-500 font-bold">
              Actual: {formatCurrency(request.actual_cost)}
            </span>
          )}
          {request.status === 'complete' && request.completed_date && (
            <span className="text-slate-500">Done {formatDate(request.completed_date)}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Status progression buttons */}
          {request.status === 'submitted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(request, 'triaged')}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100 gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /> Triage
            </Button>
          )}
          {request.status === 'triaged' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(request, 'assigned')}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100 gap-1.5"
            >
              Assign
            </Button>
          )}
          {(request.status === 'assigned' || request.status === 'triaged') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(request, 'in_progress')}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100 gap-1.5"
            >
              <PlayCircle className="w-3.5 h-3.5" /> Start
            </Button>
          )}
          {request.status === 'in_progress' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMarkComplete(request)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100 gap-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Complete
            </Button>
          )}
          {(request.status === 'complete' || request.status === 'cancelled') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onStatusChange(request, 'submitted')}
              className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100 gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" /> Reopen
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(request)}
            className="h-8 w-8 text-slate-400 hover:text-amber-500 hover:bg-slate-800"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(request)}
            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-slate-800"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
