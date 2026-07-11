'use client';

import { useState, useEffect } from 'react';
import { detectAdBlocker, shouldBlock } from '@/lib/detect-extensions';
import AdBlockerBlocker from '@/components/adblocker-blocker';

/**
 * Extension Guard Component
 * 
 * Bu komponent barcha sahifalarni o'rab turadi.
 * AdBlocker aniqlansa, bolalarni (children) bloklab, o'rniga 
 * AdBlockerBlocker komponentini ko'rsatadi.
 * 
 * Brave brauzer Shields o'chirilgan bo'lsa, bloklamaydi (faqat ma'lumot).
 * Brave Shields yoqilgan bo'lsa, bloklaydi.
 * 
 * Buni layout.js ga qo'shing:
 * import ExtensionGuard from "@/components/extension-guard";
 * va {children} ni <ExtensionGuard>{children}</ExtensionGuard> bilan o'rab oling
 */
export default function ExtensionGuard({ children }) {
  const [adBlockerDetected, setAdBlockerDetected] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;

    const check = async () => {
      const result = await detectAdBlocker();
      if (!cancelled) {
        // shouldBlock() — Brave Shields o'chirilgan bo'lsa bloklamaydi
        setAdBlockerDetected(shouldBlock(result));
        
        if (result.detected) {
          console.warn('[Security] Ad blocker detected:', result.method, result.details);
        }
      }
    };

    check();

    return () => { cancelled = true; };
  }, []);

  // AdBlocker aniqlanganda, bolalarni bloklab, o'rniga AdBlockerBlocker ko'rsatamiz
  if (adBlockerDetected) {
    return <AdBlockerBlocker />;
  }

  // Hech narsa aniqlanmasa yoki tekshiruv tugamagan bo'lsa, normal render
  return <>{children}</>;
}
