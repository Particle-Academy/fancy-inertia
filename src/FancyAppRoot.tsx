import { useEffect, type ReactNode } from "react";
import { Toast } from "@particle-academy/react-fancy";
import { ScreenSystem } from "@particle-academy/fancy-screens";
import { registerAll, registerBuiltinThemes } from "@particle-academy/fancy-echarts";

export interface FancyAppRootProps {
  children: ReactNode;

  /** Toast position. Default `"bottom-right"`. */
  toastPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";

  /**
   * Mount fancy-screens' `<Screen.System>` provider. Default `true`. Set
   * `false` if your app doesn't use fancy-screens (saves one context layer).
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
  useEffect(() => {
    if (withECharts) {
      registerAll();
      registerBuiltinThemes();
    }
  }, [withECharts]);

  const Inner = withScreens ? (
    <ScreenSystem>{children}</ScreenSystem>
  ) : (
    <>{children}</>
  );

  return <Toast.Provider position={toastPosition}>{Inner}</Toast.Provider>;
}

FancyAppRoot.displayName = "FancyAppRoot";
