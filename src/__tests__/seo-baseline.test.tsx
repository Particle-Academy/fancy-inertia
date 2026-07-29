// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// `<Head>` is mocked to a no-op: this file is about what `<Seo>` does to the
// SERVER BASELINE already sitting in `document.head`, not about what it renders.
// Inertia's real head manager needs a running app and would only add noise here.
vi.mock("@inertiajs/react", () => ({
  Head: () => null,
  usePage: () => ({ url: "/packages/react-fancy" }),
}));

import { Seo } from "../seo/Seo";
import { SeoProvider } from "../seo/context";

/**
 * `<Seo>` retires the server baseline's copies of the tags it takes over.
 *
 * `head-key` is Inertia's convention *inside* `<Head>`, where Inertia rewrites it
 * to `data-inertia` and dedupes on that. A `head-key` in a Blade template
 * (`<x-fancy-seo::head>`) is rewritten by nothing, so the head manager cannot see
 * it — `isInertiaManagedElement` tests for `data-inertia` alone. Every tag
 * `<Seo>` emitted was therefore APPENDED beside the server's copy.
 *
 * That shipped: the live showcase served two `<meta name="description">` with
 * different text, plus duplicated `og:*` and `twitter:*`. Both packages
 * documented a dedup that never happened.
 *
 * The obvious fix — put `data-inertia` on the Blade tags — is worse. Inertia
 * DELETES what it manages: any `data-inertia` element the current page does not
 * re-emit is removed. A tagged baseline would be wiped on every page that
 * renders some other `<Head>` and no `<Seo>` (109 of 305 pages on the showcase).
 * These tests pin the chosen behaviour so nobody "simplifies" it back.
 */
const roots: Array<() => void> = [];

function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(node));
  roots.push(() => {
    act(() => root.unmount());
    host.remove();
  });
}

/** Stand-in for what `<x-fancy-seo::head>` puts in the first byte. */
function seedBaseline(keys: string[]) {
  for (const key of keys) {
    const el = document.createElement("meta");
    el.setAttribute("head-key", key);
    el.setAttribute("name", key);
    el.setAttribute("content", `server: ${key}`);
    document.head.append(el);
  }
}

const baselineKeys = () =>
  Array.from(document.head.querySelectorAll("[head-key]")).map((el) => el.getAttribute("head-key"));

beforeEach(() => {
  document.head.querySelectorAll("[head-key],[data-inertia]").forEach((el) => el.remove());
});

afterEach(() => {
  roots.splice(0).forEach((cleanup) => cleanup());
});

describe("<Seo> vs. the server baseline", () => {
  it("removes the baseline copies of the keys it emits", () => {
    seedBaseline(["description", "og:description", "og:title", "robots", "twitter:card"]);

    mount(<Seo title="react-fancy" description="A component library" />);

    // All five are keys <Seo> emits, so none of the server copies may survive.
    expect(baselineKeys()).toEqual([]);
  });

  it("leaves baseline keys it does NOT emit alone", () => {
    // The server knows things the client defaults do not — a route-specific
    // `keywords`, say. Blanket-removing every [head-key] would throw that away.
    seedBaseline(["description", "keywords", "og:image:width"]);

    mount(<Seo title="react-fancy" description="A component library" />);

    // No `keywords` prop and no image => <Seo> emits neither, so both stay.
    expect(baselineKeys().sort()).toEqual(["keywords", "og:image:width"]);
  });

  it("never touches Inertia's own managed elements", () => {
    // Removing a data-inertia element out from under the head manager would
    // corrupt the list it diffs against on the next navigation.
    const managed = document.createElement("meta");
    managed.setAttribute("data-inertia", "description");
    managed.setAttribute("name", "description");
    managed.setAttribute("content", "inertia-owned");
    document.head.append(managed);
    seedBaseline(["description"]);

    mount(<Seo description="A component library" />);

    expect(baselineKeys()).toEqual([]);
    expect(document.head.querySelector('[data-inertia="description"]')).not.toBeNull();
  });

  it("still retires the baseline in clientOnly mode", () => {
    // clientOnly renders null until hydrated, which is the mode the Blade
    // baseline is actually used in — if the cleanup were skipped there, the fix
    // would do nothing in the only configuration that has the bug.
    seedBaseline(["description", "og:description"]);

    mount(
      <SeoProvider value={{ clientOnly: true, defaultDescription: "site default" }}>
        <Seo />
      </SeoProvider>,
    );

    expect(baselineKeys()).toEqual([]);
  });

  it("re-runs when the emitted key set changes", () => {
    // SPA navigation swaps props rather than remounting. A cleanup keyed on
    // array identity alone would either never re-run or thrash every render.
    seedBaseline(["description", "keywords"]);

    mount(<Seo description="first" />);
    expect(baselineKeys()).toEqual(["keywords"]);

    // A later render that also emits keywords must clear the remaining copy.
    mount(<Seo description="second" keywords={["a", "b"]} />);
    expect(baselineKeys()).toEqual([]);
  });
});
