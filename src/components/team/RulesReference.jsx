import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, BookOpen, ExternalLink } from 'lucide-react';
import { RULES_DATA } from '@/config/rulesData';

// Highlight key numbers and terms in amber
function highlightRule(text) {
  // Match numbers with units (e.g., "7 yards", "5 yards", "24-minute", "10 yards")
  // and key terms (rusher, line of scrimmage, no run zones, safety, sack, interception)
  const parts = text.split(
    /(\d+(?:-\d+)?\s*(?:yards?|minutes?|seconds?|players?|points?)|rusher|line of scrimmage|no run zones?|safety|sack|interception|flag guarding|unsportsmanlike conduct|automatic first down)/gi
  );
  return parts.map((part, i) => {
    if (
      /^\d+(?:-\d+)?\s*(?:yards?|minutes?|seconds?|players?|points?)$/i.test(part) ||
      /^(rusher|line of scrimmage|no run zones?|safety|sack|interception|flag guarding|unsportsmanlike conduct|automatic first down)$/i.test(part)
    ) {
      return (
        <span key={i} className="text-amber-500 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

function RulesList({ rules }) {
  return (
    <ul className="space-y-2 pl-1">
      {rules.map((rule, i) => (
        <li key={i} className="flex gap-2 text-sm text-slate-300">
          <span className="text-amber-500 mt-0.5 shrink-0">&bull;</span>
          <span>{highlightRule(rule)}</span>
        </li>
      ))}
    </ul>
  );
}

function RulesSection({ section }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-slate-800 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-900 hover:bg-slate-800/80 transition-colors min-h-[44px]"
      >
        <span className="text-slate-100 font-semibold text-sm">{section.title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-amber-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-amber-500 shrink-0" />
        )}
      </button>
      {open && (
        <div className="px-4 py-3 bg-slate-950 space-y-4">
          {section.rules && <RulesList rules={section.rules} />}
          {section.subsections &&
            section.subsections.map((sub, i) => (
              <div key={i}>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  {sub.title}
                </h4>
                <RulesList rules={sub.rules} />
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default function RulesReference({ onClose, sport = 'flag_football', format = '5v5' }) {
  const key = `${sport}_${format}`;
  const data = RULES_DATA[key];

  if (!data) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400">No rules available for this sport/format.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 text-amber-500 hover:text-amber-400 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-amber-500" />
          <h1 className="text-slate-100 font-bold text-lg">NFL FLAG 5v5 Rules</h1>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="h-5 w-5 text-slate-400" />
        </button>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <p className="text-slate-400 text-sm">
          Quick reference for coaches and parents. Tap a section to expand.
        </p>

        {data.sections.map((section, i) => (
          <RulesSection key={i} section={section} />
        ))}

        {/* External links */}
        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Resources</h3>
          <div className="space-y-2">
            {data.links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400 transition-colors py-1"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                {link.label}
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 pb-8 text-center">
          <p className="text-xs text-slate-500">
            Source:{' '}
            <a
              href={data.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-500/70 hover:text-amber-500"
            >
              {data.source}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
