import { createRoot, hydrateRoot } from "react-dom/client";
import type { ReactElement } from "react";
import { buildFancyAppTree, type FancyAppTreeOptions } from "./buildFancyAppTree";

export interface SetupFancyAppOptions extends FancyAppTreeOptions {
  /** The mount element from Inertia's `setup({ el })`. */
  el: HTMLElement;
  /**
   * Hydrate a server-rendered tree (`hydrateRoot`) vs. render fresh
   * (`createRoot`). Omit to **auto-detect**: hydrate when the element already
   * has server-rendered children (SSR on), else render fresh. This makes
   * flipping Inertia SSR on/off a no-code change in the client entry.
   */
  hydrate?: boolean;
}

/**
 * The client-side counterpart of `createFancyServer` — mounts the Inertia app
 * inside the shared Fancy provider tree, choosing `hydrateRoot` vs `createRoot`
 * automatically. Replaces the hand-written `createRoot(el).render(<FancyAppRoot>…)`
 * body in an Inertia `setup`:
 *
 * ```tsx
 * import { setupFancyApp } from "@particle-academy/fancy-inertia";
 * import { FancyDataRoot } from "@particle-academy/fancy-query";
 *
 * createInertiaApp({
 *   resolve,
 *   setup: ({ App, props, el }) =>
 *     setupFancyApp({
 *       el, App, props,
 *       providers: (outlet) => <FancyDataRoot echo={null}>{outlet}</FancyDataRoot>,
 *     }),
 * });
 * ```
 */
export function setupFancyApp({ el, hydrate, ...tree }: SetupFancyAppOptions): void {
  const node = buildFancyAppTree(tree) as ReactElement;
  const shouldHydrate = hydrate ?? el.hasChildNodes();
  if (shouldHydrate) {
    hydrateRoot(el, node);
  } else {
    createRoot(el).render(node);
  }
}
