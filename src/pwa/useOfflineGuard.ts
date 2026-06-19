import { useCallback, useEffect, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import { useOnline } from "./online";

export interface OfflineGuardOptions {
  /** Turn the guard off (Inertia behaves normally). Default `false`. */
  disabled?: boolean;
  /** Replay the deferred visit automatically once back online. Default `true`. */
  autoRetry?: boolean;
  /** Called when a visit is deferred because the app is offline. */
  onBlocked?: (url: string) => void;
}

export interface OfflineGuardState {
  /** Current connectivity (`navigator.onLine`, SSR-safe). */
  online: boolean;
  /** URL of a visit deferred while offline, or `null` when none is pending. */
  blockedUrl: string | null;
  /** Replay the deferred visit now (no-op if none pending or still offline). */
  retry: () => void;
}

/**
 * Make Inertia navigation offline-aware — WITHOUT a service worker or any
 * caching. While offline, a `router.on('before')` hook cancels the visit (which
 * would otherwise fire a doomed XHR and fail silently), remembers the intended
 * URL, and — by default — replays it automatically when connectivity returns.
 *
 * This is connectivity *awareness*, not offline *operation*: nothing is cached,
 * so there's no staleness, no stale-CSRF, and none of the navigation-hijacking
 * footguns of a service worker that caches page responses. It works with
 * Inertia's grain — the router's own event cancels the visit. Only GET
 * navigations are guarded; non-GET visits (form submits) are left alone to
 * surface their own errors.
 *
 * Pure Inertia — no fancy-pwa peer needed.
 */
export function useOfflineGuard(options: OfflineGuardOptions = {}): OfflineGuardState {
  const { disabled = false, autoRetry = true, onBlocked } = options;
  const online = useOnline();
  const [blockedUrl, setBlockedUrl] = useState<string | null>(null);
  const pending = useRef<string | null>(null);

  useEffect(() => {
    if (disabled || typeof window === "undefined") return;
    // router.on returns an unsubscribe; returning false from a `before` handler
    // cancels the visit (works across Inertia v1/v2/v3).
    return router.on("before", (event) => {
      if (navigator.onLine) return;
      const visit = (event as { detail?: { visit?: { url?: unknown; method?: unknown } } }).detail?.visit;
      const method = String(visit?.method ?? "get").toLowerCase();
      const url = visit?.url != null ? String(visit.url) : "";
      if (method !== "get" || url === "") return; // let non-GET surface its own error
      (event as { preventDefault?: () => void }).preventDefault?.();
      pending.current = url;
      setBlockedUrl(url);
      onBlocked?.(url);
      return false;
    });
  }, [disabled, onBlocked]);

  const retry = useCallback(() => {
    const url = pending.current;
    if (url == null || typeof navigator === "undefined" || !navigator.onLine) return;
    pending.current = null;
    setBlockedUrl(null);
    router.visit(url);
  }, []);

  useEffect(() => {
    if (online && autoRetry && pending.current != null) retry();
  }, [online, autoRetry, retry]);

  return { online, blockedUrl, retry };
}
