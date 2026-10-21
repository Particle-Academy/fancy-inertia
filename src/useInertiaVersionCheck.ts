import { useCallback } from "react";
import { usePage } from "@inertiajs/react";
import type { UseAppUpdateOptions } from "@particle-academy/fancy-app-update";

export interface InertiaVersionCheckOptions {
  /** URL to ping. Default: the current path + query. */
  pingUrl?: string;
}

/**
 * The Inertia redeploy detector, as a `check` for ANY fancy-app-update
 * component or hook: resolves `true` when the server answers **409** to a GET
 * carrying the loaded `X-Inertia-Version` -- i.e. a new build has shipped.
 *
 * `HandleInertiaRequests::version()` hashes the Vite manifest, so the version
 * changes every build. No extra endpoint, no config.
 *
 * ```tsx
 * import { useInertiaVersionCheck } from "@particle-academy/fancy-inertia";
 * import { AppUpdateAlert } from "@particle-academy/fancy-app-update";
 *
 * const check = useInertiaVersionCheck();
 * <AppUpdateAlert check={check} />
 * ```
 *
 * fancy-inertia's own `useAppUpdate`, `AppUpdateAlert` and `AppUpdateStack`
 * already default to it; reach for this when you use a core component directly.
 * Needs the Inertia context (call it inside `<App>`). A network error resolves
 * `false` -- it never false-positives.
 */
export function useInertiaVersionCheck(
  options: InertiaVersionCheckOptions = {},
): () => Promise<boolean> {
  const page = usePage() as { version?: string | null; component?: string };
  const loadedVersion = page.version ?? "";
  const component = page.component ?? "";
  const { pingUrl } = options;

  return useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    const url = pingUrl ?? window.location.pathname + window.location.search;
    try {
      const res = await fetch(url, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          "X-Inertia": "true",
          "X-Inertia-Version": loadedVersion,
          // Partial reload requesting a prop that doesn't exist -> tiny response
          // when the version IS current (the 409 version check runs first).
          "X-Inertia-Partial-Component": component,
          "X-Inertia-Partial-Data": "__app_update_ping__",
          "X-Requested-With": "XMLHttpRequest",
          Accept: "text/html, application/xhtml+xml",
        },
      });
      return res.status === 409;
    } catch {
      return false; // network blip -- never false-positive
    }
  }, [pingUrl, loadedVersion, component]);
}

/**
 * The precedence every fancy-inertia wrapper uses: the consumer's own `check`
 * wins; a `currentVersion` + `latestVersion` pair is left to the core;
 * otherwise the Inertia detector.
 */
export function inertiaDefaultCheck(
  options: Pick<UseAppUpdateOptions, "check" | "currentVersion" | "latestVersion">,
  inertiaCheck: () => Promise<boolean>,
): UseAppUpdateOptions["check"] {
  if (options.check) return options.check;
  const usesVersionCompare = options.currentVersion != null && options.latestVersion != null;
  return usesVersionCompare ? undefined : inertiaCheck;
}
