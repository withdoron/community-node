/**
 * Universal Entity Renderer — Phase 1 (coded function)
 * Takes raw records from agentScopedQuery and returns Gold Standard styled React elements.
 * Eliminates the need for per-entity coded components.
 * Phase 2 replaces this with a Renderer Agent.
 *
 * @param {Object} params
 * @param {Array} params.data - Array of entity records
 * @param {string} params.entity - Entity type name (e.g., "FSClient", "Transaction")
 * @param {string} params.workspace - Workspace type
 * @param {number} params.count - Number of records (optional, derived from data.length)
 * @param {string} params.displayHint - Optional: "list", "detail", "table", "summary"
 * @param {Function} params.onRecordTap - Optional: callback when a record card is tapped
 * @returns {React.Element} Gold Standard styled view
 */
import React from 'react';

// ─── Field Type Detection ────────────────────────

function detectFieldType(key, value) {
  if (value == null || value === '') return 'empty';
  const k = key.toLowerCase();

  if (k === 'id' || k.endsWith('_id') || k === 'user_id' || k === 'profile_id' || k === 'workspace_id' || k === 'team_id') return 'id';
  if (k.includes('phone') || k.includes('tel')) return 'phone';
  if (k.includes('email')) return 'email';
  if (k.includes('address') || k === 'street' || k === 'city' || k === 'state' || k === 'zip') return 'address';
  if (k.includes('amount') || k.includes('price') || k.includes('cost') || k.includes('rate') || k.includes('total') || k.includes('rent') || k.includes('balance') || k.includes('payment') || k.includes('fee') || k === 'enough_number') return 'currency';
  if (k.includes('date') || k.endsWith('_at')) return 'date';
  if (k === 'status' || k.includes('status')) return 'status';
  if (k.includes('url') || k.includes('link') || k.includes('website')) return 'url';
  if (typeof value === 'boolean' || k.startsWith('is_') || k.startsWith('has_')) return 'boolean';
  if (typeof value === 'object') return 'json';
  return 'text';
}

// ─── Relative Time ───────────────────────────────

function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 0) return 'Today';
    if (absDays === 1) return 'Tomorrow';
    return `In ${absDays} days`;
  }
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return date.toLocaleDateString();
}

// ─── Title Detection ─────────────────────────────

const ENTITY_TITLE_FIELDS = {
  FSClient: ['name'],
  FSProject: ['name', 'title'],
  FSEstimate: ['title', 'name'],
  FSDocument: ['title', 'name'],
  FSDailyLog: ['date', 'description'],
  FSWorker: ['name', 'display_name'],
  FSPermit: ['permit_type', 'title'],
  FSPayment: ['description', 'note'],
  FSMaterialEntry: ['description', 'material'],
  FSLaborEntry: ['description', 'worker_name'],
  FSChangeOrder: ['title', 'description'],
  FSDocumentTemplate: ['title', 'name'],
  Transaction: ['description'],
  RecurringTransaction: ['description'],
  Debt: ['name'],
  DebtPayment: ['description', 'note'],
  Play: ['name'],
  PlayAssignment: ['position', 'role'],
  PlayerStats: ['stat_type', 'description'],
  TeamMember: ['jersey_name', 'name', 'display_name'],
  TeamEvent: ['title', 'name'],
  TeamMessage: ['content'],
  QuizAttempt: ['play_name', 'description'],
  PMProperty: ['name', 'unit_label'],
  PMPropertyGroup: ['name'],
  PMOwner: ['name'],
  PMExpense: ['description'],
  PMMaintenanceRequest: ['title', 'description'],
  PMSettlement: ['month'],
  PMListing: ['title'],
  PMGuest: ['name'],
  PMTenant: ['name'],
  PMWorkspaceMember: ['name', 'email'],
  Business: ['name'],
  Event: ['title', 'name'],
  ServiceFeedback: ['what_happened'],
};

function getRecordTitle(record, entity) {
  const titleFields = ENTITY_TITLE_FIELDS[entity] || ['name', 'title', 'description'];
  for (const field of titleFields) {
    if (record[field]) return String(record[field]);
  }
  return entity.replace(/^(FS|PM)/, '').replace(/([A-Z])/g, ' $1').trim() + ' Record';
}

function getRecordTitleKey(record, entity) {
  const titleFields = ENTITY_TITLE_FIELDS[entity] || ['name', 'title', 'description'];
  for (const field of titleFields) {
    if (record[field]) return field;
  }
  return null;
}

// ─── Status Colors ───────────────────────────────

const STATUS_COLORS = {
  active: 'bg-emerald-400/10 text-emerald-400',
  completed: 'bg-emerald-400/10 text-emerald-400',
  signed: 'bg-emerald-400/10 text-emerald-400',
  paid: 'bg-emerald-400/10 text-emerald-400',
  occupied: 'bg-emerald-400/10 text-emerald-400',
  resolved: 'bg-emerald-400/10 text-emerald-400',
  accepted: 'bg-emerald-400/10 text-emerald-400',
  pending: 'bg-amber-500/10 text-amber-500',
  draft: 'bg-amber-500/10 text-amber-500',
  awaiting_signature: 'bg-amber-500/10 text-amber-500',
  sent: 'bg-amber-500/10 text-amber-500',
  vacant: 'bg-amber-500/10 text-amber-500',
  open: 'bg-amber-500/10 text-amber-500',
  in_progress: 'bg-amber-500/10 text-amber-500',
  new: 'bg-amber-500/10 text-amber-500',
  inactive: 'bg-red-400/10 text-red-400',
  cancelled: 'bg-red-400/10 text-red-400',
  overdue: 'bg-red-400/10 text-red-400',
  declined: 'bg-red-400/10 text-red-400',
  approved: 'bg-emerald-400/10 text-emerald-400',
  closed: 'bg-slate-700/50 text-slate-500',
  expired: 'bg-slate-700/50 text-slate-500',
  paused: 'bg-slate-700/50 text-slate-500',
  archived: 'bg-slate-700/50 text-slate-500',
  on_hold: 'bg-amber-500/10 text-amber-500',
  rejected: 'bg-red-400/10 text-red-400',
};

// ─── Currency Formatter ──────────────────────────

const fmtUsd = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

// ─── Field Renderer ──────────────────────────────

function renderField(key, value, type) {
  const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const labelEl = <span className="text-amber-500/80 text-xs w-24 shrink-0 truncate">{label}</span>;

  switch (type) {
    case 'phone':
      return (
        <div className="flex items-center gap-2">
          {labelEl}
          <a href={`tel:${value}`} className="text-slate-300 hover:text-amber-400 transition-colors text-sm">{value}</a>
        </div>
      );
    case 'email':
      return (
        <div className="flex items-center gap-2">
          {labelEl}
          <a href={`mailto:${value}`} className="text-slate-300 hover:text-amber-400 transition-colors text-sm truncate">{value}</a>
        </div>
      );
    case 'currency': {
      const num = typeof value === 'number' ? value : parseFloat(value);
      if (isNaN(num)) return null;
      return (
        <div className="flex items-center gap-2">
          {labelEl}
          <span className={`text-sm font-medium ${num < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmtUsd(num)}</span>
        </div>
      );
    }
    case 'date': {
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      return (
        <div className="flex items-center gap-2">
          {labelEl}
          <span className="text-slate-400 text-sm">{getRelativeTime(d)}</span>
        </div>
      );
    }
    case 'status': {
      const color = STATUS_COLORS[String(value).toLowerCase()] || 'bg-slate-700 text-slate-300';
      return (
        <div className="flex items-center gap-2">
          {labelEl}
          <span className={`${color} rounded-full px-2 py-0.5 text-xs font-medium`}>{String(value).replace(/_/g, ' ')}</span>
        </div>
      );
    }
    case 'boolean':
      return (
        <div className="flex items-center gap-2">
          {labelEl}
          <span className={`text-sm ${value ? 'text-emerald-400' : 'text-slate-500'}`}>{value ? 'Yes' : 'No'}</span>
        </div>
      );
    case 'url':
      return (
        <div className="flex items-center gap-2">
          {labelEl}
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 text-sm truncate underline">{String(value).replace(/^https?:\/\//, '')}</a>
        </div>
      );
    case 'address':
    case 'text':
      return (
        <div className="flex items-start gap-2">
          {labelEl}
          <span className="text-slate-300 text-sm">{String(value)}</span>
        </div>
      );
    case 'id':
    case 'json':
    case 'empty':
    default:
      return null;
  }
}

// ─── Display Mode Selection ──────────────────────

function chooseDisplayMode(count, displayHint) {
  if (displayHint) return displayHint;
  if (count === 0) return 'empty';
  if (count === 1) return 'detail';
  return 'list';
}

// ─── Summary Header ──────────────────────────────

function renderSummaryHeader(entity, count) {
  const friendlyName = entity.replace(/^(FS|PM)/, '').replace(/([A-Z])/g, ' $1').trim();
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-white">{friendlyName}s</h3>
      <span className="text-amber-500 text-sm font-medium">{count} record{count !== 1 ? 's' : ''}</span>
    </div>
  );
}

// ─── Card List Mode ──────────────────────────────

function renderCardList(data, entity, onRecordTap) {
  return (
    <div>
      {renderSummaryHeader(entity, data.length)}
      <div className="space-y-3">
        {data.map((record, i) => {
          const title = getRecordTitle(record, entity);
          const titleKey = getRecordTitleKey(record, entity);
          const fields = Object.entries(record)
            .map(([key, value]) => ({ key, value, type: detectFieldType(key, value) }))
            .filter((f) => f.type !== 'id' && f.type !== 'json' && f.type !== 'empty' && f.key !== titleKey);

          return (
            <div
              key={record.id || i}
              role={onRecordTap ? 'button' : undefined}
              tabIndex={onRecordTap ? 0 : undefined}
              onClick={() => onRecordTap?.(record)}
              onKeyDown={onRecordTap ? (e) => { if (e.key === 'Enter' || e.key === ' ') onRecordTap(record); } : undefined}
              className={`bg-slate-900 border border-slate-800 rounded-xl p-4 transition-colors ${onRecordTap ? 'cursor-pointer hover:border-amber-500/30' : ''}`}
            >
              <h3 className="text-white font-semibold text-base truncate">{title}</h3>
              <div className="mt-2 space-y-1.5">
                {fields.slice(0, 6).map((f) => {
                  const rendered = renderField(f.key, f.value, f.type);
                  return rendered ? <div key={f.key}>{rendered}</div> : null;
                })}
                {fields.length > 6 && (
                  <p className="text-slate-500 text-xs mt-2">+ {fields.length - 6} more fields</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detail Mode (Single Record) ─────────────────

function renderDetail(record, entity) {
  const title = getRecordTitle(record, entity);
  const fields = Object.entries(record)
    .map(([key, value]) => ({ key, value, type: detectFieldType(key, value) }))
    .filter((f) => f.type !== 'id' && f.type !== 'json' && f.type !== 'empty');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h2 className="text-white font-bold text-2xl mb-4">{title}</h2>
      <div className="space-y-2">
        {fields.map((f) => {
          const rendered = renderField(f.key, f.value, f.type);
          return rendered ? <div key={f.key}>{rendered}</div> : null;
        })}
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────

function renderEmpty(entity) {
  const friendlyName = entity.replace(/^(FS|PM)/, '').replace(/([A-Z])/g, ' $1').trim();
  return (
    <div className="text-center py-12">
      <p className="text-slate-500 text-lg">No {friendlyName.toLowerCase()} records yet.</p>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────

export function renderEntityView({ data, entity, workspace, count, displayHint, onRecordTap }) {
  const records = Array.isArray(data) ? data : [];
  const total = count ?? records.length;
  const mode = chooseDisplayMode(total, displayHint);

  switch (mode) {
    case 'empty':
      return renderEmpty(entity);
    case 'detail':
      return records[0] ? renderDetail(records[0], entity) : renderEmpty(entity);
    case 'summary':
    case 'list':
    case 'table':
    default:
      return renderCardList(records, entity, onRecordTap);
  }
}