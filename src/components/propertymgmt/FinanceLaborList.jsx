import React, { useMemo } from 'react';
import { Hammer, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

const WORKER_TYPE_STYLES = {
  handyman: 'bg-amber-500/20 text-amber-400',
  manager: 'bg-purple-500/20 text-purple-400',
  owner: 'bg-slate-600/20 text-slate-300',
  cleaner: 'bg-blue-500/20 text-blue-400',
  landscaper: 'bg-emerald-500/20 text-emerald-400',
  other: 'bg-slate-600/20 text-slate-400',
};

const inputClass =
  'rounded-md bg-slate-800 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 px-3 py-2 text-sm';

export default function FinanceLaborList({
  entries,
  properties,
  groups,
  filters,
  onFiltersChange,
  onEdit,
  onDelete,
}) {
  const {
    workerFilter = '',
    workerTypeFilter = 'all',
    propertyFilter = '',
    dateFrom = '',
    dateTo = '',
  } = filters;

  const groupsById = useMemo(() => {
    const m = {};
    (groups || []).forEach((g) => { m[g.id] = g; });
    return m;
  }, [groups]);

  const propertiesById = useMemo(() => {
    const m = {};
    (properties || []).forEach((p) => { m[p.id] = p; });
    return m;
  }, [properties]);

  const workers = useMemo(() => {
    const set = new Set();
    (entries || []).forEach((e) => e.worker_name && set.add(e.worker_name));
    return Array.from(set).sort();
  }, [entries]);

  const getPropertyLabel = (propertyId) => {
    const p = propertiesById[propertyId];
    if (!p) return '—';
    return `${groupsById[p.group_id]?.name || '—'} — ${p.name}`;
  };

  const filtered = useMemo(() => {
    let list = [...(entries || [])];
    if (workerFilter) list = list.filter((e) => e.worker_name === workerFilter);
    if (workerTypeFilter !== 'all') list = list.filter((e) => e.worker_type === workerTypeFilter);
    if (propertyFilter) list = list.filter((e) => e.property_id === propertyFilter);
    if (dateFrom) list = list.filter((e) => (e.date || '') >= dateFrom);
    if (dateTo) list = list.filter((e) => (e.date || '') <= dateTo);
    list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return list;
  }, [entries, workerFilter, workerTypeFilter, propertyFilter, dateFrom, dateTo]);

  const setFilter = (key, val) => onFiltersChange({ ...filters, [key]: val });

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className={inputClass + ' w-auto min-w-[120px]'}
          value={workerFilter}
          onChange={(e) => setFilter('workerFilter', e.target.value)}
        >
          <option value="">All Workers</option>
          {workers.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <select
          className={inputClass + ' w-auto min-w-[120px]'}
          value={workerTypeFilter}
          onChange={(e) => setFilter('workerTypeFilter', e.target.value)}
        >
          <option value="all">All Types</option>
          <option value="handyman">Handyman</option>
          <option value="manager">Manager</option>
          <option value="owner">Owner</option>
          <option value="cleaner">Cleaner</option>
          <option value="landscaper">Landscaper</option>
          <option value="other">Other</option>
        </select>
        <select
          className={inputClass + ' w-auto min-w-[140px]'}
          value={propertyFilter}
          onChange={(e) => setFilter('propertyFilter', e.target.value)}
        >
          <option value="">All Properties</option>
          {(properties || []).map((p) => (
            <option key={p.id} value={p.id}>
              {getPropertyLabel(p.id)}
            </option>
          ))}
        </select>
        <input
          type="date"
          className={inputClass + ' w-auto'}
          value={dateFrom}
          onChange={(e) => setFilter('dateFrom', e.target.value)}
        />
        <input
          type="date"
          className={inputClass + ' w-auto'}
          value={dateTo}
          onChange={(e) => setFilter('dateTo', e.target.value)}
        />
      </div>

      <p className="text-xs text-slate-500">
        {filtered.length} of {(entries || []).length} entries
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Hammer className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">No labor entries match your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const typeStyle = WORKER_TYPE_STYLES[entry.worker_type] || WORKER_TYPE_STYLES.other;
            return (
              <div
                key={entry.id}
                className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500">{formatDate(entry.date)}</span>
                    <span className="font-semibold text-slate-100">{entry.worker_name}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-full font-medium capitalize ${typeStyle}`}
                    >
                      {entry.worker_type || 'other'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm">
                    <span className="text-slate-300">
                      {new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(entry.hours || 0)}h
                      <span className="text-slate-500 mx-1">×</span>
                      {formatCurrency(entry.hourly_rate)}
                    </span>
                    <span className="font-bold text-amber-400">{formatCurrency(entry.total)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {getPropertyLabel(entry.property_id)}
                  </p>
                  {entry.description && (
                    <p className="text-xs text-slate-400 mt-1">{entry.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(entry)}
                    className="h-8 w-8 text-slate-400 hover:text-amber-500 hover:bg-slate-800"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(entry)}
                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-slate-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
