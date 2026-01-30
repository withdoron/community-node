/**
 * Config hook — reads/writes platform config via AdminSettings fallback.
 * Key format: platform_config:{domain}:{configType}
 * Value: JSON { items, updated_at }
 * See CONFIG-SYSTEM.md and Spec-Repo/STEP-1.1-PLATFORM-CONFIG-ENTITY.md.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getDefaultConfig } from '@/utils/defaultConfig';

const CONFIG_KEY_PREFIX = 'platform_config';

export function getConfigKey(domain, configType) {
  return `${CONFIG_KEY_PREFIX}:${domain}:${configType}`;
}

export function useConfig(domain, configType) {
  const key = getConfigKey(domain, configType);
  const defaults = getDefaultConfig(domain, configType);

  return useQuery({
    queryKey: ['config', domain, configType],
    queryFn: async () => {
      const settings = await base44.entities.AdminSettings.filter({ key });
      if (settings.length === 0) return defaults;
      try {
        const parsed = JSON.parse(settings[0].value);
        return parsed.items ?? defaults;
      } catch {
        return defaults;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: defaults,
  });
}

export function useConfigMutation(domain, configType) {
  const queryClient = useQueryClient();
  const key = getConfigKey(domain, configType);

  return useMutation({
    mutationFn: async (items) => {
      const value = JSON.stringify({ items, updated_at: new Date().toISOString() });
      const existing = await base44.entities.AdminSettings.filter({ key });

      if (existing.length > 0) {
        return base44.entities.AdminSettings.update(existing[0].id, { value });
      }
      return base44.entities.AdminSettings.create({ key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', domain, configType] });
    },
  });
}
