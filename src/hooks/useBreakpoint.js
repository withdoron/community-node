/**
 * useBreakpoint — responsive gradient replacing the binary useIsMobile().
 *
 * Returns a breakpoint name AND convenience booleans so components can
 * adapt fluidly instead of doing a hard mobile/desktop split.
 *
 * Breakpoints align with Tailwind defaults:
 *   phone:   < 640px   (sm)
 *   tablet:  640-1023px (sm → lg)
 *   desktop: 1024-1535px (lg → 2xl)
 *   wide:    >= 1536px (2xl+)
 *
 * Usage:
 *   const { bp, isPhone, isTablet, isDesktop, isWide, isMobile, isAtLeast } = useBreakpoint();
 *   if (isPhone) { ... }
 *   if (isAtLeast('desktop')) { ... }
 */
import { useState, useEffect, useCallback } from 'react';

const BREAKPOINTS = {
  phone: 0,
  tablet: 640,
  desktop: 1024,
  wide: 1536,
};

const BP_ORDER = ['phone', 'tablet', 'desktop', 'wide'];

function getBp(width) {
  if (width >= BREAKPOINTS.wide) return 'wide';
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
}

export default function useBreakpoint() {
  const [bp, setBp] = useState(() => {
    if (typeof window === 'undefined') return 'phone';
    return getBp(window.innerWidth);
  });

  useEffect(() => {
    const handleResize = () => setBp(getBp(window.innerWidth));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isAtLeast = useCallback((target) => {
    return BP_ORDER.indexOf(bp) >= BP_ORDER.indexOf(target);
  }, [bp]);

  return {
    bp,                              // 'phone' | 'tablet' | 'desktop' | 'wide'
    isPhone: bp === 'phone',
    isTablet: bp === 'tablet',
    isDesktop: bp === 'desktop',
    isWide: bp === 'wide',
    isMobile: bp === 'phone',        // backwards-compat alias
    isAtLeast,                       // isAtLeast('desktop') → true if desktop or wide
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
  };
}

// Re-export for backwards compatibility — useIsMobile still works
export function useIsMobile() {
  const { isMobile } = useBreakpoint();
  return isMobile;
}
