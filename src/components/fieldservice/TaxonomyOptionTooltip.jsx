/**
 * TaxonomyOptionTooltip — info-icon trigger with category preview.
 *
 * Rendered next to each option label inside the estimate Trade Taxonomy
 * Select. Hovering or focusing the icon reveals a tooltip listing the
 * preset's categories. For the Custom preset, the tooltip also surfaces
 * a "Edit in Settings →" link (or "Create custom trades →" when empty)
 * that opens the app in a new tab — preserving the user's in-progress
 * estimate state in the original tab.
 *
 * Why an info icon instead of wrapping the SelectItem itself:
 * Radix Select + Radix Tooltip both manage focus and use Portals; nesting
 * a Tooltip around a SelectItem causes keyboard nav conflicts. An icon
 * inside the item keeps SelectItem as the click target for selection and
 * the icon as the separate hover/focus target for the tooltip. Mobile
 * users tap the icon (Radix Tooltip's `delayDuration={0}` on the icon
 * also fires on touch). Click on the icon stopPropagation()s to prevent
 * accidentally selecting the option.
 *
 * Deep-link to Settings → Trade Categories uses a localStorage signal
 * (`fs-settings-target` = 'trade-categories'). The new tab opens the
 * app root; on mount, FieldServiceSettings reads the flag and scrolls
 * to the Trade Categories section anchor (`#trade-categories`). The
 * cross-cockpit auto-navigation through Businesses → Desk → Settings
 * is NOT implemented today — the user navigates manually in the new
 * tab; the scroll fires once they land in Settings. This is the
 * "lightweight URL handling" Mycelia specced — don't over-engineer.
 */
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

const SETTINGS_TARGET_KEY = 'fs-settings-target';
const SETTINGS_TARGET_VALUE = 'trade-categories';

function setSettingsTargetFlag() {
  try { localStorage.setItem(SETTINGS_TARGET_KEY, SETTINGS_TARGET_VALUE); } catch {}
}

export default function TaxonomyOptionTooltip({ preset, isCustom = false }) {
  const categories = Array.isArray(preset?.categories) ? preset.categories : [];
  const hasCategories = categories.length > 0;
  const showEmptyCustom = isCustom && !hasCategories;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center w-5 h-5 rounded-sm text-muted-foreground hover:text-primary focus-visible:text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
            aria-label={`Show ${preset?.name || 'taxonomy'} categories`}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={8}
          className="bg-card border border-border text-foreground p-3 max-w-xs shadow-lg"
        >
          {showEmptyCustom ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">No custom trades defined yet</p>
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={setSettingsTargetFlag}
                className="inline-block text-xs text-primary hover:text-primary-hover underline"
              >
                Create custom trades →
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {preset?.name || 'Categories'} ({categories.length})
              </p>
              <div className="max-h-64 overflow-y-auto space-y-0.5 pr-1">
                {categories.map((cat) => (
                  <div key={cat.id || cat.name} className="text-xs text-foreground-soft">
                    {cat.name}
                  </div>
                ))}
              </div>
              {isCustom && (
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={setSettingsTargetFlag}
                  className="block pt-2 mt-1 border-t border-border text-xs text-primary hover:text-primary-hover"
                >
                  Edit in Settings →
                </a>
              )}
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
