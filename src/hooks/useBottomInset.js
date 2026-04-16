/**
 * useBottomInset — single source of truth for the height of the persistent bottom UI stack.
 * Living Feet: one computation, many consumers (CommandBar padding, overlay containment).
 *
 * Bottom stack (from bottom up):
 *   1. iOS safe-area inset (env(safe-area-inset-bottom) — handled by CSS, not JS)
 *   2. FrequencyMiniPlayer (54px when a song is loaded + station enabled)
 *   3. CommandBar mobile (COMMAND_BAR_HEIGHT when agent-enabled user)
 *
 * Returns a pixel value for how much space the bottom UI occupies ABOVE safe-area.
 * Overlays add env(safe-area-inset-bottom) in CSS on top of this value.
 */
import { useMemo } from 'react';
import { useFrequency } from '@/contexts/FrequencyContext';

export const HEADER_HEIGHT = 45;          // header padding (10+10) + content + 1px border
export const MINI_PLAYER_HEIGHT = 54;     // FrequencyMiniPlayer visual height (52 body + 2 progress)
export const COMMAND_BAR_HEIGHT = 54;     // CommandBar bar-mode height (44 input + padding/border)

export default function useBottomInset(agentEnabled = false) {
  const freq = useFrequency();
  const miniPlayerVisible = !!(freq?.currentSong && freq?.isEnabled);

  return useMemo(() => {
    let height = 0;
    if (miniPlayerVisible) height += MINI_PLAYER_HEIGHT;
    if (agentEnabled) height += COMMAND_BAR_HEIGHT;
    return height;
  }, [miniPlayerVisible, agentEnabled]);
}
