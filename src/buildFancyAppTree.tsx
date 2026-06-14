import type { ComponentType, ReactNode } from "react";
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
  /** The Inertia `App` component handed to `setup`/`resolve`. */
  App: ComponentType<{ children?: (args: InertiaAppRenderArgs) => ReactNode } & Record<string, unknown>>;
  /** The Inertia page props handed to `setup`. */
  props: Record<string, unknown>;
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
}: FancyAppTreeOptions): ReactNode {
  const wrap = providers ?? ((outlet: ReactNode) => outlet);

  const outlet = (
    <App {...props}>
      {({ Component, key, props: pageProps }: InertiaAppRenderArgs) => {
        const Page = Component;
        const child = <Page {...pageProps} />;
        const rendered = Page.layout ? Page.layout(child) : child;
        return transition === false ? (
          rendered
        ) : (
          <FancyPageTransition pageKey={key ?? ""}>{rendered}</FancyPageTransition>
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
