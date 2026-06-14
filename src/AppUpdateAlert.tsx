import type { CSSProperties, ReactNode } from "react";
import { Portal, Callout, Button, type Color, type ButtonColor } from "@particle-academy/react-fancy";
import { useAppUpdate, type UseAppUpdateOptions } from "./useAppUpdate";

interface AppUpdateApi {
  /** Reload to pick up the new build (or your `onRefresh`). */
  refresh: () => void;
  /** Hide the prompt until the next page load. */
  dismiss: () => void;
}

export type AppUpdateAlertPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "bottom"
  | "top";

export interface AppUpdateAlertProps extends UseAppUpdateOptions {
  /** Heading. Default `"Update available"`. */
  title?: ReactNode;
  /** Body copy. Default `"A new version is available — refresh to get the latest."`. */
  description?: ReactNode;
  /** Refresh button label. Default `"Refresh"`. */
  refreshLabel?: ReactNode;
  /** react-fancy Callout/Button color. Default `"violet"`. */
  color?: Color;
  /** Fixed position of the default prompt. Default `"bottom-right"`. */
  position?: AppUpdateAlertPosition;
  /** Customize the refresh action (default: hard `window.location.reload()`). */
  onRefresh?: () => void;
  /**
   * Full UX override — render your own alert instead of the default Callout.
   * Receives `{ refresh, dismiss }`. Only rendered when an update is available.
   */
  render?: (api: AppUpdateApi) => ReactNode;
  /** Alternate render-prop form of {@link render}. */
  children?: (api: AppUpdateApi) => ReactNode;
}

const POSITION: Record<AppUpdateAlertPosition, CSSProperties> = {
  "bottom-right": { bottom: 16, right: 16 },
  "bottom-left": { bottom: 16, left: 16 },
  "top-right": { top: 16, right: 16 },
  "top-left": { top: 16, left: 16 },
  bottom: { bottom: 16, left: "50%", transform: "translateX(-50%)" },
  top: { top: 16, left: "50%", transform: "translateX(-50%)" },
};

/**
 * Drop-in "a new version is available — refresh" prompt. Detects a redeploy via
 * {@link useAppUpdate} and, by default, shows a dismissible react-fancy Callout
 * (in a Portal) with a Refresh button. Mount once near your app root — it renders
 * nothing until an update is detected.
 *
 * ```tsx
 * <AppUpdateAlert />                                   // defaults
 * <AppUpdateAlert title="We just shipped an update" position="bottom" />
 * <AppUpdateAlert onRefresh={() => router.reload()} /> // soft Inertia reload
 * <AppUpdateAlert render={({ refresh }) => <MyBanner onRefresh={refresh} />} />
 * ```
 *
 * The default UI needs the consumer to have `@particle-academy/react-fancy`
 * installed (it's a peer); the `render`/`children` override has no such need.
 */
export function AppUpdateAlert({
  title = "Update available",
  description = "A new version is available — refresh to get the latest.",
  refreshLabel = "Refresh",
  color = "violet",
  position = "bottom-right",
  onRefresh,
  render,
  children,
  ...hookOptions
}: AppUpdateAlertProps) {
  const { updateAvailable, refresh, dismiss } = useAppUpdate(hookOptions);

  if (!updateAvailable) return null;

  const doRefresh = onRefresh ?? refresh;
  const api: AppUpdateApi = { refresh: doRefresh, dismiss };

  const custom = render ?? children;
  if (custom) return <>{custom(api)}</>;

  return (
    <Portal>
      <div
        role="status"
        aria-live="polite"
        style={{ position: "fixed", zIndex: 9999, maxWidth: "min(92vw, 26rem)", ...POSITION[position] }}
      >
        <Callout color={color} dismissible onDismiss={dismiss}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              {title ? <div style={{ fontWeight: 600 }}>{title}</div> : null}
              {description ? <div style={{ fontSize: 14, opacity: 0.9 }}>{description}</div> : null}
            </div>
            <div>
              <Button size="sm" color={color as unknown as ButtonColor} onClick={doRefresh}>
                {refreshLabel}
              </Button>
            </div>
          </div>
        </Callout>
      </div>
    </Portal>
  );
}

AppUpdateAlert.displayName = "AppUpdateAlert";
