import { useCallback } from "react";
import { usePage } from "@inertiajs/react";
import {
  useAppUpdate as useAppUpdateCore,
  type UseAppUpdateOptions,
  type AppUpdate,
} from "@particle-academy/fancy-app-update";

export type { UseAppUpdateOptions, AppUpdate } from "@particle-academy/fancy-app-update";

/**
 * Detect when the app has been redeployed (a new build) while the page is open,
 * so you can prompt the user to refresh. This is the **Inertia-flavored** wrapper
 * around `@particle-academy/fancy-app-update`'s framework-agnostic hook: by
 * default it uses Inertia's asset version — `HandleInertiaRequests::version()`
 * hashes the Vite manifest, so the version changes every build, and Inertia
 * returns **409** to a GET carrying a stale `X-Inertia-Version`. The hook polls
 * with the loaded version and flags an update on a 409 — **no extra endpoint**.
 *
 * Every option from the core hook still works: pass your own `check`, or a
 * `currentVersion` + `latestVersion` pair, to override the Inertia default.
 *
 * SSR-safe; polling stops once an update is detected (or after `dismiss()`).
 *
 * ### The 409 in your console is expected
 *
 * Every poll that finds a stale build logs
 * `Failed to load resource: the server responded with a status of 409` — and
 * once detection fires, polling stops, so you see it once per deploy rather
 * than every interval. The browser logs any non-2xx response unconditionally;
 * it cannot be suppressed from JavaScript, and the hook is handling the 409
 * correctly rather than failing.
 *
 * It is NOT swapped for a HEAD or a dedicated endpoint on purpose. Inertia's
 * version check only runs for Inertia GETs, so a HEAD would not 409 at all —
 * the detector would go quiet AND stop working, which is strictly worse than a
 * console line. A dedicated endpoint would work but costs the "no extra
 * endpoint" property that makes this zero-config.
 *
 * If the noise matters more than the zero-config default, pass your own `check`
 * (or `currentVersion` + `latestVersion`) pointing at an endpoint of your own.
 */
export function useAppUpdate(options: UseAppUpdateOptions = {}): AppUpdate {
  const page = usePage() as { version?: string | null; component?: string };
  const loadedVersion = page.version ?? "";
  const component = page.component ?? "";

  // The zero-config Inertia detector: a stale X-Inertia-Version → 409.
  const inertiaCheck = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    const url = options.pingUrl ?? window.location.pathname + window.location.search;
    try {
      const res = await fetch(url, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-Inertia": "true",
          "X-Inertia-Version": loadedVersion,
          // Partial reload requesting a prop that doesn't exist → tiny response
          // when the version IS current (the 409 version check runs first).
          "X-Inertia-Partial-Component": component,
          "X-Inertia-Partial-Data": "__app_update_ping__",
          "X-Requested-With": "XMLHttpRequest",
          Accept: "text/html, application/xhtml+xml",
        },
      });
      return res.status === 409;
    } catch {
      return false; // network blip — never false-positive
    }
  }, [options.pingUrl, loadedVersion, component]);

  // Consumer's own `check` wins; a version-compare pair is left to the core;
  // otherwise default to the Inertia 409 detector.
  const usesVersionCompare = options.currentVersion != null && options.latestVersion != null;
  const check = options.check ?? (usesVersionCompare ? undefined : inertiaCheck);

  return useAppUpdateCore({ ...options, check });
}
