import type { CSSProperties, ReactNode } from "react";
import { Portal, Callout, Button, type Color, type ButtonColor } from "@particle-academy/react-fancy";
import { usePwaUpdate } from "./usePwaUpdate";
import { useOfflineGuard } from "./useOfflineGuard";

export type PwaCorner = "bottom-right" | "bottom-left" | "top-right" | "top-left" | "bottom" | "top";

const CORNER: Record<PwaCorner, CSSProperties> = {
  "bottom-right": { bottom: 16, right: 16 },
  "bottom-left": { bottom: 16, left: 16 },
  "top-right": { top: 16, right: 16 },
  "top-left": { top: 16, left: 16 },
  bottom: { bottom: 16, left: "50%", transform: "translateX(-50%)" },
  top: { top: 16, left: "50%", transform: "translateX(-50%)" },
};

export interface FancyInertiaPwaProps {
  /** Defer + auto-retry Inertia visits attempted while offline. Default `true`. */
  offlineGuard?: boolean;
  /** Auto-replay the deferred visit on reconnect. Default `true`. */
  autoRetry?: boolean;
  /** Prompt "a new version is available → refresh" (Inertia redeploy OR a waiting SW). Default `true`. */
  updatePrompt?: boolean;
  /** Persistent "You're offline" notice while disconnected. Default `true`. */
  offlineNotice?: boolean;
  /** Corner for both the update prompt + the offline notice. Default `"bottom-right"`. */
  position?: PwaCorner;
  /** react-fancy color for the update prompt. Default `"violet"`. */
  color?: Color;
  /** Override the version ping URL forwarded to {@link usePwaUpdate}. */
  pingUrl?: string;
  /** Override the refresh action when no SW is waiting (default: reload). */
  onRefresh?: () => void;
  updateTitle?: ReactNode;
  updateDescription?: ReactNode;
  refreshLabel?: ReactNode;
  offlineMessage?: ReactNode;
}

/**
 * One-mount PWA glue for an Inertia app — drop it once near your root. It wires
 * the synergistic, low-risk parts of {@link usePwaUpdate} + {@link useOfflineGuard}
 * and renders sensible default chrome:
 *
 *   - a "new version available → refresh" prompt (a redeploy via Inertia's asset
 *     version, OR a freshly-installed service worker — one prompt, one action),
 *   - offline-aware navigation (defers + auto-replays visits made while offline),
 *   - a persistent "You're offline" notice.
 *
 * It deliberately does NOT cache page responses or intercept navigations with a
 * service worker — that's the part that fights Inertia's server-driven grain.
 * Every piece is opt-out via props; pass `updatePrompt={false}` etc. to take
 * just the behaviour you want and render your own UI from the hooks.
 *
 * Needs `@particle-academy/react-fancy` (peer) for the default UI and, for the
 * SW half of updates, `@particle-academy/fancy-pwa` (optional peer).
 */
export function FancyInertiaPwa({
  offlineGuard = true,
  autoRetry = true,
  updatePrompt = true,
  offlineNotice = true,
  position = "bottom-right",
  color = "violet",
  pingUrl,
  onRefresh,
  updateTitle = "Update available",
  updateDescription = "A new version is ready — refresh to get the latest.",
  refreshLabel = "Refresh",
  offlineMessage = "You're offline — changes will resume when you reconnect.",
}: FancyInertiaPwaProps) {
  const { online } = useOfflineGuard({ disabled: !offlineGuard, autoRetry });
  const update = usePwaUpdate({ pingUrl, onRefresh });

  const showUpdate = updatePrompt && update.updateAvailable;
  const showOffline = offlineNotice && !online;
  if (!showUpdate && !showOffline) return null;

  return (
    <Portal>
      <div
        role="status"
        aria-live="polite"
        style={{
          position: "fixed",
          zIndex: 9999,
          maxWidth: "min(92vw, 26rem)",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          ...CORNER[position],
        }}
      >
        {showOffline ? <Callout color="amber">{offlineMessage}</Callout> : null}
        {showUpdate ? (
          <Callout color={color} dismissible onDismiss={update.dismiss}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                {updateTitle ? <div style={{ fontWeight: 600 }}>{updateTitle}</div> : null}
                {updateDescription ? (
                  <div style={{ fontSize: 14, opacity: 0.9 }}>{updateDescription}</div>
                ) : null}
              </div>
              <div>
                <Button size="sm" color={color as unknown as ButtonColor} onClick={update.refresh}>
                  {refreshLabel}
                </Button>
              </div>
            </div>
          </Callout>
        ) : null}
      </div>
    </Portal>
  );
}

FancyInertiaPwa.displayName = "FancyInertiaPwa";
