// Called during workspace creation to seed defaults.
// Wire into workspace onboarding flow when ready.
// See: Admin > Workspaces > [Type] for managing these defaults.

/**
 * Reads platform-level workspace defaults from AdminSettings.
 * Returns the full defaults object for a given workspace type.
 *
 * Key format: platform_config:workspace_defaults:{configType}
 *
 * For field_service, reads:
 *   - workspace_defaults:field_service_trade_categories → trade list
 *   - workspace_defaults:field_service_feature_toggles → feature flags
 *
 * Returns null for config types with no saved defaults yet.
 */

import { base44 } from '@/api/base44Client';

const CONFIG_KEY_PREFIX = 'platform_config';

async function readConfig(domain, configType) {
  const key = `${CONFIG_KEY_PREFIX}:${domain}:${configType}`;
  try {
    const settings = await base44.entities.AdminSettings.filter({ key });
    if (settings.length === 0) return null;
    const parsed = JSON.parse(settings[0].value);
    return parsed.items ?? null;
  } catch {
    return null;
  }
}

export async function getWorkspaceDefaults(workspaceType) {
  switch (workspaceType) {
    case 'field_service': {
      const [tradeCategories, featureToggles] = await Promise.all([
        readConfig('workspace_defaults', 'field_service_trade_categories'),
        readConfig('workspace_defaults', 'field_service_feature_toggles'),
      ]);

      // Convert feature toggles array to features_json object
      let featuresJson = null;
      if (Array.isArray(featureToggles)) {
        featuresJson = {};
        featureToggles.forEach((t) => {
          featuresJson[t.key] = t.enabled;
        });
      }

      // Convert trade categories to trade_categories_json array
      let tradeCategoriesJson = null;
      if (Array.isArray(tradeCategories)) {
        tradeCategoriesJson = tradeCategories
          .filter((t) => t.active !== false)
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((t) => t.label);
      }

      return {
        trade_categories_json: tradeCategoriesJson,
        features_json: featuresJson,
      };
    }

    case 'property_management':
    case 'team':
    case 'finance':
      // Placeholder — returns null until these default panels are built
      return null;

    default:
      return null;
  }
}
