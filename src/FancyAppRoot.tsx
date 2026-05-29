import { useEffect, lazy, Suspense, type ComponentType, type ReactNode } from "react";
import { Toast } from "@particle-academy/react-fancy";

/**
 * fancy-screens is an OPTIONAL peer. Importing `ScreenSystem` statically
 * would put `@particle-academy/fancy-screens` in the base import graph, so
 * any bundler resolving `fancy-inertia` would hard-fail when it isn't
 * installed — even for consumers who only use `<FancyAppRoot withScreens={false}>`.
 * Load it lazily instead, and degrade to a passthrough if it's absent.
 */
const Passthrough = ({ children }: { children?: ReactNode }) => <>{children}</>;

const SCREENS_MISSING =
  "[fancy-inertia] `withScreens` is on but @particle-academy/fancy-screens is not available — rendering children without the ScreenSystem provider. Pass `withScreens={false}` to silence this.";

const ScreenSystemLazy = lazy<ComponentType<{ children?: ReactNode }>>(() =>
  import("@particle-academy/fancy-screens")
    .then((m) => {
      const Comp = (m as { ScreenSystem?: ComponentType<{ children?: ReactNode }> })?.ScreenSystem;
      // A bundler resolving an ABSENT optional peer can hand back an
      // export-less stub ({ default: undefined }) instead of rejecting — so a
      // reject-only `.catch` misses it and React.lazy gets `{ default: undefined }`
      // (React #306). Guard the resolved export, not just rejection.
      if (!Comp) {
        console.warn(SCREENS_MISSING);
        return { default: Passthrough };
      }
      return { default: Comp };
    })
    .catch((err) => {
      console.warn(SCREENS_MISSING, err);
      return { default: Passthrough };
    }),
);

export interface FancyAppRootProps {
  children: ReactNode;

  /** Toast position. Default `"bottom-right"`. */
  toastPosition?: "top-left" | "top-right" | "bottom-left" | "bottom-right";

  /**
   * Mount fancy-screens' `<Screen.System>` provider. Default `true`. Set
   * `false` if your app doesn't use fancy-screens — the optional peer is
   * never imported in that case.
   */
  withScreens?: boolean;

  /**
   * Auto-register echarts modules + built-in themes on mount. Default
   * `true`. Disable if you call `registerCharts(...)` yourself for
   * tree-shaking control, or if fancy-echarts isn't installed.
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
 *
 * `fancy-screens` and `fancy-echarts` are optional peers, loaded lazily
 * only when `withScreens` / `withECharts` are enabled — the base bundle
 * depends on nothing but `react-fancy`.
 */
export function FancyAppRoot({
  children,
  toastPosition = "bottom-right",
  withScreens = true,
  withECharts = true,
}: FancyAppRootProps) {
  useEffect(() => {
    if (!withECharts) return;
    let cancelled = false;
    void (async () => {
      try {
        const echarts = await import("@particle-academy/fancy-echarts");
        if (cancelled) return;
        echarts.registerAll?.();
        echarts.registerBuiltinThemes?.();
      } catch (err) {
        console.warn(
          "[fancy-inertia] `withECharts` is on but @particle-academy/fancy-echarts is not installed — skipping chart registration. Pass `withECharts={false}` to silence this.",
          err,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [withECharts]);

  const Inner = withScreens ? (
    <Suspense fallback={null}>
      <ScreenSystemLazy>{children}</ScreenSystemLazy>
    </Suspense>
  ) : (
    <>{children}</>
  );

  return <Toast.Provider position={toastPosition}>{Inner}</Toast.Provider>;
}

FancyAppRoot.displayName = "FancyAppRoot";
