import { useCallback } from "react";
import { useServiceWorker } from "@particle-academy/fancy-pwa";
import { useAppUpdate, type UseAppUpdateOptions, type AppUpdate } from "../useAppUpdate";

export interface UsePwaUpdateOptions extends UseAppUpdateOptions {
  /**
   * Refresh action used when NO service worker is waiting (an Inertia-version
   * redeploy with no SW). Defaults to the core hook's reload. When a SW IS
   * waiting, that always wins — skip-waiting reloads with the fresh shell.
   */
  onRefresh?: () => void;
}

export interface PwaUpdate extends AppUpdate {
  /** True when a new service worker has installed and is waiting to activate. */
  swWaiting: boolean;
}

/**
 * Unified "a new version is available" for an Inertia PWA. Fires when EITHER:
 *
 *   - Inertia's asset version changed — a redeploy, detected by the zero-config
 *     409 ping in {@link useAppUpdate} (no extra endpoint), or
 *   - a new service worker has installed and is `waiting` (fancy-pwa).
 *
 * `refresh()` applies whichever is pending: a waiting SW is activated
 * (skip-waiting → `controllerchange` → one reload, so the freshly-cached shell
 * loads), otherwise a plain reload. One signal + one action means Inertia's
 * version reload and the SW update never fight each other.
 *
 * `@particle-academy/fancy-pwa` is an **optional** peer of this subpath. With no
 * SW registered, `swWaiting` stays `false` and this is exactly the Inertia
 * redeploy detector — so it's safe to use even before a PWA is wired up.
 */
export function usePwaUpdate(options: UsePwaUpdateOptions = {}): PwaUpdate {
  const sw = useServiceWorker();
  const inertia = useAppUpdate(options);
  const swWaiting = sw.waiting != null;

  const refresh = useCallback(() => {
    if (sw.waiting != null) {
      sw.activate(); // SKIP_WAITING → controllerchange handler reloads once
      return;
    }
    if (options.onRefresh) {
      options.onRefresh();
      return;
    }
    inertia.refresh();
  }, [sw, options, inertia]);

  return {
    ...inertia,
    updateAvailable: inertia.updateAvailable || swWaiting,
    refresh,
    swWaiting,
  };
}
