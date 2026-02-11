'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const scrollPositions = new Map<string, number>();

/**
 * Restores scroll position when navigating back.
 * Saves position on route change, restores on return.
 */
export function useScrollRestoration() {
  const pathname = usePathname();

  useEffect(() => {
    // Disable browser's default scroll restoration
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    const saved = scrollPositions.get(pathname);
    if (saved !== undefined) {
      requestAnimationFrame(() => window.scrollTo(0, saved));
    }

    return () => {
      scrollPositions.set(pathname, window.scrollY);
    };
  }, [pathname]);
}
