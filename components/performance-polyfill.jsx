'use client';

import { useEffect } from 'react';

/**
 * Inlines the performance API polyfill in a useEffect to avoid
 * the "Encountered a script tag while rendering React component" warning
 * that occurs with next/script + beforeInteractive strategy.
 */
export default function PerformancePolyfill() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = window.performance || (window.performance = {});
    if (typeof p.mark !== 'function') p.mark = function () {};
    if (typeof p.measure !== 'function') p.measure = function () {};
    if (typeof p.clearMarks !== 'function') p.clearMarks = function () {};
    if (typeof p.clearMeasures !== 'function') p.clearMeasures = function () {};
    if (typeof p.getEntriesByName !== 'function') p.getEntriesByName = function () { return []; };
  }, []);

  return null;
}
