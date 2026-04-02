/**
 * Backwards-compatible re-export. New code should import from useBreakpoint.js directly.
 * This file exists because shadcn/ui sidebar.jsx imports from '@/hooks/use-mobile'.
 */
export { useIsMobile } from './useBreakpoint';
