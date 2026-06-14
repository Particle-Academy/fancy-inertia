import { createInertiaApp } from "@inertiajs/react";
import createServer from "@inertiajs/react/server";
import { renderToString } from "react-dom/server";
import type { ReactElement } from "react";
import { buildFancyAppTree, type FancyAppTreeOptions } from "../buildFancyAppTree";

/** Inertia's default SSR cluster port. */
const DEFAULT_SSR_PORT = 13714;

export interface CreateFancyServerOptions
  extends Pick<FancyAppTreeOptions, "providers" | "appRoot" | "transition"> {
  /**
   * Resolve a page name to its component — the SAME resolver as the client
   * entry (e.g. an `import.meta.glob` over `./Pages`). Required.
   */
  resolve: (name: string) => unknown;
  /** SSR cluster port. Default `13714` (matches `config('inertia.ssr.url')`). */
  port?: number;
}

/**
 * The SSR server entry for an Inertia + Fancy app. Drop this in
 * `resources/js/ssr.tsx`; it renders each page server-side INSIDE the same
 * Fancy provider tree the client mounts ({@link buildFancyAppTree}), so the
 * markup hydrates cleanly:
 *
 * ```tsx
 * import { createFancyServer } from "@particle-academy/fancy-inertia/server";
 * import { FancyDataRoot } from "@particle-academy/fancy-query";
 *
 * createFancyServer({
 *   resolve: (name) => {
 *     const pages = import.meta.glob("./Pages/**\/*.tsx", { eager: true });
 *     return pages[`./Pages/${name}.tsx`];
 *   },
 *   providers: (outlet) => <FancyDataRoot echo={null}>{outlet}</FancyDataRoot>,
 * });
 * ```
 *
 * Run it with `php artisan inertia:start-ssr` (after building the SSR bundle).
 * This module imports `react-dom/server` + `@inertiajs/react/server`, so it is
 * a SERVER-ONLY entry — never import it from client code.
 */
export function createFancyServer({
  resolve,
  providers,
  appRoot,
  transition,
  port = DEFAULT_SSR_PORT,
}: CreateFancyServerOptions): void {
  createServer(
    (page) =>
      createInertiaApp({
        page,
        render: renderToString,
        resolve,
        setup: ({ App, props }) =>
          buildFancyAppTree({
            App: App as unknown as FancyAppTreeOptions["App"],
            props: props as unknown as Record<string, unknown>,
            providers,
            appRoot,
            transition,
          }) as ReactElement,
      }),
    port,
  );
}
