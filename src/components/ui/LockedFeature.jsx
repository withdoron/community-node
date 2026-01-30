import { Lock, ArrowUpRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

// Community Node tier names: basic, standard, partner
const TIER_DISPLAY_NAMES = {
  basic: "Basic",
  standard: "Standard",
  partner: "Partner",
};

function getTierName(tier) {
  return TIER_DISPLAY_NAMES[tier] || tier || "Standard";
}

export function LockedFeature({
  requiredTier = "standard",
  featureName = "This feature",
  children,
  className,
  showUpgrade = true,
}) {
  return (
    <div className={cn("relative", className)}>
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm rounded-lg border border-slate-700">
        <div className="text-center p-4">
          <Lock className="h-8 w-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-200 mb-1">
            {featureName} requires {getTierName(requiredTier)} tier
          </p>
          {showUpgrade && (
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-black mt-2"
              onClick={() =>
                window.open(
                  `https://hub.locallane.com/pricing?target=${requiredTier}`,
                  "_blank"
                )
              }
            >
              Upgrade Now
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
