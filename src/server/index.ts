import { createInertiaApp } from "@inertiajs/react";
import createServer from "@inertiajs/react/server";
import { renderToString } from "react-dom/server";
import { Server } from "node:http";
import type { ComponentType, ReactElement } from "react";
import { buildFancyAppTree, type FancyAppTreeOptions } from "../buildFancyAppTree";

/** Inertia's default SSR cluster port. */
const DEFAULT_SSR_PORT = 13714;

export interface CreateFancyServerOptions
  extends Pick<FancyAppTreeOptions, "providers" | "appRoot" | "transition"> {
  /**
   * Resolve a page name to its component — the SAME resolver as the client
   * entry (e.g. an `import.meta.glob` over `./Pages`). Required.
   */
  resolve: (name: string) =>
    | ComponentType
    | Promise<ComponentType>
    | { default: ComponentType };
  /** SSR cluster port. Default `13714` (matches `config('inertia.ssr.url')`). */
  port?: number;
  /**
   * The interface the SSR server listens on. Default `127.0.0.1`, loopback
   * only, which is where Laravel's default `config('inertia.ssr.url')` sends
   * render requests. The SSR server renders whatever page JSON it is sent, so
   * do not widen this unless the app server reaches it over a network you
   * trust: `"0.0.0.0"` is every IPv4 interface, `"::"` every interface.
   *
   * Applied on every supported Inertia line, including the 1.x and 2.x
   * releases whose SSR server takes no host of its own.
   */
  host?: string;
  /**
   * Format the page title, exactly as `createInertiaApp({ title })` does in
   * the client entry. Pass the SAME callback, or the first byte's `<title>`
   * differs from the one the browser shows.
   *
   * It is also what gives a page that sets no title a title on the first
   * byte: Inertia emits one in the server-rendered head only when this returns
   * something for an empty title, e.g. ``(t) => (t ? `${t} - App` : "App")``.
   * Omit it and the page's own title is used unformatted, and a page without
   * one has none.
   */
  title?: (title: string) => string;
}

/** Loopback: the SSR server is for the app server on the same machine. */
const DEFAULT_SSR_HOST = "127.0.0.1";

/**
 * Run `start` with every `http.Server#listen` it makes bound to `host`.
 *
 * Inertia's SSR server decides the interface itself: 3.x defaults it to
 * "0.0.0.0" (newer 3.x releases take a `host` option, older ones do not) and
 * 1.x / 2.x call `listen(port)` with none, which is every interface. Passing
 * `host` through the options is therefore not enough on its own. Inertia calls
 * `listen` synchronously from `createServer`, so the override lasts exactly that
 * call and is removed in `finally`: no other server in the process is touched.
 */
function withListenHost(host: string, start: () => void): void {
  const proto = Server.prototype as unknown as Record<string, unknown>;
  const hadOwn = Object.prototype.hasOwnProperty.call(proto, "listen");
  const ownListen = proto.listen;
  const inherited = Server.prototype.listen;

  proto.listen = function (this: Server, ...args: unknown[]) {
    const [first, ...rest] = args;
    if (typeof first === "number" || (typeof first === "string" && /^\d+$/.test(first))) {
      return inherited.call(this, { port: Number(first), host }, ...rest.filter((a) => typeof a === "function"));
    }
    if (first && typeof first === "object" && !("path" in first)) {
      return inherited.call(this, { ...first, host }, ...rest);
    }
    return inherited.apply(this, args);
  };

  try {
    start();
  } finally {
    if (hadOwn) proto.listen = ownListen;
    else delete proto.listen;
  }
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
  host = DEFAULT_SSR_HOST,
  title,
}: CreateFancyServerOptions): void {
  withListenHost(host, () =>
    startServer({ resolve, providers, appRoot, transition, port, host, title }),
  );
}

function startServer({
  resolve,
  providers,
  appRoot,
  transition,
  port,
  host,
  title,
}: CreateFancyServerOptions & { port: number; host: string }): void {
  // The options object, not the bare port: a host-aware Inertia reads `host`
  // from it, and 1.x / 2.0 pass it straight to `listen`, which accepts it.
  const options = { port, host };
  createServer(
    (page) =>
      createInertiaApp({
        page,
        render: renderToString,
        resolve,
        // Only when given: Inertia's own default stays in charge otherwise.
        ...(title ? { title } : {}),
        setup: ({ App, props }) =>
          buildFancyAppTree({
            App,
            props,
            providers,
            appRoot,
            transition,
          }) as ReactElement,
      }),
    options,
  );
}
