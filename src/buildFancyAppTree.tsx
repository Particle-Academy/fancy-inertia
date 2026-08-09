import type { ComponentType, ReactNode } from "react";
import { AppUpdateAlert, type AppUpdateAlertProps } from "./AppUpdateAlert";
import { FancyAppRoot, type FancyAppRootProps } from "./FancyAppRoot";
import {
  FancyTransitionProvider,
  FancyPageTransition,
  type FancyTransition,
} from "./PageTransition";

/**
 * The Inertia `App` outlet's render-prop arguments. Inertia calls the child
 * function with the resolved page `Component`, a `key` that changes per
 * navigation, and the page `props`.
 */
interface InertiaAppRenderArgs {
  Component: ComponentType<Record<string, unknown>> & {
    /** A page may expose a persistent layout via a static `layout`. */
    layout?: (page: ReactNode) => ReactNode;
  };
  key?: string;
  props: Record<string, unknown>;
}

export interface FancyAppTreeOptions {
  /**
   * The Inertia `App` component handed to `setup`/`resolve`.
   *
   * Its exact props are intentionally owned by the installed Inertia adapter.
   * Keeping this boundary open lets Inertia 1–3 supply their version-specific
   * required bootstrap props while the render-prop contract below remains
   * typed.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  App: ComponentType<any>;
  /** The adapter-owned bootstrap props handed to Inertia's `App`. */
  props: object;
  /**
   * Options forwarded to {@link FancyAppRoot} (Toast + optional ScreenSystem +
   * echarts). Pass `false` to omit the provider entirely.
   */
  appRoot?: Omit<FancyAppRootProps, "children"> | false;
  /**
   * Wrap additional, app-specific providers around the page outlet — e.g.
   * fancy-query's `<FancyDataRoot>`. Receives the outlet, returns the wrapped
   * tree. Runs INSIDE `FancyAppRoot` and OUTSIDE the page.
   */
  providers?: (outlet: ReactNode) => ReactNode;
  /**
   * Page transition crossfade on Inertia navigation. Default `"fade"`. Pass
   * `false` to render pages without the transition wrapper.
   */
  transition?: FancyTransition | false;
  /**
   * Mount {@link AppUpdateAlert} once, inside Inertia's `<App>`.
   *
   * `true` for defaults, or the alert's props. It cannot be mounted from
   * `providers`: that slot receives the subtree CONTAINING `<App>`, so anything
   * rendered beside the outlet is outside the Inertia context and `usePage()`
   * throws, taking the page down. This is the only in-package slot that is both
   * "once, near the root" and inside that context.
   */
  appUpdate?: boolean | AppUpdateAlertProps;
}

/**
 * Build the shared Fancy provider/page tree used by BOTH the client mount
 * ({@link setupFancyApp}) and the SSR server entry (`createFancyServer`). Pure
 * React — no `react-dom` — so it is safe on the server and the client.
 *
 *   FancyAppRoot
 *     └─ providers(            // app-specific (FancyDataRoot, …)
 *          FancyTransitionProvider
 *            └─ <App> → per page: apply `Page.layout`, wrap in FancyPageTransition
 */
export function buildFancyAppTree({
  App,
  props,
  appRoot,
  providers,
  transition = "fade",
  appUpdate = false,
}: FancyAppTreeOptions): ReactNode {
  const wrap = providers ?? ((outlet: ReactNode) => outlet);

  const outlet = (
    <App {...props}>
      {({ Component, key, props: pageProps }: InertiaAppRenderArgs) => {
        const Page = Component;
        const child = <Page {...pageProps} />;
        const rendered = Page.layout ? Page.layout(child) : child;
        const page =
          transition === false ? (
            rendered
          ) : (
            <FancyPageTransition pageKey={key ?? ""}>{rendered}</FancyPageTransition>
          );

        if (!appUpdate) return page;

        // Rendered as a stable sibling of the page, inside `<App>`. Position is
        // what keeps React from remounting it on navigation, so the poll timer
        // and the dismissed flag survive a page swap.
        return (
          <>
            {page}
            <AppUpdateAlert {...(appUpdate === true ? {} : appUpdate)} />
          </>
        );
      }}
    </App>
  );

  const withTransition =
    transition === false ? (
      outlet
    ) : (
      <FancyTransitionProvider defaultTransition={transition}>{outlet}</FancyTransitionProvider>
    );

  const inner = wrap(withTransition);

  return appRoot === false ? inner : <FancyAppRoot {...appRoot}>{inner}</FancyAppRoot>;
}
