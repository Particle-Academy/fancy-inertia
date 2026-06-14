import { useCallback, useEffect, useRef, useState } from "react";
import { usePage } from "@inertiajs/react";

export interface UseAppUpdateOptions {
  /** Turn detection on/off. Default `true`. */
  enabled?: boolean;
  /** Poll interval in ms. Default `60_000` (1 min). */
  interval?: number;
  /** Also re-check when the tab regains focus / becomes visible. Default `true`. */
  pollOnFocus?: boolean;
  /** What URL to poll. Default the current `location.pathname + search`. */
  pingUrl?: string;
  /**
   * Custom detector — resolve `true` when a new build is available. Overrides the
   * default Inertia asset-version check (use this for a non-Inertia host or a
   * dedicated `/build-version` endpoint).
   */
  check?: () => boolean | Promise<boolean>;
  /** Fired once, when an update is first detected. */
  onUpdateAvailable?: () => void;
}

export interface AppUpdate {
  /** True once a newer build has been detected (and not dismissed). */
  updateAvailable: boolean;
  /** Hard reload to pick up the new build. Default action of `<AppUpdateAlert>`. */
  refresh: () => void;
  /** Hide the prompt until the next page load. */
  dismiss: () => void;
  /** Run a check now (the interval/focus pollers call this for you). */
  check: () => Promise<void>;
}

/**
 * Detect when the app has been redeployed (a new JS/CSS build) while the page is
 * open, so you can prompt the user to refresh. Zero-config on an Inertia host:
 * `HandleInertiaRequests::version()` hashes the Vite manifest, so the asset
 * version changes every build, and Inertia returns **409** to a GET carrying a
 * stale `X-Inertia-Version`. This hook polls with the loaded version and flags an
 * update on a 409 — no extra endpoint required.
 *
 * SSR-safe: nothing runs on the server; all polling lives in effects.
 *
 * ```tsx
 * const { updateAvailable, refresh, dismiss } = useAppUpdate({ interval: 30_000 });
 * ```
 */
export function useAppUpdate(options: UseAppUpdateOptions = {}): AppUpdate {
  const {
    enabled = true,
    interval = 60_000,
    pollOnFocus = true,
    pingUrl,
    check: customCheck,
    onUpdateAvailable,
  } = options;

  const page = usePage() as { version?: string | null; component?: string };
  const loadedVersion = page.version ?? "";
  const component = page.component ?? "";

  const [updateAvailable, setUpdateAvailable] = useState(false);
  const dismissedRef = useRef(false);
  const firedRef = useRef(false);

  // Latest values without re-subscribing the pollers every render.
  const onUpdateRef = useRef(onUpdateAvailable);
  onUpdateRef.current = onUpdateAvailable;
  const customCheckRef = useRef(customCheck);
  customCheckRef.current = customCheck;

  const defaultCheck = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    const url = pingUrl ?? window.location.pathname + window.location.search;
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
      // 409 = stale asset version → a new build is live.
      return res.status === 409;
    } catch {
      return false; // network blip — never false-positive
    }
  }, [pingUrl, loadedVersion, component]);

  const runCheck = useCallback(async (): Promise<void> => {
    if (!enabled || dismissedRef.current) return;
    const fn = customCheckRef.current ?? defaultCheck;
    const available = await fn();
    if (available && !dismissedRef.current) {
      setUpdateAvailable(true);
      if (!firedRef.current) {
        firedRef.current = true;
        onUpdateRef.current?.();
      }
    }
  }, [enabled, defaultCheck]);

  // Interval polling — stops once an update is found (or disabled).
  useEffect(() => {
    if (!enabled || updateAvailable || typeof window === "undefined") return;
    const id = window.setInterval(() => void runCheck(), interval);
    return () => window.clearInterval(id);
  }, [enabled, interval, runCheck, updateAvailable]);

  // Re-check when the tab regains focus / becomes visible.
  useEffect(() => {
    if (!enabled || !pollOnFocus || updateAvailable || typeof window === "undefined") return;
    const onActive = () => {
      if (document.visibilityState === "visible") void runCheck();
    };
    window.addEventListener("focus", onActive);
    document.addEventListener("visibilitychange", onActive);
    return () => {
      window.removeEventListener("focus", onActive);
      document.removeEventListener("visibilitychange", onActive);
    };
  }, [enabled, pollOnFocus, runCheck, updateAvailable]);

  const refresh = useCallback(() => {
    if (typeof window !== "undefined") window.location.reload();
  }, []);

  const dismiss = useCallback(() => {
    dismissedRef.current = true;
    setUpdateAvailable(false);
  }, []);

  const check = useCallback(() => runCheck(), [runCheck]);

  return { updateAvailable, refresh, dismiss, check };
}
