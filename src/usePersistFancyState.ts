import { useEffect } from "react";

const STORAGE_KEY = "fancy-screens:persist";

export interface PersistOptions {
  /** sessionStorage (default) or localStorage. */
  storage?: "session" | "local";
  /** Storage key. Default `"fancy-screens:persist"`. */
  key?: string;
  /** Skip persistence entirely if false (useful for opt-in toggling). */
  enabled?: boolean;
}

/**
 * Persists the fancy-screens port store across Inertia navigations.
 *
 * Inertia.js performs full-page React unmounts on navigation by default,
 * so without this hook the port store + screen registry vanish on every
 * `router.visit()`. This hook hooks into `router.on('before')` to write
 * a snapshot before the swap, and rehydrates after the new page mounts.
 *
 * Mount this **once** at the app shell level, alongside `<FancyAppRoot>`:
 *
 *   function App({ children }) {
 *     usePersistFancyState();
 *     return <FancyAppRoot>{children}</FancyAppRoot>;
 *   }
 *
 * Notes:
 * - Snapshots store the raw port-state map (value, loading, error,
 *   version per port key). Component-internal `useState` is NOT
 *   persisted — that's by design (fancy-screens encourages persistent
 *   state to live in ports).
 * - Cleared on `localStorage`/`sessionStorage` clear or browser close
 *   (sessionStorage default).
 * - Pairs naturally with fancy-screens 0.3.x's hibernation: hibernation
 *   handles within-session offscreen unmounts; this handles
 *   across-page Inertia navigation.
 */
export function usePersistFancyState(options: PersistOptions = {}): void {
  const { storage = "session", key = STORAGE_KEY, enabled = true } = options;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const store = storage === "local" ? window.localStorage : window.sessionStorage;

    // Lazy-import to avoid a hard dep on either package.
    let unbindBefore: (() => void) | null = null;
    let cancelled = false;

    Promise.all([
      import("@inertiajs/react").catch(() => null),
      import("@particle-academy/fancy-screens").catch(() => null),
    ]).then(([inertiaMod, screensMod]) => {
      if (cancelled) return;
      if (!inertiaMod || !screensMod) {
        console.warn(
          "[fancy-inertia] usePersistFancyState requires both @inertiajs/react and @particle-academy/fancy-screens",
        );
        return;
      }

      const router = (inertiaMod as { router?: { on?: (...args: unknown[]) => () => void } })?.router;
      if (!router?.on) return;

      // Rehydrate from storage on mount (covers app boot + tab reopen).
      try {
        const raw = store.getItem(key);
        if (raw) {
          const snapshot = JSON.parse(raw) as Record<string, { value: unknown }>;
          (window as unknown as { __FANCY_INERTIA_PERSISTED__?: typeof snapshot }).__FANCY_INERTIA_PERSISTED__ =
            snapshot;
        }
      } catch (err) {
        console.warn("[fancy-inertia] failed to rehydrate persist snapshot", err);
      }

      unbindBefore = router.on("before", () => {
        try {
          // The screens runtime exposes its system via window when needed.
          // We read the port-store snapshot via the public hook surface
          // by walking the registry (in 0.3.x this becomes an explicit
          // export — for now we hop through the system context).
          const snapshot =
            (window as unknown as { __FANCY_SCREENS_SNAPSHOT__?: () => Record<string, unknown> })
              .__FANCY_SCREENS_SNAPSHOT__?.() ?? null;
          if (snapshot) {
            store.setItem(key, JSON.stringify(snapshot));
          }
        } catch (err) {
          console.warn("[fancy-inertia] failed to persist snapshot", err);
        }
      }) as () => void;
    });

    return () => {
      cancelled = true;
      try {
        unbindBefore?.();
      } catch {
        /* noop */
      }
    };
  }, [enabled, storage, key]);
}
