import { type ReactNode, useEffect, useState } from "react";
import { Toast } from "@particle-academy/react-fancy";

export interface FancyAppRootProps {
  children: ReactNode;

  /** Toast position. Default `"bottom-right"`. */
  toastPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";

  /**
   * Mount fancy-screens' `<Screen.System>` provider. Default `true`. Set
   * `false` if your app doesn't use fancy-screens (saves a context layer).
   */
  withScreens?: boolean;

  /**
   * Auto-register echarts modules + built-in themes on mount. Default
   * `true`. Disable if you call `registerCharts(...)` yourself for
   * tree-shaking control.
   */
  withECharts?: boolean;
}

/**
 * Composite top-level provider for the fancy UI set under Inertia.
 *
 * Mount once in your Inertia app entry, ABOVE the `<Inertia App>` outlet.
 * Subsequent page swaps preserve the providers — toasts survive
 * navigation, the screen registry persists, and echarts modules don't
 * have to re-register.
 *
 *   import { createInertiaApp } from "@inertiajs/react";
 *   import { FancyAppRoot } from "@particle-academy/fancy-inertia";
 *
 *   createInertiaApp({
 *     setup({ App, props, el }) {
 *       createRoot(el).render(
 *         <FancyAppRoot>
 *           <App {...props} />
 *         </FancyAppRoot>
 *       );
 *     },
 *   });
 */
export function FancyAppRoot({
  children,
  toastPosition = "bottom-right",
  withScreens = true,
  withECharts = true,
}: FancyAppRootProps) {
  const [echartsReady, setEchartsReady] = useState(!withECharts);
  const [ScreenSystem, setScreenSystem] = useState<React.ComponentType<{ children: ReactNode }> | null>(
    null,
  );

  useEffect(() => {
    if (withECharts) {
      // Lazy-import so echarts isn't pulled in when not needed.
      import("@particle-academy/fancy-echarts")
        .then((m) => {
          m.registerAll();
          if ("registerBuiltinThemes" in m && typeof m.registerBuiltinThemes === "function") {
            m.registerBuiltinThemes();
          }
          setEchartsReady(true);
        })
        .catch((err) => {
          // fancy-echarts is an optional peer; missing dep is a no-op.
          console.warn("[fancy-inertia] fancy-echarts not installed; skipping registerAll", err);
          setEchartsReady(true);
        });
    }

    if (withScreens) {
      import("@particle-academy/fancy-screens")
        .then((m) => setScreenSystem(() => m.ScreenSystem))
        .catch((err) => {
          console.warn("[fancy-inertia] fancy-screens not installed; skipping <Screen.System>", err);
          setScreenSystem(() => Passthrough);
        });
    }
  }, [withECharts, withScreens]);

  // While echarts is registering, render children without it — charts
  // mount lazily anyway, so the warm-up window is invisible to most pages.
  // While ScreenSystem is loading, use a passthrough so the tree mounts
  // immediately; a Screen rendered in the first frame will register
  // itself as soon as the system loads.
  const SystemWrapper = withScreens ? ScreenSystem ?? Passthrough : Passthrough;

  return (
    <Toast.Provider position={toastPosition}>
      <SystemWrapper>{children}</SystemWrapper>
    </Toast.Provider>
  );
}

function Passthrough({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

FancyAppRoot.displayName = "FancyAppRoot";
