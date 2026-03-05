import React from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import { OFFENSE_ROUTES } from '@/config/flagFootball';

/**
 * Route assignment panel for a single position.
 * Shows route preset grid, custom draw button, clear, and assignment text.
 */
export default function RouteSelector({
  position, // { id, label, shortLabel, color }
  currentRoute, // { movementType, routePath } or null
  onSelectPreset, // (routeId: string) => void
  onDrawCustom, // () => void
  onClearRoute, // () => void
  onAssignmentTextChange, // (text: string) => void
  assignmentText = '',
  onClose, // () => void — dismiss the panel
}) {
  const currentMovement = currentRoute?.movementType || '';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full flex-shrink-0"
            style={{ backgroundColor: position.color }}
          />
          <span className="font-semibold text-white">{position.label}</span>
          <span className="text-slate-400 text-sm">{position.shortLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {currentMovement && (
            <button
              type="button"
              onClick={onClearRoute}
              className="text-slate-400 hover:text-red-400 p-1.5 rounded-lg transition-colors"
              title="Clear route"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Route preset grid */}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Route</p>
          <div className="grid grid-cols-3 gap-2">
            {OFFENSE_ROUTES.filter((r) => r.id !== 'custom').map((route) => {
              const isActive = currentMovement === route.id;
              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => onSelectPreset(route.id)}
                  className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
                      : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {route.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Draw Custom button */}
        <button
          type="button"
          onClick={onDrawCustom}
          className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors min-h-[44px] flex items-center justify-center gap-2 ${
            currentMovement === 'custom'
              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50'
              : 'bg-transparent text-slate-300 border border-slate-600 hover:border-amber-500/50 hover:text-amber-500'
          }`}
        >
          <Pencil className="h-4 w-4" />
          Draw Custom Route
        </button>

        {/* Assignment text */}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Assignment</p>
          <textarea
            value={assignmentText}
            onChange={(e) => onAssignmentTextChange?.(e.target.value)}
            placeholder="What does this player do?"
            rows={2}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none resize-none min-h-[60px]"
          />
        </div>
      </div>
    </div>
  );
}
