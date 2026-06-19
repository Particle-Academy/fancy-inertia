import { useSyncExternalStore } from "react";

/**
 * Tiny SSR-safe online/offline subscription. Kept local (not from fancy-pwa) so
 * {@link import("./useOfflineGuard").useOfflineGuard} works in any Inertia app
 * without the fancy-pwa peer — only the SW-aware update hook needs that.
 */
function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

const getSnapshot = (): boolean => (typeof navigator === "undefined" ? true : navigator.onLine);
// Assume online during SSR + the first client render so hydration matches.
const getServerSnapshot = (): boolean => true;

/** Reactive `navigator.onLine`. `true` during SSR and before the first event. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
