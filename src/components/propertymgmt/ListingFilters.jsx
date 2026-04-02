import React from 'react';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'rented', label: 'Rented' },
];

const TYPE_PILLS = [
  { key: 'all', label: 'All Types' },
  { key: 'long_term', label: 'Long-Term' },
  { key: 'short_term', label: 'Short-Term' },
];

export default function ListingFilters({
  activeStatus,
  statusCounts,
  activeType,
  onStatusChange,
  onTypeChange,
}) {
  return (
    <div className="space-y-3">
      {/* Status tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {STATUS_TABS.map((tab) => {
          const count = statusCounts[tab.key] ?? 0;
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onStatusChange(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors min-h-[36px] ${
                isActive
                  ? 'bg-primary text-primary-foreground font-bold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? 'bg-black/20 text-primary-foreground'
                    : 'bg-secondary text-muted-foreground/70'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Type pills */}
      <div className="flex gap-2">
        {TYPE_PILLS.map((pill) => {
          const isActive = activeType === pill.key;
          return (
            <button
              key={pill.key}
              type="button"
              onClick={() => onTypeChange(pill.key)}
              className={`px-3 py-1 text-xs rounded-full transition-colors min-h-[28px] ${
                isActive
                  ? 'bg-surface text-foreground font-medium'
                  : 'text-muted-foreground/70 hover:text-foreground-soft hover:bg-secondary/50'
              }`}
            >
              {pill.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
