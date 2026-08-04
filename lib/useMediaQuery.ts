"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Reads a media query without an effect, so there is no cascading render on
 * mount. Returns `false` during SSR, which matches the desktop-first markup.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}
