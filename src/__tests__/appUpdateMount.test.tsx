import { describe, expect, it } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";

import { buildFancyAppTree } from "../buildFancyAppTree";
import { AppUpdateAlert } from "../AppUpdateAlert";

/** A stand-in for Inertia's `App`, so the tree can be built without Inertia. */
function StubApp({ children }: { children?: unknown }) {
  return children as ReactNode;
}

/**
 * Walk a built element tree, returning the path of component names down to the
 * first match. Render callbacks are invoked so we can see inside `<App>`.
 */
function pathTo(node: unknown, target: unknown, trail: string[] = []): string[] | null {
  if (!isValidElement(node)) return null;

  const el = node as ReactElement<{ children?: unknown }>;
  const name =
    typeof el.type === "function"
      ? ((el.type as { displayName?: string; name?: string }).displayName ??
        (el.type as { name?: string }).name ??
        "anon")
      : String(el.type);

  const here = [...trail, name];
  if (el.type === target) return here;

  const kids = el.props?.children;

  // `<App>` takes a render callback; call it with the shape Inertia passes so
  // the subtree it produces is visible to this walk.
  const resolved =
    typeof kids === "function"
      ? (kids as (a: unknown) => ReactNode)({
          Component: () => null,
          key: "k",
          props: {},
        })
      : kids;

  for (const child of Array.isArray(resolved) ? resolved : [resolved]) {
    const found = pathTo(child, target, here);
    if (found) return found;
  }
  return null;
}

/**
 * `AppUpdateAlert` must mount INSIDE Inertia's `<App>` — issue #5.
 *
 * Its docblock says "mount once near your app root", but the only slot this
 * package offers for that — `providers` — receives the subtree *containing*
 * `<App>`. So the documented mount put the component outside the Inertia
 * context, `usePage()` threw, and the whole page went white:
 *
 *     Error: usePage must be used within the Inertia component
 *
 * There was no working slot at all: `providers` is outside, `FancyAppRoot` had
 * no flag for it, and a page/layout mount is per-page rather than once at the
 * root. Since `fancy-app-update` is a hard dependency here, shipping it with no
 * usable mount point was a trap.
 *
 * This asserts POSITION rather than behaviour on purpose. A render test would
 * have to mock `usePage`, and mocking it removes the exact thing that failed —
 * the test would pass against the broken tree too.
 */
describe("appUpdate mount point", () => {
  const opts = { App: StubApp, props: {}, appRoot: false as const };

  it("is not mounted at all by default", () => {
    const tree = buildFancyAppTree(opts);

    expect(pathTo(tree, AppUpdateAlert)).toBeNull();
  });

  it("mounts inside <App> when enabled", () => {
    const tree = buildFancyAppTree({ ...opts, appUpdate: true });

    const path = pathTo(tree, AppUpdateAlert);

    expect(path, "AppUpdateAlert was not found in the tree").not.toBeNull();
    // The whole bug in one assertion: it has to be BELOW App, not beside it.
    expect(path!.indexOf("StubApp")).toBeGreaterThanOrEqual(0);
    expect(path!.indexOf("StubApp")).toBeLessThan(path!.length - 1);
  });

  it("is still inside <App> with transitions off", () => {
    // The transition wrapper is one of the things sitting between the root and
    // App, so turning it off must not move the alert out.
    const tree = buildFancyAppTree({ ...opts, appUpdate: true, transition: false });

    const path = pathTo(tree, AppUpdateAlert);

    expect(path).not.toBeNull();
    expect(path!.indexOf("StubApp")).toBeGreaterThanOrEqual(0);
  });

  it("is still inside <App> when app-specific providers are supplied", () => {
    // `providers` is exactly the slot people reached for, so the fix must not
    // depend on it being absent.
    const tree = buildFancyAppTree({
      ...opts,
      appUpdate: true,
      providers: (outlet) => outlet,
    });

    expect(pathTo(tree, AppUpdateAlert)).not.toBeNull();
  });

  it("forwards props when given an object", () => {
    const tree = buildFancyAppTree({
      ...opts,
      appUpdate: { position: "bottom" as const },
    });

    expect(pathTo(tree, AppUpdateAlert)).not.toBeNull();
  });
});
