import React from 'react';

const STATUSES = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'triaged', label: 'Triaged' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'cancelled', label: 'Cancelled' },
];

const PRIORITIES = [
  { value: 'all', label: 'All' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export default function MaintenanceFilters({
  activeStatus,
  statusCounts,
  selectedPriority,
  onStatusChange,
  onPriorityChange,
}) {
  return (
    <div className="space-y-3">
      {/* Status sub-tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-4 overflow-x-auto pb-px" aria-label="Status tabs">
          {STATUSES.map((tab) => {
            const isActive = activeStatus === tab.value;
            const count = statusCounts?.[tab.value] ?? 0;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => onStatusChange(tab.value)}
                className={`shrink-0 flex items-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-primary/20 text-primary-hover' : 'bg-secondary text-muted-foreground/70'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Priority filter pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
        <span className="text-xs text-muted-foreground/70 shrink-0">Priority:</span>
        {PRIORITIES.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onPriorityChange(p.value)}
            className={`shrink-0 px-3 py-1.5 text-sm rounded-full font-medium transition-colors ${
              selectedPriority === p.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground-soft hover:bg-surface'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
