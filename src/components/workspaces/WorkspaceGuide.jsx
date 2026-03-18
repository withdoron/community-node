/**
 * WorkspaceGuide — reusable inline walkthrough for any workspace type.
 *
 * Activation Protocol Moment 3 (THE-GARDEN.md, DEC-082):
 *   Fork → Setup → Guide (this component).
 *
 * Renders on the Home tab as an inline card — not a modal, not a popup.
 * Walks alongside the user like a companion, not a tutorial.
 *
 * Props:
 *   workspaceType  — key into WORKSPACE_GUIDES (e.g., 'field_service')
 *   onDismiss      — callback when user dismisses the guide
 *   onStepClick    — callback(targetTab) when user clicks a step action
 *   completedSteps — optional array of step IDs that are done
 */

import React, { useState } from 'react';
import { WORKSPACE_GUIDES } from '@/config/workspaceGuides';
import {
  Settings,
  Users,
  FileText,
  ClipboardList,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

const ICON_MAP = {
  Settings,
  Users,
  FileText,
  ClipboardList,
};

export default function WorkspaceGuide({
  workspaceType,
  onDismiss,
  onStepClick,
  completedSteps = [],
}) {
  const guide = WORKSPACE_GUIDES[workspaceType];
  const [collapsed, setCollapsed] = useState(false);

  if (!guide || !guide.steps || guide.steps.length === 0) return null;

  const allComplete =
    completedSteps.length > 0 &&
    guide.steps.every((s) => completedSteps.includes(s.id));

  // Collapsed "all done" state
  if (allComplete && collapsed) {
    return (
      <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-amber-500 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Check className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-sm text-slate-300">
            You're all set! Dismiss this guide or keep it for reference.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="text-xs text-amber-500 hover:text-amber-400"
          >
            Expand
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs text-slate-500 hover:text-slate-400"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 border-l-4 border-l-amber-500 rounded-xl overflow-hidden">
      {/* Welcome header */}
      <div className="px-5 pt-5 pb-3 flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="min-w-0">
            <h2
              className="text-lg text-slate-100 leading-snug"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Getting Started
            </h2>
            <p className="text-sm text-slate-400 mt-1">{guide.welcome}</p>
          </div>
        </div>
        {allComplete && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="text-slate-500 hover:text-slate-400 flex-shrink-0 ml-2 mt-1"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Steps */}
      <div className="px-5 pb-2 space-y-3">
        {guide.steps.map((step, idx) => {
          const Icon = ICON_MAP[step.icon] || Settings;
          const isDone = completedSteps.includes(step.id);

          return (
            <div
              key={step.id}
              className={`flex items-start gap-4 rounded-lg p-4 transition-colors ${
                isDone
                  ? 'bg-slate-800/30'
                  : 'bg-slate-800/50 hover:bg-slate-800/70'
              }`}
            >
              {/* Step number / check */}
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                  isDone
                    ? 'bg-amber-500/20 text-amber-500'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {isDone ? (
                  <Check className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <h3
                    className={`text-sm font-semibold ${
                      isDone ? 'text-slate-400' : 'text-slate-100'
                    }`}
                  >
                    {step.title}
                  </h3>
                </div>
                <p
                  className={`text-sm leading-relaxed ${
                    isDone ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  {step.description}
                </p>
              </div>

              {/* Action button */}
              <button
                type="button"
                onClick={() => onStepClick?.(step.targetTab)}
                className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors min-h-[32px] ${
                  isDone
                    ? 'border border-slate-700 text-slate-400 hover:border-slate-600 hover:bg-transparent'
                    : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                }`}
              >
                {step.actionLabel}
              </button>
            </div>
          );
        })}
      </div>

      {/* Dismiss footer */}
      <div className="px-5 py-3 border-t border-slate-800/50 flex items-center justify-between">
        <p className="text-xs text-slate-600">
          You can bring this back from Settings
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
        >
          Dismiss guide
        </button>
      </div>
    </div>
  );
}
